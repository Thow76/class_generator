import {
  buildCharacterAppearancePrompt,
  characterAppearancePromptVersion
} from "../prompts/characterAppearancePrompts.js";
import {
  characterAppearanceResponseFormat,
  characterAppearanceSchemaVersion
} from "../schemas/characterAppearanceSchemas.js";
import { getOpenAIClient, getStoryModel, OpenAIConfigurationError } from "./openaiClient.js";
import {
  getProject,
  getRawProject,
  ProjectStoreError,
  updateProject
} from "./projectStore.js";
import { isSafeRecordId } from "./imageStorage.js";
import { formatValidationErrors, validateLesson } from "./validateLesson.js";
import {
  CharacterAppearanceValidationError,
  parseCharacterAppearanceResponse,
  validateCharacterAppearanceResponse
} from "./validateCharacterAppearance.js";

export class CharacterAppearanceError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "CharacterAppearanceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function updateCharacterAppearanceForProject(
  lessonId,
  characterId,
  options = {}
) {
  assertRequiredIds(lessonId, characterId);

  const rawLesson = await getRawProject(lessonId);
  assertRawLockedStorySnapshotReady(rawLesson);

  const lesson = await getProject(lessonId);
  assertValidLessonShape(lesson);
  assertLockedStoryReady(lesson);
  const character = findCharacter(lesson, characterId);
  assertCharacterReady(character);

  const model = options.model || getStoryModel();
  const client =
    options.client || getOpenAIClient("Character appearance generation");
  const now = options.now || new Date().toISOString();
  const prompt = buildCharacterAppearancePrompt(lesson, character);

  const response = await callOpenAI(client, {
    model,
    input: prompt.input,
    format: characterAppearanceResponseFormat
  });
  const parsed = parseCharacterAppearanceResponse(readResponseText(response));
  const appearance = validateCharacterAppearanceResponse(parsed);
  const updatedLesson = applyCharacterAppearance(lesson, characterId, {
    appearanceDescription: appearance.appearanceDescription,
    now
  });
  const savedLesson = await updateProject(lessonId, updatedLesson);

  return {
    lesson: savedLesson,
    appearance: {
      characterId,
      appearanceDescription: appearance.appearanceDescription,
      generatedAt: now,
      model,
      promptVersion: characterAppearancePromptVersion,
      schemaVersion: characterAppearanceSchemaVersion
    }
  };
}

export function applyCharacterAppearance(
  lesson,
  characterId,
  { appearanceDescription, now = new Date().toISOString() }
) {
  return {
    ...lesson,
    characters: lesson.characters.map((character) =>
      character.id === characterId
        ? markCharacterAppearanceUpdated(character, appearanceDescription, now)
        : character
    )
  };
}

function markCharacterAppearanceUpdated(character, appearanceDescription, now) {
  const previousDescription = cleanLongText(character.appearanceDescription);
  const nextDescription = cleanLongText(appearanceDescription);
  const changed = previousDescription !== nextDescription;
  const next = {
    ...character,
    appearanceDescription: nextDescription
  };

  if (!changed || !hasGeneratedCharacterWork(character)) {
    return next;
  }

  return {
    ...next,
    generationStatus: next.imagePath ? "generated" : next.generationStatus,
    approved: false,
    stale: true,
    staleReason: "Character appearance changed after image generation.",
    staleAt: now
  };
}

function assertRequiredIds(lessonId, characterId) {
  if (typeof lessonId !== "string" || lessonId.trim() === "") {
    throw new CharacterAppearanceError("Request body must include lessonId.", 400);
  }
  if (typeof characterId !== "string" || characterId.trim() === "") {
    throw new CharacterAppearanceError("Request body must include characterId.", 400);
  }
  if (!isSafeRecordId(characterId)) {
    throw new CharacterAppearanceError("Character id is malformed.", 400);
  }
}

