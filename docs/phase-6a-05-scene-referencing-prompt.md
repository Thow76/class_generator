# Phase 6A.05 Scene Referencing Prompt

Use this prompt to implement the fifth slice of the Story Editor Upgrade for
Lesson Source Builder.

## Prompt

You are implementing Phase 6A.05: Scene Referencing.

Phase 6A.01 established that `lesson.story.sentences` array order is the single
source of truth for story sequence. Phase 6A.02 added sentence reordering. Phase
6A.03 added sentence deletion and removed deleted sentence IDs from scenes. Phase
6A.04 added manual sentence addition, where newly added sentences may initially
be unassigned to scenes.

This phase makes scene sentence coverage explicit and editable. Tutors should be
able to see which story sentences are assigned to each scene, identify
unassigned story sentences, and update a scene's `sentenceIds` without breaking
stable sentence IDs or existing story-editor behavior.

Implement manual scene referencing only. Do not build AI scene planning,
automatic scene regrouping, generated media changes, split sentence, merge
sentence, AI rebalance, sentence-level OpenAI revision endpoints, export changes,
accounts or cloud sync in this phase.

## Phase Goal

Tutors should be able to maintain clean sentence-to-scene coverage after
reordering, deleting, or adding story sentences.

Done means:

- The Scenes stage shows covered story sentences with current story display
  numbers and text.
- The Scenes stage identifies story sentences that are not assigned to any
  scene.
- Tutors can add an existing story sentence reference to a scene.
- Tutors can remove a sentence reference from a scene.
- Scene `sentenceIds` remain stable ID references, not display numbers.
- Scene sentence references are de-duplicated.
- Scene sentence references are ordered consistently by current story order.
- Invalid or missing sentence references are not introduced by the UI.
- Existing scene records are preserved when references change.
- Scenes that lose all sentence references remain valid and editable.
- Updating a generated or approved scene's sentence references marks that scene
  stale.
- Existing story Edit, Regenerate, Shorten, drag/reorder, Delete, Add, lock and
  unlock behavior still works.
- Save/open preserves scene reference changes.
- Tests cover reference add, remove, de-dupe, ordering, stale behavior and
  unassigned sentence detection.

## Product Reasoning

After tutors reshape a story, scenes can become out of date:

- A deleted sentence may leave a scene with no covered sentences.
- An added sentence may not belong to any scene yet.
- A reordered story may make a scene's covered sentences display in an old or
  confusing order.

The tutor needs a simple way to say:

```text
This sentence belongs in Scene 2.
```

or:

```text
This sentence no longer belongs in Scene 1.
```

This phase should support that manual cleanup. It should not ask AI to replan
scenes or generate images.

## Current Relevant Files

Review these files before editing:

```text
docs/phase-6a-01-sentence-ordering-model-prompt.md
docs/phase-6a-01-review-prompt.md
docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md
docs/phase-6a-02-review-prompt.md
docs/phase-6a-03-delete-sentence-prompt.md
docs/phase-6a-03-review-prompt.md
docs/phase-6a-04-add-sentence-prompt.md
docs/phase-6a-04-review-prompt.md
frontend/src/App.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/styles.css
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/test/sentenceOrdering.test.js
frontend/test/validateSetup.test.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/storyGeneration.test.js
docs/phase-5-story-generation.md
```

Also inspect any Phase 6A.01 through Phase 6A.04 tests that were added.

## Scope

Build:

- Selector/helper logic for scene sentence coverage.
- A clear unassigned-sentences view on the Scenes stage.
- Manual controls for adding/removing sentence references from a scene.
- Reference normalization: known IDs only, no duplicates, story-order sorting.
- Stale marking for scenes whose references change after generated or approved
  scene output exists.
- Save/open preservation of updated scene references.
- Focused tests for reference management behavior.

Optional if it fits cleanly:

- A compact per-scene sentence picker using checkboxes.
- A move-to-scene shortcut from the unassigned sentence list.

