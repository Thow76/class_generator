import { projectAssetExists, isSafeProjectAssetPath } from "./imageStorage.js";
import { getProject, isSafeProjectId, ProjectStoreError } from "./projectStore.js";
import { formatValidationErrors, validateLesson } from "./validateLesson.js";

export class MediaReadinessError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "MediaReadinessError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function getMediaReadinessForProject(lessonId) {
  assertLessonId(lessonId);
  const lesson = await getProject(lessonId);
  const validation = validateLesson(lesson);

  if (!validation.valid) {
    throw new MediaReadinessError(
      `Lesson shape is invalid. ${formatValidationErrors(validation.errors)}`,
      422,
      validation.errors
    );
  }

  return buildMediaReadiness(lesson);
}

export async function buildMediaReadiness(lesson, options = {}) {
  const assetExists =
    options.assetExists ||
    ((imagePath) => projectAssetExists(lesson.id, imagePath));
  const items = [];

  for (const character of getRequiredCharacters(lesson)) {
    items.push(
      await buildRecordItem({
        record: character,
        kind: "Characters",
        title: character.name || "Untitled character",
        missingMessage: "Generate and approve this character reference image.",
        staleMessage: "Regenerate and approve this stale character reference image.",
        generatedMessage: "Approve this generated character reference image.",
        fileMissingMessage: "The approved character image file is missing.",
        assetExists
      })
    );
  }

  for (const scene of getPlannedScenes(lesson)) {
    items.push(await buildSceneItem(lesson, scene, assetExists));
  }

  const blockers = [
    ...getLessonBlockers(lesson),
    ...items.flatMap((item) =>
      item.blocking
        ? item.messages.map((message) => ({
            id: item.id,
            kind: item.kind,
            message
          }))
        : []
    )
  ];

  return {
    ready: blockers.length === 0 && items.length > 0,
    summary: summarizeMediaItems(items),
    items,
    blockers
  };
}

export function summarizeMediaItems(items) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item.status === "approved") summary.approved += 1;
      if (item.status === "generated") summary.generated += 1;
      if (item.status === "missing" || item.status === "invalid") summary.missing += 1;
      if (item.status === "stale") summary.stale += 1;
      if (item.status === "file_missing") summary.fileMissing += 1;
      return summary;
    },
    {
      total: 0,
      approved: 0,
      generated: 0,
      missing: 0,
      stale: 0,
      fileMissing: 0
    }
  );
}

export function toMediaReadinessRouteError(error) {
  if (error instanceof MediaReadinessError || error instanceof ProjectStoreError) {
    return error;
  }

  return new MediaReadinessError("Unexpected server error.", 500);
}

function assertLessonId(lessonId) {
  if (typeof lessonId !== "string" || lessonId.trim() === "") {
    throw new MediaReadinessError("Request body must include lessonId.", 400);
  }
  if (!isSafeProjectId(lessonId)) {
    throw new MediaReadinessError("Project id is malformed.", 400);
  }
}

function getRequiredCharacters(lesson) {
  return Array.isArray(lesson.characters)
    ? lesson.characters.filter((character) =>
        ["main", "secondary", "supporting"].includes(character.role)
      )
    : [];
}

function getPlannedScenes(lesson) {
  return Array.isArray(lesson.scenes) ? lesson.scenes : [];
}

async function buildSceneItem(lesson, scene, assetExists) {
  const item = await buildRecordItem({
    record: scene,
    kind: "Scenes",
    title: scene.label || `Scene ${scene.number || ""}`.trim() || "Untitled scene",
    missingMessage: "Generate and approve this scene image.",
    staleMessage: "Regenerate and approve this stale scene image.",
    generatedMessage: "Approve this generated scene image.",
    fileMissingMessage: "The approved scene image file is missing.",
    assetExists
  });

  const planningMessages = getScenePlanningMessages(lesson, scene);
  if (planningMessages.length === 0) return item;

  return {
    ...item,
    status: item.status === "approved" ? "invalid" : item.status,
    blocking: true,
    messages: [...planningMessages, ...item.messages]
  };
}

