import {
  buildCharacterExtractionPrompt,
  characterExtractionPromptVersion
} from "../prompts/characterPrompts.js";
import {
  characterExtractionResponseFormat,
  characterExtractionSchemaVersion
} from "../schemas/characterSchemas.js";
import { getOpenAIClient, getStoryModel, OpenAIConfigurationError } from "./openaiClient.js";
import {
  getProject,
  getRawProject,
  ProjectStoreError,
  updateProject
} from "./projectStore.js";
import { formatValidationErrors, validateLesson } from "./validateLesson.js";
import {
  CharacterValidationError,
  parseCharacterExtractionResponse,
  validateCharacterExtraction
} from "./validateCharacterExtraction.js";

const generatedStateFields = [
  "generationStatus",
  "generationCount",
  "imagePath",
  "imageMeta",
  "approved",
  "stale",
  "staleReason",
  "staleAt"
];

export class CharacterExtractionError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "CharacterExtractionError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function extractCharactersForProject(projectId, options = {}) {
  if (!projectId) {
    throw new CharacterExtractionError("Request body must include lessonId.", 400);
  }

  const rawLesson = await getRawProject(projectId);
  assertRawLockedStorySnapshotReady(rawLesson);

  const lesson = await getProject(projectId);
  assertValidLessonShape(lesson);
  assertLockedStoryReady(lesson);

  const model = options.model || getStoryModel();
  const client = options.client || getOpenAIClient();
  const now = options.now || new Date().toISOString();
  const prompt = buildCharacterExtractionPrompt(lesson);

  const response = await callOpenAI(client, {
    model,
    input: prompt.input,
    format: characterExtractionResponseFormat
  });

  const parsed = parseCharacterExtractionResponse(readResponseText(response));
  const extraction = validateCharacterExtraction(parsed, lesson);
  assertNoConflictingMainCharacter(extraction.characters, lesson);
  const updatedLesson = applyExtractedCharacters(lesson, extraction.characters, {
    model,
    now
  });

  return updateProject(projectId, updatedLesson);
}

export function applyExtractedCharacters(lesson, extractedCharacters, metadata) {
  const now = metadata.now || new Date().toISOString();
  const setupMain = normalizeSetupMainCharacter(lesson.setup.mainCharacter);
  const charactersForMerge = ensureSetupMainCharacter(lesson, extractedCharacters);
  const setupSecondaryByName = new Map(
    lesson.setup.secondaryCharacters.map((name) => [normalizeName(name), name])
  );
  const usedIds = new Set(lesson.characters.map((character) => character.id));
  const matchedExistingIds = new Set();
  const existingByName = new Map();

  lesson.characters.forEach((character) => {
    existingByName.set(normalizeName(character.name), character);
  });

  const nextCharacters = charactersForMerge.map((extracted) => {
    const setupMainMatch =
      setupMain.nameKey &&
      normalizeName(extracted.name) === setupMain.nameKey;
    const matchKey = setupMainMatch ? setupMain.nameKey : normalizeName(extracted.name);
    const existing =
      existingByName.get(matchKey) ||
      (setupMainMatch ? findExistingMainCharacter(lesson.characters, setupMain) : null);

    if (existing) {
      matchedExistingIds.add(existing.id);
    }

    const base = existing || createNewCharacter(extracted, usedIds);
    usedIds.add(base.id);

    return mergeCharacterRecord({
      existing,
      base,
      extracted,
      setupMain,
      setupMainMatch,
      setupSecondaryName: setupSecondaryByName.get(normalizeName(extracted.name)),
      now
    });
  });

  const extractedNameKeys = new Set(
    charactersForMerge.map((character) => normalizeName(character.name))
  );
  const preservedUnmatched = lesson.characters
    .filter((character) => !matchedExistingIds.has(character.id))
    .map((character) =>
      extractedNameKeys.has(normalizeName(character.name))
        ? character
        : markUnmatchedCharacter(character, now)
    );

  const mergedCharacters = [...nextCharacters, ...preservedUnmatched];
  return {
    ...lesson,
    characters: mergedCharacters,
    reusable: {
      ...lesson.reusable,
      backgrounds: mergeTags(
        lesson.reusable.backgrounds,
        mergedCharacters.map((character) => character.background)
      ),
      noteTags: mergeTags(lesson.reusable.noteTags, [])
    },
    charactersMeta: {
      lastExtractedAt: now,
      promptVersion: characterExtractionPromptVersion,
      schemaVersion: characterExtractionSchemaVersion,
      model: metadata.model,
      sourceStoryLockedAt: lesson.story.lockedAt || null
    },
    currentStage: "characters"
  };
}

