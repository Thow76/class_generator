# Phase 6A.05 Review Prompt

Use this prompt to review whether Phase 6A.05 of Lesson Source Builder was
implemented correctly.

## Prompt

You are reviewing Phase 6A.05: Scene Referencing.

Your job is to verify that tutors can maintain sentence-to-scene coverage after
story edits. The Scenes stage should show covered sentences with current story
numbers, identify unassigned story sentences, and allow manual add/remove
updates to `scene.sentenceIds` while preserving stable IDs, scene records,
story-editor behavior and save/open validity.

Review Phase 6A.05 only. Do not require AI scene planning, automatic scene
regrouping, creating/deleting scenes, generated media changes, split sentence,
merge sentence, AI rebalance, sentence-level OpenAI revision endpoints, export
changes, accounts or cloud sync.

## Phase Goal

The implementation is correct only if:

- Scenes display covered story sentences by resolving `scene.sentenceIds`.
- Covered sentence rows show current story display numbers and text.
- Covered sentence ordering follows current `lesson.story.sentences` array
  order.
- Unassigned story sentences are visible, or there is a clear empty state when
  all sentences are assigned.
- Tutors can add an existing story sentence reference to a scene.
- Tutors can remove a sentence reference from a scene.
- Scene references remain stored as sentence IDs, not display numbers.
- Duplicate references are prevented or normalized away.
- Missing sentence IDs are not introduced by the UI/helper.
- Existing scene fields are preserved when references change.
- Unrelated scenes are preserved when one scene changes.
- Scenes with empty `sentenceIds` remain visible, valid and editable.
- Generated or approved scenes become stale when their sentence references
  actually change.
- Ungenerated/unapproved scenes are not needlessly marked stale.
- Unrelated scenes are not marked stale.
- Characters are not marked stale by scene-reference edits.
- Existing Story editor behavior still works: Edit, Regenerate, Shorten,
  drag/reorder, Delete, Add, lock and unlock.
- Save/open preserves scene reference edits.
- Tests cover selectors, add reference, remove reference, de-dupe, story-order
  sorting, stale behavior and unassigned sentence detection.
- No later AI/media/export features were accidentally added.

## Expected Files

Review these files or their close equivalents:

```text
docs/phase-6a-05-scene-referencing-prompt.md
docs/phase-6a-04-add-sentence-prompt.md
docs/phase-6a-04-review-prompt.md
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
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/test/sentenceOrdering.test.js
frontend/test/validateSetup.test.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/storyGeneration.test.js
```

Also inspect any new tests added for Phase 6A.05.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
git diff -- docs frontend/src frontend/test server/src server/test package.json frontend/package.json package-lock.json
rg -n "getUnassigned|unassigned|scene.*sentence|sentenceIds|addSceneSentence|removeSceneSentence|replaceSceneSentence|normalizeSceneSentence|getSceneSentence|covered-sentences" frontend/src frontend/test server/src server/test docs
rg -n "scene\\.sentenceIds|sentence\\.id|sentence\\.number|number: index \\+ 1|renumber" frontend/src server/src frontend/test server/test
rg -n "plan.*scene|scene.*plan|auto.*scene|rebalance|revise|revision|/api/story/revise|split sentence|merge sentence|image prompt|generate image|createScene|deleteScene" frontend/src server/src docs
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If scripts differ, inspect `package.json`, `frontend/package.json` and
`server/package.json`, then run the closest available frontend and backend test
commands.

## Review Steps

1. Read `docs/phase-6a-05-scene-referencing-prompt.md`.
2. Inspect the git diff and list every changed file.
3. Confirm the changes are limited to Phase 6A.05 scene-reference work.
4. Inspect `frontend/src/utils/lessonSelectors.js` or any new selector module.
5. Confirm there is a helper for mapping story sentence IDs to current story
   positions.
6. Confirm covered sentence records are derived from `scene.sentenceIds`.
7. Confirm covered sentence display numbers are derived from current story array
   order.
8. Confirm covered sentence records are sorted by current story order.
9. Confirm unassigned story sentence detection uses sentence IDs, not text.
10. Confirm unassigned detection updates when references are added or removed.
11. Confirm selector logic handles missing sentence IDs without crashing.
12. Confirm duplicate references are de-duped by selector or normalization
    helper.
