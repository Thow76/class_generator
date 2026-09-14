# Session Restoration Stage 5 Review Prompt

Use this prompt to review whether Stage 5, Clear Invalid Restore State, was implemented correctly.

## Prompt

You are reviewing Stage 5 of the Lesson Source Builder session restoration work.

Stage 5 was intended to add a user-controlled recovery path for invalid restore state after Stage 4 URL/localStorage restoration. Review Stage 5 only. Do not implement fixes unless explicitly asked afterward.

The Stage 5 contract is:

- Failed or malformed URL restore remains visible immediately after startup failure.
- The user can explicitly clear the failed URL restore request.
- Clearing removes only the URL `project` restore pointer, preserving unrelated URL state.
- Clearing uses `history.replaceState`, not `history.pushState`.
- Clearing matching stale localStorage is allowed only when it contains the same failed URL project id.
- Clearing malformed URL state must not clear unrelated valid localStorage.
- Stage 3 and Stage 4 restoration behavior remains intact.
- No backend project data, backend APIs, autosave, export, auth, cloud sync, or full browser-stored lesson payloads are introduced.

## Expected Files

Inspect these files at minimum:

```text
docs/session-restoration-stage-5-clear-invalid-restore-state-prompt.md
docs/session-restoration-stage-4-review-prompt.md
docs/session-restoration-stage-2-restore-rules.md
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
package.json
frontend/package.json
server/package.json
```

If the implementation uses different file names, inspect the equivalent files. If URL clearing helpers or equivalent tests are missing, treat that as a likely finding.

## Required Behavior To Verify

Stage 5 passes only if:

- URL restore precedence from Stage 4 remains intact.
- Failed URL restore does not fall back to localStorage.
- Malformed URL restore does not call the backend.
- Failed or malformed URL restore leaves the failed URL visible immediately after startup.
- A clear recovery action is visible after URL restore failure or malformed URL restore.
- The clear action is not shown for ordinary project errors unrelated to URL restore state.
- The clear action removes the `project` query parameter from the current URL.
- The clear action removes all `project` query params if duplicates exist.
- The clear action preserves unrelated query params where practical.
- The clear action preserves the hash fragment where practical.
- The clear action uses `history.replaceState`, not `history.pushState`.
- The clear action does not reload the page.
- The clear action leaves the app usable on the demo lesson with no active project id and `saveStatus` set to `unsaved`.
- The clear action clears project error/restore issue state after successful clearing.
- The clear action clears localStorage only when the stored id equals the failed URL project id.
- The clear action does not clear unrelated valid localStorage when the URL project was malformed or different from the stored id.
- Malformed localStorage values continue to be cleared automatically by `projectSessionStorage`.
- Failed localStorage restore still clears `lessonSourceBuilder:lastProjectId` and falls back softly to the demo lesson.
- Successful create/save/open/duplicate/restore/server-applied project transitions clear stale restore issue UI.
- Successful create/save/open/duplicate/restore/server-applied project transitions still write localStorage and sync the URL to the active project id.
- localStorage still stores only the project id pointer.
- Backend storage format and project API contracts are unchanged.

## URL Helper Review Checks

Review `frontend/src/utils/projectSessionUrl.js` or equivalent.

Confirm:

1. `buildUrlWithoutProjectId()` or equivalent exists.
2. It removes a single `project` query parameter.
3. It removes multiple `project` query parameters.
4. It preserves unrelated query params.
5. It preserves hash fragments.
6. It returns app-relative output for app-relative input.
7. It does not force absolute URLs for local app paths.
8. It no-ops or returns the original URL/path when no `project` param exists.
9. It does not throw on invalid/unavailable URL inputs.
10. `clearUrlProjectId()` or equivalent exists.
11. `clearUrlProjectId()` calls `history.replaceState`.
12. `clearUrlProjectId()` does not call `history.pushState`.
13. `clearUrlProjectId()` does not call `replaceState` when there is no `project` param to clear.
14. `clearUrlProjectId()` does not throw when browser APIs are missing or throwing.
15. Existing Stage 4 helpers still behave as before: parse URL candidate, sync valid project ids, preserve params/hash, and reject invalid ids.

## App Integration Review Checks

Review `frontend/src/App.jsx` or equivalent.

Confirm:

1. The app tracks URL restore failure/malformed state distinctly enough to drive recovery UI.
2. Malformed URL startup sets a clearable restore issue.
3. Failed valid-looking URL startup sets a clearable restore issue.
4. Failed URL startup does not clear the URL automatically.
5. Failed URL startup does not restore localStorage after URL failure.
6. Failed URL startup does not clear unrelated localStorage.
7. Failed localStorage restore still clears stale localStorage automatically.
8. The clear handler calls the URL clearing helper only in response to explicit user action.
9. The clear handler clears matching localStorage only when the failed URL project id equals the stored localStorage id.
10. The clear handler does not clear localStorage for malformed URL values with `projectId: null`.
11. The clear handler resets the app to demo/unsaved/no-active-project state without saving.
12. The clear handler uses `setActiveProjectIdAndRef(null, { syncUrl: false })` or equivalent so it does not immediately re-sync a bad URL or write invalid storage.
13. The clear handler clears `projectError` and restore issue state.
14. The clear handler does not call the backend.
15. Successful create/save/open/duplicate/restore paths clear stale restore issue state.
16. Existing Stage 4 URL synchronization remains attached to successful active-project transitions.
17. Startup loading guards still block project/stage mutation while restoration is loading.
18. The editable demo stage is still not shown while startup restoration is pending.

## Sidebar/UI Review Checks

Review `frontend/src/components/Sidebar.jsx` or equivalent.

