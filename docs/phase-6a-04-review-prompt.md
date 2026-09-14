# Phase 6A.04 Review Prompt

Use this prompt to review whether Phase 6A.04 of Lesson Source Builder was
implemented correctly.

## Prompt

You are reviewing Phase 6A.04: Add Sentence.

Your job is to verify that tutors can add a new manual sentence to an unlocked
story, and that adding creates a safe new sentence record while preserving
existing sentence IDs, recalculating display numbers, preserving scene
references and keeping the lesson valid.

Review Phase 6A.04 only. Do not require split sentence, merge sentence, AI
rebalance, AI sentence replacement, sentence-level OpenAI revision endpoints,
scene replanning, generated media changes, export changes, accounts or cloud
sync.

## Phase Goal

The implementation is correct only if:

- Unlocked stories expose a clear Add sentence action.
- Add opens a composer or input before committing a new sentence.
- Empty or whitespace-only text cannot be added.
- Cancel closes the composer and leaves the story unchanged.
- Submitting non-empty text creates exactly one new sentence record in
  `lesson.story.sentences`.
- The new sentence text is trimmed.
- The new sentence receives a safe, unique, stable ID.
- Existing sentence IDs are preserved.
- Existing sentence text and metadata are preserved.
- Sentence display numbers are recalculated from array order.
- Adding at the end of the story is supported.
- If positioned insertion was implemented, it uses sentence IDs and preserves
  all surrounding sentence records correctly.
- The story can have more or fewer sentences than `lesson.sentenceCount` after
  adding.
- Normal save/open validation accepts an edited story whose length differs from
  the Setup target.
- Locked stories cannot add sentences until unlocked.
- Adding marks the lesson unsaved.
- Adding uses the same downstream stale behavior as other story edits.
- Existing `scene.sentenceIds` remain ID-based and unchanged.
- Existing Edit, Regenerate, Shorten, drag/reorder, Delete, lock and unlock
  behavior still works.
- Save/open preserves the added sentence.
- Tests cover add behavior, unique ID generation, number recalculation,
  scene-reference preservation, stale handling and count mismatch behavior.
- No later Phase 6A or Phase 6B features were accidentally added.

## Expected Files

Review these files or their close equivalents:

```text
docs/phase-6a-04-add-sentence-prompt.md
docs/phase-6a-03-delete-sentence-prompt.md
docs/phase-6a-03-review-prompt.md
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

Also inspect any new tests added for Phase 6A.04.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
git diff -- docs frontend/src frontend/test server/src server/test package.json frontend/package.json package-lock.json
rg -n "addStorySentence|onSentenceAdd|addSentence|newSentence|isAddingSentence|Insert after|insertAfter|createNextSentenceId|sentenceIds" frontend/src frontend/test server/src server/test docs
rg -n "deleteStorySentence|onSentenceDelete|moveStorySentence|onSentenceMove|drag_indicator|draggable" frontend/src frontend/test
rg -n "number: index \\+ 1|renumber|sentence\\.id|sentence\\.number|updatedAt|source: \"manual\"" frontend/src server/src frontend/test server/test
rg -n "split sentence|merge sentence|rebalance|revise|revision|/api/story/revise|/api/story/.+sentence" frontend/src server/src docs
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If scripts differ, inspect `package.json`, `frontend/package.json` and
`server/package.json`, then run the closest available frontend and backend test
commands.

## Review Steps

1. Read `docs/phase-6a-04-add-sentence-prompt.md`.
2. Inspect the git diff and list every changed file.
3. Confirm the changes are limited to Phase 6A.04 add-sentence work.
4. Inspect `frontend/src/utils/lessonUpdates.js`.
5. Confirm there is a focused add helper or equivalent update path.
6. Confirm the helper creates a new sentence record instead of appending text to
   an existing sentence.
7. Confirm whitespace-only text is a no-op.
8. Confirm submitted text is trimmed.
9. Confirm the new sentence receives a safe ID that passes backend validation.
10. Confirm the new sentence ID is unique within `lesson.story.sentences`.
11. Confirm the ID generator does not collide after prior deletes or non-sequential
    existing IDs.
12. Confirm existing sentence IDs are preserved.
13. Confirm existing sentence text and metadata are preserved.
14. Confirm the added sentence has expected metadata such as `source: "manual"`
    and `updatedAt` if the implementation uses those fields.
15. Confirm all sentence numbers are recalculated from final array order.
16. Confirm adding does not force story length back to `lesson.sentenceCount`.
17. Confirm existing scene `sentenceIds` are not rewritten by adding.
18. Confirm new unreferenced sentences do not make scene validation fail.
19. Confirm downstream stale behavior matches manual story edits, reorder and
    delete behavior when `shouldMarkStale` is true.
20. Confirm adding does not mark downstream records stale when `shouldMarkStale`
    is false and existing policy does not require it.
21. Inspect `frontend/src/App.jsx`.
22. Confirm the add handler goes through the normal `updateLesson(...)` path so
    the lesson becomes unsaved.
23. Confirm the handler passes current downstream-output state into the add
    helper.
24. Confirm the handler is passed to `StoryStage`.
25. Inspect `frontend/src/stages/StoryStage.jsx`.
26. Confirm Add sentence is available only for unlocked stories, or disabled
    clearly when locked.
27. Confirm locked stories cannot trigger add handlers.
28. Confirm opening the add composer does not mutate the lesson.
29. Confirm Cancel closes the composer and leaves the lesson unchanged.
30. Confirm Add/Save is disabled or blocked for empty trimmed text.
31. Confirm successful add clears composer state.
32. Confirm composer state does not overwrite or lose currently edited existing
    sentence text unexpectedly.
33. Confirm the added sentence appears at the end of the story unless positioned
    insertion was deliberately implemented.
34. If positioned insertion was implemented, confirm it computes the insertion
    point from sentence ID at submit time, not stale array index.
35. Confirm existing Edit/Save/Regenerate/Shorten actions still pass the correct
    sentence ID after adding.
36. Confirm drag/reorder still works after adding.
37. Confirm Delete still works after adding.
38. Inspect `frontend/src/stages/ScenesStage.jsx` if touched.
39. Confirm existing covered sentence display still resolves by sentence ID.
40. Confirm no scene assignment or scene regrouping workflow was added in this
    phase.
41. Inspect frontend and backend validation.
42. Confirm normal lesson validation does not reject stories solely because
    their length is above or below `lesson.sentenceCount`.
43. Confirm validation still rejects empty sentence text if an empty sentence
    somehow enters the model.
44. Inspect tests.
45. Confirm tests cover the required behavior listed below.
46. Run the relevant test suite and frontend build.
47. Report any failures with exact file and line references.

## Required Test Coverage

Verify that tests cover the following behavior. If they do not, report the gap.

### Add Helper

The helper, whether named `addStorySentence` or something similar, should be
tested for:

- adding non-empty text creates exactly one new sentence record
- whitespace-only text is a no-op
- submitted text is trimmed
- new sentence ID is safe
- new sentence ID is unique
- new sentence ID does not collide after deletion or non-sequential existing IDs
- existing sentence IDs are preserved
- existing sentence text is preserved
- existing metadata is preserved, such as `stale`, `source` and `updatedAt` if
  present
- all `number` values are recalculated from array order
- added sentence has `source: "manual"` if source metadata is used
- added sentence has `updatedAt` if timestamp metadata is used
- existing scene `sentenceIds` are not rewritten
- new unreferenced sentence does not invalidate existing scenes
- downstream records are marked stale when `shouldMarkStale` is true
- downstream records are not marked stale when `shouldMarkStale` is false and
  existing policy does not require it
- current story length may differ from `lesson.sentenceCount`

If positioned insertion was implemented, tests should also cover:

- insertion at a specific index
- clamping invalid low or high indexes safely
- insert-after behavior computes target from sentence ID
- surrounding sentence IDs and order are preserved

### Suggested Fixture

```js
const lesson = createEmptyLesson({
  sentenceCount: 3,
  story: {
    status: "draft",
    lockedAt: "2026-09-05T12:00:00.000Z",
    modifiedAfterLock: false,
    sentences: [
      { id: "sentence-1", number: 1, text: "Anita phones the doctor.", stale: false },
      { id: "sentence-3", number: 2, text: "The receptionist answers.", stale: false }
    ]
  },
  scenes: [
    {
      id: "scene-1",
      number: 1,
      label: "Scene 1",
      sentenceIds: ["sentence-1"],
      location: "Phone call",
      description: "",
      characterIds: [],
      imageMode: "generate",
      reuseSceneId: null,
      generationStatus: "generated",
      generationCount: 1,
      imagePath: null,
      approved: false,
      stale: false
    }
  ]
});
```

Expected after adding ` She asks for an appointment. `:

```js
lesson.story.sentences.map(({ id, number, text }) => ({ id, number, text }))
```

equals something like:

```js
[
  { id: "sentence-1", number: 1, text: "Anita phones the doctor." },
  { id: "sentence-3", number: 2, text: "The receptionist answers." },
  { id: "sentence-2", number: 3, text: "She asks for an appointment." }
]
```

The exact new ID may differ, but it must be safe and unique.

Expected scene references:

```js
[
  { id: "scene-1", sentenceIds: ["sentence-1"] }
]
```

### Validation Tests

Verify tests confirm:

- a lesson remains valid after adding a non-empty sentence
- story length greater than `lesson.sentenceCount` is valid for normal save/open
- story length below `lesson.sentenceCount` remains valid after prior deletion
- a new unreferenced sentence does not make scene validation fail
- empty sentence text is still invalid if it somehow enters the model

### UI Or Integration Tests

If UI tests exist, verify they cover at least one add/cancel/submit flow. If no
UI test tooling exists, do not require it for this phase, but report whether
manual QA is still needed.

## Manual QA Checklist

Manual QA is important because this changes the main story editor workflow.

Use a draft story with at least two sentences and at least one existing scene
reference, then verify:

1. Add sentence is visible on unlocked stories.
2. Add sentence is hidden or disabled on locked stories.
3. Opening the composer does not change the story.
4. Whitespace-only input cannot be added.
5. Cancel closes the composer and leaves the story unchanged.
6. Adding non-empty text creates one new sentence card.
7. The new sentence text is trimmed.
8. The new card appears at the end unless positioned insertion was implemented.
9. The new sentence has a safe unique ID in saved JSON.
10. Existing sentence IDs are preserved in saved JSON.
11. Existing sentence text and order are preserved.
12. Visible numbers update immediately.
13. Story length can become greater than Setup target.
14. Save succeeds after adding.
15. Reopen preserves the added sentence and current order.
16. Edit works on the new sentence.
17. Drag/reorder works on the new sentence.
18. Delete works on the new sentence.
19. Regenerate and Shorten still target the correct sentences.
20. Lock story still locks the edited story.
21. Unlock story restores add/delete/reorder/edit controls.
22. Existing scene references still display covered sentence text.
23. Existing scene references are unchanged in saved JSON.
24. Adding marks the project unsaved.
25. If downstream output existed, records show stale state according to existing
    app patterns.
26. Composer controls do not overlap story text, drag handles, delete
    confirmation or edit controls on a narrow viewport.

If positioned insertion was implemented, also verify:

27. Insert after sentence 1 creates a new card after sentence 1.
28. Insert after still targets the correct sentence after reordering.
29. Canceling an insert composer does not add a sentence.

## Accessibility And UX Checks

Verify:

- Add sentence control has clear text or an accessible label.
- Composer textarea has an accessible label.
- Add/Save and Cancel controls are keyboard reachable.
- Disabled empty-text state is understandable.
- Focus behavior is sensible after opening, canceling and submitting.
- The add action is easy to find but not visually louder than Lock story.
- Composer state is understandable without lengthy instructional text.
- Locked stories do not show misleading active add affordances.
- Count mismatch notice, if present, updates after adding.

## Specific Failure Modes To Look For

Report these as findings if present:

- Add appends text into an existing sentence instead of creating a sentence
  record.
- Add commits an empty or whitespace-only sentence.
- Add stores untrimmed text with accidental leading/trailing whitespace.
- New sentence ID is missing, unsafe or duplicated.
- New sentence ID is based on user-entered text.
- New sentence ID collides after a prior delete or non-sequential IDs.
- Existing sentence IDs are rewritten to match display numbers.
- Existing sentence metadata is lost.
- Sentence numbers are not recalculated after adding.
- Add forces story length to match `lesson.sentenceCount`.
- Normal save/open validation rejects a story only because it has more
  sentences than `lesson.sentenceCount`.
- Existing scene `sentenceIds` are rewritten or converted to display numbers.
- New unreferenced sentences make scene validation fail.
- Add can run while the story is locked.
- Opening or canceling the composer marks the lesson unsaved without adding.
- Add bypasses `updateLesson(...)` and does not mark the lesson unsaved after
  successful submit.
- Add bypasses downstream stale handling.
- Edit, Regenerate, Shorten, drag/reorder or Delete affects the wrong sentence
  after adding.
- Composer controls overlap story text, drag handles, delete confirmation or
  existing actions.
- Split, merge, AI rebalance, backend revision or scene assignment features were
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
- Brief statement of whether Phase 6A.04 is correctly implemented.
```

If there are no findings, say so clearly and mention any residual test gaps or
manual QA still needed.

## Out Of Scope

Do not mark the implementation incomplete because it lacks:

- split sentence
- merge sentence
- AI sentence replacement
- AI story rebalance
- backend story revision endpoints
- scene assignment for newly added sentences
- richer scene review workflows
- generated media changes
- export changes

Those belong to later phases.

