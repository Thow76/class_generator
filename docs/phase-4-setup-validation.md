# Phase 4 Setup Validation

Phase 4 makes Setup the gate for entering the story workflow. The lesson can
still be saved as an incomplete draft, but story work starts only after the
minimum lesson brief is complete.

Phase 5 supersedes the Phase 4 local story action in the production app. Setup
validation still gates story generation, but valid Setup now saves the lesson
and calls the backend story route documented in
`docs/phase-5-story-generation.md`.

## Required Setup fields

These fields must be valid before the app creates or opens a story draft:

- `theme`
- `learnerLevel`
- `setting`
- `scenario`
- `sentenceCount`
- `setup.mainCharacter.name`
- `setup.mainCharacter.age`
- `setup.mainCharacter.sex`
- `setup.mainCharacter.background`

Text fields must contain non-whitespace text. `learnerLevel`, `sentenceCount`
and `setup.mainCharacter.sex` must use approved app options. `Unspecified` is an
accepted sex or gender value because the character brief is intentionally
lightweight.

## Optional Setup fields

These fields are saved but do not block story entry:

- `title`
- `setup.secondaryCharacters`
- `setup.targetVocabulary`
- `setup.additionalNotes`

Secondary character tags are trimmed and deduplicated during normalization.
Target vocabulary and additional notes are guidance for later generation, not
minimum story context.

## Validation behavior

Setup validation lives in `frontend/src/utils/validateSetup.js`. It returns
structured errors with stable field ids, for example:

```js
{
  field: "setup.mainCharacter.name",
  message: "Enter the main character name."
}
```

The Setup UI shows errors after a touched field loses focus, or after the user
attempts to generate a story. A new blank lesson does not show all validation
messages immediately. Once an error is visible, editing the field recalculates
validation from the current lesson data.

## Story workflow gate

In Phase 4, Generate story was a guarded local action:

1. Validate Setup.
2. If Setup is invalid, keep the user on Setup and show inline errors.
3. If Setup is valid, create or preserve a local placeholder story and move to
   Story.

Stage navigation uses the same gate for non-Setup stages. Clearing a required
Setup field removes the Setup completed indicator.

## Placeholder story

`frontend/src/utils/createPlaceholderStory.js` creates the Milestone 1 local
placeholder draft. It is not AI generation and does not call a backend story
route.

When created, the placeholder:

- stores sentences in `lesson.story.sentences`
- uses stable ids such as `sentence-1`
- matches `lesson.sentenceCount`
- sets `lesson.story.status` to `draft`
- resets `lesson.story.lockedAt` to `null`
- sets `lesson.story.modifiedAfterLock` to `false`

Milestone 2 story generation should replace this helper or call a new generation
path after the same Setup validation gate passes.

## Persistence

Phase 3 project save/open persists the full lesson object, including all Setup
fields and any placeholder story. Transient validation state is not persisted;
it is recalculated from lesson data after create, save, refresh or open.