Confirm:

1. A clear recovery button appears near the URL restore error.
2. The button copy is concise, for example `Clear request` or `Remove from URL`.
3. The button is a `<button>`, not a link.
4. The button is disabled while project loading is active.
5. The button calls the clear handler from project controls.
6. The button is shown only for clearable URL restore issues.
7. The button is not shown for ordinary save/open/list errors.
8. The UI does not expose raw stack traces, absolute file paths, temp paths, or internal exception details.

## Test Review Checks

Review `frontend/test/projectSessionUrl.test.js` and any additional Stage 5 tests.

Confirm tests cover:

- Removing one `project` param.
- Removing multiple `project` params.
- Preserving unrelated query params.
- Preserving hash fragments.
- App-relative output.
- No-op behavior when `project` is absent.
- Missing/throwing browser APIs.
- `clearUrlProjectId()` uses `replaceState`.
- `clearUrlProjectId()` does not use `pushState`.
- No `replaceState` call when URL is already clear.

If restore issue logic was extracted into a pure helper, confirm tests cover:

- URL malformed issue is clearable.
- URL load-failed issue is clearable.
- Matching stale localStorage is cleared.
- Unrelated valid localStorage is not cleared.
- Malformed URL state does not clear unrelated localStorage.

If no app-level automated tests exist, note that residual risk and rely on manual QA for the UI behavior.

## Failure Cases To Probe

Open findings for any of these:

- The app clears the failed URL automatically during startup, before the user sees it.
- The clear button is missing after URL restore failure.
- The clear button appears for unrelated project errors.
- Clearing removes unrelated query params or hash fragments.
- Clearing uses `pushState`.
- Clearing reloads the page.
- Clearing removes only the first duplicate `project` param.
- Clearing a malformed URL also clears unrelated valid localStorage.
- Clearing a failed URL does not clear matching stale localStorage, causing the same id to be retried from localStorage after refresh.
- Clearing calls the backend or saves the demo lesson.
- Successful project transitions leave stale restore error UI visible.
- Stage 4 URL restore precedence regresses.
- Stage 3 localStorage safety regresses.
- localStorage stores full lesson JSON or other rich payloads.
- Backend routes, project store behavior, or project file layout changed unnecessarily.

## Commands To Run

Start with source inspection:

```sh
git status --short
sed -n '1,436p' docs/session-restoration-stage-5-clear-invalid-restore-state-prompt.md
sed -n '1,220p' frontend/src/utils/projectSessionUrl.js
sed -n '1,330p' frontend/test/projectSessionUrl.test.js
sed -n '150,250p' frontend/src/App.jsx
sed -n '360,410p' frontend/src/App.jsx
sed -n '1240,1285p' frontend/src/App.jsx
sed -n '1320,1345p' frontend/src/App.jsx
sed -n '1,160p' frontend/src/components/Sidebar.jsx
```

Inspect integration and scope:

```sh
rg -n "buildUrlWithoutProjectId|clearUrlProjectId|restoreIssue|setRestoreIssue|onClearRestoreIssue|Clear request|Remove from URL|history\\.replaceState|history\\.pushState" frontend/src frontend/test
rg -n "projectSessionUrl|getProjectRestoreCandidateFromUrl|replaceUrlProjectId|readLastProjectId|writeLastProjectId|clearLastProjectId|lessonSourceBuilder:lastProjectId|setActiveProjectIdAndRef|restoreSavedProject|restoreStartupProject" frontend/src frontend/test
rg -n "JSON\\.stringify\\(lesson|JSON\\.stringify\\(.*lesson|localStorage\\.setItem|setItem\\([^,]+,\\s*JSON|IndexedDB|indexedDB|firebase|auth|login|account|cloud|session" frontend/src frontend/test server/src package.json frontend/package.json server/package.json
```

Run verification:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If any command cannot run, state exactly why.

## Manual QA Checklist

Manual browser QA is strongly recommended because Stage 5 is UI and browser-history behavior.

Run:

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
8. Confirm the app remains on demo, active project is empty, and save status is unsaved.
9. Refresh and confirm the malformed URL restore is not retried.
10. Set localStorage to a valid saved project A.
11. Open `/?project=lesson-valid-shape-but-missing`.
12. Confirm URL failure is shown and project A is not opened.
13. Click the clear recovery button.
14. Confirm the URL project param is removed.
15. Confirm localStorage project A remains untouched.
16. Refresh without `project` and confirm project A can restore from localStorage.
17. Set localStorage to the same missing id as the failed URL.
18. Open the missing URL again and clear it.
19. Confirm localStorage is cleared so refresh does not retry the same stale id.
20. After clearing, create/save a new lesson and confirm URL/localStorage update to the new valid project id.
21. Open and duplicate existing projects after clearing and confirm normal Stage 4 URL sync still works.
22. Trigger an ordinary save/open/list error if practical and confirm the clear restore button is not shown for that unrelated error.

If manual QA is not run, state that explicitly.

## Report Format

Return findings first, ordered by severity:

```text
**Findings**

- [P1] [file (line N)](...): Description of the bug, why it violates Stage 5, and the likely user impact.
- [P2] ...
```

Then include:

```text
**Checks**

- URL clear helper behavior:
- App restore issue state:
- Sidebar recovery UI:
- Stage 3/4 regression scope:
- Storage/backend scope:

**Verification**

- `npm run test --workspace frontend`: passed/failed/not run
- `npm run test --workspace server`: passed/failed/not run
- `npm run build --workspace frontend`: passed/failed/not run
- Manual browser QA: run/not run, with notes
```

If there are no findings, say that clearly and mention any residual manual-QA or app-level test gaps.
