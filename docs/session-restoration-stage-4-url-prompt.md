# Session Restoration Stage 4 URL Prompt

Use this prompt to implement Stage 4 of the session restoration issue for Lesson Source Builder.

## Prompt

You are implementing Stage 4 of the Lesson Source Builder session restoration work.

Stage 1 established that backend project persistence exists but frontend startup did not restore sessions. Stage 2 defined the restoration rules. Stage 3 implemented localStorage restoration using the exact key `lessonSourceBuilder:lastProjectId`.

Your Stage 4 job is to add URL-based project restoration and URL synchronization.

The URL project source must take precedence over localStorage:

```text
/?project=lesson-...
```

Do not implement autosave, project deletion UI, export generation, auth, account sync, cloud storage, backend API changes, full lesson snapshots in browser storage, or a server-side session mechanism.

## Stage 4 Goal

Users should be able to reload, reopen, share, or bookmark a localhost URL containing a project id and return to that exact saved lesson:

```text
http://127.0.0.1:5173/?project=lesson-20260911-102000-ab12cd34
```

After successful create, save, open, duplicate, localStorage restore, URL restore, or server-applied project update, the browser URL should reflect the active saved project id without adding noisy browser history entries.

## Required Behavior

Stage 4 is correct only if:

- Startup reads the URL `project` query parameter before localStorage.
- A valid-looking URL `project` candidate is restored through the existing project API, normally `getProject(projectId)`.
- A successful URL restore normalizes and validates the loaded lesson before applying it.
- A successful URL restore sets `lesson`, `activeProjectId`, `activeProjectIdRef`, `saveStatus`, transient state, media readiness, and project error state consistently with manual open/localStorage restore.
- A successful URL restore updates localStorage to the restored project id.
- URL `project` takes precedence over a different localStorage id.
- A failed URL restore does not silently open a different localStorage project.
- A malformed URL project value does not call the backend.
- A failed or malformed URL restore leaves the URL visible/unchanged so the user can see what failed.
- localStorage fallback still works when no URL `project` parameter is present.
- localStorage failure behavior from Stage 3 remains intact.
- Successful active-project transitions synchronize the URL to `?project=<activeProjectId>`.
- URL synchronization uses `history.replaceState`, not `history.pushState`, for automatic app state sync.
- URL synchronization preserves unrelated query parameters where practical.
- URL synchronization preserves the hash fragment where practical.
- URL handling does not create infinite startup/render loops.
- URL handling does not store lesson JSON, media readiness, export data, or unsaved form state.
- No backend storage or project API contract changes are introduced.

## Source Context To Read

Read these files before editing:

```text
docs/session-restoration-stage-1-baseline.md
docs/session-restoration-stage-2-restore-rules.md
docs/session-restoration-stage-3-localstorage-prompt.md
docs/session-restoration-stage-3-review-prompt.md
frontend/src/App.jsx
frontend/src/utils/projectSessionStorage.js
frontend/test/projectSessionStorage.test.js
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/test
server/src/services/projectStore.js
server/src/routes/projects.js
```

If the relevant code has moved, inspect the equivalent files.

## Commands To Consider Before Editing

Use these commands to ground the implementation in the current code:

```sh
git status --short
sed -n '1,360p' docs/session-restoration-stage-2-restore-rules.md
sed -n '1,220p' frontend/src/utils/projectSessionStorage.js
sed -n '140,215p' frontend/src/App.jsx
sed -n '1180,1310p' frontend/src/App.jsx
rg -n "readLastProjectId|writeLastProjectId|clearLastProjectId|isLikelySafeProjectId|setActiveProjectIdAndRef|restoreLastProject|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject|applyServerLesson" frontend/src/App.jsx frontend/src
rg -n "URLSearchParams|window\\.location\\.search|location\\.search|history\\.replaceState|history\\.pushState|\\?project" frontend/src frontend/test
find frontend/test -maxdepth 2 -type f | sort
```

## Suggested Implementation Shape

Prefer a small, testable URL helper rather than scattering URL parsing and mutation directly through `App.jsx`.

