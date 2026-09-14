# Phase 6A.01 Review Prompt

Use this prompt to review whether Phase 6A.01 of Lesson Source Builder was
implemented correctly.

## Prompt

You are reviewing Phase 6A.01: Sentence Ordering Model.

Your job is to verify that `lesson.story.sentences` array order is now the
single source of truth for story sequence, while sentence IDs remain stable
identity values for editing and downstream scene references.

Review Phase 6A.01 only. Do not require drag-and-drop, delete sentence, insert
sentence, split sentence, merge sentence, AI rebalance, sentence-level OpenAI
revision endpoints, scene replanning, image generation, export changes, accounts
or cloud sync.

## Phase Goal

The implementation is correct only if:

- Story sentence array order is treated as authoritative.
- `sentence.number` is recalculated from array position during frontend
  normalization.
- `sentence.number` is recalculated from array position during backend
  normalization.
- Stale or mismatched loaded `sentence.number` values cannot override derived
  numbering.
- The Story screen displays sentence numbers from current array position, or
  from freshly normalized values that are guaranteed to match array position.
- Existing sentence IDs are preserved during normalize, save, open and manual
  edit flows.
- Validation does not require sentence IDs to match display numbers.
- Scene references remain ID-based through `scene.sentenceIds`.
- Scenes are not rewritten merely because display numbers change.
- Existing generation, edit, lock, unlock, save and open behavior still works.
- No later Phase 6A or Phase 6B features were accidentally added.

## Expected Files

Review these files or their close equivalents:

```text
docs/phase-6a-01-sentence-ordering-model-prompt.md
frontend/src/data/lessonSchema.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/stages/StoryStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/data/demoLesson.js
frontend/src/utils/createPlaceholderStory.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/storyGenerationService.js
server/test/storyGeneration.test.js
frontend/test/validateSetup.test.js
```

Also inspect any new tests added for this phase.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
git diff -- docs frontend/src frontend/test server/src server/test
rg -n "number: index \\+ 1|sentence\\.number|sentences\\.sort|sort\\(" frontend/src server/src frontend/test server/test docs
rg -n "drag|drop|dnd|delete sentence|remove sentence|insert sentence|split sentence|merge sentence|rebalance|revise" frontend/src server/src docs
rg -n "sentenceIds|scene\\.sentenceIds" frontend/src server/src frontend/test server/test
npm test
npm run test --workspace frontend
npm run test --workspace server
```

If the package scripts differ, inspect `package.json`, `frontend/package.json`
and `server/package.json` and run the closest available frontend and backend
test commands.

## Review Steps

1. Read `docs/phase-6a-01-sentence-ordering-model-prompt.md`.
2. Inspect the git diff and identify every changed file.
3. Confirm the changes are limited to Phase 6A.01 ordering-model work.
4. Inspect frontend normalization.
5. Confirm it preserves sentence array order and sets `number: index + 1` after
   spreading loaded sentence data.
6. Confirm stale loaded `sentence.number` cannot override the recalculated
   number.
7. Inspect backend normalization.
8. Confirm it applies the same array-order and `number: index + 1` rule.
9. Confirm neither frontend nor backend normalizer sorts sentences by
   `sentence.number`.
10. Confirm neither normalizer regenerates existing sentence IDs.
11. Inspect Story stage rendering.
12. Confirm the visible sentence number is derived from array position, or from
   normalized sentence data that cannot be stale.
13. Inspect manual sentence editing.
14. Confirm edits still target sentences by stable `sentence.id`, not by display
   number or array index alone.
15. Inspect scene display and validation.
16. Confirm scenes still refer to sentences through `scene.sentenceIds`.
17. Confirm scene references are not rewritten just because display numbers are
   recalculated.
18. Inspect validation.
19. Confirm validation accepts safe, non-sequential sentence IDs.
20. Confirm validation still rejects scenes that reference missing sentence IDs.
21. Inspect generated-story behavior.
22. Confirm full story generation still creates the requested number of
   sentence records.
23. Confirm generated sentences may still use sequential IDs when creating a
   brand-new story.
24. Inspect save/open flow if touched.
25. Confirm saved or opened lessons preserve array order.
26. Run the relevant test suite.
27. Report any failures with exact file and line references.

## Required Test Coverage

Verify that tests cover the following behavior. If they do not, report the gap.

### Frontend

- Normalization preserves sentence array order.
- Normalization recalculates `number` from array position.
- Normalization preserves stable sentence IDs.
- Manual sentence editing updates by sentence ID.

Recommended test fixture:

```js
const lesson = createEmptyLesson({
  story: {
    sentences: [
      { id: "sentence-3", number: 3, text: "Now first.", stale: false },
      { id: "sentence-1", number: 1, text: "Now second.", stale: false }
    ]
  }
});
```

Expected normalized result:

```js
[
  { id: "sentence-3", number: 1, text: "Now first." },
  { id: "sentence-1", number: 2, text: "Now second." }
]
```

### Backend

- Normalization preserves sentence array order.
- Normalization recalculates `number` from array position.
- Validation accepts non-sequential sentence IDs.
- Validation still rejects scene references to missing sentence IDs.

### Persistence

If practical, tests should cover:

- Save a lesson where array order and stale `number` values disagree.
- Reopen it.
- Confirm reopened text order matches original array order.
- Confirm reopened sentence numbers are recalculated from array position.

## Specific Failure Modes To Look For

Report these as findings if present:

- Sentences are sorted by `sentence.number` during normalize, save, open or
  render.
- Existing sentence IDs are rewritten to match new display numbers.
- Object spread order allows stale loaded `sentence.number` to override
  recalculated numbering.
- Story UI displays stale `sentence.number` directly from untrusted in-memory
  data.
- Manual edits update by array index instead of sentence ID.
- Validation rejects a safe ID such as `sentence-9` appearing at display number
  1.
- Scene references are changed when only sentence display numbers change.
- Scene references are converted from IDs to numbers.
- Generated story behavior was changed beyond this phase.
- Drag-and-drop, delete, insert, split, merge or AI rebalance functionality was
  added in this phase.

## Manual QA Scenario

Create or load a temporary lesson with this sentence array:

```json
[
  {
    "id": "sentence-3",
    "number": 3,
    "text": "This should display first.",
    "stale": false
  },
  {
    "id": "sentence-1",
    "number": 1,
    "text": "This should display second.",
    "stale": false
  },
  {
    "id": "sentence-8",
    "number": 8,
    "text": "This should display third.",
    "stale": false
  }
]
```

Then confirm:

1. The Story screen displays the sentences in the same array order.
2. The visible sentence numbers are 1, 2 and 3.
3. The sentence IDs remain `sentence-3`, `sentence-1` and `sentence-8`.
4. Editing the second visible sentence updates `sentence-1`.
5. Saving and reopening keeps the same text order.
6. Saving and reopening recalculates numbers as 1, 2 and 3.
7. Any scene that references `sentence-3` still references `sentence-3`.

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
- Brief statement of whether Phase 6A.01 is correctly implemented.
```

If there are no findings, say so clearly and mention any residual test gaps.

## Out Of Scope

Do not mark the implementation incomplete because it lacks:

- drag-and-drop sentence cards
- move up or move down buttons
- delete sentence
- add or insert sentence
- split or merge sentence
- AI sentence replacement
- AI story rebalance
- scene regrouping after reorder
- scene cleanup after delete
- generated media changes

Those belong to later phases.

