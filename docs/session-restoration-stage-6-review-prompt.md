# Session Restoration Stage 6 Review Prompt

Use this prompt to review whether Stage 6, Startup Project List Load, was implemented correctly.

## Prompt

You are reviewing Stage 6 of the Lesson Source Builder session restoration work.

Stage 6 was intended to automatically load the saved-project list on startup, while preserving Stages 3-5 session restoration behavior. Review Stage 6 only. Do not implement fixes unless explicitly asked afterward.

The Stage 6 contract is:

- The saved-project list is fetched automatically on startup from the existing `GET /api/projects` endpoint.
- Project-list loading is independent from URL/localStorage project restoration.
- Project-list loading does not replace direct `getProject(projectId)` restore behavior.
- Project-list refresh has its own loading/error state and does not misuse full project `loadStatus`.
- Project-list failures are soft, list-specific, and do not clear restore state, localStorage, or URL state.
- The Open panel distinguishes loading, empty, failed, and loaded list states.
- Repeated list requests are race-safe enough that stale responses do not overwrite newer list data.
- Stages 3, 4, and 5 restore behavior remains intact.
- Backend API/storage scope remains unchanged unless a genuine backend bug was found and tested.

## Expected Files

Inspect these files at minimum:

```text
docs/session-restoration-stage-6-startup-project-list-load-prompt.md
docs/session-restoration-stage-5-review-prompt.md
docs/session-restoration-stage-4-review-prompt.md
docs/session-restoration-stage-2-restore-rules.md
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

If the implementation uses different file names, inspect the equivalent files.

## Required Behavior To Verify

Stage 6 passes only if:

- The app calls `listProjects()` automatically on startup.
- Startup list loading can run in parallel with URL/localStorage restore.
- Startup list loading does not decide which project to restore.
- Startup list loading does not block direct `getProject(projectId)` restore.
- Startup list loading has cancellation/unmount or stale-response protection.
- Project-list refresh does not set full project `loadStatus` to `loading`.
- Project-list refresh does not globally disable the editor after restoration has completed.
- Project-list refresh does not overwrite existing `projectError`/`restoreIssue` from URL restore failure.
- Project-list failure does not clear localStorage.
- Project-list failure does not mutate URL state.
- Project-list failure does not reset the lesson to demo if restore succeeded.
- Project-list failure is surfaced as a list/panel problem, not as a restore failure.
- The Open panel shows a loading state while the list request is pending.
- The Open panel does not show `No saved lessons yet.` while the list request is pending.
- The Open panel can show a list-specific error after list failure.
- The Open panel keeps a Refresh path available after list failure.
- Manual Refresh uses the same list-state path and remains retryable.
- Existing list data is kept visible where practical if a later refresh fails.
- Older list responses cannot overwrite newer list responses.
- Successful create, save, open, duplicate, URL restore, localStorage restore, and server-applied project updates refresh the list when practical.
- URL restore still takes precedence over localStorage.
- URL restore failure still does not fall back to localStorage.
- Malformed URL restore still does not call the backend.
- Stage 5 clear-invalid-restore behavior still works.
- localStorage still stores only `lessonSourceBuilder:lastProjectId`.
- Backend project routes/storage format are unchanged unless explicitly justified and tested.

## App Integration Review Checks

Review `frontend/src/App.jsx` or equivalent.

Confirm:

1. Dedicated project-list state exists, such as `projectListStatus` and `projectListError`, or an equivalent separation.
2. Full project `loadStatus` remains reserved for startup restore/open/create/save/duplicate style project operations.
3. `loadProjectList()` no longer sets full project `loadStatus` just to refresh metadata.
4. `loadProjectList()` updates list-specific loading and error state.
5. `loadProjectList()` calls `listProjects()` from the existing frontend API wrapper.
6. There is a startup effect or equivalent that triggers `loadProjectList({ quiet: true })`.
7. The startup list effect does not write localStorage.
8. The startup list effect does not call URL sync/clear helpers.
9. The startup list effect does not clear `restoreIssue`.
10. The startup list effect does not clear unrelated `projectError` from restore failures.
11. List requests use a request id, cancellation flag, abort signal, or equivalent stale-response guard.
12. Unmount protection prevents state updates after unmount.
13. Manual refresh clears or updates list-specific errors appropriately.
14. Manual refresh failure surfaces a list-specific error.
15. Quiet startup refresh failure is soft and does not become a global restore failure.
16. Successful project operations still refresh the list.
17. Direct URL/localStorage restore still calls `getProject(projectId)` rather than depending on list metadata.
18. Existing Stage 5 `restoreIssue` clear action remains wired.

## Sidebar/UI Review Checks

Review `frontend/src/components/Sidebar.jsx` or equivalent.

Confirm:

1. `projectListStatus` or equivalent is passed into the sidebar.
2. `projectListError` or equivalent is passed into the sidebar.
3. The Open panel shows `Loading saved lessons...` or equivalent while the list is loading.
4. The Open panel does not show `No saved lessons yet.` while loading.
5. The Open panel shows `No saved lessons yet.` only after a successful empty list load.
6. The Open panel shows list-specific errors near the saved lessons list.
7. The Refresh button is disabled while the list itself is loading.
8. Refresh is available again after list failure.
9. Opening individual projects remains guarded by full project load/project operation state.
10. List loading alone does not disable unrelated stage editing once restore is complete.
11. The UI does not expose raw stack traces, absolute paths, temp paths, or internal exception details.

## Backend Scope Review Checks

Review backend files only to confirm scope unless the implementation changed them.

Confirm:

- `GET /api/projects` still returns `{ projects: [...] }`.
- `listProjects()` still reads metadata only and does not load full lessons unnecessarily.
- Backend list sorting and unreadable metadata behavior remain intact.
- No backend session, active-project, autosave, auth, cloud, or export behavior was introduced.
- No backend project folders or files are deleted by list loading.

## Test Review Checks

Review any new or changed frontend tests.

If a pure helper was extracted, confirm tests cover:

- Startup list load enters list `loading` state without changing full project `loadStatus`.
- Successful list load stores projects and sets list status to `loaded`.
- Failed quiet list load records list error without overwriting restore/project errors.
- Manual refresh failure surfaces a list-specific error.
- Empty loaded list is distinct from pending loading state.
- Stale older list responses cannot overwrite newer responses.

If no app-level automated test coverage exists for startup list loading, note that as residual risk and lean on manual QA.

Do not require new backend tests if backend code was not changed.

## Failure Cases To Probe

Open findings for any of these:

- Startup project-list loading blocks URL/localStorage restore.
- Startup restore waits for `listProjects()` before calling `getProject(projectId)`.
- `loadProjectList()` sets global `loadStatus` to `loading` for metadata refresh.
- A list failure resets the lesson to demo or clears an active restored project.
- A list failure clears `lessonSourceBuilder:lastProjectId`.
- A list failure mutates `?project=` in the URL.
- A list failure overwrites a URL restore error or Stage 5 restore issue.
- The Open panel shows `No saved lessons yet.` while the list is still loading.
- Refresh remains disabled after list failure.
- An older slower list response can overwrite a newer list result.
- Stage 5 clear invalid restore no longer works.
- Stage 4 URL restore precedence regresses.
- Stage 3 localStorage restoration regresses.
- Browser storage now contains full lesson JSON or other rich payloads.
- Backend project API/storage scope changed unnecessarily.

## Commands To Run

Start with source inspection:

```sh
git status --short
sed -n '1,385p' docs/session-restoration-stage-6-startup-project-list-load-prompt.md
sed -n '130,205p' frontend/src/App.jsx
sed -n '390,420p' frontend/src/App.jsx
sed -n '1200,1260p' frontend/src/App.jsx
sed -n '1460,1510p' frontend/src/App.jsx
sed -n '170,210p' frontend/src/components/Sidebar.jsx
sed -n '1,90p' frontend/src/api/projects.js
sed -n '1,80p' server/src/services/projectStore.js
```

Inspect symbols and scope:

```sh
rg -n "projectListStatus|projectListError|projectListRequest|isCurrentProjectListRequest|loadProjectList|listProjects|onRefreshProjects|Loading saved lessons|No saved lessons yet" frontend/src frontend/test
rg -n "setLoadStatus\\(\"loading\"|setProjectError\\(|setRestoreIssue\\(|clearLastProjectId|writeLastProjectId|replaceUrlProjectId|clearUrlProjectId|getProjectRestoreCandidateFromUrl|getProject\\(" frontend/src/App.jsx frontend/src/components/Sidebar.jsx frontend/test
rg -n "JSON\\.stringify\\(lesson|JSON\\.stringify\\(.*lesson|localStorage\\.setItem|setItem\\([^,]+,\\s*JSON|IndexedDB|indexedDB|firebase|auth|login|account|cloud|session" frontend/src frontend/test server/src package.json frontend/package.json server/package.json
rg -n "router\\.get\\(\"/\"|listProjects\\(|readProjectMetadata|ProjectStoreError|projectsDir" server/src server/test
```

Run verification:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If any command cannot run, state exactly why.

## Manual QA Checklist

Manual browser QA is strongly recommended because Stage 6 is startup/network/UI behavior.

Run:

```sh
npm run dev
```

Then verify:

1. Open the app with no URL project.
2. Confirm `GET /api/projects` runs automatically on startup.
3. Open the saved lessons panel immediately after startup.
4. Confirm the panel shows a loading state while the list request is pending.
5. Confirm the panel does not show `No saved lessons yet.` while loading.
6. Confirm saved lessons appear without pressing Refresh once the request completes.
7. Confirm an actually empty loaded list shows `No saved lessons yet.`.
8. Create a project and confirm the saved lessons list updates.
9. Save a new unsaved lesson and confirm the saved lessons list updates.
10. Open a project and confirm the saved lessons list remains current.
11. Duplicate a project and confirm the duplicate appears in the list.
12. Open `/?project=<valid-existing-id>` and confirm direct URL restore works even if the list request is pending.
13. Start with localStorage pointing to a valid project and no URL project; confirm direct localStorage restore works even if the list request is pending.
14. Simulate a failed list request, for example by stopping the backend after the app has loaded.
15. Confirm the active/restored lesson remains intact after list failure.
16. Confirm a list-specific error appears in or near the saved lessons panel.
17. Confirm Refresh can retry after failure.
18. Confirm list refresh does not disable stage editing when no full project load is happening.
19. Confirm project open actions remain guarded while a full project load is happening.
20. Confirm Stage 5 clear invalid restore behavior still works for `/?project=../bad`.

If manual QA is not run, state that explicitly.

## Report Format

Return findings first, ordered by severity:

```text
**Findings**

- [P1] [file (line N)](...): Description of the bug, why it violates Stage 6, and the likely user impact.
- [P2] ...
```

Then include:

```text
**Checks**

- Startup list loading:
- List/restore independence:
- Sidebar list UX:
- Race/stale response handling:
- Stage 3/4/5 regression scope:
- Backend/storage scope:

**Verification**

- `npm run test --workspace frontend`: passed/failed/not run
- `npm run test --workspace server`: passed/failed/not run
- `npm run build --workspace frontend`: passed/failed/not run
- Manual browser QA: run/not run, with notes
```

If there are no findings, say that clearly and mention residual manual-QA or app-level test gaps.
