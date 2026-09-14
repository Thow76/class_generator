# Phase 6A.07 Tests Prompt

Use this prompt to implement the seventh slice of the Story Editor Upgrade for
Lesson Source Builder.

## Prompt

You are implementing Phase 6A.07: Tests.

Phase 6A.01 through Phase 6A.06 delivered the manual Story Editor Upgrade:

- sentence array order as source of truth
- drag-and-drop sentence reordering
- delete sentence
- add sentence
- manual scene referencing
- UX polish for story and scene editor workflows

This phase is a test-hardening pass. Its job is to make sure the completed Phase
6A behavior is covered clearly and durably. Do not add new product behavior
unless a test exposes a real bug that must be fixed to satisfy the existing
Phase 6A requirements.

## Phase Goal

Strengthen automated coverage for the manual story editor and scene referencing
workflow so future AI, media and export work can build on a stable foundation.

Done means:

- Existing Phase 6A tests are organized and readable.
- Core story sentence update helpers are covered.
- Core scene-reference selectors and update helpers are covered.
- Validation and persistence-sensitive behavior is covered where practical.
- Edge cases from prior Phase 6A review/cleanse prompts are covered.
- Tests catch accidental ID rewriting, number misuse, stale handling regressions
  and scene-reference corruption.
- Frontend and backend test suites pass.
- Frontend build passes.
- No new editor features, AI features, media features or export features are
  added.

## Product Reasoning

The tutor now has manual control over the master story:

```text
Move this sentence earlier.
Delete this redundant sentence.
Add a clearer sentence.
Assign this sentence to Scene 2.
Remove this sentence from Scene 1.
```

Those operations affect the canonical lesson object and later generated
materials. Tests should protect the important rules:

