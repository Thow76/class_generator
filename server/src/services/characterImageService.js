import {
  buildCharacterImagePrompt,
  characterImagePromptVersion,
  normalizeCharacterImageStyle
} from "../prompts/characterImagePrompts.js";
import {
  getImageModel,
  getOpenAIClient,
  OpenAIConfigurationError
} from "./openaiClient.js";
import {
  getProject,
  getRawProject,
  ProjectStoreError,
  updateProject
} from "./projectStore.js";
import {
  projectAssetExists,
  saveCharacterImage,
  ImageStorageError,
  isSafeRecordId
} from "./imageStorage.js";
import { formatValidationErrors, validateLesson } from "./validateLesson.js";

export class CharacterImageError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "CharacterImageError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function generateCharacterImageForProject(
  lessonId,
  characterId,
  options = {}
) {
  assertRequiredIds(lessonId, characterId);

  const rawLesson = await getRawProject(lessonId);
  assertRawLockedStorySnapshotReady(rawLesson);

  const lesson = await getProject(lessonId);
  assertValidLessonShape(lesson);
  assertImageGenerationReady(lesson);
  const character = findCharacter(lesson, characterId);
  assertCharacterReady(character);
  const staleBeforeGeneration = Boolean(character.stale);
  const staleReasonBeforeGeneration = cleanText(character.staleReason);

  const model = options.model || getImageModel();
  const client = options.client || getOpenAIClient("Character image generation");
  const now = options.now || new Date().toISOString();
  const imageStyle = normalizeCharacterImageStyle(character.imageStyle);
  const prompt = buildCharacterImagePrompt(lesson, character);
  const response = await callImageModel(client, { model, prompt });
  const imageData = readImageData(response);
  const savedImage = await saveCharacterImage(lessonId, characterId, imageData, {
    extension: ".png",
    now
  });

  const updatedLesson = {
    ...lesson,
    characters: lesson.characters.map((item) =>
      item.id === characterId
        ? {
            ...item,
            imagePath: savedImage.relativePath,
            generationStatus: "generated",
            generationCount: Number.isFinite(item.generationCount)
              ? item.generationCount + 1
              : 1,
            approved: false,
            stale: false,
            staleReason: null,
            staleAt: null,
            imageMeta: {
              ...(isPlainObject(item.imageMeta) ? item.imageMeta : {}),
              model,
              promptVersion: characterImagePromptVersion,
              imageStyle,
              generatedAt: now,
              sourceStoryLockedAt: lesson.story.lockedAt || null,
              fileName: savedImage.fileName,
              ...(staleBeforeGeneration
                ? {
                    reviewedStaleReason: staleReasonBeforeGeneration || "Character was stale."
                  }
                : {})
            }
          }
        : item
    )
  };

  const savedLesson = await updateProject(lessonId, updatedLesson);
  return {
    lesson: savedLesson,
    image: {
      characterId,
      imagePath: savedImage.assetUrl,
      projectRelativePath: savedImage.relativePath,
      imageMeta: savedLesson.characters.find((item) => item.id === characterId)?.imageMeta
    }
  };
}

export async function approveCharacterImageForProject(lessonId, characterId) {
  assertRequiredIds(lessonId, characterId);

  const lesson = await getProject(lessonId);
  assertValidLessonShape(lesson);
  const character = findCharacter(lesson, characterId);
  if (!character.imagePath) {
    throw new CharacterImageError("Generate an image before approving this character.", 422, [
      {
        field: "characters.imagePath",
        message: "Generate an image before approving this character."
      }
    ]);
  }

  if (character.stale) {
    throw new CharacterImageError("Regenerate this stale character before approving it.", 422, [
      {
        field: "characters.stale",
        message: "Regenerate this stale character before approving it."
      }
    ]);
  }

  const exists = await projectAssetExists(lessonId, character.imagePath);
  if (!exists) {
    throw new CharacterImageError("Generated character image file was not found.", 422, [
      {
        field: "characters.imagePath",
        message: "Generated character image file was not found."
      }
    ]);
  }

  const updatedLesson = {
    ...lesson,
    characters: lesson.characters.map((item) =>
      item.id === characterId
        ? {
            ...item,
            generationStatus: "approved",
            approved: true,
            stale: false,
            staleReason: null,
            staleAt: null
          }
        : item
    )
  };

  return updateProject(lessonId, updatedLesson);
}

