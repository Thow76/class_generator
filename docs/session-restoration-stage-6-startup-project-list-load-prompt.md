# Session Restoration Stage 6 Startup Project List Load Prompt

Use this prompt to implement Stage 6 of the Lesson Source Builder session restoration work.

## Prompt

You are implementing Stage 6: Startup Project List Load.

Stages 3-5 made the app remember and restore the active saved project through localStorage and URL state. Stage 6 should make the saved-project list available automatically on startup so the Open panel is ready without requiring the user to click Open/Refresh first.

This stage is about loading saved-project metadata for the sidebar/list UI. It must not change the source of truth for restored lesson content.

Do not implement autosave, export generation, project deletion, auth, account sync, cloud sync, backend API changes, server-side sessions, or full lesson snapshots in browser storage.

## Stage 6 Goal

When the app starts, it should fetch the saved-project list from the existing backend `GET /api/projects` endpoint and keep the sidebar's saved lesson list current.

The startup project-list fetch must:

- Run automatically on app startup.
- Not block URL/localStorage project restoration.
- Not replace direct `getProject(projectId)` restore behavior.
- Not show the editable demo as active while restoration is still pending.
- Not use the global project load state in a way that disables the whole editor just because metadata is refreshing.
- Keep the Open panel useful immediately after startup.
- Handle project-list failures softly.
- Continue to refresh the list after successful create/save/open/duplicate/restore operations.

## Current Context

The frontend API wrapper already exposes:

```text
frontend/src/api/projects.js
listProjects() -> GET /api/projects
```

The backend route already exposes:

```text
server/src/routes/projects.js
GET /api/projects
```

The backend project store already lists safe project folders, returns project metadata, sorts by `updatedAt`, and tolerates unreadable metadata by returning an "Unreadable lesson" entry:

```text
server/src/services/projectStore.js
listProjects()
```

Stage 6 should normally be frontend-only unless inspection reveals a genuine backend bug.

## Required Behavior

Stage 6 is complete only if:

- The app requests the saved-project list automatically on startup.
- Startup project-list loading is independent from startup project restoration.
- URL restore still takes precedence over localStorage.
- URL/localStorage restore still calls `getProject(projectId)` directly and does not wait for `listProjects()`.
- A failed list request does not prevent URL/localStorage restore.
- A failed list request does not force the app into the demo lesson if restore otherwise succeeded.
- A failed list request does not clear localStorage or mutate the URL.
- A failed list request is surfaced as a list/panel refresh problem, not as a restore failure.
- The app does not show "No saved lessons yet" while the initial project-list request is still pending.
- The Open panel can show a loading state while project metadata is being fetched.
- The Open panel can show a list-specific error with a retry/refresh path if list loading fails.
- Refreshing the saved-project list does not disable stage editing or project actions unrelated to list loading.
- Opening a project, creating a project, saving a project, duplicating a project, and successful startup restore still refresh the project list when practical.
- Repeated project-list requests do not race in a way that lets an older response overwrite a newer one.
- Existing Stage 5 clear-invalid-restore behavior remains intact.
- localStorage still stores only the last active project id pointer.
- No backend API or storage format changes are introduced.

## Source Context To Read First

Read these files before editing:

```text
docs/session-restoration-stage-2-restore-rules.md
docs/session-restoration-stage-4-review-prompt.md
docs/session-restoration-stage-5-clear-invalid-restore-state-prompt.md
docs/session-restoration-stage-5-review-prompt.md
frontend/src/App.jsx
frontend/src/components/Sidebar.jsx
frontend/src/api/projects.js
frontend/src/utils/projectSessionStorage.js
frontend/src/utils/projectSessionUrl.js
frontend/test/projectSessionStorage.test.js
frontend/test/projectSessionUrl.test.js
server/src/routes/projects.js
server/src/services/projectStore.js
server/test/projectStore.test.js
package.json
frontend/package.json
server/package.json
```

If equivalent code has moved, inspect the moved files instead.

## Commands To Run Before Editing

Use these commands to ground the implementation:

```sh
git status --short
sed -n '150,270p' frontend/src/App.jsx
sed -n '330,410p' frontend/src/App.jsx
sed -n '1200,1245p' frontend/src/App.jsx
sed -n '1440,1475p' frontend/src/App.jsx
sed -n '150,215p' frontend/src/components/Sidebar.jsx
sed -n '1,90p' frontend/src/api/projects.js
sed -n '1,70p' server/src/services/projectStore.js
rg -n "projectList|setProjectList|loadProjectList|listProjects|projectError|loadStatus|isOpenProjectPanelVisible|onRefreshProjects|restoreIssue" frontend/src frontend/test
```

