# Session Restoration Stage 5 Clear Invalid Restore State Prompt

Use this prompt to implement Stage 5 of the Lesson Source Builder session restoration work.

## Prompt

You are implementing Stage 5: Clear Invalid Restore State.

Stages 3 and 4 added automatic restoration from:

```text
lessonSourceBuilder:lastProjectId
/?project=lesson-...
```

Stage 4 deliberately leaves a failed or malformed URL restore visible in the address bar so explicit URL intent is not silently hidden. Stage 5 should add a safe recovery path after that failure has been surfaced: users need a clear way to dismiss an invalid restore request and stop the app from repeatedly trying the same bad URL or stale pointer on refresh.

Do not implement autosave, export generation, project deletion, auth, account sync, cloud sync, backend API changes, server-side sessions, or full lesson snapshots in browser storage.

## Stage 5 Goal

When startup restoration fails because the URL project is malformed, missing, deleted, unreadable, or otherwise invalid, the app should:

- Show the failure clearly, as Stage 4 requires.
- Keep the bad URL visible initially, as Stage 4 requires.
- Offer an explicit user-controlled way to clear the failed restore request.
- Remove only the restore pointer, not any backend project data.
- Preserve unrelated URL query parameters and hash fragments.
- Leave the app usable on the demo lesson after clearing.
- Prevent the same invalid URL/localStorage pointer from causing repeated restore failures after the user has chosen to clear it.

This is a recovery and hardening stage, not a new persistence source.

## Definitions

Invalid restore state means any frontend restore pointer that cannot or should not be used:

- A malformed URL `project` value, for example `?project=../bad`.
- A valid-looking URL `project` value that fails to load, for example a deleted project id.
- A malformed localStorage value.
- A stale localStorage value that points to a deleted/unreadable/invalid project.

Backend project data under `server/data/projects/...` is not invalid restore state. Do not delete backend project folders or lesson files in this stage.

## Required Behavior

Stage 5 is complete only if:

- Stage 4 URL precedence remains intact.
- Failed or malformed URL restore still leaves the failed URL visible immediately after startup failure.
- The user sees an actionable recovery control after URL restore failure or malformed URL restore.
- Activating the recovery control removes only the `project` query parameter from the current URL.
- Clearing the URL preserves unrelated query parameters where practical.
- Clearing the URL preserves the hash fragment where practical.
- Clearing the URL uses `history.replaceState`, not `history.pushState`.
- Clearing the URL does not reload the page.
- Clearing a URL restore failure also clears localStorage only when localStorage contains the same failed project id.
- Clearing a malformed URL restore does not clear an unrelated valid localStorage id.
- Malformed localStorage values continue to be cleared automatically by the storage helper.
- Failed localStorage restore continues to clear `lessonSourceBuilder:lastProjectId` and fall back softly to the demo lesson.
- After clearing a URL restore issue, the app remains on the demo lesson with no active project id and `saveStatus` set to `unsaved`.
- After clearing a URL restore issue, the user can create, save, open, or duplicate projects normally.
- After clearing a URL restore issue, refreshing the page does not retry the same removed URL project id.
- Successful create/save/open/duplicate/restore behavior from Stage 4 still writes localStorage and syncs the URL to the active project id.
- localStorage still stores only the project id pointer.
- No backend API or storage format changes are introduced.

## Source Context To Read First

Read these files before editing:

```text
docs/session-restoration-stage-2-restore-rules.md
docs/session-restoration-stage-3-review-prompt.md
docs/session-restoration-stage-4-implementation-prompt.md
docs/session-restoration-stage-4-review-prompt.md
frontend/src/App.jsx
frontend/src/components/Sidebar.jsx
frontend/src/utils/projectSessionStorage.js
frontend/src/utils/projectSessionUrl.js
frontend/test/projectSessionStorage.test.js
frontend/test/projectSessionUrl.test.js
frontend/src/api/projects.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
server/src/services/projectStore.js
server/src/routes/projects.js
```

If the code has moved, inspect the equivalent files.

## Commands To Run Before Editing

Use these commands to ground the work in the current code:

```sh
git status --short
sed -n '150,245p' frontend/src/App.jsx
sed -n '1180,1345p' frontend/src/App.jsx
sed -n '1,260p' frontend/src/utils/projectSessionUrl.js
sed -n '1,260p' frontend/test/projectSessionUrl.test.js
sed -n '1,220p' frontend/src/components/Sidebar.jsx
rg -n "projectError|setProjectError|restoreSavedProject|restoreStartupProject|getProjectRestoreCandidateFromUrl|replaceUrlProjectId|clearLastProjectId|setActiveProjectIdAndRef|history\\.replaceState|history\\.pushState" frontend/src frontend/test
```

## Implementation Guidance

### 1. Add URL Clearing Helpers

Extend `frontend/src/utils/projectSessionUrl.js` with tested helpers for removing the `project` query parameter.

Recommended exports:

```js
export function buildUrlWithoutProjectId(currentHrefOrLocation) {
  // Return the current URL/path with all project params removed.
  // Preserve unrelated query params and hash fragments.
}

export function clearUrlProjectId(windowLike = getDefaultWindow()) {
  // Safe wrapper around history.replaceState.
  // No-op if no project param exists or browser APIs are unavailable.
}
```

Rules:

- Remove all `project` query params, not just the first one.
- Preserve unrelated query params.
- Preserve hash fragments.
- Preserve app-relative output for app-relative inputs.
- Use `history.replaceState`, not `pushState`.
- Do not reload the page.
- Do not throw if `window`, `location`, `history`, or URL parsing is unavailable or throws.
- Avoid calling `replaceState` if the URL is already clear of `project`.
- Treat URL clearing as a convenience pointer cleanup; failures should not break the app.

Keep existing Stage 4 helpers intact:

- `readProjectIdFromSearch`
- `getProjectRestoreCandidateFromUrl`
- `buildUrlWithProjectId`
- `replaceUrlProjectId`

### 2. Track Restore Failure State In App

In `frontend/src/App.jsx`, add explicit state for restore failures instead of relying only on a string `projectError`.

Recommended shape:

```js
const [restoreIssue, setRestoreIssue] = useState(null);
```

Example values:

```js
{
  source: "url",
  reason: "malformed",
  projectId: null,
  rawValue: "../bad",
  message: "The lesson id in the URL is invalid."
}
```

```js
{
  source: "url",
  reason: "load-failed",
  projectId: "lesson-20260911-102000-missing",
  rawValue: "lesson-20260911-102000-missing",
  message: "The lesson requested in the URL could not be opened."
}
```

```js
{
  source: "localStorage",
  reason: "load-failed",
  projectId: "lesson-20260911-102000-missing",
  rawValue: "lesson-20260911-102000-missing",
  message: "The last lesson could not be restored."
}
```

Use any equivalent shape if it keeps the code simple and testable.

Expected state behavior:

- Set a URL restore issue when the URL candidate is malformed.
- Set a URL restore issue when the URL candidate is valid-looking but `getProject()` or validation fails.
- Set a localStorage restore issue when localStorage restore fails, if that helps UX, but the localStorage pointer should still be cleared automatically.
- Clear `restoreIssue` after successful create, save, open, duplicate, URL restore, localStorage restore, or server-applied project update.
- Clear `restoreIssue` after the user activates the explicit clear action.
- Do not keep stale restore issues visible after the user successfully switches to a valid project.

### 3. Add A Clear Restore Request Action

Add a user action in `App.jsx`, passed to `Sidebar.jsx` through `projectControls`, for clearing URL restore failures.

Suggested handler:

```js
function clearInvalidRestoreState() {
  if (restoreIssue?.source === "url") {
    clearUrlProjectId();

    if (
      restoreIssue.projectId &&
      readLastProjectId() === restoreIssue.projectId
    ) {
      clearLastProjectId();
    }
  }

  setRestoreIssue(null);
  setProjectError("");
  hasPendingLessonChange.current = false;
  setLesson(demoLesson);
  setActiveProjectIdAndRef(null, { syncUrl: false });
  clearTransientInputs();
  resetMediaReadiness();
  setSaveStatus("unsaved");
  setLoadStatus("idle");
}
```

Adjust this sketch to match the actual code.

Important details:

- Do not call `clearUrlProjectId()` automatically during startup failure. Stage 4 requires the failed URL to remain visible at first.
- Only clear the URL when the user explicitly chooses the recovery action or when a later successful active-project transition replaces it with a valid project id.
- Do not clear an unrelated localStorage id when the URL was malformed.
- Do clear localStorage when it contains the same failed URL project id, because after removing the URL that same stale id would otherwise be retried as localStorage on refresh.
- Do not delete backend project data.
- Do not call the backend from the clear action.
- Do not save the demo lesson as part of clearing.

### 4. Surface The Recovery Control In Sidebar

Update `frontend/src/components/Sidebar.jsx` or the equivalent project error UI.

When there is a URL restore issue, render an actionable control near the project error:

```text
Clear restore request
```

or:

```text
Remove from URL
```

The control should:

- Be a button, not a link, because it mutates app/browser state.
- Be disabled while `loadStatus === "loading"`.
- Call the clear handler from `projectControls`.
- Be visible only when there is a clearable restore issue.
- Avoid showing technical raw ids unless the existing UI already does so safely.

Do not add instructional wall-of-text in the UI. Keep the user-facing copy concise.

Suggested prop shape:

```js
projectControls.restoreIssue
projectControls.onClearRestoreIssue
```

or:

```js
projectControls.canClearRestoreIssue
projectControls.onClearRestoreIssue
```

Use whatever matches the component style.

### 5. Preserve Existing Success Paths

Successful project transitions should continue to clear invalid restore state naturally.

Ensure these paths clear `restoreIssue` and `projectError` as appropriate:

- Successful startup URL restore.
- Successful startup localStorage restore.
- Successful create fresh project.
- Successful save current lesson.
- Successful open project.
- Successful duplicate project.
- Successful server-applied lesson update.

