import { learnerLevels } from "./constants.js";

const defaultLesson = {
  id: "lesson-001",
  theme: "",
  title: "",
  learnerLevel: learnerLevels[0],
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

export function createEmptyLesson(overrides = {}) {
  return mergeLesson(defaultLesson, overrides);
}

function mergeLesson(base, overrides) {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return structuredClone(overrides);
  }

  const merged = structuredClone(base);
  Object.entries(overrides).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeLesson(merged[key], value);
      return;
    }
    merged[key] = structuredClone(value);
  });

  return merged;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
