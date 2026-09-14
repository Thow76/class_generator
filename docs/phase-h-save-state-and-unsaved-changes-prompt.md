# Phase H Implementation Prompt: Save State And Unsaved Changes Boundary

Use this prompt to implement Phase H of the character/media workflow cleanup.

## Context

Earlier phases A-F cleaned up character appearance data, character extraction, the Characters stage UI, appearance suggestions, character image prompts and scene image prompt boundaries.

Phase G made reload/reopen behavior reliable for saved projects by restoring the active saved project from a URL project parameter or from localStorage.

There is still an important user-facing persistence boundary: Phase G can restore the last saved project, but it should not imply that every in-memory edit survives refresh. The app needs to make it obvious when the current lesson has unsaved changes and protect the user from accidentally refreshing, switching project or starting a new project before saving.

Phase H is about explicit save state and unsaved-change protection. It is not autosave and not draft recovery.

## Phase H Goal

Make the app's persistence state honest and hard to misunderstand.

After Phase H, the user should be able to tell:

- which saved project is active,
- whether the active lesson has unsaved changes,
- when the lesson was last saved successfully in this session,
- whether a save failed,
- and when a refresh, project switch, new project or duplicate operation could discard unsaved in-memory edits.

Phase H should preserve the current manual save model. It should not store draft lesson content in localStorage and should not create autosave behavior.

## Scope

Implement Phase H only.

Do not implement:

- Autosave.
- Timed background saving.
- Debounced saving.
- Draft recovery after refresh.
- Storing the lesson object in localStorage.
- Storing generated OpenAI output or image data in localStorage.
- Export package generation.
- ZIP generation.
- PowerPoint generation.
- Worksheet generation.
- Audio or video generation.
- Accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or sharing.
- Backend project storage redesign.
- New database.
- Multi-user conflict handling.

Phase H may update:

- Frontend dirty-state tracking.
- Frontend save status display.
- Frontend beforeunload handling.
- Project open/new/duplicate confirmation behavior.
- Manual save success/failure state.
- Sidebar or shell project status UI.
- Frontend tests for unsaved-change behavior.
- Small helper modules for save-state comparison.
- Documentation for manual-save behavior.

Backend changes should be unnecessary unless a direct save/open API bug is discovered.

## Required Behavior

After Phase H:

- The app tracks whether the current lesson differs from the last successfully saved or restored snapshot.
- A saved/restored project starts in a clean state.
- Saving successfully updates the saved snapshot and clears unsaved status.
- Save failure leaves unsaved status intact and shows a clear non-blocking error.
- Edits to setup, story, characters, appearance descriptions, scenes and media-affecting approval state mark the lesson unsaved when those edits are normal frontend state changes.
- Backend generation operations that return and persist an updated lesson should leave the frontend clean if the returned lesson represents the saved project state.
- Local-only edits after a backend generation operation should mark the lesson unsaved again.
- The UI shows a concise save state such as `Saved`, `Unsaved changes`, `Saving...` or `Save failed`.
- The UI shows the active project title or id clearly enough that the user knows what will be saved.
- Refreshing or closing the tab with unsaved changes triggers the browser's native beforeunload warning.
- Opening another project with unsaved changes asks for confirmation before discarding in-memory edits.
- Creating a fresh project with unsaved changes asks for confirmation before discarding in-memory edits.
- Duplicating or otherwise replacing the active lesson with unsaved changes asks for confirmation unless the operation first saves or preserves the current lesson according to existing behavior.
- If the user cancels a confirmation, the current lesson remains unchanged.
- Phase G restore behavior still works and does not write draft content to localStorage.
- Existing operation guards remain intact during story, character, appearance, image, scene and media operations.

## Product Boundary

Use Phase H to clarify manual persistence:

- Saved project data lives in the backend project store.
- Phase G localStorage state stores only a project id.
- Phase H dirty tracking is in memory for the current browser session.
- Unsaved in-memory edits are not recoverable after refresh unless the user explicitly saves first.

Do not use language that promises automatic recovery.

Recommended UI text:

- `Saved`
- `Saving...`
- `Unsaved changes`
- `Save failed`
- `Save before refreshing to keep these edits.`
- `You have unsaved changes. Continue without saving?`

Avoid:

- `Autosaved`
- `Recovered draft`
- `Syncing`
- `Backed up`
- `Cloud saved`
- `All changes are safe`

## Files To Inspect

