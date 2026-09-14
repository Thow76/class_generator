# Session Restoration Stage 4 Remediation Prompt

Use this prompt to fix the Stage 4 review findings for Lesson Source Builder session restoration.

## Prompt

You are remediating Stage 4 of the Lesson Source Builder session restoration work.

Stage 3 localStorage restoration is working and must be preserved. Stage 4 was supposed to add URL-based project restoration and URL synchronization, but review found that the current app still restores only from localStorage and never syncs the active project id into the URL.

Your job is to implement the missing Stage 4 URL behavior while preserving all accepted Stage 3 behavior.

Do not implement autosave, project deletion UI, export generation, auth, account sync, cloud storage, backend API changes, full lesson snapshots in browser storage, or server-side sessions.

## Findings To Fix

Fix these exact findings:

```text
[P1] Stage 4 URL restore is not implemented.
Startup still reads readLastProjectId() directly and only restores from localStorage, with no window.location.search, URLSearchParams, URL candidate branch, malformed URL handling, or URL-specific failure behavior.

[P1] Active project changes do not synchronize the URL.
setActiveProjectIdAndRef() writes only localStorage and never calls history.replaceState, so create/save/open/duplicate/localStorage restore/server-applied updates do not produce ?project=<id>.

[P2] Required URL helper and tests are missing.
frontend/src/utils/projectSessionUrl.js and frontend/test/projectSessionUrl.test.js do not exist.
```

## Required End State

After remediation:

- Startup reads URL `project` before localStorage.
- A valid-looking URL `project` restores through the existing frontend project API, normally `getProject(projectId)`.
- URL restore success normalizes and validates the loaded lesson before applying it.
- URL restore success applies state consistently with manual open/localStorage restore.
- URL restore success updates localStorage to the restored project id.
- URL `project` takes precedence over a different localStorage id.
- Failed URL restore does not fall through to localStorage.
- Malformed URL project values do not call the backend.
- Failed or malformed URL restore leaves the failed URL visible.
- No-URL startup still uses Stage 3 localStorage restoration.
- Successful localStorage restore syncs the URL to the restored project id.
- Successful create/save/open/duplicate/server-applied project updates sync the URL to the active project id.
- URL sync uses `history.replaceState`, not `history.pushState`.
- URL sync preserves unrelated query parameters and hash fragments where practical.
- URL sync avoids repeated writes when the URL already has the correct project id.
- localStorage still stores only `lessonSourceBuilder:lastProjectId` with a project id string.
- Stage 3 storage safety and loading guards remain intact.
- No backend files are changed.

## Files To Inspect

Read these before editing:

```text
docs/session-restoration-stage-4-url-prompt.md
docs/session-restoration-stage-4-review-prompt.md
docs/session-restoration-stage-2-restore-rules.md
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

If code has moved, inspect the equivalent files.

## Commands To Run Before Editing

Use these commands to confirm the current missing URL behavior:

```sh
git status --short
rg -n "projectSessionUrl|getProjectRestoreCandidateFromUrl|readProjectIdFromSearch|replaceUrlProjectId|buildUrlWithProjectId|projectQueryParam|URLSearchParams|history\\.replaceState|history\\.pushState|window\\.location|location\\.search|\\?project|source === \"url\"|source === 'url'" frontend/src frontend/test
rg -n "readLastProjectId|writeLastProjectId|clearLastProjectId|isLikelySafeProjectId|lessonSourceBuilder:lastProjectId|setActiveProjectIdAndRef|restoreLastProject|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject|applyServerLesson|isProjectLoading|loadStatus === \"loading\"" frontend/src frontend/test
sed -n '150,215p' frontend/src/App.jsx
sed -n '1285,1300p' frontend/src/App.jsx
```

## Implementation Guidance

### Add URL Helper

Create:

```text
frontend/src/utils/projectSessionUrl.js
```

Recommended exports:

```js
export const projectQueryParam = "project";

export function readProjectIdFromSearch(search) {
  // Return a structured candidate:
  // absent, valid project id, or malformed project param.
}