Do not build:

- AI scene planning.
- Automatic scene regrouping.
- Creating or deleting scene records.
- Assigning characters from sentences.
- Generated scene images.
- Scene image prompt generation.
- Split or merge sentence.
- AI story rebalance.
- Backend story revision endpoints.
- Export changes.

## Required Behavior

### 1. References Stay ID-Based

Scene records must continue to store sentence IDs:

```json
{
  "id": "scene-1",
  "sentenceIds": ["sentence-2", "sentence-5"]
}
```

Do not store display numbers:

```json
{
  "id": "scene-1",
  "sentenceIds": [2, 5]
}
```

Do not rewrite sentence IDs to match current display numbers.

### 2. Display Current Story Numbers And Text

When showing covered sentences for a scene, display the current story position
and text.

Example:

```text
2. Anita phones the doctor.
5. The receptionist asks Anita's name.
```

Use the current `lesson.story.sentences` array order to derive display numbers.
Do not trust old `sentence.number` values if Phase 6A.01 already made array
order authoritative.

### 3. Sort References By Story Order

When displaying or saving `scene.sentenceIds`, order them by current story order
where practical.

If a scene contains:

```json
["sentence-5", "sentence-2"]
```

and `sentence-2` comes before `sentence-5` in the story, normalize or save it as:

```json
["sentence-2", "sentence-5"]
```

This keeps scene coverage easy to read after drag-and-drop.

### 4. Detect Unassigned Sentences

The Scenes stage should show story sentences that are not referenced by any
scene.

Example:

```text
Unassigned story sentences
7. She asks for an urgent appointment.
```

Rules:

- derive unassigned sentences from `lesson.story.sentences`
- use sentence IDs, not sentence text, to check assignment
- show current display number and text
- update immediately after scene reference changes
- if all sentences are assigned, either hide the section or show a small
  positive/empty state

Do not make unassigned sentences a validation error in this phase unless the
product has already established that every sentence must be scene-covered before
export.

### 5. Add Sentence Reference To Scene

Tutors should be able to add an existing story sentence to a scene.

Acceptable UI patterns:

- checkboxes for all story sentences inside each scene card
- an "Add sentence" select/menu inside each scene card
- an "Assign to scene" control from the unassigned-sentences section

Requirements:

- only existing story sentence IDs can be added
- duplicate IDs cannot be added
- added IDs are sorted by story order
- the scene record is preserved
- other scene fields are preserved
- the lesson becomes unsaved
- generated or approved scene output is marked stale for the affected scene

### 6. Remove Sentence Reference From Scene

Tutors should be able to remove a sentence from a scene's coverage.

Requirements:

- remove only that sentence ID from the selected scene
- preserve the sentence record in `lesson.story.sentences`
- preserve other scene references
- preserve other scene fields
- allow the scene to have an empty `sentenceIds` array
- do not delete the scene
- the lesson becomes unsaved
- generated or approved scene output is marked stale for the affected scene

### 7. De-Dupe References

Scene `sentenceIds` should not contain duplicate sentence IDs.

If a scene receives:

```json
["sentence-2", "sentence-2", "sentence-5"]
```

normalize it to:

```json
["sentence-2", "sentence-5"]
```

The UI should also prevent adding the same sentence twice.

### 8. Ignore Or Reject Missing Sentence IDs

The UI must not introduce missing sentence IDs into `scene.sentenceIds`.

If a helper receives a missing sentence ID:

```js
addSentenceReferenceToScene(lesson, "scene-1", "sentence-missing")
```

recommended behavior is no-op.

Do not silently create story sentences from missing IDs.

Normal lesson validation should still reject scene references to missing story
sentence IDs if corrupted data enters the model.

### 9. Stale Behavior Is Scene-Specific

Changing scene sentence references affects scene meaning.

When a scene's `sentenceIds` change:

- mark that scene stale if it is generated or approved
- preserve existing stale state if already stale
- do not mark unrelated scenes stale
- do not mark characters stale merely because a sentence was assigned to or
  removed from a scene

If existing app-wide story-edit stale behavior is triggered elsewhere, do not
fight it. But scene reference edits themselves should be as targeted as
possible.

### 10. Empty Scene References Stay Editable

If a scene has no covered sentences:

- keep the scene visible
- show a clear empty state such as `No covered sentences`
- allow the tutor to add sentence references back to it
- do not crash scene display
- do not delete the scene automatically

### 11. Existing Story Editor Still Works

After scene references are edited:

- Story edit still updates sentence text by ID.
- Drag/reorder still moves sentence records and scene references continue to
  resolve.
- Delete still removes deleted sentence IDs from scenes.
- Add still creates unassigned sentence records unless the tutor assigns them.
- Lock/unlock still controls story editing as before.

## Implementation Guidance

### Selector Helpers

Prefer putting reusable derived logic in `frontend/src/utils/lessonSelectors.js`
or a small focused helper module.

Useful helpers:

```js
export function getStorySentencePositionMap(lesson) {}
export function getSceneSentenceRecords(lesson, scene) {}
export function getUnassignedStorySentences(lesson) {}
export function normalizeSceneSentenceIds(lesson, sentenceIds) {}
```

Expected behavior:

- `getStorySentencePositionMap` maps sentence ID to zero-based index or
  one-based display number.
- `getSceneSentenceRecords` returns sentence records referenced by a scene in
  current story order.
- `getUnassignedStorySentences` returns story sentence records not referenced by
  any scene.
- `normalizeSceneSentenceIds` removes missing IDs, removes duplicates and sorts
  by current story order.

Use names that fit the existing codebase.

### Lesson Update Helpers

Add focused helpers in `frontend/src/utils/lessonUpdates.js`, for example:

```js
export function addSceneSentenceReference(lesson, sceneId, sentenceId) {}
export function removeSceneSentenceReference(lesson, sceneId, sentenceId) {}
export function replaceSceneSentenceReferences(lesson, sceneId, sentenceIds) {}
```

All helpers should:

- find scenes by stable `scene.id`
- find sentences by stable `sentence.id`
- no-op for missing scene IDs
- no-op for missing sentence IDs when adding
- preserve scene records and unrelated fields
- preserve unrelated scenes
- normalize the affected scene's `sentenceIds`
- mark only the affected scene stale when its references actually change and it
  has generated or approved output

Suggested stale helper:

```js
function markSceneStaleAfterReferenceChange(scene) {
  if (scene.stale || scene.approved || scene.generationStatus === "generated") {
    return { ...scene, stale: true };
  }
  return scene;
}
```

Only mark stale when the final reference list differs from the previous list.

### App Wiring

In `frontend/src/App.jsx`:

- import the scene-reference helper or helpers
- add handlers such as `addSentenceToScene(sceneId, sentenceId)` and
  `removeSentenceFromScene(sceneId, sentenceId)`
- pass them to `ScenesStage`
- call helpers through `updateLesson(...)` so the lesson becomes unsaved

Example shape:

```js
function addSentenceToScene(sceneId, sentenceId) {
  updateLesson((current) =>
    addSceneSentenceReference(current, sceneId, sentenceId)
  );
}
```

Do not route scene reference edits through story edit handlers. These edits are
scene-level changes.

### Scenes Stage UI

In `frontend/src/stages/ScenesStage.jsx`:

- show covered sentences with current display number and text
- show clear controls to remove a sentence from the current scene
- show a way to add available story sentences to the current scene
- show unassigned story sentences somewhere easy to scan
- keep scene location, image mode, character tags, generate and approve controls
  working
- keep approved/stale badges working

Recommended UI:

- In each scene card, under `Covered sentences`, show each covered sentence as a
  compact row with display number, text and a remove button.
- Add a compact select/menu or checkbox list labelled by sentence number and
  text.