## Implementation Guidance

### 1. Separate Project-List State From Project Load State

The existing app may use `loadStatus` for many different operations: startup restore, opening projects, duplicating projects, and list refresh. Stage 6 should avoid treating a project-list metadata fetch as a full project load.

Add dedicated list state in `frontend/src/App.jsx`, for example:

```js
const [projectListStatus, setProjectListStatus] = useState("idle");
const [projectListError, setProjectListError] = useState("");
const projectListRequestIdRef = useRef(0);
```

Use equivalent names if they fit the codebase better.

Expected states:

```text
idle
loading
loaded
error
```

Rules:

- `loadStatus === "loading"` should continue to mean a full project/restore load that blocks project and stage mutation actions.
- `projectListStatus === "loading"` should mean only saved-project metadata is refreshing.
- A list refresh should not set `loadStatus` to `loading`.
- A list refresh should not set global `projectError` unless the existing UI has no list-specific error path and the UX remains clear.
- Prefer a list-specific `projectListError` shown inside the saved lessons panel.

### 2. Load The Project List On Startup

Add a startup effect that calls `loadProjectList({ quiet: true })` or a renamed equivalent.

Rules:

- The startup list effect may run in parallel with URL/localStorage restore.
- The startup list effect must not decide which project to restore.
- The startup list effect must not block `getProject(projectId)` restore.
- The startup list effect must have a cancellation/unmount guard.
- The startup list effect should not overwrite restore errors.
- The startup list effect should not clear `restoreIssue`.
- The startup list effect should not write localStorage or mutate the URL.

Recommended shape:

```js
useEffect(() => {
  let cancelled = false;

  loadProjectList({ quiet: true, cancelled: () => cancelled });

  return () => {
    cancelled = true;
  };
}, []);
```

Adjust to the actual helper shape. If passing a cancellation function feels awkward, use a request id ref or local cancellation inside a new startup helper.

### 3. Make Project-List Refresh Race-Safe

Project-list loading can be triggered by startup, Open panel, Refresh, create/save/open/duplicate, and restore flows. Avoid stale responses overwriting newer results.

Recommended approach:

```js
async function loadProjectList(options = {}) {
  const requestId = projectListRequestIdRef.current + 1;
  projectListRequestIdRef.current = requestId;

  setProjectListStatus("loading");
  if (!options.quiet) setProjectListError("");

  try {
    const projects = await listProjects();
    if (projectListRequestIdRef.current !== requestId) return;
    setProjectList(projects);
    setProjectListStatus("loaded");
    setProjectListError("");
  } catch (error) {
    if (projectListRequestIdRef.current !== requestId) return;
    setProjectListStatus("error");
    setProjectListError(error.message);
    if (!options.quiet && options.surfaceGlobalError) {
      setProjectError(error.message);
    }
  }
}
```

Use a simpler but equivalent implementation if it is safe and readable.

Important:

- A quiet startup/list refresh failure should not erase an existing useful project list unless the implementation intentionally chooses to mark the stale list as stale.
- If there is already a list displayed and refresh fails, keep the existing list visible where practical and show the list error.
- Manual Refresh should show a visible list-specific error on failure.
- The Refresh button should be disabled while `projectListStatus === "loading"`, not while a full project restore/open is loading unless the app-wide loading guard also applies.

### 4. Update Sidebar Project List UX

Update `frontend/src/components/Sidebar.jsx` or equivalent to consume the new list state.

Recommended project controls:

```js
projectList
projectListStatus
projectListError
onRefreshProjects
```

UI expectations:

- While the list is loading and the Open panel is visible, show a concise loading row such as:

```text
Loading saved lessons...
```

- Do not show `No saved lessons yet.` until the list has successfully loaded and is empty.
- If loading fails, show a list-specific error near the saved lessons list.
- Keep a Refresh button available after failure.
- Disable Refresh while the list itself is loading.
- Continue to disable opening individual projects while full project loading or project-operation guards are active.
- Do not show a list-loading status as a global project loading state that blocks the whole workflow.

### 5. Preserve Existing Restore And Recovery Semantics

Do not regress previous stages:

- URL project restore takes precedence over localStorage.
- URL restore failure does not fall back to localStorage.
- Malformed URL restore does not call the backend.
- Failed/malformed URL restore remains visible until the user clears it or opens/saves another valid project.
- Stage 5 clear request removes URL `project` without clearing unrelated localStorage.
- localStorage restore still works when no URL project exists.
- localStorage stale/malformed values are cleared according to Stage 3.
- Startup restore still blocks project/stage mutation while restore is actually loading.
- A list request failure does not count as restore failure.

