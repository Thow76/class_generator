# Phase 6A.03 Delete Sentence Prompt

Use this prompt to implement the third slice of the Story Editor Upgrade for
Lesson Source Builder.

## Prompt

You are implementing Phase 6A.03: Delete Sentence.

Phase 6A.01 established that `lesson.story.sentences` array order is the single
source of truth for story sequence. Phase 6A.02 added sentence reordering while
preserving stable sentence IDs. This phase adds the ability for tutors to delete
a redundant sentence completely from an unlocked story.

Implement sentence deletion only. Do not build add sentence, insert sentence,
split sentence, merge sentence, AI rebalance, AI revision endpoints, scene
replanning, generated media changes, export changes, accounts or cloud sync in
this phase.

## Phase Goal

Tutors should be able to remove a superfluous sentence card from a draft story
without manually copying text between sentence slots.

Done means:

- Unlocked story sentence cards expose a clear Delete action.
- Deleting removes the selected sentence object from
  `lesson.story.sentences`.
- Deleting preserves all remaining sentence IDs.
- Deleting recalculates remaining sentence display numbers from array order.
- Deleting removes the deleted sentence ID from any `scene.sentenceIds`.
- Scenes that referenced the deleted sentence are marked stale when appropriate.
- Existing downstream stale behavior remains consistent with story edits.
- Existing Edit, Regenerate, Shorten, drag/reorder, lock and unlock behavior
  still works.
- Locked stories cannot delete sentences until unlocked.
- Deleting marks the lesson unsaved.
- Save/open preserves the deletion.
- The app remains valid if the story has fewer sentences than the Setup target.
- Tests cover deletion, renumbering, stable IDs, scene-reference cleanup and
  stale handling.

## Product Reasoning

The AI may generate redundant setup information, such as:

```text
Anita is in her kitchen.
```

If that sentence does not help the learning task, the tutor should be able to
delete it completely and let the story begin more directly:

```text
Anita phones the doctor.
```

This phase gives the tutor editorial control. It should not try to fill the gap
automatically. If a tutor deletes one sentence from a 12-sentence story, the
story may temporarily have 11 sentences. Later phases can add sentence insertion
or AI rebalancing back to the target count.

## Current Relevant Files

Review these files before editing:

```text
docs/phase-6a-01-sentence-ordering-model-prompt.md
docs/phase-6a-01-review-prompt.md
docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md
docs/phase-6a-02-review-prompt.md
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
docs/phase-5-story-generation.md
```

Also inspect any Phase 6A.01 and Phase 6A.02 tests that were added.

## Scope

Build:

- A frontend lesson update helper for deleting one story sentence by ID.
- Story stage Delete action on unlocked sentence cards.
- A lightweight confirmation flow before deletion.
- Recalculation of remaining sentence numbers after deletion.
- Minimal scene-reference cleanup for the deleted sentence ID.
- Stale marking for affected downstream records.
- Focused tests for deletion behavior.

Do not build:

- Add sentence.
- Insert sentence.
- Split or merge sentence.
- AI replacement or rebalance.
- Backend story revision endpoints.
- Full scene regrouping.
- Scene planning UI.
- Generated media changes.
- Export changes.

## Required Behavior

### 1. Delete The Sentence Record

When the tutor deletes a sentence, remove that sentence object from
`lesson.story.sentences`.

Good:

```js
// Before
[
  { id: "sentence-1", text: "Anita is in her kitchen.", number: 1 },
  { id: "sentence-2", text: "Anita phones the doctor.", number: 2 }
]

// After deleting sentence-1
[
  { id: "sentence-2", text: "Anita phones the doctor.", number: 1 }
]
```

Bad:

```js
[
  { id: "sentence-1", text: "Anita phones the doctor.", number: 1 }
]
```

Do not copy later text into the deleted sentence's slot. Delete the record.

### 2. Preserve Remaining Sentence IDs

Deletion must not regenerate or renumber remaining sentence IDs.

If `sentence-9` becomes the first visible sentence after deletion, it should be:

```json
{ "id": "sentence-9", "number": 1, "text": "..." }
```

not:

```json
{ "id": "sentence-1", "number": 1, "text": "..." }
```

### 3. Recalculate Display Numbers

After deletion, recalculate:

```js
number: index + 1
```

The Story stage should continue displaying numbers from array position where
practical, as established in Phase 6A.01.

### 4. Allow Actual Count To Differ From Setup Target

Do not force the story back to `lesson.sentenceCount` in this phase.

If Setup target is 12 and the tutor deletes one redundant sentence, the story may
have 11 sentences.

The app should still save and load this lesson. Generated story validation may
still require exact generated count when calling OpenAI, but normal lesson
validation should not reject an edited story just because the current story
length differs from the Setup target.

Optional but useful: show a small non-blocking message in Story stage if current
story length differs from `lesson.sentenceCount`.

Example:

```text
Story has 11 sentences. Setup target is 12.
```

Do not add automatic rebalancing or add-sentence behavior in this phase.

### 5. Locked Stories Are Not Deletable

When `lesson.story.status === "locked"`:

- hide or disable Delete actions
- do not allow delete handlers to run
- keep the current locked-story visual treatment
- use the existing unlock flow if the user wants to edit

Do not create a new locked-story policy in this phase.

### 6. Confirmation Flow

Deleting is destructive, so include a lightweight confirmation.

Acceptable approaches:

- inline confirmation inside the sentence card
- small confirm/cancel state next to the Delete button
- accessible modal only if it matches existing app patterns

Avoid `window.confirm` unless that is already the project's accepted style.

Confirmation copy should be short and concrete, for example:

```text
Delete this sentence?
```

Actions:

```text
Delete
Cancel
```

The flow should:

- make it difficult to delete accidentally
- return to normal card controls after cancel
- clear confirmation state after delete
- avoid losing text currently being edited in other sentence cards

### 7. Scene References Must Stay Valid

Deletion must remove the deleted sentence ID from every scene's `sentenceIds`.

Before:

```json
{
  "id": "scene-1",
  "sentenceIds": ["sentence-1", "sentence-2"]
}
```

After deleting `sentence-1`:

```json
{
  "id": "scene-1",
  "sentenceIds": ["sentence-2"]
}
```

This is required so frontend and backend validation do not fail due to missing
sentence references.

Do not regroup scenes or move other sentence IDs between scenes in this phase.
Only remove the deleted sentence ID.

### 8. Scenes That Lose References

If a scene loses one referenced sentence:

- preserve the scene record
- remove only the deleted ID
- mark the scene stale if it had generated or approved downstream output, or if
  the existing stale policy says to mark downstream records stale

If a scene loses all referenced sentences:

- preserve the scene record
- leave `sentenceIds` as an empty array
- mark the scene stale
- do not delete the scene
- do not invent replacement sentence references

A later phase can improve scene regrouping and review messaging.

### 9. Downstream Stale Behavior

Deleting a sentence is a story change.

Use the existing app update path so:

- the lesson becomes unsaved
- `modifiedAfterLock` follows the same rule as manual sentence edits
- generated or approved downstream records are marked stale when existing app
  behavior would mark them stale for story edits

At the time of writing, story edits and reorders use `hasDownstreamOutput(current)`
to decide whether downstream work should become stale. Use the same rule for
delete.

### 10. Existing Actions Still Work

After deleting a sentence:

- Edit still edits the correct remaining sentence by ID.
- Regenerate still updates the correct remaining sentence by ID.
- Shorten still updates the correct remaining sentence by ID.
- Drag/reorder still moves the correct remaining sentence by ID.
- Lock story still locks the current edited story.
- Unlock story still restores editing and reorder/delete controls.

## Implementation Guidance

### Lesson Update Helper

Add a focused helper in `frontend/src/utils/lessonUpdates.js`, for example:

```js
export function deleteStorySentence(lesson, sentenceId, shouldMarkStale) {
  const sentenceExists = lesson.story.sentences.some(
    (sentence) => sentence.id === sentenceId
  );

  if (!sentenceExists) return lesson;

  const nextSentences = renumberSentences(
    lesson.story.sentences.filter((sentence) => sentence.id !== sentenceId)
  );

  const nextScenes = lesson.scenes.map((scene) => {
    const nextSentenceIds = scene.sentenceIds.filter((id) => id !== sentenceId);
    const lostReference = nextSentenceIds.length !== scene.sentenceIds.length;

    if (!lostReference) return scene;

    return {
      ...scene,
      sentenceIds: nextSentenceIds,
      stale:
        scene.stale ||
        shouldMarkStale ||
        scene.approved ||
        scene.generationStatus === "generated"
    };
  });

  return markDownstreamStaleIfNeeded(
    {
      ...lesson,
      story: {
        ...lesson.story,
        modifiedAfterLock:
          lesson.story.modifiedAfterLock ||
          (Boolean(lesson.story.lockedAt) && shouldMarkStale),
        sentences: nextSentences
      },
      scenes: nextScenes
    },
    shouldMarkStale
  );
}
```

Adapt this to the actual helper names from Phase 6A.01 and Phase 6A.02.

Important behavior:

- no-op for unknown sentence IDs
- remove the sentence record
- preserve remaining sentence IDs and metadata
- recalculate numbers
- remove deleted ID from scenes
- do not delete scenes
- do not add replacement sentences
- use the same downstream stale helper pattern as story edits

Be careful not to accidentally double-apply stale logic in a way that undoes
scene-reference cleanup.

### Minimum Sentence Count

Decide whether deletion should be allowed when there is only one sentence.

Recommended behavior:

- disable Delete when there is only one sentence left
- keep at least one sentence in the story
- show an accessible disabled state or tooltip/label

Reason: a completely empty story may make lock/export behavior confusing. If the
product later needs empty stories, handle that as an explicit decision.

### App Wiring

In `frontend/src/App.jsx`:

- import the delete helper
- add a handler such as `deleteSentence(sentenceId)`
- pass it to `StoryStage`
- call the helper through `updateLesson(...)`
- pass `hasDownstreamOutput(current)` into the helper for stale behavior

Example shape:

```js
function deleteSentence(sentenceId) {
  updateLesson((current) =>
    deleteStorySentence(current, sentenceId, hasDownstreamOutput(current))
  );
}
```

### Story Stage

In `frontend/src/stages/StoryStage.jsx`:

- accept a new prop such as `onSentenceDelete`
- show Delete only when the story is unlocked
- disable Delete when only one sentence remains, unless the product explicitly
  allows empty stories
- keep delete UI separate from drag handles and existing actions
- store local confirmation state by sentence ID
- clear confirmation state when delete completes
- clear confirmation state when the story locks or the sentence disappears

Suggested state:

```js
const [confirmDeleteId, setConfirmDeleteId] = useState(null);
```

Suggested UI flow:

```jsx
{confirmDeleteId === sentence.id ? (
  <>
    <button type="button" onClick={() => onSentenceDelete(sentence.id)}>
      Delete
    </button>
    <button type="button" onClick={() => setConfirmDeleteId(null)}>
      Cancel
    </button>
  </>
) : (
  <button type="button" onClick={() => setConfirmDeleteId(sentence.id)}>
    Delete
  </button>
)}
```

Use existing button classes and icon patterns where possible.

### Count Mismatch Notice

If adding the optional count notice, keep it non-blocking and concise.

Rules:

- show only in Story stage
- do not block lock/save/open
- do not change Setup target automatically
- do not offer Add/Rebalance actions in this phase

Example:

```text
Story has 11 sentences. Setup target is 12.
```

### Scenes Stage

Review `frontend/src/stages/ScenesStage.jsx`.

If a scene has no covered sentences after deletion, avoid rendering confusing
blank text.

Acceptable minimal behavior:

- render no sentence paragraphs for that scene
- or render a concise placeholder such as `No covered sentences`

Do not add scene regrouping controls in this phase.

## Styling Guidance

Update `frontend/src/styles.css` as needed.

Style requirements:

- Delete action is visible but not visually dominant.
- Confirmation state is clear.
- Confirm Delete should be distinguishable from Cancel.
- Delete controls do not crowd drag handles, edit controls or story text.
- Mobile/narrow layouts wrap cleanly.
- Locked cards do not show active delete affordances.
- Count mismatch notice, if added, follows existing notice/status styles.

