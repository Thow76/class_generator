# Phase 6A.04 Add Sentence Prompt

Use this prompt to implement the fourth slice of the Story Editor Upgrade for
Lesson Source Builder.

## Prompt

You are implementing Phase 6A.04: Add Sentence.

Phase 6A.01 established that `lesson.story.sentences` array order is the single
source of truth for story sequence. Phase 6A.02 added sentence reordering. Phase
6A.03 added complete sentence deletion with scene-reference cleanup. This phase
adds the ability for tutors to add a new sentence to an unlocked story.

Implement manual sentence addition only. Do not build split sentence, merge
sentence, AI rebalance, AI sentence replacement, sentence-level OpenAI revision
endpoints, scene replanning, generated media changes, export changes, accounts
or cloud sync in this phase.

## Phase Goal

Tutors should be able to add a new sentence after deleting or reshaping a story,
without regenerating the whole story.

Done means:

- The Story screen exposes a clear Add sentence action when the story is
  unlocked.
- The tutor can enter the new sentence text before it is committed.
- Empty or whitespace-only sentences are not added.
- Adding creates a new sentence record in `lesson.story.sentences`.
- The new sentence receives a safe, unique, stable sentence ID.
- Existing sentence IDs are preserved.
- Sentence display numbers are recalculated from array order after adding.
- Adding at the end of the story is supported.
- If positioned insertion is implemented, it uses the same model rules and does
  not disturb existing IDs.
- Existing Edit, Regenerate, Shorten, drag/reorder, Delete, lock and unlock
  behavior still works.
- Locked stories cannot add sentences until unlocked.
- Adding marks the lesson unsaved.
- Adding uses existing downstream stale behavior when downstream output exists.
- Existing scene references remain ID-based and are not rewritten solely because
  a sentence was added.
- Save/open preserves the added sentence.
- The app remains valid if the story has more or fewer sentences than the Setup
  target.
- Tests cover adding, unique IDs, renumbering, stale handling, scene-reference
  preservation and count mismatch behavior.

## Product Reasoning

Tutors may delete a redundant generated sentence and then want to add a better
sentence in their own words. For example, after removing:

```text
Anita is in her kitchen.
```

the tutor may want to add:

```text
She asks for an urgent appointment.
```

This phase should support tutor-authored additions. It should not ask AI to fill
the gap automatically, and it should not force the story back to the Setup target
sentence count.

## Current Relevant Files

Review these files before editing:

```text
docs/phase-6a-01-sentence-ordering-model-prompt.md
docs/phase-6a-01-review-prompt.md
docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md
docs/phase-6a-02-review-prompt.md
docs/phase-6a-03-delete-sentence-prompt.md
docs/phase-6a-03-review-prompt.md
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

Also inspect any Phase 6A.01, Phase 6A.02 and Phase 6A.03 tests that were added.

## Scope

Build:

- A frontend lesson update helper for adding one manual story sentence.
- Safe unique sentence ID generation.
- Story stage Add sentence composer for unlocked stories.
- Commit/cancel behavior for the new sentence composer.
- Recalculation of sentence numbers after adding.
- Existing downstream stale behavior when adding changes the story after
  downstream output exists.
- Focused tests for add-sentence behavior.

Optional if it fits cleanly:

- Insert after an existing sentence, using the same helper and model rules.

Do not build:

- AI sentence generation.
- AI story rebalance.
- Split sentence.
- Merge sentence.
- Backend story revision endpoints.
- Full scene regrouping.
- Scene planning UI.
- Generated media changes.
- Export changes.

## Required Behavior

### 1. Add A New Sentence Record

Adding a sentence should create a new object in `lesson.story.sentences`.

Good:

```js
// Before
[
  { id: "sentence-2", text: "Anita phones the doctor.", number: 1 }
]

