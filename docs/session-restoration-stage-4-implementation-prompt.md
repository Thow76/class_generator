# Session Restoration Stage 4 Implementation Prompt

Use this prompt to implement Stage 4 of the Lesson Source Builder session restoration work.

## Prompt

You are implementing Stage 4 of session restoration for Lesson Source Builder.

Stage 1 confirmed that saved lessons already persist on the backend under `server/data/projects/...`.
Stage 2 defined the restore rules and failure behavior.
Stage 3 added localStorage restoration with the pointer key:

```text
lessonSourceBuilder:lastProjectId
```

Your Stage 4 job is to add URL-based project restoration and URL synchronization.

The target URL format is:

```text
/?project=lesson-...
```

The URL project id is an explicit user intent and must take precedence over localStorage.

Do not implement autosave, deletion UI, export generation, auth, account sync, cloud storage, server-side sessions, backend storage changes, or full lesson snapshots in browser storage.

## User-Facing Goal

Users should be able to reload, reopen, share, or bookmark a localhost URL and return to the exact saved lesson represented by that URL:

```text
http://127.0.0.1:5173/?project=lesson-20260911-102000-ab12cd34
```

After successful project creation, save, open, duplicate, localStorage restore, URL restore, or server-applied project update, the browser URL should reflect the active saved project id without adding noisy history entries.

## Required Behavior

Stage 4 is complete only when all of the following are true:

- Startup reads the URL `project` query parameter before localStorage.
- A valid-looking URL `project` candidate restores through the existing project API, normally `getProject(projectId)`.
- A successful URL restore normalizes and validates the loaded lesson before applying it.
- A successful URL restore applies the same active-project state as manual open/localStorage restore.
- A successful URL restore writes the restored id to localStorage.
- URL `project` takes precedence over a different localStorage id.
- A failed URL restore does not fall back to localStorage.
- A malformed URL project value does not call the backend.
- A failed or malformed URL restore leaves the failed URL visible/unchanged.
- When no URL `project` param exists, Stage 3 localStorage restoration still works.
- A successful localStorage restore synchronizes the URL to `?project=<id>`.
- Successful active-project transitions synchronize the URL to the active saved project id.
- URL synchronization uses `history.replaceState`, not `history.pushState`.
- URL synchronization preserves unrelated query parameters where practical.
- URL synchronization preserves hash fragments where practical.
- URL synchronization avoids repeated writes when the URL already contains the active project id.
- URL handling does not create startup/render loops.
- URL handling does not store lesson JSON, media readiness, export data, images, or unsaved form state in localStorage.
- Backend project APIs and backend project storage remain unchanged.

## Source Context To Read First

Read these files before editing:

```text
docs/session-restoration-stage-1-baseline.md
docs/session-restoration-stage-2-restore-rules.md
docs/session-restoration-stage-3-localstorage-prompt.md
docs/session-restoration-stage-3-review-prompt.md
frontend/src/App.jsx
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
frontend/src/utils/projectSessionStorage.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/test/projectSessionStorage.test.js
server/src/services/projectStore.js
server/src/routes/projects.js
```

If equivalent code has moved, inspect the moved files instead.

Also check whether Stage 4 has been partially attempted already:

```sh
rg -n "projectSessionUrl|getProjectRestoreCandidateFromUrl|readProjectIdFromSearch|replaceUrlProjectId|buildUrlWithProjectId|projectQueryParam|URLSearchParams|history\\.replaceState|history\\.pushState|\\?project" frontend/src frontend/test
```

If URL code already exists, do not duplicate it. Verify it against this contract and complete or correct it.

## Commands To Run Before Editing

Use these commands to understand the current implementation:

```sh
git status --short
sed -n '1,260p' docs/session-restoration-stage-2-restore-rules.md
sed -n '1,240p' frontend/src/utils/projectSessionStorage.js
sed -n '140,230p' frontend/src/App.jsx
sed -n '1180,1345p' frontend/src/App.jsx
rg -n "readLastProjectId|writeLastProjectId|clearLastProjectId|isLikelySafeProjectId|setActiveProjectIdAndRef|restoreSavedProject|restoreStartupProject|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject|applyServerLesson|loadStatus === \"loading\"" frontend/src/App.jsx frontend/src
find frontend/test -maxdepth 2 -type f | sort
```