- sentence IDs are stable identity
- array order is the story order
- display numbers are derived
- scene references remain ID-based
- deleted sentence IDs are cleaned from scenes
- added sentences get safe unique IDs
- scene-reference changes are targeted
- stale state changes are intentional

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
docs/phase-6a-04-cleanse-test-coverage-prompt.md
docs/phase-6a-05-scene-referencing-prompt.md
docs/phase-6a-05-review-prompt.md
docs/phase-6a-05-cleanse-unassigned-after-removal-prompt.md
docs/phase-6a-06-ux-polish-prompt.md
docs/phase-6a-06-review-prompt.md
frontend/src/App.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/createLesson.js
frontend/src/data/demoLesson.js
frontend/src/data/lessonSchema.js
frontend/test/sentenceOrdering.test.js
frontend/test/validateSetup.test.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/storyGenerationService.js
server/test/storyGeneration.test.js
server/test/projectStore.test.js
```

Also inspect `package.json`, `frontend/package.json` and `server/package.json`
to confirm available scripts.

## Scope

Build:

- Focused frontend utility tests for Phase 6A story editor helpers.
- Focused frontend selector tests for Phase 6A scene referencing.
- Validation tests for edited story lengths and scene references.
- Backend normalization/validation tests where frontend behavior depends on
  save/open safety.
- Persistence-oriented tests where practical.
- Test fixtures/helpers to reduce repetition if they make tests clearer.

Do not build:

- New Story stage UI.
- New Scenes stage UI.
- Split sentence.
- Merge sentence.
- AI sentence replacement.
- AI story rebalance.
- AI scene planning.
- Backend revision endpoints.
- Generated media behavior.
- Export changes.
- Accounts or cloud sync.

## Test Organization Guidance

Prefer clear, behavior-focused tests over large integration snapshots.

Acceptable approaches:

- keep Phase 6A tests in `frontend/test/sentenceOrdering.test.js` if that is the
  current pattern
- split into focused files if the existing file has become hard to scan, for
  example:

```text
frontend/test/storySentenceUpdates.test.js
frontend/test/sceneReferences.test.js
frontend/test/lessonNormalization.test.js
```

Only split files if it improves clarity and does not create test setup churn.

Use small fixture factories where helpful:

```js
function storyEditorLesson(overrides = {}) {}
function sceneReferenceLesson(overrides = {}) {}
function sentenceSummary(lesson) {}
function sceneSummary(lesson) {}
```

Avoid clever fixture builders that hide the behavior under test.

## Required Frontend Coverage

### 1. Sentence Ordering Model

Tests should prove:

- frontend normalization preserves sentence array order
- frontend normalization recalculates `number` from array position
- stale loaded `sentence.number` values cannot override derived numbering
- existing sentence IDs are preserved
- validation accepts safe non-sequential sentence IDs
- validation does not require `sentence.id` to match `sentence.number`
- validation still rejects scenes that reference missing sentence IDs

Example expectation:

```js
[
  { id: "sentence-3", number: 1, text: "Now first." },
  { id: "sentence-1", number: 2, text: "Now second." }
]
```

### 2. Manual Sentence Edit

Tests should prove:

- `updateStorySentence` updates by sentence ID
- updating one sentence preserves other sentence records
- updating preserves sentence order
- updating preserves sentence IDs
- story edits mark downstream records stale when requested
- story edits do not mark downstream records stale when not requested

### 3. Sentence Reorder

Tests should prove:

- moving a sentence upward changes array order correctly
- moving a sentence downward changes array order correctly
- moving to the same position is a no-op or leaves order unchanged
- moving an unknown sentence ID is a no-op
- reorder preserves sentence IDs
- reorder preserves sentence text and metadata
- reorder recalculates `number` from array order
- reorder does not rewrite `scene.sentenceIds`
- reorder marks downstream records stale when requested
- reorder does not mark downstream records stale when not requested

### 4. Delete Sentence

Tests should prove:

- deleting an existing sentence removes that sentence record
- deleting an unknown sentence ID is a no-op
- remaining sentence IDs are preserved
- remaining sentence text and metadata are preserved
- remaining sentence numbers are recalculated from array order
- story length may become smaller than `lesson.sentenceCount`
- deleted sentence ID is removed from every scene
- unaffected scene references are preserved
- scenes are not deleted when they lose all references
- scenes can remain with `sentenceIds: []`
- affected generated scenes are marked stale
- affected approved scenes are marked stale
- unrelated scenes are not marked stale when policy does not require it
- downstream records are marked stale when requested

### 5. Add Sentence

Tests should prove:

- adding non-empty text creates exactly one new sentence record
- whitespace-only text is a no-op
- submitted text is trimmed
- new sentence ID is safe
- new sentence ID is unique
- new sentence ID does not collide after deletion or non-sequential IDs
- existing sentence IDs are preserved
- existing sentence text and metadata are preserved
- all sentence numbers are recalculated from array order
- added sentence has `source: "manual"` if source metadata is used
- added sentence has `updatedAt` if timestamp metadata is used
- existing scene references are not rewritten
- new unreferenced sentence does not invalidate existing scenes
- story length may become greater than `lesson.sentenceCount`
- downstream records are marked stale when requested
- downstream records are not marked stale when not requested

If positioned insertion exists, tests should also prove:

- insertion at a valid index
- invalid low index clamps to the start
- invalid high index clamps to the end
- insert-after behavior computes from sentence ID, not stale array index
- surrounding sentence IDs and order are preserved

### 6. Scene Reference Selectors

Tests should prove:

- covered sentence records are resolved from `scene.sentenceIds`
- covered sentence records are returned in current story order
- covered sentence display numbers reflect current story order
- unassigned story sentences are detected by ID
- unassigned detection updates after assignment
- unassigned detection updates after removal
- missing sentence IDs do not crash selector logic
- duplicate scene references are de-duped by normalization logic
- all-assigned state returns an empty unassigned list

### 7. Scene Reference Updates

Tests should prove:

- adding a valid sentence reference updates only the selected scene
- adding a reference preserves existing scene fields
- adding a duplicate reference is a no-op or produces a de-duped list
- adding a missing sentence ID is a no-op
- adding to a missing scene ID is a no-op
- adding sorts references by current story order
- removing a sentence reference updates only the selected scene
- removing a missing reference is a no-op
- removing the last reference leaves `sentenceIds: []`
- updating one scene does not rewrite unrelated scenes
- updating references preserves story sentence records
- updating a generated scene marks only that scene stale
- updating an approved scene marks only that scene stale
- updating an ungenerated/unapproved scene does not needlessly mark it stale
- updating scene references does not mark characters stale
- no-op reference updates return the original lesson or leave state unchanged

### 8. Count Mismatch Validity

Tests should prove:

- normal lesson validation accepts a story shorter than `lesson.sentenceCount`
- normal lesson validation accepts a story longer than `lesson.sentenceCount`
- generated story response validation still requires exact generated count if
  that is part of the Phase 5 story-generation contract
- count mismatch does not corrupt save/open normalization

### 9. Stale Behavior Matrix

Add explicit tests for stale behavior if not already covered.

Cover at least:

```text
story edit + shouldMarkStale false -> downstream stale unchanged
story edit + shouldMarkStale true -> generated/approved downstream stale true
reorder + shouldMarkStale false -> downstream stale unchanged
reorder + shouldMarkStale true -> generated/approved downstream stale true
delete + shouldMarkStale true -> affected/generated downstream stale true
add + shouldMarkStale false -> downstream stale unchanged
add + shouldMarkStale true -> generated/approved downstream stale true
scene reference edit -> affected generated/approved scene stale true
scene reference edit -> unrelated scenes stale unchanged
scene reference edit -> characters stale unchanged
```

Keep expectations aligned with the actual product policy implemented in previous
phases. If product policy differs from the table, document the difference in the
test name and review summary.

## Required Backend Coverage

Backend tests should protect save/open and generation assumptions:

- backend normalization preserves sentence array order
- backend normalization recalculates sentence numbers from array order
- backend normalization preserves sentence IDs
- backend validation accepts safe non-sequential sentence IDs
- backend validation accepts edited story length differing from
  `lesson.sentenceCount`
- backend validation accepts scenes with empty `sentenceIds`
- backend validation rejects scene references to missing sentence IDs
- story generation still creates generated drafts with exact requested count
- invalid generated story output still preserves existing story

If backend coverage already exists, avoid duplicating it unnecessarily; add only
missing high-value tests.

## Persistence-Oriented Coverage

If practical with existing project-store tests, add or verify coverage for:

1. Save a lesson after reorder.
2. Reopen and confirm sentence order is preserved.
3. Save a lesson after delete.
4. Reopen and confirm deleted sentence is gone and scene references are cleaned.
5. Save a lesson after add.
6. Reopen and confirm added sentence ID/text/order persists.
7. Save a lesson after scene reference edits.
8. Reopen and confirm updated `scene.sentenceIds` persist.
9. Confirm stale/approved states persist after those edits.

If this would require too much setup, keep persistence coverage focused on
normalizer/project-store boundaries and document any remaining manual QA risk.

## UI Test Guidance

Do not add brittle visual snapshot tests unless the project already has a stable
UI testing setup.

If UI tests are practical, useful coverage includes:

- Add sentence composer cancel/submit state
- Delete confirmation cancel/confirm state
- Locked state hides or disables edit/reorder/delete/add controls
- Scenes show unassigned sentence state
- Scene add/remove reference controls update displayed coverage

If no UI test tooling exists, do not introduce a heavy browser test framework
only for Phase 6A.07. Document manual QA expectations instead.

## Fixtures And Helpers

Use fixtures that make identity/order/reference expectations obvious.

Recommended sentence IDs:

```text
sentence-1
sentence-3
sentence-2
sentence-9
```

These make it obvious whether code is incorrectly sorting or rewriting IDs.

Recommended sentence texts:

```text
Anita phones the doctor.
She asks for an appointment.
The receptionist answers.
```

Recommended scene reference examples:

```js
["sentence-2", "sentence-1"]
```

This makes story-order sorting testable.

Use generated/approved records in stale tests:

```js
{
  generationStatus: "generated",
  approved: false,
  stale: false
}
```

and:

```js
{
  generationStatus: "generated",
  approved: true,
  stale: false
}
```

## Acceptance Checklist

- Existing Phase 6A tests are readable and organized.
- Sentence normalization/order tests are complete.
- Manual edit tests are complete.
- Reorder tests cover upward and downward movement.
- Delete tests cover scene cleanup and empty scene references.
- Add tests cover unique IDs, blank prevention and index clamping if relevant.
- Scene selector tests cover covered and unassigned sentences.
- Scene update tests cover add/remove/de-dupe/order/stale behavior.
- Count mismatch validation is covered.
- Backend normalization and validation assumptions are covered.
- Persistence-sensitive behavior is covered or documented as manual QA.
- Prior cleanse findings are covered.
- Tests avoid brittle CSS or snapshot assertions unless already supported.
- No new product behavior was added except narrow bug fixes revealed by tests.
- No AI/media/export functionality was added.
- `npm test` passes.
- Frontend build passes.

## Suggested Commands

Run the project-specific equivalents if scripts differ:

```sh
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
rg -n "moveStorySentence|deleteStorySentence|addStorySentence|addSceneSentence|removeSceneSentence|getUnassigned|normalizeSceneSentence|validateLessonShape" frontend/test server/test frontend/src server/src
rg -n "split sentence|merge sentence|rebalance|revise|revision|/api/story/revise|plan.*scene|scene.*plan|image prompt|generate image|export" frontend/src server/src docs
```

Optional targeted commands:

```sh
npm run test --workspace frontend -- sentenceOrdering
npm run test --workspace server -- storyGeneration
```

Adjust targeted commands to match Node test runner behavior in this repo.

## Manual QA Reminder

This phase is automated-test focused, but do not remove the need for manual QA
from Phase 6A.06. After tests pass, a human should still verify:

- desktop layout
- narrow viewport layout
- keyboard navigation
- drag-and-drop behavior
- delete confirmation behavior
- add sentence composer behavior
- scene reference controls
- save/open after story and scene edits

## Review Output

When complete, report:

```text
Changes
- Added/organized Phase 6A story editor tests.
- Added/organized Phase 6A scene reference tests.
- Added backend/persistence coverage where practical.

Verification
- npm test: pass/fail
- npm run test --workspace frontend: pass/fail
- npm run test --workspace server: pass/fail
- npm run build --workspace frontend: pass/fail

Notes
- Any intentional test gaps or manual QA still required.
```

## Out Of Scope For This Phase

These are intentionally left for later phases:

- split sentence
- merge sentence
- AI sentence replacement
- AI story rebalance
- AI scene planning
- automatic scene regrouping
- generated character or scene images
- scene image prompt generation
- backend revision endpoints
- export changes
- accounts or cloud sync

