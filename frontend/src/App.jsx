import { useEffect, useMemo, useRef, useState } from "react";
import {
  createProject,
  duplicateProject,
  getProject,
  listProjects,
  saveProject as saveProjectRecord
} from "./api/projects.js";
import {
  extractCharacters as extractCharactersOnServer,
  updateCharacterAppearance as updateCharacterAppearanceOnServer
} from "./api/characters.js";
import {
  approveCharacterImage as approveCharacterImageOnServer,
  approveSceneImage as approveSceneImageOnServer,
  generateCharacterImage as generateCharacterImageOnServer,
  generateSceneImage as generateSceneImageOnServer
} from "./api/images.js";
import { getMediaReadiness as getMediaReadinessFromServer } from "./api/media.js";
import {
  generateStory,
  lockStory as lockStoryOnServer,
  regenerateSentence as regenerateSentenceOnServer,
  regenerateStory as regenerateStoryOnServer,
  shortenSentence as shortenSentenceOnServer,
  unlockStory as unlockStoryOnServer
} from "./api/story.js";
import { planScenes as planScenesOnServer } from "./api/scenes.js";
import AppShell from "./components/AppShell.jsx";
import CharactersStage from "./stages/CharactersStage.jsx";
import ExportStage from "./stages/ExportStage.jsx";
import MediaStage from "./stages/MediaStage.jsx";
import ScenesStage from "./stages/ScenesStage.jsx";
import SetupStage from "./stages/SetupStage.jsx";
import StoryStage from "./stages/StoryStage.jsx";
import { demoLesson } from "./data/demoLesson.js";
import { lessonStageIds } from "./data/lessonSchema.js";
import {
  areRequiredCharactersApproved,
  getCompletedStages,
  hasDownstreamOutput
} from "./utils/lessonSelectors.js";
import {
  addStorySentence,
  addCharacterNote as addCharacterNoteToLesson,
  addSceneSentenceReference,
  addReusableBackground,
  addSecondaryCharacter as addSecondaryCharacterToLesson,
  deleteStorySentence,
  moveStorySentence,
  patchCharacter,
  patchScene,
  removeCharacterNote as removeCharacterNoteFromLesson,
  removeSceneSentenceReference,
  removeSecondaryCharacter as removeSecondaryCharacterFromLesson,
  setCurrentStage as setLessonCurrentStage,
  updateLessonField as updateTopLevelLessonField,
  updateMainCharacter as updateSetupMainCharacter,
  updateMediaFilter,
  updateSetupField,
  updateStorySentence
} from "./utils/lessonUpdates.js";
import {
  createLessonSnapshot,
  lessonsHaveUnsavedChanges
} from "./utils/lessonDirtyState.js";
import { normalizeLessonForClient } from "./utils/normalizeLesson.js";
import { decideMediaReadinessRequest } from "./utils/mediaReadinessRequest.js";
import {
  clearLastProjectId,
  isLikelySafeProjectId,
  readLastProjectId,
  writeLastProjectId
} from "./utils/projectSessionStorage.js";
import { selectAutoReopenProject } from "./utils/projectAutoReopen.js";
import {
  buildProjectUrl,
  clearUrlProjectId,
  getProjectRestoreCandidateFromUrl,
  replaceUrlProjectId
} from "./utils/projectSessionUrl.js";
import {
  buildUrlForCancelledProjectNavigation,
  decideProjectUrlNavigation,
  invalidUrlProjectMessage
} from "./utils/projectUrlNavigation.js";
import { decideRestoreIssueClear } from "./utils/restoreIssueClear.js";
import {
  shouldApplySentenceOperationResponse,
  shouldShowSentenceOperationError
} from "./utils/sentenceOperationGuards.js";
import {
  createBeforeUnloadHandler,
  discardUnsavedChangesMessage
} from "./utils/unsavedChangesGuard.js";
import { isSetupComplete, validateSetup } from "./utils/validateSetup.js";
import { validateLessonShape } from "./utils/validateLessonShape.js";

const stageLabels = {
  setup: "Setup",
  story: "Story",
  characters: "Characters",
  scenes: "Scenes",
  media: "Media",
  export: "Export"
};

const stages = lessonStageIds.map((id) => ({ id, label: stageLabels[id] }));

if (import.meta.env.DEV) {
  const schemaErrors = validateLessonShape(demoLesson);
  if (schemaErrors.length > 0) {
    console.warn("Demo lesson failed Phase 2 schema checks", schemaErrors);
  }
}

