# Session Restoration Stage 3 Review Prompt

Use this prompt to review whether Stage 3 of the session restoration issue was implemented correctly.

## Prompt

You are reviewing Stage 3 of the Lesson Source Builder session restoration work.

Stage 3 was intended to implement localStorage-based restoration only. It should make the app remember the last active saved project id in localStorage and automatically restore that project from the backend project store on startup.

Review Stage 3 only. Do not implement URL restoration, URL synchronization, autosave, export generation, auth, account sync, cloud storage, backend API changes, project deletion UI, or later-stage behavior.

## Stage 3 Expected Scope

Stage 3 should implement:

- Safe localStorage helper functions.
- The exact localStorage key `lessonSourceBuilder:lastProjectId`.
- Startup restore from that localStorage key.
- Persistence of active project id after successful create, save, open, duplicate, server-applied project updates, and localStorage restore.
- Graceful fallback when the stored id is missing, malformed, stale, deleted, unreadable, or fails validation.
- Tests for the localStorage helper behavior.

Stage 3 should not implement:

- URL `project` parsing.
- URL precedence.
- URL synchronization.
- `history.replaceState` or `history.pushState`.
- Full lesson JSON storage in localStorage.
- Autosave of unsaved React state.
- Backend storage or API contract changes.

## Files To Inspect

Inspect these files at minimum:

```text
docs/session-restoration-stage-3-localstorage-prompt.md
docs/session-restoration-stage-2-restore-rules.md
frontend/src/App.jsx
frontend/src/utils/projectSessionStorage.js
frontend/test/projectSessionStorage.test.js
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
server/src/services/projectStore.js
server/src/routes/projects.js
package.json
frontend/package.json
server/package.json
```

If the implementation uses different file names, inspect the equivalent files.

## Required Behavior To Verify

The implementation is correct only if all of these are true:

- The localStorage key is exactly `lessonSourceBuilder:lastProjectId`.
- localStorage stores only a project id string.
- No full lesson JSON, image path bundle, media readiness result, export data, API response, or unsaved form state is stored in localStorage.
- localStorage access is wrapped so storage read/write/remove failures do not crash the app.
- The project id helper rejects obviously unsafe values before restoration requests.
- Backend validation remains authoritative.
- Startup reads the stored project id exactly once for normal app mounting.
- Startup with no stored id keeps the bundled `demoLesson` fallback.
- Startup with a malformed stored id clears the key and does not call the backend for that id.
- Startup with a valid-looking stored id attempts to load through the existing project API, normally `getProject(projectId)`.
- Successful startup restore normalizes and validates the loaded lesson before applying it.
- Successful startup restore sets `lesson`, `activeProjectId`, and `activeProjectIdRef` consistently.
- Successful startup restore leaves `saveStatus` as `saved`, not `unsaved`.
- Successful startup restore clears transient input and operation state consistently with manual open.
- Successful startup restore resets media readiness for the restored project.
- Successful startup restore keeps the Open panel closed unless it was already intentionally opened.
- Successful startup restore may quietly refresh the saved-project list.
- Failed startup restore clears the stale localStorage key.
- Failed startup restore falls back to `demoLesson` without crashing.
- Failed startup restore leaves New/Open/Duplicate/Save usable.
- Active project id persistence happens after successful create, save, open, duplicate, server-applied project updates, and localStorage restore.
- Invalid or null project ids are not written to localStorage.
- Unsaved React-only edits are not autosaved.
- No URL behavior was added in Stage 3.
- No backend project storage or API contract changed for this stage.

## Helper Review Checks

Review `frontend/src/utils/projectSessionStorage.js` or equivalent.

Confirm:

1. It exports the exact key `lessonSourceBuilder:lastProjectId`.
2. It exposes a lightweight project id validator such as `isLikelySafeProjectId(value)`.
3. The validator accepts normal backend-shaped ids like `lesson-20260911-102000-ab12cd34`.
4. The validator rejects non-strings.
5. The validator rejects blank strings.
6. The validator rejects strings with leading or trailing whitespace.
7. The validator rejects ids not starting with `lesson-`.
8. The validator rejects ids longer than 96 characters.
9. The validator rejects `/`, `\`, `..`, and null bytes.
10. The validator rejects spaces and unsafe punctuation.
11. The validator does not claim to replace backend validation.
12. `readLastProjectId()` returns a valid stored id.
13. `readLastProjectId()` returns `null` for missing storage values.
14. `readLastProjectId()` clears malformed stored values.
15. `readLastProjectId()` returns `null` when storage read throws.
16. `writeLastProjectId()` writes valid-looking ids only.
17. `writeLastProjectId()` ignores invalid ids.
18. `writeLastProjectId()` does not throw when storage write throws.
19. `clearLastProjectId()` removes the key.
20. `clearLastProjectId()` does not throw when storage remove throws.
21. The helper supports injected storage for tests or otherwise has deterministic tests.
22. The helper handles non-browser environments without crashing.

## App Integration Review Checks

Review `frontend/src/App.jsx` or equivalent.

Confirm:

1. The app imports the storage helpers.
2. There is a startup restore effect or equivalent one-time startup path.
3. The startup path safely reads `lessonSourceBuilder:lastProjectId`.
4. The startup path keeps the demo lesson if no stored id exists.
5. The startup path clears malformed localStorage values.
6. The startup path calls `getProject(projectId)` or the existing project API for valid-looking stored ids.
7. The startup path does not bypass frontend normalization and validation.
8. The startup path applies restored state in the same spirit as `openProject(projectId)`.
9. The startup path guards async completion after unmount/cancellation.
10. A successful restore calls the common active-project-id update path or otherwise writes localStorage consistently.
11. `setActiveProjectIdAndRef(projectId)` or an equivalent common helper writes valid active project ids to localStorage.
12. That helper does not write `null`, malformed, or unsafe ids.
13. Save/create/open/duplicate/server-update paths still flow through the persistence helper or otherwise write the key after success.
14. The app does not write the localStorage key before the backend has successfully created or saved the project.
15. Restore failure clears stale storage.
16. Restore failure does not clear unrelated backend data.
17. Restore failure leaves project actions usable.
18. Restore failure does not permanently leave the app in `loading`.
19. Restore success does not leave the app marked as dirty or unsaved.
20. Restore success does not leave stale media readiness for another project.
21. Restore success and failure do not introduce an infinite render/effect loop.
22. New/Open/Duplicate confirmation behavior for unsaved changes still works.
23. Existing health-check behavior still runs independently.

## URL Boundary Checks

Stage 3 must not add URL behavior.

Confirm there is no new use of:

```text
URLSearchParams
window.location.search
location.search
history.replaceState
history.pushState
?project
```

If any of these appear, determine whether they pre-existed or were introduced by Stage 3. Open a finding for new URL restoration or synchronization behavior.

Stage 4 will handle URL precedence later.

## Test Review Checks

Review `frontend/test/projectSessionStorage.test.js` or equivalent.

Confirm tests cover:

1. The exact localStorage key.
2. Valid project id acceptance.
3. Malformed id rejection.
4. Missing value read behavior.
5. Valid value read behavior.
6. Malformed value read-and-clear behavior.
7. Storage read exception behavior.
8. Valid write behavior.
9. Invalid write ignored behavior.
10. Storage write exception behavior.
11. Clear/remove behavior.
12. Storage remove exception behavior.

If App startup tests exist, confirm they cover:

1. No stored id -> demo fallback.
2. Valid stored id -> project API restore.
3. Successful restore -> saved status and active project id.
4. Malformed stored id -> key cleared and no backend call.
5. Missing/deleted project -> key cleared and demo fallback.

Do not require App startup tests if the existing frontend test setup cannot reasonably mount React components. If they are absent, note the residual manual QA risk.

## Commands To Run

Start with status and source inspection:

```sh
git status --short
git diff -- frontend/src/App.jsx frontend/src/utils/projectSessionStorage.js frontend/test/projectSessionStorage.test.js frontend/src/api/projects.js server/src server/test package.json frontend/package.json server/package.json
sed -n '1,260p' frontend/src/utils/projectSessionStorage.js
sed -n '1,260p' frontend/test/projectSessionStorage.test.js
```

Inspect App integration:

```sh
rg -n "readLastProjectId|writeLastProjectId|clearLastProjectId|isLikelySafeProjectId|lessonSourceBuilder:lastProjectId|setActiveProjectIdAndRef|restoreLastProject|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject|applyServerLesson" frontend/src/App.jsx frontend/src
```

Check URL boundary:

```sh
rg -n "URLSearchParams|window\\.location\\.search|location\\.search|history\\.replaceState|history\\.pushState|\\?project" frontend/src frontend/test
```

Check for forbidden localStorage payloads:

```sh
rg -n "localStorage\\.setItem|setItem\\(|JSON\\.stringify\\(lesson|JSON\\.stringify\\(.*lesson|lessonSourceBuilder:lastProjectId" frontend/src frontend/test
```

Run verification:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If any command cannot run, state exactly why.

## Manual QA Checklist

Run manual QA if practical:

```sh
npm run dev
```

Then verify:

1. Clear localStorage.
2. Open `http://127.0.0.1:5173/`.
3. Confirm the app starts with the demo lesson.
4. Create or save a lesson.
5. Confirm localStorage contains only `lessonSourceBuilder:lastProjectId` with the project id string.
6. Refresh the browser.
7. Confirm the saved project automatically reopens.
8. Confirm the sidebar shows the restored project id.
9. Confirm save status is `Saved`, not `Unsaved changes`.
10. Open a different saved lesson.
11. Confirm localStorage updates to the new project id.
12. Refresh and confirm the newly opened lesson restores.
13. Duplicate a lesson.
14. Confirm localStorage updates to the duplicate id.
15. Set localStorage to a malformed value.
16. Refresh and confirm the app falls back to the demo lesson and clears the key.
17. Set localStorage to a missing/deleted `lesson-...` id.
18. Refresh and confirm the app falls back to the demo lesson and clears the key.
19. Confirm no `?project=` behavior is present.
20. Confirm New/Open/Duplicate/Save still work after a restore failure.

