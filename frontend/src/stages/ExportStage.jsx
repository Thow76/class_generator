import { useState } from "react";
import Icon from "../components/Icon.jsx";
import StageHeader from "../components/StageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  getMediaBlockers,
  getMediaSummaryFromItems,
  getRequiredMediaItems,
  isMediaReady
} from "../utils/lessonSelectors.js";

export default function ExportStage({
  lesson,
  readiness = null,
  readinessStatus = "idle",
  readinessError = "",
  onRefreshReadiness
}) {
  const [message, setMessage] = useState("");
  const lockedCount =
    lesson.story.status === "locked" ? lesson.story.sentences.length : 0;
  const approvedCharacters = lesson.characters.filter(
    (character) => character.approved
  ).length;
  const approvedScenes = lesson.scenes.filter(
    (scene) => scene.approved
  ).length;
  const mediaReady = isMediaReady(lesson, readiness);
  const summary =
    readiness?.summary || getMediaSummaryFromItems(getRequiredMediaItems(lesson));
  const blockers = getMediaBlockers(lesson, readiness);
  const readinessLabel = getReadinessLabel(readinessStatus, mediaReady);

  return (
    <div className="stage stage--export">
      <StageHeader step="Step 6 of 6 - Export" title="Export lesson source">
        Check the local lesson source summary before the real export pipeline is
        added.
      </StageHeader>

      <section className="panel export-summary">
        <div className="panel__title">
          <Icon>inventory_2</Icon>
          <h2>{lesson.title || "Untitled lesson"}</h2>
        </div>
        <div className="summary-grid">
          <div>
            <span>Media readiness</span>
            <strong>{readinessLabel}</strong>
          </div>
          <div>
            <span>Learner level</span>
            <strong>{lesson.learnerLevel}</strong>
          </div>
          <div>
            <span>Locked story sentences</span>
            <strong>{lockedCount}</strong>
          </div>
          <div>
            <span>Approved characters</span>
            <strong>{approvedCharacters}</strong>
          </div>
          <div>
            <span>Approved scenes</span>
            <strong>{approvedScenes}</strong>
          </div>
          <div>
            <span>Media blockers</span>
            <strong>{blockers.length}</strong>
          </div>
          <div>
            <span>Last export</span>
            <strong>{lesson.export.lastExportedAt ? "Previous" : "None"}</strong>
          </div>
        </div>
      </section>

      <section className="panel export-summary">
        <div className="panel__title">
          <Icon>{mediaReady ? "check_circle" : "warning"}</Icon>
          <h2>Visual media</h2>
        </div>
        <div className="asset-card__badges">
          <StatusBadge
            icon={
              readinessStatus === "checking"
                ? "hourglass_bottom"
                : mediaReady
                  ? "check_circle"
                  : "warning"
            }
            tone={mediaReady ? "primary" : "warning"}
          >
            {readinessLabel}
          </StatusBadge>
          {lesson.media.stale || lesson.export.stale ? (
            <StatusBadge icon="warning" tone="warning">
              Stale warning
            </StatusBadge>
          ) : null}
        </div>
        <p className="export-summary__note">
          {readinessStatus === "success"
            ? `${summary.approved} approved, ${summary.generated} generated, ${summary.missing} missing, ${summary.stale} stale, ${summary.fileMissing} file missing.`
            : "Run media readiness to verify local image files before export."}
        </p>
        {readinessStatus === "error" ? (
          <div className="notice notice--warning notice--compact">
            <Icon>warning</Icon>
            {readinessError || "Media readiness check failed."}
          </div>
        ) : null}
        {blockers.length > 0 ? (
          <ul className="export-blockers">
            {blockers.slice(0, 5).map((blocker, index) => (
              <li key={`${blocker.kind}-${blocker.id}-${index}`}>{blocker.message}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="stage-actions">
        <button
          className="button button--secondary"
          type="button"
          onClick={onRefreshReadiness}
          disabled={readinessStatus === "checking"}
        >
          <Icon>
            {readinessStatus === "checking" ? "hourglass_bottom" : "refresh"}
          </Icon>
          {readinessStatus === "checking" ? "Checking..." : "Check media readiness"}
        </button>
        <button
          className="button button--primary"
          type="button"
          onClick={() =>
            setMessage(
              "Phase 11 export is still a placeholder. No files were created."
            )
          }
          disabled={!mediaReady}
        >
          <Icon>download</Icon>
          Export lesson source
        </button>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setMessage("Phase 11 preview is a local summary only.")}
        >
          <Icon>visibility</Icon>
          Preview lesson
        </button>
      </div>
      {message ? (
        <div className="notice">
          <Icon>info</Icon>
          {message}
        </div>
      ) : null}
    </div>
  );
}

function getReadinessLabel(readinessStatus, mediaReady) {
  if (readinessStatus === "checking") return "Checking";
  if (readinessStatus === "error") return "Check failed";
  if (readinessStatus !== "success") return "Not verified";
  return mediaReady ? "Ready" : "Needs attention";
}
