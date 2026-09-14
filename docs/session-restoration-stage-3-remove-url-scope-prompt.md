# Session Restoration Stage 3 URL Scope Remediation Prompt

Use this prompt to fix the Stage 3 review findings where Stage 4 URL restoration/synchronization was accidentally implemented too early.

## Prompt

You are remediating Stage 3 of the Lesson Source Builder session restoration work.

Stage 3 must remain localStorage-only. A review found that Stage 4 URL behavior was added during Stage 3:

- `frontend/src/App.jsx` reads a URL restore candidate and restores it through `restoreSavedProject(urlCandidate.projectId, "url")`.
- `frontend/src/App.jsx` synchronizes active project ids into the URL through `replaceUrlProjectId(projectId)`.
- `frontend/src/utils/projectSessionUrl.js` adds URL parsing/synchronization utilities.
- `frontend/test/projectSessionUrl.test.js` adds URL helper tests.

Your job is to remove Stage 4 runtime behavior from the Stage 3 implementation while preserving all accepted Stage 3 fixes:

- localStorage-based startup restoration.
- Safe localStorage helper behavior.
- Blocked `window.localStorage` access fix.
- Project/stage loading guards.
- Loading panel instead of editable demo content during restore.

Do not implement Stage 4 in this remediation. Do not add URL parsing, URL precedence, URL synchronization, `history.replaceState`, `history.pushState`, autosave, export generation, auth, cloud sync, backend storage changes, or project API changes.

## Findings To Fix

Fix these exact findings:

```text
[P1] App.jsx now implements URL restoration during Stage 3.
Evidence: startup reads a URL candidate and restores it via restoreSavedProject(urlCandidate.projectId, "url").

[P1] App.jsx now synchronizes active project changes into the URL.
Evidence: setActiveProjectIdAndRef(projectId) calls replaceUrlProjectId(projectId), which uses history.replaceState.

[P1] projectSessionUrl.js and projectSessionUrl.test.js add Stage 4 URL parsing/sync utilities and tests.
Evidence: these files should not be part of the Stage 3 localStorage-only change.
```

## Required End State

After remediation:

- Stage 3 startup restore reads only `lessonSourceBuilder:lastProjectId` from localStorage.
- Startup restore does not inspect `window.location`, `location.search`, `URLSearchParams`, or a `project` query parameter.
- Startup restore does not distinguish `source === "url"`.
- A valid stored localStorage id still restores through `getProject(projectId)`.
- Malformed localStorage values are still cleared without backend calls.
- Missing/deleted/stale localStorage ids are still cleared after failed restore.
- Restore success still normalizes and validates the loaded lesson.
- Restore success still sets `lesson`, `activeProjectId`, `activeProjectIdRef`, `saveStatus`, clears transient state, clears project errors, and resets media readiness.
- Restore failure still falls back to `demoLesson` without crashing.
- `setActiveProjectIdAndRef(projectId)` still writes valid project ids to localStorage.
- `setActiveProjectIdAndRef(projectId)` no longer calls URL helpers or mutates the browser URL.
- No Stage 4 URL helper is imported by runtime code.
- `frontend/src/utils/projectSessionUrl.js` is deleted unless it is needed by some already-approved non-Stage-3 scope. In this remediation, deletion is expected.
- `frontend/test/projectSessionUrl.test.js` is deleted unless URL helper runtime code is intentionally retained for a separately approved Stage 4 branch. In this remediation, deletion is expected.
- Stage 4 documentation prompts may remain in `docs/`; they are not runtime behavior.
- The app still blocks project and stage actions while `loadStatus === "loading"`.
- The app still renders a loading panel instead of editable demo content during startup/project loading.
- localStorage still stores only the project id pointer.
- No backend files are changed.

## Files To Inspect

Inspect these files before editing:

```text
docs/session-restoration-stage-3-localstorage-prompt.md
docs/session-restoration-stage-3-review-prompt.md
docs/session-restoration-stage-2-restore-rules.md
frontend/src/App.jsx
frontend/src/utils/projectSessionStorage.js
frontend/test/projectSessionStorage.test.js
frontend/src/components/Sidebar.jsx
frontend/src/utils/projectSessionUrl.js
frontend/test/projectSessionUrl.test.js
frontend/src/api/projects.js
```