function assertRequiredIds(lessonId, characterId) {
  if (typeof lessonId !== "string" || lessonId.trim() === "") {
    throw new CharacterImageError("Request body must include lessonId.", 400);
  }
  if (typeof characterId !== "string" || characterId.trim() === "") {
    throw new CharacterImageError("Request body must include characterId.", 400);
  }
  if (!isSafeRecordId(characterId)) {
    throw new CharacterImageError("Character id is malformed.", 400);
  }
}

function assertValidLessonShape(lesson) {
  const shapeValidation = validateLesson(lesson);
  if (!shapeValidation.valid) {
    throw new CharacterImageError(
      `Lesson shape is invalid. ${formatValidationErrors(shapeValidation.errors)}`,
      422,
      shapeValidation.errors
    );
  }
}

function assertImageGenerationReady(lesson) {
  if (lesson.story.status !== "locked") {
    throw new CharacterImageError("Lock the story before generating character images.", 422, [
      {
        field: "story.status",
        message: "Lock the story before generating character images."
      }
    ]);
  }

  if (
    !Array.isArray(lesson.story.lockedSentences) ||
    lesson.story.lockedSentences.length === 0 ||
    lesson.story.lockedSentences.some(
      (sentence) => !sentence?.id || !cleanText(sentence?.text)
    )
  ) {
    throw new CharacterImageError("Locked story snapshot is empty or invalid.", 422, [
      {
        field: "story.lockedSentences",
        message: "Locked story snapshot is empty or invalid."
      }
    ]);
  }

  if (!Array.isArray(lesson.characters) || lesson.characters.length === 0) {
    throw new CharacterImageError("Extract characters before generating images.", 422, [
      {
        field: "characters",
        message: "Extract characters before generating images."
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
    throw new CharacterImageError("Locked story snapshot is empty or invalid.", 422, [
      {
        field: "story.lockedSentences",
        message: "Locked story snapshot is empty or invalid."
      }
    ]);
  }
}

function findCharacter(lesson, characterId) {
  const character = lesson.characters.find((item) => item.id === characterId);
  if (!character) {
    throw new CharacterImageError("Character not found.", 404);
  }
  return character;
}

function assertCharacterReady(character) {
  if (!cleanText(character.name)) {
    throw new CharacterImageError("Character name is required before image generation.", 422, [
      {
        field: "characters.name",
        message: "Character name is required before image generation."
      }
    ]);
  }

  if (character.stale && !isRegenerableStaleCharacter(character)) {
    throw new CharacterImageError("Review stale character details before image generation.", 422, [
      {
        field: "characters.stale",
        message: "Review stale character details before image generation."
      }
    ]);
  }
}

function isRegenerableStaleCharacter(character) {
  return [
    "Character details changed after image generation.",
    "Character appearance changed after image generation.",
    "Character image needs generation."
  ].includes(cleanText(character.staleReason));
}

async function callImageModel(client, { model, prompt }) {
  try {
    if (!client?.images?.generate) {
      throw new Error("OpenAI image API is unavailable.");
    }
    return await client.images.generate({
      model,
      prompt,
      size: "1024x1024"
    });
  } catch (error) {
    if (error instanceof OpenAIConfigurationError) throw error;
    throw new CharacterImageError(
      "Character image generation failed. Please try again.",
      503
    );
  }
}

function readImageData(response) {
  const image = response?.data?.[0];
  if (typeof image?.b64_json === "string" && image.b64_json.trim()) {
    return image.b64_json;
  }

  throw new CharacterImageError(
    "Character image generation did not return usable image data.",
    503
  );
}

export function toCharacterImageRouteError(error) {
  if (
    error instanceof CharacterImageError ||
    error instanceof ProjectStoreError ||
    error instanceof ImageStorageError ||
    error instanceof OpenAIConfigurationError
  ) {
    return error;
  }

  return new CharacterImageError("Unexpected server error.", 500);
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