Before changing code, inspect:

- `docs/phase-g-session-restoration-prompt.md`
- `docs/phase-g-session-restoration-review-prompt.md`
- `frontend/src/App.jsx`
- `frontend/src/components/AppShell.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/StageHeader.jsx`
- `frontend/src/api/projects.js`
- `frontend/src/utils/normalizeLesson.js`
- `frontend/src/utils/validateLessonShape.js`
- `frontend/src/utils/projectAutoReopen.js`
- `frontend/src/utils/projectSessionStorage.js`
- `frontend/src/utils/projectSessionUrl.js`
- `frontend/src/utils/lessonUpdates.js`
- `frontend/src/utils/lessonSelectors.js`
- `frontend/src/utils/sentenceOperationGuards.js`
- `frontend/test/projectAutoReopen.test.js`
- `frontend/test/projectSessionStorage.test.js`
- `frontend/test/projectSessionUrl.test.js`
- `frontend/test/sentenceOperationGuards.test.js`
- `frontend/test/*`
- `server/src/routes/projects.js`
- `server/src/services/projectStore.js`
- `server/test/projectStore.test.js`

Use existing React state patterns and test style. Keep the implementation boring and local.

## Implementation Steps

### 1. Audit Current Save State

Before editing, search for existing save or dirty-state behavior:

```sh
rg "unsaved|dirty|hasChanges|saveStatus|Saving|Save failed|beforeunload|confirm\\(|lastSaved|activeProject|saveCurrentLesson|openProject|createFreshProject|duplicateCurrentProject" frontend/src frontend/test
```

Determine:

1. Where manual save happens.
2. Whether saves already have a status state.
3. Whether project open/new/duplicate already confirm unsaved changes.
4. Whether backend generation operations return already-saved lesson state.
5. Whether project restore from Phase G sets the active lesson cleanly.

If a robust implementation already exists, do not rewrite it. Add missing tests, docs or small fixes only.

### 2. Add Or Confirm A Stable Saved Snapshot

Track the last saved/restored lesson snapshot in frontend state or a ref.

Recommended shape in `frontend/src/App.jsx`:

```js
const lastSavedLessonRef = useRef(null);
const [saveState, setSaveState] = useState({
  status: "clean",
  savedAt: null,
  error: null
});
```

Recommended statuses:

```text
clean
dirty
saving
error
```

The exact state shape can differ, but it must support:

- clean vs dirty,
- saving in progress,
- latest save failure,
- optional last saved timestamp.

Set the saved snapshot after:

- successful Phase G restore,
- successful manual project open,
- successful save,
- successful save-as-new/project creation,
- successful duplicate when the duplicate becomes active,
- successful backend operations that persist the updated lesson and return the saved lesson.

Do not set the saved snapshot after local edits unless the app has actually saved.

### 3. Compare Lessons Safely

Add a helper if needed, for example:

```text
frontend/src/utils/lessonDirtyState.js
```

Recommended exports:

```js
export function createLessonSnapshot(lesson) {}
export function lessonsHaveUnsavedChanges(currentLesson, savedSnapshot) {}
```

The comparison should:

- normalize before comparing if existing helpers make that safe,
- ignore purely transient UI-only fields if any are embedded in the lesson object,
- treat missing saved snapshot for an unsaved new lesson as dirty once the user has made meaningful edits,
- avoid mutating the lesson object,
- be deterministic.

If the lesson object is already JSON-serializable and stable, a normalized JSON string snapshot is acceptable:

```js
JSON.stringify(normalizeLesson(lesson))
```

Do not use object identity as the only dirty check. Many valid React updates replace objects.

Do not compare generated image binary data. Lesson records should contain metadata and project-relative paths only.

### 4. Mark Local Edits Dirty

Update the main lesson update path so normal local edits mark the app dirty.

Expected dirty-triggering changes include:

- setup field edits,
- story sentence edits,
- story lock/unlock local state changes if not immediately persisted by backend,
- character field edits,
- appearance description edits,
- manual character notes edits if still present,
- scene field edits,
- scene assignment/order edits,
- image approval or stale state changes if they are local only.

Prefer deriving dirty state by comparing current lesson to the saved snapshot rather than sprinkling manual `setDirty(true)` calls everywhere. If deriving is too expensive or inconsistent with the current code, centralize manual marking in the few existing update helpers.

### 5. Treat Persisted Backend Results As Clean

