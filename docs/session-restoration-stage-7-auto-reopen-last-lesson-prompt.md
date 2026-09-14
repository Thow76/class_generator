# Session Restoration Stage 7 Auto-Reopen Last Lesson Prompt

Use this prompt to implement Stage 7 of the Lesson Source Builder session restoration work.

## Prompt

You are implementing Stage 7: Auto-Reopen Last Lesson.

Stages 3-6 added:

- localStorage last-project restoration.
- URL `?project=...` restoration and URL synchronization.
- A user-controlled way to clear invalid URL restore state.
- Automatic startup loading of the saved-project list.

Stage 7 should add one careful fallback: when there is no URL project request and no valid localStorage last-project pointer, automatically reopen the most recently updated saved lesson from the startup-loaded project list.

This stage should make returning to the app feel natural for users who have saved lessons on disk but do not yet have a browser pointer, for example after localStorage was cleared or the app is opened in a fresh browser profile against an existing local backend data directory.

Do not implement autosave, export generation, project deletion, auth, account sync, cloud sync, backend API changes, server-side sessions, or full lesson snapshots in browser storage.

## Stage 7 Goal

When the app starts with no explicit restore pointer:

```text
No ?project=... in the URL
No lessonSourceBuilder:lastProjectId in localStorage
Saved projects exist on the backend
```

the app should automatically reopen the most recently updated saved lesson by using the existing project list metadata to choose a candidate, then loading the full lesson through the existing `getProject(projectId)` API.

The project list is only a candidate source. The backend project read route remains the source of truth for the lesson payload.

## Restore Precedence

Stage 7 must preserve this precedence exactly:

1. Valid URL `project` candidate.
2. Malformed URL `project` candidate, handled as an explicit URL failure.
3. Valid localStorage `lessonSourceBuilder:lastProjectId`.
4. LocalStorage load failure, handled according to Stage 3.
5. No URL candidate and no localStorage candidate: auto-reopen the most recently updated saved project from the startup project list.
6. No restore candidate or auto-reopen failure: show the bundled demo lesson.

Important: URL intent is explicit. A failed or malformed URL restore must not fall through to localStorage or to the Stage 7 auto-reopen fallback.

Also important: a stale localStorage pointer is still a restore failure for that pointer. Stage 7 should not silently open a different project after a localStorage candidate fails unless the product owner explicitly changes that policy later.

## Required Behavior

Stage 7 is complete only if:

- When URL `project` is present and valid-looking, URL restore behavior from Stage 4 remains unchanged.
- When URL `project` is malformed, the app does not call the backend and does not auto-reopen a different lesson.
- When URL restore fails, the app does not auto-reopen a different lesson.
- When localStorage contains a valid-looking id, localStorage restore behavior from Stage 3 remains unchanged.
- When localStorage restore fails, the app clears the stale pointer and falls back according to existing Stage 3 behavior; it does not auto-reopen a different project in the same startup flow.
- When no URL project exists and no localStorage id exists, the app uses the saved-project list to choose the most recently updated saved project.
- Auto-reopen loads the selected lesson through `getProject(projectId)`, then normalizes and validates the loaded lesson before applying it.
- Auto-reopen success applies the same app state as manual open/localStorage restore.
- Auto-reopen success writes localStorage to the reopened project id.
- Auto-reopen success syncs the URL to `?project=<id>` through the existing Stage 4 URL sync behavior.
- Auto-reopen success clears restore issue state and project errors.
- Auto-reopen failure falls back to the demo lesson without clearing unrelated localStorage or mutating URL state.
- Auto-reopen failure shows at most a soft, safe, user-readable error such as `The most recent lesson could not be reopened.`
- Auto-reopen never stores full lesson JSON, media readiness, API responses, export data, or unsaved form state in browser storage.
- Startup project-list loading from Stage 6 remains list-specific and does not misuse full project `loadStatus`.
- Backend routes and project storage format remain unchanged.

## Candidate Selection Rules

Use the project list returned by the existing `listProjects()` API.

Candidate rules:

- Treat the first valid project in the list as the most recent candidate if the backend already sorts by `updatedAt` descending.
- If the frontend cannot trust order, sort a copy by `updatedAt` descending and do not mutate the stored project list array in place.
- Only select candidates whose `id` passes `isLikelySafeProjectId(id)`.
- Prefer candidates without a list metadata `error`.
- If the most recent valid candidate fails to load, do not automatically cascade through every other saved project in Stage 7. Fall back to demo with a soft error. This avoids surprising users by opening an arbitrary older lesson.
- If there are no valid candidates, show the demo lesson and do not surface an error.

Suggested helper:

```js
export function selectAutoReopenProject(projects) {
  // Return the best project metadata object or null.
}
```

This helper can live in a small frontend utility file if it improves testability, for example:

```text
frontend/src/utils/projectAutoReopen.js
```

