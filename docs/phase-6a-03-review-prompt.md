# Phase 6A.03 Review Prompt

Use this prompt to review whether Phase 6A.03 of Lesson Source Builder was
implemented correctly.

## Prompt

You are reviewing Phase 6A.03: Delete Sentence.

Your job is to verify that tutors can delete a redundant sentence from an
unlocked story, and that deletion removes the sentence record while preserving
remaining sentence IDs, recalculating display numbers, cleaning scene references
and keeping the lesson valid.

Review Phase 6A.03 only. Do not require add sentence, insert sentence, split
sentence, merge sentence, AI rebalance, sentence-level OpenAI revision endpoints,
scene replanning, generated media changes, export changes, accounts or cloud
sync.

## Phase Goal

The implementation is correct only if:

- Unlocked sentence cards expose a clear Delete action.
- Delete requires a lightweight confirmation before removing the sentence.
- Cancel leaves the story unchanged.
- Confirming delete removes the selected sentence object from
  `lesson.story.sentences`.
- Deletion preserves all remaining sentence IDs.
- Deletion preserves remaining sentence text and metadata.
- Deletion recalculates remaining sentence display numbers from array order.
- The story can have fewer sentences than `lesson.sentenceCount` after deletion.
- Normal save/open validation still accepts an edited story whose length differs
  from the Setup target.
- Locked stories cannot delete sentences until unlocked.
- Deletion marks the lesson unsaved.
- Deletion uses the same downstream stale behavior as other story edits.
- The deleted sentence ID is removed from every `scene.sentenceIds` array.
- Scenes are preserved even if they lose all sentence references.
- Existing Edit, Regenerate, Shorten, drag/reorder, lock and unlock behavior
  still works.
- Save/open preserves the deletion.
- Tests cover deletion, stable IDs, number recalculation, scene-reference
  cleanup, stale handling and count mismatch behavior.
- No later Phase 6A or Phase 6B features were accidentally added.

## Expected Files

Review these files or their close equivalents:

```text
docs/phase-6a-03-delete-sentence-prompt.md
docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md
docs/phase-6a-02-review-prompt.md
docs/phase-6a-01-sentence-ordering-model-prompt.md
docs/phase-6a-01-review-prompt.md
frontend/src/App.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/styles.css
frontend/src/utils/lessonUpdates.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/test/validateSetup.test.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/storyGeneration.test.js
```

Also inspect any new tests added for Phase 6A.03.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
git diff -- docs frontend/src frontend/test server/src server/test package.json frontend/package.json package-lock.json
rg -n "deleteStorySentence|onSentenceDelete|deleteSentence|confirmDelete|Delete this sentence|Delete\\?|sentenceIds" frontend/src frontend/test server/src server/test docs
rg -n "moveStorySentence|onSentenceMove|drag_indicator|draggable|onDragStart|onDrop" frontend/src frontend/test
rg -n "number: index \\+ 1|renumber|sentence\\.id|sentence\\.number" frontend/src server/src frontend/test server/test
rg -n "insert sentence|add sentence|split sentence|merge sentence|rebalance|revise|revision|/api/story/revise" frontend/src server/src docs
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If scripts differ, inspect `package.json`, `frontend/package.json` and
`server/package.json`, then run the closest available frontend and backend test
commands.

## Review Steps

1. Read `docs/phase-6a-03-delete-sentence-prompt.md`.
2. Inspect the git diff and list every changed file.
3. Confirm the changes are limited to Phase 6A.03 delete-sentence work.
4. Inspect `frontend/src/utils/lessonUpdates.js`.
5. Confirm there is a focused delete helper or equivalent update path.
6. Confirm the helper deletes by stable sentence ID.
7. Confirm the helper removes the sentence record rather than copying later text
   into the deleted slot.
8. Confirm unknown sentence IDs are no-ops.
9. Confirm remaining sentence IDs are preserved.
10. Confirm remaining sentence text and metadata are preserved.
11. Confirm remaining sentence numbers are recalculated from final array order.
12. Confirm deletion does not force the story length back to
    `lesson.sentenceCount`.
13. Confirm scene `sentenceIds` arrays remove the deleted sentence ID.
14. Confirm unaffected scene references are not rewritten.
15. Confirm scenes are not deleted if they lose all sentence references.
16. Confirm scenes with empty `sentenceIds` remain valid if deletion removes
    their last covered sentence.
17. Confirm affected generated or approved scenes are marked stale.
18. Confirm downstream stale behavior matches manual story edits and reorder
    behavior when `shouldMarkStale` is true.
