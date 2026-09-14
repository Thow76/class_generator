import {
  buildScenePlanningPrompt,
  scenePlanningPromptVersion
} from "../prompts/scenePrompts.js";
import {
  scenePlanningResponseFormat,
  scenePlanningSchemaVersion
} from "../schemas/sceneSchemas.js";
import { getOpenAIClient, getStoryModel, OpenAIConfigurationError } from "./openaiClient.js";
import {
  getProject,
  getRawProject,
  ProjectStoreError,
  updateProject
} from "./projectStore.js";
import { formatValidationErrors, validateLesson } from "./validateLesson.js";
import {
  parseScenePlanResponse,
  ScenePlanValidationError,
  validateScenePlan
} from "./validateScenePlan.js";

const requiredCharacterRoles = ["main", "secondary", "supporting"];

export class ScenePlanningError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "ScenePlanningError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function planScenesForProject(projectId, options = {}) {
  if (typeof projectId !== "string" || projectId.trim() === "") {
    throw new ScenePlanningError("Request body must include lessonId.", 400);
  }

  const rawLesson = await getRawProject(projectId);
  assertRawLockedStorySnapshotReady(rawLesson);

  const lesson = await getProject(projectId);
  assertValidLessonShape(lesson);
  assertScenePlanningReady(lesson);

  const model = options.model || getStoryModel();
  const client = options.client || getOpenAIClient("Scene planning");
  const now = options.now || new Date().toISOString();
  const prompt = buildScenePlanningPrompt(lesson);

  const response = await callOpenAI(client, {
    model,
    input: prompt.input,
    format: scenePlanningResponseFormat
  });
  const parsed = parseScenePlanResponse(readResponseText(response));
  const scenePlan = validateScenePlan(parsed, lesson);
  const updatedLesson = applyScenePlan(lesson, scenePlan.scenes, {
    model,
    now
  });

  return updateProject(projectId, updatedLesson);
}

export function applyScenePlan(lesson, plannedScenes, metadata = {}) {
  const now = metadata.now || new Date().toISOString();
  const sentencePositions = new Map(
    lesson.story.lockedSentences.map((sentence, index) => [sentence.id, index])
  );
  const usedIds = new Set(lesson.scenes.map((scene) => scene.id));
  const matchedExistingIds = new Set();
  const existingByExactSentences = new Map();
  const existingByFirstSentence = new Map();

  lesson.scenes.forEach((scene) => {
    const key = sentenceKey(sortSentenceIds(scene.sentenceIds, sentencePositions));
    if (key && !existingByExactSentences.has(key)) {
      existingByExactSentences.set(key, scene);
    }
    const firstSentenceId = sortSentenceIds(scene.sentenceIds, sentencePositions)[0];
    if (firstSentenceId && !existingByFirstSentence.has(firstSentenceId)) {
      existingByFirstSentence.set(firstSentenceId, scene);
    }
  });

  const nextPlannedScenes = plannedScenes.map((planned, index) => {
    const normalizedPlanned = {
      ...planned,
      sentenceIds: sortSentenceIds(planned.sentenceIds, sentencePositions)
    };
    const existing = findMatchingScene({
      planned: normalizedPlanned,
      existingByExactSentences,
      existingByFirstSentence,
      matchedExistingIds,
      sentencePositions
    });

    if (existing) {
      matchedExistingIds.add(existing.id);
    }

    const scene = mergeScene({
      existing,
      planned: normalizedPlanned,
      number: index + 1,
      usedIds,
      now
    });
    usedIds.add(scene.id);
    return scene;
  });

  const preservedUnmatched = lesson.scenes
    .filter((scene) => !matchedExistingIds.has(scene.id) && hasGeneratedSceneWork(scene))
    .map((scene, index) => ({
      ...scene,
      number: nextPlannedScenes.length + index + 1,
      stale: true,
      staleReason: "Scene was not found in the latest scene plan.",
      staleAt: scene.staleAt || now
    }));

  return {
    ...lesson,
    scenes: [...nextPlannedScenes, ...preservedUnmatched],
    scenesMeta: {
      lastPlannedAt: now,
      model: metadata.model || null,
      promptVersion: scenePlanningPromptVersion,
      schemaVersion: scenePlanningSchemaVersion,
      sourceStoryLockedAt: lesson.story.lockedAt || null,
      sourceCharacterApprovalState: "approved"
    },
    currentStage: "scenes"
  };
}

