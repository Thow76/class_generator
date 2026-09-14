export function decideRestoreIssueClear({ restoreIssue, lastProjectId } = {}) {
  if (!restoreIssue) {
    return {
      clearIssue: false,
      clearUrlProject: false,
      clearLastProjectId: false,
      replaceLesson: false
    };
  }

  return {
    clearIssue: true,
    clearUrlProject: restoreIssue.source === "url",
    clearLastProjectId:
      Boolean(restoreIssue.projectId) && restoreIssue.projectId === lastProjectId,
    replaceLesson: false
  };
}