async function buildRecordItem({
  record,
  kind,
  title,
  missingMessage,
  staleMessage,
  generatedMessage,
  fileMissingMessage,
  assetExists
}) {
  const baseItem = {
    id: record.id,
    kind,
    title,
    status: "missing",
    approved: Boolean(record.approved),
    generationStatus: record.generationStatus || "not_started",
    stale: Boolean(record.stale),
    imagePath: record.imagePath || null,
    fileExists: false,
    blocking: true,
    messages: []
  };

  if (record.stale) {
    return {
      ...baseItem,
      status: "stale",
      messages: [staleMessage]
    };
  }

  if (!record.imagePath) {
    return {
      ...baseItem,
      status: "missing",
      messages: [missingMessage]
    };
  }

  if (!isSafeProjectAssetPath(record.imagePath)) {
    return {
      ...baseItem,
      status: "invalid",
      messages: ["The image path is not a safe local project asset path."]
    };
  }

  const fileExists = await assetExists(record.imagePath);
  const withFileState = {
    ...baseItem,
    fileExists
  };

  if (!fileExists) {
    return {
      ...withFileState,
      status: "file_missing",
      messages: [fileMissingMessage]
    };
  }

  if (record.approved === true && record.generationStatus === "approved") {
    return {
      ...withFileState,
      status: "approved",
      blocking: false,
      messages: []
    };
  }

  if (record.generationStatus === "generated") {
    return {
      ...withFileState,
      status: "generated",
      messages: [generatedMessage]
    };
  }

  return {
    ...withFileState,
    status: "invalid",
    messages: ["Approve this generated image before export."]
  };
}

function getLessonBlockers(lesson) {
  const blockers = [];

  if (lesson.story?.status !== "locked") {
    blockers.push({
      id: "story",
      kind: "Story",
      message: "Lock the story before reviewing media readiness."
    });
  }

  if (getRequiredCharacters(lesson).length === 0) {
    blockers.push({
      id: "characters",
      kind: "Characters",
      message: "Extract character records before reviewing media readiness."
    });
  }

  if (getPlannedScenes(lesson).length === 0) {
    blockers.push({
      id: "scenes",
      kind: "Scenes",
      message: "Plan scenes before reviewing media readiness."
    });
  }

  const uncoveredSentenceIds = getUncoveredLockedSentenceIds(lesson);
  if (uncoveredSentenceIds.length > 0) {
    blockers.push({
      id: "scenes",
      kind: "Scenes",
      message: "Assign every locked story sentence to at least one scene."
    });
  }

  if (lesson.media?.stale || lesson.export?.stale) {
    blockers.push({
      id: "media",
      kind: "Media",
      message: "Resolve stale media or export warnings before export."
    });
  }

  return blockers;
}

function getScenePlanningMessages(lesson, scene) {
  const messages = [];

  if (!Array.isArray(scene.sentenceIds) || scene.sentenceIds.length === 0) {
    messages.push("Add sentence coverage to this scene.");
  }
  if (!cleanText(scene.location)) {
    messages.push("Add a location to this scene.");
  }
  if (!cleanText(scene.description)) {
    messages.push("Add a description to this scene.");
  }
  if (!Array.isArray(scene.characterIds) || scene.characterIds.length === 0) {
    messages.push("Add valid character references to this scene.");
  }

  const characterIds = new Set((lesson.characters || []).map((character) => character.id));
  const invalidCharacterIds = (scene.characterIds || []).filter(
    (characterId) => !characterIds.has(characterId)
  );
  if (invalidCharacterIds.length > 0) {
    messages.push("Remove missing character references from this scene.");
  }

  return messages;
}

function getUncoveredLockedSentenceIds(lesson) {
  if (lesson.story?.status !== "locked") return [];
  const lockedSentenceIds = (lesson.story.lockedSentences || []).map(
    (sentence) => sentence.id
  );
  const assignedSentenceIds = new Set();

  for (const scene of lesson.scenes || []) {
    for (const sentenceId of scene.sentenceIds || []) {
      assignedSentenceIds.add(sentenceId);
    }
  }

  return lockedSentenceIds.filter((sentenceId) => !assignedSentenceIds.has(sentenceId));
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