export function getProjectRestoreCandidateFromUrl(location = getDefaultLocation()) {
  // Safe wrapper around location/search access.
}

export function buildUrlWithProjectId(currentHrefOrLocation, projectId) {
  // Return a URL/path with project=<projectId>, preserving unrelated params/hash.
}

export function replaceUrlProjectId(projectId, windowLike = getDefaultWindow()) {
  // Safe wrapper around history.replaceState.
}
```

Use `isLikelySafeProjectId(value)` from `frontend/src/utils/projectSessionStorage.js` so URL validation matches Stage 3's lightweight project id guard. Backend validation remains authoritative.

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

Rules:

- No `project` param -> `valid: false`, `malformed: false`.
- Valid `project` param -> `valid: true`, `projectId`.
- Malformed `project` param -> `valid: false`, `malformed: true`, `rawValue`.
- If multiple `project` params exist, use the first value returned by `URLSearchParams.get("project")`.
- Location access failures return the absent/no-candidate shape without throwing.
- Invalid ids are never returned as restorable project ids.

### Add URL Helper Tests

Create:

```text
frontend/test/projectSessionUrl.test.js
```

Cover:

1. `projectQueryParam` equals `project`.
2. Search with no `project` returns no candidate.
3. `?project=lesson-20260911-102000-ab12cd34` returns a valid candidate.
4. Multiple `project` params use the first value.
5. Unrelated query params are preserved by URL building.
6. Malformed ids are detected distinctly from absent ids.
7. Malformed ids are not returned as restorable ids.
8. Empty project values have documented/tested behavior.
9. Safe location access failures do not throw.
10. `buildUrlWithProjectId()` adds `project` when missing.
11. `buildUrlWithProjectId()` replaces an existing `project`.
12. `buildUrlWithProjectId()` preserves unrelated query params.
13. `buildUrlWithProjectId()` preserves hash fragments.
14. Invalid project ids no-op or return the original URL.
15. `replaceUrlProjectId()` uses `history.replaceState`.
16. `replaceUrlProjectId()` does not use `history.pushState`.
17. `replaceUrlProjectId()` does not throw when browser APIs are missing or throwing.
18. `replaceUrlProjectId()` does not write when the URL already has the same project id.

Keep tests under `node --test`; do not add large test dependencies.

### Update Startup Restore

Update the startup restore effect in `frontend/src/App.jsx`.

Current problem:

```js
const projectId = readLastProjectId();
```

This localStorage read currently happens before any URL candidate handling.

Required startup flow:

1. Set project loading/restoring state.
2. Read URL candidate with `getProjectRestoreCandidateFromUrl()`.
3. If URL candidate is valid, attempt `getProject(urlCandidate.projectId)`.
4. If URL restore succeeds, apply it like manual open, write localStorage, keep/sync URL, quietly refresh project list, and exit loading.
5. If URL restore fails, do not read/restore localStorage. Fall back to demo, show URL-specific error, leave URL unchanged, and exit loading.
6. If URL candidate is malformed, do not call `getProject()`. Fall back to demo, show invalid URL id error, leave URL unchanged, do not restore localStorage, and exit loading.
7. If no URL candidate exists, run the existing Stage 3 localStorage restore.
8. If localStorage restore succeeds, apply saved project state and sync the URL to that id.
9. If localStorage restore fails, clear stale storage, fall back to demo, do not introduce a URL project param, and exit loading.

Important: URL intent is explicit. A failed URL restore must not silently open localStorage.

### Suggested App Structure

You may keep one shared helper like:

```js
async function restoreSavedProject(projectId, source) {
  // source is "url" or "localStorage"
}
```

But behavior must differ by source:

- `source === "url"` failure: do not clear unrelated localStorage, do not fall through, show URL-specific error, leave URL unchanged.
- `source === "localStorage"` failure: clear stale localStorage, fall back softly to demo.

When falling back to demo after URL failure, avoid calling URL sync with `null`; do not clear or replace the URL. If needed, add an option to `setActiveProjectIdAndRef`:

```js
setActiveProjectIdAndRef(projectId, { syncUrl: true })
```

and call it with `{ syncUrl: false }` for failed URL fallback.

### Update URL Sync

Update `setActiveProjectIdAndRef(projectId)` or a nearby common success path.

Expected behavior:

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

- Sync only valid-looking ids.
- Do not sync `null`, malformed ids, or unsaved draft state.
- Do not update URL before backend create/save/open/restore succeeds.
- Use `history.replaceState`, not `pushState`.
- Preserve unrelated query params and hash fragments.
- Avoid repeated writes if already synced.

### Preserve Stage 3 Protections

Do not regress:

- `projectSessionStorage.js` safe access to `window.localStorage`.
- `projectSessionStorage.test.js` blocked storage access test.
- localStorage stores only `lessonSourceBuilder:lastProjectId`.
- `loadStatus === "loading"` blocks project actions.
- stage navigation is disabled while project loading.
- editable stage content is replaced by a loading panel while project loading.
- restore failure exits loading state.
- no autosave of unsaved React state.

## Manual QA Checklist

Manual browser QA is strongly recommended:

```sh
npm run dev
```

Then verify:

1. Clear localStorage and open `http://127.0.0.1:5173/`.
2. Confirm the app starts with the demo lesson.
3. Create or save a lesson.
4. Confirm the URL changes to `?project=<project-id>`.
5. Confirm localStorage contains only `lessonSourceBuilder:lastProjectId`.
6. Refresh and confirm the URL project restores.
7. Open a different saved lesson and confirm URL/localStorage update.
8. Duplicate a lesson and confirm URL/localStorage update to the duplicate id.
9. Set localStorage to project A and open `/?project=<project-B>`.
10. Confirm project B opens and localStorage updates to project B.
11. Open `/?project=lesson-does-not-exist-but-valid-shape`.
12. Confirm a clear URL restore error appears.
13. Confirm localStorage project is not opened after URL failure.
14. Confirm the failed URL remains in the address bar.
15. Open `/?project=../lesson-bad`.
16. Confirm no backend project load is attempted for the malformed id if visible in network/logs.
17. Confirm the app falls back to demo and shows a clear invalid URL id error.
18. Remove the URL project param and set localStorage to a valid saved id.
19. Refresh and confirm localStorage restore still works and syncs the URL.
20. Confirm Save and Duplicate are disabled while startup restore is loading.
21. Confirm editable demo content is not shown while startup restore is loading.
22. Confirm New/Open/Duplicate/Save work after restore success and failure.