// After adding a new sentence
[
  { id: "sentence-2", text: "Anita phones the doctor.", number: 1 },
  { id: "sentence-4", text: "She asks for an appointment.", number: 2 }
]
```

Bad:

```js
[
  { id: "sentence-2", text: "Anita phones the doctor. She asks for an appointment.", number: 1 }
]
```

Do not merge new text into an existing sentence. Create a new sentence record.

### 2. Preserve Existing Sentence IDs

Adding must not regenerate or renumber existing sentence IDs.

If the existing story contains:

```json
[
  { "id": "sentence-9", "number": 1, "text": "First visible sentence." }
]
```

after adding, `sentence-9` must still be `sentence-9`.

### 3. Generate A Safe Unique ID

The new sentence needs a safe stable ID that passes frontend and backend
validation.

Requirements:

- ID must be a string.
- ID must be unique within `lesson.story.sentences`.
- ID must match the backend safe ID expectations.
- ID should not reuse an existing ID in the current story.
- ID should be stable after save/open.

Acceptable patterns:

```text
sentence-13
sentence-manual-20260905-120000
sentence-manual-a1b2c3d4
```

Avoid IDs with spaces, punctuation outside hyphen/underscore, or user-entered
text.

If using `crypto.randomUUID()`, wrap it in a safe prefix and strip or preserve
only characters accepted by validation. UUID hyphens are acceptable if they
match the existing safe ID pattern.

### 4. Commit Only Non-Empty Text

Do not add a blank sentence record.

The UI should let the tutor type the new sentence first, then commit it only when
the trimmed text is non-empty.

Recommended behavior:

- Add sentence opens a composer or inline textarea.
- Save/Add is disabled until text is non-empty.
- Cancel closes the composer without changing the story.
- Submitted text is trimmed.
- Internal whitespace can be normalized if that matches existing app behavior.

Do not rely on validation errors after adding an empty record. Prevent the empty
record from being added.

### 5. Add At The End

Required behavior:

- Add sentence appends the new sentence to the end of
  `lesson.story.sentences`.
- Existing drag/reorder can then move it elsewhere.

Example:

```js
addStorySentence(lesson, "She asks for an appointment.", undefined, false)
```

adds at the end by default.

### 6. Optional Positioned Insert

If implementing positioned insertion, keep it small and explicit.

Acceptable behavior:

- "Insert after" on a sentence card opens a composer after that card.
- Submitting inserts the new sentence after that sentence.
- The inserted sentence gets a new unique ID.
- Existing sentence IDs remain unchanged.
- Numbers are recalculated from array order.

Do not add complex scene regrouping in this phase. New sentences can remain
unassigned to scenes until a later scene-review phase.

If positioned insertion creates too much UI complexity, leave it out and rely on
append plus drag/reorder.

### 7. Recalculate Display Numbers

After adding, recalculate:

```js
number: index + 1
```

The Story stage should continue displaying numbers from array position where
practical.

### 8. Count May Differ From Setup Target

Do not force the story length to match `lesson.sentenceCount`.

If Setup target is 12 and the tutor adds one sentence, the story may have 13
sentences. If the tutor previously deleted one sentence, adding may bring it
back to 12. Both states should save and load.

If the count mismatch notice from Phase 6A.03 exists, make sure it updates after
adding.

Do not add automatic rebalancing in this phase.

### 9. Locked Stories Cannot Add Sentences

When `lesson.story.status === "locked"`:

- hide or disable Add sentence controls
- do not allow add handlers to run
- keep the current locked-story visual treatment
- use the existing unlock flow if the user wants to edit

Do not create a new locked-story policy in this phase.

### 10. Scene References Remain ID-Based

Adding a sentence should not rewrite existing `scene.sentenceIds`.

New manual sentences do not need to be added to any scene in this phase.

Before:

```json
{
  "id": "scene-1",
  "sentenceIds": ["sentence-2"]
}
```

After adding `sentence-4`:

```json
{
  "id": "scene-1",
  "sentenceIds": ["sentence-2"]
}
```

Later phases can add scene review or assignment for new sentences.

### 11. Downstream Stale Behavior

Adding a sentence is a story change.

Use the existing app update path so:

- the lesson becomes unsaved
- `modifiedAfterLock` follows the same rule as manual sentence edits
- generated or approved downstream records are marked stale when existing app
  behavior would mark them stale for story edits

At the time of writing, story edits, reorders and deletes use
`hasDownstreamOutput(current)` to decide whether downstream work should become
stale. Use the same rule for add.

### 12. Existing Actions Still Work

After adding a sentence:

- Edit still edits the correct sentence by ID.
- Regenerate still updates the correct sentence by ID.
- Shorten still updates the correct sentence by ID.
- Drag/reorder still moves the correct sentence by ID.
- Delete still deletes the correct sentence by ID.
- Lock story still locks the current edited story.
- Unlock story still restores editing and reorder/delete/add controls.

## Implementation Guidance

### Lesson Update Helper

Add a focused helper in `frontend/src/utils/lessonUpdates.js`, for example:

```js
export function addStorySentence(
  lesson,
  text,
  options = {},
  shouldMarkStale = false
) {
  const normalizedText = normalizeStorySentenceText(text);
  if (!normalizedText) return lesson;

  const insertIndex = Number.isInteger(options.index)
    ? Math.max(0, Math.min(options.index, lesson.story.sentences.length))
    : lesson.story.sentences.length;

  const newSentence = {
    id: createNextSentenceId(lesson.story.sentences),
    number: insertIndex + 1,
    text: normalizedText,
    stale: false,
    source: "manual",
    updatedAt: new Date().toISOString()
  };

  const nextSentences = [...lesson.story.sentences];
  nextSentences.splice(insertIndex, 0, newSentence);

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

Adapt this to the actual helper names and helper signatures from earlier Phase
6A work.

Important behavior:

- no-op for empty text
- create one new sentence record
- preserve existing sentence IDs
- generate a safe unique ID
- set `source: "manual"`
- set `updatedAt` if that matches existing sentence metadata behavior
- recalculate numbers
- do not rewrite scenes
- do not create AI or backend calls
- use the same downstream stale helper pattern as story edits

### ID Helper

Create a small helper for new sentence IDs.

Recommended simple approach:

```js
function createNextSentenceId(sentences) {
  const usedIds = new Set(sentences.map((sentence) => sentence.id));
  let nextNumber = sentences.length + 1;
  let nextId = `sentence-${nextNumber}`;

  while (usedIds.has(nextId)) {
    nextNumber += 1;
    nextId = `sentence-${nextNumber}`;
  }

  return nextId;
}
```

This avoids collisions with current sentence IDs. If the app later needs a full
history of deleted IDs, that can be added as explicit metadata in a later phase.

### Text Normalization Helper

Use existing text normalization patterns if present.

Suggested behavior:

```js
function normalizeStorySentenceText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
```

Do not automatically add punctuation unless the app already does that elsewhere.
Tutor-authored text should stay under tutor control.

### App Wiring

In `frontend/src/App.jsx`:

- import the add helper
- add a handler such as `addSentence(text, options)`
- pass it to `StoryStage`
- call the helper through `updateLesson(...)`
- pass `hasDownstreamOutput(current)` into the helper for stale behavior

Example shape:

```js
function addSentence(text, options) {
  updateLesson((current) =>
    addStorySentence(current, text, options, hasDownstreamOutput(current))
  );
}
```

### Story Stage

In `frontend/src/stages/StoryStage.jsx`:

- accept a new prop such as `onSentenceAdd`
- show Add sentence controls only when the story is unlocked
- keep add UI separate from delete confirmation, drag handles and existing
  sentence actions
- store composer text locally
- disable Add/Save until trimmed text is non-empty
- clear composer text after successful add
- allow Cancel to close the composer without changing the story
- avoid stealing focus from an actively edited existing sentence unless the user
  intentionally opens the add composer

Suggested state:

```js
const [isAddingSentence, setIsAddingSentence] = useState(false);
const [newSentenceText, setNewSentenceText] = useState("");
```

Suggested UI flow:

```jsx
{isAddingSentence ? (
  <div className="sentence-add">
    <textarea
      rows="2"
      value={newSentenceText}
      onChange={(event) => setNewSentenceText(event.target.value)}
    />
    <button
      type="button"
      disabled={!newSentenceText.trim()}
      onClick={() => {
        onSentenceAdd(newSentenceText);
        setNewSentenceText("");
        setIsAddingSentence(false);
      }}
    >
      Add sentence
    </button>
    <button type="button" onClick={() => setIsAddingSentence(false)}>
      Cancel
    </button>
  </div>
) : (
  <button type="button" onClick={() => setIsAddingSentence(true)}>
    Add sentence
  </button>
)}
```

Use existing button classes and icon patterns where possible.

### Optional Insert After UI

If adding "Insert after" controls:

- track the target sentence ID in local state
- compute insertion index from current array order at submit time
- use sentence ID, not stale index, as the target identity
- clear insert state after submit or cancel
- avoid crowding existing card actions

Example submit behavior:

```js
const targetIndex = lesson.story.sentences.findIndex(
  (sentence) => sentence.id === insertAfterId
);
onSentenceAdd(newSentenceText, { index: targetIndex + 1 });
```

If the target sentence no longer exists, append to the end.

### Count Mismatch Notice

If a count mismatch notice exists from Phase 6A.03, make sure it updates after
adding.

Rules:

- show only in Story stage
- do not block lock/save/open
- do not change Setup target automatically
- do not offer AI rebalance actions in this phase

Example:

```text
Story has 13 sentences. Setup target is 12.
```

### Scenes Stage

Review `frontend/src/stages/ScenesStage.jsx`.

New manual sentences may not belong to any scene yet. This is acceptable in this
phase.

Do not add scene assignment controls in this phase.

## Styling Guidance

Update `frontend/src/styles.css` as needed.

Style requirements:

- Add sentence action is easy to find but not visually louder than Lock story.
- Composer looks like part of the Story stage, not a separate page.
- Textarea has stable dimensions and does not cause layout jumps.
- Add/Cancel buttons are clear.
- Disabled Add state is understandable.
- Add controls do not crowd drag handles, delete confirmation, edit controls or
  story text.
- Mobile/narrow layouts wrap cleanly.
- Locked stories do not show active add affordances.
- Count mismatch notice, if present, follows existing notice/status styles.

Do not introduce decorative gradients, unrelated colors or nested cards.

## Tests

Add focused tests around the add helper and model behavior. Prefer utility tests
over brittle UI snapshots.

### Required Helper Tests

Test `addStorySentence` or the equivalent helper:

1. Adding non-empty text appends a new sentence record.
2. Added sentence receives a safe unique ID.
3. Adding preserves existing sentence IDs.
4. Adding preserves existing sentence text and metadata.
5. Adding recalculates all `number` values from array order.
6. Added sentence has `source: "manual"` if source metadata is used.
7. Added sentence has `updatedAt` if timestamp metadata is used.
8. Whitespace-only text is a no-op.
9. Submitted text is trimmed.
10. Existing scene `sentenceIds` are not rewritten.
11. Adding marks downstream records stale when `shouldMarkStale` is true.
12. Adding does not mark downstream records stale when `shouldMarkStale` is
    false and existing policy does not require it.
13. Adding allows current story length to differ from `lesson.sentenceCount`.
14. Adding after a deletion does not collide with existing sentence IDs.

If positioned insertion is implemented, also test:

15. Inserting at a specific index places the new sentence at that index.
16. Inserting clamps invalid low/high indexes safely.
17. Inserted sentence preserves surrounding sentence IDs and order.

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

Expected after adding `She asks for an appointment.`:

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

Add or update tests to confirm:

- A lesson remains valid after adding a non-empty sentence.
- A story length greater than `lesson.sentenceCount` is valid for normal save.
- A new unreferenced sentence does not make scene validation fail.
- Empty sentence text is still invalid if it somehow enters the model.

### UI Behavior To Manually Verify

Manual QA is important for editor workflows.

Verify:

1. Add sentence is visible on unlocked stories.
2. Add sentence is hidden or disabled on locked stories.
3. Opening the composer does not change the story yet.
4. Whitespace-only input cannot be added.
5. Cancel closes the composer and leaves the story unchanged.
6. Adding non-empty text creates a new sentence card.
7. The new card appears at the end of the story unless positioned insertion was
   implemented.
8. Remaining sentence IDs are preserved in saved JSON.
9. The new sentence has a safe unique ID in saved JSON.
10. Visible numbers update immediately.
11. Story length can become greater than Setup target.
12. Save succeeds after adding.
13. Reopen preserves the added sentence and current order.
14. Edit works on the new sentence.
15. Drag/reorder works on the new sentence.
16. Delete works on the new sentence.
17. Regenerate and Shorten still target the correct sentences.
18. Lock story still locks the edited story.
19. Unlock story restores add/delete/reorder/edit controls.
20. Existing scene references still display covered sentence text.
21. Adding marks the project unsaved.
22. If downstream output existed, records show stale state according to existing
    app patterns.

## Acceptance Checklist

- Unlocked Story stage has a clear Add sentence action.
- Add opens a composer or input before committing.
- Empty text cannot be added.
- Cancel does not change the lesson.
- Non-empty text adds one new sentence record.
- New sentence ID is safe, unique and stable.
- Existing sentence IDs are preserved.
- Existing sentence text and metadata are preserved.
- Sentence numbers are recalculated from array order.
- Story length may differ from Setup target after adding.
- The app can save and open a lesson after adding.
- Locked stories cannot add sentences.
- Add marks the lesson unsaved.
- Add uses existing downstream stale behavior.
- Existing scene references remain unchanged and ID-based.
- Existing Edit, Regenerate, Shorten, drag/reorder and Delete actions still work.
- Tests cover add behavior, ID generation, renumbering and scene preservation.
- Tests pass.
- No split, merge, AI revision or backend revision functionality has been added.

## Suggested Commands

Run the project-specific equivalents if scripts differ:

```sh
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
rg -n "addStorySentence|onSentenceAdd|addSentence|newSentence|Insert after|sentenceIds" frontend/src frontend/test server/src server/test
rg -n "split sentence|merge sentence|rebalance|revise|revision|/api/story/revise" frontend/src server/src
```

## Out Of Scope For This Phase

These are intentionally left for later phases:

- Phase 6A.05: richer scene-reference review after delete or insert.
- Phase 6B: AI sentence tools and story rebalancing.