If code has moved, inspect the equivalent files.

## Commands To Run Before Editing

Use these to locate Stage 4 leakage:

```sh
git status --short
rg -n "projectSessionUrl|getProjectRestoreCandidateFromUrl|readProjectIdFromSearch|replaceUrlProjectId|buildUrlWithProjectId|projectQueryParam|URLSearchParams|window\\.location|location\\.search|history\\.replaceState|history\\.pushState|\\?project|source === \"url\"|source === 'url'" frontend/src frontend/test
rg -n "readLastProjectId|writeLastProjectId|clearLastProjectId|isLikelySafeProjectId|lessonSourceBuilder:lastProjectId|restoreSavedProject|setActiveProjectIdAndRef|isProjectLoading|loadStatus === \"loading\"" frontend/src frontend/test
sed -n '150,235p' frontend/src/App.jsx
sed -n '1318,1338p' frontend/src/App.jsx
sed -n '1,180p' frontend/src/utils/projectSessionUrl.js
sed -n '1,220p' frontend/test/projectSessionUrl.test.js
```

## Implementation Guidance

### Remove URL Imports

In `frontend/src/App.jsx`, remove imports from:

```text
./utils/projectSessionUrl.js
```

Expected removed symbols include:

```text
getProjectRestoreCandidateFromUrl
replaceUrlProjectId
```

No runtime file should import `projectSessionUrl.js` after remediation.

### Restore LocalStorage-Only Startup

Replace the startup restore flow with Stage 3 localStorage-only behavior.

Expected shape:

```js
useEffect(() => {
  let cancelled = false;

  async function restoreLastProject() {
    setLoadStatus("loading");

    const projectId = readLastProjectId();
    if (!projectId) {
      if (!cancelled) setLoadStatus("idle");
      return;
    }

    try {
      const restoredLesson = normalizeAndValidateLoadedLesson(
        await getProject(projectId)
      );
      if (cancelled) return;

      hasPendingLessonChange.current = false;
      setLesson(restoredLesson);
      setActiveProjectIdAndRef(restoredLesson.id);
      clearTransientInputs();
      resetMediaReadiness();
      setSaveStatus("saved");
      setProjectError("");
      setLoadStatus("loaded");
      await loadProjectList({ quiet: true });
    } catch {
      clearLastProjectId();
      if (cancelled) return;

      hasPendingLessonChange.current = false;
      setLesson(demoLesson);
      setActiveProjectIdAndRef(null);
      clearTransientInputs();
      resetMediaReadiness();
      setSaveStatus("unsaved");
      setLoadStatus("idle");
      setProjectError("The last lesson could not be restored.");
      await loadProjectList({ quiet: true });
    }
  }

  restoreLastProject();

  return () => {
    cancelled = true;
  };
}, []);
```

The exact structure can differ, but the behavior must not read from URL or branch on a URL source.

### Remove URL Sync

In `setActiveProjectIdAndRef(projectId)`, keep localStorage persistence and remove URL synchronization.

Expected behavior:

```js
function setActiveProjectIdAndRef(projectId) {
  activeProjectIdRef.current = projectId;
  setActiveProjectId(projectId);
  if (isLikelySafeProjectId(projectId)) {
    writeLastProjectId(projectId);
  }
}
```

There should be no `replaceUrlProjectId(projectId)` call in Stage 3.

### Delete URL Helper Files

Delete these Stage 4 files from the Stage 3 implementation:

```text
frontend/src/utils/projectSessionUrl.js
frontend/test/projectSessionUrl.test.js
```

Use `apply_patch` delete hunks or another safe non-destructive edit method for your own newly added files. Do not delete unrelated user files.

Do not delete Stage 4 prompt documents under `docs/`; those are planning artifacts and may be used later.

### Preserve Stage 3 Fixes

Do not regress the already accepted fixes:

