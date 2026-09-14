# Session Restoration Stage 3 LocalStorage Prompt

Use this prompt to implement Stage 3 of the session restoration issue for Lesson Source Builder.

## Prompt

You are implementing Stage 3 of the Lesson Source Builder session restoration work.

Stage 1 established that backend project persistence exists but frontend startup always begins from `demoLesson` with `activeProjectId` set to `null`. Stage 2 defined the restoration rules: future restoration sources are URL `project` and localStorage `lessonSourceBuilder:lastProjectId`, with URL taking precedence. Stage 3 should implement the localStorage part only.

Your job is to make the app remember and restore the last active saved project using localStorage when no URL restoration is implemented yet.

Do not implement URL query parsing, URL synchronization, `history.replaceState`, `history.pushState`, autosave, project deletion UI, export generation, auth, account sync, cloud storage, backend API changes, or full lesson snapshots in browser storage.

## Stage 3 Goal

When a user successfully creates, saves, opens, duplicates, or restores a saved project, persist that project id to localStorage. On a later browser refresh or localhost reopen, automatically reload that saved project from the backend project store.

localStorage must store only this project id pointer:

```text
lessonSourceBuilder:lastProjectId
```

The backend remains the source of truth for lesson data.

## Required Behavior

Stage 3 is correct only if:

- The app writes `lessonSourceBuilder:lastProjectId` after successful create, save, open, duplicate, and localStorage restore.
- The app reads `lessonSourceBuilder:lastProjectId` on startup.
- If the stored id is valid-looking, the app attempts to load it with the existing project API, normally `getProject(projectId)`.
- A successfully restored project is normalized, validated, and applied like a manual open.
- The restored lesson is marked saved, not unsaved.
- The restored project id becomes `activeProjectId`.
- Transient inputs and operation state are cleared consistently with manual open.
- Media readiness is reset for the restored project.
- The saved-project list may be refreshed quietly after the restore decision.
- If the stored id is malformed, stale, deleted, unreadable, or invalid, the app clears the localStorage key and falls back to the bundled demo lesson.
- localStorage errors, private browsing storage failures, quota errors, and security exceptions do not crash the app.
- No full lesson JSON, image data, media readiness, export data, API responses, or unsaved form state is stored in localStorage.
- No URL behavior is added in Stage 3.

## Source Context To Read

Read these files before editing:

```text
docs/session-restoration-stage-1-baseline.md
docs/session-restoration-stage-2-restore-rules.md
frontend/src/App.jsx
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/test
server/src/services/projectStore.js
server/src/routes/projects.js
```

If the relevant code has moved, inspect the equivalent files.

## Commands To Consider

Use these before editing:

```sh
git status --short
sed -n '1,360p' docs/session-restoration-stage-2-restore-rules.md
rg -n "useState\\(demoLesson\\)|activeProjectId|activeProjectIdRef|setActiveProjectIdAndRef|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject|clearTransientInputs|resetMediaReadiness|normalizeAndValidateLoadedLesson" frontend/src/App.jsx
rg -n "localStorage|sessionStorage|window\\.location|location\\.search|URLSearchParams|history\\.replaceState|history\\.pushState|document\\.cookie" frontend/src
rg -n "listProjects\\(|createProject\\(|getProject\\(|saveProject\\(|duplicateProject\\(" frontend/src/api/projects.js frontend/src/App.jsx
find frontend/test -maxdepth 2 -type f | sort
```

## Suggested Implementation Shape

Prefer a small, testable frontend utility rather than scattering localStorage calls through `App.jsx`.

Recommended new file:

```text
frontend/src/utils/projectSessionStorage.js
```

Recommended exports:

```js
export const lastProjectStorageKey = "lessonSourceBuilder:lastProjectId";

export function isLikelySafeProjectId(value) {
  // lightweight frontend guard only; backend remains authoritative
}

export function readLastProjectId(storage = window.localStorage) {
  // safe read; return null on missing, malformed, or storage error
}

export function writeLastProjectId(projectId, storage = window.localStorage) {
  // safe write; no-op on malformed id or storage error
}

export function clearLastProjectId(storage = window.localStorage) {
  // safe remove; no-op on storage error
}
```

Allow the storage object to be injected so tests can use a fake storage implementation without a browser.