19. Confirm deletion does not mark unrelated downstream records stale when
    `shouldMarkStale` is false and existing policy does not require it.
20. Inspect `frontend/src/App.jsx`.
21. Confirm the delete handler goes through the normal `updateLesson(...)` path
    so the lesson becomes unsaved.
22. Confirm the handler passes current downstream-output state into the delete
    helper.
23. Confirm the handler is passed to `StoryStage`.
24. Inspect `frontend/src/stages/StoryStage.jsx`.
25. Confirm Delete is available only for unlocked story cards, or disabled
    clearly when locked.
26. Confirm locked stories cannot trigger delete handlers.
27. Confirm Delete requires confirmation.
28. Confirm Cancel clears confirmation state and leaves the sentence unchanged.
29. Confirm confirmation state is tracked by sentence ID, not array index.
30. Confirm confirmation state clears after deletion.
31. Confirm confirmation state cannot drift to the wrong sentence after reorder.
32. Confirm Delete is disabled or hidden when only one sentence remains, unless
    the implementation intentionally allows an empty story and handles that
    everywhere.
33. Confirm existing Edit/Save/Regenerate/Shorten actions still pass the correct
    sentence ID after deletion.
34. Confirm drag/reorder still works after deletion.
35. Inspect `frontend/src/stages/ScenesStage.jsx` if touched.
36. Confirm covered sentence display handles scenes with no sentence references
    without crashing or rendering confusing blank values.
37. Confirm scene regrouping was not added in this phase.
38. Inspect `frontend/src/utils/validateLessonShape.js` and backend validation.
39. Confirm normal lesson validation does not reject stories solely because
    their length is below `lesson.sentenceCount`.
40. Confirm validation still rejects scene references to missing sentence IDs
    when cleanup is not performed.
41. Inspect tests.
42. Confirm tests cover the required behavior listed below.
43. Run the relevant test suite and frontend build.
44. Report any failures with exact file and line references.

## Required Test Coverage

Verify that tests cover the following behavior. If they do not, report the gap.

### Delete Helper

The helper, whether named `deleteStorySentence` or something similar, should be
tested for:

- deleting an existing sentence removes that sentence record
- deleting an unknown sentence ID is a no-op
- remaining sentence IDs are preserved
- remaining sentence text is preserved
- remaining metadata is preserved, such as `stale`, `source` and `updatedAt` if
  present
- remaining `number` values are recalculated from array order
- current story length may differ from `lesson.sentenceCount`
- deleted sentence ID is removed from all scene `sentenceIds`
- unaffected scene `sentenceIds` are not rewritten
- scenes are not deleted when they lose all sentence references
- affected generated scenes are marked stale
- affected approved scenes are marked stale
- downstream records are marked stale when `shouldMarkStale` is true
- unrelated downstream records are not marked stale when `shouldMarkStale` is
  false and existing policy does not require it

### Suggested Fixture

```js
const lesson = createEmptyLesson({
  sentenceCount: 3,
  story: {
    status: "draft",
    lockedAt: "2026-09-05T12:00:00.000Z",
    modifiedAfterLock: false,
    sentences: [
      { id: "sentence-1", number: 1, text: "Anita is in her kitchen.", stale: false },
      { id: "sentence-2", number: 2, text: "Anita phones the doctor.", stale: false },
      { id: "sentence-3", number: 3, text: "The receptionist answers.", stale: false }
    ]
  },
  scenes: [
    {
      id: "scene-1",
      number: 1,
      label: "Scene 1",
      sentenceIds: ["sentence-1", "sentence-2"],
      location: "Kitchen",
      description: "",
      characterIds: [],
      imageMode: "generate",
      reuseSceneId: null,
      generationStatus: "generated",
      generationCount: 1,
      imagePath: null,
      approved: false,
      stale: false
    },
    {
      id: "scene-2",
      number: 2,
      label: "Scene 2",
      sentenceIds: ["sentence-3"],
      location: "Phone call",
      description: "",
      characterIds: [],
      imageMode: "generate",
      reuseSceneId: null,
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    }
  ]
});
```

Expected after deleting `sentence-1`:

```js
lesson.story.sentences.map(({ id, number, text }) => ({ id, number, text }))
```

equals:

```js
[
  { id: "sentence-2", number: 1, text: "Anita phones the doctor." },
  { id: "sentence-3", number: 2, text: "The receptionist answers." }
]
```

Expected scene references:

```js
[
  { id: "scene-1", sentenceIds: ["sentence-2"], stale: true },
  { id: "scene-2", sentenceIds: ["sentence-3"], stale: false }
]
```