Recommended new file:

```text
frontend/src/utils/projectSessionUrl.js
```

Recommended exports:

```js
export const projectQueryParam = "project";

export function readProjectIdFromSearch(search) {
  // Return the first project param value, or null.
  // Return malformed values as a distinguishable result if App needs to show
  // URL-specific errors without calling the backend.
}

export function getProjectRestoreCandidateFromUrl(location = window.location) {
  // Safe wrapper around location/search access.
}

export function buildUrlWithProjectId(currentHrefOrLocation, projectId) {
  // Preserve unrelated query params and hash.
  // Set or replace project=<projectId>.
}

export function replaceUrlProjectId(projectId, windowLike = window) {
  // Safe wrapper around history.replaceState.
  // No-op for invalid project ids or missing browser APIs.
}
```

The helper should reuse `isLikelySafeProjectId(value)` from `projectSessionStorage.js` or share a small validation module if that is cleaner. Do not fork conflicting project id validation rules.

Keep helper APIs easy to test with strings or injected `location`/`history` objects. The frontend currently uses `node --test`, so pure helper tests are the lowest-friction path.

## URL Candidate Semantics

The implementation needs to distinguish at least these states:

```text
No URL project param.
URL project param exists and is valid-looking.
URL project param exists but is malformed/unsafe.
```

Recommended shape:

```js
{
  source: "url",
  projectId: "lesson-...",
  valid: true
}
```

or:

```js
{
  projectId: null,
  malformed: true,
  rawValue: "../lesson-bad"
}
```

Use any shape that keeps `App.jsx` readable and prevents malformed URL values from becoming backend requests.

If multiple `project` params are present, use the first value returned by `URLSearchParams.get("project")` and ignore the rest.

## Startup Restore Integration

Update the Stage 3 startup restore path in `frontend/src/App.jsx`.

Required startup decision flow:

1. Start in a restoring/loading state.
2. Safely inspect the URL `project` query parameter.
3. If the URL has a valid-looking project id, attempt URL restore with `getProject(projectId)`.
4. If URL restore succeeds, apply it like manual open, write localStorage, quietly refresh project list when practical, and finish loading.
5. If URL restore fails, show a clear project error, keep or return to the bundled demo lesson, do not restore a different localStorage project, do not mutate the URL, and finish loading.
6. If the URL has a malformed project value, do not call the backend, show a clear URL restore error, keep or return to the bundled demo lesson, do not restore localStorage, do not mutate the URL, and finish loading.
7. If there is no URL project param, continue with the existing Stage 3 localStorage restore behavior.
8. If localStorage restore succeeds, apply it like manual open and synchronize the URL to the restored project id.
9. If localStorage restore fails, clear stale storage, keep or return to demo, and do not introduce a URL project param.
10. End restoring/loading state in every path.

Important: URL intent is explicit. A failed URL project must not fall through to localStorage, even if localStorage points to a valid project.

## URL Synchronization Integration

After successful active-project transitions, keep the URL in sync with the active saved project id.

Recommended integration point:

```text
setActiveProjectIdAndRef(projectId)
```

That helper already receives successful active project ids from create, save, open, duplicate, server-applied project updates, and restoration flows. It is a good place to call both:

```text
writeLastProjectId(projectId)
replaceUrlProjectId(projectId)
```

Rules:

- Synchronize only valid-looking project ids.
- Do not synchronize `null`, malformed ids, or unsaved draft states.
- Use `history.replaceState`, not `pushState`, for automatic sync.
- Do not update the URL before the backend has successfully created/saved/opened/restored the project.
- Preserve unrelated query params where practical.
- Preserve hash fragments where practical.
- Avoid repeated writes if the URL already has the correct project id.
- Do not clear a failed URL project from the address bar during failure handling.

If centralizing in `setActiveProjectIdAndRef(projectId)` would accidentally mutate the failed URL fallback path, add an explicit option, for example:

```js
setActiveProjectIdAndRef(projectId, { syncUrl: false })
```

