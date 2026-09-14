# Phase 6A.02 Review Prompt

Use this prompt to review whether Phase 6A.02 of Lesson Source Builder was
implemented correctly.

## Prompt

You are reviewing Phase 6A.02: Drag-And-Drop Sentence Cards.

Your job is to verify that tutors can reorder unlocked story sentence cards on
the Story screen, and that reordering updates `lesson.story.sentences` array
order while preserving stable sentence IDs and existing downstream references.

Review Phase 6A.02 only. Do not require delete sentence, add sentence, insert
sentence, split sentence, merge sentence, AI rebalance, sentence-level OpenAI
revision endpoints, scene replanning, generated media changes, export changes,
accounts or cloud sync.

## Phase Goal

The implementation is correct only if:

- Unlocked sentence cards can be reordered from the Story screen.
- Reordering changes `lesson.story.sentences` array order.
- Reordering moves full sentence records rather than copying text between
  records.
- Reordering preserves each sentence `id`.
- Reordering recalculates sentence display numbers from array order.
- Existing Edit, Save, Regenerate and Shorten actions still target the correct
  sentence after reorder.
- Locked stories cannot be reordered until unlocked.
- Reordering marks the lesson unsaved.
- Reordering uses the same downstream stale behavior as other story edits.
- Scene references remain ID-based through `scene.sentenceIds`.
- Scene references are not rewritten solely because a sentence moved.
- Save/open preserves the reordered sentence order.
- Tests cover upward movement, downward movement, ID preservation, number
  recalculation, stale handling and scene-reference preservation.
- No later Phase 6A or Phase 6B features were accidentally added.

## Expected Files

Review these files or their close equivalents:

```text
docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md
docs/phase-6a-01-sentence-ordering-model-prompt.md
docs/phase-6a-01-review-prompt.md
frontend/src/App.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/styles.css
frontend/src/utils/lessonUpdates.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/validateLessonShape.js
frontend/src/stages/ScenesStage.jsx
frontend/test/validateSetup.test.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/storyGeneration.test.js
```

Also inspect any new tests added for Phase 6A.02.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
git diff -- docs frontend/src frontend/test server/src server/test package.json frontend/package.json package-lock.json
rg -n "moveStorySentence|onSentenceMove|moveSentence|drag_indicator|draggable|onDragStart|onDragOver|onDrop|dropTarget|draggedSentence" frontend/src frontend/test
rg -n "sentence\\.id|sentenceIds|scene\\.sentenceIds|number: index \\+ 1|renumber" frontend/src server/src frontend/test server/test
rg -n "delete sentence|remove sentence|insert sentence|add sentence|split sentence|merge sentence|rebalance|revise|revision" frontend/src server/src docs
rg -n "@dnd|dnd-kit|react-beautiful-dnd|sortable|drag" frontend/package.json package-lock.json frontend/src
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If scripts differ, inspect `package.json`, `frontend/package.json` and
`server/package.json`, then run the closest available frontend and backend test
commands.

## Review Steps

1. Read `docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md`.
2. Inspect the git diff and list every changed file.
3. Confirm the changes are limited to Phase 6A.02 reorder work.
4. Check whether any frontend drag dependency was added.
5. If a dependency was added, confirm it is frontend-only, justified by the
   implementation, and not an oversized framework for this task.
6. Inspect `frontend/src/utils/lessonUpdates.js`.
7. Confirm there is a focused reorder helper or equivalent update path.
8. Confirm the helper moves sentence objects, not just sentence text.
9. Confirm the helper uses sentence IDs to find the moved sentence.
10. Confirm upward movement and downward movement both produce the correct final
    array order.
11. Confirm invalid sentence IDs are no-ops.
12. Confirm moving to the same index is a no-op or leaves order unchanged.
13. Confirm sentence IDs, text and metadata are preserved.
14. Confirm sentence numbers are recalculated from final array order.
15. Confirm scene `sentenceIds` are not rewritten by reorder.
16. Confirm downstream stale behavior matches manual story edits when
    `shouldMarkStale` is true.
17. Confirm reorder does not mark downstream records stale when stale handling is
    not requested.
18. Inspect `frontend/src/App.jsx`.
19. Confirm the reorder handler goes through the normal `updateLesson(...)`
    path so the lesson becomes unsaved.
20. Confirm the handler passes current downstream-output state into the reorder
    helper.
21. Confirm the handler is passed to `StoryStage`.
22. Inspect `frontend/src/stages/StoryStage.jsx`.
23. Confirm drag state is local to the Story stage unless there is a clear reason
    otherwise.
24. Confirm dragging tracks sentence IDs, not display numbers.
25. Confirm the drag handle is visible only when reordering is allowed, or is
    disabled clearly when locked.
26. Confirm dragging starts from the handle rather than the textarea.
27. Confirm textareas and existing sentence buttons remain usable.
28. Confirm drop behavior calls the reorder handler with clear target semantics.
29. Confirm dropping onto the dragged item is a no-op.
30. Confirm visible sentence numbers update after reorder.
31. Confirm locked stories cannot start drag or trigger reorder.
32. Confirm existing Edit/Save/Regenerate/Shorten actions still pass the correct
    sentence ID after reorder.
33. Inspect `frontend/src/styles.css`.
34. Confirm drag handle, dragged state and drop target state are visually clear.
35. Confirm controls do not overlap story text or existing actions on desktop or
    narrow screens.