### Empty Scene Reference Case

Include a test where the deleted sentence is the only reference for a scene:

```js
{
  id: "scene-3",
  sentenceIds: ["sentence-1"],
  generationStatus: "generated",
  approved: false,
  stale: false
}
```

Expected after deleting `sentence-1`:

```js
{
  id: "scene-3",
  sentenceIds: [],
  stale: true
}
```

The scene should remain present.

### Validation Tests

Verify tests confirm:

- a lesson remains valid after deletion when scene references are cleaned
- story length below `lesson.sentenceCount` is valid for normal save/open
- a scene with empty `sentenceIds` remains valid if deletion removed all covered
  sentences
- a scene referencing the deleted sentence ID is still invalid if cleanup is not
  performed

### UI Or Integration Tests

If UI tests exist, verify they cover at least one delete confirmation flow. If no
UI test tooling exists, do not require it for this phase, but report whether
manual QA is still needed.

## Manual QA Checklist

Manual QA is important because deletion is destructive.

Use a draft story with at least three sentences and at least one scene reference,
then verify:

1. Delete is visible on unlocked sentence cards.
2. Delete is hidden or disabled on locked sentence cards.
3. Delete asks for confirmation before removing the sentence.
4. Cancel leaves the sentence card unchanged.
5. Confirm removes the selected sentence card.
6. Remaining visible numbers update immediately.
7. Remaining text order is preserved.
8. Remaining sentence IDs are preserved in saved JSON.
9. Story length can become smaller than Setup target.
10. Save succeeds after deletion.
11. Reopen preserves the deletion and current sentence order.
12. Edit still edits the correct sentence after deletion.
13. Drag/reorder still moves the correct sentence after deletion.
14. Regenerate still updates the correct sentence after deletion.
15. Shorten still updates the correct sentence after deletion.
16. Lock story still locks the edited story.
17. Unlock story restores delete/reorder/edit controls.
18. Scenes no longer reference the deleted sentence ID.
19. Scenes still display covered sentence text for remaining references.
20. A scene that loses all sentence references does not crash the UI.
21. Deleting marks the project unsaved.
22. If downstream output existed, affected records show stale state according to
    existing app patterns.
23. Delete confirmation controls do not overlap text or drag/edit controls on a
    narrow viewport.

## Accessibility And UX Checks

Verify:

- Delete controls have accessible labels or clear text.
- Confirmation controls are keyboard reachable.
- Focus behavior is sensible after Cancel and after Confirm Delete.
- The destructive action is visually distinct from Cancel.
- Delete is not visually dominant compared with primary story workflow actions.
- Delete confirmation state is understandable without lengthy instructional
  text.
- Locked cards do not show misleading active delete affordances.
- If only one sentence remains, disabled Delete state is understandable.

## Specific Failure Modes To Look For

Report these as findings if present:

- Delete copies later sentence text upward instead of removing the sentence
  record.
- Delete rewrites remaining sentence IDs to match display numbers.
- Delete targets array index instead of sentence ID and removes the wrong card
  after reorder.
- Confirmation state is tracked by index and points at the wrong sentence after
  reorder.
- Cancel still deletes or mutates the story.
- Deleting does not recalculate visible numbers.
- Delete can run while the story is locked.
- Delete bypasses `updateLesson(...)` and does not mark the lesson unsaved.
- Delete bypasses downstream stale handling.
- Deleted sentence ID remains in any `scene.sentenceIds` array.
- Scenes are deleted when they merely lose sentence references.
- Scenes that lose all sentence references crash the UI.
- Normal save/open validation rejects a story only because it has fewer
  sentences than `lesson.sentenceCount`.
- Edit, Regenerate, Shorten or drag/reorder affects the wrong sentence after
  deletion.
- Delete controls overlap story text, drag handles or existing actions.
- Add, insert, split, merge, AI rebalance or backend revision features were
  added in this phase.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```text
Findings
- [P1] Title - file:line
  Explanation of the bug, risk or missing requirement.

Open Questions
- Any unclear product or implementation assumptions.

Test Results
- Command: result.

Summary
- Brief statement of whether Phase 6A.03 is correctly implemented.
```

If there are no findings, say so clearly and mention any residual test gaps or
manual QA still needed.

## Out Of Scope

Do not mark the implementation incomplete because it lacks:

- add or insert sentence
- split or merge sentence
- AI sentence replacement
- AI story rebalance
- scene regrouping after delete
- richer scene review workflows
- generated media changes
- export changes

Those belong to later phases.