The app may already have unrelated uncommitted files. Do not revert user changes.

## Implementation Plan

### 1. Add A URL Session Helper

Create or update:

```text
frontend/src/utils/projectSessionUrl.js
```

Keep this helper pure and easy to test. Prefer injected `location`, `history`, or `windowLike` objects so tests can run under `node --test` without a browser.

Recommended exports:

```js
export const projectQueryParam = "project";

export function readProjectIdFromSearch(search) {
  // Return a structured candidate for absent, valid, or malformed URL state.
}

export function getProjectRestoreCandidateFromUrl(location = getDefaultLocation()) {
  // Safely reads location.search and delegates to readProjectIdFromSearch.
}

export function buildUrlWithProjectId(currentHrefOrLocation, projectId) {
  // Returns a URL/path with project=<projectId>, preserving unrelated params/hash.
}

export function replaceUrlProjectId(projectId, windowLike = getDefaultWindow()) {
  // Safely calls history.replaceState when needed.
}
```

Reuse `isLikelySafeProjectId(value)` from `frontend/src/utils/projectSessionStorage.js`. Do not fork project-id validation.

Suggested candidate shape:

```js
{
  source: "url",
  projectId: null,
  valid: false,
  malformed: false,
  rawValue: null
}
```

Candidate rules:

- No `project` param means `valid: false`, `malformed: false`, `projectId: null`.
- Valid `project` param means `valid: true`, `projectId: <id>`, `malformed: false`.
- Malformed `project` param means `valid: false`, `malformed: true`, `projectId: null`.
- Empty `?project=` counts as malformed intent, not absent intent.
- If multiple `project` params exist, use the first value returned by `URLSearchParams.get("project")`.
- Invalid values must never be returned as restorable project ids.
- Failures reading browser globals must return an absent/no-candidate shape and must not throw.

URL building rules:

- Add `project=<id>` when missing.
- Replace an existing `project` param when present.
- Preserve unrelated query parameters where practical.
- Preserve hash fragments where practical.
- Return the original URL/path unchanged for invalid project ids or URL construction failures.
- For app-relative inputs, return app-relative output rather than forcing an absolute URL.

URL replacement rules:

- Use `history.replaceState`, never `history.pushState`.
- No-op for invalid project ids.
- No-op if browser APIs are unavailable or throw.
- No-op if the URL already contains the same valid project id.
- Treat URL sync as a convenience pointer; it must not break the app if it fails.

### 2. Add URL Helper Tests

Create or update:

```text
frontend/test/projectSessionUrl.test.js
```

Cover at least these cases:

- `projectQueryParam` equals `project`.
- Search with no `project` returns an absent candidate.
- `?project=lesson-20260911-102000-ab12cd34` returns a valid candidate.
- Multiple `project` params use the first value.
- Malformed ids are detected distinctly from absent ids.
- Malformed ids are not returned as restorable ids.
- Empty project values are treated as malformed intent.
- Location access failures do not throw.
- `buildUrlWithProjectId()` adds `project` when missing.
- `buildUrlWithProjectId()` replaces an existing `project`.
- `buildUrlWithProjectId()` preserves unrelated query params.
- `buildUrlWithProjectId()` preserves hash fragments.
- `buildUrlWithProjectId()` returns the original URL/path for invalid ids.
- `buildUrlWithProjectId()` supports location-like objects.
- `replaceUrlProjectId()` calls `history.replaceState`.
- `replaceUrlProjectId()` does not call `history.pushState`.
- `replaceUrlProjectId()` skips writes when the URL already has the same project id.
- `replaceUrlProjectId()` does not throw when browser APIs are missing or throwing.

Do not add large new dependencies. The existing frontend tests use Node's built-in test runner.

### 3. Update Startup Restore In App.jsx

Update the startup restore effect in:

```text
frontend/src/App.jsx
```

