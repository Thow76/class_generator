# Session Restoration Stage 9 Review Prompt

Use this prompt to review whether Stage 9, Avoid False Unsaved State, was implemented correctly.

## Prompt

You are reviewing Stage 9 of the Lesson Source Builder session restoration work.

Stage 9 was intended to harden dirty-state tracking so saved/restored/opened lessons do not falsely appear as unsaved, while real lesson edits still trigger `Unsaved changes`, discard prompts, and `beforeunload` warnings. Review Stage 9 only. Do not implement fixes unless explicitly asked afterward.

The Stage 9 contract is:

- Backend-loaded and backend-saved lessons are marked clean at the right time.
- Dirty comparison uses a canonical persisted lesson snapshot.
- Normalization-equivalent lesson shapes compare cleanly.
- Display-only or transient UI state does not make a lesson dirty.
- Real persisted lesson edits still make the lesson dirty.
- Clean saved lessons do not trigger discard prompts or `beforeunload`.
- Dirty lessons still trigger discard prompts and `beforeunload`.
- Browser storage remains pointer-only.
- Backend API/storage scope remains unchanged.

## Expected Files

Inspect these files at minimum:

```text
docs/session-restoration-stage-9-avoid-false-unsaved-state-prompt.md
docs/session-restoration-stage-8-review-prompt.md
docs/session-restoration-stage-7-review-prompt.md
docs/session-restoration-stage-3-review-prompt.md
frontend/src/App.jsx
frontend/src/utils/lessonDirtyState.js
frontend/test/lessonDirtyState.test.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/utils/unsavedChangesGuard.js
frontend/test/unsavedChangesGuard.test.js
frontend/src/utils/projectUrlNavigation.js
frontend/test/projectUrlNavigation.test.js
frontend/src/api/projects.js
server/src/routes/projects.js
server/src/services/projectStore.js
package.json
frontend/package.json
server/package.json
```

If the implementation uses different file names, inspect the equivalent files.

## Required Behavior To Verify

Stage 9 passes only if:

- Successful startup URL restore leaves `saveStatus` as `saved`.
- Successful startup localStorage restore leaves `saveStatus` as `saved`.
- Successful startup auto-reopen leaves `saveStatus` as `saved`.
- Successful manual Open leaves `saveStatus` as `saved`.
- Successful URL-driven Open leaves `saveStatus` as `saved`.
- Successful project creation leaves the created lesson clean/saved.
- Successful Save leaves the returned normalized lesson clean/saved.
- Successful Duplicate leaves the duplicated lesson clean/saved.
- Successful server-applied lesson updates that represent persisted backend state mark the applied lesson clean/saved.
- Failed restore/open paths that fall back to demo clear the saved snapshot and show the intended unsaved/no-active-project state.
- The saved snapshot is built from the same normalized lesson object applied to React state.
- Dirty-state recomputation happens when the saved snapshot changes.
- Normalization-equivalent lessons compare cleanly.
- Object key order differences do not produce false dirty state.
- Display-only save metadata such as `lastSavedAt`, `savedAt`, `saveStatus`, `createdAt`, or `updatedAt` does not produce false dirty state if it is not persisted lesson content.
- Transient UI/app state is not included in the dirty snapshot.
- Media readiness/project list/URL/restore issue state does not affect dirty status.
- Real setup edits are dirty.
- Real story edits are dirty.
- Real character edits are dirty.
- Real scene edits are dirty.
- Real persisted media-relevant lesson edits are dirty.
- Clean saved lessons do not trigger New/Open/Duplicate/URL-open discard prompts.
- Dirty lessons still trigger New/Open/Duplicate/URL-open discard prompts.
- Clean saved lessons do not register a `beforeunload` warning.
- Dirty lessons do register a `beforeunload` warning.
- No full lesson snapshots are persisted to localStorage/sessionStorage/IndexedDB.
- Backend routes/storage format are unchanged.

## Dirty Utility Review Checks

