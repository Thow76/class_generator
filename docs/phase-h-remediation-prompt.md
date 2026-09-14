# Phase H Remediation Prompt

Use this prompt to fix the Phase H review findings about implicit autosave from Media/Export readiness, unsafe URL restore issue clearing, and missing app-level tests.

## Prompt

You are fixing narrow Phase H issues in Lesson Source Builder.

Phase H has been implemented and reviewed. The remaining findings are:

```text
[P1] Media/Export navigation still autosaves unsaved lessons
Files: frontend/src/App.jsx around line 383 and line 559
Evidence: Entering media or export automatically calls checkMediaReadiness(), which calls saveCurrentLesson(). That persists the current lesson and clears dirty state without the user clicking Save.
Why it matters: Phase H explicitly preserves manual save and forbids autosave/background saving. A user can make local edits, click Media/Export, and unknowingly save those edits.
Recommended fix: Do not call saveCurrentLesson() from media readiness. Require a clean active project before readiness checks, or show a non-blocking "Save before checking media readiness" message and leave dirty state intact.

[P2] Clearing a URL restore issue can discard an unsaved active lesson without confirmation
Files: frontend/src/App.jsx around line 1486 and line 1509
Evidence: clearInvalidRestoreState() clears the saved snapshot, replaces the lesson with demoLesson, and clears the active project for URL restore issues. It does not check lessonHasUnsavedChanges or prompt first.
Why it matters: Phase H requires project-replacing actions to confirm before discarding unsaved edits. URL restore issues can now be surfaced during active-session URL navigation.
Recommended fix: For active sessions, clear the URL/restore issue without replacing the lesson, or route this through the same discard-confirmation flow.

[P3] Important Phase H behaviors lack app-level tests
Files: frontend/test/unsavedChangesGuard.test.js and frontend/test/lessonDirtyState.test.js
Evidence: Tests cover pure dirty/guard helpers, but not actual App.jsx save/open/new/duplicate flows, failed save behavior, beforeunload listener registration/removal, or cancel/confirm preservation.
Why it matters: The current regressions are in app wiring, not the pure helpers.
Recommended fix: Add integration-style tests or extract more project-action decision logic into pure helpers and cover save/open/new/duplicate outcomes.
```

Fix these issues only. Do not add autosave, draft recovery, ZIP export, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or any new backend storage model.

## Scope

Likely update:

```text
frontend/src/App.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/stages/ExportStage.jsx
frontend/src/utils/lessonDirtyState.js
frontend/src/utils/unsavedChangesGuard.js
frontend/test/*
docs/phase-h-remediation-prompt.md
```

Only update additional files if tests reveal a directly coupled issue.

Backend changes should not be needed.

## Required Behavior

After remediation:

- Navigating to Media does not save dirty lesson edits automatically.
- Navigating to Export does not save dirty lesson edits automatically.
- `checkMediaReadiness()` does not call `saveCurrentLesson()` or otherwise persist dirty local edits.
- Media readiness checks require an active saved project and a clean lesson snapshot.
- If the current lesson is dirty, Media/Export readiness displays or records a non-blocking "save first" state and leaves dirty state intact.
- The user must explicitly click Save before a readiness check can use the latest local edits.
- Backend media readiness remains authoritative for file-backed media status.
- Clearing a URL restore issue during an active session does not silently replace the current lesson with `demoLesson`.
- Any path that replaces an unsaved active lesson uses the same discard-confirmation behavior as project open/new/duplicate.
- Canceling a discard confirmation preserves the active lesson, active project, saved snapshot, dirty state and restore state.
- Confirming a discard confirmation performs only the requested restore-clear/reset action.
- Phase G startup restore behavior remains intact.
- Phase H beforeunload behavior remains intact.
- Existing operation guards remain intact.
- App-level tests cover the repaired wiring.

## Product Boundary

Phase H preserves manual saving.

Allowed:

- Show a prompt, banner, inline message or disabled readiness action saying the lesson must be saved before checking readiness.
- Keep the existing media readiness endpoint and frontend readiness display.
- Add app-level tests or extract small pure decision helpers to make app wiring testable.

Not allowed:

- Save automatically when entering Media.
- Save automatically when entering Export.
- Save automatically before checking media readiness.
- Debounce or time a background save.
- Store the dirty lesson in localStorage/sessionStorage.
- Claim unsaved changes are backed up or recoverable.
- Redesign project storage.
- Add export file generation.