function findMatchingScene({
  planned,
  existingByExactSentences,
  existingByFirstSentence,
  matchedExistingIds,
  sentencePositions
}) {
  const exactMatch = existingByExactSentences.get(sentenceKey(planned.sentenceIds));
  if (exactMatch && !matchedExistingIds.has(exactMatch.id)) return exactMatch;

  const firstSentenceId = planned.sentenceIds[0];
  const firstSentenceMatch = existingByFirstSentence.get(firstSentenceId);
  if (
    firstSentenceMatch &&
    !matchedExistingIds.has(firstSentenceMatch.id) &&
    hasSentenceOverlap(planned.sentenceIds, firstSentenceMatch.sentenceIds, sentencePositions)
  ) {
    return firstSentenceMatch;
  }

  return null;
}

function mergeScene({ existing, planned, number, usedIds, now }) {
  const generated = existing ? hasGeneratedSceneWork(existing) : false;
  const id = existing?.id || createSceneId(number, usedIds);
  const sentenceGroupUnchanged =
    existing && areStringListsEqual(existing.sentenceIds, planned.sentenceIds);
  const characterGroupUnchanged =
    existing && areStringListsEqual(existing.characterIds || [], planned.characterIds || []);
  const detailsChanged =
    existing &&
    (cleanText(existing.location) !== cleanText(planned.location) ||
      cleanText(existing.description) !== cleanText(planned.description));
  const shouldMarkStale =
    generated && (!sentenceGroupUnchanged || !characterGroupUnchanged || detailsChanged);

  const scene = {
    id,
    number,
    label: cleanText(existing?.label) || planned.label || `Scene ${number}`,
    sentenceIds: planned.sentenceIds,
    location: generated ? existing.location : planned.location,
    description: generated ? existing.description : planned.description,
    visualDirection: cleanText(existing?.visualDirection),
    characterIds: planned.characterIds,
    imageMode: normalizeImageMode(existing?.imageMode || planned.imageMode),
    reuseSceneId: existing?.reuseSceneId || planned.reuseSceneId || null,
    generationStatus: generated ? existing.generationStatus : "not_started",
    generationCount:
      generated && Number.isFinite(existing.generationCount) ? existing.generationCount : 0,
    imagePath: generated ? existing.imagePath ?? null : null,
    approved: generated ? Boolean(existing.approved) : false,
    stale: generated ? Boolean(existing.stale) || shouldMarkStale : false
  };

  if (existing && generated) {
    preserveOptionalState(scene, existing, ["staleReason", "staleAt"]);
  }

  if (shouldMarkStale) {
    scene.staleReason = "Scene plan changed after image generation.";
    scene.staleAt = now;
  }

  return scene;
}

function preserveOptionalState(target, source, fields) {
  fields.forEach((field) => {
    if (source[field] !== undefined) {
      target[field] = source[field];
    }
  });
}

function assertValidLessonShape(lesson) {
  const shapeValidation = validateLesson(lesson);
  if (!shapeValidation.valid) {
    throw new ScenePlanningError(
      `Lesson shape is invalid. ${formatValidationErrors(shapeValidation.errors)}`,
      422,
      shapeValidation.errors
    );
  }
}