Review `frontend/src/utils/lessonDirtyState.js` or equivalent.

Confirm:

1. Dirty-state comparison is centralized in a small utility.
2. `createLessonSnapshot()` normalizes lesson data before snapshotting.
3. Snapshots are deterministic, for example by canonicalizing object key order.
4. Snapshotting ignores only clearly display-only fields.
5. Ignored fields are documented by code shape or obvious names.
6. Snapshotting does not strip meaningful persisted lesson fields.
7. `lessonsHaveUnsavedChanges()` returns false for equivalent current/saved snapshots.
8. `lessonsHaveUnsavedChanges()` returns true for meaningful edits.
9. Meaningful lessons without a saved snapshot are treated according to the existing intended UX.
10. The utility does not read/write browser storage.
11. The utility does not depend on React state or browser globals.

## App Integration Review Checks

Review `frontend/src/App.jsx` or equivalent.

Confirm:

1. A saved snapshot ref/state exists, such as `lastSavedLessonSnapshotRef`.
2. A snapshot version or equivalent mechanism causes dirty-state memo/effects to recompute when the snapshot changes.
3. `markLessonSaved()` snapshots the normalized lesson being applied and sets `saveStatus` to `saved`.
4. `clearSavedLessonSnapshot()` clears snapshot state for true demo/draft fallback states.
5. Startup restore success calls `markLessonSaved()` after normalization.
6. Manual Open success calls `markLessonSaved()` after normalization.
7. URL-driven Open success uses the same clean saved path as manual Open.
8. Create project success calls `markLessonSaved()` for the created normalized lesson.
9. Save success calls `markLessonSaved()` for the server-returned normalized lesson.
10. Duplicate success calls `markLessonSaved()` for the duplicated normalized lesson.
11. Server-applied generation/approval updates call `markLessonSaved()` only when the server has persisted the updated lesson.
12. User-local edits do not call `markLessonSaved()`.
13. Failed restore/open fallback calls `clearSavedLessonSnapshot()`.
14. Stage 5 clear invalid restore to demo calls `clearSavedLessonSnapshot()`.
15. `lessonHasUnsavedChangesRef` stays in sync with the computed dirty state for URL navigation and async guards.
16. `beforeunload` registration depends on real dirty state and is cleaned up.
17. `saveStatus` effect does not briefly or permanently override clean restored lessons to `unsaved`.
18. Stale async open/restore responses cannot mark the wrong project as saved.

## Test Review Checks

Review `frontend/test/lessonDirtyState.test.js` and related tests.

Confirm tests cover:

- Saved/restored lesson snapshot starts clean.
- Setup edits are dirty.
- Story edits are dirty.
- Character edits are dirty.
- Scene edits are dirty.
- Media-relevant persisted lesson edits are dirty.
- Normalization-equivalent lessons compare cleanly.
- Canonical snapshots compare cleanly when object key order differs.
- Display-only save metadata does not make the lesson dirty.
- Meaningful lesson without a saved snapshot follows intended unsaved behavior.
- `beforeunload` guard still activates only when dirty.

If app-level dirty-state timing is not automated, note that residual risk and rely on manual QA.

## Failure Cases To Probe

Open findings for any of these:

- Restored/opened/saved lessons still show `Unsaved changes`.
- Save status flickers to `Unsaved changes` after restore/open/save and settles incorrectly.
- Dirty comparison strips meaningful persisted lesson fields.
- Dirty comparison includes display-only UI state.
- Snapshot is created from a different shape than the lesson applied to state.
- Snapshot updates do not trigger dirty-state recomputation.
- User edits accidentally call `markLessonSaved()`.
- Server-applied unsaved/local-only changes are marked saved without persistence.
- Demo fallback accidentally keeps the previous saved snapshot.
- Clean restored lessons still trigger discard prompts or `beforeunload`.
- Real dirty lessons do not trigger prompts or `beforeunload`.
- Stage 8 URL-open confirmation regresses.
- Full lesson snapshots are stored in browser storage.
- Backend API/storage changed unnecessarily.