## Source Context To Read First

Read these files before editing:

```text
docs/session-restoration-stage-2-restore-rules.md
docs/session-restoration-stage-4-review-prompt.md
docs/session-restoration-stage-5-review-prompt.md
docs/session-restoration-stage-6-startup-project-list-load-prompt.md
docs/session-restoration-stage-6-review-prompt.md
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
sed -n '150,285p' frontend/src/App.jsx
sed -n '390,420p' frontend/src/App.jsx
sed -n '1460,1515p' frontend/src/App.jsx
sed -n '1,90p' frontend/src/utils/projectSessionStorage.js
sed -n '1,180p' frontend/src/utils/projectSessionUrl.js
sed -n '1,80p' server/src/services/projectStore.js
rg -n "restoreStartupProject|restoreSavedProject|readLastProjectId|getProjectRestoreCandidateFromUrl|getProject\\(|listProjects|loadProjectList|projectListStatus|projectListError|setActiveProjectIdAndRef|restoreIssue|clearLastProjectId" frontend/src frontend/test
```

## Implementation Guidance

### 1. Avoid Racing The Stage 6 List Fetch

The app may already start a quiet project-list load in a separate startup effect. Stage 7 needs project list data for auto-reopen, so avoid two startup list calls racing each other in confusing ways.

Acceptable approaches:

- Have `loadProjectList()` return the fetched projects array on success, and call it from the startup restore flow only when the Stage 7 fallback is needed.
- Or create a small `fetchProjectListForAutoReopen()` helper that calls `listProjects()` directly, updates list state through the same race-safe mechanism, and returns the fetched projects.
- Or coordinate with the existing startup list request through a promise/ref if the code already has that structure.

Do not rely on React state immediately after `setProjectList(projects)` inside the same async function; use the returned `projects` value.

### 2. Update The Startup Restore Flow

Update `frontend/src/App.jsx` startup restoration.

Required flow:

1. Enter startup project restore loading state.
2. Check URL candidate first.
3. If URL candidate is valid, restore it and return.
4. If URL candidate is malformed, show the existing Stage 4/5 invalid URL state and return.
5. Read localStorage last project id.
6. If localStorage id exists, restore it and return.
7. If localStorage id does not exist, load or await the saved-project list.
8. Select the auto-reopen candidate from the list.
9. If a candidate exists, restore it through `getProject(candidate.id)` with source `"autoReopen"` or equivalent.
10. If there is no candidate, finish startup on the demo lesson.
11. Ensure every path exits loading state unless cancelled/unmounted.

Pseudo-shape:

```js
const projectId = readLastProjectId();
if (projectId) {
  await restoreSavedProject(projectId, "localStorage");
  return;
}

const projects = await loadProjectList({ quiet: true });
if (cancelled) return;

const autoCandidate = selectAutoReopenProject(projects);
if (autoCandidate) {
  await restoreSavedProject(autoCandidate.id, "autoReopen");
  return;
}

setLoadStatus("idle");
```

Adapt to the real code.

### 3. Add An Auto-Reopen Source

If `restoreSavedProject(projectId, source)` exists, support a new source such as:

```text
autoReopen
```

Success behavior should match other successful restores:

- Normalize and validate the loaded lesson.
- Set `lesson`.
- Set `activeProjectId` and `activeProjectIdRef`.
- Set `saveStatus` to `saved`.
- Clear `restoreIssue`.
- Clear `projectError`.
- Clear transient input state.
- Reset media readiness.
- Set load status to the normal loaded state.
- Write localStorage to the restored project id.
- Sync the URL to `?project=<id>` using existing Stage 4 behavior.
- Refresh the project list quietly when practical.

Failure behavior should be softer than URL failure:

- Do not clear unrelated localStorage.
- Do not mutate the URL.
- Fall back to demo/no active project.
- Set save status to `unsaved`.
- Clear transient input state.
- Reset media readiness.
- Set load status to `idle` or the app's non-loading fallback state.
- Show a safe soft error, or no error if the product chooses silent demo fallback. If showing one, prefer:

```text
The most recent lesson could not be reopened.
```

- Do not expose stack traces, absolute paths, temp paths, or raw internals.

### 4. Keep Explicit Failures Explicit

Do not let Stage 7 weaken previous failure semantics.

Do not auto-reopen a project when:

- URL `project` is malformed.
- URL `project` is valid-looking but fails to load.
- Stage 5 restore issue is present from a failed URL request.
- localStorage contained a valid-looking id but that project failed to load during the current startup attempt.

In those cases, preserve the already defined fallback/error behavior.

### 5. Preserve Stage 6 List UX

Stage 7 may need to call `loadProjectList()` during startup restore. That must not regress Stage 6:

- Project-list status remains separate from full project `loadStatus`.
- List loading errors remain list-specific.
- The Open panel still distinguishes loading, empty, error, and loaded states.
- Stale list responses cannot overwrite newer list results.
- The saved-project list continues to refresh after successful create/save/open/duplicate/restore operations.

