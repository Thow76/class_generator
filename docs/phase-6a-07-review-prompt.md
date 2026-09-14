# Phase 6A.07 Review Prompt

Use this prompt to review whether Phase 6A.07 of Lesson Source Builder was
implemented correctly.

## Prompt

You are reviewing Phase 6A.07: Tests.

Your job is to verify that the manual Story Editor Upgrade delivered in Phase
6A.01 through Phase 6A.06 now has clear, durable automated coverage. This review
should focus on test quality, coverage gaps, regression protection, and whether
the phase stayed test-focused.

Review Phase 6A.07 only. Do not require new product features, new UI behavior,
split sentence, merge sentence, AI sentence replacement, AI story rebalance, AI
scene planning, generated media changes, backend revision endpoints, export
changes, accounts or cloud sync.

## Phase Goal

The implementation is correct only if:

- Phase 6A tests are organized and readable.
- Core story sentence update helpers are covered.
- Core scene-reference selectors and update helpers are covered.
- Validation behavior for edited story lengths and scene references is covered.
- Backend normalization and validation assumptions are covered where needed.
- Persistence-sensitive behavior is covered where practical or clearly noted as
  manual QA risk.
- Prior cleanse findings are covered.
- Tests catch accidental ID rewriting, stale number usage, scene-reference
  corruption and stale handling regressions.
- Tests avoid brittle CSS/snapshot assertions unless the repo already supports
  that style.
- Any production changes are narrow bug fixes revealed by tests and are covered
  by those tests.
- Frontend and backend test suites pass.
- Frontend build passes.
- No AI/media/export or later editor functionality was added.

## Expected Files

Review these files or their close equivalents:

```text
docs/phase-6a-07-tests-prompt.md
docs/phase-6a-06-ux-polish-prompt.md
docs/phase-6a-06-review-prompt.md
docs/phase-6a-05-scene-referencing-prompt.md
docs/phase-6a-05-review-prompt.md
docs/phase-6a-05-cleanse-unassigned-after-removal-prompt.md
docs/phase-6a-04-add-sentence-prompt.md
docs/phase-6a-04-review-prompt.md
docs/phase-6a-04-cleanse-test-coverage-prompt.md
docs/phase-6a-03-delete-sentence-prompt.md
docs/phase-6a-03-review-prompt.md
docs/phase-6a-02-drag-and-drop-sentence-cards-prompt.md
docs/phase-6a-02-review-prompt.md
docs/phase-6a-01-sentence-ordering-model-prompt.md
docs/phase-6a-01-review-prompt.md
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/test/sentenceOrdering.test.js
frontend/test/validateSetup.test.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/storyGenerationService.js
server/test/storyGeneration.test.js
server/test/projectStore.test.js
```

Also inspect any new or renamed test files created in Phase 6A.07.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
git diff -- docs frontend/src frontend/test server/src server/test package.json frontend/package.json server/package.json package-lock.json
rg -n "moveStorySentence|deleteStorySentence|addStorySentence|updateStorySentence|addSceneSentence|removeSceneSentence|replaceSceneSentence|getUnassigned|normalizeSceneSentence|validateLessonShape|validateLesson" frontend/test server/test frontend/src server/src
rg -n "shouldMarkStale|stale|sentenceIds|sentence\\.id|sentence\\.number|number: index \\+ 1|renumber|sentenceCount" frontend/test server/test
rg -n "split sentence|merge sentence|rebalance|revise|revision|/api/story/revise|plan.*scene|scene.*plan|image prompt|generate image|export" frontend/src server/src docs
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If scripts differ, inspect `package.json`, `frontend/package.json` and
`server/package.json`, then run the closest available frontend/backend tests and
frontend build.

## Review Steps

1. Read `docs/phase-6a-07-tests-prompt.md`.
2. Inspect the git diff and list every changed file.
3. Confirm the changes are primarily tests and test helpers.
4. If production files changed, confirm each change is a narrow bug fix revealed
   by tests, not new product scope.
5. Confirm no new UI, AI, media, export or backend revision feature was added.
6. Inspect test organization.
7. Confirm tests are named by behavior and are easy to scan.
8. Confirm fixture helpers clarify the tests rather than hiding important setup.
9. Confirm tests use deliberately non-sequential IDs where useful to catch ID
   rewriting or number sorting bugs.
10. Confirm tests do not depend on brittle CSS class ordering or snapshots unless
    the repo already has a stable pattern for that.
11. Review frontend story sentence coverage.
12. Review frontend scene-reference coverage.
13. Review count mismatch and validation coverage.
14. Review stale behavior coverage.
15. Review backend normalization and validation coverage.
16. Review persistence-oriented coverage or documented remaining manual QA risk.
17. Confirm prior cleanse findings were addressed.
18. Run the relevant test suite and frontend build.
19. Report any failures or missing coverage with exact file and line references.

## Required Coverage Audit

Use this section as a checklist. If coverage is missing, report it as a finding.

### Sentence Ordering Model

Tests should prove:

- frontend normalization preserves sentence array order
- frontend normalization recalculates `number` from array position
- stale loaded `sentence.number` values cannot override derived numbering
- existing sentence IDs are preserved
- frontend validation accepts safe non-sequential sentence IDs
- frontend validation does not require `sentence.id` to match `sentence.number`
- frontend validation still rejects scenes that reference missing sentence IDs
- backend normalization preserves sentence array order
- backend normalization recalculates sentence numbers from array order
- backend normalization preserves sentence IDs
- backend validation accepts safe non-sequential sentence IDs
- backend validation rejects missing scene sentence references

