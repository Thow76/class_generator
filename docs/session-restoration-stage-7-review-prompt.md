# Session Restoration Stage 7 Review Prompt

Use this prompt to review whether Stage 7, Auto-Reopen Last Lesson, was implemented correctly.

## Prompt

You are reviewing Stage 7 of the Lesson Source Builder session restoration work.

Stage 7 was intended to add a final startup fallback: when there is no URL `project` request and no valid localStorage last-project pointer, the app should auto-reopen the most recently updated saved lesson from the saved-project list. Review Stage 7 only. Do not implement fixes unless explicitly asked afterward.

The Stage 7 contract is:

- URL restore remains the highest-priority explicit restore source.
- Malformed or failed URL restore does not fall through to localStorage or auto-reopen.
- localStorage restore remains higher priority than auto-reopen.
- Failed localStorage restore does not silently open a different project through auto-reopen in the same startup flow.
- Auto-reopen only runs when no URL candidate and no localStorage candidate exist.
- Auto-reopen uses project-list metadata only to choose a candidate.
- Auto-reopen loads the actual lesson through `getProject(projectId)`.
- Auto-reopen success applies normal saved-project state, writes localStorage, and syncs the URL.
- Auto-reopen failure falls back safely to the demo lesson.
- Stages 3-6 behavior remains intact.
- Backend API/storage scope remains unchanged.

## Expected Files

Inspect these files at minimum:

```text
docs/session-restoration-stage-7-auto-reopen-last-lesson-prompt.md
docs/session-restoration-stage-6-review-prompt.md
docs/session-restoration-stage-5-review-prompt.md
docs/session-restoration-stage-4-review-prompt.md
docs/session-restoration-stage-2-restore-rules.md
frontend/src/App.jsx
frontend/src/utils/projectAutoReopen.js
frontend/test/projectAutoReopen.test.js
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
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

If the implementation uses different file names, inspect the equivalent files. If candidate selection is embedded in `App.jsx` rather than a helper, review that code and note the reduced testability if it lacks coverage.

## Required Behavior To Verify

Stage 7 passes only if:

- Valid URL `project` restore behavior from Stage 4 is unchanged.
- Malformed URL `project` still shows the Stage 4/5 invalid URL state and does not auto-reopen another lesson.
- Failed URL restore still does not fall back to localStorage or auto-reopen.
- Valid localStorage restore behavior from Stage 3 is unchanged.
- Failed localStorage restore still clears the stale pointer and does not auto-reopen a different lesson during that startup flow.
- Auto-reopen runs only when URL has no `project` candidate and `readLastProjectId()` returns `null`.
- Auto-reopen obtains project-list metadata through the existing `listProjects()`/`loadProjectList()` path.
- Auto-reopen does not rely on React state immediately after `setProjectList()`; it uses the returned project list value or an equivalent reliable source.
- Auto-reopen selects the most recently updated valid saved project.
- Candidate selection rejects unsafe ids using `isLikelySafeProjectId()` or equivalent.
- Candidate selection does not mutate the project list array in place.
- Candidate selection prefers candidates without metadata errors where possible.
- Auto-reopen loads only the selected candidate through `getProject(projectId)`.
- If the selected candidate fails to load, the app does not cascade through arbitrary older projects.
- Auto-reopen success normalizes and validates the loaded lesson before applying it.
- Auto-reopen success sets `lesson`, `activeProjectId`, `activeProjectIdRef`, `saveStatus`, transient input state, media readiness, project errors, and restore issue state consistently with manual open/localStorage restore.
- Auto-reopen success writes `lessonSourceBuilder:lastProjectId` to the reopened id.
- Auto-reopen success syncs the URL to `?project=<id>` through `history.replaceState`.
- Auto-reopen failure falls back to demo/no active project and does not mutate URL state.
- Auto-reopen failure does not clear unrelated localStorage.
- Auto-reopen failure does not expose stack traces, absolute paths, temp paths, or internal details.
- Startup list loading from Stage 6 remains list-specific and race-safe.
- Stage 5 clear-invalid-restore behavior still works.
- Browser storage still stores only the last project id pointer.
- Backend routes/storage format are unchanged unless explicitly justified and tested.

## Candidate Helper Review Checks

Review `frontend/src/utils/projectAutoReopen.js` or equivalent.

Confirm:

1. Missing/non-array input returns `null`.
2. Empty list returns `null`.
3. Unsafe project ids are skipped.
4. Safe ids use the same lightweight validation as Stage 3, ideally `isLikelySafeProjectId()`.
5. The most recently updated valid project is selected.
6. If backend order is trusted instead of sorting, that assumption is documented by surrounding code/tests.
7. If frontend sorting is implemented, it sorts a copy and does not mutate the original list.
8. Missing or invalid `updatedAt` values are handled predictably.
9. Candidates with metadata `error` are skipped or deprioritized when a safe readable candidate exists.
10. The helper returns `null` if no valid candidate exists.
11. The helper does not call backend APIs or mutate browser state.

## App Integration Review Checks

Review `frontend/src/App.jsx` or equivalent.

Confirm:

1. Startup restore checks URL candidate before localStorage.
2. URL valid branch returns after attempting URL restore.
3. URL malformed branch returns and does not proceed to auto-reopen.
4. localStorage branch returns after attempting localStorage restore.
5. Auto-reopen branch exists only after URL and localStorage absence checks.
6. Auto-reopen branch calls `loadProjectList()` or `listProjects()` in a way that returns the fetched projects reliably.
7. Auto-reopen branch handles list-load failure as no auto-reopen candidate, not as a restore failure that breaks the app.
8. Auto-reopen branch selects a candidate and calls the same restore helper with source such as `"autoReopen"`.
9. Restore helper handles `"autoReopen"` success like a saved restore.
10. Restore helper handles `"autoReopen"` failure softly.
11. Auto-reopen failure does not call `clearLastProjectId()` unless there is a narrowly justified matching stale pointer, which normally should not exist when auto-reopen runs.
12. Auto-reopen failure does not call URL clear/sync helpers.
13. Every startup path exits loading state unless cancelled/unmounted.
14. Cancellation/unmount guards remain intact.
15. `loadProjectList()` still returns project arrays for the auto-reopen path and remains race-safe.
16. Stage 6 separate `projectListStatus`/`projectListError` behavior remains intact.
17. Successful create/save/open/duplicate/server-applied updates still refresh the project list.

## Test Review Checks

Review `frontend/test/projectAutoReopen.test.js` and any related tests.

Confirm tests cover:

- Empty/missing input returns `null`.
- First valid safe id is chosen from an already sorted list, if backend order is used.
- Unsafe ids are skipped.
- Metadata-error candidates are skipped or deprioritized when a readable candidate exists.
- No valid candidate returns `null`.
- Sorting by `updatedAt` descending, if implemented.
- The original list is not mutated.
- Missing/invalid `updatedAt` values are handled predictably.

If startup restore decision logic was extracted, confirm tests cover:

- URL candidate prevents auto-reopen.
- Malformed URL candidate prevents auto-reopen.
- localStorage candidate prevents auto-reopen.
- localStorage failure does not cascade to auto-reopen in the same startup flow.
- No URL/no localStorage with list candidate triggers auto-reopen.
- Auto-reopen success writes localStorage and syncs URL through the existing active-project setter.
- Auto-reopen failure falls back to demo without URL/localStorage mutation.

If no app-level automated coverage exists for startup auto-reopen, note that as residual risk and rely on manual QA.

## Failure Cases To Probe

Open findings for any of these:

- Auto-reopen runs even when a URL `project` is present.
- Auto-reopen runs after malformed URL restore.
- Auto-reopen runs after failed URL restore.
- Auto-reopen runs after localStorage restore failure.
- Startup restore waits for project list before trying explicit URL restore.
- Auto-reopen opens a project directly from list metadata without calling `getProject()`.
- Candidate selection accepts unsafe ids.
- Candidate selection mutates the `projectList` array in place.
- Auto-reopen cascades through multiple projects after the first candidate fails.
- Auto-reopen failure clears unrelated localStorage or mutates the URL.
- Auto-reopen success does not write localStorage.
- Auto-reopen success does not sync the URL.
- Auto-reopen success leaves stale restore errors visible.
- Stage 6 list loading becomes global project loading again.
- Stage 5 clear invalid restore no longer works.
- Browser storage now contains full lesson JSON or rich payloads.
- Backend API/storage behavior changed unnecessarily.

## Commands To Run

Start with source inspection:

```sh
git status --short
sed -n '1,386p' docs/session-restoration-stage-7-auto-reopen-last-lesson-prompt.md
sed -n '185,300p' frontend/src/App.jsx
sed -n '390,430p' frontend/src/App.jsx
sed -n '1488,1525p' frontend/src/App.jsx
sed -n '1,180p' frontend/src/utils/projectAutoReopen.js
sed -n '1,180p' frontend/test/projectAutoReopen.test.js
sed -n '1,90p' frontend/src/utils/projectSessionStorage.js
sed -n '1,180p' frontend/src/utils/projectSessionUrl.js
sed -n '1,80p' server/src/services/projectStore.js
```

Inspect symbols and scope:

```sh
rg -n "autoReopen|selectAutoReopen|projectAutoReopen|restoreSavedProject|restoreStartupProject|readLastProjectId|getProjectRestoreCandidateFromUrl|loadProjectList|listProjects|getProject\\(" frontend/src frontend/test
rg -n "lessonSourceBuilder:lastProjectId|localStorage\\.setItem|JSON\\.stringify\\(lesson|setItem\\([^,]+,\\s*JSON|history\\.replaceState|history\\.pushState" frontend/src frontend/test
rg -n "router\\.get\\(\"/\"|listProjects\\(|readProjectMetadata|projectsDir|writeProjectFiles|delete|rm|unlink|rmdir" server/src server/test
```

Run verification:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If any command cannot run, state exactly why.

## Manual QA Checklist

Manual browser QA is strongly recommended because Stage 7 is startup behavior.

Run:

```sh
npm run dev
```

Then verify:

1. Clear localStorage.
2. Open the app with no `?project` URL.
3. Confirm the saved-project list loads on startup.
4. Confirm the most recently updated saved lesson auto-reopens.
5. Confirm the lesson is marked saved and the active project id is shown.
6. Confirm localStorage now contains `lessonSourceBuilder:lastProjectId` with that id.
7. Confirm the URL syncs to `?project=<id>`.
8. Refresh and confirm the URL restore path still works.
9. Clear the URL project param but leave localStorage intact.
10. Refresh and confirm localStorage restore wins over project-list auto-reopen.
11. Open with `/?project=<different-valid-id>` and confirm URL restore wins over localStorage and auto-reopen.
12. Open with `/?project=../bad` and confirm the app does not auto-reopen any other lesson.
13. Open with `/?project=lesson-valid-shape-but-missing` and confirm the app does not auto-reopen any other lesson.
14. Set localStorage to a valid-looking missing id and remove URL project.
15. Refresh and confirm localStorage failure behavior remains Stage 3 behavior without auto-reopening a different lesson.
16. Clear localStorage and make the most recent listed project fail to load if practical.
17. Confirm auto-reopen failure falls back to demo and does not mutate URL/localStorage.
18. Confirm Open panel list states from Stage 6 still work.
19. Confirm Stage 5 clear invalid restore request still works.

If manual QA is not run, state that explicitly.

## Report Format

Return findings first, ordered by severity:

```text
**Findings**

- [P1] [file (line N)](...): Description of the bug, why it violates Stage 7, and the likely user impact.
- [P2] ...
```

Then include:

```text
**Checks**

- Restore precedence:
- Auto-reopen candidate selection:
- Auto-reopen success/failure state:
- Stage 5/6 regression scope:
- Storage/backend scope:

**Verification**

- `npm run test --workspace frontend`: passed/failed/not run
- `npm run test --workspace server`: passed/failed/not run
- `npm run build --workspace frontend`: passed/failed/not run
- Manual browser QA: run/not run, with notes
```

If there are no findings, say that clearly and mention residual manual-QA or app-level test gaps.