36. Inspect `frontend/src/stages/ScenesStage.jsx` if touched.
37. Confirm scene covered-sentence display still resolves by sentence ID.
38. Confirm no scene regrouping or delete cleanup was added in this phase.
39. Inspect tests.
40. Confirm tests cover the required helper/model behavior listed below.
41. Run the relevant test suite and frontend build.
42. Report any failures with exact file and line references.

## Required Test Coverage

Verify that tests cover the following behavior. If they do not, report the gap.

### Reorder Helper

The helper, whether named `moveStorySentence` or something similar, should be
tested for:

- moving a sentence upward
- moving a sentence downward
- no-op behavior for same-position moves
- no-op behavior for unknown sentence IDs
- sentence ID preservation
- sentence text preservation
- metadata preservation, such as `stale`, `source` and `updatedAt` if present
- `number` recalculation from array position
- scene `sentenceIds` preservation
- downstream records marked stale when `shouldMarkStale` is true
- downstream records not marked stale when `shouldMarkStale` is false

### Suggested Fixture

```js
const lesson = createEmptyLesson({
  story: {
    status: "draft",
    lockedAt: "2026-09-05T12:00:00.000Z",
    modifiedAfterLock: false,
    sentences: [
      { id: "sentence-1", number: 1, text: "First.", stale: false },
      { id: "sentence-2", number: 2, text: "Second.", stale: false },
      { id: "sentence-3", number: 3, text: "Third.", stale: false }
    ]
  },
  scenes: [
    {
      id: "scene-1",
      number: 1,
      label: "Scene 1",
      sentenceIds: ["sentence-1", "sentence-2"],
      location: "Clinic",
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

Expected after moving `sentence-3` to index 0:

```js
[
  { id: "sentence-3", number: 1, text: "Third." },
  { id: "sentence-1", number: 2, text: "First." },
  { id: "sentence-2", number: 3, text: "Second." }
]
```

Expected scene reference:

```js
["sentence-1", "sentence-2"]
```

### UI Or Integration Tests

If UI tests exist, verify they cover at least one reorder interaction. If no UI
test tooling exists, do not require it for this phase, but report whether manual
QA is still needed.

## Manual QA Checklist

Manual QA is especially important for drag-and-drop.

Use a story with at least five sentences, then verify:

1. In draft/unlocked state, each sentence has a clear reorder affordance.
2. Dragging sentence 4 above sentence 2 updates the visible order.
3. Dragging sentence 2 below sentence 5 updates the visible order.
4. The visible numbers update immediately after reorder.
5. The moved sentence keeps its text.
6. The moved sentence keeps its identity if IDs are visible in dev tools or saved
   JSON.
7. Edit opens the correct sentence after reorder.
8. Save/Edit updates the correct sentence after reorder.
9. Regenerate updates the correct sentence after reorder.
10. Shorten updates the correct sentence after reorder.
11. The textarea can be selected and edited without accidentally dragging.
12. Buttons can be clicked without accidentally dragging.
13. Locking the story disables drag/reorder behavior.
14. Unlocking restores drag/reorder behavior.
15. Reordering marks the project unsaved in the sidebar/status UI.
16. Saving and reopening preserves the new sentence order.
17. Existing scene covered sentences still display text instead of blank values.
18. On a narrow viewport, reorder controls do not overlap text or action
    buttons.

## Accessibility And UX Checks

Verify:

- The drag handle has an accessible label.
- Reorder controls are reachable by keyboard, or there is a documented reason
  keyboard movement was deferred.
- If Move up/Move down controls exist, first/last item states are disabled
  correctly.
- Focus is not trapped or lost during ordinary edit and reorder actions.
- The dragged and drop-target visual states are perceivable without relying only
  on tiny layout shifts.
- Locked cards do not show misleading active drag affordances.

## Specific Failure Modes To Look For

Report these as findings if present:

- Reorder copies text between sentence slots instead of moving sentence records.
- Reorder changes sentence IDs to match display numbers.
- Reorder updates by array index after drag state has gone stale, causing the
  wrong sentence to move.
- Upward movement works but downward movement inserts at the wrong position.
- Downward movement works but upward movement inserts at the wrong position.
- Sentence numbers are not recalculated after reorder.
- Story UI still displays stale `sentence.number` values.
- Edit, Regenerate or Shorten affects the wrong sentence after reorder.
- Reorder can run while the story is locked.
- Dragging starts from the textarea or interferes with text selection.
- Scene `sentenceIds` are rewritten or converted to display numbers.
- Scene covered sentences break after reorder.
- Reorder bypasses `updateLesson(...)` and does not mark the lesson unsaved.
- Reorder bypasses downstream stale handling.
- Drag styling causes overlapping text or unstable card heights.
- A new dependency was added without a clear need or without package-lock
  consistency.
- Delete, insert, split, merge, AI rebalance or backend revision features were
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
- Brief statement of whether Phase 6A.02 is correctly implemented.
```

If there are no findings, say so clearly and mention any residual test gaps or
manual QA still needed.

## Out Of Scope

Do not mark the implementation incomplete because it lacks:

- delete sentence
- add or insert sentence
- split or merge sentence
- AI sentence replacement
- AI story rebalance
- scene regrouping after reorder
- scene cleanup after delete
- generated media changes
- export changes

Those belong to later phases.

