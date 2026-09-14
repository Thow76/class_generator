import { normalizeSceneSentenceIds } from "./lessonSelectors.js";

export function normalizeTag(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function setCurrentStage(lesson, stageId) {
  return {
    ...lesson,
    currentStage: stageId
  };
}

export function updateLessonField(lesson, field, value) {
  return {
    ...lesson,
    [field]: value
  };
}

export function updateSetupField(lesson, field, value) {
  return {
    ...lesson,
    setup: {
      ...lesson.setup,
      [field]: value
    }
  };
}

export function updateMainCharacter(lesson, field, value) {
  return {
    ...lesson,
    setup: {
      ...lesson.setup,
      mainCharacter: {
        ...lesson.setup.mainCharacter,
        [field]: value
      }
    }
  };
}

export function addSecondaryCharacter(lesson, value) {
  const nextCharacter = normalizeTag(value);
  if (!nextCharacter || lesson.setup.secondaryCharacters.includes(nextCharacter)) {
    return lesson;
  }

  return {
    ...lesson,
    setup: {
      ...lesson.setup,
      secondaryCharacters: [...lesson.setup.secondaryCharacters, nextCharacter]
    }
  };
}

export function removeSecondaryCharacter(lesson, character) {
  return {
    ...lesson,
    setup: {
      ...lesson.setup,
      secondaryCharacters: lesson.setup.secondaryCharacters.filter(
        (item) => item !== character
      )
    }
  };
}

export function updateStorySentence(lesson, sentenceId, text, shouldMarkStale) {
  const now = new Date().toISOString();
  const shouldFlagStoryChange = Boolean(lesson.story.lockedAt) || shouldMarkStale;

  return markDownstreamStaleIfNeeded(
    {
      ...lesson,
      story: {
        ...lesson.story,
        modifiedAfterLock:
          lesson.story.modifiedAfterLock || shouldFlagStoryChange,
        sentences: renumberSentences(
          lesson.story.sentences.map((sentence) =>
            sentence.id === sentenceId
              ? {
                  ...sentence,
                  text,
                  source: "manual",
                  updatedAt: now
                }
              : sentence
          )
        )
      }
    },
    shouldMarkStale,
    "Story sentence changed",
    now
  );
}

export function addStorySentence(
  lesson,
  text,
  options = {},
  shouldMarkStale = false
) {
  if (lesson.story.status === "locked") return lesson;

  const normalizedText = normalizeStorySentenceText(text);
  if (!normalizedText) return lesson;
  const now = new Date().toISOString();
  const shouldFlagStoryChange = Boolean(lesson.story.lockedAt) || shouldMarkStale;

  const sentences = lesson.story.sentences;
  const insertIndex = Number.isInteger(options.index)
    ? Math.max(0, Math.min(options.index, sentences.length))
    : sentences.length;
  const nextSentences = [...sentences];

  nextSentences.splice(insertIndex, 0, {
    id: createNextSentenceId(sentences),
    number: insertIndex + 1,
    text: normalizedText,
    stale: false,
    source: "manual",
    updatedAt: now
  });

  return markDownstreamStaleIfNeeded(
    {
      ...lesson,
      story: {
        ...lesson.story,
        modifiedAfterLock:
          lesson.story.modifiedAfterLock || shouldFlagStoryChange,
        sentences: renumberSentences(nextSentences)
      }
    },
    shouldMarkStale,
    "Story sentence added",
    now
  );
}

export function moveStorySentence(lesson, sentenceId, targetIndex, shouldMarkStale) {
  if (lesson.story.status === "locked") return lesson;

  const sentences = lesson.story.sentences;
  const fromIndex = sentences.findIndex((sentence) => sentence.id === sentenceId);

  if (fromIndex < 0) return lesson;
  if (targetIndex < 0 || targetIndex >= sentences.length) return lesson;
  if (fromIndex === targetIndex) return lesson;
  const now = new Date().toISOString();
  const shouldFlagStoryChange = Boolean(lesson.story.lockedAt) || shouldMarkStale;

  const nextSentences = [...sentences];
  const [movedSentence] = nextSentences.splice(fromIndex, 1);
  nextSentences.splice(targetIndex, 0, movedSentence);

  return markDownstreamStaleIfNeeded(
    {
      ...lesson,
      story: {
        ...lesson.story,
        modifiedAfterLock:
          lesson.story.modifiedAfterLock || shouldFlagStoryChange,
        sentences: renumberSentences(nextSentences)
      }
    },
    shouldMarkStale,
    "Story sentence order changed",
    now
  );
}

export function deleteStorySentence(lesson, sentenceId, shouldMarkStale) {
  if (lesson.story.status === "locked") return lesson;

  const sentences = lesson.story.sentences;
  const sentenceExists = sentences.some((sentence) => sentence.id === sentenceId);

  if (!sentenceExists) return lesson;
  if (sentences.length <= 1) return lesson;
  const now = new Date().toISOString();
  const shouldFlagStoryChange = Boolean(lesson.story.lockedAt) || shouldMarkStale;

  const nextSentences = renumberSentences(
    sentences.filter((sentence) => sentence.id !== sentenceId)
  );
  const nextScenes = lesson.scenes.map((scene) => {
    const nextSentenceIds = scene.sentenceIds.filter((id) => id !== sentenceId);
    const lostReference = nextSentenceIds.length !== scene.sentenceIds.length;

    if (!lostReference) return scene;

    const stale =
      scene.stale ||
      shouldMarkStale ||
      nextSentenceIds.length === 0 ||
      scene.approved ||
      scene.generationStatus === "generated";

    return {
      ...scene,
      sentenceIds: nextSentenceIds,
      stale,
      ...(stale
        ? {
            staleReason: "Story sentence deleted",
            staleAt: now
          }
        : {})
    };
  });

  return markDownstreamStaleIfNeeded(
    {
      ...lesson,
      story: {
        ...lesson.story,
        modifiedAfterLock:
          lesson.story.modifiedAfterLock || shouldFlagStoryChange,
        sentences: nextSentences
      },
      scenes: nextScenes
    },
    shouldMarkStale,
    "Story sentence deleted",
    now
  );
}

export function addSceneSentenceReference(lesson, sceneId, sentenceId) {
  const scene = lesson.scenes.find((item) => item.id === sceneId);

  if (!scene) return lesson;
  if (!lesson.story.sentences.some((sentence) => sentence.id === sentenceId)) {
    return lesson;
  }
  if (scene.sentenceIds.includes(sentenceId)) return lesson;

  return replaceSceneSentenceReferences(lesson, sceneId, [
    ...scene.sentenceIds,
    sentenceId
  ]);
}

export function removeSceneSentenceReference(lesson, sceneId, sentenceId) {
  const scene = lesson.scenes.find((item) => item.id === sceneId);

  if (!scene) return lesson;
  if (!scene.sentenceIds.includes(sentenceId)) return lesson;

  return replaceSceneSentenceReferences(
    lesson,
    sceneId,
    scene.sentenceIds.filter((id) => id !== sentenceId)
  );
}

export function replaceSceneSentenceReferences(lesson, sceneId, sentenceIds) {
  const scene = lesson.scenes.find((item) => item.id === sceneId);

  if (!scene) return lesson;

  const nextSentenceIds = normalizeSceneSentenceIds(lesson, sentenceIds);
  const previousSentenceIds = Array.isArray(scene.sentenceIds) ? scene.sentenceIds : [];

  if (areStringListsEqual(nextSentenceIds, previousSentenceIds)) {
    return lesson;
  }

  return {
    ...lesson,
    scenes: lesson.scenes.map((item) =>
      item.id === sceneId
        ? markSceneStaleAfterReferenceChange({
            ...item,
            sentenceIds: nextSentenceIds
          })
        : item
    )
  };
}

export function renumberSentences(sentences) {
  return sentences.map((sentence, index) => ({
    ...sentence,
    number: index + 1
  }));
}

export function patchCharacter(lesson, characterId, patch) {
  return {
    ...lesson,
    characters: lesson.characters.map((character) =>
      character.id === characterId
        ? markCharacterImageStaleIfNeeded(character, { ...character, ...patch }, patch)
        : character
    )
  };
}

export function addReusableBackground(lesson, value) {
  const background = normalizeTag(value);
  if (!background || lesson.reusable.backgrounds.includes(background)) {
    return lesson;
  }

  return {
    ...lesson,
    reusable: {
      ...lesson.reusable,
      backgrounds: [...lesson.reusable.backgrounds, background]
    }
  };
}

export function addCharacterNote(lesson, characterId, value) {
  const note = normalizeTag(value || "");
  if (!note) return lesson;

  return {
    ...lesson,
    reusable: {
      ...lesson.reusable,
      noteTags: lesson.reusable.noteTags.includes(note)
        ? lesson.reusable.noteTags
        : [...lesson.reusable.noteTags, note]
    },
    characters: lesson.characters.map((character) =>
      character.id === characterId && !character.notes.includes(note)
        ? markCharacterImageStaleIfNeeded(
            character,
            { ...character, notes: [...character.notes, note] },
            { notes: [...character.notes, note] }
          )
        : character
    )
  };
}

export function removeCharacterNote(lesson, characterId, note) {
  return {
    ...lesson,
    characters: lesson.characters.map((character) =>
      character.id === characterId
        ? markCharacterImageStaleIfNeeded(
            character,
            {
              ...character,
              notes: character.notes.filter((item) => item !== note)
            },
            { notes: character.notes.filter((item) => item !== note) }
          )
        : character
    )
  };
}

export function markCharacterGenerated(lesson, characterId) {
  return {
    ...lesson,
    characters: lesson.characters.map((character) =>
      character.id === characterId && character.imagePath
        ? {
            ...character,
            generationStatus: "generated",
            generationCount: character.generationCount + 1,
            approved: false,
            stale: false,
            staleReason: null,
            staleAt: null
          }
        : character
    )
  };
}

export function markCharacterApproved(lesson, characterId) {
  return {
    ...lesson,
    characters: lesson.characters.map((character) =>
      character.id === characterId && character.imagePath && !character.stale
        ? {
            ...character,
            generationStatus: "approved",
            approved: true
          }
        : character
    )
  };
}

export function patchScene(lesson, sceneId, patch) {
  return {
    ...lesson,
    scenes: lesson.scenes.map((scene) =>
      scene.id === sceneId
        ? markSceneStaleAfterEdit(scene, { ...scene, ...patch }, patch)
        : scene
    )
  };
}

export function updateMediaFilter(lesson, filter) {
  return {
    ...lesson,
    media: {
      ...lesson.media,
      filter
    }
  };
}

function markDownstreamStaleIfNeeded(lesson, shouldMark, staleReason, staleAt) {
  if (!shouldMark) return lesson;

  return {
    ...lesson,
    characters: markGeneratedRecordsStale(lesson.characters, staleReason, staleAt),
    scenes: markGeneratedRecordsStale(lesson.scenes, staleReason, staleAt),
    media: {
      ...lesson.media,
      stale: true,
      staleReason,
      staleAt
    },
    export: {
      ...lesson.export,
      stale: true,
      staleReason,
      staleAt
    }
  };
}

function markGeneratedRecordsStale(records, staleReason, staleAt) {
  return records.map((record) =>
    record.approved || record.generationStatus === "generated"
      ? { ...record, stale: true, staleReason, staleAt }
      : record
  );
}

function markCharacterImageStaleIfNeeded(previous, next, patch) {
  const watchedFields = [
    "name",
    "age",
    "sex",
    "background",
    "appearanceDescription",
    "notes",
    "imageStyle"
  ];
  const changed = watchedFields.some(
    (field) => Object.prototype.hasOwnProperty.call(patch, field) &&
      !areComparableValuesEqual(previous[field], next[field])
  );
  const hasGeneratedReference =
    previous.imagePath ||
    previous.approved ||
    previous.generationStatus === "generated" ||
    previous.generationStatus === "approved";

  if (!changed || !hasGeneratedReference) return next;

  const now = new Date().toISOString();
  return {
    ...next,
    generationStatus: next.imagePath ? "generated" : "not_started",
    approved: false,
    stale: true,
    staleReason: "Character details changed after image generation.",
    staleAt: now
  };
}

function areComparableValuesEqual(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function markSceneStaleAfterReferenceChange(scene) {
  if (
    scene.stale ||
    scene.approved ||
    scene.generationStatus === "generated" ||
    scene.generationStatus === "approved"
  ) {
    return markSceneStale(scene, "Scene sentence references changed.");
  }

  return scene;
}

function markSceneStaleAfterEdit(previous, next, patch) {
  const watchedFields = [
    "location",
    "description",
    "visualDirection",
    "characterIds",
    "imageMode",
    "reuseSceneId"
  ];
  const changed = watchedFields.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(patch, field) &&
      !areComparableValuesEqual(previous[field], next[field])
  );

  if (!changed || !hasGeneratedSceneWork(previous)) return next;
  return markSceneStale(next, "Scene details changed after image generation.");
}

function markSceneStale(scene, staleReason) {
  return {
    ...scene,
    generationStatus: scene.imagePath ? "generated" : scene.generationStatus,
    approved: false,
    stale: true,
    staleReason,
    staleAt: scene.staleAt || new Date().toISOString()
  };
}

function hasGeneratedSceneWork(scene) {
  return (
    scene.approved ||
    scene.generationStatus === "generated" ||
    scene.generationStatus === "approved" ||
    Boolean(scene.imagePath)
  );
}

function areStringListsEqual(left, right) {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function normalizeStorySentenceText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function createNextSentenceId(sentences) {
  const usedIds = new Set(sentences.map((sentence) => sentence.id));
  const highestNumericId = sentences.reduce((highest, sentence) => {
    const match = /^sentence-(\d+)$/.exec(sentence.id || "");
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  let nextNumber = Math.max(sentences.length, highestNumericId) + 1;
  let nextId = `sentence-${nextNumber}`;

  while (usedIds.has(nextId)) {
    nextNumber += 1;
    nextId = `sentence-${nextNumber}`;
  }

  return nextId;
}