Recommended wording:

```text
Save before checking media readiness.
Unsaved changes are not included until you save this project.
```

Avoid wording such as:

```text
Autosaved
Recovered draft
Syncing
Cloud saved
All changes are safe
```

## Implementation Guidance

### 1. Remove Autosave From Media Readiness

Inspect `frontend/src/App.jsx`, especially:

- the effect or handler that runs `checkMediaReadiness()` when the active stage becomes `media`,
- the effect or handler that runs `checkMediaReadiness()` when the active stage becomes `export`,
- the body of `checkMediaReadiness()`,
- `saveCurrentLesson()`,
- any readiness retry or refresh handler passed to `MediaStage` or `ExportStage`.

Change the flow so readiness checking never persists dirty local edits.

Expected rules:

1. If there is no active saved project id, do not run backend readiness.
2. If the lesson has unsaved changes, do not run backend readiness automatically.
3. If the lesson has unsaved changes and the user requests readiness, show a non-blocking save-first message.
4. If the lesson is clean and has an active saved project id, it is safe to call the backend readiness route.
5. Readiness errors should not clear dirty state.
6. Readiness success should not update the saved snapshot for the lesson.

The media readiness operation should be read-only from the user's perspective.

Acceptable approaches:

- Guard inside `checkMediaReadiness()`:

```js
if (!activeProjectId) {
  setMediaReadinessState(...noProject...);
  return;
}

if (lessonHasUnsavedChanges) {
  setMediaReadinessState(...saveFirst...);
  return;
}

// Call backend readiness without saving.
```

- Or split the current function into:

```js
checkMediaReadinessForSavedProject()
requestMediaReadinessCheck()
```

where the public request wrapper handles dirty/no-project messaging and the internal function only calls the backend.

Do not solve this by moving the implicit save somewhere else.

### 2. Preserve Media/Export UX Without Autosave

Update `MediaStage` and `ExportStage` only if their props or messages need to reflect the new save-first state.

Expected UI behavior:

- Media can still display existing local media preview cards if already supported.
- Backend readiness remains unavailable or stale while there are unsaved changes.
- Export remains disabled unless the saved project has a successful backend readiness result with `ready === true`.
- If readiness is blocked by unsaved changes, the UI should clearly say the user needs to save first.
- The Save button remains the explicit way to persist local edits.

Do not add export generation.

### 3. Fix URL Restore Issue Clearing

Inspect `clearInvalidRestoreState()` and any button or handler that clears restore errors.

The dangerous behavior is replacing the active lesson with `demoLesson` and clearing the active project while the user may have unsaved edits.

Implement one of these safe approaches.

Preferred approach:

- If the app is already running with an active lesson, clearing a URL restore issue should only:
  - remove the invalid URL project parameter,
  - clear invalid browser restore state if appropriate,
  - dismiss the restore issue,
  - leave the current lesson, active project, saved snapshot and dirty state untouched.

Alternative approach:

- If clearing the restore issue must replace the lesson, route it through the same discard-confirmation helper used by open/new/duplicate.
- If the user cancels, do not replace the lesson.
- If the user confirms, perform the reset and make the resulting baseline explicit.

Be careful to preserve startup behavior:

- During initial startup, fallback to demo/default may still be appropriate when no active project has been loaded and no user edits exist.
- During an active session, clearing a visible URL restore issue must not silently discard the current lesson.

### 4. Keep Phase G Restoration Intact

Verify the remediation does not break Phase G:

- URL project restore still wins over localStorage when URL restore is in scope.
- localStorage restore still works when no URL project id exists.
- Browser storage stores only project ids.
- Invalid restore state is cleared or ignored safely.
- Missing/deleted restore candidates are non-blocking.
- Successful restore sets a clean baseline.
- Manual open/save/create/duplicate still update restore state after success.

### 5. Keep Phase H Dirty/Warning Behavior Intact

Verify the remediation does not break Phase H:

- Local edits still mark the lesson dirty.
- Successful explicit save clears dirty state.
- Failed explicit save keeps dirty state.
- beforeunload warning appears only while dirty.
- Project open/new/duplicate still confirm before discarding unsaved changes.
- Existing active-operation guards still block project actions during generation/approval operations.

## Test Requirements

