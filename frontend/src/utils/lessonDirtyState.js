import { normalizeLessonForClient } from "./normalizeLesson.js";

const displayOnlyLessonFields = new Set([
  "createdAt",
  "lastSavedAt",
  "saveStatus",
  "savedAt",
  "updatedAt"
]);

export function createLessonSnapshot(lesson) {
  if (!lesson) return null;
  return stableStringify(createPersistedLessonSnapshot(lesson));
}

export function lessonsHaveUnsavedChanges(currentLesson, savedSnapshot) {
  const currentSnapshot = createLessonSnapshot(currentLesson);
  if (!savedSnapshot) {
    return hasMeaningfulLessonContent(currentLesson);
  }

  return currentSnapshot !== savedSnapshot;
}

function hasMeaningfulLessonContent(lesson) {
  const normalized = createPersistedLessonSnapshot(lesson || {});
  const empty = createPersistedLessonSnapshot({ id: normalized.id });

  return stableStringify(normalized) !== stableStringify(empty);
}

function createPersistedLessonSnapshot(lesson) {
  const normalized = normalizeLessonForClient(lesson);
  const persistedLesson = { ...normalized };

  displayOnlyLessonFields.forEach((field) => {
    delete persistedLesson[field];
  });

  return persistedLesson;
}

function stableStringify(value) {
  return JSON.stringify(canonicalizeJsonValue(value));
}

function canonicalizeJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((canonical, key) => {
      const canonicalValue = canonicalizeJsonValue(value[key]);
      if (canonicalValue !== undefined) {
        canonical[key] = canonicalValue;
      }
      return canonical;
    }, {});
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
