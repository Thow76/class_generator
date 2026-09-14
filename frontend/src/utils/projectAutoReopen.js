import { isLikelySafeProjectId } from "./projectSessionStorage.js";

export function selectAutoReopenProject(projects) {
  if (!Array.isArray(projects) || projects.length === 0) return null;

  const candidates = projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) => isLikelySafeProjectId(project?.id))
    .sort((left, right) => {
      const updatedAtDifference =
        readUpdatedAtTime(right.project?.updatedAt) -
        readUpdatedAtTime(left.project?.updatedAt);
      return updatedAtDifference || left.index - right.index;
    });

  return (
    candidates.find(({ project }) => !project?.error)?.project ||
    candidates[0]?.project ||
    null
  );
}

function readUpdatedAtTime(value) {
  if (typeof value !== "string" || value.length === 0) return 0;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