function ensureSetupMainCharacter(lesson, extractedCharacters) {
  const setupMain = normalizeSetupMainCharacter(lesson.setup.mainCharacter);
  if (!setupMain.nameKey) return extractedCharacters;

  const hasSetupMain = extractedCharacters.some(
    (character) => normalizeName(character.name) === setupMain.nameKey
  );
  if (hasSetupMain) return extractedCharacters;

  return [
    {
      name: setupMain.name,
      role: "main",
      age: setupMain.age,
      sex: setupMain.sex || "Unspecified",
      background: setupMain.background,
      appearanceDescription: "",
      notes: [],
      storySentenceIds: []
    },
    ...extractedCharacters
  ];
}

function assertNoConflictingMainCharacter(extractedCharacters, lesson) {
  const setupNameKey = normalizeName(lesson.setup?.mainCharacter?.name);
  if (!setupNameKey) return;

  const conflictingMain = extractedCharacters.find(
    (character) =>
      character.role === "main" && normalizeName(character.name) !== setupNameKey
  );

  if (!conflictingMain) return;

  throw new CharacterValidationError("Character extraction response is invalid.", [
    {
      field: "characters",
      message:
        "The extracted main character does not match the Setup main character."
    }
  ]);
}

function mergeCharacterRecord({
  existing,
  base,
  extracted,
  setupMain,
  setupMainMatch,
  setupSecondaryName,
  now
}) {
  const setupValues = setupMainMatch
    ? {
        name: setupMain.name || extracted.name,
        role: "main",
        age: setupMain.age,
        sex: setupMain.sex,
        background: setupMain.background
      }
    : {
        name: setupSecondaryName || extracted.name,
        role: setupSecondaryName && extracted.role === "supporting" ? "secondary" : extracted.role,
        age: "",
        sex: "",
        background: ""
      };

  const next = {
    ...base,
    name: chooseValue(existing?.name, setupValues.name, extracted.name),
    role: setupMainMatch
      ? "main"
      : chooseRole(existing?.role, setupValues.role, extracted.role),
    age: chooseValue(existing?.age, setupValues.age, extracted.age),
    sex: chooseSex(existing?.sex, setupValues.sex, extracted.sex),
    background: chooseValue(existing?.background, setupValues.background, extracted.background),
    appearanceDescription: cleanLongText(existing?.appearanceDescription),
    notes: existing?.notes || [],
    imageStyle: chooseImageStyle(existing?.imageStyle),
    generationStatus: existing?.generationStatus || "not_started",
    generationCount: Number.isFinite(existing?.generationCount)
      ? existing.generationCount
      : 0,
    imagePath: existing?.imagePath ?? null,
    approved: Boolean(existing?.approved),
    stale: Boolean(existing?.stale)
  };

  generatedStateFields.forEach((field) => {
    if (existing && existing[field] !== undefined) {
      next[field] = existing[field];
    }
  });

  if (next.stale && !next.staleReason) {
    next.staleReason = "Character may need review after extraction.";
    next.staleAt = now;
  }

  return next;
}

function createNewCharacter(extracted, usedIds) {
  return {
    id: createCharacterId(extracted.name, usedIds),
    name: extracted.name,
    role: extracted.role,
    age: extracted.age,
    sex: extracted.sex || "Unspecified",
    background: extracted.background,
    appearanceDescription: "",
    notes: [],
    generationStatus: "not_started",
    generationCount: 0,
    imagePath: null,
    imageStyle: "illustration",
    approved: false,
    stale: false
  };
}

function chooseImageStyle(value) {
  return value === "photorealistic" ? "photorealistic" : "illustration";
}

function markUnmatchedCharacter(character, now) {
  if (
    character.approved ||
    character.generationStatus === "generated" ||
    character.generationStatus === "approved"
  ) {
    return {
      ...character,
      stale: true,
      staleReason: "Character was not found in the latest locked story extraction.",
      staleAt: now
    };
  }

  return character;
}