The Stage 3 localStorage-only flow likely reads:

```js
const projectId = readLastProjectId();
```

Stage 4 must inspect URL intent before that localStorage read.

Required startup flow:

1. Enter the existing restoring/loading state.
2. Safely inspect the URL `project` query parameter with the URL helper.
3. If the URL candidate is valid, attempt restore with `getProject(urlCandidate.projectId)`.
4. If URL restore succeeds, normalize and validate the lesson, apply it, write localStorage, sync/keep URL, refresh the project list quietly when practical, then finish loading.
5. If URL restore fails, do not read or restore localStorage. Fall back to the bundled demo lesson, show a URL-specific error, leave the URL unchanged, and finish loading.
6. If the URL candidate is malformed, do not call `getProject()`. Fall back to the bundled demo lesson, show an invalid URL id error, leave the URL unchanged, do not restore localStorage, and finish loading.
7. If no URL candidate exists, run the existing Stage 3 localStorage restore.
8. If localStorage restore succeeds, apply the saved project state and sync the URL to that id.
9. If localStorage restore fails, keep the existing Stage 3 behavior: clear stale storage if appropriate, fall back to demo, and do not introduce a URL project param.
10. Ensure every path exits the loading state unless the component has unmounted/cancelled.

Important: URL intent is explicit. A failed URL project must not silently open a different localStorage project.

### 4. Normalize App State On Successful Restore

On successful URL restore, apply state consistently with manual open and localStorage restore.

The success path should:

- Normalize and validate the loaded lesson.
- Set `lesson` to the restored lesson.
- Set `activeProjectId`.
- Update `activeProjectIdRef`.
- Set save status to `saved`.
- Clear project errors.
- Clear transient input state.
- Reset media readiness state.
- Mark pending lesson changes as false, if that ref exists.
- Set load status to the normal loaded/idle success state used by the app.
- Write localStorage to the restored project id.
- Keep/sync URL to the restored project id.
- Quietly refresh the project list when practical.

Prefer reusing existing helper functions such as `normalizeAndValidateLoadedLesson`, `clearTransientInputs`, `resetMediaReadiness`, `loadProjectList`, and the active-project setter if they exist.

### 5. Handle URL Failures Deliberately

When URL restore fails because the project is missing, deleted, unreadable, backend validation fails, frontend validation fails, or the API request fails:

- Do not fall back to localStorage.
- Do not clear or replace the failed URL.
- Do not expose stack traces, absolute file paths, temp paths, or internal details.
- Reset to `demoLesson` or keep the bundled demo in place.
- Set `activeProjectId` and ref to `null`.
- Set save status to `unsaved`.
- Clear transient input state.
- Reset media readiness state.
- Set load status to a non-loading state.
- Show a readable error such as:

```text
The lesson requested in the URL could not be opened.
```

- Leave New/Open/Duplicate/Save usable after the failure.

Do not clear localStorage on URL failure unless you can safely prove the failed URL id is the same stale id stored in localStorage. It is acceptable in Stage 4 to leave localStorage unchanged on URL failure to avoid over-clearing.

When the URL `project` value is malformed:

- Do not call the backend.
- Do not read or restore localStorage.
- Do not mutate the URL.
- Reset to demo/unsaved state.
- Show a clear error such as:

```text
The lesson id in the URL is invalid.
```

### 6. Add URL Sync To Active Project Transitions

Update the shared success path that sets active project ids. The preferred integration point is the app helper that sets both `activeProjectId` and `activeProjectIdRef`, for example:

```js
function setActiveProjectIdAndRef(projectId, options = {}) {
  activeProjectIdRef.current = projectId;
  setActiveProjectId(projectId);

  if (isLikelySafeProjectId(projectId)) {
    writeLastProjectId(projectId);
    if (options.syncUrl !== false) {
      replaceUrlProjectId(projectId);
    }
  }
}
```

Rules:

