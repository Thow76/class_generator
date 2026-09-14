# Phase 6A.04 Cleanse Prompt: Add Sentence Test Coverage

Use this prompt to close the Phase 6A.04 review findings.

## Prompt

You are implementing a test-only cleanse for Phase 6A.04: Add Sentence.

The Phase 6A.04 implementation was reviewed and no functional defects were
found. Two P3 test coverage gaps remain:

1. Missing explicit negative stale assertions when `addStorySentence(...)` is
   called with `shouldMarkStale: false`.
2. Missing positioned insertion tests for invalid low and high `options.index`
   values, even though the helper clamps indexes.

Do not change product behavior unless a test exposes an actual bug. This cleanse
should add focused tests only.

## Scope

Build:

- Add explicit test coverage for downstream records not becoming stale when
  `shouldMarkStale` is false.
- Add explicit test coverage for low/high positioned insertion index clamping.

Do not build:

- UI changes.
- Add sentence behavior changes unless required to make intended behavior pass.
- New editor features.
- Split sentence.
- Merge sentence.
- AI rebalance.
- Backend revision endpoints.
- Scene assignment or scene replanning.

## Relevant Files

Review:

```text
frontend/src/utils/lessonUpdates.js
frontend/test/sentenceOrdering.test.js
docs/phase-6a-04-add-sentence-prompt.md
docs/phase-6a-04-review-prompt.md
```

The review referenced:

```text
frontend/src/utils/lessonUpdates.js
frontend/test/sentenceOrdering.test.js
```

## Required Fix 1: Negative Stale Assertions

Find the existing add-sentence test that calls `addStorySentence(..., false)`
against a fixture with generated downstream records.

Add explicit assertions that downstream records remain unstale.

Required assertions should include the local equivalent of:

```js
assert.equal(result.characters[0].stale, false);
assert.equal(result.scenes[0].stale, false);
```

If the fixture contains multiple generated or approved records, assert the
relevant records remain `stale: false`.

The test should prove:

- adding a sentence with `shouldMarkStale` false does not mark generated
  downstream characters stale
- adding a sentence with `shouldMarkStale` false does not mark generated
  downstream scenes stale
- existing scene references remain unchanged
- the sentence is still added correctly

## Required Fix 2: Index Clamping Tests

Add tests for positioned insertion index clamping in `addStorySentence`.

### Low Index

Call the helper with an invalid low index:

```js
const result = addStorySentence(lesson, "Inserted first.", { index: -10 }, false);
```

Assert:

- the new sentence appears at index `0`
- existing sentence IDs are preserved
- all sentence numbers are recalculated from array order
- the new ID is safe and unique

### High Index

Call the helper with an invalid high index:

```js
const result = addStorySentence(lesson, "Inserted last.", { index: 999 }, false);
```

Assert:

- the new sentence appears at the end
- existing sentence IDs are preserved
- all sentence numbers are recalculated from array order
- the new ID is safe and unique

## Suggested Assertions

Use whatever helper style already exists in `sentenceOrdering.test.js`.

The tests should verify order using sentence text and IDs, for example:

```js
assert.deepEqual(
  result.story.sentences.map((sentence) => sentence.text),
  ["Inserted first.", "Anita phones the doctor.", "The receptionist answers."]
);
```

and:

```js
assert.deepEqual(
  result.story.sentences.map((sentence) => sentence.number),
  [1, 2, 3]
);
```

Also verify uniqueness:

```js
const ids = result.story.sentences.map((sentence) => sentence.id);
assert.equal(new Set(ids).size, ids.length);
```

## Acceptance Checklist

- A test explicitly asserts generated/approved downstream records remain
  `stale: false` when `addStorySentence(..., false)` is used.
- A test covers invalid low insertion index clamping to the start.
- A test covers invalid high insertion index clamping to the end.
- Tests preserve existing Phase 6A.04 expectations.
- No product behavior changes were made unless required by a failing test.
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
- Added negative stale assertions for addStorySentence(..., false).
- Added low/high positioned insertion index clamping tests.

Verification
- npm test: pass/fail
- npm run build --workspace frontend: pass/fail
```