- Above or below the scene grid, show `Unassigned story sentences` as a small
  list with optional assign controls.

Do not use long instructional text in the app. Labels should be short and
functional.

### Assignment Semantics

Decide whether one sentence can belong to multiple scenes.

Recommended for this phase:

- allow a sentence to be referenced by more than one scene only if the existing
  product already relies on that
- otherwise, treat one scene per sentence as the normal workflow
- if assigning a sentence to a new scene should remove it from the old scene,
  implement that explicitly and test it

Conservative implementation:

- adding a sentence to a scene does not remove it from other scenes
- unassigned detection only checks whether a sentence appears in at least one
  scene
- duplicate detection can be surfaced later

This avoids hidden cross-scene mutations.

### Invalid References In Existing Data

If existing project data contains a scene reference to a missing sentence ID,
the app should not crash.

Acceptable behavior:

- display an `Unknown sentence` fallback for that reference
- or filter missing IDs from display while validation still rejects corrupted
  saved data

Do not normalize corrupted persisted data silently unless that is already the
project's normalizer pattern.

### Styling Guidance

Update `frontend/src/styles.css` as needed.

Style requirements:

- Covered sentence rows are readable and compact.
- Remove-reference controls are clear but not visually dominant.
- Add-reference controls do not crowd scene location or image controls.
- Unassigned sentence section is easy to scan.
- Empty scene state is clear.
- Stale and approved badges remain visible.
- Mobile/narrow layouts wrap cleanly.
- Controls do not overlap sentence text.

Do not introduce decorative gradients, unrelated colors or nested cards.

## Tests

Add focused tests around scene-reference helpers and selectors. Prefer utility
tests over brittle UI snapshots.

### Required Selector Tests

Test selector/helper behavior:

1. Covered sentence records are returned in current story order.
2. Covered sentence display numbers reflect current story order.
3. Unassigned story sentences are detected by ID.
4. Unassigned detection updates when a sentence is assigned.
5. Missing sentence IDs do not crash selector logic.
6. Duplicate scene references are de-duped by normalization helper.

### Required Update Helper Tests

Test scene reference update helpers:

1. Adding a sentence reference appends or inserts the sentence ID into the scene
   reference set.
2. Adding a reference preserves existing scene fields.
3. Adding a duplicate reference does not duplicate the ID.
4. Adding a missing sentence ID is a no-op.
5. Adding to a missing scene ID is a no-op.
6. Adding sorts references by current story order.
7. Removing a sentence reference removes only that ID from the selected scene.
8. Removing a missing reference is a no-op.
9. Removing the last reference leaves the scene with `sentenceIds: []`.
10. Updating one scene does not rewrite unrelated scenes.
11. Updating references preserves story sentence records.
12. Updating a generated scene marks that scene stale.
13. Updating an approved scene marks that scene stale.
14. Updating an ungenerated/unapproved scene does not needlessly mark it stale.
15. Updating one scene does not mark unrelated scenes stale.
16. Updating scene references does not mark characters stale.

### Suggested Fixture