13. Inspect `frontend/src/utils/lessonUpdates.js`.
14. Confirm scene-reference helpers find scenes by stable `scene.id`.
15. Confirm helpers find sentences by stable `sentence.id`.
16. Confirm adding a reference is a no-op for a missing scene ID.
17. Confirm adding a reference is a no-op for a missing sentence ID.
18. Confirm adding a duplicate reference does not duplicate the ID.
19. Confirm adding sorts final `sentenceIds` by current story order.
20. Confirm removing a reference removes only that sentence ID from the selected
    scene.
21. Confirm removing a missing reference is a no-op.
22. Confirm removing the last sentence reference leaves `sentenceIds: []`.
23. Confirm helpers preserve existing scene fields such as location,
    description, character IDs, image mode, approval state and generation count.
24. Confirm helpers preserve unrelated scenes.
25. Confirm helpers preserve all story sentence records.
26. Confirm generated scenes are marked stale when references actually change.
27. Confirm approved scenes are marked stale when references actually change.
28. Confirm ungenerated/unapproved scenes are not marked stale unless already
    stale.
29. Confirm unrelated scenes are not marked stale.
30. Confirm characters are not marked stale by scene-reference edits.
31. Confirm no scene-reference edit routes through story edit handlers or causes
    broad story-change stale behavior unless explicitly justified by existing
    app behavior.
32. Inspect `frontend/src/App.jsx`.
33. Confirm add/remove scene-reference handlers go through `updateLesson(...)`
    so successful changes mark the lesson unsaved.
34. Confirm no-op scene-reference changes do not needlessly mutate state.
35. Confirm handlers are passed to `ScenesStage`.
36. Inspect `frontend/src/stages/ScenesStage.jsx`.
37. Confirm covered sentences show current story number and text.
38. Confirm scenes with no covered sentences show a clear empty state.
39. Confirm scene cards remain visible when `sentenceIds` is empty.
40. Confirm there is a clear UI for adding an existing story sentence to a scene.
41. Confirm there is a clear UI for removing a sentence reference from a scene.
42. Confirm the add UI cannot introduce missing sentence IDs.
43. Confirm the add UI prevents or neutralizes duplicate assignment to the same
    scene.
44. Confirm unassigned story sentences are visible or an all-assigned empty
    state is visible.
45. Confirm assigning an unassigned sentence updates the unassigned section.
46. Confirm removing a sentence from its only scene makes it appear unassigned.
47. Confirm location, image setting, character tags, Generate scene and Use this
    scene controls still work.
48. Inspect `frontend/src/styles.css`.
49. Confirm reference controls do not overlap sentence text, scene fields,
    badges or action buttons.
50. Confirm narrow viewport layouts wrap cleanly.
51. Inspect frontend and backend validation.
52. Confirm valid scene references still pass validation.
53. Confirm scenes with empty `sentenceIds` remain valid.
54. Confirm corrupted references to missing sentence IDs are still rejected.
55. Confirm unassigned sentences are not validation errors in this phase.
56. Inspect tests.
57. Confirm tests cover the required behavior listed below.
58. Run the relevant test suite and frontend build.
59. Report any failures with exact file and line references.

## Required Test Coverage

Verify that tests cover the following behavior. If they do not, report the gap.

### Selector Tests

Selectors or equivalent derived helpers should be tested for:

- covered sentence records are resolved from sentence IDs
- covered sentence records are returned in current story order
- covered sentence display numbers reflect current story order
- unassigned story sentences are detected by ID
- unassigned detection updates after assignment
- unassigned detection updates after removal
- missing sentence IDs do not crash selector logic
- duplicate scene references are de-duped by normalization logic
- all-assigned state returns an empty unassigned list

### Update Helper Tests

Scene reference helpers should be tested for:

- adding a valid sentence reference updates only the selected scene
- adding a reference preserves existing scene fields
- adding a duplicate reference is a no-op or produces a de-duped list
- adding a missing sentence ID is a no-op
- adding to a missing scene ID is a no-op
- adding sorts references by current story order
- removing a sentence reference updates only the selected scene
- removing a missing reference is a no-op
- removing the last reference leaves the scene with `sentenceIds: []`
- updating one scene does not rewrite unrelated scenes
- updating references preserves story sentence records
- updating a generated scene marks that scene stale
- updating an approved scene marks that scene stale
- updating an ungenerated/unapproved scene does not needlessly mark it stale
- updating one scene does not mark unrelated scenes stale
- updating scene references does not mark characters stale
- no-op reference updates return the original lesson or leave state unchanged

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

Expected covered order for `scene-1`:

```js
["sentence-1", "sentence-2"]
```

