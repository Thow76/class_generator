# Phase 3 Persistence

Phase 3 persists the complete Phase 2 lesson object locally through backend
project APIs. It remains local-only: there is no OpenAI integration, media
generation, export packaging, account system, Firebase or cloud sync in this
phase.

## Local Data Location

Saved lessons are stored under:

```text
server/data/projects/
```

Each project uses a generated, filename-safe ID and a folder-per-project shape:

```text
server/data/projects/
  lesson-<timestamp>-<random>/
    lesson.json
    meta.json
    images/
      characters/
      scenes/
    exports/
```

`lesson.json` contains the full normalized lesson object, including setup,
story, characters, scenes, reusable values, media metadata, export placeholders
and `currentStage`. `meta.json` supports the open-lesson list and includes
fields such as title, theme, learner level, current stage and timestamps.

The frontend does not write lesson persistence through `localStorage`,
`sessionStorage` or filesystem APIs. It only uses the project API.

## Route Contract

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
POST   /api/projects/:id/duplicate
```

`GET /api/projects` returns project metadata:

```json
{
  "projects": [
    {
      "id": "lesson-20260905-120000-abc123ef",
      "title": "At the Doctor's Surgery",
      "theme": "Everyday health and services",
      "learnerLevel": "Literacies Plus",
      "currentStage": "story",
      "updatedAt": "2026-09-05T12:00:00.000Z"
    }
  ]
}
```

`POST /api/projects` creates a new project. An empty body creates a default
empty lesson. A body with `{ "lesson": {} }` merges supplied lesson fields into
the default shape, then assigns the generated project ID to the lesson.

`GET /api/projects/:id` returns `{ "lesson": {} }` for a saved project.

`PUT /api/projects/:id` saves a complete lesson object from
`{ "lesson": {} }`. The backend normalizes missing optional fields, forces the
lesson `id` to match the project ID, validates references, and writes pretty
JSON using a temp-file rename.

`POST /api/projects/:id/duplicate` creates a new project with a new generated
ID. The duplicate preserves the visible lesson state, including current stage,
story lock state, dummy generated/approved states, stale flags and media filter.
The source project is not mutated.

## Validation

The backend rejects malformed project IDs before reading or writing. IDs
containing path separators, `..`, null bytes, encoded traversal, or values
outside the generated `lesson-*` format are invalid.

Lesson validation checks the top-level workflow fields, learner level, story
status, array shapes, stable record IDs, generation statuses, and scene
references to story sentences and characters. Invalid save requests return JSON
with status `422`; malformed IDs return `400`; missing projects return `404`.

The frontend normalizes loaded lessons with the current default lesson shape and
then runs the Phase 2 `validateLessonShape` checks before replacing visible app
state.