### 6. Keep Existing Refresh Points

The project list should remain current after successful project transitions.

Ensure list refresh still happens after:

- Startup, regardless of whether restore succeeds or falls back.
- Successful URL restore.
- Successful localStorage restore.
- Successful create.
- Successful save.
- Successful open.
- Successful duplicate.
- Successful server-applied project update, if the existing code refreshes after those operations.
- Manual Refresh in the Open panel.

Avoid duplicate noisy global loading changes if multiple flows call `loadProjectList({ quiet: true })`.

## Test Requirements

The current frontend test setup uses Node's built-in test runner. Do not add large test dependencies just for this stage.

If you extract project-list state transitions into a pure helper, add a focused test file such as:

```text
frontend/test/projectListLoading.test.js
```

Cover:

- Startup list load entering `loading` state without changing full project `loadStatus`.
- Successful list load sets projects and `loaded`.
- Failed quiet list load records list error without overwriting restore/project errors.
- Manual refresh failure can surface a list-specific error.
- Stale older list responses do not overwrite newer responses.
- Empty loaded list is distinguishable from "still loading".

If the implementation remains inside React component state and no suitable pure helper exists, document the app-level residual risk in the final response and rely on manual QA plus existing automated tests.

Do not add backend tests unless backend list behavior changes, which should not normally be necessary.

## Manual QA Checklist

Run the app:

```sh
npm run dev
```

Then verify:

1. Open the app with no URL project.
2. Confirm the app automatically calls `GET /api/projects` on startup.
3. Open the saved lessons panel immediately after startup.
4. Confirm it shows a loading state while the list request is pending, not `No saved lessons yet.`.
5. Confirm saved lessons appear without pressing Refresh once the request completes.
6. Confirm creating a project updates the saved lessons list.
7. Confirm saving a new unsaved lesson updates the saved lessons list.
8. Confirm opening a project updates/retains the saved lessons list.
9. Confirm duplicating a project adds the duplicate to the list.
10. Open with `/?project=<valid-existing-id>` and confirm direct URL restore works even if the list request is still pending.
11. Open with localStorage pointing to a valid project and no URL project; confirm direct localStorage restore works even if list request is still pending.
12. Simulate or observe a failed project-list request.
13. Confirm the restore result remains intact after list failure.
14. Confirm a list-specific error appears in or near the saved lessons panel.
15. Confirm Refresh can retry the list after failure.
16. Confirm list refresh does not disable stage editing when no full project load is happening.
17. Confirm project open actions remain guarded while a full project load is happening.
18. Confirm Stage 5 clear invalid restore behavior still works.

If manual QA is not run, state that explicitly in the final response.

## Verification Commands

Run:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Also run targeted checks:

```sh
rg -n "projectListStatus|projectListError|projectListRequest|loadProjectList|listProjects|onRefreshProjects|Loading saved lessons|No saved lessons yet" frontend/src frontend/test
rg -n "loadStatus\\(\"loading\"|setLoadStatus\\(\"loading\"|setProjectError\\(|setRestoreIssue\\(|clearLastProjectId|replaceUrlProjectId|clearUrlProjectId" frontend/src/App.jsx frontend/src/components/Sidebar.jsx
rg -n "GET /api/projects|router\\.get\\(\"/\"|listProjects\\(" server/src frontend/src
```

Expected results:

- Dedicated project-list loading/error state or an equivalent separation exists.
- `loadProjectList()` no longer uses full project `loadStatus` for metadata refreshes.
- Sidebar distinguishes loading, empty, loaded, and failed list states.
- Restore/URL/localStorage helpers remain present.
- Backend list route is unchanged unless a real bug was found and tested.

## Acceptance Criteria

Stage 6 is acceptable when:

- The saved-project list loads automatically on startup.
- Startup list loading does not block or alter URL/localStorage restore.
- Startup list loading does not globally disable unrelated editor/project actions after restore has finished.
- The Open panel has correct loading, empty, error, retry, and loaded states.
- Project-list refreshes are race-safe enough that stale responses do not overwrite newer list data.
- Project-list failures are soft and list-specific.
- Successful project operations still refresh the list.
- Stage 3, Stage 4, and Stage 5 restoration behavior remains intact.
- Automated verification passes.
- Backend storage/API scope is unchanged unless explicitly justified.

## Final Response For The Implementer

In your final response, include:

- A brief summary of what changed.
- Files changed.
- Automated verification results.
- Whether manual browser QA was run.
- Any residual risk, especially if app-level list loading behavior lacks automated coverage.
