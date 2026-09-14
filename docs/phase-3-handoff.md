# Lesson Source Builder: Phase 3 Handoff

## Purpose

Phase 3 should make the Phase 2 lesson object persistent while preserving the
existing six-stage workflow. Phase 2 established one normalized, serializable
lesson object as the frontend source of truth; Phase 3 should save and load that
object without changing the lesson schema for unrelated future features.

The implementation should let a user create, save, open and duplicate local
lesson projects. It should not add OpenAI integration, image generation,
downstream media generation, audio/video generation, account sync or ZIP export.

## Starting Point

Important Phase 2 files:

- `frontend/src/data/lessonSchema.js`
- `frontend/src/data/createLesson.js`
- `frontend/src/data/demoLesson.js`
- `frontend/src/utils/lessonUpdates.js`
- `frontend/src/utils/lessonSelectors.js`
- `frontend/src/utils/validateLessonShape.js`
- `frontend/src/App.jsx`
- `docs/phase-2-data-model.md`

The lesson object is intentionally serializable with `JSON.stringify`. It
contains setup data, story state, character records, scene records, reusable
values, media metadata, export metadata and `currentStage`.

## Phase 3 Scope

Build:

- Local project persistence for the full Phase 2 lesson object.
- Backend routes for listing, creating, reading, updating and duplicating lesson
  projects.
- A small local storage format under a project data directory.
- Frontend loading/saving state connected to the backend.
- New Lesson, Open Existing Lesson and Duplicate Lesson flows.
- Clear save status in the UI.
- Validation before saving and after loading.
- Migration-safe handling for missing or older optional fields where practical.

Do not build:

- OpenAI story generation.
- Character extraction.
- Scene planning APIs.
- Real image generation.
- Audio/video source generation.
- ZIP export.
- Firebase, hosted auth, user accounts or cloud sync.
- Any replacement for the Phase 2 schema unless persistence exposes a genuine
  bug in it.

## Data Contract

Persist the complete lesson object shaped by `frontend/src/data/lessonSchema.js`.
At minimum, saved records must include:

```text
id
theme
title
learnerLevel
setting
scenario
sentenceCount
setup
story
characters
scenes
reusable
media
export
currentStage
```

Save and load these fields exactly enough that reopening a lesson recreates the
same visible UI state, including current stage, story lock state, modified-after
lock flags, character approvals, scene approvals, stale markers and media
filter.

Temporary UI buffers, such as text currently being typed into an "add note" or
"add secondary character" field, do not need to be persisted.

## Recommended Backend Shape

Add project routes without disturbing `server/src/routes/health.js`:

```text
server/src/routes/projects.js
server/src/services/projectStore.js
server/data/projects/
```

Suggested API:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
POST   /api/projects/:id/duplicate
```

Use JSON files for Phase 3 local persistence. Keep file names based on stable
project IDs, not lesson titles. Store enough metadata for the open-project list,
such as `id`, `title`, `learnerLevel`, `updatedAt` and `currentStage`.

Use Node filesystem APIs only in the backend. The frontend should call API
routes and should not use `localStorage` or direct filesystem access for lesson
project persistence.

## Recommended Frontend Shape

Keep `App.jsx` as the owner of the loaded lesson object unless the file becomes
too large. Add a small API client if useful, for example:

```text
frontend/src/api/projects.js
```

Recommended UI additions:

- New Lesson action.
- Open Lesson action or modal.
- Duplicate Lesson action.
- Save action.
- Save status: unsaved, saving, saved, error.

Keep these additions quiet and consistent with the existing left-navigation
workflow. Avoid turning the first screen into a marketing or dashboard page; the
workflow should still be the primary experience.

## Validation And Migration

Use `validateLessonShape` before saving and after loading. If a loaded lesson is
missing optional Phase 2 fields, merge it through `createEmptyLesson` or a small
normalization helper so older local files do not crash the UI.

Do not silently discard unknown fields. Future phases may add fields, and Phase
3 should avoid making saved files brittle.

## Acceptance Criteria

- A user can create a fresh lesson from the app.
- A user can save the current lesson locally through the backend.
- A user can open a saved lesson and see the same stage, story, characters,
  scenes, media filter and approval state.
- A user can duplicate an existing lesson without mutating the original.
- Saved project IDs are stable.
- Duplicated lessons receive a new stable ID.
- Backend project routes validate malformed IDs and missing projects.
- Frontend handles save/load errors visibly.
- Existing Phase 1/2 interactions still work after loading a saved project.
- No AI, generated media, account, cloud sync or ZIP export scope is introduced.

## Manual QA Checklist

- Start the app with `npm run dev`.
- Confirm `GET /api/health` still returns JSON.
- Create a new lesson and edit Setup fields.
- Add and remove a secondary character.
- Edit a story sentence, lock it, then unlock it.
- Generate and approve at least one character.
- Generate and approve at least one scene.
- Switch Media filter to Scenes.
- Save the lesson.
- Refresh the browser and open the saved lesson.
- Confirm the current stage and edited values are restored.
- Duplicate the lesson.
- Confirm the duplicate has a different ID and does not mutate the original.
- Search the codebase for accidental future-scope additions.

## Verification Commands

Run available commands:

```sh
npm run build --workspace frontend
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "OpenAI|openai|zip|firebase|auth|login|account" frontend server package.json
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
```

If route tests are added, also run the backend test command. If no test runner
exists yet, add focused tests for `projectStore` and route validation before
expanding the rest of the app.

## Handoff Notes

Phase 3 should attach persistence to the object model, not reshape the workflow
around persistence. The best outcome is boring: saved JSON should look like the
Phase 2 lesson object, loading should hydrate that object, and every existing
stage should continue to render from `lesson` exactly as it does now.