Use that option only where needed, such as failed URL restore fallback to demo. Keep the common success path simple.

## Failure Handling Details

### URL Restore Success

When URL restore succeeds:

- Apply the restored lesson.
- Set active project id/ref.
- Set save status to `saved`.
- Clear project errors.
- Clear transient input/operation state.
- Reset media readiness.
- Write localStorage to the restored project id.
- Keep the URL project param set to that id.
- Quietly refresh project list if practical.

### URL Restore Failure

When URL restore fails because the project is missing, deleted, unreadable, fails backend validation, fails frontend validation, or the API request fails:

- Do not fall back to localStorage.
- Do not overwrite localStorage unless the failed URL id is also the stored id and the implementation can safely identify it as stale. It is acceptable to leave localStorage unchanged in Stage 4 to avoid over-clearing.
- Keep or reset to `demoLesson`.
- Set `activeProjectId` to `null`.
- Set save status to `unsaved`.
- Set load status to `idle` or an equivalent non-loading state.
- Show a readable project error such as:

```text
The lesson requested in the URL could not be opened.
```

- Do not expose stack traces, absolute filesystem paths, temp paths, or raw internals.
- Leave New/Open/Duplicate/Save usable after failure.
- Leave the URL unchanged.

### Malformed URL Project

When URL `project` exists but is malformed:

- Do not call `getProject()`.
- Do not fall back to localStorage.
- Keep or reset to `demoLesson`.
- Set `activeProjectId` to `null`.
- Clear transient inputs/readiness as needed.
- Show a readable project error such as:

```text
The lesson id in the URL is invalid.
```

- Leave the URL unchanged.

### LocalStorage Restore

When there is no URL project param, preserve Stage 3 behavior:

- Valid-looking stored id loads through `getProject()`.
- Successful localStorage restore applies saved project state and synchronizes the URL to the restored project id.
- Malformed localStorage values are cleared without backend calls.
- Missing/deleted/stale localStorage ids are cleared.
- Failure falls back to `demoLesson`.
- Project actions remain usable.

## Loading And Project Actions

Preserve the Stage 3 loading protection:

- During startup restore/loading, project mutation actions should be disabled in the UI.
- Handler-level guards should prevent fast clicks or programmatic project actions while `loadStatus === "loading"`.
- Save and Duplicate must not be usable against the visible demo lesson while a URL or localStorage restore is still pending.
- Restore failure must not permanently leave actions disabled.

## Tests

Add focused frontend tests. Prefer pure helper tests plus any App-level tests that are practical with the current setup.

Recommended new test file:

```text
frontend/test/projectSessionUrl.test.js
```

Test URL helper behavior:

1. `projectQueryParam` equals `project`.
2. Search with no `project` returns no candidate.
3. `?project=lesson-20260911-102000-ab12cd34` returns a valid URL candidate.
4. Query strings with unrelated params preserve the first `project` value.
5. Multiple `project` params use the first value.
6. Malformed ids are detected and marked malformed.
7. Malformed ids are not returned as restorable project ids.
8. Empty `project` values are treated as malformed or absent according to the chosen helper contract; document and test the choice.
9. Safe location access failures do not throw.
10. `buildUrlWithProjectId()` adds `project` when missing.
11. `buildUrlWithProjectId()` replaces an existing `project`.
12. `buildUrlWithProjectId()` preserves unrelated query params.
13. `buildUrlWithProjectId()` preserves hash fragments.
14. `buildUrlWithProjectId()` rejects/no-ops invalid ids.
15. `replaceUrlProjectId()` uses `history.replaceState`, not `pushState`.
16. `replaceUrlProjectId()` does not throw when browser APIs are missing or throw.
17. `replaceUrlProjectId()` does not write when the URL already has the same project id.

If practical, add App startup tests for:

1. URL project present and valid -> `getProject()` restore is attempted before localStorage.
2. URL project restore succeeds -> localStorage is updated and save status is saved.
3. URL project differs from localStorage -> URL project wins.
4. URL project fails -> localStorage project is not restored.
5. Malformed URL project -> backend is not called and localStorage fallback is not used.
6. No URL project -> existing localStorage restore still works.
7. Successful manual open/save/create/duplicate updates the URL.

