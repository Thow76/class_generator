# Phase 6A.01 Sentence Ordering Model Prompt

Use this prompt to implement the first slice of the Story Editor Upgrade for
Lesson Source Builder.

## Prompt

You are implementing Phase 6A.01: Sentence Ordering Model.

The app already stores generated and edited story text in
`lesson.story.sentences`. Each sentence has a stable `id`, a `number`, `text`,
and related metadata. The Story stage currently renders sentence cards in array
order and displays `sentence.number`, but there is no explicit model rule that
array order is authoritative.

This phase must establish the ordering model that later phases will use for
drag-and-drop, delete sentence, insert sentence, and AI rebalancing. Do not build
drag-and-drop, delete, insert, split, merge, AI rebalance, or new story revision
API endpoints in this phase.

## Phase Goal

Make `lesson.story.sentences` array order the single source of truth for story
sequence, while preserving stable sentence IDs for downstream references.

Done means:

- The app consistently treats sentence array position as the authoritative
  story order.
- `sentence.number` is display/metadata only and is recalculated from array
  order during normalization and story updates.
- Existing generated story creation still produces ordered sentence records.
- Existing manual sentence editing still works.
- Existing lock/unlock behavior still works.
- Existing scene references remain ID-based and are not rewritten just because
  display numbers change.
- Save/open preserves story order.
- Tests cover number normalization and order preservation.

## Product Reasoning

Tutors need to reshape AI-generated stories before locking them as the master
story. For example, the model may generate a redundant first sentence such as:

```text
Anita is in her kitchen.
```

The tutor may want the story to begin immediately with:

```text
Anita phones the doctor.
```

Future phases will let the tutor reorder, delete, and add sentence cards. Before
those features are added, the data model must be clear:

- sentence identity is stable through `sentence.id`
- story order is the array order
- display numbering is derived from array position
- scenes continue to reference sentence IDs, not sentence numbers

This prevents fragile behavior where moving sentence cards also changes their
identity.

## Current Relevant Files

Review these files before editing:

```text
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
docs/phase-5-story-generation.md
```

## Scope

Build:

- A clear ordering rule in frontend and backend normalization.
- Recalculation of `sentence.number` from array index.
- Any small shared helper needed to avoid duplicated numbering logic.
- Tests that prove saved or loaded lessons use array order.
- Documentation updates if needed to describe the model rule.

Do not build:

- Drag-and-drop UI.
- Move up or move down buttons.
- Delete sentence.
- Add or insert sentence.
- Split sentence.
- Merge sentences.
- AI rewrite, regenerate, shorten, simplify, rebalance, or replace endpoints.
- Scene planning changes beyond preserving existing ID-based references.
- Changes to locked-story policy beyond what is required to preserve current
  behavior.

## Required Model Rules

### 1. Array Order Is Authoritative

The ordered story is:

```js
lesson.story.sentences[0]
lesson.story.sentences[1]
lesson.story.sentences[2]
```

not:

```js
sentence.number === 1
sentence.number === 2
sentence.number === 3
```

If a loaded lesson contains sentence records in this order:

```json
[
  { "id": "sentence-3", "number": 3, "text": "Third idea." },
  { "id": "sentence-1", "number": 1, "text": "First idea." }
]
```

the normalized lesson should preserve that array order and recalculate numbers:

```json
[
  { "id": "sentence-3", "number": 1, "text": "Third idea." },
  { "id": "sentence-1", "number": 2, "text": "First idea." }
]
```

Do not sort by `sentence.number`.

### 2. Sentence IDs Are Stable Identity

Do not regenerate or renumber sentence IDs when normalizing, saving, opening, or
editing existing sentences.

Good:

```json
{ "id": "sentence-7", "number": 2, "text": "Anita phones the doctor." }
```

Bad:

```json
{ "id": "sentence-2", "number": 2, "text": "Anita phones the doctor." }
```

Future scene references rely on stable IDs.

### 3. Display Numbers Are Derived

The Story screen may display a number next to each card, but that number should
come from the current array position or from a normalized `number` that has just
been recalculated from the array position.

Recommended UI approach:

```jsx
lesson.story.sentences.map((sentence, index) => (
  <span>{index + 1}</span>
))
```

This makes the UI robust even if an in-memory lesson has stale `number` values.

### 4. Scene References Stay ID-Based

Do not update `scene.sentenceIds` when sentence display numbers change.

If `scene-1` references:

```json
["sentence-1", "sentence-2", "sentence-3"]
```

those references should continue to point to the same sentence records after
normalization.

Phase 6A.01 should not decide how scenes are regrouped after future drag, delete,
or insert operations. It only needs to preserve valid ID references.

### 5. Validation Should Not Require Sequential IDs

Validation should require each sentence to have a safe stable ID, but should not
assume IDs match display numbers.

Valid:

```json
[
  { "id": "sentence-9", "number": 1, "text": "First displayed sentence." },
  { "id": "sentence-2", "number": 2, "text": "Second displayed sentence." }
]
```

Invalid only if:

- a sentence is missing an ID
- an ID is unsafe
- a required text field is missing
- a scene references a missing sentence ID