function assertScenePlanningReady(lesson) {
  if (lesson.story.status !== "locked") {
    throw new ScenePlanningError("Lock the story before planning scenes.", 422, [
      {
        field: "story.status",
        message: "Lock the story before planning scenes."
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
    throw new ScenePlanningError("Locked story snapshot is empty or invalid.", 422, [
      {
        field: "story.lockedSentences",
        message: "Locked story snapshot is empty or invalid."
      }
    ]);
  }

  const requiredCharacters = lesson.characters.filter((character) =>
    requiredCharacterRoles.includes(character.role)
  );
  if (requiredCharacters.length === 0) {
    throw new ScenePlanningError("Extract characters before planning scenes.", 422, [
      {
        field: "characters",
        message: "Extract characters before planning scenes."
      }
    ]);
  }

  assertSetupCharactersExist(lesson, requiredCharacters);
  requiredCharacters.forEach((character) => assertCharacterReferenceApproved(character));
}

function assertSetupCharactersExist(lesson, requiredCharacters) {
  const setupMainName = normalizeName(lesson.setup?.mainCharacter?.name);
  if (
    setupMainName &&
    !requiredCharacters.some(
      (character) =>
        character.role === "main" && normalizeName(character.name) === setupMainName
    )
  ) {
    throw new ScenePlanningError("Required characters are missing.", 422, [
      {
        field: "characters",
        message: "Extract the required story characters before planning scenes."
      }
    ]);
  }
}

function assertCharacterReferenceApproved(character) {
  if (
    character.approved !== true ||
    character.generationStatus !== "approved" ||
    !character.imagePath
  ) {
    throw new ScenePlanningError(
      "Approve character references before scene planning.",
      422,
      [
        {
          field: `characters.${character.id}.imagePath`,
          message: "Approve character references before scene planning."
        }
      ]
    );
  }

  if (character.stale) {
    throw new ScenePlanningError("Review stale characters before planning scenes.", 422, [
      {
        field: `characters.${character.id}.stale`,
        message: "Review stale characters before planning scenes."
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
    throw new ScenePlanningError("Locked story snapshot is empty or invalid.", 422, [
      {
        field: "story.lockedSentences",
        message: "Locked story snapshot is empty or invalid."
      }
    ]);
  }
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
    throw new ScenePlanningError("Scene planning failed. Try again.", 503);
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

  throw new ScenePlanValidationError("Scene planning response was empty.", [
    {
      field: "response",
      message: "Scene planning response was empty."
    }
  ]);
}

function createSceneId(number, usedIds) {
  let id = `scene-${number}`;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `scene-${number}-${suffix}`;
    suffix += 1;
  }

  return id;
}

function sortSentenceIds(sentenceIds, sentencePositions) {
  return (Array.isArray(sentenceIds) ? sentenceIds : [])
    .filter((sentenceId) => sentencePositions.has(sentenceId))
    .sort((leftId, rightId) => sentencePositions.get(leftId) - sentencePositions.get(rightId));
}

function sentenceKey(sentenceIds) {
  return sentenceIds.join("|");
}

function hasSentenceOverlap(leftIds, rightIds, sentencePositions) {
  const right = new Set(sortSentenceIds(rightIds, sentencePositions));
  return leftIds.some((id) => right.has(id));
}

function hasGeneratedSceneWork(scene) {
  return (
    Boolean(scene?.approved) ||
    scene?.generationStatus === "generated" ||
    scene?.generationStatus === "approved" ||
    Boolean(scene?.imagePath)
  );
}

function isRequiredCharacter(character) {
  return requiredCharacterRoles.includes(character?.role);
}

function isApprovedCharacter(character) {
  return (
    character?.approved === true &&
    character?.generationStatus === "approved" &&
    Boolean(character?.imagePath) &&
    character?.stale !== true
  );
}

function normalizeImageMode(value) {
  return value === "reuse" ? "reuse" : "generate";
}

function areStringListsEqual(left = [], right = []) {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function normalizeName(value) {
  return cleanText(value).toLocaleLowerCase();
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function toSceneRouteError(error) {
  if (
    error instanceof ScenePlanningError ||
    error instanceof ScenePlanValidationError ||
    error instanceof ProjectStoreError ||
    error instanceof OpenAIConfigurationError
  ) {
    return error;
  }

  return new ScenePlanningError("Unexpected server error.", 500);
}
