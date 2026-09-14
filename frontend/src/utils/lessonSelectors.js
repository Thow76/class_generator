import { isSetupComplete } from "./validateSetup.js";

export function hasGeneratedOutput(record) {
  return record.approved || record.generationStatus === "generated";
}

export function hasDownstreamOutput(lesson) {
  return (
    lesson.characters.some(hasGeneratedOutput) || lesson.scenes.some(hasGeneratedOutput)
  );
}

export function getCompletedStages(lesson, readiness = null) {
  const mediaReady = isMediaReady(lesson, readiness);
  const completed = [];
  if (isSetupComplete(lesson)) completed.push("setup");
  if (lesson.story.status === "locked") completed.push("story");
  if (lesson.characters.some((character) => character.approved)) {
    completed.push("characters");
  }
  if (lesson.scenes.some((scene) => scene.approved)) {
    completed.push("scenes");
  }
  if (mediaReady) {
    completed.push("media");
  }
  if (mediaReady) {
    completed.push("export");
  }
  return completed;
}

export function areRequiredCharactersApproved(lesson) {
  const requiredCharacters = lesson.characters.filter((character) =>
    ["main", "secondary", "supporting"].includes(character.role)
  );

  if (requiredCharacters.length === 0) return false;

  return requiredCharacters.every(
    (character) =>
      !character.stale &&
      character.approved &&
      character.generationStatus === "approved" &&
      Boolean(character.imagePath)
  );
}

export function getProjectAssetUrl(lessonId, imagePath) {
  if (!lessonId || !imagePath) return "";
  if (imagePath.startsWith("/api/")) return imagePath;
  return `/api/projects/${encodeURIComponent(lessonId)}/assets/${String(imagePath)
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

// Phase 2 deliberately derives visible media cards from character and scene records
// so approval/stale state does not get duplicated in lesson.media.items.
export function getMediaItems(lesson) {
  return getRequiredMediaItems(lesson);
}

export function getRequiredMediaItems(lesson) {
  const characterItems = lesson.characters
    .filter((character) => ["main", "secondary", "supporting"].includes(character.role))
    .map((character) =>
      buildMediaItem(character, {
        kind: "Characters",
        title: character.name || "Untitled character",
        icon: "portrait",
        missingMessage: "Generate and approve this character reference image.",
        generatedMessage: "Approve this generated character reference image.",
        staleMessage: "Regenerate and approve this stale character reference image."
      })
    );

  const sceneItems = lesson.scenes.map((scene) => {
    const item = buildMediaItem(scene, {
      kind: "Scenes",
      title: scene.label || `Scene ${scene.number || ""}`.trim() || "Untitled scene",
      icon: "image",
      missingMessage: "Generate and approve this scene image.",
      generatedMessage: "Approve this generated scene image.",
      staleMessage: "Regenerate and approve this stale scene image."
    });

    return {
      ...item,
      messages: [...getScenePlanningMessages(lesson, scene), ...item.messages]
    };
  });

  return [...characterItems, ...sceneItems].map((item) => ({
    ...item,
    blocking: item.status !== "approved" || item.messages.length > 0,
    status:
      item.status === "approved" && item.messages.length > 0 ? "invalid" : item.status
  }));
}

export function getMediaSummaryFromItems(items) {
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

export function isMediaReady(lesson, readiness = null) {
  return Boolean(readiness?.ready);
}

export function getMediaBlockers(lesson, readiness = null) {
  if (readiness) return readiness.blockers || [];

  const blockers = [];
  if (lesson.story.status !== "locked") {
    blockers.push({
      id: "story",
      kind: "Story",
      message: "Lock the story before reviewing media readiness."
    });
  }
  if (lesson.characters.length === 0) {
    blockers.push({
      id: "characters",
      kind: "Characters",
      message: "Extract character records before reviewing media readiness."
    });
  }
  if (lesson.scenes.length === 0) {
    blockers.push({
      id: "scenes",
      kind: "Scenes",
      message: "Plan scenes before reviewing media readiness."
    });
  }
  if (getUnassignedStorySentences(lesson).length > 0) {
    blockers.push({
      id: "scenes",
      kind: "Scenes",
      message: "Assign every locked story sentence to at least one scene."
    });
  }
  if (lesson.media.stale || lesson.export.stale) {
    blockers.push({
      id: "media",
      kind: "Media",
      message: "Resolve stale media or export warnings before export."
    });
  }

  return [
    ...blockers,
    ...getRequiredMediaItems(lesson).flatMap((item) =>
      item.blocking
        ? item.messages.map((message) => ({
            id: item.id,
            kind: item.kind,
            message
          }))
        : []
    )
  ];
}

export function getStorySentencePositionMap(lesson) {
  const positions = new Map();

  lesson.story.sentences.forEach((sentence, index) => {
    if (sentence?.id && !positions.has(sentence.id)) {
      positions.set(sentence.id, index);
    }
  });

  return positions;
}

export function normalizeSceneSentenceIds(lesson, sentenceIds) {
  const positions = getStorySentencePositionMap(lesson);
  const seen = new Set();

  return (Array.isArray(sentenceIds) ? sentenceIds : [])
    .filter((sentenceId) => {
      if (!positions.has(sentenceId) || seen.has(sentenceId)) return false;
      seen.add(sentenceId);
      return true;
    })
    .sort((leftId, rightId) => positions.get(leftId) - positions.get(rightId));
}

export function getSceneSentenceRecords(lesson, scene) {
  const sentenceMap = new Map(
    lesson.story.sentences.map((sentence, index) => [
      sentence.id,
      { ...sentence, displayNumber: index + 1 }
    ])
  );

  return normalizeSceneSentenceIds(lesson, scene?.sentenceIds).map((sentenceId) =>
    sentenceMap.get(sentenceId)
  );
}

export function getUnassignedStorySentences(lesson) {
  const assignedSentenceIds = new Set();

  lesson.scenes.forEach((scene) => {
    normalizeSceneSentenceIds(lesson, scene.sentenceIds).forEach((sentenceId) => {
      assignedSentenceIds.add(sentenceId);
    });
  });

  return lesson.story.sentences
    .map((sentence, index) => ({ ...sentence, displayNumber: index + 1 }))
    .filter((sentence) => !assignedSentenceIds.has(sentence.id));
}

function buildMediaItem(record, options) {
  const baseItem = {
    id: record.id,
    kind: options.kind,
    title: options.title,
    approved: Boolean(record.approved),
    generationStatus: record.generationStatus || "not_started",
    imagePath: record.imagePath || null,
    icon: options.icon,
    stale: Boolean(record.stale),
    fileExists: null,
    status: "missing",
    blocking: true,
    messages: []
  };

  if (record.stale) {
    return { ...baseItem, status: "stale", messages: [options.staleMessage] };
  }
  if (!record.imagePath) {
    return { ...baseItem, status: "missing", messages: [options.missingMessage] };
  }
  if (record.approved === true && record.generationStatus === "approved") {
    return { ...baseItem, status: "approved", blocking: false };
  }
  if (record.generationStatus === "generated") {
    return { ...baseItem, status: "generated", messages: [options.generatedMessage] };
  }
  return {
    ...baseItem,
    status: "invalid",
    messages: ["Approve this generated image before export."]
  };
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

  const characterIds = new Set(lesson.characters.map((character) => character.id));
  if ((scene.characterIds || []).some((characterId) => !characterIds.has(characterId))) {
    messages.push("Remove missing character references from this scene.");
  }

  return messages;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
