import Icon from "./Icon.jsx";

const stageIcon = {
  completed: "check_circle",
  active: "hourglass_bottom",
  incomplete: "radio_button_unchecked"
};

export default function Sidebar({
  stages,
  currentStage,
  completedStages,
  onStageChange,
  apiStatus,
  projectControls
}) {
  const projectActionDisabled = Boolean(projectControls.isProjectActionDisabled);
  const isProjectLoading = projectControls.loadStatus === "loading";
  const isProjectListLoading = projectControls.projectListStatus === "loading";
  const hasSavedProjects = projectControls.projectList.length > 0;
  const projectActionDisabledTitle = isProjectLoading
    ? "Wait for the current project load to finish."
    : projectActionDisabled
      ? "Wait for the current story operation to finish."
    : undefined;
  const saveLabel = {
    unsaved: "Unsaved changes",
    saving: "Saving...",
    saved: "Saved",
    error: "Save failed"
  }[projectControls.saveStatus];
  const savedAtLabel =
    projectControls.saveStatus === "saved" && projectControls.lastSavedAt
      ? ` ${formatSavedAt(projectControls.lastSavedAt)}`
      : "";
  const canClearRestoreIssue =
    Boolean(projectControls.restoreIssue) &&
    projectControls.restoreIssue.message === projectControls.projectError &&
    typeof projectControls.onClearRestoreIssue === "function";
  const restoreIssueActionLabel =
    projectControls.restoreIssue?.source === "url" ? "Clear request" : "Dismiss";
  const restoreIssueActionIcon =
    projectControls.restoreIssue?.source === "url" ? "link_off" : "close";

  return (
    <aside className="sidebar">
      <div className="brand">
        <Icon className="brand__icon">auto_stories</Icon>
        <span>Lesson Source Builder</span>
      </div>

      <section className="project-panel" aria-label="Project controls">
        <div className="project-panel__summary">
          <span>Current lesson</span>
          <strong>{projectControls.projectTitle}</strong>
          <small>{projectControls.activeProjectId || "Not saved yet"}</small>
        </div>

        <div className="project-panel__actions">
          <button
            className="mini-button"
            type="button"
            onClick={projectControls.onNewLesson}
            disabled={isProjectLoading || projectActionDisabled}
            title={projectActionDisabledTitle}
          >
            <Icon>note_add</Icon>
            New
          </button>
          <button
            className="mini-button"
            type="button"
            onClick={projectControls.onOpenLessonPanel}
            disabled={isProjectLoading || projectActionDisabled}
            title={projectActionDisabledTitle}
          >
            <Icon>folder_open</Icon>
            Open
          </button>
          <button
            className="mini-button"
            type="button"
            onClick={projectControls.onDuplicateLesson}
            disabled={
              isProjectLoading ||
              projectControls.loadStatus === "duplicating" ||
              projectControls.saveStatus === "saving" ||
              projectActionDisabled
            }
            title={projectActionDisabledTitle}
          >
            <Icon>content_copy</Icon>
            Duplicate
          </button>
          <button
            className="mini-button mini-button--primary"
            type="button"
            onClick={projectControls.onSaveLesson}
            disabled={
              isProjectLoading ||
              projectControls.saveStatus === "saving" ||
              projectActionDisabled
            }
            title={projectActionDisabledTitle}
          >
            <Icon>save</Icon>
            Save
          </button>
        </div>

        <div
          className={`project-status project-status--${projectControls.saveStatus}`}
        >
          <Icon>{projectControls.saveStatus === "saved" ? "check_circle" : "edit"}</Icon>
          <span>
            {saveLabel}
            {savedAtLabel}
          </span>
        </div>

        {projectControls.loadStatus === "loading" && (
          <div className="project-status">
            <Icon>hourglass_bottom</Icon>
            <span>Loading projects...</span>
          </div>
        )}
        {projectControls.loadStatus === "duplicating" && (
          <div className="project-status">
            <Icon>content_copy</Icon>
            <span>Duplicating...</span>
          </div>
        )}
        {projectControls.projectError && (
          <div className="project-error">
            <span>{projectControls.projectError}</span>
            {canClearRestoreIssue && (
              <div className="project-error__actions">
                <button
                  className="mini-button"
                  type="button"
                  onClick={projectControls.onClearRestoreIssue}
                  disabled={isProjectLoading || projectActionDisabled}
                  title={projectActionDisabledTitle}
                >
                  <Icon>{restoreIssueActionIcon}</Icon>
                  {restoreIssueActionLabel}
                </button>
              </div>
            )}
          </div>
        )}
        {projectControls.pendingProjectAction && (
          <div className="project-confirm">
            <span>{projectControls.pendingProjectAction.message}</span>
            <div className="project-confirm__actions">
              <button
                className="mini-button mini-button--primary"
                type="button"
                onClick={projectControls.onConfirmPendingAction}
                disabled={projectActionDisabled}
                title={projectActionDisabledTitle}
              >
                Continue
              </button>
              <button
                className="mini-button"
                type="button"
                onClick={projectControls.onCancelPendingAction}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {projectControls.isOpenProjectPanelVisible && (
          <div className="project-list">
            <div className="project-list__header">
              <span>Saved lessons</span>
              <button
                className="icon-button icon-button--small"
                type="button"
                onClick={projectControls.onCloseOpenLessonPanel}
                aria-label="Close saved lessons"
              >
                <Icon>close</Icon>
              </button>
            </div>
            <button
              className="mini-button"
              type="button"
              onClick={projectControls.onRefreshProjects}
              disabled={isProjectListLoading || isProjectLoading}
            >
              <Icon>refresh</Icon>
              Refresh
            </button>
            {isProjectListLoading && (
              <p className="project-list__empty">Loading saved lessons...</p>
            )}
            {projectControls.projectListError && (
              <div className="project-list__error">
                <span>{projectControls.projectListError}</span>
              </div>
            )}
            {!isProjectListLoading &&
            !projectControls.projectListError &&
            !hasSavedProjects ? (
              <p className="project-list__empty">No saved lessons yet.</p>
            ) : null}
            {hasSavedProjects && (
              <div className="project-list__items">
                {projectControls.projectList.map((project) => {
                  const projectUrl =
                    typeof projectControls.getProjectUrl === "function"
                      ? projectControls.getProjectUrl(project.id)
                      : "";
                  const hasProjectUrl = Boolean(projectUrl);
                  const linkDisabledTitle = hasProjectUrl
                    ? projectActionDisabledTitle
                    : "Project link unavailable.";

                  return (
                    <div className="project-list__item" key={project.id}>
                      <button
                        className="project-list__item-main"
                        type="button"
                        onClick={() => projectControls.onOpenProject(project.id)}
                        disabled={projectActionDisabled}
                        title={projectActionDisabledTitle}
                      >
                        <strong>{project.title || "Untitled lesson"}</strong>
                        <span>{project.theme || "No theme"}</span>
                        <small>
                          {project.learnerLevel} / {project.currentStage} /{" "}
                          {formatUpdatedAt(project.updatedAt)}
                        </small>
                      </button>
                      <div className="project-list__item-actions">
                        <button
                          className="icon-button icon-button--small"
                          type="button"
                          onClick={() => projectControls.onCopyProjectLink(project.id)}
                          disabled={!hasProjectUrl}
                          title={
                            hasProjectUrl
                              ? "Copy project link"
                              : "Project link unavailable."
                          }
                          aria-label={`Copy link for ${
                            project.title || "untitled lesson"
                          }`}
                        >
                          <Icon>content_copy</Icon>
                        </button>
                        <button
                          className="icon-button icon-button--small"
                          type="button"
                          onClick={() => projectControls.onOpenProjectLink(project.id)}
                          disabled={!hasProjectUrl || projectActionDisabled}
                          title={linkDisabledTitle || "Open project link"}
                          aria-label={`Open link for ${
                            project.title || "untitled lesson"
                          }`}
                        >
                          <Icon>open_in_new</Icon>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <nav className="stage-nav" aria-label="Workflow stages">
        {stages.map((stage) => {
          const isActive = currentStage === stage.id;
          const isCompleted = completedStages.includes(stage.id);
          const state = isActive ? "active" : isCompleted ? "completed" : "incomplete";

          return (
            <button
              className={`stage-nav__item stage-nav__item--${state}`}
              key={stage.id}
              type="button"
              onClick={() => onStageChange(stage.id)}
              disabled={isProjectLoading}
              title={isProjectLoading ? projectActionDisabledTitle : undefined}
            >
              <Icon>{stageIcon[state]}</Icon>
              <span>{stage.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={`api-status api-status--${apiStatus}`}>
        <span className="api-status__dot" />
        <span>{apiStatus === "connected" ? "API connected" : "API unavailable"}</span>
      </div>
    </aside>
  );
}

function formatUpdatedAt(value) {
  if (!value) return "Unknown update time";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}
