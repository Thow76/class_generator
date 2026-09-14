# Phase 6A.05 Cleanse Prompt: Unassigned Detection After Removal

Use this prompt to close the Phase 6A.05 review finding.

## Prompt

You are implementing a test-only cleanse for Phase 6A.05: Scene Referencing.

The Phase 6A.05 implementation was reviewed and no functional defects were
found. One P3 test coverage gap remains:

- There is no direct test proving `getUnassignedStorySentences()` updates after
  removing a sentence reference from a scene.

The production code appears to support this because unassigned state is derived
from current `scene.sentenceIds`. Do not change production behavior unless the
new test exposes an actual bug.

## Scope

Build:

- Add one focused test for unassigned sentence detection after removing a scene
  sentence reference.

Do not build:

- UI changes.
- Scene reference behavior changes unless required to make intended behavior
  pass.
- New editor features.
- AI scene planning.
- Automatic scene regrouping.
- Split sentence.
- Merge sentence.
- AI rebalance.
- Backend revision endpoints.
- Generated media changes.
- Export changes.

## Relevant Files

Review:

```text
frontend/test/sentenceOrdering.test.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/lessonUpdates.js
docs/phase-6a-05-scene-referencing-prompt.md
docs/phase-6a-05-review-prompt.md
```

The review referenced:

```text
frontend/test/sentenceOrdering.test.js
```

around line 1015.

## Required Test

Add a direct test that proves unassigned detection updates after removal.

The test should:

1. Start with a lesson where a sentence is assigned to a scene.
2. Confirm that sentence is not initially in
   `getUnassignedStorySentences(lesson)`.
3. Remove that sentence reference using the production helper, for example
   `removeSceneSentenceReference(...)`.
4. Call `getUnassignedStorySentences(result)`.
5. Assert that the removed sentence now appears in the unassigned list.

Example intent:

```js
const result = removeSceneSentenceReference(
  lesson,
  "scene-1",
  "sentence-3"
);

assert.deepEqual(
  getUnassignedStorySentences(result).map((sentence) => sentence.id),
  ["sentence-3"]
);
```

Adapt names and fixture setup to the actual code.

## Suggested Fixture Shape

Use or adapt an existing Phase 6A.05 fixture if one exists.

The fixture should include:

```js
const lesson = createEmptyLesson({
  story: {
    sentences: [
      { id: "sentence-1", number: 1, text: "Anita phones the doctor.", stale: false },
      { id: "sentence-2", number: 2, text: "The receptionist answers.", stale: false },
      { id: "sentence-3", number: 3, text: "She asks for an appointment.", stale: false }
    ]
  },
  scenes: [
    {
      id: "scene-1",
      sentenceIds: ["sentence-1", "sentence-3"],
      generationStatus: "not_started",
      approved: false,
      stale: false
    },
    {
      id: "scene-2",
      sentenceIds: ["sentence-2"],
      generationStatus: "not_started",
      approved: false,
      stale: false
    }
  ]
});
```

Expected before removal:

```js
getUnassignedStorySentences(lesson).map((sentence) => sentence.id)
```

should not include:

```text
sentence-3
```

Expected after removing `sentence-3` from `scene-1`:

```js
getUnassignedStorySentences(result).map((sentence) => sentence.id)
```

should include:

```text
sentence-3
```

If all other story sentences remain assigned, the exact expected list should be:

```js
["sentence-3"]
```

## Acceptance Checklist

- A focused test covers unassigned detection after removing a scene reference.
- The test uses the production remove-reference helper.
- The test calls `getUnassignedStorySentences()` after removal.
- The test asserts the removed sentence appears in the unassigned list.
- Existing Phase 6A.05 tests still pass.
- No production behavior changes were made unless the new test exposed a real
  bug.
- No UI changes were made.
- No later-phase functionality was added.
- Test suite passes.
- Frontend build passes.

## Suggested Commands

Run:

```sh
npm test
npm run test --workspace frontend
npm run build --workspace frontend
```

If scripts differ, inspect `package.json` and `frontend/package.json`, then run
the closest available frontend test and build commands.

## Review Output

When complete, report:

```text
Changes
- Added direct unassigned-after-removal selector coverage.

Verification
- npm test: pass/fail
- npm run test --workspace frontend: pass/fail
- npm run build --workspace frontend: pass/fail
```

