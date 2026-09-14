export const lastProjectStorageKey = "lessonSourceBuilder:lastProjectId";

const safeProjectIdPattern = /^lesson-[A-Za-z0-9_-]+$/;

export function isLikelySafeProjectId(value) {
  if (typeof value !== "string") return false;
  if (value.trim() !== value || value.length === 0 || value.length > 96) {
    return false;
  }
  if (!value.startsWith("lesson-")) return false;
  if (
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("..") ||
    value.includes("\0")
  ) {
    return false;
  }
  return safeProjectIdPattern.test(value);
}

export function readLastProjectId(storage = getDefaultStorage()) {
  if (!storage) return null;

  let projectId;
  try {
    projectId = storage.getItem(lastProjectStorageKey);
  } catch {
    return null;
  }

  if (projectId === null || projectId === undefined) return null;
  if (isLikelySafeProjectId(projectId)) return projectId;

  clearLastProjectId(storage);
  return null;
}

export function writeLastProjectId(projectId, storage = getDefaultStorage()) {
  if (!storage || !isLikelySafeProjectId(projectId)) return;

  try {
    storage.setItem(lastProjectStorageKey, projectId);
  } catch {
    // localStorage is only a convenience pointer; storage failures are non-fatal.
  }
}

export function clearLastProjectId(storage = getDefaultStorage()) {
  if (!storage) return;

  try {
    storage.removeItem(lastProjectStorageKey);
  } catch {
    // localStorage is only a convenience pointer; storage failures are non-fatal.
  }
}

function getDefaultStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