function assertValidLessonShape(lesson) {
  const shapeValidation = validateLesson(lesson);
  if (!shapeValidation.valid) {
    throw new CharacterAppearanceError(
      `Lesson shape is invalid. ${formatValidationErrors(shapeValidation.errors)}`,
      422,
      shapeValidation.errors
    );
  }
}

function assertLockedStoryReady(lesson) {
  if (lesson.story.status !== "locked") {
    throw new CharacterAppearanceError(
      "Lock the story before updating character appearance.",
      422,
      [
        {
          field: "story.status",
          message: "Lock the story before updating character appearance."
        }
      ]
    );
  }

  if (
    !Array.isArray(lesson.story.lockedSentences) ||
    lesson.story.lockedSentences.length === 0 ||
    lesson.story.lockedSentences.some(
      (sentence) => !sentence?.id || !cleanText(sentence?.text)
    )
  ) {
    throw new CharacterAppearanceError("Locked story snapshot is empty or invalid.", 422, [
      {
        field: "story.lockedSentences",
        message: "Locked story snapshot is empty or invalid."
      }
    ]);
  }
}

function assertRawLockedStorySnapshotReady(rawLesson) {
  if (rawLesson?.story?.status !== "locked") return;

  const sentences = Array.isArray(rawLesson.story.sentences)
    ? rawLesson.story.sentences
    : [];
  const lockedSentences = rawLesson.story.lockedSentences;

  if (
    !Array.isArray(lockedSentences) ||
    lockedSentences.length === 0 ||
    lockedSentences.length !== sentences.length ||
    lockedSentences.some((lockedSentence, index) => {
      const sentence = sentences[index];
      return (
        !lockedSentence?.id ||
        !cleanText(lockedSentence?.text) ||
        lockedSentence.number !== index + 1 ||
        lockedSentence.id !== sentence?.id ||
        lockedSentence.text !== sentence?.text
      );
    })
  ) {
    throw new CharacterAppearanceError(
      "Lock the story again before updating character appearance.",
      422,
      [
        {
          field: "story.lockedSentences",
          message: "Locked story snapshot is empty or invalid."
        }
      ]
    );
  }
}

function findCharacter(lesson, characterId) {
  const character = lesson.characters.find((item) => item.id === characterId);
  if (!character) {
    throw new CharacterAppearanceError("Character not found.", 404);
  }
  return character;
}

function assertCharacterReady(character) {
  if (!cleanText(character.name)) {
    throw new CharacterAppearanceError(
      "Character name is required before updating appearance.",
      422,
      [
        {
          field: "characters.name",
          message: "Character name is required before updating appearance."
        }
      ]
    );
  }
}

async function callOpenAI(client, { model, input, format }) {
  try {
    if (!client?.responses?.create) {
      throw new Error("OpenAI responses API is unavailable.");
    }
    return await client.responses.create({
      model,
      input,
      text: {
        format
      }
    });
  } catch (error) {
    if (error instanceof OpenAIConfigurationError) throw error;
    throw new CharacterAppearanceError(
      "Character appearance generation failed. Please try again.",
      503
    );
  }
}

function readResponseText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new CharacterAppearanceValidationError(
    "Character appearance response was empty.",
    [
      {
        field: "response",
        message: "Character appearance response was empty."
      }
    ]
  );
}

function hasGeneratedCharacterWork(character) {
  return (
    Boolean(character.imagePath) ||
    Boolean(character.approved) ||
    character.generationStatus === "generated" ||
    character.generationStatus === "approved"
  );
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function cleanLongText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

export function toCharacterAppearanceRouteError(error) {
  if (
    error instanceof CharacterAppearanceError ||
    error instanceof CharacterAppearanceValidationError ||
    error instanceof ProjectStoreError ||
    error instanceof OpenAIConfigurationError
  ) {
    return error;
  }

  return new CharacterAppearanceError("Unexpected server error.", 500);
}