Do not add large testing dependencies unless clearly justified. The current frontend test command is `node --test`.

## Manual QA Checklist

Run the app:

```sh
npm run dev
```

Then verify:

1. Clear localStorage and open `http://127.0.0.1:5173/`.
2. Confirm the app starts with the demo lesson.
3. Create or save a lesson.
4. Confirm the URL changes to `?project=<new-project-id>`.
5. Confirm localStorage contains only `lessonSourceBuilder:lastProjectId` with that project id.
6. Refresh the browser.
7. Confirm the project from the URL restores.
8. Open a different saved lesson.
9. Confirm the URL and localStorage update to the newly opened project id.
10. Duplicate a lesson.
11. Confirm the URL and localStorage update to the duplicate id.
12. Set localStorage to project A and open `/?project=<project-B>`.
13. Confirm project B opens and localStorage updates to project B.
14. Open `/?project=lesson-does-not-exist-but-valid-shape`.
15. Confirm the app shows a clear URL restore error and does not open the localStorage project.
16. Confirm the failed URL remains in the address bar.
17. Open `/?project=../lesson-bad`.
18. Confirm no backend project load is attempted if visible in logs/network, the app falls back to demo, and a clear invalid URL id error appears.
19. Remove the URL project param and set localStorage to a valid saved project id.
20. Refresh and confirm localStorage restore still works and then syncs the URL to that id.
21. Confirm Save and Duplicate are disabled while startup restore is loading.
22. Confirm New/Open/Duplicate/Save work after restore success and after restore failure.

## Verification Commands

Run:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Targeted source checks:

```sh
rg -n "projectQueryParam|readProjectIdFromSearch|getProjectRestoreCandidateFromUrl|buildUrlWithProjectId|replaceUrlProjectId|URLSearchParams|history\\.replaceState|window\\.location|location\\.search|\\?project" frontend/src frontend/test
rg -n "lessonSourceBuilder:lastProjectId|lastProjectStorageKey|readLastProjectId|writeLastProjectId|clearLastProjectId|localStorage" frontend/src frontend/test
rg -n "history\\.pushState|JSON\\.stringify\\(lesson|JSON\\.stringify\\(.*lesson|localStorage\\.setItem|setItem\\([^,]+,\\s*JSON" frontend/src frontend/test
```

Expected:

- URL helper/integration appears in the first search.
- Stage 3 localStorage helper/integration remains in the second search.
- The third search finds no `pushState`, no full lesson localStorage payload, and no rich JSON stored in browser storage.

If a command cannot run, state exactly why.

## Acceptance Criteria

Stage 4 is complete when:

- URL helper functions exist and are tested.
- URL query parameter name is exactly `project`.
- Startup reads URL `project` before localStorage.
- Valid URL project ids restore through the existing backend project API.
- URL restore success updates app state like manual open.
- URL restore success writes localStorage to the restored project id.
- URL restore failure does not fall through to a different localStorage project.
- Malformed URL project values do not call the backend.
- Failed/malformed URL restore leaves the failed URL visible.
- No-URL startup still uses Stage 3 localStorage restoration.
- Successful active-project transitions sync the URL with `history.replaceState`.
- URL sync preserves unrelated query params and hashes where practical.
- URL sync avoids history spam and infinite loops.
- localStorage still stores only a project id pointer.
- No autosave is introduced.
- No backend project storage or API contract changes are introduced.
- Frontend tests pass.
- Server tests pass.
- Frontend build passes.

## Expected Final Response

Report:

- Files changed.
- How URL restore precedence was implemented.
- How URL synchronization was implemented.
- How URL failure and malformed URL candidates are handled.
- How Stage 3 localStorage fallback was preserved.
- Tests added or updated.
- Verification commands run and results.
- Manual QA performed or skipped.
- Confirmation that autosave, backend changes, and export behavior remain out of scope.

Keep the response concise but specific.