## Implementation Guidance

### Frontend Normalization

Update `frontend/src/utils/normalizeLesson.js` so story sentences are normalized
in existing array order and assigned:

```js
number: index + 1
```

Make sure object spread order does not allow stale loaded `sentence.number` to
override the recalculated value.

Suggested shape:

```js
normalized.story.sentences = ensureArray(normalized.story.sentences).map(
  (sentence, index) => ({
    text: "",
    stale: false,
    source: "manual",
    updatedAt: null,
    ...(isPlainObject(sentence) ? sentence : {}),
    number: index + 1
  })
);
```

Use the project’s existing helper patterns. If `isPlainObject` is not currently
available in the frontend normalizer, either add a small local helper or use the
existing project style.

### Backend Normalization

Update `server/src/services/normalizeLesson.js` with the same rule.

The backend should preserve the array order received from saved project JSON or
client save payloads, then recalculate `number` from index.

This protects persistence and project open/save behavior.

### Story Generation

`server/src/services/storyGenerationService.js` can continue creating generated
sentences with:

```js
id: `sentence-${index + 1}`,
number: index + 1
```

No new generation behavior is required.

### Story Updates

Review `frontend/src/utils/lessonUpdates.js`.

Manual sentence edits should continue updating by `sentence.id`. If this file
contains or gains any helper that modifies the sentence array, make sure it
recalculates `number` from array order before returning the lesson.

For this phase, it is acceptable to add a small helper such as:

```js
function renumberSentences(sentences) {
  return sentences.map((sentence, index) => ({
    ...sentence,
    number: index + 1
  }));
}
```

Only export it if tests or other modules need it.

### Story Stage Display

Update `frontend/src/stages/StoryStage.jsx` so displayed sentence numbers are
derived from the map index rather than trusting `sentence.number`.

Example:

```jsx
{lesson.story.sentences.map((sentence, index) => {
  ...
  <span className="sentence-card__number">{index + 1}</span>
})}
```

Do not add drag handles or new buttons in this phase.

### Scenes Stage Display

Review `frontend/src/stages/ScenesStage.jsx`.

It currently maps `sentence.id` to `sentence.text`, which is correct. Do not
change scene references to use numbers.

If covered sentences need to be displayed in story order, that can be handled in
a later scene-editing phase. Do not expand scope unless an existing test fails.

## Tests

Add focused tests. Prefer testing utility/model behavior instead of UI snapshots.

### Frontend Tests

Add or update tests to cover:

1. Frontend normalization preserves sentence array order.
2. Frontend normalization recalculates `number` from array position.
3. Frontend normalization preserves stable sentence IDs.
4. Manual sentence edits still update the sentence by ID.

Example input:

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

Expected:

```js
normalized.story.sentences.map(({ id, number, text }) => ({
  id,
  number,
  text
}))
```

equals:

```js
[
  { id: "sentence-3", number: 1, text: "Now first." },
  { id: "sentence-1", number: 2, text: "Now second." }
]
```

### Backend Tests

Add or update tests to cover:

1. Backend normalization preserves sentence array order.
2. Backend normalization recalculates `number`.
3. Backend validation accepts non-sequential sentence IDs.
4. Backend validation still rejects scene references to missing sentence IDs.

The goal is to prove that sentence IDs do not need to match sentence display
numbers.

### Persistence-Oriented Test

If practical, add a project-store or integration-style test:

1. Save a lesson whose sentence array order differs from its stale `number`
   fields.
2. Reopen it.
3. Confirm reopened lesson keeps array order.
4. Confirm reopened lesson has recalculated display numbers.

## Acceptance Checklist

- Story cards display numbers based on current array order.
- Frontend normalizer recalculates sentence numbers after preserving array
  order.
- Backend normalizer recalculates sentence numbers after preserving array order.
- Manual sentence editing still works by stable sentence ID.
- Generated stories still produce the requested sentence count.
- Saved/opened lessons preserve sentence array order.
- Scene references remain ID-based.
- Validation does not require `sentence.id` to match `sentence.number`.
- Tests pass.
- No drag-and-drop, delete, insert, or AI revision functionality has been added.

## Suggested Manual QA

Use a temporary lesson JSON or test fixture with deliberately mismatched sentence
numbers:

```json
[
  {
    "id": "sentence-3",
    "number": 3,
    "text": "This should display as sentence 1.",
    "stale": false
  },
  {
    "id": "sentence-1",
    "number": 1,
    "text": "This should display as sentence 2.",
    "stale": false
  }
]
```

Then confirm:

1. The Story screen displays them in that array order.
2. The visible numbers are 1 and 2.
3. Saving and reopening keeps the same text order.
4. Scene references still point to the same sentence IDs.

## Out Of Scope For This Phase

These are intentionally left for later phases:

- Phase 6A.02: drag-and-drop sentence cards.
- Phase 6A.03: delete sentence.
- Phase 6A.04: add or insert sentence.
- Phase 6A.05: explicit scene-reference cleanup after delete or insert.
- Phase 6B: AI sentence tools and story rebalancing.

