import {
  characterImageStyles,
  generationStatuses,
  learnerLevels,
  sentenceCounts,
  sexOptions
} from "../data/constants.js";
import { lessonStageIds } from "../data/lessonSchema.js";

const safeRecordIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const characterRoles = ["main", "secondary", "supporting"];
const sceneImageModes = ["generate", "reuse"];
const maxSceneVisualDirectionLength = 800;

export function validateLessonShape(lesson) {
  const errors = [];

  if (!lesson.id) errors.push("Lesson is missing id.");
  if (!lessonStageIds.includes(lesson.currentStage)) {
    errors.push("Lesson has an invalid currentStage.");
  }
  if (!learnerLevels.includes(lesson.learnerLevel)) {
    errors.push("Lesson has an invalid learnerLevel.");
  }
  if (!sentenceCounts.includes(lesson.sentenceCount)) {
    errors.push("Lesson has an invalid sentenceCount.");
  }
  if (!lesson.setup || typeof lesson.setup !== "object") {
    errors.push("Lesson setup must be an object.");
  }
  if (!lesson.setup?.mainCharacter || typeof lesson.setup.mainCharacter !== "object") {
    errors.push("Lesson setup mainCharacter must be an object.");
  }
  if (!Array.isArray(lesson.setup?.secondaryCharacters)) {
    errors.push("Lesson setup secondaryCharacters must be an array.");
  }
  if (
    lesson.setup?.mainCharacter?.sex &&
    !sexOptions.includes(lesson.setup.mainCharacter.sex)
  ) {
    errors.push("Lesson setup mainCharacter has an invalid sex value.");
  }
  if (!["draft", "locked"].includes(lesson.story?.status)) {
    errors.push("Story status must be draft or locked.");
  }
  if (!Array.isArray(lesson.story?.sentences)) {
    errors.push("Story sentences must be an array.");
  }

  const sentenceIds = new Set();
  if (Array.isArray(lesson.story?.sentences)) {
    lesson.story.sentences.forEach((sentence) => {
      if (!isSafeRecordId(sentence?.id)) {
        errors.push("A story sentence is missing a safe stable id.");
      }
      if (!sentence?.text) {
        errors.push(`${sentence?.id || "A sentence"} is missing text.`);
      }
      sentenceIds.add(sentence?.id);
    });
  }
  validateLockedSentenceSnapshot(lesson.story, errors);

  const characterIds = new Set();
  lesson.characters?.forEach((character) => {
    if (!isSafeRecordId(character.id)) {
      errors.push("A character is missing a safe stable id.");
    }
    if (!character.name) errors.push(`${character.id || "A character"} is missing name.`);
    if (!characterRoles.includes(character.role)) {
      errors.push(`${character.id || "A character"} has invalid role.`);
    }
    if (!sexOptions.includes(character.sex)) {
      errors.push(`${character.id || "A character"} has invalid sex value.`);
    }
    if (!Array.isArray(character.notes)) {
      errors.push(`${character.id || "A character"} notes must be an array.`);
    }
    if (typeof character.appearanceDescription !== "string") {
      errors.push(
        `${character.id || "A character"} appearanceDescription must be a string.`
      );
    }
    if (
      character.imageStyle !== undefined &&
      !characterImageStyles.includes(character.imageStyle)
    ) {
      errors.push(`${character.id || "A character"} has invalid imageStyle.`);
    }
    if (!generationStatuses.includes(character.generationStatus)) {
      errors.push(`${character.id || "A character"} has invalid generationStatus.`);
    }
    validateGeneratedImageState(character, errors);
    characterIds.add(character.id);
  });

  validateMetadata(lesson.charactersMeta, "charactersMeta", errors);
  validateMetadata(lesson.scenesMeta, "scenesMeta", errors);

  const sceneIds = new Set(
    Array.isArray(lesson.scenes)
      ? lesson.scenes.filter((scene) => isSafeRecordId(scene?.id)).map((scene) => scene.id)
      : []
  );

  lesson.scenes?.forEach((scene) => {
    if (!isSafeRecordId(scene.id)) errors.push("A scene is missing a safe stable id.");
    if (!Array.isArray(scene.sentenceIds)) {
      errors.push(`${scene.id || "A scene"} is missing sentenceIds.`);
    }
    if (!generationStatuses.includes(scene.generationStatus)) {
      errors.push(`${scene.id || "A scene"} has invalid generationStatus.`);
    }
    if (!Array.isArray(scene.characterIds)) {
      errors.push(`${scene.id || "A scene"} characterIds must be an array.`);
    }
    if (
      scene.visualDirection !== undefined &&
      typeof scene.visualDirection !== "string"
    ) {
      errors.push(`${scene.id || "A scene"} visualDirection must be a string.`);
    } else if (
      typeof scene.visualDirection === "string" &&
      scene.visualDirection.length > maxSceneVisualDirectionLength
    ) {
      errors.push(`${scene.id || "A scene"} visualDirection is too long.`);
    }
    if (scene.imageMode !== undefined && !sceneImageModes.includes(scene.imageMode)) {
      errors.push(`${scene.id || "A scene"} has invalid imageMode.`);
    }
    if (
      scene.reuseSceneId !== null &&
      scene.reuseSceneId !== undefined &&
      !isSafeRecordId(scene.reuseSceneId)
    ) {
      errors.push(`${scene.id || "A scene"} has invalid reuseSceneId.`);
    }
    if (
      scene.reuseSceneId &&
      isSafeRecordId(scene.reuseSceneId) &&
      !sceneIds.has(scene.reuseSceneId)
    ) {
      errors.push(`${scene.id || "A scene"} references missing scene ${scene.reuseSceneId}.`);
    }
    if (Array.isArray(scene.sentenceIds)) {
      scene.sentenceIds.forEach((sentenceId) => {
        if (!sentenceIds.has(sentenceId)) {
          errors.push(`${scene.id} references missing sentence ${sentenceId}.`);
        }
      });
    }
    if (Array.isArray(scene.characterIds)) {
      scene.characterIds.forEach((characterId) => {
        if (!characterIds.has(characterId)) {
          errors.push(`${scene.id} references missing character ${characterId}.`);
        }
      });
    }
    validateGeneratedImageState(scene, errors);
  });

  return errors;
}