### 6. Keep Scope Tight

Do not change:

- Backend project routes.
- Backend project storage layout.
- Backend project id generation.
- Lesson schema.
- Autosave behavior.
- Export behavior.
- Auth/account/cloud behavior.
- Browser storage payload shape.

## Test Requirements

Prefer pure helper tests where practical.

If adding `selectAutoReopenProject(projects)`, create:

```text
frontend/test/projectAutoReopen.test.js
```

Cover:

- Empty list returns `null`.
- Missing/non-array input returns `null`.
- Chooses the first valid safe project id from an already sorted list.
- Skips invalid or unsafe project ids.
- Skips candidates with metadata `error` when a later safe candidate exists.
- Does not mutate the original list.
- If sorting is implemented in the helper, sorts by `updatedAt` descending safely.
- Handles missing or invalid `updatedAt` values predictably.

If extracting startup restore decision logic is feasible, add focused tests for:

- URL candidate prevents auto-reopen fallback.
- Malformed URL candidate prevents auto-reopen fallback.
- localStorage candidate prevents auto-reopen fallback.
- localStorage failure does not cascade to auto-reopen in the same startup flow.
- No URL/no localStorage with list candidate chooses auto-reopen.
- Auto-reopen success writes localStorage and syncs URL through the existing active-project setter.

If app-level restore flow remains difficult to test with the current Node-only setup, state that as residual risk in the final response and cover it in manual QA.

## Manual QA Checklist

Run the app:

```sh
npm run dev
```

Then verify:

1. Clear localStorage.
2. Open the app with no `?project` URL.
3. Confirm the saved-project list loads on startup.
4. Confirm the most recently updated saved lesson auto-reopens.
5. Confirm the lesson is marked saved, with the active project id shown.
6. Confirm localStorage now contains `lessonSourceBuilder:lastProjectId` with that id.
7. Confirm the URL syncs to `?project=<id>`.
8. Refresh and confirm the URL restore path still works.
9. Clear the URL project param but leave localStorage intact.
10. Refresh and confirm localStorage restore wins over project-list auto-reopen.
11. Open with `/?project=<different-valid-id>` and confirm URL restore wins over localStorage and auto-reopen.
12. Open with `/?project=../bad` and confirm the app does not auto-reopen any other lesson.
13. Open with `/?project=lesson-valid-shape-but-missing` and confirm the app does not auto-reopen any other lesson.
14. Set localStorage to a valid-looking missing id and remove URL project.
15. Refresh and confirm localStorage failure behavior remains the Stage 3 behavior, without auto-reopening a different lesson.
16. Clear localStorage and temporarily make the most recent listed project fail to load if practical.
17. Confirm auto-reopen failure falls back to demo and does not mutate URL/localStorage.
18. Confirm Open panel list states from Stage 6 still work.
19. Confirm Stage 5 clear invalid restore request still works.

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
rg -n "autoReopen|selectAutoReopen|projectAutoReopen|restoreSavedProject|restoreStartupProject|readLastProjectId|getProjectRestoreCandidateFromUrl|loadProjectList|listProjects|getProject\\(" frontend/src frontend/test
rg -n "lessonSourceBuilder:lastProjectId|localStorage\\.setItem|JSON\\.stringify\\(lesson|setItem\\([^,]+,\\s*JSON|history\\.replaceState|history\\.pushState" frontend/src frontend/test
rg -n "router\\.get\\(\"/\"|listProjects\\(|readProjectMetadata|projectsDir" server/src server/test
```

Expected results:

- Auto-reopen source/selection behavior is visible and tested where practical.
- Explicit URL/localStorage restore paths remain present.
- localStorage writes remain pointer-only.
- URL sync still uses `replaceState`, not `pushState`.
- Backend list/read routes are unchanged unless explicitly justified.

## Acceptance Criteria

Stage 7 is acceptable when:

- With no URL project and no localStorage pointer, the app auto-reopens the most recently updated saved lesson.
- Auto-reopen uses project-list metadata only to choose a candidate and `getProject()` to load the actual lesson.
- URL restore still has top priority.
- URL failures do not fall through to auto-reopen.
- localStorage restore still has priority over auto-reopen.
- localStorage failure does not silently open a different lesson in the same startup flow.
- Auto-reopen success sets app state like manual open and persists/syncs the active project id.
- Auto-reopen failure falls back safely to demo.
- Stages 3-6 behavior remains intact.
- Automated verification passes.
- Backend/API/storage scope is unchanged.

## Final Response For The Implementer

In your final response, include:

- A brief summary of what changed.
- Files changed.
- Automated verification results.
- Whether manual browser QA was run.
- Any residual risk, especially if startup restore fallback behavior lacks app-level automated coverage.