Some operations likely call the backend and return an updated saved lesson, such as:

- story generation,
- character extraction,
- appearance update,
- character image generation,
- character image approval,
- scene planning,
- scene image generation,
- scene image approval.

For operations that save the returned lesson in the project store before responding, apply the returned lesson and update the saved snapshot so the UI reads as clean.

For operations that only update frontend state and still require manual save, apply the returned lesson as dirty and do not update the saved snapshot.

Do not guess. Inspect each service/route contract and follow the existing persistence behavior.

Document any operation whose persistence boundary is ambiguous.

### 6. Add Save Status UI

Add a small, persistent save-state indicator in an existing shell/header/sidebar area.

Recommended placement:

- Near the active project title in `AppShell` or `Sidebar`.
- Or in `StageHeader` if that is where project actions already live.

The indicator should be concise and not a modal.

Examples:

```text
Saved
Unsaved changes
Saving...
Save failed
```

If saved timestamp is shown, keep it small:

```text
Saved 14:32
```

Do not add a large educational panel explaining persistence. The UI should simply make state visible.

If there is an existing `StatusBadge` component, use it instead of introducing a visually unrelated badge style.

### 7. Preserve Manual Save Flow

When the user clicks Save:

1. Set save state to `saving`.
2. Call the existing save project API.
3. Normalize/validate the returned lesson or current lesson according to existing behavior.
4. Update the saved snapshot on success.
5. Set save state to `clean`.
6. Update Phase G restore state if saving creates or activates a project.
7. Refresh the project list if the current save flow already does this.

On failure:

1. Leave current lesson state unchanged.
2. Keep or set dirty status.
3. Store a concise save error.
4. Do not update the saved snapshot.
5. Do not update the last-project restore id unless the project was actually created or saved.

Avoid exposing stack traces, absolute paths or provider internals in the UI.

### 8. Add Beforeunload Warning For Unsaved Changes

Install a `beforeunload` listener when there are unsaved changes.

Expected behavior:

- If unsaved changes exist, browser refresh/close prompts with the native warning.
- If no unsaved changes exist, refresh/close does not prompt.
- The listener is added and removed cleanly.
- Tests should verify listener registration behavior where feasible.

Use the browser-supported pattern:

```js
event.preventDefault();
event.returnValue = "";
```

Do not use custom text as a requirement because modern browsers ignore it.

### 9. Guard Project-Replacing Actions

Add a helper such as:

```js
function confirmDiscardUnsavedChanges() {}
```

Use it before actions that replace the current lesson:

- open another project,
- restore another project manually if applicable,
- create a fresh project,
- duplicate a project if the current unsaved lesson would be replaced,
- load demo/default if exposed through UI,
- any retry/restore action that swaps the active lesson.

If unsaved changes are absent, do not prompt.

If unsaved changes are present:

- Show a clear confirmation.
- Continue only when the user confirms.
- Leave the current lesson and active project unchanged when the user cancels.

Use the repo's existing modal/confirmation pattern if it exists. If the app currently uses `window.confirm`, it is acceptable to use it for Phase H, but keep all confirmation text centralized so it can be replaced later.

### 10. Preserve Phase G Restore Rules

Phase H must not break Phase G.

Verify:

- On startup, URL project restore still wins over localStorage.
- localStorage still stores only the last project id.
- Successful restore sets saved snapshot clean.
- Failed restore falls back as Phase G specified.
- Invalid restore state is cleared as Phase G specified.
- No lesson JSON is written into `localStorage` or `sessionStorage`.

### 11. Preserve Existing Operation Guards

Project save/open/new/duplicate actions should remain blocked or disabled during active operations that already block them, including:

- story generation,
- sentence rewrite/shorten operations,
- story lock/unlock if guarded,
- character extraction,
- appearance update,
- character image generation,
- character image approval,
- scene planning,
- scene image generation,
- scene image approval,
- media readiness refresh if it already has a guard.

Do not relax existing `sentenceOperationGuards` or active-operation guards.

If Phase H adds a confirmation dialog, it should not allow a project switch while an active generation operation is running.

### 12. Keep Backend Storage Unchanged

Do not redesign backend project storage.

Only inspect backend save/open behavior to understand whether frontend operations are persisted.

Backend changes are acceptable only for a direct bug such as:

- save route returns a stale lesson after writing,
- save route omits project id needed by the frontend,
- duplicate/open route response shape is inconsistent with existing API helper expectations.