## Verification Commands

Run:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Run targeted checks:

```sh
rg -n "projectQueryParam|readProjectIdFromSearch|getProjectRestoreCandidateFromUrl|buildUrlWithProjectId|replaceUrlProjectId|URLSearchParams|history\\.replaceState|window\\.location|location\\.search|\\?project|source === \"url\"|source === 'url'" frontend/src frontend/test
rg -n "lessonSourceBuilder:lastProjectId|lastProjectStorageKey|readLastProjectId|writeLastProjectId|clearLastProjectId|isLikelySafeProjectId|localStorage" frontend/src frontend/test
rg -n "history\\.pushState|JSON\\.stringify\\(lesson|JSON\\.stringify\\(.*lesson|localStorage\\.setItem|setItem\\([^,]+,\\s*JSON" frontend/src frontend/test
```

Expected:

- The first search shows URL helper and App integration.
- The second search shows Stage 3 localStorage behavior still present.
- The third search shows no `pushState`, no full lesson browser-storage payload, and no rich JSON stored in localStorage.

If a command cannot run, state exactly why.

## Acceptance Criteria

This remediation is complete when:

- `frontend/src/utils/projectSessionUrl.js` exists.
- `frontend/test/projectSessionUrl.test.js` exists.
- URL helper functions are tested.
- URL query parameter name is exactly `project`.
- Startup reads URL `project` before localStorage.
- Valid URL project ids restore through the existing backend project API.
- URL restore success updates app state like manual open.
- URL restore success writes localStorage to the restored project id.
- URL restore failure does not fall through to localStorage.
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

Keep the response focused on Stage 4 remediation.
