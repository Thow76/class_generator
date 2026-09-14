import { createEmptyLesson } from "../data/createLesson.js";
import { normalizeSecondaryCharacterTags } from "./validateSetup.js";

const defaultCharacter = {
  id: "",
  name: "",
  role: "secondary",
  age: "",
  sex: "Unspecified",
  background: "",
  appearanceDescription: "",
  notes: [],
  imageStyle: "illustration",
  generationStatus: "not_started",
  generationCount: 0,
  imagePath: null,
  approved: false,
  stale: false,
  staleReason: null,
  staleAt: null,
  imageMeta: null
};

const defaultScene = {
  id: "",
  number: 1,
  label: "",
  sentenceIds: [],
  location: "",
  description: "",
  visualDirection: "",
  characterIds: [],
  imageMode: "generate",
  reuseSceneId: null,
  generationStatus: "not_started",
  generationCount: 0,
  imagePath: null,
  approved: false,
  stale: false,
  staleReason: null,
  staleAt: null,
  imageMeta: null
};

export function normalizeLessonForClient(lesson) {
  const hadLockedSentenceArray = Array.isArray(lesson?.story?.lockedSentences);
  const normalized = createEmptyLesson(lesson || {});

  normalized.story.sentences = ensureArray(normalized.story.sentences).map(
    (sentence, index) => ({
      text: "",
      stale: false,
      source: "manual",
      updatedAt: null,
      ...(isPlainObject(sentence) ? sentence : {}),
      number: index + 1
    })
  );
  normalized.story.lockedSentences = ensureArray(
    normalized.story.lockedSentences
  ).map((sentence) => ({
    id: "",
    text: "",
    ...(isPlainObject(sentence) ? sentence : {})
  }));
  if (
    normalized.story.status === "locked" &&
    normalized.story.sentences.length > 0 &&
    (!hadLockedSentenceArray || normalized.story.lockedSentences.length === 0)
  ) {
    normalized.story.lockedSentences = normalized.story.sentences.map(
      (sentence, index) => ({
        id: sentence.id,
        number: index + 1,
        text: sentence.text
      })
    );
  }
  normalized.characters = ensureArray(normalized.characters).map(normalizeCharacter);
  normalized.scenesMeta = normalizeMetadata(normalized.scenesMeta);
  normalized.scenes = ensureArray(normalized.scenes).map((scene, index) => {
    const normalizedScene = {
      ...defaultScene,
      ...scene,
      sentenceIds: ensureArray(scene?.sentenceIds),
      characterIds: ensureArray(scene?.characterIds)
    };
    normalizedScene.visualDirection = normalizeSceneVisualDirection(
      normalizedScene.visualDirection
    );
    normalizedScene.number = Number.isFinite(normalizedScene.number)
      ? normalizedScene.number
      : index + 1;
    normalizedScene.label = normalizedScene.label || `Scene ${normalizedScene.number}`;
    normalizedScene.generationCount = Number.isFinite(normalizedScene.generationCount)
      ? normalizedScene.generationCount
      : 0;
    normalizedScene.imagePath = normalizeImagePath(normalizedScene.imagePath);
    normalizedScene.imageMeta = normalizeMetadata(normalizedScene.imageMeta);
    if (
      !normalizedScene.imagePath &&
      (normalizedScene.approved ||
        normalizedScene.generationStatus === "generated" ||
        normalizedScene.generationStatus === "approved")
    ) {
      normalizedScene.generationStatus = "not_started";
      normalizedScene.approved = false;
      normalizedScene.stale = true;
      normalizedScene.staleReason =
        normalizedScene.staleReason || "Scene image needs generation.";
      normalizedScene.staleAt = normalizedScene.staleAt || new Date().toISOString();
    }
    if (normalizedScene.generationStatus === "approved") {
      normalizedScene.approved = Boolean(normalizedScene.imagePath);
    }
    return normalizedScene;
  });
  normalized.setup.secondaryCharacters = ensureArray(
    normalized.setup.secondaryCharacters
  );
  normalized.setup.secondaryCharacters = normalizeSecondaryCharacterTags(
    normalized.setup.secondaryCharacters
  );
  normalized.sentenceCount = Number(normalized.sentenceCount);
  normalized.reusable.backgrounds = ensureArray(normalized.reusable.backgrounds);
  normalized.reusable.noteTags = ensureArray(normalized.reusable.noteTags);
  normalized.media.items = ensureArray(normalized.media.items);
  normalized.media.stale = Boolean(normalized.media.stale);
  normalized.media.staleReason = normalized.media.staleReason || null;
  normalized.media.staleAt = normalized.media.staleAt || null;
  normalized.export.stale = Boolean(normalized.export.stale);
  normalized.export.staleReason = normalized.export.staleReason || null;
  normalized.export.staleAt = normalized.export.staleAt || null;

  return normalized;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCharacter(character) {
  const normalized = {
    ...defaultCharacter,
    ...(isPlainObject(character) ? character : {}),
    notes: ensureArray(character?.notes)
  };
  normalized.appearanceDescription = normalizeLongText(
    normalized.appearanceDescription
  );
  normalized.generationCount = Number.isFinite(normalized.generationCount)
    ? normalized.generationCount
    : 0;
  normalized.imageStyle = normalizeCharacterImageStyle(normalized.imageStyle);
  normalized.imagePath = normalizeImagePath(normalized.imagePath);
  if (
    !normalized.imagePath &&
    (normalized.approved ||
      normalized.generationStatus === "generated" ||
      normalized.generationStatus === "approved")
  ) {
    normalized.generationStatus = "not_started";
    normalized.approved = false;
    normalized.stale = true;
    normalized.staleReason =
      normalized.staleReason || "Character image needs generation.";
    normalized.staleAt = normalized.staleAt || new Date().toISOString();
  }
  if (normalized.generationStatus === "approved") {
    normalized.approved = Boolean(normalized.imagePath);
  }
  return normalized;
}

function normalizeCharacterImageStyle(value) {
  return value === "photorealistic" ? "photorealistic" : "illustration";
}

function normalizeLongText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ").slice(0, 600).trim();
}

function normalizeSceneVisualDirection(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ").slice(0, 800).trim();
}

function normalizeImagePath(value) {
  if (value === null || value === undefined || value === "") return null;
  const imagePath = String(value).trim();
  if (!isSafeProjectImagePath(imagePath)) return null;
  return imagePath;
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

function normalizeMetadata(value) {
  if (value === null || value === undefined) return null;
  return isPlainObject(value) ? value : null;
}
