import { useRef } from "react";
import Icon from "../components/Icon.jsx";
import StageHeader from "../components/StageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import {
  areRequiredCharactersApproved,
  getSceneSentenceRecords,
  getProjectAssetUrl,
  getUnassignedStorySentences,
  normalizeSceneSentenceIds
} from "../utils/lessonSelectors.js";

export default function ScenesStage({
  lesson,
  onSceneChange,
  onAddSentenceToScene,
  onRemoveSentenceFromScene,
  onGenerateScene,
  onApproveScene,
  onPlanScenes,
  onConfirmPlanScenes,
  onCancelPlanScenes,
  scenePlanningStatus = "idle",
  scenePlanningError = "",
  sceneImageOperations = {},
  showSceneReplanConfirm = false,
  isScenePlanningDisabled = false
}) {
  const charactersById = new Map(
    lesson.characters.map((character) => [character.id, character])
  );
  const storySentences = lesson.story.sentences.map((sentence, index) => ({
    ...sentence,
    displayNumber: index + 1
  }));
  const unassignedSentences = getUnassignedStorySentences(lesson);
  const requiredCharactersApproved = areRequiredCharactersApproved(lesson);
  const storyLocked = lesson.story.status === "locked";
  const isPlanning = scenePlanningStatus === "planning";
  const isSceneImageOperationActive = Object.values(sceneImageOperations).some(
    (operation) => operation?.status === "loading"
  );
  const planDisabled =
    isScenePlanningDisabled ||
    isPlanning ||
    isSceneImageOperationActive ||
    !storyLocked ||
    !requiredCharactersApproved;
  const sceneSentenceSelectRefs = useRef(new Map());

  function getAvailableSentences(scene) {
    const sceneSentenceIds = new Set(
      normalizeSceneSentenceIds(lesson, scene.sentenceIds)
    );

    return storySentences.filter((sentence) => !sceneSentenceIds.has(sentence.id));
  }

  function getSentenceOptionLabel(sentence) {
    const text =
      sentence.text.length > 78
        ? `${sentence.text.slice(0, 75).trim()}...`
        : sentence.text;
    return `${sentence.displayNumber}. ${text}`;
  }

  function focusSceneSentenceSelect(sceneId) {
    requestAnimationFrame(() => {
      sceneSentenceSelectRefs.current.get(sceneId)?.focus();
    });
  }

  function addSentenceReference(sceneId, sentenceId) {
    if (!sceneId || !sentenceId) return;
    onAddSentenceToScene(sceneId, sentenceId);
    focusSceneSentenceSelect(sceneId);
  }

  function removeSentenceReference(sceneId, sentenceId) {
    onRemoveSentenceFromScene(sceneId, sentenceId);
    focusSceneSentenceSelect(sceneId);
  }

  function getSceneReadiness(scene) {
    if (!storyLocked) return "Lock the story before generating scene images.";
    if (scene.stale) return "Review stale scene details before regenerating.";
    if (!scene.sentenceIds?.length) return "Add sentence coverage before generating.";
    if (!scene.location.trim()) return "Add a location before generating.";
    if (!scene.description.trim()) return "Add a description before generating.";
    if (!scene.characterIds?.length) return "Add approved characters before generating.";
    const missingCharacter = scene.characterIds.find((characterId) => {
      const character = charactersById.get(characterId);
      return (
        !character ||
        character.stale ||
        !character.approved ||
        character.generationStatus !== "approved" ||
        !character.imagePath
      );
    });
    if (missingCharacter) {
      return "Approve current character references before generating.";
    }
    if (scene.imageMode === "reuse") {
      const sourceScene = lesson.scenes.find((item) => item.id === scene.reuseSceneId);
      if (
        !sourceScene ||
        sourceScene.id === scene.id ||
        !sourceScene.imagePath ||
        sourceScene.stale ||
        !["generated", "approved"].includes(sourceScene.generationStatus)
      ) {
        return "Choose a generated scene to reuse.";
      }
    }
    return "";
  }

  return (
    <div className="stage stage--scenes">
      <StageHeader step="Step 4 of 6 - Scenes" title="Scenes">
        Group story sentences into reviewable image references.
      </StageHeader>

      {!requiredCharactersApproved ? (
        <section className="notice notice--compact" aria-live="polite">
          <Icon>portrait</Icon>
          <span>Approve required character references before scene planning.</span>
        </section>
      ) : null}

      <section className="notice notice--compact" aria-live="polite">
        <Icon>{scenePlanningStatus === "success" ? "check_circle" : "auto_awesome"}</Icon>
        <span>
          {scenePlanningStatus === "planning"
            ? "Planning scenes..."
            : scenePlanningStatus === "success"
              ? "Scene plan saved."
              : storyLocked
                ? "Plan scenes from the locked story."
                : "Lock the story before planning scenes."}
        </span>
        <div className="notice__actions">
          <button
            className="button button--primary"
            type="button"
            disabled={planDisabled}
            onClick={onPlanScenes}
          >
            <Icon>auto_awesome</Icon>
            {isPlanning ? "Planning scenes..." : "Plan scenes"}
          </button>
        </div>
      </section>

      {showSceneReplanConfirm ? (
        <section className="notice notice--warning" aria-live="polite">
          <Icon>warning</Icon>
          <span>Replan existing scenes? Generated or approved scene work will be kept for review if it no longer matches.</span>
          <div className="notice__actions">
            <button
              className="button button--primary"
              type="button"
              disabled={isSceneImageOperationActive}
              onClick={onConfirmPlanScenes}
            >
              <Icon>check</Icon>
              Replan scenes
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={isSceneImageOperationActive}
              onClick={onCancelPlanScenes}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {scenePlanningStatus === "error" ? (
        <section className="notice notice--warning" aria-live="polite">
          <Icon>warning</Icon>
          <span>{scenePlanningError || "Scene planning failed. Try again."}</span>
        </section>
      ) : null}

      <section className="unassigned-sentences" aria-labelledby="unassigned-title">
        <div className="unassigned-sentences__topline">
          <h2 id="unassigned-title">Unassigned story sentences</h2>
          <StatusBadge
            icon={unassignedSentences.length ? "info" : "check_circle"}
            tone={unassignedSentences.length ? "neutral" : "primary"}
          >
            {unassignedSentences.length
              ? `${unassignedSentences.length} unassigned`
              : "All assigned"}
          </StatusBadge>
        </div>
        {unassignedSentences.length > 0 ? (
          <div className="sentence-reference-list">
            {unassignedSentences.map((sentence) => (
              <div
                className="sentence-reference-row sentence-reference-row--with-control"
                key={sentence.id}
              >
                <span className="sentence-reference-row__number">
                  {sentence.displayNumber}
                </span>
                <p>{sentence.text}</p>
                <label className="sentence-reference-picker">
                  <span className="visually-hidden">
                    Assign sentence {sentence.displayNumber} to scene
                  </span>
                  <select
                    defaultValue=""
                    disabled={
                      lesson.scenes.length === 0 ||
                      isPlanning ||
                      isSceneImageOperationActive
                    }
                    onChange={(event) => {
                      addSentenceReference(event.target.value, sentence.id);
                      event.target.value = "";
                    }}
                  >
                    <option value="">
                      {lesson.scenes.length ? "Assign..." : "No scenes"}
                    </option>
                    {lesson.scenes.map((scene) => (
                      <option key={scene.id} value={scene.id}>
                        {scene.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="reference-empty-state">Every story sentence is assigned.</p>
        )}
      </section>

      <div className="scene-grid">
        {lesson.scenes.map((scene) => {
          const coveredSentences = getSceneSentenceRecords(lesson, scene);
          const availableSentences = getAvailableSentences(scene);
          const operation = sceneImageOperations[scene.id];
          const isGenerating =
            operation?.status === "loading" && operation.operation === "generate";
          const isApproving =
            operation?.status === "loading" && operation.operation === "approve";
          const readinessMessage = getSceneReadiness(scene);
          const isManualEditDisabled = isPlanning || isSceneImageOperationActive;
          const generateDisabled =
            isManualEditDisabled || Boolean(readinessMessage) || operation?.status === "loading";
          const approveDisabled =
            isManualEditDisabled ||
            operation?.status === "loading" ||
            !scene.imagePath ||
            scene.stale;
          const imageUrl = getProjectAssetUrl(lesson.id, scene.imagePath);

          return (
            <article
              className={`asset-card ${
                scene.approved ? "asset-card--approved" : ""
              }`}
              key={scene.id}
            >
              <div className="asset-card__topline">
                <h2>{scene.label}</h2>
                <div className="asset-card__badges">
                  {scene.stale ? (
                    <StatusBadge icon="warning" tone="warning">
                      Potentially stale
                    </StatusBadge>
                  ) : null}
                  {scene.approved ? (
                    <StatusBadge icon="check_circle" tone="primary">
                      Approved
                    </StatusBadge>
                  ) : null}
                </div>
              </div>

              <div
                className={`asset-placeholder asset-placeholder--scene asset-placeholder--${scene.generationStatus}`}
              >
                {imageUrl ? (
                  <img
                    alt={`${scene.label} generated scene`}
                    className="asset-image asset-image--scene"
                    src={imageUrl}
                  />
                ) : (
                  <Icon>image</Icon>
                )}
                <span>
                  {isGenerating
                    ? "Generating scene..."
                    : isApproving
                      ? "Approving scene..."
                      : scene.imagePath
                        ? `Scene image ${scene.generationCount || 1}`
                        : "No generated scene"}
                </span>
              </div>

              {operation?.status === "error" ? (
                <p className="field-error" role="alert">
                  {operation.error || "Scene image operation failed. Try again."}
                </p>
              ) : null}

              <label className="field">
                <span>Location</span>
                <input
                  value={scene.location}
                  disabled={isManualEditDisabled}
                  onChange={(event) =>
                    onSceneChange(scene.id, "location", event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Description</span>
                <textarea
                  rows={3}
                  value={scene.description}
                  disabled={isManualEditDisabled}
                  onChange={(event) =>
                    onSceneChange(scene.id, "description", event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Visual direction</span>
                <textarea
                  rows={3}
                  value={scene.visualDirection || ""}
                  placeholder="Temporary clothing, pose, expression, props or composition for this scene..."
                  disabled={isManualEditDisabled}
                  onChange={(event) =>
                    onSceneChange(scene.id, "visualDirection", event.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Image setting</span>
                <select
                  value={scene.imageMode}
                  disabled={isManualEditDisabled}
                  onChange={(event) =>
                    onSceneChange(scene.id, "imageMode", event.target.value)
                  }
                >
                  <option value="generate">Generate new image</option>
                  <option value="reuse">Reuse previous image</option>
                </select>
              </label>

              {scene.imageMode === "reuse" ? (
                <label className="field">
                  <span>Reuse scene</span>
                  <select
                    value={scene.reuseSceneId || ""}
                    disabled={isManualEditDisabled}
                    onChange={(event) =>
                      onSceneChange(scene.id, "reuseSceneId", event.target.value || null)
                    }
                  >
                    <option value="">Choose scene...</option>
                    {lesson.scenes
                      .filter(
                        (item) =>
                          item.id !== scene.id &&
                          item.imagePath &&
                          !item.stale &&
                          ["generated", "approved"].includes(item.generationStatus)
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}

              <div className="tag-editor">
                <span className="field-label">Characters</span>
                <div className="tag-list">
                  {scene.characterIds.map((characterId) => (
                    <span className="tag tag--plain" key={characterId}>
                      {charactersById.get(characterId)?.name || characterId}
                    </span>
                  ))}
                </div>
              </div>

              <div className="covered-sentences">
                <span className="field-label">Covered sentences</span>
                {coveredSentences.length > 0 ? (
                  <div className="sentence-reference-list">
                    {coveredSentences.map((sentence) => (
                      <div
                        className="sentence-reference-row sentence-reference-row--with-control"
                        key={sentence.id}
                      >
                        <span className="sentence-reference-row__number">
                          {sentence.displayNumber}
                        </span>
                        <p>{sentence.text}</p>
                        <button
                          aria-label={`Remove sentence ${sentence.displayNumber} from ${scene.label}`}
                          className="icon-button icon-button--small icon-button--quiet"
                          title={`Remove sentence ${sentence.displayNumber} from ${scene.label}`}
                          type="button"
                          disabled={isManualEditDisabled}
                          onClick={() => removeSentenceReference(scene.id, sentence.id)}
                        >
                          <Icon>close</Icon>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="reference-empty-state">No covered sentences</p>
                )}
              </div>

              <label className="field">
                <span>Add sentence</span>
                <select
                  ref={(select) => {
                    if (select) {
                      sceneSentenceSelectRefs.current.set(scene.id, select);
                    } else {
                      sceneSentenceSelectRefs.current.delete(scene.id);
                    }
                  }}
                  value=""
                  disabled={availableSentences.length === 0 || isManualEditDisabled}
                  onChange={(event) => {
                    if (!event.target.value) return;
                    addSentenceReference(scene.id, event.target.value);
                  }}
                >
                  <option value="">
                    {availableSentences.length
                      ? "Choose sentence..."
                      : "All covered"}
                  </option>
                  {availableSentences.map((sentence) => (
                    <option key={sentence.id} value={sentence.id}>
                      {getSentenceOptionLabel(sentence)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="card-actions">
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={generateDisabled}
                  title={readinessMessage || undefined}
                  onClick={() => onGenerateScene(scene.id)}
                >
                  <Icon>auto_awesome</Icon>
                  {isGenerating
                    ? "Generating scene..."
                    : scene.generationStatus === "not_started"
                    ? "Generate scene"
                    : "Regenerate"}
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  disabled={approveDisabled}
                  onClick={() => onApproveScene(scene.id)}
                >
                  <Icon>check</Icon>
                  {isApproving ? "Approving scene..." : "Use this scene"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {lesson.scenes.length === 0 ? (
        <p className="reference-empty-state">No scenes planned yet.</p>
      ) : null}
    </div>
  );
}
