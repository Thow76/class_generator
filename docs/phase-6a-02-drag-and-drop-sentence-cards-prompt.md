# Phase 6A.02 Drag-And-Drop Sentence Cards Prompt

Use this prompt to implement the second slice of the Story Editor Upgrade for
Lesson Source Builder.

## Prompt

You are implementing Phase 6A.02: Drag-And-Drop Sentence Cards.

Phase 6A.01 established that `lesson.story.sentences` array order is the single
source of truth for story sequence, while each sentence `id` remains stable
identity for editing and downstream references. This phase builds on that model
by letting tutors reorder sentence cards directly on the Story screen.

Implement sentence reordering only. Do not build delete sentence, add sentence,
insert sentence, split sentence, merge sentence, AI rebalance, AI revision
endpoints, scene replanning, generated media changes, export changes, accounts
or cloud sync in this phase.

## Phase Goal

Tutors should be able to move unlocked story sentences into a better order
without copying and pasting text between cards.

Done means:

- Unlocked story sentence cards can be reordered from the Story screen.
- Reordering changes `lesson.story.sentences` array order.
- Reordering preserves each sentence `id`.
- Visible sentence numbers update from the new array order.
- Manual edit, regenerate, shorten, lock and unlock behavior still works.
- Locked stories cannot be reordered until they are unlocked.
- Reordering marks the lesson unsaved.
- Reordering follows existing stale/downstream behavior when downstream output
  exists.
- Scene references remain ID-based and are not rewritten solely because a
  sentence moved.
- Save/open preserves the new sentence order.
- Tests cover the reorder model behavior.

## Product Reasoning

The AI may generate useful sentences in a weak order. For example, it might
start with unnecessary context:

```text
Anita is in her kitchen.
```

The tutor may want the story to start more directly:

```text
Anita phones the doctor.
```

Drag-and-drop sentence cards let the tutor reshape the master story before
locking it, while keeping sentence identity stable for scenes and later
generated materials.

This phase should feel like a story editor, not an AI rewrite feature.

## Current Relevant Files

Review these files before editing:

```text
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
docs/phase-5-story-generation.md
```

Also inspect any Phase 6A.01 tests that were added.

## Scope

Build:

- A frontend lesson update helper for moving a sentence within
  `lesson.story.sentences`.
- Story stage drag interaction for unlocked sentence cards.
- A visible drag handle on each unlocked sentence card.
- Clear dragging, drop target and keyboard/fallback states.
- Recalculation of display `number` values after reorder.
- Existing downstream stale behavior when story order changes after downstream
  work exists.
- Focused tests for reorder behavior.

Do not build:

- Delete sentence.
- Add sentence.
- Insert sentence.
- Split or merge sentence.
- AI sentence replacement.
- AI story rebalance.
- Backend story revision endpoints.
- Scene regrouping or scene planning.
- Scene reference cleanup after delete.
- Any generated media behavior.

## Required Behavior

### 1. Reorder The Array, Not The Text

When the tutor moves a sentence card, reorder the sentence objects in
`lesson.story.sentences`.

Good:

```js
[
  { id: "sentence-3", text: "Anita phones the doctor.", number: 1 },
  { id: "sentence-1", text: "The receptionist answers.", number: 2 }
]
```

Bad:

```js
[
  { id: "sentence-1", text: "Anita phones the doctor.", number: 1 },
  { id: "sentence-2", text: "The receptionist answers.", number: 2 }
]
```

Do not copy text between sentence records. Move the records.

### 2. Preserve Stable Sentence IDs

Reordering must never regenerate sentence IDs.

If `sentence-9` is dragged to the top, it should become:

```json
{ "id": "sentence-9", "number": 1, "text": "..." }
```

not:

```json
{ "id": "sentence-1", "number": 1, "text": "..." }
```

### 3. Recalculate Display Numbers

After every reorder, recalculate:

```js
number: index + 1
```

The Story stage should also display numbers from array position where practical,
as established in Phase 6A.01.

### 4. Locked Stories Are Not Reorderable

When `lesson.story.status === "locked"`:

- hide or disable drag handles
- do not allow drag start
- do not allow drop/reorder
- keep the current locked-story visual treatment
- use the existing unlock flow if the user wants to edit

Do not create a new locked-story policy in this phase.

### 5. Preserve Existing Sentence Actions

The existing unlocked actions must continue to work after reordering:

- Edit
- Save
- Regenerate
- Shorten
- Lock story

Those actions should still target the correct sentence by `sentence.id`, even
after the sentence has moved.

### 6. Mark Unsaved And Stale Consistently

Reordering is a story change.

Use the existing app update path so:

- the lesson becomes unsaved
- `modifiedAfterLock` follows the same rule as manual sentence edits
- generated or approved downstream records are marked stale when existing app
  behavior would mark them stale for story edits

At the time of writing, manual story edits use `hasDownstreamOutput(current)` and
`updateStorySentence(...)` to decide whether downstream work should be stale.
Create an equivalent reorder helper instead of bypassing that flow.

### 7. Scene References Remain ID-Based

Do not rewrite `scene.sentenceIds` when a sentence moves.

If a scene referenced `sentence-3` before reorder, it should still reference
`sentence-3` after reorder.

This phase does not regroup scenes. It only changes the master story order.

### 8. Save/Open Preserves New Order

After reorder:

1. Save the lesson.
2. Open the lesson again.
3. Confirm the sentence text order is unchanged.
4. Confirm sentence IDs are unchanged.
5. Confirm display numbers are recalculated from the saved array order.

## Drag Interaction Guidance

### Preferred Approach

The frontend currently has a small dependency set. Prefer a simple local
implementation unless a drag library is deliberately added and justified.

Acceptable approaches:

- Native HTML drag-and-drop for desktop plus keyboard move controls as an
  accessibility fallback.
- Pointer-event based reorder for better touch support.
- A small, well-supported React drag library only if added intentionally to the
  frontend package and covered by tests/manual QA.

Do not add a large framework or introduce app-wide state management for this.

### Drag Handle

Add a handle inside each unlocked sentence card.

Requirements:

- The handle should be visually distinct from Edit/Regenerate/Shorten.
- Dragging should start from the handle, not from the textarea.
- The handle should have an accessible label, for example:

```jsx
aria-label={`Move sentence ${index + 1}`}
```

- Use an existing icon pattern where possible. If the app's `Icon` component
  supports a suitable icon, use it.

Possible Material Symbols icon names:

```text
drag_indicator
swap_vert
unfold_more
```

### Drop Feedback

During drag, provide visible feedback:

- the dragged card should look active
- a card or insertion position should indicate where the sentence will land
- the layout should not jump erratically
- textareas and buttons should remain usable when not dragging

Keep styles consistent with existing `.sentence-card`, `.mini-button`, button
and stage patterns in `frontend/src/styles.css`.

### Keyboard/Fallback Movement

Drag-and-drop alone can be hard to use with keyboards and some touch devices.
Provide a minimal fallback in this phase if practical:

- Move up
- Move down

These controls can be icon buttons near the drag handle, a compact menu, or
buttons visible to screen readers and keyboard users.

If visible move buttons would crowd the current card UI, implement them as
accessible controls with careful styling. Do not let controls overlap text or
existing actions.

Move controls must:

- be disabled for the first item when moving up
- be disabled for the last item when moving down
- be disabled or hidden when the story is locked
- use the same reorder helper as drag-and-drop

## Implementation Guidance

### Lesson Update Helper

Add a focused helper in `frontend/src/utils/lessonUpdates.js`, for example:

```js
export function moveStorySentence(lesson, sentenceId, targetIndex, shouldMarkStale) {
  const fromIndex = lesson.story.sentences.findIndex(
    (sentence) => sentence.id === sentenceId
  );

  if (fromIndex < 0) return lesson;
  if (targetIndex < 0 || targetIndex >= lesson.story.sentences.length) return lesson;
  if (fromIndex === targetIndex) return lesson;

  const nextSentences = [...lesson.story.sentences];
  const [movedSentence] = nextSentences.splice(fromIndex, 1);
  nextSentences.splice(targetIndex, 0, movedSentence);

  return markDownstreamStaleIfNeeded(
    {
      ...lesson,
      story: {
        ...lesson.story,
        modifiedAfterLock:
          lesson.story.modifiedAfterLock ||
          (Boolean(lesson.story.lockedAt) && shouldMarkStale),
        sentences: renumberSentences(nextSentences)
      }
    },
    shouldMarkStale
  );
}
```

Adapt this to the actual Phase 6A.01 helper names. The important behavior is:

- no-op for invalid IDs or no movement
- move sentence records, not text
- preserve IDs
- recalculate numbers
- use the same downstream stale pattern as story edits

### App Wiring

In `frontend/src/App.jsx`:

- import the reorder helper
- add a handler such as `moveSentence(sentenceId, targetIndex)`
- pass it to `StoryStage`
- call the helper through `updateLesson(...)`
- pass `hasDownstreamOutput(current)` into the helper for stale behavior

Example shape:

```js
function moveSentence(sentenceId, targetIndex) {
  updateLesson((current) =>
    moveStorySentence(current, sentenceId, targetIndex, hasDownstreamOutput(current))
  );
}
```

### Story Stage

In `frontend/src/stages/StoryStage.jsx`:

- accept a new prop such as `onSentenceMove`
- maintain local drag state only inside the component
- use sentence IDs to track the dragged sentence
- derive visible numbers from array index
- disable all reorder behavior when `isLocked`
- keep existing edit state by sentence ID

Suggested local state:

```js
const [draggedSentenceId, setDraggedSentenceId] = useState(null);
const [dropTargetId, setDropTargetId] = useState(null);
```

Suggested handlers:

```js
function handleDragStart(event, sentenceId) {}
function handleDragOver(event, sentenceId) {}
function handleDrop(event, targetIndex) {}
function handleDragEnd() {}
```

Make sure dropping onto the dragged card is a no-op.

### Reorder Index Semantics

Be explicit about index semantics.

Recommended:

- `targetIndex` means the final index where the moved sentence should appear.
- Moving item at index 4 to `targetIndex = 1` inserts it before the current item
  at index 1.
- Moving item at index 1 to `targetIndex = 4` inserts it before the current item
  currently at index 4, after the original item has been removed.

Alternatively, implement `moveStorySentenceByIds(lesson, movedId, beforeId,
shouldMarkStale)` if that is less error-prone for drag-and-drop. The helper
should still have tests for upward and downward movement.

### Styling

Update `frontend/src/styles.css` as needed.

Style requirements:

- Drag handle has a stable size.
- Drag handle does not resize the card.
- Existing sentence text remains readable.
- Existing actions do not wrap awkwardly on common desktop widths.
- On mobile/narrow widths, controls wrap cleanly and do not overlap.
- Dragging state and drop target state are visually clear.
- Locked cards do not show active drag affordances.

Do not introduce decorative gradients, unrelated colors or card nesting.

## Tests

Add focused tests around the reorder helper and model behavior. Prefer utility
tests over brittle UI snapshots.

### Required Helper Tests

Test `moveStorySentence` or the equivalent helper:

1. Moving a sentence upward changes array order.
2. Moving a sentence downward changes array order.
3. Moving to the same index returns the original lesson or leaves order
   unchanged.
4. Moving an unknown sentence ID returns the original lesson or leaves order
   unchanged.
5. Reorder preserves all sentence IDs.
6. Reorder recalculates `number` from array order.
7. Reorder preserves sentence text and metadata.
8. Reorder does not rewrite `scene.sentenceIds`.
9. Reorder marks downstream records stale when `shouldMarkStale` is true.
10. Reorder does not mark downstream records stale when `shouldMarkStale` is
    false.

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

### UI Behavior To Manually Verify

Manual QA is important for drag-and-drop.

Verify:

1. Story cards can be dragged by the handle when unlocked.
2. Story cards cannot be dragged by the textarea while editing.
3. Dragging sentence 4 above sentence 2 updates the visible order.
4. Dragging sentence 2 below sentence 5 updates the visible order.
5. The visible numbers update immediately.
6. Edit still edits the correct sentence after reorder.
7. Regenerate still updates the correct sentence after reorder.
8. Shorten still updates the correct sentence after reorder.
9. Lock story disables drag handles/reordering.
10. Unlock story restores reorder controls.
11. Save and reopen preserves the reordered story.
12. Existing scene covered-sentence references still resolve to text.

## Acceptance Checklist

- Unlocked sentence cards have a clear drag/reorder affordance.
- Dragging a sentence updates the array order.
- Keyboard or fallback move controls exist, or the implementation documents why
  drag support is sufficient for this slice.
- Sentence IDs are preserved.
- Sentence text and metadata are preserved.
- Sentence display numbers update from new array order.
- Existing Story actions still target the correct sentence after reorder.
- Reorder is disabled for locked stories.
- Reorder marks the lesson unsaved.
- Reorder uses existing downstream stale behavior.
- Scene references remain ID-based and unchanged.
- Save/open preserves reordered sentence order.
- Tests cover upward and downward movement.
- Tests cover ID preservation and number recalculation.
- Tests cover scene references remaining unchanged.
- Tests pass.
- No delete, insert, split, merge or AI revision functionality has been added.

## Suggested Commands

Run the project-specific equivalents if scripts differ:

```sh
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
rg -n "moveStorySentence|onSentenceMove|drag_indicator|draggable|onDragStart|onDrop" frontend/src frontend/test
rg -n "delete sentence|remove sentence|insert sentence|split sentence|merge sentence|rebalance|revise" frontend/src server/src
```

## Out Of Scope For This Phase

These are intentionally left for later phases:

- Phase 6A.03: delete sentence.
- Phase 6A.04: add or insert sentence.
- Phase 6A.05: explicit scene-reference cleanup after delete or insert.
- Phase 6B: AI sentence tools and story rebalancing.

