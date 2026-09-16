export function getSidebarStageState({
  completedStages = [],
  currentStage,
  isProjectLoading = false,
  stageId
}) {
  if (isProjectLoading) {
    return "incomplete";
  }

  if (currentStage === stageId) {
    return "active";
  }

  return Array.isArray(completedStages) && completedStages.includes(stageId)
    ? "completed"
    : "incomplete";
}
