# Lesson Source Builder: Phase 2 Data Model

Phase 2 makes one serializable lesson object the source of truth for the
frontend. The app is still in-memory only; Phase 3 should persist this object
without needing to reconstruct hidden component state.

## Source Files

- `frontend/src/data/lessonSchema.js` documents the full object shape with JSDoc
  typedefs.
- `frontend/src/data/createLesson.js` initializes empty lesson objects.
- `frontend/src/data/demoLesson.js` contains the isolated demo seed lesson.
- `frontend/src/utils/lessonUpdates.js` contains explicit immutable update
  helpers.
- `frontend/src/utils/lessonSelectors.js` contains derived workflow and media
  selectors.
- `frontend/src/utils/validateLessonShape.js` contains lightweight development
  checks for required fields and references.

## Lesson Shape

The Phase 2 lesson object has these top-level sections:

```js
{
  id,
  theme,
  title,
  learnerLevel,
  setting,
  scenario,
  sentenceCount,
  setup,
  story,
  characters,
  scenes,
  reusable,
  media,
  export,
  currentStage
}
```

`setup` stores main-character setup fields, secondary character tags, target
vocabulary and additional notes. `story.sentences` stores stable sentence
records with `id`, `number`, `text` and `stale`. Characters and scenes use
stable IDs, generation placeholders, approval state, stale state and future
`imagePath` placeholders.

Scenes reference `story.sentences` by `sentenceIds` and reference character
records by `characterIds`. Media review cards are derived from `characters` and
`scenes`; `lesson.media.items` is reserved metadata only in Phase 2 so approval
state is not duplicated.

## Phase 3 Notes

Persistence should save and load the full lesson object. The object contains no
functions, DOM nodes or class instances, so it can be serialized with
`JSON.stringify`. UI-only input buffers, such as the temporary "new note" text,
are intentionally left outside the lesson because they do not define project
state.

Phase 2 does not add file save/open/duplicate, project CRUD routes, OpenAI
integration, generated media, ZIP export or downstream media generation.

