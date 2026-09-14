# Session Restoration Stage 9 Avoid False Unsaved State Prompt

Use this prompt to implement Stage 9 of the Lesson Source Builder session restoration work.

## Prompt

You are implementing Stage 9: Avoid False Unsaved State.

Earlier stages made project restoration much more capable:

- Stage 3: localStorage last-project restoration.
- Stage 4: startup URL `?project=...` restoration and URL sync.
- Stage 5: clear invalid restore state.
- Stage 6: startup project-list loading.
- Stage 7: auto-reopen the most recent saved lesson.
- Stage 8: first-class project URL support while the app is open.

Stage 9 should harden dirty-state tracking so that lessons loaded from the backend do not falsely appear as unsaved. A restored/opened/saved lesson should be clean until the user or a meaningful operation changes lesson content.

Do not implement autosave, export generation, project deletion, auth, account sync, cloud sync, backend API changes, server-side sessions, or full lesson snapshots in browser storage.

## Stage 9 Goal

Avoid false unsaved state after:

- Startup URL restore.
- Startup localStorage restore.
- Startup auto-reopen.
- Manual Open.
- URL-driven Open from Stage 8.
- New project creation.
- Save existing project.
- Save that creates a new project.
- Duplicate project.
- Server-applied lesson updates from generation/approval operations.

The app should show `Saved`, not `Unsaved changes`, after those successful saved-project transitions. It should also avoid unnecessary discard prompts and `beforeunload` warnings for clean saved lessons.

Real edits must still be detected as unsaved.

## Definitions

Saved snapshot:

```text
A canonical snapshot of the last known persisted lesson payload, after the same frontend normalization used for saves/restores.
```

False unsaved state:

```text
The UI or navigation guard says there are unsaved changes even though the current lesson is equivalent to the last saved/restored backend lesson.
```

Meaningful dirty state:

```text
The current lesson differs from the last saved/restored backend lesson in content that would be persisted by Save.
```

## Required Behavior

Stage 9 is complete only if:

- Successful startup URL restore leaves the lesson clean/saved.
- Successful startup localStorage restore leaves the lesson clean/saved.
- Successful startup auto-reopen leaves the lesson clean/saved.
- Successful manual Open leaves the lesson clean/saved.
- Successful URL-driven Open leaves the lesson clean/saved.
- Successful project creation leaves the created lesson clean/saved.
- Successful Save leaves the returned normalized lesson clean/saved.
- Successful Duplicate leaves the duplicated lesson clean/saved.
- Successful server-applied lesson updates leave the applied lesson clean/saved when the server has persisted that lesson.
- Failed restore/open paths that fall back to demo still show the correct unsaved/no-active-project state.
- The saved snapshot is based on the normalized lesson actually applied to React state.
- Normalization-equivalent lessons compare cleanly.
- Transient UI state does not make a lesson dirty.
- Media readiness state does not make a lesson dirty.
- Project list loading state does not make a lesson dirty.
- URL changes alone do not make a lesson dirty.
- `lastSavedAt` or other display-only save metadata does not make a lesson dirty.
- The dirty checker still detects real setup/story/character/scene/media-relevant lesson edits.
- `beforeunload` warning is active only for real unsaved changes.
- New/Open/Duplicate/URL-open discard prompts appear only for real unsaved changes.
- No full lesson snapshots are persisted to localStorage/sessionStorage/IndexedDB.
- Backend API/storage scope remains unchanged.

## Source Context To Read First

Read these files before editing:

```text
docs/session-restoration-stage-3-review-prompt.md
docs/session-restoration-stage-7-review-prompt.md
docs/session-restoration-stage-8-review-prompt.md
frontend/src/App.jsx
frontend/src/utils/lessonDirtyState.js
frontend/test/lessonDirtyState.test.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/utils/unsavedChangesGuard.js
frontend/test/unsavedChangesGuard.test.js
frontend/src/utils/projectSessionStorage.js
frontend/src/utils/projectSessionUrl.js
frontend/src/utils/projectUrlNavigation.js
frontend/test/projectUrlNavigation.test.js
frontend/src/api/projects.js
server/src/routes/projects.js
server/src/services/projectStore.js
package.json
frontend/package.json
server/package.json
```

If equivalent code has moved, inspect the moved files instead.

## Commands To Run Before Editing

Use these commands to ground the implementation:

```sh
git status --short
sed -n '1,220p' frontend/src/utils/lessonDirtyState.js
sed -n '1,220p' frontend/test/lessonDirtyState.test.js
sed -n '310,365p' frontend/src/App.jsx
sed -n '500,560p' frontend/src/App.jsx
sed -n '1560,1630p' frontend/src/App.jsx
sed -n '1748,1845p' frontend/src/App.jsx
sed -n '1,140p' frontend/src/utils/unsavedChangesGuard.js
rg -n "lessonHasUnsavedChanges|hasUnsavedLessonChanges|lastSavedLessonSnapshot|markLessonSaved|clearSavedLessonSnapshot|saveStatus|beforeunload|discardUnsavedChangesMessage|createLessonSnapshot|lessonsHaveUnsavedChanges|normalizeLessonForClient|JSON\\.stringify" frontend/src frontend/test
```

## Implementation Guidance

### 1. Keep Dirty-State Logic In A Small Utility

Prefer improving `frontend/src/utils/lessonDirtyState.js` rather than spreading dirty comparison logic through `App.jsx`.

The utility should expose clear primitives such as:

```js
export function createLessonSnapshot(lesson) {}
export function lessonsHaveUnsavedChanges(currentLesson, savedSnapshot) {}
```

If current `JSON.stringify(normalizeLessonForClient(lesson))` comparison is sufficient, keep it. If false dirty state can come from object key-order differences, unstable arrays, display-only fields, or normalization gaps, fix the snapshot canonicalization in the utility and test it directly.

Rules:

- Snapshot the same normalized shape that Save sends or restore applies.
- Do not include external UI state in the snapshot.
- Do not include `saveStatus`, `lastSavedAt`, `projectList`, `projectListStatus`, `projectListError`, `restoreIssue`, `mediaReadiness`, pending actions, operation tokens, or URL state.
- Do not persist snapshots outside React memory.
- Keep comparison deterministic.

### 2. Mark Saved Transitions At The Right Time

Audit `frontend/src/App.jsx` and ensure successful saved-project transitions call one shared helper such as:

```js
markLessonSaved(normalizedLesson, { savedAt })
```

The helper should:

- Snapshot the normalized lesson that is being applied to `lesson`.
- Update any snapshot version state needed to recompute memoized dirty state.
- Set `saveStatus` to `saved`.
- Update display-only saved timestamp if needed.

Call it after these successful transitions:

- Startup URL restore.
- Startup localStorage restore.
- Startup auto-reopen.
- Manual Open.
- URL-driven Open.
- Create project.
- Save project.
- Duplicate project.
- Server-applied updates that represent persisted backend state.

Do not call it after local-only user edits.

### 3. Clear Saved Snapshot For True Unsaved Demo/Draft States

Fallback or draft states should not accidentally look saved.

Clear saved snapshot when:

- Startup fallback returns to bundled demo because there is no candidate and no auto-reopen.
- URL restore fails and falls back to demo.
- Malformed URL restore falls back to demo.
- LocalStorage restore fails and falls back to demo.
- Auto-reopen fails and falls back to demo.
- Stage 5 clear invalid restore request resets to demo/no active project.

After clearing, a meaningful demo lesson may show `Unsaved changes`, or the app may show the existing no-active-project unsaved state. Preserve the current intended UX, but do not mark a restored backend lesson as unsaved.

### 4. Avoid Snapshot Timing Races

False unsaved state can happen if `setLesson(normalized)` runs in one render and the saved snapshot updates too late or uses a different object shape.

Ensure:

- The saved snapshot is created from the same normalized object passed to `setLesson()`.
- Dirty-state memo/effect depends on a snapshot version or equivalent so it recomputes after the snapshot changes.
- `saveStatus` does not briefly settle as `unsaved` after a successful restore/open/save because the snapshot update was missed.
- Stale async open/restore responses cannot overwrite the snapshot for a newer active project.

Do not add broad timeouts to hide state flicker. Fix the data flow.

### 5. Preserve Meaningful Dirty Detection

Do not weaken dirty detection just to remove false positives.

The app must still mark dirty after meaningful edits to:

- Setup/title/theme/learner fields.
- Story sentences and lock state.
- Characters and appearance descriptions.
- Character image approval/stale fields when they are lesson content.
- Scene planning fields.
- Scene image approval/stale fields when they are lesson content.
- Current stage, if it is persisted and changed by user workflow.

If there are fields that should be ignored, document and test why they are display-only or transient.

### 6. Preserve Navigation Guards

`hasUnsavedLessonChanges()` and `lessonHasUnsavedChangesRef` likely drive:

- New/Open/Duplicate discard prompts.
- Stage 8 URL-open confirmation.
- `beforeunload` warning.
- Media/export readiness save-first behavior.