- `frontend/src/utils/projectSessionStorage.js` must still wrap `window.localStorage` property access in `try/catch`.
- `frontend/test/projectSessionStorage.test.js` must still test blocked default storage access.
- `frontend/src/App.jsx` must still include project loading in the shared disabled state.
- `frontend/src/App.jsx` must still block stage changes while project loading is active.
- `frontend/src/App.jsx` must still render a loading panel instead of editable demo stage content while `loadStatus === "loading"`.
- `frontend/src/components/Sidebar.jsx` must still disable New/Open/Duplicate/Save and stage nav while project loading is active.

## Tests

Update tests to match Stage 3 scope:

- Keep `frontend/test/projectSessionStorage.test.js`.
- Keep all localStorage helper tests.
- Keep the blocked `window.localStorage` access test.
- Remove `frontend/test/projectSessionUrl.test.js`.
- Do not replace URL tests with new URL tests in Stage 3.

No App startup test is required if the current frontend test setup cannot reasonably mount React. If there are existing App tests, make sure they assert localStorage-only startup behavior for Stage 3.

## Verification Commands

Run:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Run targeted checks:

```sh
rg -n "projectSessionUrl|getProjectRestoreCandidateFromUrl|readProjectIdFromSearch|replaceUrlProjectId|buildUrlWithProjectId|projectQueryParam|URLSearchParams|window\\.location|location\\.search|history\\.replaceState|history\\.pushState|\\?project|source === \"url\"|source === 'url'" frontend/src frontend/test
rg -n "lessonSourceBuilder:lastProjectId|lastProjectStorageKey|readLastProjectId|writeLastProjectId|clearLastProjectId|isLikelySafeProjectId|localStorage" frontend/src frontend/test
rg -n "JSON\\.stringify\\(lesson|JSON\\.stringify\\(.*lesson|localStorage\\.setItem|setItem\\([^,]+,\\s*JSON" frontend/src frontend/test
```

Expected:

- The first search returns no matches.
- The second search shows only Stage 3 localStorage helper, tests, and App integration.
- The third search shows no full lesson JSON stored in localStorage.

Also confirm deleted files are gone:

```sh
test ! -e frontend/src/utils/projectSessionUrl.js
test ! -e frontend/test/projectSessionUrl.test.js
```

If a command cannot run, state exactly why.

## Manual QA Checklist

Manual browser QA is recommended because this is startup behavior:

```sh
npm run dev
```

Then verify:

1. Clear localStorage.
2. Open `http://127.0.0.1:5173/`.
3. Confirm the app starts with the demo lesson.
4. Create or save a lesson.
5. Confirm localStorage contains only `lessonSourceBuilder:lastProjectId`.
6. Confirm the URL does not gain `?project=...`.
7. Refresh the browser.
8. Confirm localStorage restore still reopens the saved project.
9. Confirm the URL still does not gain `?project=...`.
10. Open `http://127.0.0.1:5173/?project=lesson-some-id`.
11. Confirm Stage 3 does not restore from the URL parameter.
12. Confirm URL presence does not override localStorage in Stage 3.
13. Confirm Save and Duplicate are disabled while startup restore is loading.
14. Confirm the editable demo stage is not shown while startup restore is loading.
15. Confirm New/Open/Duplicate/Save work after restore success and restore failure.

## Acceptance Criteria

This remediation is complete when:

- All Stage 4 URL runtime behavior is removed from the Stage 3 code.
- No frontend source or test file imports or references `projectSessionUrl`.
- No frontend source or test file references `URLSearchParams`, `window.location.search`, `location.search`, `history.replaceState`, `history.pushState`, or `?project`.
- `frontend/src/utils/projectSessionUrl.js` is deleted.
- `frontend/test/projectSessionUrl.test.js` is deleted.
- localStorage startup restore still works.
- localStorage helper safety tests still pass.
- Blocked `window.localStorage` access remains non-fatal.
- Loading guards remain in place for project actions, stage actions, and stage rendering.
- localStorage stores only a project id pointer.
- No backend files are changed.
- Frontend tests pass.
- Server tests pass.
- Frontend build passes.

## Expected Final Response

Report:

- Files changed.
- Which URL restoration/sync code was removed.
- Which Stage 3 localStorage and loading protections were preserved.
- Tests and builds run with results.
- Targeted search results confirming no URL behavior remains.
- Manual QA performed or skipped.

Keep the response focused on restoring Stage 3 scope. Do not propose or implement Stage 4 in this remediation.