## Commands To Run

Start with source inspection:

```sh
git status --short
sed -n '1,349p' docs/session-restoration-stage-9-avoid-false-unsaved-state-prompt.md
sed -n '1,220p' frontend/src/utils/lessonDirtyState.js
sed -n '1,240p' frontend/test/lessonDirtyState.test.js
sed -n '310,365p' frontend/src/App.jsx
sed -n '500,545p' frontend/src/App.jsx
sed -n '260,305p' frontend/src/App.jsx
sed -n '1560,1630p' frontend/src/App.jsx
sed -n '1748,1845p' frontend/src/App.jsx
sed -n '1,140p' frontend/src/utils/unsavedChangesGuard.js
sed -n '1,120p' frontend/test/unsavedChangesGuard.test.js
```

Inspect symbols and scope:

```sh
rg -n "createLessonSnapshot|lessonsHaveUnsavedChanges|markLessonSaved|clearSavedLessonSnapshot|lastSavedLessonSnapshot|savedSnapshotVersion|lessonHasUnsavedChanges|beforeunload|discardUnsavedChangesMessage|saveStatus" frontend/src frontend/test
rg -n "localStorage\\.setItem|sessionStorage|IndexedDB|indexedDB|JSON\\.stringify\\(lesson|setItem\\([^,]+,\\s*JSON" frontend/src frontend/test
rg -n "router\\.get\\(\"/\"|router\\.get\\(\"/:id\"|listProjects\\(|getProject\\(|updateProject\\(" server/src frontend/src
```

Run verification:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If any command cannot run, state exactly why.

## Manual QA Checklist

Manual browser QA is strongly recommended because Stage 9 concerns UI status and navigation prompts.

Run:

```sh
npm run dev
```

Then verify:

1. Load a saved lesson through startup URL restore and confirm status is `Saved`.
2. Refresh and confirm it remains `Saved`.
3. Load a saved lesson through localStorage restore and confirm status is `Saved`.
4. Clear URL/localStorage so Stage 7 auto-reopen runs and confirm status is `Saved`.
5. Open a saved lesson manually from the Open panel and confirm status is `Saved`.
6. Use Stage 8 project URL navigation to open another saved lesson and confirm status is `Saved`.
7. Save a lesson and confirm it remains `Saved` after the server response applies.
8. Duplicate a lesson and confirm the duplicate shows `Saved`.
9. Run a generation/approval operation that saves/applies a server lesson and confirm status is `Saved` after completion.
10. Make a real edit and confirm status changes to `Unsaved changes`.
11. With no real edit after restore/open/save, try New/Open/Duplicate/project URL navigation and confirm no discard prompt appears.
12. After a real edit, try New/Open/Duplicate/project URL navigation and confirm the discard prompt appears.
13. With no real edit, refresh/close tab and confirm no beforeunload warning appears.
14. After a real edit, refresh/close tab and confirm the beforeunload warning appears.
15. Confirm Stage 5 invalid restore clearing, Stage 6 list loading, Stage 7 auto-reopen, and Stage 8 URL navigation still work.

If manual QA is not run, state that explicitly.

## Report Format

Return findings first, ordered by severity:

```text
**Findings**

- [P1] [file (line N)](...): Description of the bug, why it violates Stage 9, and the likely user impact.
- [P2] ...
```

Then include:

```text
**Checks**

- Dirty snapshot utility:
- Saved transition integration:
- Prompt/beforeunload behavior:
- Stage 5/6/7/8 regression scope:
- Storage/backend scope:

**Verification**

- `npm run test --workspace frontend`: passed/failed/not run
- `npm run test --workspace server`: passed/failed/not run
- `npm run build --workspace frontend`: passed/failed/not run
- Manual browser QA: run/not run, with notes
```

If there are no findings, say that clearly and mention residual manual-QA or app-level timing gaps.
