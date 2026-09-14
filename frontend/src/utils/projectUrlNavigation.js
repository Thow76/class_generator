import {
  buildProjectUrl,
  buildUrlWithoutProjectId,
  getProjectRestoreCandidateFromUrl
} from "./projectSessionUrl.js";
import { isLikelySafeProjectId } from "./projectSessionStorage.js";
import { discardUnsavedChangesMessage } from "./unsavedChangesGuard.js";

export const invalidUrlProjectMessage = "The lesson id in the URL is invalid.";

export function decideProjectUrlNavigation({
  location,
  activeProjectId = null,
  hasUnsavedChanges = false
} = {}) {
  const candidate = getProjectRestoreCandidateFromUrl(location);

  if (candidate.malformed) {
    return {
      type: "invalid-url",
      source: "url",
      reason: "malformed",
      projectId: null,
      rawValue: candidate.rawValue,
      message: invalidUrlProjectMessage
    };
  }

  if (!candidate.valid) {
    return {
      type: "none",
      reason: "absent"
    };
  }

  if (candidate.projectId === activeProjectId) {
    return {
      type: "none",
      reason: "current",
      projectId: candidate.projectId
    };
  }

  if (hasUnsavedChanges) {
    return {
      type: "confirm-open",
      source: "url",
      projectId: candidate.projectId,
      previousProjectId: activeProjectId,
      message: discardUnsavedChangesMessage
    };
  }

  return {
    type: "open",
    source: "url",
    projectId: candidate.projectId,
    previousProjectId: activeProjectId
  };
}

export function buildUrlForCancelledProjectNavigation(location, activeProjectId) {
  if (isLikelySafeProjectId(activeProjectId)) {
    return buildProjectUrl(activeProjectId, location);
  }

  return buildUrlWithoutProjectId(location);
}