Add app-level or integration-style frontend tests. If direct `App.jsx` tests are too heavy, extract small pure decision helpers and test them, but ensure the tests cover the app wiring that failed.

At minimum, cover:

1. Dirty lesson plus Media navigation does not call the save API.
2. Dirty lesson plus Export navigation does not call the save API.
3. Dirty lesson plus manual media readiness refresh does not call the save API.
4. Dirty lesson plus media readiness request leaves dirty state intact.
5. Dirty lesson plus media readiness request shows or records a save-first state.
6. Clean saved lesson plus media readiness request calls the readiness API without calling save.
7. Readiness success does not update the saved lesson snapshot.
8. Clearing a URL restore issue while dirty does not replace the current lesson without confirmation.
9. Canceling that confirmation preserves the current lesson and dirty state if confirmation is used.
10. Confirming that confirmation performs the intended reset if confirmation is used.
11. beforeunload listener remains active after a blocked readiness request on a dirty lesson.
12. Existing project open/new/duplicate discard tests still pass.

Also keep existing pure helper tests:

- `frontend/test/unsavedChangesGuard.test.js`
- `frontend/test/lessonDirtyState.test.js`
- `frontend/test/projectAutoReopen.test.js`
- `frontend/test/projectSessionStorage.test.js`
- `frontend/test/projectSessionUrl.test.js`
- `frontend/test/mediaReadiness.test.js`

Backend tests should not need changes.

## Manual QA Checklist

Run the app locally and verify:

1. Open or restore a saved project.
2. Edit a character appearance description.
3. Confirm the UI shows unsaved changes.
4. Click Media.
5. Confirm the app does not save automatically.
6. Confirm dirty state remains visible.
7. Confirm refresh still triggers the browser unsaved-changes warning.
8. Confirm Media shows a save-first message or disables readiness checking.
9. Click Save explicitly.
10. Confirm dirty state clears.
11. Click Media or readiness refresh.
12. Confirm readiness runs without another implicit save.
13. Edit a scene.
14. Click Export.
15. Confirm the app does not save automatically and Export remains blocked until explicit save/readiness.
16. Trigger or simulate a URL restore issue while unsaved changes exist.
17. Clear the restore issue.
18. Confirm the current lesson is not silently replaced by the demo lesson.
19. If a confirmation is shown, cancel and confirm the current lesson remains unchanged.
20. Confirm startup restore from URL/localStorage still works in a fresh page load.

## Acceptance Criteria

- `checkMediaReadiness()` does not call `saveCurrentLesson()`.
- Media navigation never autosaves dirty lesson changes.
- Export navigation never autosaves dirty lesson changes.
- Manual readiness refresh never autosaves dirty lesson changes.
- Dirty state survives blocked readiness checks.
- A save-first readiness state/message exists for dirty lessons.
- Clean saved projects can still run backend readiness checks.
- Backend readiness remains authoritative for Media/Export completion.
- Clearing URL restore issues does not silently discard unsaved active lessons.
- Any reset/replacement path for a dirty lesson uses discard confirmation.
- Phase G restore behavior still passes.
- Phase H dirty state and beforeunload behavior still pass.
- App-level tests cover the repaired wiring.
- No autosave, draft recovery, browser draft storage, backend storage redesign or export generation scope is introduced.

## Verification Commands

Run:

```sh
npm test --workspace frontend
npm test --workspace server
npm run build --workspace frontend
```

Targeted checks:

```sh
rg "checkMediaReadiness|saveCurrentLesson|mediaReadiness|beforeunload|clearInvalidRestoreState|lessonHasUnsavedChanges|confirmDiscard" frontend/src frontend/test
rg "autosave|auto-save|draft recovery|Recovered draft|Cloud saved|Syncing|Backed up|localStorage|sessionStorage" frontend/src frontend/test
```

When reviewing the first search, confirm `saveCurrentLesson` is not called from readiness code paths.

When reviewing the second search, distinguish valid Phase G project-id storage from forbidden lesson/draft storage.

If a full test/build command cannot run for environmental reasons, state exactly what was skipped and why.

## Expected Final Response

Report:

- Files changed.
- How media readiness was made read-only.
- How dirty Media/Export navigation is handled.
- How URL restore issue clearing avoids unsaved data loss.
- App-level tests added or updated.
- Commands run and results.
- Any skipped checks.

Keep the response brief. Do not claim autosave or draft recovery was added; the remediation should preserve explicit manual saving.