- Sync only valid-looking saved project ids.
- Do not sync `null`, malformed ids, demo state, or unsaved draft state.
- Do not update the URL before a backend create/save/open/restore succeeds.
- Use `history.replaceState`, not `pushState`.
- Preserve unrelated query params and hash fragments.
- Avoid repeated writes when already synced.
- Do not clear a failed URL project during URL failure fallback.

Successful transitions that should sync the URL include:

- Create fresh project.
- Save lesson when it creates a new backend project.
- Save lesson when it persists the active project.
- Open project from the sidebar/list.
- Duplicate project.
- Successful localStorage startup restore.
- Successful URL startup restore.
- Server-applied lesson updates that establish or keep a saved project id.

### 7. Preserve Stage 3 Protections

Do not regress accepted Stage 3 behavior:

- `projectSessionStorage.js` safely handles blocked `window.localStorage` access.
- localStorage stores only a project id string under `lessonSourceBuilder:lastProjectId`.
- Invalid localStorage ids are cleared and ignored.
- Startup restore loading state blocks project mutation actions.
- Stage navigation and stage-level mutation actions are blocked while restore is loading.
- The user should not be able to act on the demo lesson while startup restore is still in progress.
- Backend/API scope remains unchanged.

## Things Not To Change

Do not change:

- Backend project file layout.
- Backend project route contract.
- Project id generation scheme unless already required by existing code.
- Lesson schema beyond normalizing/validating loaded data.
- Export phases.
- Image/media generation.
- Auth, account, cloud, or server-side session behavior.
- Browser storage to contain full lessons or media data.

## Verification Commands

Run these after implementation:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Also run targeted source checks:

```sh
rg -n "projectSessionUrl|getProjectRestoreCandidateFromUrl|readProjectIdFromSearch|replaceUrlProjectId|buildUrlWithProjectId|projectQueryParam|URLSearchParams|history\\.replaceState|\\?project" frontend/src frontend/test
rg -n "history\\.pushState|localStorage\\.setItem|lessonSourceBuilder:lastProjectId" frontend/src frontend/test
```

Expected targeted-check outcome:

- URL helper symbols appear in frontend source/tests.
- `history.replaceState` appears only in the URL helper or another small controlled URL utility.
- `history.pushState` is not used for this feature.
- localStorage writes remain limited to the last-project-id pointer behavior.
- No full lesson JSON is stored in browser storage.

## Manual Browser QA

Run the app locally and manually check:

1. No URL `project`, no localStorage id: app opens the bundled demo and becomes usable.
2. No URL `project`, valid localStorage id: app restores that project and updates the URL to `?project=<id>`.
3. URL `?project=<valid-existing-id>` with different localStorage id: app restores the URL project, updates localStorage to that id, and does not open the localStorage project.
4. URL `?project=<missing-or-deleted-id>` with valid localStorage id: app shows URL restore failure, does not open localStorage, and leaves the URL unchanged.
5. URL `?project=../bad`: app shows invalid URL id error, does not call the backend for that id, does not open localStorage, and leaves the URL unchanged.
6. Creating a new project updates the URL with the created project id after backend success.
7. Opening an existing project updates the URL after successful open.
8. Saving a new unsaved lesson updates the URL after the backend creates/persists the project.
9. Duplicating a project updates the URL after duplicate succeeds.
10. Unrelated query params and hash fragments survive URL sync where practical.
11. Browser back button is not polluted with a new history entry for every automatic active-project sync.
12. A refresh on a synced URL restores the same lesson.

If manual QA is not run, state that explicitly in the final handoff.

## Acceptance Criteria

The implementation is acceptable when:

- URL restore is implemented and tested.
- URL takes precedence over localStorage.
- URL failure/malformed cases do not fall back to localStorage.
- Active project changes sync the URL with `history.replaceState`.
- Stage 3 localStorage restoration and storage safety still pass.
- Stage 3 loading guards still prevent demo mutations during startup restore.
- All required automated verification commands pass.
- No backend project storage/API scope creep is introduced.

## Final Response For The Implementer

In your final response, include:

- A brief summary of what changed.
- The key files changed.
- The verification commands run and their results.
- Whether manual browser QA was run.
- Any residual risk or follow-up needed.