Do not introduce decorative gradients, unrelated colors or nested cards.

## Tests

Add focused tests around the delete helper and model behavior. Prefer utility
tests over brittle UI snapshots.

### Required Helper Tests

Test `deleteStorySentence` or the equivalent helper:

1. Deleting an existing sentence removes that sentence record.
2. Deleting preserves remaining sentence IDs.
3. Deleting preserves remaining sentence text.
4. Deleting preserves remaining sentence metadata.
5. Deleting recalculates `number` from array order.
6. Deleting an unknown sentence ID returns the original lesson or leaves order
   unchanged.
7. Deleting removes the deleted ID from all scene `sentenceIds`.
8. Deleting does not rewrite unaffected scene `sentenceIds`.
9. Deleting does not delete scenes that lose all sentence references.
10. Deleting marks affected generated or approved scenes stale.
11. Deleting marks downstream records stale when `shouldMarkStale` is true.
12. Deleting does not mark unrelated downstream records stale when
    `shouldMarkStale` is false and existing policy does not require it.
13. Deleting allows current story length to differ from `lesson.sentenceCount`.

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

### Validation Tests

Add or update tests to confirm:

- A lesson remains valid after deleting a sentence and cleaning scene
  references.
- A story length smaller than `lesson.sentenceCount` is valid for normal save.
- A scene with an empty `sentenceIds` array remains valid if that is already
  accepted by the data model.
- A scene referencing the deleted sentence ID is still invalid if cleanup is not
  performed.

### UI Behavior To Manually Verify

Manual QA is important for destructive actions.

Verify:

1. Delete is visible on unlocked sentence cards.
2. Delete is hidden or disabled on locked sentence cards.
3. Delete asks for confirmation before removing the sentence.
4. Cancel leaves the sentence unchanged.
5. Confirm removes the sentence card.
6. Remaining visible numbers update immediately.
7. Remaining sentence text and order are preserved.
8. Remaining sentence IDs are preserved in saved JSON.
9. Edit still edits the correct sentence after deletion.
10. Drag/reorder still moves the correct sentence after deletion.
11. Regenerate still updates the correct sentence after deletion.
12. Shorten still updates the correct sentence after deletion.
13. Save and reopen preserves the deletion.
14. Scenes no longer reference the deleted sentence ID.
15. Scenes still display covered sentence text for remaining references.
16. A scene that loses all sentence references does not crash the UI.
17. Deleting marks the project unsaved.
18. If downstream output existed, affected records show stale state according to
    existing app patterns.

## Acceptance Checklist

- Unlocked sentence cards have a clear Delete action.
- Delete requires confirmation.
- Cancel works.
- Confirm delete removes the sentence record.
- Remaining sentence IDs are preserved.
- Remaining sentence numbers are recalculated from array order.
- Remaining sentence text and metadata are preserved.
- Story length may differ from Setup target after deletion.
- The app can save and open a lesson after deletion.
- Locked stories cannot delete sentences.
- Delete marks the lesson unsaved.
- Delete uses existing downstream stale behavior.
- Deleted sentence ID is removed from every scene `sentenceIds` array.
- Scenes are not deleted just because they lose sentence references.
- Existing Edit, Regenerate, Shorten and drag/reorder actions still work.
- Tests cover deletion, ID preservation, number recalculation and scene cleanup.
- Tests pass.
- No add, insert, split, merge or AI revision functionality has been added.

## Suggested Commands

Run the project-specific equivalents if scripts differ:

```sh
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
rg -n "deleteStorySentence|onSentenceDelete|confirmDelete|Delete this sentence|sentenceIds" frontend/src frontend/test server/src server/test
rg -n "insert sentence|add sentence|split sentence|merge sentence|rebalance|revise|revision" frontend/src server/src
```

## Out Of Scope For This Phase

These are intentionally left for later phases:

- Phase 6A.04: add or insert sentence.
- Phase 6A.05: richer scene-reference review after delete or insert.
- Phase 6B: AI sentence tools and story rebalancing.