function createCharacterId(name, usedIds) {
  const slug = normalizeName(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const base = `character-${slug || "person"}`;
  let id = base;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  return id;
}

function findExistingMainCharacter(characters, setupMain) {
  if (!setupMain.nameKey) return null;

  return characters.find((character) => {
    return normalizeName(character.name) === setupMain.nameKey;
  }) || null;
}

function normalizeSetupMainCharacter(mainCharacter) {
  const name = cleanText(mainCharacter?.name);
  return {
    id: name ? createCharacterId(name, new Set()) : "",
    name,
    nameKey: normalizeName(name),
    age: cleanText(mainCharacter?.age),
    sex: cleanText(mainCharacter?.sex),
    background: cleanText(mainCharacter?.background)
  };
}

function chooseValue(existingValue, setupValue, modelValue) {
  return cleanText(existingValue) || cleanText(setupValue) || cleanText(modelValue);
}

function chooseRole(existingValue, setupValue, modelValue) {
  const value = cleanText(existingValue) || cleanText(setupValue) || cleanText(modelValue);
  return ["main", "secondary", "supporting"].includes(value) ? value : "supporting";
}

function chooseSex(existingValue, setupValue, modelValue) {
  const value = cleanText(existingValue) || cleanText(setupValue) || cleanText(modelValue);
  return ["Woman", "Man", "Non-binary", "Unspecified"].includes(value)
    ? value
    : "Unspecified";
}

function mergeTags(existingTags, nextTags) {
  const seen = new Set();
  return [...existingTags, ...nextTags].reduce((tags, value) => {
    const tag = cleanText(value);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) return tags;
    seen.add(key);
    return [...tags, tag];
  }, []);
}

function assertValidLessonShape(lesson) {
  const shapeValidation = validateLesson(lesson);
  if (!shapeValidation.valid) {
    throw new CharacterExtractionError(
      `Lesson shape is invalid. ${formatValidationErrors(shapeValidation.errors)}`,
      422,
      shapeValidation.errors
    );
  }
}

function assertLockedStoryReady(lesson) {
  if (lesson.story.status !== "locked") {
    throw new CharacterExtractionError("Lock the story before extracting characters.", 422, [
      {
        field: "story.status",
        message: "Lock the story before extracting characters."
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
    throw new CharacterExtractionError(
      "Locked story snapshot is empty or invalid.",
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

function assertRawLockedStorySnapshotReady(rawLesson) {
  if (rawLesson?.story?.status !== "locked") return;

  const sentences = Array.isArray(rawLesson.story.sentences)
    ? rawLesson.story.sentences
    : [];
  const lockedSentences = rawLesson.story.lockedSentences;
  const errors = [];

  if (!Array.isArray(lockedSentences)) {
    errors.push({
      field: "story.lockedSentences",
      message: "Locked story snapshot is missing."
    });
  } else if (lockedSentences.length === 0) {
    errors.push({
      field: "story.lockedSentences",
      message: "Locked story snapshot is empty."
    });
  } else if (lockedSentences.length !== sentences.length) {
    errors.push({
      field: "story.lockedSentences",
      message: "Locked story snapshot must match the story sentence count."
    });
  } else {
    lockedSentences.forEach((lockedSentence, index) => {
      const sentence = sentences[index];
      if (
        !lockedSentence?.id ||
        !cleanText(lockedSentence?.text) ||
        lockedSentence.number !== index + 1 ||
        lockedSentence.id !== sentence?.id ||
        lockedSentence.text !== sentence?.text
      ) {
        errors.push({
          field: `story.lockedSentences[${index}]`,
          message: "Locked story snapshot does not match the saved story."
        });
      }
    });
  }

  if (errors.length === 0) return;

  throw new CharacterExtractionError(
    "Lock the story again before extracting characters.",
    422,
    errors
  );
}

async function callOpenAI(client, { model, input, format }) {
  try {
    return await client.responses.create({
      model,
      input,
      text: {
        format
      }
    });
  } catch (error) {
    if (error instanceof OpenAIConfigurationError) throw error;
    throw new CharacterExtractionError(
      "Character extraction failed. Please try again.",
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

  throw new CharacterValidationError("Character extraction response was empty.", [
    {
      field: "response",
      message: "Character extraction response was empty."
    }
  ]);
}

function normalizeName(value) {
  return cleanText(value)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function cleanLongText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ").slice(0, 600).trim();
}

export function toCharacterRouteError(error) {
  if (
    error instanceof CharacterExtractionError ||
    error instanceof CharacterValidationError ||
    error instanceof ProjectStoreError ||
    error instanceof OpenAIConfigurationError
  ) {
    return error;
  }

  return new CharacterExtractionError("Unexpected server error.", 500);
}
