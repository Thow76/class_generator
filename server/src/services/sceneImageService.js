import { normalizeCharacterImageStyle } from "../prompts/characterImagePrompts.js";
import {
  buildSceneImagePrompt,
  sceneImagePromptVersion
} from "../prompts/sceneImagePrompts.js";
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
  ImageStorageError,
  isSafeRecordId,
  projectAssetExists,
  saveSceneImage,
  toProjectAssetUrl
} from "./imageStorage.js";
import { formatValidationErrors, validateLesson } from "./validateLesson.js";

export class SceneImageError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "SceneImageError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function generateSceneImageForProject(lessonId, sceneId, options = {}) {
  assertRequiredIds(lessonId, sceneId);

  const rawLesson = await getRawProject(lessonId);
  assertRawLockedStorySnapshotReady(rawLesson);

  const lesson = await getProject(lessonId);
  assertValidLessonShape(lesson);
  assertSceneImageGenerationReady(lesson);
  const scene = findScene(lesson, sceneId);
  assertSceneReady(lesson, scene);
  const sceneCharacters = await resolveApprovedSceneCharacters(lessonId, lesson, scene);
  assertConsistentSceneImageStyle(sceneCharacters);

  if (scene.imageMode === "reuse") {
    return reuseSceneImage(lessonId, lesson, scene, options);
  }

  const model = options.model || getImageModel();
  const client = options.client || getOpenAIClient("Scene image generation");
  const now = options.now || new Date().toISOString();
  const imageStyle = normalizeCharacterImageStyle(sceneCharacters[0]?.imageStyle);
  const prompt = buildSceneImagePrompt(lesson, scene);
  const response = await callImageModel(client, { model, prompt });
  const imageData = readImageData(response);
  const savedImage = await saveSceneImage(lessonId, sceneId, imageData, {
    extension: ".png",
    now
  });

  const updatedLesson = {
    ...lesson,
    scenes: lesson.scenes.map((item) =>
      item.id === sceneId
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
            imageMeta: buildGeneratedImageMeta({
              item,
              model,
              now,
              lesson,
              sceneCharacters,
              imageStyle,
              fileName: savedImage.fileName
            })
          }
        : item
    )
  };

  const savedLesson = await updateProject(lessonId, updatedLesson);
  return {
    lesson: savedLesson,
    image: {
      sceneId,
      imagePath: savedImage.assetUrl,
      projectRelativePath: savedImage.relativePath,
      imageMeta: savedLesson.scenes.find((item) => item.id === sceneId)?.imageMeta
    }
  };
}

