# Phase G Implementation Prompt: Session Restoration And Last Project Persistence

Use this prompt to implement Phase G of the character/media workflow cleanup.

## Context

Earlier phases A-F cleaned up character appearance data, character extraction, the Characters stage UI, appearance suggestions, character image prompts and scene image prompt boundaries.

There is still a practical workflow issue: when the user refreshes or reopens the localhost app, the frontend should not drop them back into the demo/default lesson if they were already working in a saved project. Backend project persistence already exists; Phase G is about restoring the frontend session to the last active saved project.

This repo may already contain staged session restoration documentation and partial or complete implementation. Before making changes, inspect the current code and docs carefully so you do not duplicate existing behavior.

Known related docs may include:

- `docs/session-restoration-stage-1-baseline.md`
- `docs/session-restoration-stage-2-restore-rules.md`
- `docs/session-restoration-stage-3-localstorage-prompt.md`
- `docs/session-restoration-stage-4-implementation-prompt.md`
- `docs/session-restoration-stage-5-clear-invalid-restore-state-prompt.md`
- `docs/session-restoration-stage-6-startup-project-list-load-prompt.md`

If those docs already describe implemented behavior, Phase G should consolidate, verify and remediate gaps only.

## Phase G Goal

Make reload/reopen behavior reliable for saved projects.

When the app starts:

- It should load the saved project list.
- It should restore a project specified by a valid URL project parameter if present.
- Otherwise, it should restore the last active saved project from local storage if valid.
- If restoration fails because the project is missing, malformed or unreadable, it should clear invalid restore state and fall back gracefully.
- It should not lose saved backend project data.
- It should not pretend unsaved in-memory edits can survive a refresh.

Phase G should improve session continuity only. It should not implement autosave, accounts, cloud sync or exports.

## Scope

Implement Phase G only.

Do not implement:

- Autosave.
- Draft recovery for unsaved React state.
- Export generation.
- ZIP generation.
- PowerPoint generation.
- Worksheet generation.
- Audio or video generation.
- Accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or sharing.
- Backend project storage redesign.
- New database.
- Project sharing.
- Multi-user sessions.

Phase G may update:

- Frontend startup effects.
- Frontend project open/save/create/duplicate flows.
- Frontend URL query handling for project restoration.
- Frontend localStorage helper functions.
- Sidebar/project status messaging.
- Frontend tests for restoration rules.
- Documentation for restored startup behavior.

Backend changes should be unnecessary unless a direct project API bug is discovered.

## Required Behavior

After Phase G:

- App startup no longer blindly leaves the user on `demoLesson` when a valid restore target exists.
- A valid URL project parameter takes precedence over localStorage.
- A valid localStorage project id restores when no URL project parameter exists.
- A restored project becomes the active project.
- Restored project data is normalized and validated using existing client helpers.
- The project list is loaded on startup so the sidebar is useful immediately.
- Opening a project manually updates the last-project restore state.
- Saving a new unsaved lesson updates the last-project restore state after project creation.
- Creating a fresh project updates the last-project restore state.
- Duplicating a project updates the last-project restore state.
- Invalid localStorage restore state is cleared.
- Missing/deleted projects do not create a permanent restore loop.
- Malformed URL project ids do not call unsafe project endpoints.
- Missing URL projects report a clear, non-blocking restore issue.
- The user can dismiss or recover from restore errors.
- Existing project operations remain blocked during active generation/image/scene operations as before.

## Restore Priority

Use this priority:

1. Valid URL project id.
2. Valid localStorage last project id.
3. Existing demo/default initial lesson fallback.

URL should win because it represents an explicit link/bookmark.

LocalStorage should be used only when URL has no valid project id.

## URL Contract

Prefer a simple query parameter:

```text
?project=lesson-20260912-example
```

Rules:

- Read the URL project id on startup.
- Validate it before calling `getProject`.
- If valid and load succeeds, restore that project.
- If malformed, do not call the API.
- If missing/deleted/unreadable, show a clear restore issue and fall back gracefully.
- After successful manual open/save/create/duplicate, update or replace the URL project parameter if this behavior already exists or is part of the current restoration design.

If the repo's existing restoration docs chose no URL support or removed URL scope, follow the current documented direction and do not reintroduce URL support. If there is a conflict, prefer the latest existing session-restoration stage docs in this repo and document the decision in the handoff summary.

## LocalStorage Contract

Use a namespaced key.

Recommended key:

```text
lessonSourceBuilder.lastProjectId
```

If the repo already uses a different key, keep the existing key and document it.

Rules:

- Store only safe project ids.
- Do not store whole lesson JSON.
- Do not store OpenAI output or images.
- Do not store unsaved draft content.
- Clear the key if it contains malformed data.
- Clear the key if it points to a missing/deleted project and no URL project is explicitly being restored.
- Update the key when a project becomes active through open/save/create/duplicate/restore.

## Safety Rules

Project ids must pass the existing safe project id constraints before use.

Expected pattern is likely:

```text
lesson-[A-Za-z0-9_-]+
```