function validateLockedSentenceSnapshot(story, errors) {
  if (story?.lockedSentences !== undefined && !Array.isArray(story.lockedSentences)) {
    errors.push("Locked story sentences must be an array.");
  }

  if (story?.status !== "locked") return;
  if (!Array.isArray(story.sentences) || !Array.isArray(story.lockedSentences)) return;

  if (story.lockedSentences.length === 0) {
    errors.push("Locked stories must include a locked sentence snapshot.");
  }

  if (story.lockedSentences.length !== story.sentences.length) {
    errors.push("Locked sentence snapshot must match the story sentence count.");
  }

  story.lockedSentences.forEach((lockedSentence, index) => {
    const sentence = story.sentences[index];

    if (!isSafeRecordId(lockedSentence?.id)) {
      errors.push("A locked story sentence is missing a safe stable id.");
    }
    if (lockedSentence?.number !== index + 1) {
      errors.push("A locked story sentence has an invalid number.");
    }
    if (!lockedSentence?.text) {
      errors.push(
        `${lockedSentence?.id || "A locked story sentence"} is missing text.`
      );
    }

    if (!sentence) return;

    if (lockedSentence?.id !== sentence.id) {
      errors.push(
        "Locked sentence id must match the story sentence at the same position."
      );
    }
    if (lockedSentence?.text !== sentence.text) {
      errors.push(
        "Locked sentence text must match the story sentence at the same position."
      );
    }
  });
}

function isSafeRecordId(id) {
  return typeof id === "string" && safeRecordIdPattern.test(id);
}

function validateGeneratedImageState(record, errors) {
  const imagePath = record?.imagePath;
  if (imagePath !== null && imagePath !== undefined && !isSafeProjectImagePath(imagePath)) {
    errors.push(`${record?.id || "A character"} has an unsafe image path.`);
  }
  if (record?.generationStatus === "approved" && imagePath && !record?.approved) {
    errors.push(`${record?.id || "A character"} approved status is inconsistent.`);
  }
  if (
    record?.imageMeta !== null &&
    record?.imageMeta !== undefined &&
    (!isPlainObject(record.imageMeta) || !isSerializableAndBounded(record.imageMeta))
  ) {
    errors.push(`${record?.id || "A character"} image metadata is invalid.`);
  }
}

function validateMetadata(value, label, errors) {
  if (
    value !== null &&
    value !== undefined &&
    (!isPlainObject(value) || !isSerializableAndBounded(value))
  ) {
    errors.push(`${label} is invalid.`);
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