Manual QA is especially useful because this stage includes startup behavior that may not be fully covered by `node --test`.

## Findings Guidance

Use a code-review style response.

Lead with findings, ordered by severity. Use exact file and line references. Open a finding if:

- The localStorage key is not exactly `lessonSourceBuilder:lastProjectId`.
- The app stores full lesson data or other rich payloads in localStorage.
- The app fails to persist the active project id after successful project transitions.
- Startup does not attempt to restore a valid stored project id.
- Startup calls the backend for obviously malformed stored ids.
- Malformed or stale stored ids are not cleared.
- Restore success leaves the app marked unsaved.
- Restore success bypasses normalization or validation.
- Restore failure crashes, stays stuck loading, or blocks project actions.
- localStorage exceptions can crash the app.
- URL parsing or URL synchronization was implemented in Stage 3.
- Backend storage or project API contracts changed unnecessarily.
- Test coverage misses the storage helper failure cases.
- Manual QA or verification results are misreported.

If no issues are found, say that clearly and mention residual risk, especially if startup behavior was not manually tested.

## Acceptance Criteria

Stage 3 passes review only if:

- Safe localStorage helper functions exist and are tested.
- The key is exactly `lessonSourceBuilder:lastProjectId`.
- Only a project id string is stored.
- The active project id is persisted after successful create, save, open, duplicate, server-applied project updates, and localStorage restore.
- Startup attempts to restore a valid stored id.
- Startup restore uses backend project data through the existing API.
- Restored lessons are normalized and validated before being applied.
- Restore success leaves the app in a saved, active-project state.
- Restore failure clears stale or malformed storage and falls back without crashing.
- Save/open/create/duplicate still work.
- Unsaved React-only changes are not autosaved.
- No URL restoration or URL synchronization is implemented.
- No backend storage or API contract changes are introduced.
- Frontend tests pass.
- Server tests pass.
- Frontend build passes.

## Expected Final Response

Return:

- Findings first, with severity and file/line references.
- Open questions or assumptions.
- Verification commands run and results.
- Manual QA performed or skipped.
- Brief final verdict: pass or needs remediation.

Keep the response focused on Stage 3. Do not propose or implement Stage 4 unless explicitly asked afterward.