After Stage 9:

- Clean restored/saved lessons should not prompt.
- Real edits should prompt.
- Cancelling URL-open should still repair the URL.
- Confirming URL-open should still open the requested project.
- Media/export readiness should still block or warn for real dirty lessons.

## Test Requirements

Update `frontend/test/lessonDirtyState.test.js` and related tests.

Add or confirm coverage for:

- A normalized restored lesson snapshot starts clean.
- A lesson with normalization-equivalent whitespace/default-field differences compares clean.
- A saved snapshot created from a loaded lesson remains clean after `normalizeLessonForClient()` is applied again.
- A server-returned lesson with missing default fields compares clean after client normalization.
- Meaningful setup edits are dirty.
- Meaningful story edits are dirty.
- Meaningful character edits are dirty.
- Meaningful scene edits are dirty.
- A meaningful lesson without a saved snapshot is treated according to current intended UX.
- Display-only save metadata such as `lastSavedAt` is not part of dirty comparison if represented outside the lesson.

If practical, add pure helper coverage for saved-transition logic if extracted.

If app-level dirty state remains difficult to test with the current Node-only setup, state residual risk and cover it in manual QA.

Do not add browser testing dependencies unless the repo already uses them.

## Manual QA Checklist

Run:

```sh
npm run dev
```

Then verify:

1. Load a saved lesson through startup URL restore.
2. Confirm the project status shows `Saved`, not `Unsaved changes`.
3. Refresh and confirm it still shows `Saved`.
4. Load a saved lesson through localStorage restore.
5. Confirm it shows `Saved`.
6. Clear URL/localStorage so Stage 7 auto-reopen runs.
7. Confirm the auto-reopened lesson shows `Saved`.
8. Open a saved lesson manually from the Open panel.
9. Confirm it shows `Saved`.
10. Use Stage 8 project URL navigation to open another saved lesson.
11. Confirm it shows `Saved`.
12. Save a lesson and confirm it remains `Saved` after the server response applies.
13. Duplicate a lesson and confirm the duplicate shows `Saved`.
14. Run a generation/approval operation that saves/applies a server lesson and confirm it shows `Saved` after completion.
15. Make a real edit and confirm status changes to `Unsaved changes`.
16. With no real edit after restore/open/save, try New/Open/Duplicate/project URL navigation and confirm no discard prompt appears.
17. After a real edit, try New/Open/Duplicate/project URL navigation and confirm the discard prompt appears.
18. With no real edit, refresh/close tab and confirm no beforeunload warning appears.
19. After a real edit, refresh/close tab and confirm the beforeunload warning appears.
20. Confirm Stage 5 invalid restore clearing, Stage 6 list loading, Stage 7 auto-reopen, and Stage 8 URL navigation still work.

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
rg -n "createLessonSnapshot|lessonsHaveUnsavedChanges|markLessonSaved|clearSavedLessonSnapshot|lastSavedLessonSnapshot|lessonHasUnsavedChanges|beforeunload|discardUnsavedChangesMessage" frontend/src frontend/test
rg -n "localStorage\\.setItem|sessionStorage|IndexedDB|indexedDB|JSON\\.stringify\\(lesson|setItem\\([^,]+,\\s*JSON" frontend/src frontend/test
rg -n "router\\.get\\(\"/\"|router\\.get\\(\"/:id\"|listProjects\\(|getProject\\(|updateProject\\(" server/src frontend/src
```

Expected results:

- Dirty-state utility and tests are present.
- Saved-transition code marks snapshots after successful backend-backed transitions.
- Snapshot clearing exists for demo/fallback states.
- Browser storage remains pointer-only.
- Backend routes/storage are unchanged.

## Acceptance Criteria

Stage 9 is acceptable when:

- Saved/restored/opened/duplicated/server-applied lessons no longer falsely show `Unsaved changes`.
- Real edits still show `Unsaved changes`.
- Clean saved lessons do not trigger discard prompts or beforeunload warnings.
- Dirty lessons still trigger discard prompts and beforeunload warnings.
- Dirty-state comparison is centralized and tested.
- Previous Stage 4-8 restoration and URL behaviors remain intact.
- Automated verification passes.
- Backend/API/storage scope is unchanged.

## Final Response For The Implementer

In your final response, include:

- A brief summary of what changed.
- Files changed.
- Automated verification results.
- Whether manual browser QA was run.
- Any residual risk, especially around app-level dirty-state timing/flicker if not covered by automated tests.