The `isLikelySafeProjectId(value)` helper should reject:

- non-strings
- blank strings
- ids not starting with `lesson-`
- ids longer than 96 characters
- ids containing `/`
- ids containing `\`
- ids containing `..`
- ids containing null bytes
- ids with characters outside the backend-safe shape

It does not need to perfectly duplicate backend decoding behavior, but it should avoid obviously unsafe requests. Backend validation remains authoritative.

## App Integration Guidance

In `frontend/src/App.jsx`, preserve existing save/open/create/duplicate behavior and reuse existing helpers as much as possible.

### Persist Active Project Id

Update `setActiveProjectIdAndRef(projectId)` or a nearby helper so successful active-project transitions write the id to localStorage:

```text
createFreshProject -> setActiveProjectIdAndRef(project.id)
saveCurrentLesson -> setActiveProjectIdAndRef(loadedLesson.id)
applyServerLesson -> setActiveProjectIdAndRef(normalized.id)
openProject -> setActiveProjectIdAndRef(loadedLesson.id)
duplicateCurrentProject -> setActiveProjectIdAndRef(duplicatedLesson.id)
startup localStorage restore -> setActiveProjectIdAndRef(restoredLesson.id)
```

If `setActiveProjectIdAndRef(projectId)` can ever be called with `null` or invalid values in the future, handle that safely. Do not write invalid values to localStorage.

### Startup Restore

Add a startup effect that attempts localStorage restoration once.

Required flow:

1. Start in a restoring/loading state.
2. Safely read `lessonSourceBuilder:lastProjectId`.
3. If there is no stored project id, end restoring/loading and keep the bundled demo lesson.
4. If the stored value is malformed, clear it, end restoring/loading, and keep the bundled demo lesson.
5. If the stored id is valid-looking, call `getProject(projectId)` through the existing API.
6. Normalize and validate the loaded lesson with `normalizeAndValidateLoadedLesson()`.
7. Apply it consistently with manual `openProject(projectId)`.
8. Mark save status as `saved`.
9. Clear project errors.
10. Clear transient inputs and pending operation state.
11. Reset media readiness.
12. Quietly refresh the project list if practical.
13. If loading fails, clear the localStorage key, show the demo lesson, and optionally show a non-blocking project error.
14. End restoring/loading.

Important: avoid a false "Unsaved changes" state after restoration. The existing `hasPendingLessonChange` ref marks user edits by observing lesson changes, so make sure startup restore does not incorrectly leave the app looking dirty. If needed, reset that ref around restore/apply operations in the same pattern used for server-loaded lessons.

### Loading UX

Use the existing project loading state if practical. Acceptable options:

- Reuse `loadStatus === "loading"` during startup restore.
- Add a small dedicated `restoreStatus` only if it simplifies correctness.

Do not flash or present the demo lesson as definitively active while a valid stored project is still being restored.

New/Open/Duplicate/Save should remain usable after restoration fails.

## URL Boundary

Stage 3 must not add URL behavior.

Do not add:

```text
window.location.search
URLSearchParams
history.replaceState
history.pushState
?project=
```

Exception: if existing code already contains unrelated URL usage, do not remove it. This project currently should not need URL changes for Stage 3.

Stage 4 will handle URL `project` precedence later.

## Error Handling

Handle these cases:

- localStorage read throws.
- localStorage write throws.
- localStorage remove throws.
- stored value is malformed.
- stored project no longer exists.
- backend rejects project id.
- backend returns malformed lesson.
- frontend validation rejects loaded lesson.
- project API request fails.

Expected behavior:

- The app does not crash.
- The localStorage key is cleared for malformed or stale localStorage candidates.
- The app falls back to `demoLesson`.
- User can still create, open, duplicate, or save.
- Errors shown to users are readable and do not expose stack traces or absolute filesystem paths.

## Tests

Add focused frontend tests. Prefer testing pure helpers heavily and `App` startup behavior if the existing test setup can support it.

Recommended new test file:

```text
frontend/test/projectSessionStorage.test.js
```

Test helper behavior:

1. `lastProjectStorageKey` equals `lessonSourceBuilder:lastProjectId`.
2. `isLikelySafeProjectId("lesson-20260911-102000-ab12cd34")` returns true.
3. Non-strings, blank strings, ids without `lesson-`, overly long ids, slashes, backslashes, `..`, null bytes, spaces, and unsafe punctuation return false.
4. `readLastProjectId()` returns the stored valid id.
5. `readLastProjectId()` returns null for missing values.
6. `readLastProjectId()` clears and returns null for malformed stored values.
7. `readLastProjectId()` returns null if storage read throws.
8. `writeLastProjectId()` writes only valid-looking ids.
9. `writeLastProjectId()` ignores invalid ids.
10. `writeLastProjectId()` does not throw if storage write throws.
11. `clearLastProjectId()` removes the key.
12. `clearLastProjectId()` does not throw if storage remove throws.

If there is already a practical way to test `App.jsx` startup behavior, add tests for:

1. Startup with no stored id keeps the demo lesson and no active project.
2. Startup with valid stored id calls `getProject()` and restores the lesson.
3. Startup restore sets save status to saved.
4. Startup restore writes or preserves the valid id.
5. Startup with malformed stored id clears storage and does not call `getProject()`.
6. Startup with missing/deleted stored project clears storage and falls back to demo.

Do not add large testing dependencies unless the project already uses them or the need is clearly justified. The frontend currently uses `node --test`.

## Manual QA Checklist

Run the app and verify:

1. Start with empty localStorage.
2. Open `http://127.0.0.1:5173/`.
3. Confirm the app starts with the demo lesson.
4. Create or save a lesson.
5. Confirm localStorage contains `lessonSourceBuilder:lastProjectId` with the project id only.
6. Refresh the browser.
7. Confirm the saved project automatically reopens.
8. Confirm the sidebar shows the restored project id.
9. Confirm save status is `Saved`, not `Unsaved changes`.
10. Open a different saved lesson.
11. Confirm localStorage updates to the new project id.
12. Refresh and confirm the newly opened lesson is restored.
13. Duplicate a lesson.
14. Confirm localStorage updates to the duplicate project id.
15. Manually set localStorage to a malformed value.
16. Refresh and confirm the app falls back to the demo lesson without crashing and clears the key.
17. Manually set localStorage to a deleted or missing project id.
18. Refresh and confirm the app falls back to the demo lesson and clears the key.
19. Confirm no `?project=` URL behavior is introduced.