### Manual Sentence Edit

Tests should prove:

- `updateStorySentence` updates by sentence ID
- updating one sentence preserves other sentence records
- updating preserves sentence order
- updating preserves sentence IDs
- story edits mark downstream records stale when requested
- story edits do not mark downstream records stale when not requested

### Sentence Reorder

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

### Delete Sentence

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
- normal validation accepts the cleaned deletion result

### Add Sentence

Tests should prove:

- adding non-empty text creates exactly one new sentence record
- whitespace-only text is a no-op
- submitted text is trimmed
- new sentence ID is safe
- new sentence ID is unique
- new sentence ID does not collide after deletion or non-sequential existing IDs
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
- invalid low insertion index clamps to the start if positioned insertion exists
- invalid high insertion index clamps to the end if positioned insertion exists
- insert-after behavior computes from sentence ID, not stale array index, if
  positioned insertion exists

### Scene Reference Selectors

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

### Scene Reference Updates

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

### Count Mismatch Validity

Tests should prove:

- normal frontend validation accepts a story shorter than `lesson.sentenceCount`
- normal frontend validation accepts a story longer than `lesson.sentenceCount`
- normal backend validation accepts edited story length differing from
  `lesson.sentenceCount`
- generated story response validation still requires exact generated count
- count mismatch does not corrupt normalization or save/open expectations

### Stale Behavior Matrix

Tests should explicitly cover:

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

If product behavior intentionally differs, the tests should make that policy
clear in the test name or assertions.

### Backend And Persistence

Tests should cover, or explicitly document why they do not cover:

- backend normalization of reordered sentence arrays
- backend validation of non-sequential sentence IDs
- backend validation of edited story lengths
- backend validation of empty scene `sentenceIds`
- backend rejection of missing scene sentence references
- story generation still creates exact requested count
- invalid generated story output preserves existing story
- save/reopen preserves reordered story order
- save/reopen preserves deletion and cleaned scene references
- save/reopen preserves added sentence ID/text/order
- save/reopen preserves edited `scene.sentenceIds`
- save/reopen preserves stale and approved states

## Prior Cleanse Findings

Confirm these earlier coverage gaps are closed:

- Phase 6A.04: direct negative stale assertions for
  `addStorySentence(..., false)`.
- Phase 6A.04: invalid low insertion index clamps to the start.
- Phase 6A.04: invalid high insertion index clamps to the end.
- Phase 6A.05: `getUnassignedStorySentences()` updates after removing a scene
  reference.

If any remain missing, report them as findings.

## Test Quality Checks

Report findings for tests that:

- pass without asserting the important behavior
- only test happy paths when the requirement is about edge cases
- use sentence IDs that are too sequential to catch ID rewriting
- assert implementation details instead of behavior
- duplicate large fixtures without useful variation
- hide important setup inside overly clever helpers
- depend on wall-clock time without control, when deterministic assertions would
  be better
- introduce flakiness through async timing, random IDs or filesystem state
- require network access
- require an OpenAI API key
- depend on local project data outside the test temp directory
- depend on browser manual state

## Specific Failure Modes To Look For

Report these as findings if present:

- Phase 6A.07 added product behavior instead of tests.
- Tests were added but do not cover the reviewed gaps.
- Production changes are not covered by a test.
- Tests pass even if sentence IDs are rewritten.
- Tests pass even if sentences are sorted by `sentence.number`.
- Tests pass even if `scene.sentenceIds` are rewritten to display numbers.
- Tests pass even if deleted sentence IDs remain in scenes.
- Tests pass even if added sentence IDs collide.
- Tests pass even if unassigned detection uses text instead of IDs.
- Tests pass even if stale behavior is broad or missing.
- Backend validation coverage contradicts frontend assumptions.
- Persistence tests use shared local data instead of isolated temp storage.
- Tests require network or real OpenAI calls.
- Test scripts are changed in a way that skips frontend or backend coverage.
- AI scene planning, AI story revision, generated media or export functionality
  was added in this phase.

## Commands To Run

Run:

```sh
npm test
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Also run targeted tests if the repo supports them, for example:

```sh
npm run test --workspace frontend -- sentenceOrdering
npm run test --workspace server -- storyGeneration
npm run test --workspace server -- projectStore
```

Adjust targeted commands to match this repo's Node test runner behavior.

## Manual QA Reminder

Phase 6A.07 is automated-test focused. Do not fail this phase solely because
manual UX QA from Phase 6A.06 has not been repeated, but report it as residual
risk if it has not been done after the test changes.

Manual QA should still cover:

- desktop layout
- narrow viewport layout
- keyboard navigation
- drag-and-drop behavior
- delete confirmation behavior
- add sentence composer behavior
- scene reference controls
- save/open after story and scene edits

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```text
Findings
- [P1] Title - file:line
  Explanation of the coverage gap, test risk, behavioral bug or scope issue.

Open Questions
- Any unclear product or testing assumptions.

Test Results
- Command: result.

Coverage Notes
- Important coverage confirmed.
- Any residual manual QA risk.

Summary
- Brief statement of whether Phase 6A.07 is correctly implemented.
```

If there are no findings, say so clearly and mention any residual manual QA or
test gaps.

## Out Of Scope

Do not mark the implementation incomplete because it lacks:

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

Those belong to later phases.

