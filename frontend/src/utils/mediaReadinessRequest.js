export const saveBeforeMediaReadinessMessage =
  "Save before checking media readiness.";

export const unsavedMediaReadinessDetail =
  "Unsaved changes are not included until you save this project.";

export const saveProjectBeforeMediaReadinessMessage =
  "Save this lesson before checking media readiness.";

export function decideMediaReadinessRequest({
  activeProjectId,
  hasUnsavedChanges
} = {}) {
  if (!activeProjectId) {
    return {
      type: "blocked",
      reason: "no-project",
      message: saveProjectBeforeMediaReadinessMessage,
      projectId: null
    };
  }

  if (hasUnsavedChanges) {
    return {
      type: "blocked",
      reason: "unsaved",
      message: `${saveBeforeMediaReadinessMessage} ${unsavedMediaReadinessDetail}`,
      projectId: activeProjectId
    };
  }

  return {
    type: "check",
    projectId: activeProjectId
  };
}
