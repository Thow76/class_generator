const DEFAULT_LESSON = {
  id: "",
  theme: "",
  title: "",
  learnerLevel: "Literacies Plus",
  setting: "",
  scenario: "",
  sentenceCount: 9,
  setup: {
    mainCharacter: {
      name: "",
      age: "",
      sex: "",
      background: ""
    },
    secondaryCharacters: [],
    targetVocabulary: "",
    additionalNotes: ""
  },
  story: {
    status: "draft",
    sentences: [],
    lockedAt: null,
    lockedSentences: [],
    modifiedAfterLock: false,
    lastGeneratedAt: null,
    generationMeta: null
  },
  characters: [],
  scenesMeta: null,
  scenes: [],
  reusable: {
    backgrounds: [],
    noteTags: []
  },
  media: {
    filter: "All",
    items: [],
    stale: false,
    staleReason: null,
    staleAt: null
  },
  export: {
    lastExportedAt: null,
    lastExportPath: null,
    stale: false,
    staleReason: null,
    staleAt: null
  },
  currentStage: "setup"
};

const sentenceCounts = [6, 8, 9, 10, 12];

const DEFAULT_CHARACTER = {
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

const DEFAULT_SCENE = {
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

export function normalizeLesson(input = {}, projectId) {
  const normalized = mergeLesson(DEFAULT_LESSON, isPlainObject(input) ? input : {});

  if (projectId) {
    normalized.id = projectId;
  }

  normalized.sentenceCount = normalizeSentenceCount(normalized.sentenceCount);
  normalized.setup = normalizeSetup(normalized.setup);
  normalized.story = normalizeStory(normalized.story);
  normalized.characters = ensureArray(normalized.characters).map(normalizeCharacter);
  normalized.scenesMeta = normalizeMetadata(normalized.scenesMeta);
  normalized.scenes = ensureArray(normalized.scenes).map((scene, index) =>
    normalizeScene(scene, index)
  );
  normalized.reusable = normalizeObjectLists(normalized.reusable, [
    "backgrounds",
    "noteTags"
  ]);
  normalized.media = normalizeObjectLists(normalized.media, ["items"]);
  normalized.export = isPlainObject(normalized.export)
    ? normalized.export
    : { ...DEFAULT_LESSON.export };

  return normalized;
}

function normalizeSetup(setup) {
  const normalized = mergeLesson(DEFAULT_LESSON.setup, isPlainObject(setup) ? setup : {});
  normalized.mainCharacter = mergeLesson(
    DEFAULT_LESSON.setup.mainCharacter,
    isPlainObject(normalized.mainCharacter) ? normalized.mainCharacter : {}
  );
  normalized.secondaryCharacters = normalizeSecondaryCharacterTags(
    normalized.secondaryCharacters
  );
  return normalized;
}

function normalizeSentenceCount(value) {
  const count = Number(value);
  return sentenceCounts.includes(count) ? count : DEFAULT_LESSON.sentenceCount;
}

function normalizeSecondaryCharacterTags(tags) {
  const seen = new Set();

  return ensureArray(tags).reduce((nextTags, tag) => {
    const normalized = String(tag || "").trim().replace(/\s+/g, " ");
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) return nextTags;
    seen.add(key);
    return [...nextTags, normalized];
  }, []);
}

function normalizeStory(story) {
  const hadLockedSentenceArray = Array.isArray(story?.lockedSentences);
  const normalized = mergeLesson(DEFAULT_LESSON.story, isPlainObject(story) ? story : {});
  normalized.sentences = ensureArray(normalized.sentences).map((sentence, index) => ({
    text: "",
    stale: false,
    source: "manual",
    updatedAt: null,
    ...(isPlainObject(sentence) ? sentence : {}),
    number: index + 1
  }));
  normalized.lockedSentences = ensureArray(normalized.lockedSentences).map(
    (sentence) => ({
      id: "",
      text: "",
      ...(isPlainObject(sentence) ? sentence : {})
    })
  );
  if (
    normalized.status === "locked" &&
    normalized.sentences.length > 0 &&
    (!hadLockedSentenceArray || normalized.lockedSentences.length === 0)
  ) {
    normalized.lockedSentences = normalized.sentences.map((sentence, index) => ({
      id: sentence.id,
      number: index + 1,
      text: sentence.text
    }));
  }
  return normalized;
}

function normalizeScene(scene, index) {
  const normalized = normalizeRecord(DEFAULT_SCENE, scene);
  normalized.number = Number.isFinite(normalized.number) ? normalized.number : index + 1;
  normalized.label = normalized.label || `Scene ${normalized.number}`;
  normalized.sentenceIds = ensureArray(normalized.sentenceIds);
  normalized.characterIds = ensureArray(normalized.characterIds);
  normalized.visualDirection = normalizeSceneVisualDirection(
    normalized.visualDirection
  );
  normalized.generationCount = Number.isFinite(normalized.generationCount)
    ? normalized.generationCount
    : 0;
  normalized.imagePath = normalizeImagePath(normalized.imagePath);
  normalized.imageMeta = normalizeMetadata(normalized.imageMeta);
  if (
    !normalized.imagePath &&
    (normalized.approved ||
      normalized.generationStatus === "generated" ||
      normalized.generationStatus === "approved")
  ) {
    normalized.generationStatus = "not_started";
    normalized.approved = false;
    normalized.stale = true;
    normalized.staleReason = normalized.staleReason || "Scene image needs generation.";
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

function normalizeCharacter(character) {
  const normalized = normalizeRecord(DEFAULT_CHARACTER, character);
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

function normalizeRecord(defaultRecord, record) {
  const normalized = mergeLesson(defaultRecord, isPlainObject(record) ? record : {});
  if ("notes" in normalized) {
    normalized.notes = ensureArray(normalized.notes);
  }
  return normalized;
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

function normalizeObjectLists(value, listKeys) {
  const normalized = isPlainObject(value) ? value : {};
  listKeys.forEach((key) => {
    normalized[key] = ensureArray(normalized[key]);
  });
  return normalized;
}

function normalizeMetadata(value) {
  if (value === null || value === undefined) return null;
  return isPlainObject(value) ? value : null;
}

function mergeLesson(base, overrides) {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return clone(overrides);
  }

  const merged = clone(base);
  Object.entries(overrides).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeLesson(merged[key], value);
      return;
    }
    merged[key] = clone(value);
  });

  return merged;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