Successful active-project transitions should continue to:

- Write `lessonSourceBuilder:lastProjectId`.
- Replace/sync `?project=<id>` in the URL.
- Use `history.replaceState`.
- Avoid storing full lesson content in browser storage.

### 6. Keep Stage 4 Failure Semantics

Do not regress Stage 4:

- URL project still takes precedence over localStorage.
- Failed URL restore still does not fall back to localStorage.
- Malformed URL project still does not call the backend.
- Failed/malformed URL restore still leaves the failed URL visible immediately after startup.
- No-URL startup still uses localStorage restore.
- localStorage failure still falls back softly to demo.
- Loading guards still prevent project/stage mutations while startup restore is loading.

## Test Requirements

Update or add tests in:

```text
frontend/test/projectSessionUrl.test.js
```

Cover URL clearing helpers:

- `buildUrlWithoutProjectId()` removes a single `project` param.
- `buildUrlWithoutProjectId()` removes multiple `project` params.
- `buildUrlWithoutProjectId()` preserves unrelated query params.
- `buildUrlWithoutProjectId()` preserves hash fragments.
- `buildUrlWithoutProjectId()` returns app-relative output for app-relative inputs.
- `buildUrlWithoutProjectId()` handles missing project param without changing the URL.
- `buildUrlWithoutProjectId()` handles invalid/unparseable inputs without throwing.
- `clearUrlProjectId()` calls `history.replaceState`.
- `clearUrlProjectId()` does not call `history.pushState`.
- `clearUrlProjectId()` does not call `replaceState` when no `project` param exists.
- `clearUrlProjectId()` does not throw when browser APIs are missing or throwing.

If you extract restore issue logic into a pure helper, add a focused test file such as:

```text
frontend/test/projectRestoreIssue.test.js
```

Cover:

- URL malformed issue is clearable.
- URL load-failed issue is clearable.
- LocalStorage load failure clears localStorage automatically.
- Clearing a URL issue clears localStorage only when the stored id matches the failed URL id.
- Clearing a malformed URL issue does not clear an unrelated stored id.

Keep tests under the existing `node --test` setup. Do not add React testing libraries or browser test dependencies unless the repo already uses them.

## Manual QA Checklist

Run the app locally:

```sh
npm run dev
```

Then verify:

1. Open `/?project=../bad`.
2. Confirm the app shows the demo lesson with an invalid URL id error.
3. Confirm the URL remains `?project=../bad` before taking action.
4. Confirm a clear recovery button is visible near the error.
5. Click the clear recovery button.
6. Confirm the URL no longer contains `project`.
7. Confirm unrelated params and hash remain, for example `/?tab=setup&project=../bad#story` becomes `/?tab=setup#story`.
8. Confirm the app remains on the demo lesson, active project is empty, and save status is unsaved.
9. Refresh and confirm the malformed URL restore is not retried.
10. Set localStorage to a valid saved project A.
11. Open `/?project=lesson-valid-shape-but-missing`.
12. Confirm the URL failure is shown and project A is not opened.
13. Click the clear recovery button.
14. Confirm the URL project param is removed.
15. Confirm localStorage project A remains untouched.
16. Refresh without `project` and confirm project A can restore from localStorage.
17. Set localStorage to the same missing id as the failed URL.
18. Open the missing URL again and clear it.
19. Confirm localStorage is cleared so refresh does not retry the same stale id.
20. After clearing, create/save a new lesson and confirm URL/localStorage update to the new valid project id.
21. Open and duplicate existing projects after clearing and confirm normal Stage 4 URL sync still works.

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
rg -n "buildUrlWithoutProjectId|clearUrlProjectId|restoreIssue|onClearRestore|Clear restore|Remove from URL|history\\.replaceState|history\\.pushState" frontend/src frontend/test
rg -n "localStorage\\.setItem|lessonSourceBuilder:lastProjectId|JSON\\.stringify\\(lesson|setItem\\([^,]+,\\s*JSON" frontend/src frontend/test
```

Expected results:

- URL clearing helpers and tests are present.
- URL clearing uses `history.replaceState`.
- `history.pushState` is not used for this feature.
- Browser storage still stores only the project id pointer.
- No full lesson JSON is stored in localStorage.

## Acceptance Criteria

Stage 5 is acceptable when:

- Users can explicitly clear a failed/malformed URL restore request.
- The failed URL remains visible until the user clears it or successfully switches to another valid project.
- Clearing removes the `project` query param without reloading.
- Clearing preserves unrelated query params and hashes where practical.
- Clearing a URL failure clears matching stale localStorage but does not clear unrelated valid localStorage.
- LocalStorage malformed/stale behavior from Stage 3 remains intact.
- URL restore precedence and failure behavior from Stage 4 remain intact.
- Successful project transitions continue to sync URL/localStorage normally.
- Automated tests and build pass.
- Backend data and APIs are unchanged.

## Final Response For The Implementer

In your final response, include:

- A short summary of what changed.
- Files changed.
- Automated verification results.
- Whether manual browser QA was run.
- Any residual risk or follow-up.