Do not interpolate unsafe ids into URLs without `encodeURIComponent`.

Do not call `getProject` for obviously malformed ids.

Do not expose absolute filesystem paths, stack traces or provider internals in restore errors.

## Files To Inspect

Before changing code, inspect:

- `frontend/src/App.jsx`
- `frontend/src/api/projects.js`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/data/demoLesson.js`
- `frontend/src/data/createLesson.js`
- `frontend/src/utils/normalizeLesson.js`
- `frontend/src/utils/validateLessonShape.js`
- `server/src/routes/projects.js`
- `server/src/services/projectStore.js`
- `server/src/services/normalizeLesson.js`
- `server/src/services/validateLesson.js`
- `server/test/projectStore.test.js`
- `frontend/test/*`
- `docs/session-restoration-stage-*.md`
- `docs/session-restoration-stage-*-prompt.md`

Use existing project API helpers and state-management patterns.

## Implementation Steps

### 1. Audit Current Restoration State

Before editing:

1. Search for existing restore helpers:

```sh
rg "localStorage|sessionStorage|URLSearchParams|window\\.location|history\\.replaceState|restoreSavedProject|readLastProjectId|writeLastProjectId|clearLastProjectId|replaceUrlProjectId" frontend/src
```

2. Determine whether the app already:
   - reads URL project id on startup,
   - reads localStorage on startup,
   - loads the project list on startup,
   - writes last project id after active project changes,
   - clears invalid restore state,
   - surfaces restore errors.

3. If behavior already exists and tests pass, do not rewrite it. Add only missing tests/docs or targeted fixes.

### 2. Add Or Confirm Restore Helpers

In `frontend/src/App.jsx` or a small helper module if preferred, implement or verify helpers:

```js
const lastProjectStorageKey = "lessonSourceBuilder.lastProjectId";

function isLikelySafeProjectId(value) {}
function readLastProjectId() {}
function writeLastProjectId(projectId) {}
function clearLastProjectId() {}
function readUrlProjectId() {}
function replaceUrlProjectId(projectId) {}
```

If helpers already exist, verify they:

- handle unavailable localStorage gracefully,
- validate ids,
- clear malformed values,
- avoid throwing during render/startup,
- use `encodeURIComponent` for URLs,
- avoid adding duplicate history entries unnecessarily.

### 3. Add Or Confirm Startup Restore Effect

Startup restoration should run once after initial health check setup is safe.

Recommended behavior:

1. Load project list quietly or as part of restore flow.
2. Read URL project candidate.
3. If valid, try to restore it.
4. If no valid URL candidate, read localStorage candidate.
5. If valid, try to restore it.
6. If no candidate or restore fails gracefully, keep demo/default lesson.

Avoid infinite loops.

Avoid repeated restore attempts after each render.

Use a cancellation flag in `useEffect` to avoid state updates after unmount.

### 4. Implement Or Verify `restoreSavedProject`

Recommended helper:

```js
async function restoreSavedProject(projectId, source) {
  const loadedLesson = normalizeAndValidateLoadedLesson(await getProject(projectId));
  setLesson(loadedLesson);
  setActiveProjectIdAndRef(loadedLesson.id, { updateUrl: source === "url" });
  clearTransientInputs();
  resetMediaReadiness();
  setSaveStatus("saved");
  setLoadStatus("loaded");
}
```

Adapt to existing local patterns.

Important:

- If source is URL and load succeeds, also write localStorage.
- If source is localStorage and load succeeds, optionally update URL if current design does so.
- If source is localStorage and load fails with missing project, clear localStorage.
- If source is URL and load fails, do not overwrite localStorage with the bad URL id.
- On failure, load project list so the user can manually recover.

### 5. Track Restore Issues

Add a small restore issue state if missing:

```js
const [restoreIssue, setRestoreIssue] = useState(null);
```

It can contain:

```js
{
  source: "url" | "localStorage",
  projectId,
  message
}
```

Display it in a non-blocking notice near project controls or in the sidebar if consistent with existing UI.

Include actions only if easy and consistent:

- Dismiss.
- Clear saved project if it matches localStorage.
- Open project panel.

Do not create a modal that blocks normal use unless the existing design already uses project modals for this.

### 6. Update Active Project Writes

Ensure the last active project is recorded whenever a project becomes active:

- Successful restore.
- Manual open.
- Create fresh project.
- Save current unsaved lesson that creates a new project.
- Duplicate project.

Prefer centralizing this in `setActiveProjectIdAndRef(projectId, options)` if the function exists.

Do not write malformed ids.

### 7. Update URL On Explicit Project Changes

If URL support is in scope and existing docs/code support it, update the URL after:

- manual open,
- create fresh project,
- save current unsaved lesson into a new project,
- duplicate project,
- successful URL restore.

Use `history.replaceState`, not `pushState`, to avoid polluting browser history on internal saves.

Do not update URL during failed restore.

If URL support has intentionally been removed by current repo docs, skip this step and document why.

### 8. Preserve Unsaved Change Guards

Do not bypass existing unsaved-change prompts/guards for manual open/new/duplicate actions.

Startup restore is allowed to replace the initial demo/default lesson before user edits.

After the user has edited the current in-memory lesson, manual project switching should continue to ask for confirmation when appropriate.

### 9. Preserve Active Operation Guards

Do not allow manual new/open/duplicate actions during active operations:

- sentence operations,
- story generation/regeneration/lock/unlock,
- character extraction,
- appearance update,
- character image generation/approval,
- scene planning,
- scene image generation/approval.

If Phase D added appearance operation state, include it in project-action blocking.

### 10. Keep Backend Storage Unchanged

Do not redesign `projectStore`.

Backend persistence already stores projects on disk under `PROJECT_DATA_DIR` or the fallback project directory.

Only make backend changes if a direct bug prevents restoration from using existing project APIs.

### 11. Update Tests

Add or update frontend tests.

Recommended coverage:

1. Safe project id helper accepts valid `lesson-...` ids.
2. Safe project id helper rejects malformed ids.
3. `readLastProjectId` returns valid stored id.
4. `readLastProjectId` clears/ignores malformed stored id.
5. `writeLastProjectId` writes valid id.
6. `writeLastProjectId` ignores invalid id.
7. Startup restore uses URL project before localStorage.
8. Startup restore uses localStorage when URL project is absent.
9. Startup restore falls back gracefully when project is missing.
10. Missing localStorage project clears last-project id.
11. Manual open updates last-project id.
12. Save of an unsaved lesson that creates a project updates last-project id.
13. Create fresh project updates last-project id.
14. Duplicate project updates last-project id.
15. Project list loads on startup.
16. Restore errors are shown non-blockingly if component tests exist.

If current test infrastructure does not support component-level startup tests, extract pure restore helper functions and test them, then perform manual QA for UI behavior.

### 12. Manual Verification

Run the app locally if practical.

Verify:

1. Open app with no localStorage and no URL project:
   - App shows default/demo lesson.
   - Project list loads.
2. Save a lesson:
   - A project id appears as active.
   - localStorage stores the project id.
3. Refresh:
   - App restores the saved project, not the demo lesson.
4. Manually open a different project:
   - localStorage updates.
5. Refresh:
   - App restores the newly opened project.
6. Visit `?project=<valid-id>`:
   - URL project restores and wins over localStorage.
7. Visit `?project=bad/../../id`:
   - No unsafe API request is made.
   - App falls back gracefully.
8. Delete or rename a saved project folder, then refresh:
   - Invalid localStorage restore state is cleared.
   - App remains usable.
9. Make unsaved edits and refresh:
   - Unsaved edits are lost.
   - This behavior is honest and expected.

## Acceptance Criteria

Phase G is complete when:

- App startup can restore a valid saved project from URL if supported by current repo direction.
- App startup can restore the last saved/opened project from localStorage.
- URL restore takes precedence over localStorage when URL support is in scope.
- Project list loads on startup.
- Invalid localStorage values are ignored or cleared.
- Missing/deleted localStorage projects clear restore state and fall back gracefully.
- Malformed URL project ids do not trigger unsafe API calls.
- Restore failures are non-blocking and recoverable.
- Manual open/save/create/duplicate update last-project restore state.
- Existing unsaved-change guards still work.
- Existing active-operation guards still work.
- Backend project persistence remains unchanged.
- No autosave or cloud/account behavior is added.
- Tests or documented manual verification cover the restore flow.

## Suggested Verification Commands

Run focused frontend tests first:

```sh
npm test --workspace frontend
```

Run backend project tests if backend was touched:

```sh
npm test --workspace server -- projectStore.test.js
```

If file filters are unsupported:

```sh
npm test --workspace server
```

Build frontend:

```sh
npm run build --workspace frontend
```

Use `package.json` scripts as the source of truth for available commands.

## Review Search Commands

Use these during self-review:

```sh
rg "localStorage|sessionStorage|URLSearchParams|window\\.location|history\\.replaceState|restoreSavedProject|readLastProjectId|writeLastProjectId|clearLastProjectId|replaceUrlProjectId" frontend/src
rg "useState\\(demoLesson\\)|activeProjectId|setActiveProjectIdAndRef|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject" frontend/src/App.jsx
rg "autosave|auto-save|firebase|auth|login|account|cloud|remote storage" frontend server docs package.json
```

Expected result:

- Restore code exists only in frontend/project-session logic.
- No autosave/cloud/auth scope appears.
- Backend project store remains the source of saved project data.

## Handoff Summary Template

When finished, report:

- Files changed.
- Whether implementation was new or a remediation of existing session-restoration code.
- Restore priority actually implemented.
- localStorage key used.
- URL parameter behavior, or why URL support was skipped.
- How invalid restore state is cleared.
- How restore errors are shown.
- Which project actions update restore state.
- Which tests were added or updated.
- Which verification commands were run.
- Manual QA results, if performed.
- Follow-up work intentionally left out of Phase G.

Keep the final summary clear that Phase G implements session restoration for saved projects only. It does not implement autosave, unsaved draft recovery, accounts, cloud sync or exports.
