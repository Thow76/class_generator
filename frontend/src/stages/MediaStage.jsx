import Icon from "../components/Icon.jsx";
import StageHeader from "../components/StageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  getMediaBlockers,
  getMediaSummaryFromItems,
  getProjectAssetUrl,
  getRequiredMediaItems,
  isMediaReady
} from "../utils/lessonSelectors.js";

const filters = ["All", "Needs attention", "Characters", "Scenes", "Approved"];

const statusLabels = {
  approved: "Approved",
  generated: "Generated",
  missing: "Missing",
  stale: "Stale",
  file_missing: "File missing",
  invalid: "Invalid"
};

const statusIcons = {
  approved: "check_circle",
  generated: "pending",
  missing: "radio_button_unchecked",
  stale: "warning",
  file_missing: "folder_off",
  invalid: "error"
};

const statusTones = {
  approved: "primary",
  generated: "warning",
  missing: "neutral",
  stale: "warning",
  file_missing: "warning",
  invalid: "warning"
};

export default function MediaStage({
  lesson,
  onMediaFilterChange,
  readiness,
  readinessStatus = "idle",
  readinessError = "",
  onRefreshReadiness,
  onGoToStage
}) {
  const activeFilter = lesson.media.filter;
  const derivedItems = getRequiredMediaItems(lesson);
  const items = readiness?.items?.length
    ? mergeDisplayItems(readiness.items)
    : derivedItems;
  const summary = readiness?.summary || getMediaSummaryFromItems(items);
  const blockers = getMediaBlockers(lesson, readiness);
  const ready = isMediaReady(lesson, readiness);
  const readinessLabel = getReadinessLabel(readinessStatus, ready);
  const visibleItems = items.filter((item) => matchesFilter(item, activeFilter));

  return (
    <div className="stage stage--media">
      <StageHeader step="Step 5 of 6 - Media" title="Media review">
        Verify character references and scene images before the export pipeline is
        added.
      </StageHeader>

      <section className="panel media-readiness">
        <div className="media-readiness__header">
          <div>
            <StatusBadge
              icon={
                readinessStatus === "checking"
                  ? "hourglass_bottom"
                  : ready
                    ? "check_circle"
                    : "warning"
              }
              tone={ready ? "primary" : "warning"}
            >
              {readinessLabel}
            </StatusBadge>
            <p>
              {readinessStatus === "success"
                ? "File-backed readiness was checked against local project assets."
                : readinessStatus === "checking"
                  ? "Checking saved lesson media against local project assets."
                : "Use Refresh to verify local image files before export."}
            </p>
          </div>
          <button
            className="button button--secondary"
            type="button"
            onClick={onRefreshReadiness}
            disabled={readinessStatus === "checking"}
          >
            <Icon>
              {readinessStatus === "checking" ? "hourglass_bottom" : "refresh"}
            </Icon>
            {readinessStatus === "checking" ? "Checking..." : "Refresh"}
          </button>
        </div>

        <div className="summary-grid summary-grid--media">
          <SummaryMetric label="Approved" value={summary.approved} />
          <SummaryMetric label="Generated" value={summary.generated} />
          <SummaryMetric label="Missing" value={summary.missing} />
          <SummaryMetric label="Stale" value={summary.stale} />
          <SummaryMetric label="File missing" value={summary.fileMissing} />
        </div>

        {readinessStatus === "error" ? (
          <div className="notice notice--warning">
            <Icon>warning</Icon>
            {readinessError || "Media readiness check failed."}
          </div>
        ) : null}

        {blockers.length > 0 ? (
          <div className="media-blockers" aria-label="Media blockers">
            {blockers.slice(0, 4).map((blocker, index) => (
              <div
                className="media-blocker"
                key={`${blocker.kind}-${blocker.id}-${index}`}
              >
                <Icon>priority_high</Icon>
                <span>{blocker.message}</span>
                {blocker.kind === "Characters" ? (
                  <button type="button" onClick={() => onGoToStage?.("characters")}>
                    Go to Characters
                  </button>
                ) : null}
                {blocker.kind === "Scenes" ? (
                  <button type="button" onClick={() => onGoToStage?.("scenes")}>
                    Go to Scenes
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="segmented-control" aria-label="Media filters">
        {filters.map((filter) => (
          <button
            className={activeFilter === filter ? "is-active" : ""}
            type="button"
            key={filter}
            onClick={() => onMediaFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="notice">
          <Icon>info</Icon>
          Lock the story, extract characters, and plan scenes before reviewing media.
        </div>
      ) : null}

      {visibleItems.length === 0 && items.length > 0 ? (
        <div className="notice">
          <Icon>filter_alt</Icon>
          No media items match this filter.
        </div>
      ) : null}

      <div className="media-grid">
        {visibleItems.map((item) => (
          <article className="media-card" key={`${item.kind}-${item.id}`}>
            <div
              className={`media-card__image media-card__image--${item.kind.toLowerCase()}`}
            >
              {item.imagePath ? (
                <img
                  alt={`${item.title} ${item.kind.toLowerCase()} image`}
                  className="media-card__asset"
                  src={getProjectAssetUrl(lesson.id, item.imagePath)}
                />
              ) : (
                <Icon>
                  {item.icon || (item.kind === "Characters" ? "portrait" : "image")}
                </Icon>
              )}
            </div>
            <div className="media-card__content">
              <span>{item.kind}</span>
              <h2>{item.title}</h2>
              <div className="asset-card__badges">
                <StatusBadge
                  icon={statusIcons[item.status] || "info"}
                  tone={statusTones[item.status] || "neutral"}
                >
                  {statusLabels[item.status] || item.status}
                </StatusBadge>
                {item.stale ? (
                  <StatusBadge icon="warning" tone="warning">
                    Stale
                  </StatusBadge>
                ) : null}
                {item.status === "file_missing" ? (
                  <StatusBadge icon="folder_off" tone="warning">
                    File missing
                  </StatusBadge>
                ) : null}
              </div>
              <p className="media-card__guidance">
                {readGuidance(item, readinessStatus)}
              </p>
              {item.kind === "Characters" && item.blocking ? (
                <button
                  className="mini-button"
                  type="button"
                  onClick={() => onGoToStage?.("characters")}
                >
                  <Icon>portrait</Icon>
                  Go to Characters
                </button>
              ) : null}
              {item.kind === "Scenes" && item.blocking ? (
                <button
                  className="mini-button"
                  type="button"
                  onClick={() => onGoToStage?.("scenes")}
                >
                  <Icon>image</Icon>
                  Go to Scenes
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function mergeDisplayItems(items) {
  return items.map((item) => ({
    ...item,
    icon: item.kind === "Characters" ? "portrait" : "image"
  }));
}

function matchesFilter(item, filter) {
  if (filter === "All") return true;
  if (filter === "Needs attention") return item.blocking || item.status !== "approved";
  if (filter === "Approved") return item.status === "approved";
  return item.kind === filter;
}

function readGuidance(item, readinessStatus) {
  if (item.messages?.length > 0) return item.messages[0];
  if (item.status === "approved" && readinessStatus === "success") {
    return "File-backed and ready for export.";
  }
  if (item.status === "approved") {
    return "Approved in the lesson; refresh to verify the local file.";
  }
  return "Review this item before export.";
}

function getReadinessLabel(readinessStatus, ready) {
  if (readinessStatus === "checking") return "Checking";
  if (readinessStatus === "error") return "Check failed";
  if (readinessStatus !== "success") return "Not verified";
  return ready ? "Ready" : "Needs attention";
}