If a backend fix is needed, keep it minimal and add a focused test.

## Test Expectations

Add or update frontend tests for:

- A restored project starts with clean save state.
- Manual open starts with clean save state.
- Local setup edit marks dirty.
- Local story edit marks dirty.
- Local character appearance edit marks dirty.
- Local scene edit marks dirty.
- Successful save clears dirty state and updates saved snapshot.
- Failed save leaves dirty state intact and shows save failure.
- `beforeunload` listener is active only while dirty.
- Opening another project while dirty prompts for confirmation.
- Canceling that confirmation leaves the current lesson unchanged.
- Confirming that prompt opens the selected project.
- Creating a fresh project while dirty prompts for confirmation.
- Duplicating/replacing while dirty prompts for confirmation if applicable.
- Backend-persisted generation result is treated according to its real contract.
- Phase G localStorage helpers still store only project ids.
- Invalid localStorage restore state is not made worse by dirty-state tracking.

Update or add helper tests if you create:

- `frontend/src/utils/lessonDirtyState.js`
- `frontend/src/utils/unsavedChangesGuard.js`

Backend tests are optional and should be added only for a direct backend bug.

## Manual QA

Run through these scenarios:

1. Open the app with no saved project.
   - The app loads normally.
   - Save state does not falsely say a backend project is saved.

2. Open a saved project.
   - The active project is visible.
   - Save state reads clean/saved.

3. Edit the appearance description of a character.
   - Save state changes to unsaved.
   - Refresh triggers native browser warning.

4. Save successfully.
   - Save state returns to saved.
   - Refresh no longer warns.
   - Phase G restores the same saved project after refresh.

5. Edit a scene and try to open another project.
   - A discard confirmation appears.
   - Cancel leaves the current scene edit visible.
   - Confirm opens the selected project.

6. Simulate a save failure.
   - The lesson remains editable.
   - Save state shows failure.
   - Unsaved warning remains active.

7. Run an image or scene generation operation.
   - Existing operation guards remain active.
   - Save/open/new/duplicate behavior is not enabled mid-operation.

## Commands To Consider

Use the commands that fit the repo's scripts:

```sh
git status --short
rg "unsaved|dirty|hasChanges|saveStatus|Saving|Save failed|beforeunload|confirm\\(|lastSaved|activeProject|saveCurrentLesson|openProject|createFreshProject|duplicateCurrentProject" frontend/src frontend/test
rg "localStorage|sessionStorage|projectSession|projectAutoReopen|readLastProjectId|writeLastProjectId|clearLastProjectId|readUrlProjectId|replaceUrlProjectId" frontend/src frontend/test
npm test --workspace frontend
npm test --workspace server
npm run build --workspace frontend
```

Run focused tests first if supported:

```sh
npm test --workspace frontend -- projectAutoReopen.test.js
npm test --workspace frontend -- projectSessionStorage.test.js
npm test --workspace frontend -- projectSessionUrl.test.js
npm test --workspace frontend -- unsavedChanges.test.js
npm test --workspace frontend -- lessonDirtyState.test.js
```

If file filters are unsupported, run the full frontend test suite instead.

## Acceptance Criteria

Phase H is complete when:

- There is a reliable in-memory dirty-state model.
- Successful saved/restored/opened projects start clean.
- Local edits mark the lesson unsaved.
- Successful save clears unsaved state.
- Save failure leaves unsaved state intact.
- Save state is visible in the UI.
- Browser refresh/close warns only while there are unsaved changes.
- Project-replacing actions confirm before discarding unsaved edits.
- Canceling a discard confirmation preserves the current lesson.
- Confirming a discard performs the requested action.
- Phase G restore behavior still works.
- localStorage/sessionStorage does not contain full lesson JSON or draft output.
- Existing active-operation guards remain intact.
- Tests cover the important dirty-state, save, beforeunload and confirmation paths.
- No autosave, draft recovery, cloud sync, export or backend storage redesign scope is introduced.

## Handoff Summary Requirement

When implementation is complete, provide a concise summary that includes:

- Files changed.
- How dirty state is computed.
- Where save state is displayed.
- Which actions prompt before discarding unsaved changes.
- Which operations are treated as backend-persisted and therefore clean.
- Tests run and results.
- Any persistence behavior intentionally left for later.

Keep the final summary clear that Phase H makes manual save state visible and guarded. It does not implement autosave or unsaved draft recovery.
