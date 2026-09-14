import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import StageHeader from "../components/StageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function StoryStage({
  lesson,
  hasDownstreamOutput,
  onSentenceChange,
  onSentenceAdd,
  onSentenceMove,
  onSentenceDelete,
  onRegenerateSentence,
  onShortenSentence,
  onRegenerateStory,
  onConfirmRegenerateStory,
  onCancelRegenerateStory,
  onLockStory,
  onUnlockStory,
  onConfirmUnlock,
  onCancelUnlock,
  showLockConfirm,
  onShowLockConfirm,
  onCancelLock,
  showUnlockWarning,
  showRegenerateConfirm,
  storyOperationStatus = "idle",
  storyOperationError = "",
  sentenceOperations = {},
  isSentenceOperationActive = false
}) {
  const [editingId, setEditingId] = useState(null);
  const [draggedSentenceId, setDraggedSentenceId] = useState(null);
  const [dropInsertionIndex, setDropInsertionIndex] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isAddingSentence, setIsAddingSentence] = useState(false);
  const [newSentenceText, setNewSentenceText] = useState("");
  const addSentenceInputRef = useRef(null);
  const addSentenceButtonRef = useRef(null);
  const deleteButtonRefs = useRef(new Map());
  const isLocked = lesson.story.status === "locked";
  const displaySentences =
    isLocked && lesson.story.lockedSentences?.length > 0
      ? lesson.story.lockedSentences
      : lesson.story.sentences;
  const sentenceCount = displaySentences.length;
  const hasSentenceCountMismatch = sentenceCount !== lesson.sentenceCount;
  const isStoryBusy = ["generating", "regenerating", "locking", "unlocking"].includes(
    storyOperationStatus
  );
  const hasRunningSentenceOperation =
    isSentenceOperationActive ||
    Object.values(sentenceOperations).some(
      (operation) => operation?.status === "loading"
    );
  const storyMutationDisabled = isStoryBusy || hasRunningSentenceOperation;

  useEffect(() => {
    if (isLocked) {
      setConfirmDeleteId(null);
      setIsAddingSentence(false);
      setNewSentenceText("");
      return;
    }

    const sentenceStillExists = displaySentences.some(
      (sentence) => sentence.id === confirmDeleteId
    );
    if (confirmDeleteId && !sentenceStillExists) {
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, displaySentences, isLocked]);

  useEffect(() => {
    if (isAddingSentence) {
      addSentenceInputRef.current?.focus();
    }
  }, [isAddingSentence]);

  function handleDragStart(event, sentenceId) {
    if (isLocked || storyMutationDisabled) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sentenceId);
    setDraggedSentenceId(sentenceId);
    setDropInsertionIndex(
      displaySentences.findIndex((sentence) => sentence.id === sentenceId)
    );
  }

  function handleDragOver(event, index) {
    if (isLocked || storyMutationDisabled || !draggedSentenceId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const nextInsertionIndex = getInsertionIndex(event, index);
    setDropInsertionIndex((current) =>
      current === nextInsertionIndex ? current : nextInsertionIndex
    );
  }

  function handleDrop(event, index) {
    if (isLocked || storyMutationDisabled || !draggedSentenceId) {
      return;
    }

    event.preventDefault();
    const insertionIndex = getInsertionIndex(event, index);
    const targetIndex = getTargetIndexFromInsertionIndex(insertionIndex);

    if (targetIndex >= 0) {
      onSentenceMove(draggedSentenceId, targetIndex);
    }
    clearDragState();
  }

  function handleDragEnd() {
    clearDragState();
  }

  function getInsertionIndex(event, index) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const isAfterMidpoint = event.clientY > bounds.top + bounds.height / 2;
    return isAfterMidpoint ? index + 1 : index;
  }

  function getTargetIndexFromInsertionIndex(insertionIndex) {
    const fromIndex = displaySentences.findIndex(
      (sentence) => sentence.id === draggedSentenceId
    );
    if (fromIndex < 0) return -1;

    const boundedInsertionIndex = Math.max(
      0,
      Math.min(sentenceCount, insertionIndex)
    );
    const targetIndex =
      fromIndex < boundedInsertionIndex
        ? boundedInsertionIndex - 1
        : boundedInsertionIndex;

    return Math.max(0, Math.min(sentenceCount - 1, targetIndex));
  }

  function getDropPosition(index) {
    if (!draggedSentenceId || dropInsertionIndex === null) return "";
    if (dropInsertionIndex === index) return "before";
    if (dropInsertionIndex === sentenceCount && index === sentenceCount - 1) {
      return "after";
    }
    return "";
  }

  function clearDragState() {
    setDraggedSentenceId(null);
    setDropInsertionIndex(null);
  }

  function confirmDeleteSentence(sentenceId) {
    const deleteIndex = displaySentences.findIndex(
      (sentence) => sentence.id === sentenceId
    );
    const remainingSentences = displaySentences.filter(
      (sentence) => sentence.id !== sentenceId
    );
    const focusTargetId =
      remainingSentences[Math.min(deleteIndex, remainingSentences.length - 1)]?.id;

    onSentenceDelete(sentenceId);
    if (editingId === sentenceId) {
      setEditingId(null);
    }
    setConfirmDeleteId(null);
    requestAnimationFrame(() => {
      if (focusTargetId) {
        deleteButtonRefs.current.get(focusTargetId)?.focus();
        return;
      }
      addSentenceButtonRef.current?.focus();
    });
  }

  function commitNewSentence() {
    const nextText = newSentenceText.trim();
    if (!nextText || isLocked) return;

    onSentenceAdd(nextText);
    setNewSentenceText("");
    setIsAddingSentence(false);
    requestAnimationFrame(() => addSentenceButtonRef.current?.focus());
  }

  function cancelNewSentence() {
    setNewSentenceText("");
    setIsAddingSentence(false);
    requestAnimationFrame(() => addSentenceButtonRef.current?.focus());
  }

  function cancelDeleteSentence(sentenceId) {
    setConfirmDeleteId(null);
    requestAnimationFrame(() => deleteButtonRefs.current.get(sentenceId)?.focus());
  }

  return (
    <div className="stage stage--story">
      <StageHeader
        step="Step 2 of 6 - Story"
        title={lesson.title || "Story draft"}
        action={
          <StatusBadge icon={isLocked ? "lock" : "edit_note"} tone={isLocked ? "primary" : "neutral"}>
            {isLocked ? "Master story - locked" : "Draft story"}
          </StatusBadge>
        }
      >
        Review each sentence, then lock the story so later materials use this
        exact text.
      </StageHeader>

      {lesson.story.modifiedAfterLock ? (
        <div className="notice notice--warning">
          <Icon>warning</Icon>
          Story text changed after downstream work existed. Characters and scenes may
          need review.
        </div>
      ) : null}

      {hasSentenceCountMismatch ? (
        <div className="notice notice--compact" aria-live="polite">
          <Icon>info</Icon>
          Story has {sentenceCount} sentences. Setup target is {lesson.sentenceCount}.
        </div>
      ) : null}

      {showLockConfirm ? (
        <div className="notice">
          <Icon>lock</Icon>
          <span>
            Lock this master story? Later stages will treat these sentences as
            the source of truth.
          </span>
          <div className="notice__actions">
            <button
              className="button button--primary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={onLockStory}
            >
              {storyOperationStatus === "locking" ? "Locking..." : "Confirm lock"}
            </button>
            <button
              className="button button--secondary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={onCancelLock}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showUnlockWarning ? (
        <div className="notice notice--warning">
          <Icon>warning</Icon>
          <span>
            Unlocking may make generated characters or scenes stale. Existing work
            will stay visible.
          </span>
          <div className="notice__actions">
            <button
              className="button button--primary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={onConfirmUnlock}
            >
              {storyOperationStatus === "unlocking" ? "Unlocking..." : "Unlock story"}
            </button>
            <button
              className="button button--secondary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={onCancelUnlock}
            >
              Keep locked
            </button>
          </div>
        </div>
      ) : null}

      {showRegenerateConfirm ? (
        <div className="notice notice--warning">
          <Icon>warning</Icon>
          <span>
            Regenerate the whole story? This replaces the current draft after
            successful generation. Existing downstream work will stay visible but
            may be marked stale.
          </span>
          <div className="notice__actions">
            <button
              className="button button--primary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={onConfirmRegenerateStory}
            >
              {storyOperationStatus === "regenerating"
                ? "Regenerating..."
                : "Regenerate story"}
            </button>
            <button
              className="button button--secondary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={onCancelRegenerateStory}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {storyOperationStatus === "error" && storyOperationError ? (
        <div className="notice notice--warning" aria-live="polite">
          <Icon>error</Icon>
          {storyOperationError}
        </div>
      ) : null}

      <div className="story-grid">
        {displaySentences.map((sentence, index) => {
          const isEditing = editingId === sentence.id;
          const isConfirmingDelete = confirmDeleteId === sentence.id;
          const canDeleteSentence = sentenceCount > 1;
          const dropPosition = getDropPosition(index);
          const sentenceOperation = sentenceOperations[sentence.id];
          const isSentenceLoading = sentenceOperation?.status === "loading";
          const sentenceError =
            sentenceOperation?.status === "error" ? sentenceOperation.error : "";
          const cardClasses = [
            "sentence-card",
            isLocked ? "sentence-card--locked" : "",
            draggedSentenceId === sentence.id ? "sentence-card--dragging" : "",
            dropPosition ? `sentence-card--drop-${dropPosition}` : ""
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <article
              className={cardClasses}
              key={sentence.id}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={(event) => handleDrop(event, index)}
            >
              <div className="sentence-card__ordering">
                {!isLocked ? (
                  <button
                    aria-label={`Drag sentence ${index + 1} to reorder`}
                    className="sentence-card__drag-handle"
                    disabled={storyMutationDisabled}
                    draggable={!storyMutationDisabled}
                    title={`Drag sentence ${index + 1} to reorder`}
                    type="button"
                    onDragEnd={handleDragEnd}
                    onDragStart={(event) => handleDragStart(event, sentence.id)}
                  >
                    <Icon>drag_indicator</Icon>
                  </button>
                ) : null}
                <span className="sentence-card__number">{index + 1}</span>
                {!isLocked ? (
                  <div className="sentence-card__move-buttons">
                    <button
                      aria-label={`Move sentence ${index + 1} up`}
                      className="icon-button icon-button--small"
                      disabled={
                        index === 0 || storyMutationDisabled
                      }
                      type="button"
                      onClick={() => onSentenceMove(sentence.id, index - 1)}
                    >
                      <Icon>arrow_upward</Icon>
                    </button>
                    <button
                      aria-label={`Move sentence ${index + 1} down`}
                      className="icon-button icon-button--small"
                      disabled={
                        index === sentenceCount - 1 ||
                        storyMutationDisabled
                      }
                      type="button"
                      onClick={() => onSentenceMove(sentence.id, index + 1)}
                    >
                      <Icon>arrow_downward</Icon>
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="sentence-card__body">
                {isEditing ? (
                  <textarea
                    aria-label={`Sentence ${index + 1} text`}
                    disabled={storyMutationDisabled}
                    rows="2"
                    value={sentence.text}
                    onChange={(event) =>
                      onSentenceChange(sentence.id, event.target.value)
                    }
                  />
                ) : (
                  <p>{sentence.text}</p>
                )}
                {isSentenceLoading ? (
                  <div className="sentence-card__status" aria-live="polite">
                    <Icon>progress_activity</Icon>
                    {sentenceOperation.operation === "shorten"
                      ? "Shortening sentence..."
                      : "Regenerating sentence..."}
                  </div>
                ) : null}
                {sentenceError ? (
                  <div
                    className="sentence-card__status sentence-card__status--error"
                    aria-live="polite"
                  >
                    <Icon>error</Icon>
                    {sentenceError}
                  </div>
                ) : null}
                {!isLocked ? (
                  <div className="sentence-card__actions">
                    <div className="sentence-card__tool-actions">
                      <button
                        aria-label={`${
                          isEditing ? "Save" : "Edit"
                        } sentence ${index + 1}`}
                        className={`mini-button ${
                          isEditing ? "mini-button--primary" : ""
                        }`}
                        disabled={storyMutationDisabled}
                        type="button"
                        onClick={() =>
                          setEditingId(isEditing ? null : sentence.id)
                        }
                      >
                        {isEditing ? "Save" : "Edit"}
                      </button>
                      <button
                        aria-label={`Regenerate sentence ${index + 1}`}
                        className="mini-button"
                        disabled={storyMutationDisabled}
                        type="button"
                        onClick={() => onRegenerateSentence(sentence.id)}
                      >
                        {isSentenceLoading &&
                        sentenceOperation.operation === "regenerate"
                          ? "Regenerating..."
                          : "Regenerate"}
                      </button>
                      <button
                        aria-label={`Shorten sentence ${index + 1}`}
                        className="mini-button"
                        disabled={storyMutationDisabled}
                        type="button"
                        onClick={() => onShortenSentence(sentence.id)}
                      >
                        {isSentenceLoading && sentenceOperation.operation === "shorten"
                          ? "Shortening..."
                          : "Shorten"}
                      </button>
                    </div>
                    {isConfirmingDelete ? (
                      <div
                        className="sentence-card__delete-confirm"
                        role="group"
                        aria-label={`Delete sentence ${index + 1}`}
                      >
                        <span>Delete this sentence?</span>
                        <button
                          aria-label={`Confirm delete sentence ${index + 1}`}
                          className="mini-button mini-button--danger"
                          disabled={storyMutationDisabled}
                          type="button"
                          onClick={() => confirmDeleteSentence(sentence.id)}
                        >
                          Delete
                        </button>
                        <button
                          aria-label={`Cancel delete sentence ${index + 1}`}
                          className="mini-button"
                          type="button"
                          onClick={() => cancelDeleteSentence(sentence.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        ref={(button) => {
                          if (button) {
                            deleteButtonRefs.current.set(sentence.id, button);
                          } else {
                            deleteButtonRefs.current.delete(sentence.id);
                          }
                        }}
                        className="mini-button mini-button--danger-outline"
                        aria-label={`Delete sentence ${index + 1}`}
                        disabled={
                          !canDeleteSentence || storyMutationDisabled
                        }
                        title={
                          canDeleteSentence
                            ? "Delete this sentence"
                            : "At least one sentence is required"
                        }
                        type="button"
                        onClick={() => setConfirmDeleteId(sentence.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
              {isLocked ? <Icon className="sentence-card__lock">lock</Icon> : null}
            </article>
          );
        })}
      </div>

      {!isLocked ? (
        <div className="sentence-add">
          {isAddingSentence ? (
            <div className="sentence-add__composer">
              <label className="field sentence-add__field">
                <span>New sentence</span>
                <textarea
                  ref={addSentenceInputRef}
                  rows="2"
                  value={newSentenceText}
                  placeholder="Type the new sentence..."
                  onChange={(event) => setNewSentenceText(event.target.value)}
                />
              </label>
              <div className="sentence-add__actions">
                <button
                  className="button button--primary"
                  disabled={!newSentenceText.trim() || storyMutationDisabled}
                  type="button"
                  onClick={commitNewSentence}
                >
                  <Icon>add</Icon>
                  Add sentence
                </button>
                <button
                  className="button button--secondary"
                  disabled={storyMutationDisabled}
                  type="button"
                  onClick={cancelNewSentence}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              ref={addSentenceButtonRef}
              className="button button--secondary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={() => setIsAddingSentence(true)}
            >
              <Icon>add</Icon>
              Add sentence
            </button>
          )}
        </div>
      ) : null}

      <div className="stage-actions">
        {isLocked ? (
          <button
            className="button button--secondary"
            disabled={storyMutationDisabled}
            type="button"
            onClick={() => onUnlockStory(hasDownstreamOutput)}
          >
            <Icon>lock_open</Icon>
            {storyOperationStatus === "unlocking" ? "Unlocking..." : "Unlock story"}
          </button>
        ) : (
          <>
            <button
              className="button button--secondary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={onRegenerateStory}
            >
              <Icon>refresh</Icon>
              Regenerate story
            </button>
            <button
              className="button button--primary"
              disabled={storyMutationDisabled}
              type="button"
              onClick={onShowLockConfirm}
            >
              <Icon>lock</Icon>
              {storyOperationStatus === "locking" ? "Locking..." : "Lock story"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