Expected unassigned before assigning:

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

Verify tests confirm:

- valid scene references remain valid after reference edits
- a scene with empty `sentenceIds` remains valid
- duplicate references are normalized or prevented by helpers
- a scene referencing a missing sentence ID remains invalid if corrupted data
  bypasses the UI/helper
- an unassigned sentence does not make the lesson invalid

### UI Or Integration Tests

If UI tests exist, verify they cover at least one add-reference flow and one
remove-reference flow. If no UI test tooling exists, do not require it for this
phase, but report whether manual QA is still needed.

## Manual QA Checklist

Manual QA is important because this is a cross-stage editor workflow.

Use a draft story with at least three sentences and at least two scenes, then
verify:

1. Scenes display covered sentences with current story numbers and text.
2. Reordering story sentences changes the displayed numbers in Scenes.
3. Existing `scene.sentenceIds` still resolve after story reorder.
4. Adding a story sentence creates an unassigned sentence unless explicitly
   assigned.
5. Unassigned story sentences appear in the Scenes stage.
6. Assigning an unassigned sentence to a scene removes it from the unassigned
   list.
7. Removing a sentence from a scene makes it appear unassigned if no other scene
   references it.
8. Adding the same sentence to the same scene twice does not duplicate it.
9. Removing the last sentence from a scene leaves the scene visible.
10. Empty scenes show a clear empty state.
11. A generated scene becomes stale after its sentence references change.
12. An approved scene becomes stale after its sentence references change.
13. An unrelated scene does not become stale after another scene changes.
14. Characters do not become stale because of scene reference edits.
15. Save and reopen preserves updated `scene.sentenceIds`.
16. Story Edit still updates sentence text in scene displays.
17. Story drag/reorder still moves sentence records and scene references still
    resolve.
18. Story Delete still removes deleted sentence IDs from scenes.
19. Story Add still creates a sentence that can be assigned to a scene.
20. Scene Location and Image setting controls still work.
21. Scene Generate and Use this scene buttons still work.
22. On a narrow viewport, sentence reference controls do not overlap text,
    badges, scene fields or action buttons.

## Accessibility And UX Checks

Verify:

- Add/remove reference controls have clear text or accessible labels.
- Sentence picker options include enough text to distinguish sentences.
- Covered sentence rows are readable and compact.
- Unassigned sentence section is easy to scan.
- Empty scene state is understandable.
- Keyboard users can reach add/remove controls.
- Focus behavior is sensible after adding or removing a reference.
- Destructive remove-reference controls are clear but not visually dominant.
- Stale and approved badges remain visible.

## Specific Failure Modes To Look For

Report these as findings if present:

- Scene references are stored as display numbers instead of sentence IDs.
- Scene references are rewritten to match current display numbers.
- Covered sentence display trusts stale `sentence.number` instead of current
  story order.
- Covered sentences display in old `scene.sentenceIds` order when that conflicts
  with story order.
- Unassigned detection uses sentence text instead of ID.
- New unassigned sentences are not visible anywhere.
- Add-reference UI can add a missing sentence ID.
- Add-reference duplicates the same sentence ID in one scene.
- Remove-reference deletes the story sentence instead of removing only the scene
  reference.
- Remove-reference deletes the scene when it loses all sentence references.
- A scene with empty `sentenceIds` crashes or disappears.
- Updating one scene rewrites unrelated scenes.
- Updating scene references loses scene fields such as location, character IDs,
  image mode or generation status.
- Generated or approved scenes are not marked stale after reference changes.
- Ungenerated/unapproved scenes are marked stale without an actual reference
  change.
- Characters are marked stale by scene reference edits.
- Scene reference edits bypass `updateLesson(...)` and do not mark the lesson
  unsaved.
- Save/open loses updated `scene.sentenceIds`.
- Story edit/reorder/delete/add behavior regresses.
- AI scene planning, automatic regrouping, generated image, split/merge,
  rebalance or backend revision features were added in this phase.

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
- Brief statement of whether Phase 6A.05 is correctly implemented.
```

If there are no findings, say so clearly and mention any residual test gaps or
manual QA still needed.

## Out Of Scope

Do not mark the implementation incomplete because it lacks:

- AI scene planning
- automatic scene regrouping
- creating or deleting scenes
- character extraction from story text
- assigning characters based on sentence content
- generated scene images
- scene image prompt generation
- split sentence
- merge sentence
- AI sentence tools and story rebalancing
- export changes

Those belong to later phases.