```js
const lesson = createEmptyLesson({
  story: {
    status: "draft",
    sentences: [
      { id: "sentence-1", number: 1, text: "Anita phones the doctor.", stale: false },
      { id: "sentence-3", number: 2, text: "She asks for an appointment.", stale: false },
      { id: "sentence-2", number: 3, text: "The receptionist answers.", stale: false }
    ]
  },
  characters: [
    {
      id: "character-anita",
      name: "Anita",
      role: "main",
      age: "45",
      sex: "Woman",
      background: "Somali",
      notes: [],
      generationStatus: "generated",
      generationCount: 1,
      imagePath: null,
      approved: false,
      stale: false
    }
  ],
  scenes: [
    {
      id: "scene-1",
      number: 1,
      label: "Scene 1",
      sentenceIds: ["sentence-2", "sentence-1"],
      location: "Phone call",
      description: "",
      characterIds: ["character-anita"],
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
      sentenceIds: [],
      location: "Reception",
      description: "",
      characterIds: ["character-anita"],
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

Expected normalized scene 1 reference order:

```js
["sentence-1", "sentence-2"]
```

Expected unassigned sentence before assigning:

```js
["sentence-3"]
```

Expected after adding `sentence-3` to `scene-2`:

```js
lesson.scenes.find((scene) => scene.id === "scene-2").sentenceIds
```

equals:

```js
["sentence-3"]
```

Expected character stale state:

```js
lesson.characters[0].stale === false
```

### Validation Tests

Add or update tests to confirm:

- a scene with valid sentence IDs remains valid after reference edits
- a scene with empty `sentenceIds` remains valid
- a scene with duplicate references is normalized or prevented by helpers
- a scene referencing a missing sentence ID is still invalid if corrupted data
  bypasses the UI/helper
- an unassigned sentence does not make the lesson invalid in this phase

### UI Behavior To Manually Verify

Manual QA is important because this is an editor workflow.

Verify:

1. Scenes display covered sentences with current story numbers and text.
2. Reordering story sentences changes the displayed numbers in Scenes.
3. Existing `scene.sentenceIds` still resolve after story reorder.
4. Unassigned story sentences appear when a sentence is added but not assigned.
5. Assigning an unassigned sentence to a scene removes it from the unassigned
   list.
6. Removing a sentence from a scene makes it appear in the unassigned list if no
   other scene references it.
7. Adding the same sentence to the same scene twice does not duplicate it.
8. Removing the last sentence from a scene leaves the scene visible.
9. Empty scenes show a clear empty state.
10. A generated scene becomes stale after its sentence references change.
11. An unrelated scene does not become stale after another scene changes.
12. Characters do not become stale because of scene reference edits.
13. Save and reopen preserves updated `scene.sentenceIds`.
14. Story Edit, drag/reorder, Delete and Add still work after editing scene
    references.
15. Scene Generate and Use this scene buttons still work.
16. On a narrow viewport, sentence reference controls do not overlap text or
    scene fields.

## Acceptance Checklist

- Scenes show covered sentences with current story display numbers.
- Scenes show covered sentence text by resolving sentence IDs.
- Unassigned story sentences are visible or have a clear empty state.
- Tutors can add a sentence reference to a scene.
- Tutors can remove a sentence reference from a scene.
- Scene references remain stored as sentence IDs.
- Scene references are de-duped.
- Scene references are ordered by current story order.
- Missing sentence IDs are not introduced by the UI.
- Existing scene records and unrelated fields are preserved.
- Empty scenes remain visible and editable.
- Generated or approved scenes become stale when their references change.
- Unrelated scenes are not marked stale.
- Characters are not marked stale by scene reference edits.
- Save/open preserves scene reference edits.
- Existing story editor behavior still works.
- Tests cover selectors, add reference, remove reference, de-dupe, ordering,
  stale behavior and unassigned detection.
- Tests pass.
- No AI scene planning, generated media, split/merge or AI rebalance behavior
  has been added.

## Suggested Commands

Run the project-specific equivalents if scripts differ:

```sh
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
rg -n "getUnassigned|scene.*sentence|sentenceIds|addSceneSentence|removeSceneSentence|replaceSceneSentence|covered-sentences" frontend/src frontend/test server/src server/test
rg -n "plan.*scene|scene.*plan|rebalance|revise|revision|/api/story/revise|split sentence|merge sentence|image prompt|generate image" frontend/src server/src docs
```

## Out Of Scope For This Phase

These are intentionally left for later phases:

- AI scene planning.
- Automatic scene regrouping.
- Creating or deleting scenes.
- Character extraction from story text.
- Assigning characters based on sentence content.
- Generated scene images.
- Scene image prompt generation.
- Split sentence.
- Merge sentence.
- AI sentence tools and story rebalancing.
- Export changes.

