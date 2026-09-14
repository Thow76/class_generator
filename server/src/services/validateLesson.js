const lessonStageIds = ["setup", "story", "characters", "scenes", "media", "export"];

const learnerLevels = [
  "Literacies Plus",
  "Complete Beginner",
  "Beginner 1",
  "Beginner 1.5",
  "Beginner 2"
];

const sentenceCounts = [6, 8, 9, 10, 12];

const sexOptions = ["Woman", "Man", "Non-binary", "Unspecified"];

const characterRoles = ["main", "secondary", "supporting"];

const generationStatuses = ["not_started", "generated", "approved"];
const sceneImageModes = ["generate", "reuse"];
const characterImageStyles = ["illustration", "photorealistic"];

const safeRecordIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const maxSceneVisualDirectionLength = 800;

export function validateLesson(lesson) {
  const errors = [];

  if (!isPlainObject(lesson)) {
    return {
      valid: false,
      errors: [{ path: "lesson", message: "Lesson must be an object." }]
    };
  }

  if (!isSafeRecordId(lesson.id)) {
    errors.push({
      path: "id",
      message: "Lesson is missing a safe stable id."
    });
  }

  if (!lessonStageIds.includes(lesson.currentStage)) {
    errors.push({
      path: "currentStage",
      message: "Lesson has an invalid currentStage."
    });
  }

  if (!learnerLevels.includes(lesson.learnerLevel)) {
    errors.push({
      path: "learnerLevel",
      message: "Lesson has an invalid learnerLevel."
    });
  }

  if (!sentenceCounts.includes(lesson.sentenceCount)) {
    errors.push({
      path: "sentenceCount",
      message: "Lesson has an invalid sentenceCount."
    });
  }

  if (!isPlainObject(lesson.setup)) {
    errors.push({
      path: "setup",
      message: "Setup must be an object."
    });
  }

  if (!isPlainObject(lesson.setup?.mainCharacter)) {
    errors.push({
      path: "setup.mainCharacter",
      message: "Main character setup must be an object."
    });
  }

  if (!Array.isArray(lesson.setup?.secondaryCharacters)) {
    errors.push({
      path: "setup.secondaryCharacters",
      message: "Secondary characters must be an array."
    });
  }

  if (
    lesson.setup?.mainCharacter?.sex &&
    !sexOptions.includes(lesson.setup.mainCharacter.sex)
  ) {
    errors.push({
      path: "setup.mainCharacter.sex",
      message: "Main character sex or gender has an invalid value."
    });
  }

  if (!["draft", "locked"].includes(lesson.story?.status)) {
    errors.push({
      path: "story.status",
      message: "Story status must be draft or locked."
    });
  }

  if (!Array.isArray(lesson.story?.sentences)) {
    errors.push({
      path: "story.sentences",
      message: "Story sentences must be an array."
    });
  }

  const sentenceIds = collectSafeIds(
    lesson.story?.sentences,
    "story.sentences",
    "story sentence",
    errors
  );
  ensureStorySentenceText(lesson.story?.sentences, errors);
  validateLockedSentenceSnapshot(lesson.story, errors);
  const characterIds = collectSafeIds(
    lesson.characters,
    "characters",
    "character",
    errors
  );
  validateCharacters(lesson.characters, errors);
  validateMetadata(lesson.charactersMeta, "charactersMeta", errors);
  validateMetadata(lesson.scenesMeta, "scenesMeta", errors);

  ensureGenerationStatuses(lesson.characters, "characters", "character", errors);

  if (!Array.isArray(lesson.scenes)) {
    errors.push({
      path: "scenes",
      message: "Scenes must be an array."
    });
  }

  const sceneIds = new Set(
    Array.isArray(lesson.scenes)
      ? lesson.scenes.filter((scene) => isSafeRecordId(scene?.id)).map((scene) => scene.id)
      : []
  );
  ensureGenerationStatuses(lesson.scenes, "scenes", "scene", errors);

  lesson.scenes?.forEach((scene, index) => {
    const path = `scenes[${index}]`;
    if (!isSafeRecordId(scene?.id)) {
      errors.push({
        path: `${path}.id`,
        message: "A scene is missing a safe stable id."
      });
    }

    if (!Array.isArray(scene?.sentenceIds)) {
      errors.push({
        path: `${path}.sentenceIds`,
        message: `${scene?.id || "A scene"} is missing sentenceIds.`
      });
    }

    if (Array.isArray(scene?.sentenceIds)) {
      scene.sentenceIds.forEach((sentenceId) => {
      if (!sentenceIds.has(sentenceId)) {
        errors.push({
          path: `${path}.sentenceIds`,
          message: `${scene.id} references missing sentence ${sentenceId}.`
        });
      }
      });
    }

    if (Array.isArray(scene?.characterIds)) {
      scene.characterIds.forEach((characterId) => {
      if (!characterIds.has(characterId)) {
        errors.push({
          path: `${path}.characterIds`,
          message: `${scene.id} references missing character ${characterId}.`
        });
      }
      });
    }

    if (!Array.isArray(scene?.characterIds)) {
      errors.push({
        path: `${path}.characterIds`,
        message: `${scene?.id || "A scene"} characterIds must be an array.`
      });
    }

    if (
      scene?.visualDirection !== undefined &&
      typeof scene.visualDirection !== "string"
    ) {
      errors.push({
        path: `${path}.visualDirection`,
        message: `${scene?.id || "A scene"} visualDirection must be a string.`
      });
    } else if (
      typeof scene?.visualDirection === "string" &&
      scene.visualDirection.length > maxSceneVisualDirectionLength
    ) {
      errors.push({
        path: `${path}.visualDirection`,
        message: `${scene?.id || "A scene"} visualDirection is too long.`
      });
    }

    if (scene?.imageMode !== undefined && !sceneImageModes.includes(scene.imageMode)) {
      errors.push({
        path: `${path}.imageMode`,
        message: `${scene?.id || "A scene"} has invalid imageMode.`
      });
    }

    if (
      scene?.reuseSceneId !== null &&
      scene?.reuseSceneId !== undefined &&
      !isSafeRecordId(scene.reuseSceneId)
    ) {
      errors.push({
        path: `${path}.reuseSceneId`,
        message: `${scene?.id || "A scene"} has invalid reuseSceneId.`
      });
    }
    if (scene?.reuseSceneId && isSafeRecordId(scene.reuseSceneId) && !sceneIds.has(scene.reuseSceneId)) {
      errors.push({
        path: `${path}.reuseSceneId`,
        message: `${scene?.id || "A scene"} references missing scene ${scene.reuseSceneId}.`
      });
    }

    validateGeneratedImageState(scene, path, errors);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export function formatValidationErrors(errors) {
  return errors.map((error) => `${error.path}: ${error.message}`).join(" ");
}

function collectSafeIds(records, path, label, errors) {
  const ids = new Set();

  if (!Array.isArray(records)) {
    errors.push({
      path,
      message: `${capitalize(label)}s must be an array.`
    });
    return ids;
  }

  records.forEach((record, index) => {
    if (!isSafeRecordId(record?.id)) {
      errors.push({
        path: `${path}[${index}].id`,
        message: `A ${label} is missing a safe stable id.`
      });
      return;
    }
    ids.add(record.id);
  });

  return ids;
}

function ensureStorySentenceText(sentences, errors) {
  if (!Array.isArray(sentences)) return;

  sentences?.forEach((sentence, index) => {
    if (!sentence?.text) {
      errors.push({
        path: `story.sentences[${index}].text`,
        message: `${sentence?.id || "A story sentence"} is missing text.`
      });
    }
  });
}

function validateLockedSentenceSnapshot(story, errors) {
  if (story?.lockedSentences !== undefined && !Array.isArray(story.lockedSentences)) {
    errors.push({
      path: "story.lockedSentences",
      message: "Locked story sentences must be an array."
    });
  }

  if (story?.status !== "locked") return;
  if (!Array.isArray(story.sentences) || !Array.isArray(story.lockedSentences)) return;

  if (story.lockedSentences.length === 0) {
    errors.push({
      path: "story.lockedSentences",
      message: "Locked stories must include a locked sentence snapshot."
    });
  }

  if (story.lockedSentences.length !== story.sentences.length) {
    errors.push({
      path: "story.lockedSentences",
      message: "Locked sentence snapshot must match the story sentence count."
    });
  }

  story.lockedSentences.forEach((lockedSentence, index) => {
    const path = `story.lockedSentences[${index}]`;
    const sentence = story.sentences[index];

    if (!isSafeRecordId(lockedSentence?.id)) {
      errors.push({
        path: `${path}.id`,
        message: "A locked story sentence is missing a safe stable id."
      });
    }

    if (lockedSentence?.number !== index + 1) {
      errors.push({
        path: `${path}.number`,
        message: "A locked story sentence has an invalid number."
      });
    }

    if (!lockedSentence?.text) {
      errors.push({
        path: `${path}.text`,
        message: `${lockedSentence?.id || "A locked story sentence"} is missing text.`
      });
    }

    if (!sentence) return;

    if (lockedSentence?.id !== sentence.id) {
      errors.push({
        path: `${path}.id`,
        message: "Locked sentence id must match the story sentence at the same position."
      });
    }

    if (lockedSentence?.text !== sentence.text) {
      errors.push({
        path: `${path}.text`,
        message: "Locked sentence text must match the story sentence at the same position."
      });
    }
  });
}

function ensureGenerationStatuses(records, path, label, errors) {
  records?.forEach((record, index) => {
    if (!generationStatuses.includes(record?.generationStatus)) {
      errors.push({
        path: `${path}[${index}].generationStatus`,
        message: `${record?.id || `A ${label}`} has invalid generationStatus.`
      });
    }
  });
}

function validateCharacters(characters, errors) {
  if (!Array.isArray(characters)) return;

  characters.forEach((character, index) => {
    const path = `characters[${index}]`;
    if (!characterRoles.includes(character?.role)) {
      errors.push({
        path: `${path}.role`,
        message: `${character?.id || "A character"} has invalid role.`
      });
    }
    if (!sexOptions.includes(character?.sex)) {
      errors.push({
        path: `${path}.sex`,
        message: `${character?.id || "A character"} has invalid sex value.`
      });
    }
    if (!Array.isArray(character?.notes)) {
      errors.push({
        path: `${path}.notes`,
        message: `${character?.id || "A character"} notes must be an array.`
      });
    }
    if (typeof character?.appearanceDescription !== "string") {
      errors.push({
        path: `${path}.appearanceDescription`,
        message: `${character?.id || "A character"} appearanceDescription must be a string.`
      });
    }
    if (
      character?.imageStyle !== undefined &&
      !characterImageStyles.includes(character.imageStyle)
    ) {
      errors.push({
        path: `${path}.imageStyle`,
        message: `${character?.id || "A character"} has invalid imageStyle.`
      });
    }
    validateGeneratedImageState(character, path, errors);
  });
}

function validateGeneratedImageState(record, path, errors) {
  const imagePath = record?.imagePath;
  if (imagePath !== null && imagePath !== undefined && !isSafeProjectImagePath(imagePath)) {
    errors.push({
      path: `${path}.imagePath`,
      message: `${record?.id || "A character"} has an unsafe image path.`
    });
  }

  if (record?.generationStatus === "approved" && imagePath && !record?.approved) {
    errors.push({
      path: `${path}.generationStatus`,
      message: `${record?.id || "A character"} approved status is inconsistent.`
    });
  }

  if (
    record?.imageMeta !== null &&
    record?.imageMeta !== undefined &&
    (!isPlainObject(record.imageMeta) || !isSerializableAndBounded(record.imageMeta))
  ) {
    errors.push({
      path: `${path}.imageMeta`,
      message: `${record?.id || "A character"} image metadata is invalid.`
    });
  }
}

function validateMetadata(value, path, errors) {
  if (
    value !== null &&
    value !== undefined &&
    (!isPlainObject(value) || !isSerializableAndBounded(value))
  ) {
    errors.push({
      path,
      message: `${path} is invalid.`
    });
  }
}

function isSafeRecordId(id) {
  return typeof id === "string" && safeRecordIdPattern.test(id);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSerializableAndBounded(value) {
  try {
    return JSON.stringify(value).length <= 4000;
  } catch {
    return false;
  }
}

function isSafeProjectImagePath(value) {
  if (typeof value !== "string" || value.length > 240) return false;
  if (value.startsWith("/") || value.includes("\\") || value.includes("\0")) {
    return false;
  }
  const normalized = value.replace(/\/+/g, "/");
  if (normalized !== value || normalized.includes("..")) return false;
  return /^images\/(characters|scenes)\/[A-Za-z0-9][A-Za-z0-9_.-]*\.(png|jpe?g|webp)$/i.test(
    value
  );
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