export default function App() {
  const [lesson, setLesson] = useState(demoLesson);
  const [isStartupRestoring, setIsStartupRestoring] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [projectListStatus, setProjectListStatus] = useState("idle");
  const [projectListError, setProjectListError] = useState("");
  const [saveStatus, setSaveStatus] = useState("unsaved");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [savedSnapshotVersion, setSavedSnapshotVersion] = useState(0);
  const [loadStatus, setLoadStatus] = useState("loading");
  const [projectError, setProjectError] = useState("");
  const [restoreIssue, setRestoreIssue] = useState(null);
  const [isOpenProjectPanelVisible, setIsOpenProjectPanelVisible] = useState(false);
  const [pendingProjectAction, setPendingProjectAction] = useState(null);
  const [apiStatus, setApiStatus] = useState("unavailable");
  const [newSecondaryCharacter, setNewSecondaryCharacter] = useState("");
  const [newBackground, setNewBackground] = useState("");
  const [newNotes, setNewNotes] = useState({});
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [touchedSetupFields, setTouchedSetupFields] = useState({});
  const [hasSubmittedSetup, setHasSubmittedSetup] = useState(false);
  const [storyGenerationStatus, setStoryGenerationStatus] = useState("idle");
  const [storyGenerationError, setStoryGenerationError] = useState("");
  const [storyOperationStatus, setStoryOperationStatus] = useState("idle");
  const [storyOperationError, setStoryOperationError] = useState("");
  const [sentenceOperations, setSentenceOperations] = useState({});
  const [characterExtractionStatus, setCharacterExtractionStatus] = useState("idle");
  const [characterExtractionError, setCharacterExtractionError] = useState("");
  const [characterAppearanceOperations, setCharacterAppearanceOperations] = useState({});
  const [characterImageOperations, setCharacterImageOperations] = useState({});
  const [scenePlanningStatus, setScenePlanningStatus] = useState("idle");
  const [scenePlanningError, setScenePlanningError] = useState("");
  const [showSceneReplanConfirm, setShowSceneReplanConfirm] = useState(false);
  const [sceneImageOperations, setSceneImageOperations] = useState({});
  const [mediaReadiness, setMediaReadiness] = useState({
    status: "idle",
    data: null,
    error: "",
    projectId: null
  });
  const activeProjectIdRef = useRef(activeProjectId);
  const sentenceOperationActiveRef = useRef(false);
  const characterAppearanceOperationActiveRef = useRef(false);
  const characterImageOperationActiveRef = useRef(false);
  const scenePlanningActiveRef = useRef(false);
  const sceneImageOperationActiveRef = useRef(false);
  const currentSentenceOperationToken = useRef(null);
  const currentCharacterAppearanceOperationTokens = useRef({});
  const currentCharacterImageOperationTokens = useRef({});
  const currentScenePlanningToken = useRef(null);
  const currentSceneImageOperationTokens = useRef({});
  const currentMediaReadinessToken = useRef(null);
  const projectListRequestIdRef = useRef(0);
  const projectOpenRequestIdRef = useRef(0);
  const isAppMountedRef = useRef(false);
  const lastSavedLessonSnapshotRef = useRef(null);
  const lessonHasUnsavedChangesRef = useRef(false);
  const projectUrlNavigationHandlerRef = useRef(null);

  useEffect(() => {
    isAppMountedRef.current = true;

    return () => {
      isAppMountedRef.current = false;
      projectListRequestIdRef.current += 1;
      projectOpenRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then((response) => {
        if (!response.ok) throw new Error("Health check failed");
        return response.json();
      })
      .then((body) => {
        if (!cancelled) setApiStatus(body.ok ? "connected" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setApiStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadProjectList({ quiet: true });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreStartupProject() {
      setLoadStatus("loading");

      const urlCandidate = getProjectRestoreCandidateFromUrl();
      if (urlCandidate.valid) {
        await restoreSavedProject(urlCandidate.projectId, "url");
        return;
      }

      if (urlCandidate.malformed) {
        if (cancelled) return;

        clearSavedLessonSnapshot();
        setLesson(demoLesson);
        setActiveProjectIdAndRef(null, { syncUrl: false });
        clearTransientInputs();
        resetMediaReadiness();
        setSaveStatus("unsaved");
        setLoadStatus("idle");
        const message = "The lesson id in the URL is invalid.";
        setRestoreIssue({
          source: "url",
          reason: "malformed",
          projectId: null,
          rawValue: urlCandidate.rawValue,
          message
        });
        setProjectError(message);
        await loadProjectList({ quiet: true });
        return;
      }

      const projectId = readLastProjectId();
      if (projectId) {
        await restoreSavedProject(projectId, "localStorage");
        return;
      }

      const projects = await loadProjectList({ quiet: true });
      if (cancelled) return;

      const autoReopenCandidate = selectAutoReopenProject(projects);
      if (autoReopenCandidate) {
        await restoreSavedProject(autoReopenCandidate.id, "autoReopen");
        return;
      }

      setLoadStatus("idle");
    }

    async function restoreSavedProject(projectId, source) {
      try {
        const restoredLesson = normalizeAndValidateLoadedLesson(
          await getProject(projectId)
        );
        if (cancelled) return;

        setLesson(restoredLesson);
        markLessonSaved(restoredLesson);
        setActiveProjectIdAndRef(restoredLesson.id);
        clearTransientInputs();
        resetMediaReadiness();
        setRestoreIssue(null);
        setProjectError("");
        setLoadStatus("loaded");
        await loadProjectList({ quiet: true });
      } catch {
        if (source === "localStorage") {
          clearLastProjectId();
        }
        if (cancelled) return;

        clearSavedLessonSnapshot();
        setLesson(demoLesson);
        setActiveProjectIdAndRef(null, { syncUrl: false });
        clearTransientInputs();
        resetMediaReadiness();
        setSaveStatus("unsaved");
        setLoadStatus("idle");
        const message =
          source === "url"
            ? "The lesson requested in the URL could not be opened."
            : source === "autoReopen"
              ? "The most recent lesson could not be reopened."
            : "The last lesson could not be restored.";
        setRestoreIssue({
          source,
          reason: "load-failed",
          projectId,
          rawValue: projectId,
          message
        });
        setProjectError(message);
        if (source !== "autoReopen") {
          await loadProjectList({ quiet: true });
        }
      }
    }

    async function runStartupRestore() {
      try {
        await restoreStartupProject();
      } finally {
        if (!cancelled) setIsStartupRestoring(false);
      }
    }

    runStartupRestore();

    return () => {
      cancelled = true;
    };
  }, []);

  const lessonHasUnsavedChanges = useMemo(
    () =>
      lessonsHaveUnsavedChanges(lesson, lastSavedLessonSnapshotRef.current),
    [lesson, savedSnapshotVersion]
  );

  useEffect(() => {
    if (saveStatus === "saving" || saveStatus === "error") return;

    setSaveStatus((current) => {
      if (current === "saving" || current === "error") return current;
      if (lessonHasUnsavedChanges) return "unsaved";
      return lastSavedLessonSnapshotRef.current ? "saved" : "unsaved";
    });
  }, [lessonHasUnsavedChanges, saveStatus]);

  useEffect(() => {
    if (
      !lessonHasUnsavedChanges ||
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    ) {
      return undefined;
    }

    const beforeUnloadHandler = createBeforeUnloadHandler(true);
    window.addEventListener("beforeunload", beforeUnloadHandler);

    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
  }, [lessonHasUnsavedChanges]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    lessonHasUnsavedChangesRef.current = lessonHasUnsavedChanges;
  }, [lessonHasUnsavedChanges]);

  useEffect(() => {
    projectUrlNavigationHandlerRef.current = handleProjectUrlNavigation;
  });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    ) {
      return undefined;
    }

    function handlePopState() {
      projectUrlNavigationHandlerRef.current?.(window.location);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (
      ["media", "export"].includes(lesson.currentStage) &&
      mediaReadiness.status !== "checking" &&
      !(
        mediaReadiness.status === "success" &&
        mediaReadiness.projectId === activeProjectId
      )
    ) {
      checkMediaReadiness();
    }
  }, [lesson.currentStage, activeProjectId]);

  const downstreamOutputExists = useMemo(() => hasDownstreamOutput(lesson), [lesson]);

  const isSentenceOperationActive = useMemo(
    () =>
      Object.values(sentenceOperations).some(
        (operation) => operation?.status === "loading"
      ),
    [sentenceOperations]
  );
  const isStoryOperationActive =
    storyGenerationStatus === "generating" ||
    ["regenerating", "locking", "unlocking"].includes(storyOperationStatus);
  const isCharacterExtractionActive = characterExtractionStatus === "extracting";
  const isCharacterImageOperationActive = useMemo(
    () =>
      Object.values(characterImageOperations).some(
        (operation) => operation?.status === "loading"
      ),
    [characterImageOperations]
  );
  const isCharacterAppearanceOperationActive = useMemo(
    () =>
      Object.values(characterAppearanceOperations).some(
        (operation) => operation?.status === "loading"
      ),
    [characterAppearanceOperations]
  );
  const isScenePlanningActive = scenePlanningStatus === "planning";
  const isSceneImageOperationActive = useMemo(
    () =>
      Object.values(sceneImageOperations).some(
        (operation) => operation?.status === "loading"
      ),
    [sceneImageOperations]
  );
  const isProjectLoading = loadStatus === "loading";
  const isProjectActionDisabled =
    isProjectLoading ||
    isSentenceOperationActive ||
    isStoryOperationActive ||
    isCharacterExtractionActive ||
    isCharacterAppearanceOperationActive ||
    isCharacterImageOperationActive ||
    isScenePlanningActive ||
    isSceneImageOperationActive;

  useEffect(() => {
    sentenceOperationActiveRef.current = isSentenceOperationActive;
  }, [isSentenceOperationActive]);

  useEffect(() => {
    characterImageOperationActiveRef.current = isCharacterImageOperationActive;
  }, [isCharacterImageOperationActive]);

  useEffect(() => {
    characterAppearanceOperationActiveRef.current =
      isCharacterAppearanceOperationActive;
  }, [isCharacterAppearanceOperationActive]);

  useEffect(() => {
    scenePlanningActiveRef.current = isScenePlanningActive;
  }, [isScenePlanningActive]);

  useEffect(() => {
    sceneImageOperationActiveRef.current = isSceneImageOperationActive;
  }, [isSceneImageOperationActive]);

  const verifiedMediaReadiness =
    mediaReadiness.status === "success" &&
    mediaReadiness.projectId === activeProjectId
      ? mediaReadiness.data
      : null;

  const completedStages = useMemo(
    () => getCompletedStages(lesson, verifiedMediaReadiness),
    [lesson, verifiedMediaReadiness]
  );

  const setupValidation = useMemo(() => validateSetup(lesson), [lesson]);

  const visibleSetupErrors = useMemo(
    () =>
      setupValidation.errors.filter(
        (error) => hasSubmittedSetup || touchedSetupFields[error.field]
      ),
    [hasSubmittedSetup, setupValidation.errors, touchedSetupFields]
  );

  const projectControls = {
    activeProjectId,
    projectList,
    projectListStatus,
    projectListError,
    projectTitle: lesson.title || "Untitled lesson",
    saveStatus,
    lastSavedAt,
    loadStatus,
    projectError,
    restoreIssue,
    isOpenProjectPanelVisible,
    pendingProjectAction,
    isProjectActionDisabled,
    onNewLesson: requestNewLesson,
    onOpenLessonPanel: requestOpenProjectPanel,
    onCloseOpenLessonPanel: () => setIsOpenProjectPanelVisible(false),
    onRefreshProjects: loadProjectList,
    onOpenProject: requestOpenProject,
    onOpenProjectLink: requestOpenProjectLink,
    onCopyProjectLink: copyProjectLink,
    getProjectUrl,
    onDuplicateLesson: requestDuplicateLesson,
    onSaveLesson: handleSaveLesson,
    onClearRestoreIssue: clearInvalidRestoreState,
    onConfirmPendingAction: confirmPendingProjectAction,
    onCancelPendingAction: cancelPendingProjectAction
  };

  function updateLesson(updater, options = {}) {
    if (options.clearMediaReadiness !== false) {
      resetMediaReadiness();
    }

    setLesson((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return next;
    });
  }

  function markLessonSaved(savedLesson, options = {}) {
    lastSavedLessonSnapshotRef.current = createLessonSnapshot(savedLesson);
    setSavedSnapshotVersion((current) => current + 1);
    setLastSavedAt(options.savedAt || null);
    setSaveStatus("saved");
  }

  function clearSavedLessonSnapshot() {
    lastSavedLessonSnapshotRef.current = null;
    setSavedSnapshotVersion((current) => current + 1);
    setLastSavedAt(null);
  }

  function resetMediaReadiness() {
    currentMediaReadinessToken.current = null;
    setMediaReadiness({
      status: "idle",
      data: null,
      error: "",
      projectId: null
    });
  }

  async function checkMediaReadiness() {
    const decision = decideMediaReadinessRequest({
      activeProjectId: activeProjectIdRef.current,
      hasUnsavedChanges: lessonHasUnsavedChangesRef.current
    });

    if (decision.type === "blocked") {
      currentMediaReadinessToken.current = null;
      setMediaReadiness({
        status: "error",
        data: null,
        error: decision.message,
        projectId: decision.projectId
      });
      return;
    }

    const readinessToken = Symbol("media-readiness");
    currentMediaReadinessToken.current = readinessToken;
    setMediaReadiness((current) => ({
      status: "checking",
      data: current.data,
      error: "",
      projectId: current.projectId
    }));

    const projectId = decision.projectId;
    try {
      const readiness = await getMediaReadinessFromServer(projectId);
      if (
        currentMediaReadinessToken.current !== readinessToken ||
        activeProjectIdRef.current !== projectId
      ) {
        return;
      }
      setMediaReadiness({
        status: "success",
        data: readiness,
        error: "",
        projectId
      });
    } catch (error) {
      if (
        currentMediaReadinessToken.current !== readinessToken ||
        (projectId && activeProjectIdRef.current !== projectId)
      ) {
        return;
      }
      setMediaReadiness({
        status: "error",
        data: null,
        error: error.message || "Media readiness check failed.",
        projectId
      });
    }
  }

  function clearTransientInputs() {
    setNewSecondaryCharacter("");
    setNewBackground("");
    setNewNotes({});
    setShowLockConfirm(false);
    setShowUnlockWarning(false);
    setShowRegenerateConfirm(false);
    setStoryOperationStatus("idle");
    setStoryOperationError("");
    setSentenceOperations({});
    setCharacterExtractionStatus("idle");
    setCharacterExtractionError("");
    setCharacterAppearanceOperations({});
    setCharacterImageOperations({});
    setScenePlanningStatus("idle");
    setScenePlanningError("");
    setShowSceneReplanConfirm(false);
    setSceneImageOperations({});
    resetMediaReadiness();
    currentCharacterAppearanceOperationTokens.current = {};
    characterAppearanceOperationActiveRef.current = false;
    currentCharacterImageOperationTokens.current = {};
    characterImageOperationActiveRef.current = false;
    currentScenePlanningToken.current = null;
    scenePlanningActiveRef.current = false;
    currentSceneImageOperationTokens.current = {};
    sceneImageOperationActiveRef.current = false;
    setTouchedSetupFields({});
    setHasSubmittedSetup(false);
  }

  function updateLessonField(field, value) {
    const setupFields = ["targetVocabulary", "additionalNotes"];
    updateLesson((current) =>
      setupFields.includes(field)
        ? updateSetupField(current, field, value)
        : updateTopLevelLessonField(current, field, value)
    );
  }

  function updateMainCharacter(field, value) {
    updateLesson((current) => updateSetupMainCharacter(current, field, value));
  }

  function addSecondaryCharacter() {
    updateLesson((current) =>
      addSecondaryCharacterToLesson(current, newSecondaryCharacter)
    );
    setNewSecondaryCharacter("");
  }

  function removeSecondaryCharacter(character) {
    updateLesson((current) => removeSecondaryCharacterFromLesson(current, character));
  }

  function markSetupFieldTouched(fieldId) {
    setTouchedSetupFields((current) => ({
      ...current,
      [fieldId]: true
    }));
  }

  async function handleGenerateStory() {
    if (isProjectActionDisabled) {
      setStoryGenerationStatus("error");
      setStoryGenerationError("Wait for the current operation to finish.");
      return;
    }

    const validation = validateSetup(lesson);
    if (!validation.valid) {
      setHasSubmittedSetup(true);
      setStoryGenerationStatus("idle");
      setStoryGenerationError("");
      updateLesson((current) =>
        current.currentStage === "setup" ? current : setLessonCurrentStage(current, "setup")
      );
      return;
    }

    if (lesson.story.sentences.length > 0) {
      setStoryGenerationStatus("idle");
      setStoryGenerationError("");
      setShowRegenerateConfirm(true);
      updateLesson((current) =>
        current.currentStage === "story" ? current : setLessonCurrentStage(current, "story")
      );
      return;
    }

    setStoryGenerationStatus("generating");
    setStoryGenerationError("");

    let projectId;
    try {
      projectId = await saveCurrentLesson();
    } catch (error) {
      setStoryGenerationStatus("error");
      setStoryGenerationError(error.message);
      setSaveStatus("error");
      return;
    }

    try {
      const generatedLesson = await generateStory(projectId);
      const normalized = normalizeAndValidateLoadedLesson(generatedLesson);
      setLesson(normalized);
      markLessonSaved(normalized, { savedAt: new Date().toISOString() });
      setActiveProjectIdAndRef(normalized.id);
      setHasSubmittedSetup(false);
      setTouchedSetupFields({});
      setStoryGenerationStatus("idle");
      await loadProjectList({ quiet: true });
    } catch (error) {
      setStoryGenerationStatus("error");
      setStoryGenerationError(error.message);
    }
  }

  function updateSentence(sentenceId, text) {
    if (isProjectActionDisabled) return;

    updateLesson((current) =>
      updateStorySentence(current, sentenceId, text, hasDownstreamOutput(current))
    );
  }

  function addSentence(text, options) {
    if (isProjectActionDisabled) return;

    updateLesson((current) =>
      addStorySentence(current, text, options, hasDownstreamOutput(current))
    );
  }

  function moveSentence(sentenceId, targetIndex) {
    if (isProjectActionDisabled) return;

    updateLesson((current) =>
      moveStorySentence(current, sentenceId, targetIndex, hasDownstreamOutput(current))
    );
  }

  function deleteSentence(sentenceId) {
    if (isProjectActionDisabled) return;

    updateLesson((current) =>
      deleteStorySentence(current, sentenceId, hasDownstreamOutput(current))
    );
  }

  async function regenerateSentence(sentenceId) {
    if (isProjectActionDisabled) return;

    await runSentenceOperation(sentenceId, "regenerate", regenerateSentenceOnServer);
  }

  async function shortenSentence(sentenceId) {
    if (isProjectActionDisabled) return;

    await runSentenceOperation(sentenceId, "shorten", shortenSentenceOnServer);
  }

  async function runSentenceOperation(sentenceId, operation, apiCall) {
    const operationToken = Symbol("sentence-operation");
    currentSentenceOperationToken.current = operationToken;
    sentenceOperationActiveRef.current = true;
    setSentenceOperations((current) => ({
      ...current,
      [sentenceId]: { operation, status: "loading", error: "", operationToken }
    }));
    setProjectError("");

    let operationProjectId = null;
    try {
      const projectId = await saveCurrentLesson();
      operationProjectId = projectId;
      const updatedLesson = await apiCall(projectId, sentenceId);
      if (
        shouldApplySentenceOperationResponse({
          activeProjectId: activeProjectIdRef.current,
          currentOperationToken: currentSentenceOperationToken.current,
          operationProjectId,
          operationToken
        })
      ) {
        applyServerLesson(updatedLesson);
      }
      setSentenceOperations((current) => {
        if (current[sentenceId]?.operationToken !== operationToken) return current;
        const next = { ...current };
        delete next[sentenceId];
        if (currentSentenceOperationToken.current === operationToken) {
          currentSentenceOperationToken.current = null;
          sentenceOperationActiveRef.current = false;
        }
        return next;
      });
      await loadProjectList({ quiet: true });
    } catch (error) {
      const shouldShowError = shouldShowSentenceOperationError({
        activeProjectId: activeProjectIdRef.current,
        currentOperationToken: currentSentenceOperationToken.current,
        operationProjectId,
        operationToken
      });
      setSentenceOperations((current) => {
        if (current[sentenceId]?.operationToken !== operationToken) return current;
        const next = { ...current };
        if (shouldShowError) {
          next[sentenceId] = {
            operation,
            status: "error",
            error: error.message,
            operationToken
          };
        } else {
          delete next[sentenceId];
        }
        return next;
      });
      if (currentSentenceOperationToken.current === operationToken) {
        currentSentenceOperationToken.current = null;
        sentenceOperationActiveRef.current = false;
      }
      if (shouldShowError && !operationProjectId) setSaveStatus("error");
    }
  }

  async function regenerateWholeStory() {
    if (isProjectActionDisabled) return;

    setStoryOperationStatus("regenerating");
    setStoryOperationError("");
    setProjectError("");

    let projectId = null;
    try {
      projectId = await saveCurrentLesson();
      const updatedLesson = await regenerateStoryOnServer(projectId, {
        confirmedOverwrite: true
      });
      applyServerLesson(updatedLesson);
      setShowRegenerateConfirm(false);
      setStoryOperationStatus("idle");
      await loadProjectList({ quiet: true });
    } catch (error) {
      setStoryOperationStatus("error");
      setStoryOperationError(error.message);
      if (!projectId) setSaveStatus("error");
    }
  }

  async function lockStory() {
    if (isProjectActionDisabled) return;

    setStoryOperationStatus("locking");
    setStoryOperationError("");
    setProjectError("");

    let projectId = null;
    try {
      projectId = await saveCurrentLesson();
      const updatedLesson = await lockStoryOnServer(projectId);
      applyServerLesson(updatedLesson);
      setShowLockConfirm(false);
      setStoryOperationStatus("idle");
      await loadProjectList({ quiet: true });
    } catch (error) {
      setStoryOperationStatus("error");
      setStoryOperationError(error.message);
      if (!projectId) setSaveStatus("error");
    }
  }

  function requestUnlockStory(shouldWarn) {
    if (isProjectActionDisabled) return;

    if (shouldWarn) {
      setShowUnlockWarning(true);
      return;
    }
    unlockStory();
  }

  async function unlockStory() {
    if (isProjectActionDisabled) return;

    setStoryOperationStatus("unlocking");
    setStoryOperationError("");
    setProjectError("");

    let projectId = null;
    try {
      projectId = await saveCurrentLesson();
      const updatedLesson = await unlockStoryOnServer(projectId, {
        confirmedUnlock: true
      });
      applyServerLesson(updatedLesson);
      setShowUnlockWarning(false);
      setStoryOperationStatus("idle");
      await loadProjectList({ quiet: true });
    } catch (error) {
      setStoryOperationStatus("error");
      setStoryOperationError(error.message);
      if (!projectId) setSaveStatus("error");
    }
  }

  function updateCharacter(characterId, field, value) {
    if (
      isCharacterExtractionActive ||
      isCharacterAppearanceOperationActive ||
      isCharacterImageOperationActive ||
      isSceneImageOperationActive
    ) {
      return;
    }
    updateLesson((current) => patchCharacter(current, characterId, { [field]: value }));
  }

  function updateCharacterBackground(characterId, value) {
    if (
      isCharacterExtractionActive ||
      isCharacterAppearanceOperationActive ||
      isCharacterImageOperationActive ||
      isSceneImageOperationActive
    ) {
      return;
    }
    updateLesson((current) => patchCharacter(current, characterId, { background: value }));
  }

  function addBackground() {
    if (
      isCharacterExtractionActive ||
      isCharacterAppearanceOperationActive ||
      isCharacterImageOperationActive ||
      isSceneImageOperationActive
    ) {
      return;
    }
    updateLesson((current) => addReusableBackground(current, newBackground));
    setNewBackground("");
  }

  function addCharacterNote(characterId, value) {
    if (
      isCharacterExtractionActive ||
      isCharacterAppearanceOperationActive ||
      isCharacterImageOperationActive ||
      isSceneImageOperationActive
    ) {
      return;
    }
    updateLesson((current) => addCharacterNoteToLesson(current, characterId, value));
    setNewNotes((current) => ({
      ...current,
      [characterId]: ""
    }));
  }

  function removeCharacterNote(characterId, note) {
    if (
      isCharacterExtractionActive ||
      isCharacterAppearanceOperationActive ||
      isCharacterImageOperationActive ||
      isSceneImageOperationActive
    ) {
      return;
    }
    updateLesson((current) =>
      removeCharacterNoteFromLesson(current, characterId, note)
    );
  }

  async function generateCharacter(characterId) {
    if (isProjectActionDisabled) return;
    await runCharacterImageOperation(characterId, "generate", async (projectId) => {
      const result = await generateCharacterImageOnServer(projectId, characterId);
      return result.lesson;
    });
  }

  async function updateCharacterAppearance(characterId) {
    if (isProjectActionDisabled) return;
    await runCharacterAppearanceOperation(characterId, async (projectId) => {
      const result = await updateCharacterAppearanceOnServer(projectId, characterId);
      return result.lesson;
    });
  }

  async function approveCharacter(characterId) {
    if (isProjectActionDisabled) return;
    const character = lesson.characters.find((item) => item.id === characterId);
    if (!character?.imagePath || character.stale) return;
    await runCharacterImageOperation(characterId, "approve", (projectId) =>
      approveCharacterImageOnServer(projectId, characterId)
    );
  }

  async function runCharacterImageOperation(characterId, operation, apiCall) {
    const operationToken = Symbol("character-image-operation");
    currentCharacterImageOperationTokens.current = {
      ...currentCharacterImageOperationTokens.current,
      [characterId]: operationToken
    };
    characterImageOperationActiveRef.current = true;
    setCharacterImageOperations((current) => ({
      ...current,
      [characterId]: { operation, status: "loading", error: "", operationToken }
    }));
    setProjectError("");

    let operationProjectId = null;
    try {
      const projectId = await saveCurrentLesson();
      operationProjectId = projectId;
      const updatedLesson = await apiCall(projectId);
      if (
        shouldApplySentenceOperationResponse({
          activeProjectId: activeProjectIdRef.current,
          currentOperationToken:
            currentCharacterImageOperationTokens.current[characterId],
          operationProjectId,
          operationToken
        })
      ) {
        applyServerLesson(updatedLesson);
      }
      setCharacterImageOperations((current) =>
        removeCharacterImageOperation(current, characterId, operationToken)
      );
      await loadProjectList({ quiet: true });
    } catch (error) {
      const shouldShowError = shouldShowSentenceOperationError({
        activeProjectId: activeProjectIdRef.current,
        currentOperationToken:
          currentCharacterImageOperationTokens.current[characterId],
        operationProjectId,
        operationToken
      });
      setCharacterImageOperations((current) => {
        if (current[characterId]?.operationToken !== operationToken) return current;
        const next = { ...current };
        if (shouldShowError) {
          next[characterId] = {
            operation,
            status: "error",
            error: error.message,
            operationToken
          };
        } else {
          delete next[characterId];
          delete currentCharacterImageOperationTokens.current[characterId];
          characterImageOperationActiveRef.current =
            hasLoadingCharacterImageOperation(next);
        }
        return next;
      });
      if (shouldShowError && !operationProjectId) setSaveStatus("error");
    }
  }

  async function runCharacterAppearanceOperation(characterId, apiCall) {
    const operationToken = Symbol("character-appearance-operation");
    currentCharacterAppearanceOperationTokens.current = {
      ...currentCharacterAppearanceOperationTokens.current,
      [characterId]: operationToken
    };
    characterAppearanceOperationActiveRef.current = true;
    setCharacterAppearanceOperations((current) => ({
      ...current,
      [characterId]: {
        operation: "appearance",
        status: "loading",
        error: "",
        operationToken
      }
    }));
    setProjectError("");

    let operationProjectId = null;
    try {
      const projectId = await saveCurrentLesson();
      operationProjectId = projectId;
      const updatedLesson = await apiCall(projectId);
      if (
        shouldApplySentenceOperationResponse({
          activeProjectId: activeProjectIdRef.current,
          currentOperationToken:
            currentCharacterAppearanceOperationTokens.current[characterId],
          operationProjectId,
          operationToken
        })
      ) {
        applyServerLesson(updatedLesson);
      }
      setCharacterAppearanceOperations((current) =>
        removeCharacterAppearanceOperation(current, characterId, operationToken)
      );
      await loadProjectList({ quiet: true });
    } catch (error) {
      const shouldShowError = shouldShowSentenceOperationError({
        activeProjectId: activeProjectIdRef.current,
        currentOperationToken:
          currentCharacterAppearanceOperationTokens.current[characterId],
        operationProjectId,
        operationToken
      });
      setCharacterAppearanceOperations((current) => {
        if (current[characterId]?.operationToken !== operationToken) return current;
        const next = { ...current };
        if (shouldShowError) {
          next[characterId] = {
            operation: "appearance",
            status: "error",
            error: error.message,
            operationToken
          };
        } else {
          delete next[characterId];
          delete currentCharacterAppearanceOperationTokens.current[characterId];
          characterAppearanceOperationActiveRef.current =
            hasLoadingCharacterAppearanceOperation(next);
        }
        return next;
      });
      if (shouldShowError && !operationProjectId) setSaveStatus("error");
    }
  }

  async function extractCharacters() {
    if (isProjectActionDisabled) {
      setCharacterExtractionStatus("error");
      setCharacterExtractionError("Wait for the current operation to finish.");
      return;
    }

    if (lesson.story.status !== "locked") {
      setCharacterExtractionStatus("error");
      setCharacterExtractionError("Lock the story before extracting characters.");
      return;
    }

    setCharacterExtractionStatus("extracting");
    setCharacterExtractionError("");
    setProjectError("");

    let projectId = null;
    try {
      projectId = await saveCurrentLesson();
      const updatedLesson = await extractCharactersOnServer(projectId);
      applyServerLesson(updatedLesson);
      setCharacterExtractionStatus("success");
      await loadProjectList({ quiet: true });
    } catch (error) {
      setCharacterExtractionStatus("error");
      setCharacterExtractionError(error.message);
      if (!projectId) setSaveStatus("error");
    }
  }

  async function requestPlanScenes() {
    if (isProjectActionDisabled) {
      setScenePlanningStatus("error");
      setScenePlanningError("Wait for the current operation to finish.");
      return;
    }

    if (lesson.story.status !== "locked") {
      setScenePlanningStatus("error");
      setScenePlanningError("Lock the story before planning scenes.");
      return;
    }

    if (!areRequiredCharactersApproved(lesson)) {
      setScenePlanningStatus("error");
      setScenePlanningError("Approve character references before scene planning.");
      return;
    }

    if (lesson.scenes.length > 0 && !showSceneReplanConfirm) {
      setShowSceneReplanConfirm(true);
      setScenePlanningStatus("idle");
      setScenePlanningError("");
      return;
    }

    await planScenes();
  }

  async function planScenes() {
    const operationToken = Symbol("scene-planning");
    currentScenePlanningToken.current = operationToken;
    scenePlanningActiveRef.current = true;
    setShowSceneReplanConfirm(false);
    setScenePlanningStatus("planning");
    setScenePlanningError("");
    setProjectError("");

    let operationProjectId = null;
    try {
      const projectId = await saveCurrentLesson();
      operationProjectId = projectId;
      const updatedLesson = await planScenesOnServer(projectId);
      if (
        shouldApplySentenceOperationResponse({
          activeProjectId: activeProjectIdRef.current,
          currentOperationToken: currentScenePlanningToken.current,
          operationProjectId,
          operationToken
        })
      ) {
        applyServerLesson(updatedLesson);
        setScenePlanningStatus("success");
      }
      if (currentScenePlanningToken.current === operationToken) {
        currentScenePlanningToken.current = null;
        scenePlanningActiveRef.current = false;
      }
      await loadProjectList({ quiet: true });
    } catch (error) {
      const shouldShowError = shouldShowSentenceOperationError({
        activeProjectId: activeProjectIdRef.current,
        currentOperationToken: currentScenePlanningToken.current,
        operationProjectId,
        operationToken
      });
      if (shouldShowError) {
        setScenePlanningStatus("error");
        setScenePlanningError(error.message || "Scene planning failed. Try again.");
        if (!operationProjectId) setSaveStatus("error");
      }
      if (currentScenePlanningToken.current === operationToken) {
        currentScenePlanningToken.current = null;
        scenePlanningActiveRef.current = false;
      }
    }
  }

  function updateScene(sceneId, field, value) {
    if (isScenePlanningActive || isSceneImageOperationActive) return;
    updateLesson((current) => patchScene(current, sceneId, { [field]: value }));
  }

  function addSentenceToScene(sceneId, sentenceId) {
    if (isScenePlanningActive || isSceneImageOperationActive) return;
    updateLesson((current) =>
      addSceneSentenceReference(current, sceneId, sentenceId)
    );
  }

  function removeSentenceFromScene(sceneId, sentenceId) {
    if (isScenePlanningActive || isSceneImageOperationActive) return;
    updateLesson((current) =>
      removeSceneSentenceReference(current, sceneId, sentenceId)
    );
  }

  async function generateScene(sceneId) {
    if (isProjectActionDisabled) return;
    await runSceneImageOperation(sceneId, "generate", async (projectId) => {
      const result = await generateSceneImageOnServer(projectId, sceneId);
      return result.lesson;
    });
  }

  async function approveScene(sceneId) {
    if (isProjectActionDisabled) return;
    const scene = lesson.scenes.find((item) => item.id === sceneId);
    if (!scene?.imagePath || scene.stale) return;
    await runSceneImageOperation(sceneId, "approve", (projectId) =>
      approveSceneImageOnServer(projectId, sceneId)
    );
  }

  async function runSceneImageOperation(sceneId, operation, apiCall) {
    const operationToken = Symbol("scene-image-operation");
    currentSceneImageOperationTokens.current = {
      ...currentSceneImageOperationTokens.current,
      [sceneId]: operationToken
    };
    sceneImageOperationActiveRef.current = true;
    setSceneImageOperations((current) => ({
      ...current,
      [sceneId]: { operation, status: "loading", error: "", operationToken }
    }));
    setProjectError("");

    let operationProjectId = null;
    try {
      const projectId = await saveCurrentLesson();
      operationProjectId = projectId;
      const updatedLesson = await apiCall(projectId);
      if (
        shouldApplySentenceOperationResponse({
          activeProjectId: activeProjectIdRef.current,
          currentOperationToken: currentSceneImageOperationTokens.current[sceneId],
          operationProjectId,
          operationToken
        })
      ) {
        applyServerLesson(updatedLesson);
      }
      setSceneImageOperations((current) =>
        removeSceneImageOperation(current, sceneId, operationToken)
      );
      await loadProjectList({ quiet: true });
    } catch (error) {
      const shouldShowError = shouldShowSentenceOperationError({
        activeProjectId: activeProjectIdRef.current,
        currentOperationToken: currentSceneImageOperationTokens.current[sceneId],
        operationProjectId,
        operationToken
      });
      setSceneImageOperations((current) => {
        if (current[sceneId]?.operationToken !== operationToken) return current;
        const next = { ...current };
        if (shouldShowError) {
          next[sceneId] = {
            operation,
            status: "error",
            error: error.message,
            operationToken
          };
        } else {
          delete next[sceneId];
          delete currentSceneImageOperationTokens.current[sceneId];
          sceneImageOperationActiveRef.current = hasLoadingImageOperation(next);
        }
        return next;
      });
      if (shouldShowError && !operationProjectId) setSaveStatus("error");
    }
  }

  async function requestNewLesson() {
    if (blockProjectActionForSentenceOperation()) return;

    if (hasUnsavedLessonChanges()) {
      setPendingProjectAction({
        type: "new",
        message: discardUnsavedChangesMessage
      });
      return;
    }

    await createFreshProject();
  }

  async function requestOpenProjectPanel() {
    if (blockProjectActionForSentenceOperation()) return;

    setIsOpenProjectPanelVisible(true);
    await loadProjectList();
  }

  function requestOpenProject(projectId) {
    if (!isLikelySafeProjectId(projectId)) {
      setProjectError("The selected lesson could not be opened.");
      return;
    }

    if (blockProjectActionForSentenceOperation()) return;

    if (hasUnsavedLessonChanges()) {
      setPendingProjectAction({
        type: "open",
        projectId,
        message: discardUnsavedChangesMessage
      });
      return;
    }

    openProject(projectId);
  }

  function requestOpenProjectLink(projectId) {
    if (!isLikelySafeProjectId(projectId)) {
      setProjectListError("Project link could not be opened.");
      return;
    }

    if (blockProjectActionForSentenceOperation()) return;

    pushProjectUrl(projectId);
    handleProjectUrlNavigation(window.location);
  }

  async function copyProjectLink(projectId) {
    if (!isLikelySafeProjectId(projectId)) {
      setProjectListError("Project link could not be copied.");
      return;
    }

    const projectUrl = getAbsoluteProjectUrl(projectId);
    const clipboard = getClipboard();
    if (!clipboard?.writeText) {
      setProjectListError("Project link could not be copied.");
      return;
    }

    try {
      await clipboard.writeText(projectUrl);
      setProjectListError("");
    } catch {
      setProjectListError("Project link could not be copied.");
    }
  }

  function getProjectUrl(projectId) {
    if (!isLikelySafeProjectId(projectId)) return "";
    return buildProjectUrl(projectId);
  }

  function getAbsoluteProjectUrl(projectId) {
    const projectUrl = getProjectUrl(projectId);
    if (!projectUrl) return "";

    try {
      return new URL(projectUrl, window.location.origin).href;
    } catch {
      return projectUrl;
    }
  }

  function getClipboard() {
    try {
      return navigator?.clipboard;
    } catch {
      return null;
    }
  }

  function pushProjectUrl(projectId) {
    if (!isLikelySafeProjectId(projectId)) return;

    try {
      if (typeof window === "undefined" || !window.history?.pushState) return;
      const nextUrl = buildProjectUrl(projectId, window.location);
      window.history.pushState(window.history.state ?? null, "", nextUrl);
    } catch {
      // Direct link history is a convenience; opening still works without it.
    }
  }

  function handleProjectUrlNavigation(location) {
    const decision = decideProjectUrlNavigation({
      location,
      activeProjectId: activeProjectIdRef.current,
      hasUnsavedChanges: lessonHasUnsavedChangesRef.current
    });

    if (decision.type === "none") return;

    if (decision.type === "invalid-url") {
      setRestoreIssue({
        source: "url",
        reason: decision.reason,
        projectId: null,
        rawValue: decision.rawValue,
        message: decision.message
      });
      setProjectError(decision.message);
      return;
    }

    if (decision.type === "confirm-open") {
      setPendingProjectAction({
        type: "url-open",
        projectId: decision.projectId,
        previousProjectId: decision.previousProjectId,
        message: decision.message
      });
      return;
    }

    if (decision.type === "open") {
      openProject(decision.projectId, { source: "url" });
    }
  }

  function requestDuplicateLesson() {
    if (blockProjectActionForSentenceOperation()) return;

    if (hasUnsavedLessonChanges()) {
      setPendingProjectAction({
        type: "duplicate",
        message: "Save the current lesson, then duplicate it?"
      });
      return;
    }

    duplicateCurrentProject();
  }

  function clearInvalidRestoreState() {
    const decision = decideRestoreIssueClear({
      restoreIssue,
      lastProjectId: readLastProjectId()
    });

    if (!decision.clearIssue) return;

    if (decision.clearUrlProject) clearUrlProjectId();
    if (decision.clearLastProjectId) {
      clearLastProjectId();
    }

    setProjectError("");
    setRestoreIssue(null);
  }

  async function confirmPendingProjectAction() {
    if (blockProjectActionForSentenceOperation()) return;

    const action = pendingProjectAction;
    setPendingProjectAction(null);

    if (action?.type === "new") {
      await createFreshProject();
    }
    if (action?.type === "open") {
      await openProject(action.projectId);
    }
    if (action?.type === "url-open") {
      await openProject(action.projectId, { source: "url" });
    }
    if (action?.type === "duplicate") {
      await duplicateCurrentProject({ saveFirst: true });
    }
  }

  function cancelPendingProjectAction() {
    const action = pendingProjectAction;
    setPendingProjectAction(null);

    if (action?.type !== "url-open") return;

    replaceUrlAfterCancelledProjectNavigation(
      action.previousProjectId || activeProjectIdRef.current
    );
  }

  function replaceUrlAfterCancelledProjectNavigation(projectId) {
    try {
      if (typeof window === "undefined" || !window.history?.replaceState) return;
      const nextUrl = buildUrlForCancelledProjectNavigation(
        window.location,
        projectId
      );
      window.history.replaceState(window.history.state ?? null, "", nextUrl);
    } catch {
      // URL repair after a cancelled navigation is non-fatal.
    }
  }

  async function createFreshProject() {
    if (blockProjectActionForSentenceOperation()) return;

    setLoadStatus("loading");
    setProjectError("");
    try {
      const project = await createProject();
      const normalized = normalizeAndValidateLoadedLesson(project.lesson);
      setLesson(normalized);
      markLessonSaved(normalized, { savedAt: new Date().toISOString() });
      setActiveProjectIdAndRef(project.id);
      clearTransientInputs();
      resetMediaReadiness();
      setLoadStatus("loaded");
      await loadProjectList({ quiet: true });
    } catch (error) {
      setLoadStatus("error");
      setProjectError(error.message);
    }
  }

  async function handleSaveLesson() {
    if (blockProjectActionForSentenceOperation()) return;

    setProjectError("");
    try {
      await saveCurrentLesson();
    } catch (error) {
      setSaveStatus("error");
      setProjectError(error.message);
    }
  }

  async function saveCurrentLesson() {
    const normalized = normalizeLessonForClient(lesson);
    const errors = validateLessonShape(normalized);
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    setSaveStatus("saving");
    const savedLesson =
      activeProjectId && activeProjectId === normalized.id
        ? await saveProjectRecord(activeProjectId, normalized)
        : (await createProject(normalized)).lesson;
    const loadedLesson = normalizeAndValidateLoadedLesson(savedLesson);

    setLesson(loadedLesson);
    markLessonSaved(loadedLesson, { savedAt: new Date().toISOString() });
    setActiveProjectIdAndRef(loadedLesson.id);
    setProjectError("");
    await loadProjectList({ quiet: true });
    return loadedLesson.id;
  }

  function applyServerLesson(serverLesson) {
    const normalized = normalizeAndValidateLoadedLesson(serverLesson);
    setLesson(normalized);
    markLessonSaved(normalized, { savedAt: new Date().toISOString() });
    setActiveProjectIdAndRef(normalized.id);
    setProjectError("");
    resetMediaReadiness();
  }

  function setActiveProjectIdAndRef(projectId, options = {}) {
    activeProjectIdRef.current = projectId;
    setActiveProjectId(projectId);
    if (isLikelySafeProjectId(projectId)) {
      writeLastProjectId(projectId);
      setRestoreIssue(null);
      if (options.syncUrl !== false) {
        replaceUrlProjectId(projectId);
      }
    }
  }

  function blockProjectActionForSentenceOperation() {
    if (loadStatus === "loading") {
      setProjectError("Wait for the current project load to finish.");
      return true;
    }

    if (
      !sentenceOperationActiveRef.current &&
      !isSentenceOperationActive &&
      !characterAppearanceOperationActiveRef.current &&
      !isCharacterAppearanceOperationActive &&
      !characterImageOperationActiveRef.current &&
      !isCharacterImageOperationActive &&
      !scenePlanningActiveRef.current &&
      !isScenePlanningActive &&
      !sceneImageOperationActiveRef.current &&
      !isSceneImageOperationActive
    ) {
      return false;
    }

    setProjectError("Wait for the current operation to finish.");
    return true;
  }

  function removeCharacterImageOperation(current, characterId, operationToken) {
    if (current[characterId]?.operationToken !== operationToken) return current;
    const next = { ...current };
    delete next[characterId];
    delete currentCharacterImageOperationTokens.current[characterId];
    characterImageOperationActiveRef.current = hasLoadingCharacterImageOperation(next);
    return next;
  }

  function hasLoadingCharacterImageOperation(operations) {
    return hasLoadingImageOperation(operations);
  }

  function removeCharacterAppearanceOperation(current, characterId, operationToken) {
    if (current[characterId]?.operationToken !== operationToken) return current;
    const next = { ...current };
    delete next[characterId];
    delete currentCharacterAppearanceOperationTokens.current[characterId];
    characterAppearanceOperationActiveRef.current =
      hasLoadingCharacterAppearanceOperation(next);
    return next;
  }

  function hasLoadingCharacterAppearanceOperation(operations) {
    return hasLoadingImageOperation(operations);
  }

  function removeSceneImageOperation(current, sceneId, operationToken) {
    if (current[sceneId]?.operationToken !== operationToken) return current;
    const next = { ...current };
    delete next[sceneId];
    delete currentSceneImageOperationTokens.current[sceneId];
    sceneImageOperationActiveRef.current = hasLoadingImageOperation(next);
    return next;
  }

  function hasLoadingImageOperation(operations) {
    return Object.values(operations).some(
      (operation) => operation?.status === "loading"
    );
  }

  async function loadProjectList(options = {}) {
    const requestId = projectListRequestIdRef.current + 1;
    projectListRequestIdRef.current = requestId;
    setProjectListStatus("loading");

    if (!options.quiet) setProjectListError("");

    try {
      const projects = await listProjects();
      if (!isCurrentProjectListRequest(requestId)) return [];

      setProjectList(projects);
      setProjectListStatus("loaded");
      setProjectListError("");
      return projects;
    } catch (error) {
      if (!isCurrentProjectListRequest(requestId)) return [];

      setProjectListStatus("error");
      setProjectListError(
        error.message || "Saved lessons could not be refreshed."
      );
      if (options.surfaceGlobalError) {
        setProjectError(error.message || "Saved lessons could not be refreshed.");
      }
      return [];
    }
  }

  function isCurrentProjectListRequest(requestId) {
    return isAppMountedRef.current && projectListRequestIdRef.current === requestId;
  }

  async function openProject(projectId, options = {}) {
    if (!isLikelySafeProjectId(projectId)) {
      setProjectError(
        options.source === "url"
          ? invalidUrlProjectMessage
          : "The selected lesson could not be opened."
      );
      return;
    }

    if (blockProjectActionForSentenceOperation()) return;

    const requestId = projectOpenRequestIdRef.current + 1;
    projectOpenRequestIdRef.current = requestId;
    setLoadStatus("loading");
    setProjectError("");
    try {
      const loadedLesson = normalizeAndValidateLoadedLesson(await getProject(projectId));
      if (!isCurrentProjectOpenRequest(requestId)) return;

      setLesson(loadedLesson);
      markLessonSaved(loadedLesson);
      setActiveProjectIdAndRef(loadedLesson.id);
      clearTransientInputs();
      resetMediaReadiness();
      setLoadStatus("loaded");
      setIsOpenProjectPanelVisible(false);
      await loadProjectList({ quiet: true });
    } catch (error) {
      if (!isCurrentProjectOpenRequest(requestId)) return;

      setLoadStatus("error");
      if (options.source === "url") {
        const message = "The lesson requested in the URL could not be opened.";
        setRestoreIssue({
          source: "url",
          reason: "load-failed",
          projectId,
          rawValue: projectId,
          message
        });
        setProjectError(message);
        return;
      }

      setProjectError(error.message);
    }
  }

  function isCurrentProjectOpenRequest(requestId) {
    return isAppMountedRef.current && projectOpenRequestIdRef.current === requestId;
  }

  async function duplicateCurrentProject(options = {}) {
    if (blockProjectActionForSentenceOperation()) return;

    setLoadStatus("duplicating");
    setProjectError("");
    try {
      const sourceProjectId = options.saveFirst
        ? await saveCurrentLesson()
        : activeProjectId;
      if (!sourceProjectId) {
        throw new Error("Save the lesson before duplicating it.");
      }

      const result = await duplicateProject(sourceProjectId);
      const duplicatedLesson = normalizeAndValidateLoadedLesson(result.lesson);
      setLesson(duplicatedLesson);
      markLessonSaved(duplicatedLesson, { savedAt: new Date().toISOString() });
      setActiveProjectIdAndRef(duplicatedLesson.id);
      clearTransientInputs();
      resetMediaReadiness();
      setLoadStatus("loaded");
      await loadProjectList({ quiet: true });
    } catch (error) {
      setLoadStatus("error");
      setProjectError(error.message);
    }
  }

  function normalizeAndValidateLoadedLesson(loadedLesson) {
    const normalized = normalizeLessonForClient(loadedLesson);
    const errors = validateLessonShape(normalized);
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }
    return isSetupComplete(normalized)
      ? normalized
      : setLessonCurrentStage(normalized, "setup");
  }

  function hasUnsavedLessonChanges() {
    return lessonHasUnsavedChanges;
  }

  function changeStage(stageId) {
    if (isProjectLoading) {
      setProjectError("Wait for the current project load to finish.");
      return;
    }

    if (stageId !== "setup" && !isSetupComplete(lesson)) {
      setHasSubmittedSetup(true);
      updateLesson((current) =>
        current.currentStage === "setup" ? current : setLessonCurrentStage(current, "setup")
      );
      return;
    }

    updateLesson((current) => setLessonCurrentStage(current, stageId), {
      clearMediaReadiness: false
    });
    setShowLockConfirm(false);
    setShowUnlockWarning(false);
    setShowRegenerateConfirm(false);
    setShowSceneReplanConfirm(false);
  }

  function renderStage() {
    if (isProjectLoading) {
      return <ProjectLoadingState />;
    }

    switch (lesson.currentStage) {
      case "setup":
        return (
          <SetupStage
            lesson={lesson}
            newSecondaryCharacter={newSecondaryCharacter}
            onSetupChange={updateLessonField}
            onMainCharacterChange={updateMainCharacter}
            onNewSecondaryCharacterChange={setNewSecondaryCharacter}
            onAddSecondaryCharacter={addSecondaryCharacter}
            onRemoveSecondaryCharacter={removeSecondaryCharacter}
            onSetupFieldBlur={markSetupFieldTouched}
            setupErrors={visibleSetupErrors}
            showSetupValidation={hasSubmittedSetup}
            onGenerateStory={handleGenerateStory}
            storyGenerationStatus={storyGenerationStatus}
            storyGenerationError={storyGenerationError}
            isStoryMutationDisabled={isProjectActionDisabled}
          />
        );
      case "story":
        return (
          <StoryStage
            lesson={lesson}
            hasDownstreamOutput={downstreamOutputExists}
            onSentenceChange={updateSentence}
            onSentenceAdd={addSentence}
            onSentenceMove={moveSentence}
            onSentenceDelete={deleteSentence}
            onRegenerateSentence={regenerateSentence}
            onShortenSentence={shortenSentence}
            onRegenerateStory={() => setShowRegenerateConfirm(true)}
            onConfirmRegenerateStory={regenerateWholeStory}
            onCancelRegenerateStory={() => setShowRegenerateConfirm(false)}
            onShowLockConfirm={() => setShowLockConfirm(true)}
            onCancelLock={() => setShowLockConfirm(false)}
            onLockStory={lockStory}
            onUnlockStory={requestUnlockStory}
            onConfirmUnlock={unlockStory}
            onCancelUnlock={() => setShowUnlockWarning(false)}
            showLockConfirm={showLockConfirm}
            showUnlockWarning={showUnlockWarning}
            showRegenerateConfirm={showRegenerateConfirm}
            storyOperationStatus={storyOperationStatus}
            storyOperationError={storyOperationError}
            sentenceOperations={sentenceOperations}
            isSentenceOperationActive={isProjectActionDisabled}
          />
        );
      case "characters":
        return (
          <CharactersStage
            lesson={lesson}
            newBackground={newBackground}
            newNotes={newNotes}
            onCharacterChange={updateCharacter}
            onCharacterBackgroundSelect={updateCharacterBackground}
            onNewBackgroundChange={setNewBackground}
            onAddBackground={addBackground}
            onNewNoteChange={(characterId, value) =>
              setNewNotes((current) => ({ ...current, [characterId]: value }))
            }
            onAddCharacterNote={addCharacterNote}
            onRemoveCharacterNote={removeCharacterNote}
            onGenerateCharacter={generateCharacter}
            onApproveCharacter={approveCharacter}
            onUpdateAppearance={updateCharacterAppearance}
            onExtractCharacters={extractCharacters}
            characterExtractionStatus={characterExtractionStatus}
            characterExtractionError={characterExtractionError}
            characterAppearanceOperations={characterAppearanceOperations}
            characterImageOperations={characterImageOperations}
            isCharacterExtractionDisabled={
              isProjectActionDisabled ||
              saveStatus === "saving" ||
              loadStatus === "loading" ||
              loadStatus === "duplicating"
            }
          />
        );
      case "scenes":
        return (
          <ScenesStage
            lesson={lesson}
            onSceneChange={updateScene}
            onAddSentenceToScene={addSentenceToScene}
            onRemoveSentenceFromScene={removeSentenceFromScene}
            onGenerateScene={generateScene}
            onApproveScene={approveScene}
            onPlanScenes={requestPlanScenes}
            onConfirmPlanScenes={planScenes}
            onCancelPlanScenes={() => setShowSceneReplanConfirm(false)}
            scenePlanningStatus={scenePlanningStatus}
            scenePlanningError={scenePlanningError}
            sceneImageOperations={sceneImageOperations}
            showSceneReplanConfirm={showSceneReplanConfirm}
            isScenePlanningDisabled={
              isProjectActionDisabled ||
              saveStatus === "saving" ||
              loadStatus === "loading" ||
              loadStatus === "duplicating"
            }
          />
        );
      case "media":
        return (
          <MediaStage
            lesson={lesson}
            onMediaFilterChange={(filter) =>
              updateLesson((current) => updateMediaFilter(current, filter), {
                clearMediaReadiness: false
              })
            }
            readiness={verifiedMediaReadiness}
            readinessStatus={mediaReadiness.status}
            readinessError={mediaReadiness.error}
            onRefreshReadiness={checkMediaReadiness}
            onGoToStage={changeStage}
          />
        );
      case "export":
        return (
          <ExportStage
            lesson={lesson}
            readiness={verifiedMediaReadiness}
            readinessStatus={mediaReadiness.status}
            readinessError={mediaReadiness.error}
            onRefreshReadiness={checkMediaReadiness}
          />
        );
      default:
        return null;
    }
  }

  if (isStartupRestoring) {
    return (
      <div className="app-shell app-shell--loading" aria-busy="true">
        <main className="main-content">
          <ProjectLoadingState />
        </main>
      </div>
    );
  }

  return (
    <AppShell
      stages={stages}
      currentStage={lesson.currentStage}
      completedStages={completedStages}
      onStageChange={changeStage}
      apiStatus={apiStatus}
      projectControls={projectControls}
    >
      {renderStage()}
    </AppShell>
  );
}

function ProjectLoadingState() {
  return (
    <div className="stage">
      <section className="panel">
        <div className="panel__title">
          <h2>Loading lesson...</h2>
        </div>
        <p className="muted">
          Restoring the saved lesson before editing controls are available.
        </p>
      </section>
    </div>
  );
}