## Verification Commands

Run:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Targeted source checks:

```sh
rg -n "lessonSourceBuilder:lastProjectId|lastProjectStorageKey|isLikelySafeProjectId|readLastProjectId|writeLastProjectId|clearLastProjectId|localStorage" frontend/src frontend/test
rg -n "URLSearchParams|window\\.location\\.search|location\\.search|history\\.replaceState|history\\.pushState|\\?project" frontend/src frontend/test
rg -n "JSON\\.stringify\\(lesson|setItem\\([^,]+,\\s*JSON|localStorage\\.setItem" frontend/src frontend/test
```

Expected:

- The first search finds the Stage 3 storage helper and integration.
- The second search finds no new Stage 3 URL restoration/synchronization behavior.
- The third search does not show full lesson JSON being stored in localStorage.

If a command cannot run, state exactly why.

## Acceptance Criteria

Stage 3 is complete when:

- Safe localStorage helper functions exist and are tested.
- The key is exactly `lessonSourceBuilder:lastProjectId`.
- Only a project id string is stored.
- The active project id is persisted after successful create, save, open, duplicate, server-applied project updates, and localStorage restore.
- Startup attempts to restore a valid stored id.
- Startup restore uses backend project data through the existing API.
- Restored lessons are normalized and validated before being applied.
- Restore success leaves the app in a saved, active-project state.
- Restore failure clears stale/malformed storage and falls back without crashing.
- Save/open/create/duplicate still work.
- Unsaved React-only changes are not autosaved.
- No URL restoration or URL synchronization is implemented.
- No backend storage or API contract changes are introduced.
- Frontend and server tests pass.
- Frontend build passes.

## Expected Final Response

Report:

- Files changed.
- How localStorage persistence and startup restore were implemented.
- How stale or malformed stored ids are handled.
- Tests added or updated.
- Verification commands run and results.
- Any manual QA performed or skipped.
- Confirmation that URL behavior and autosave remain out of scope.

Keep the response concise but specific.