export async function approveSceneImageForProject(lessonId, sceneId) {
  assertRequiredIds(lessonId, sceneId);

  const lesson = await getProject(lessonId);
  assertValidLessonShape(lesson);
  const scene = findScene(lesson, sceneId);
  if (!scene.imagePath) {
    throw new SceneImageError("Generate an image before approving this scene.", 422, [
      {
        field: "scenes.imagePath",
        message: "Generate an image before approving this scene."
      }
    ]);
  }

  if (scene.stale) {
    throw new SceneImageError("Regenerate this stale scene before approving it.", 422, [
      {
        field: "scenes.stale",
        message: "Regenerate this stale scene before approving it."
      }
    ]);
  }

  const exists = await projectAssetExists(lessonId, scene.imagePath);
  if (!exists) {
    throw new SceneImageError("Generated scene image file was not found.", 422, [
      {
        field: "scenes.imagePath",
        message: "Generated scene image file was not found."
      }
    ]);
  }

  const updatedLesson = {
    ...lesson,
    scenes: lesson.scenes.map((item) =>
      item.id === sceneId
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

function reuseSceneImage(lessonId, lesson, scene, options = {}) {
  const sourceScene = findReusableScene(lesson, scene);
  const now = options.now || new Date().toISOString();
  return projectAssetExists(lessonId, sourceScene.imagePath).then((exists) => {
    if (!exists) {
      throw new SceneImageError("Reusable scene image file was not found.", 422, [
        {
          field: `scenes.${sourceScene.id}.imagePath`,
          message: "Reusable scene image file was not found."
        }
      ]);
    }

    const updatedLesson = {
      ...lesson,
      scenes: lesson.scenes.map((item) =>
        item.id === scene.id
          ? {
              ...item,
              imagePath: sourceScene.imagePath,
              generationStatus: "generated",
              generationCount: Number.isFinite(item.generationCount)
                ? item.generationCount + 1
                : 1,
              approved: false,
              stale: false,
              staleReason: null,
              staleAt: null,
              imageMeta: {
                ...(isPlainObject(sourceScene.imageMeta) ? sourceScene.imageMeta : {}),
                promptVersion: sceneImagePromptVersion,
                reusedFromSceneId: sourceScene.id,
                reusedAt: now,
                sourceImagePath: sourceScene.imagePath
              }
            }
          : item
      )
    };

    return updateProject(lessonId, updatedLesson).then((savedLesson) => ({
      lesson: savedLesson,
      image: {
        sceneId: scene.id,
        imagePath: toProjectAssetUrl(lessonId, sourceScene.imagePath),
        projectRelativePath: sourceScene.imagePath,
        imageMeta: savedLesson.scenes.find((item) => item.id === scene.id)?.imageMeta
      }
    }));
  });
}

function assertRequiredIds(lessonId, sceneId) {
  if (typeof lessonId !== "string" || lessonId.trim() === "") {
    throw new SceneImageError("Request body must include lessonId.", 400);
  }
  if (typeof sceneId !== "string" || sceneId.trim() === "") {
    throw new SceneImageError("Request body must include sceneId.", 400);
  }
  if (!isSafeRecordId(sceneId)) {
    throw new SceneImageError("Scene id is malformed.", 400);
  }
}

function assertValidLessonShape(lesson) {
  const shapeValidation = validateLesson(lesson);
  if (!shapeValidation.valid) {
    throw new SceneImageError(
      `Lesson shape is invalid. ${formatValidationErrors(shapeValidation.errors)}`,
      422,
      shapeValidation.errors
    );
  }
}

function assertSceneImageGenerationReady(lesson) {
  if (lesson.story.status !== "locked") {
    throw new SceneImageError("Lock the story before generating scene images.", 422, [
      {
        field: "story.status",
        message: "Lock the story before generating scene images."
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
    throw new SceneImageError("Locked story snapshot is empty or invalid.", 422, [
      {
        field: "story.lockedSentences",
        message: "Locked story snapshot is empty or invalid."
      }
    ]);
  }

  if (!Array.isArray(lesson.scenes) || lesson.scenes.length === 0) {
    throw new SceneImageError("Plan scenes before generating scene images.", 422, [
      {
        field: "scenes",
        message: "Plan scenes before generating scene images."
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
    throw new SceneImageError("Locked story snapshot is empty or invalid.", 422, [
      {
        field: "story.lockedSentences",
        message: "Locked story snapshot is empty or invalid."
      }
    ]);
  }
}

function findScene(lesson, sceneId) {
  const scene = lesson.scenes.find((item) => item.id === sceneId);
  if (!scene) {
    throw new SceneImageError("Scene not found.", 404);
  }
  return scene;
}

function assertSceneReady(lesson, scene) {
  if (scene.stale) {
    throw new SceneImageError("Review stale scene details before image generation.", 422, [
      {
        field: `scenes.${scene.id}.stale`,
        message: "Review stale scene details before image generation."
      }
    ]);
  }

  if (!Array.isArray(scene.sentenceIds) || scene.sentenceIds.length === 0) {
    throw new SceneImageError("Scene needs sentence coverage before image generation.", 422, [
      {
        field: `scenes.${scene.id}.sentenceIds`,
        message: "Scene needs sentence coverage before image generation."
      }
    ]);
  }

  const lockedSentenceIds = new Set(lesson.story.lockedSentences.map((sentence) => sentence.id));
  const missingSentenceIds = scene.sentenceIds.filter(
    (sentenceId) => !lockedSentenceIds.has(sentenceId)
  );
  if (missingSentenceIds.length > 0) {
    throw new SceneImageError("Scene references missing locked story sentences.", 422, [
      {
        field: `scenes.${scene.id}.sentenceIds`,
        message: `Scene references missing locked story sentences: ${missingSentenceIds.join(", ")}.`
      }
    ]);
  }

  if (!cleanText(scene.location)) {
    throw new SceneImageError("Scene location is required before image generation.", 422, [
      {
        field: `scenes.${scene.id}.location`,
        message: "Scene location is required before image generation."
      }
    ]);
  }

  if (!cleanText(scene.description)) {
    throw new SceneImageError("Scene description is required before image generation.", 422, [
      {
        field: `scenes.${scene.id}.description`,
        message: "Scene description is required before image generation."
      }
    ]);
  }

  if (!["generate", "reuse"].includes(scene.imageMode)) {
    throw new SceneImageError("Scene image mode is invalid.", 422, [
      {
        field: `scenes.${scene.id}.imageMode`,
        message: "Scene image mode is invalid."
      }
    ]);
  }

  if (!Array.isArray(scene.characterIds) || scene.characterIds.length === 0) {
    throw new SceneImageError("Scene needs characters before image generation.", 422, [
      {
        field: `scenes.${scene.id}.characterIds`,
        message: "Scene needs characters before image generation."
      }
    ]);
  }
}

function findReusableScene(lesson, scene) {
  if (!scene.reuseSceneId) {
    throw new SceneImageError("Choose a scene to reuse before generating this scene.", 422, [
      {
        field: `scenes.${scene.id}.reuseSceneId`,
        message: "Choose a scene to reuse before generating this scene."
      }
    ]);
  }

  const sourceScene = lesson.scenes.find((item) => item.id === scene.reuseSceneId);
  if (!sourceScene || sourceScene.id === scene.id) {
    throw new SceneImageError("Reusable scene was not found.", 422, [
      {
        field: `scenes.${scene.id}.reuseSceneId`,
        message: "Reusable scene was not found."
      }
    ]);
  }

  if (sourceScene.stale) {
    throw new SceneImageError("Reusable scene is stale.", 422, [
      {
        field: `scenes.${sourceScene.id}.stale`,
        message: "Regenerate or review the source scene before reusing it."
      }
    ]);
  }

  if (
    !sourceScene.imagePath ||
    !["generated", "approved"].includes(sourceScene.generationStatus)
  ) {
    throw new SceneImageError("Reusable scene has no generated image.", 422, [
      {
        field: `scenes.${sourceScene.id}.imagePath`,
        message: "Reusable scene has no generated image."
      }
    ]);
  }

  return sourceScene;
}

async function resolveApprovedSceneCharacters(lessonId, lesson, scene) {
  const characterMap = new Map(
    lesson.characters.map((character) => [character.id, character])
  );
  const characters = [];

  for (const characterId of scene.characterIds) {
    const character = characterMap.get(characterId);
    if (!character) {
      throw new SceneImageError("Scene references a missing character.", 422, [
        {
          field: `scenes.${scene.id}.characterIds`,
          message: `Scene references a missing character: ${characterId}.`
        }
      ]);
    }

    assertCharacterReferenceReady(character);
    const exists = await projectAssetExists(lessonId, character.imagePath);
    if (!exists) {
      throw new SceneImageError("Approved character image file was not found.", 422, [
        {
          field: `characters.${character.id}.imagePath`,
          message: "Approved character image file was not found."
        }
      ]);
    }

    characters.push(character);
  }

  return characters;
}

function assertCharacterReferenceReady(character) {
  if (
    character.approved !== true ||
    character.generationStatus !== "approved" ||
    !character.imagePath
  ) {
    throw new SceneImageError(
      "Approve character references before generating scene images.",
      422,
      [
        {
          field: `characters.${character.id}.imagePath`,
          message: "Approve character references before generating scene images."
        }
      ]
    );
  }

  if (character.stale) {
    throw new SceneImageError(
      "Regenerate stale character references before generating scene images.",
      422,
      [
        {
          field: `characters.${character.id}.stale`,
          message: "Regenerate stale character references before generating scene images."
        }
      ]
    );
  }
}

function assertConsistentSceneImageStyle(characters) {
  const imageStyles = new Set(
    characters.map((character) => normalizeCharacterImageStyle(character.imageStyle))
  );
  if (imageStyles.size > 1) {
    throw new SceneImageError("Scene characters use mixed image styles.", 422, [
      {
        field: "characters.imageStyle",
        message: "Use the same image style for characters in one scene before generation."
      }
    ]);
  }
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
    throw new SceneImageError("Scene image generation failed. Please try again.", 503);
  }
}

function readImageData(response) {
  const image = response?.data?.[0];
  if (typeof image?.b64_json === "string" && image.b64_json.trim()) {
    return image.b64_json;
  }

  throw new SceneImageError("Scene image generation did not return usable image data.", 503);
}

function buildGeneratedImageMeta({
  item,
  model,
  now,
  lesson,
  sceneCharacters,
  imageStyle,
  fileName
}) {
  return {
    ...(isPlainObject(item.imageMeta) ? item.imageMeta : {}),
    model,
    promptVersion: sceneImagePromptVersion,
    generatedAt: now,
    sourceStoryLockedAt: lesson.story.lockedAt || null,
    sourceScenesPlannedAt: lesson.scenesMeta?.lastPlannedAt || null,
    sourceCharacterImagePaths: sceneCharacters.map((character) => character.imagePath),
    imageStyle,
    fileName
  };
}

export function toSceneImageRouteError(error) {
  if (
    error instanceof SceneImageError ||
    error instanceof ProjectStoreError ||
    error instanceof ImageStorageError ||
    error instanceof OpenAIConfigurationError
  ) {
    return error;
  }

  return new SceneImageError("Unexpected server error.", 500);
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
