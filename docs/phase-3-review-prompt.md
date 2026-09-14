# Phase 3 Review Prompt

Use this prompt to review whether Milestone 1, Phase 3 of Lesson Source Builder was implemented correctly. The review should verify local project persistence only.

## Prompt

You are reviewing Milestone 1, Phase 3 of the Lesson Source Builder implementation.

Your job is to verify that the Phase 2 lesson object is now persisted locally through backend project APIs, and that users can create, save, open and duplicate lesson projects without changing the approved six-stage workflow.

Review Phase 3 only. Do not require OpenAI integration, real image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, user accounts, Firebase or cloud sync.

## Phase 3 Goal

Make the Phase 2 lesson object persistent.

The implementation is correct only if:

- Backend project routes exist for list, create, read, update and duplicate.
- Backend project storage saves complete lesson objects as JSON.
- Project IDs are stable, filename-safe and protected against path traversal.
- Frontend project actions call backend APIs rather than browser storage.
- New Lesson works.
- Save works.
- Open Existing Lesson works.
- Duplicate Lesson works without mutating the original.
- Reopened lessons restore visible UI state, including current stage and approval states.
- Save/load validation and normalization exist.
- Existing Phase 1/2 interactions still work after opening saved projects.
- No later-scope AI, media generation, cloud/account or ZIP export work was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-3-implementation-prompt.md
docs/phase-3-handoff.md
docs/phase-3-persistence.md
frontend/src/api/projects.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/App.jsx
server/src/routes/projects.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/routes/health.js
server/src/index.js
server/test/projectStore.test.js
server/data/projects/
```

File names may differ, but the implementation should clearly separate:

- Backend route handling.
- Backend project storage.
- Backend lesson validation.
- Backend lesson normalization.
- Frontend project API calls.
- Frontend load/save UI state.
- Persistence documentation.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
find server/src server/test frontend/src docs -maxdepth 4 -type f | sort
npm run build --workspace frontend
npm run test --workspace server
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "PROJECT_DATA_DIR|projectStore|normalizeLesson|validateLesson|/api/projects|saveProject|duplicateProject|listProjects" server frontend/src
rg "localStorage|sessionStorage|indexedDB" frontend/src
rg "OpenAI|openai|zip|firebase|auth|login|account|ElevenLabs|PowerPoint|worksheet" frontend server package.json
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
find server/data/projects -maxdepth 3 -type f | sort
```

Expected development URLs:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
```

## API Contract To Verify

The backend should expose these routes:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
POST   /api/projects/:id/duplicate
```

### `GET /api/projects`

Expected behavior:

- Returns JSON.
- Returns a `projects` array.
- Each item includes enough metadata for an open-project list.

Recommended metadata:

```text
id
title
theme
learnerLevel
currentStage
createdAt
updatedAt
```

### `POST /api/projects`

Expected behavior:

- Creates a new project.
- Generates a stable safe ID.
- Writes a complete normalized lesson object.
- Creates a project folder under backend project storage.
- Returns created project data as JSON.

### `GET /api/projects/:id`

Expected behavior:

- Rejects malformed IDs.
- Returns `404` for missing projects.
- Returns the complete normalized lesson object for valid projects.

### `PUT /api/projects/:id`

Expected behavior:

- Requires a `{ "lesson": {} }` request body.
- Forces or preserves the project ID consistently.
- Normalizes missing optional fields.
- Validates the lesson shape.
- Writes pretty JSON to disk.
- Returns the saved lesson as JSON.

### `POST /api/projects/:id/duplicate`

Expected behavior:

- Rejects malformed IDs.
- Returns `404` for missing source project.
- Creates a new project with a new ID.
- Copies the visible lesson state.
- Does not mutate the source project.
- Returns the duplicate lesson and source project ID.

## Suggested Curl Checks

Start the backend, then run checks like these.

List projects:

```sh
curl -s http://127.0.0.1:3001/api/projects
```

Create project:

```sh
curl -s -X POST http://127.0.0.1:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{}'
```

Open created project:

```sh
curl -s http://127.0.0.1:3001/api/projects/<PROJECT_ID>
```

Save project:

```sh
curl -s -X PUT http://127.0.0.1:3001/api/projects/<PROJECT_ID> \
  -H "Content-Type: application/json" \
  -d '{"lesson":{"id":"<PROJECT_ID>","theme":"Review check"}}'
```

Duplicate project:

```sh
curl -s -X POST http://127.0.0.1:3001/api/projects/<PROJECT_ID>/duplicate
```

Malformed ID:

```sh
curl -i http://127.0.0.1:3001/api/projects/..%2Fx
```

Missing project:

```sh
curl -i http://127.0.0.1:3001/api/projects/lesson-missing
```

Use a valid full lesson object for save checks when testing route validation in detail. A deliberately partial body may correctly fail validation.

## Review Steps

1. Read `docs/phase-3-implementation-prompt.md`.
2. Read `docs/phase-3-persistence.md`.
3. Inspect `server/src/index.js` and confirm project routes are mounted without breaking health.
4. Inspect `server/src/routes/projects.js`.
5. Confirm all five project routes exist and return JSON responses.
6. Inspect `server/src/services/projectStore.js`.
7. Confirm local JSON storage is backend-only.
8. Confirm project IDs are generated safely and validated before reads/writes.
9. Confirm path traversal is rejected.
10. Confirm writes stay under the configured project data directory.
11. Confirm complete lessons are saved to `lesson.json`.
12. Confirm metadata is available for project listing.
13. Inspect `server/src/services/normalizeLesson.js`.
14. Confirm missing optional fields are normalized without deleting unknown fields.
15. Inspect `server/src/services/validateLesson.js`.
16. Confirm validation checks learner levels, current stage, story status, IDs and scene references.
17. Inspect `frontend/src/api/projects.js`.
18. Confirm frontend persistence goes through `/api/projects`.
19. Confirm frontend does not use `localStorage`, `sessionStorage` or direct filesystem persistence.
20. Inspect `frontend/src/App.jsx`.
21. Confirm New, Save, Open and Duplicate flows exist.
22. Confirm save/load/duplicate loading states and error states are visible.
23. Confirm unsaved changes are tracked for meaningful lesson changes.
24. Run backend tests if present.
25. Build frontend.
26. Start the app and manually exercise the full save/open/duplicate flow.
27. Search for accidental OpenAI, image generation, ZIP export, account/auth/cloud or Firebase scope.
28. Search for accidental production dependency on `prototype/support.js`.

## Acceptance Checklist

Mark each item Pass, Fail, or Not Applicable.

| Item | Result | Evidence |
| --- | --- | --- |
| `GET /api/health` still works |  |  |
| `GET /api/projects` exists |  |  |
| `POST /api/projects` exists |  |  |
| `GET /api/projects/:id` exists |  |  |
| `PUT /api/projects/:id` exists |  |  |
| `POST /api/projects/:id/duplicate` exists |  |  |
| Project routes return JSON on success |  |  |
| Project routes return JSON on errors |  |  |
| Project IDs are generated by backend |  |  |
| Project IDs are filename-safe |  |  |
| Path traversal IDs are rejected |  |  |
| Missing projects return `404` |  |  |
| Malformed IDs return `400` |  |  |
| Invalid lesson shape returns validation error |  |  |
| Local project data is stored under backend data directory |  |  |
| Each project stores complete `lesson.json` |  |  |
| Metadata exists for project listing |  |  |
| Writes are reasonably safe for local development |  |  |
| Loaded lessons are normalized |  |  |
| Unknown future fields are preserved where practical |  |  |
| Save validation exists |  |  |
| Load validation exists |  |  |
| Backend tests or focused verification exist |  |  |
| Frontend project API client exists |  |  |
| Frontend uses backend APIs for persistence |  |  |
| Frontend does not use `localStorage` for project persistence |  |  |
| Frontend does not use `sessionStorage` for project persistence |  |  |
| New Lesson UI flow works |  |  |
| Save UI flow works |  |  |
| Open Existing Lesson UI flow works |  |  |
| Duplicate Lesson UI flow works |  |  |
| Save status is visible |  |  |
| Load/open status is visible |  |  |
| Save/load errors are visible |  |  |
| Unsaved changes are not silently discarded by New/Open |  |  |
| Current stage is saved and restored |  |  |
| Setup fields are saved and restored |  |  |
| Story sentences are saved and restored |  |  |
| Story lock status is saved and restored |  |  |
| Story `lockedAt` is saved and restored |  |  |
| Story `modifiedAfterLock` is saved and restored |  |  |
| Character generation state is saved and restored |  |  |
| Character approval state is saved and restored |  |  |
| Character stale state is saved and restored |  |  |
| Scene generation state is saved and restored |  |  |
| Scene approval state is saved and restored |  |  |
| Scene stale state is saved and restored |  |  |
| Media filter is saved and restored |  |  |
| Export metadata placeholders are saved and restored |  |  |
| Duplicate receives a new ID |  |  |
| Duplicate does not mutate original |  |  |
| Existing Phase 1/2 stage interactions still work after loading |  |  |
| No OpenAI integration was added |  |  |
| No real image generation was added |  |  |
| No audio/video source generation was added |  |  |
| No ZIP export was added |  |  |
| No account/auth/cloud/Firebase flow was added |  |  |
| Production frontend does not import `prototype/support.js` |  |  |

## Manual App Flow To Verify

Run the app, then complete this path:

1. Create a new lesson.
2. Edit Theme and Lesson title.
3. Edit Setting and Scenario.
4. Edit main character fields.
5. Add a secondary character.
6. Navigate to Story.
7. Edit one story sentence.
8. Lock the story.
9. Navigate to Characters.
10. Generate and approve one character.
11. Navigate to Scenes.
12. Edit a scene location.
13. Generate and approve one scene.
14. Navigate to Media.
15. Switch filter to Scenes.
16. Save the lesson.
17. Refresh the browser.
18. Open the saved lesson.
19. Confirm all edited values and states are restored.
20. Duplicate the lesson.
21. Confirm duplicate has a different ID.
22. Edit and save the duplicate.
23. Reopen the original.
24. Confirm original was not mutated by duplicate edits.

## Data Persistence Checks

Inspect the saved JSON file.

Confirm `lesson.json` includes:

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

Confirm it also preserves:

- Story sentence IDs.
- Character IDs.
- Scene IDs.
- Scene `sentenceIds`.
- Scene `characterIds`.
- Character approval fields.
- Scene approval fields.
- Stale flags.
- Media filter.

Confirm it does not contain:

- Functions.
- DOM nodes.
- React component state objects.
- Temporary text-entry buffers.
- API keys.
- Absolute user-specific paths except the backend's own storage path if documented.

## Backend Safety Checks

Prioritize these risks:

- Project ID traversal through `/`, `\`, `..`, null bytes or encoded traversal.
- Accepting arbitrary frontend-provided filesystem paths.
- Writing outside the project data directory.
- Saving malformed objects that later crash the frontend.
- Returning HTML errors instead of JSON API errors.
- Duplicating into the same project ID.
- Mutating the source during duplicate.
- Dropping unknown fields during normalization.

## Frontend UX Checks

Verify:

- Project controls are quiet and consistent with the existing app shell.
- The six-stage workflow remains the primary experience.
- New/Open/Duplicate/Save controls do not create a dashboard-first app.
- Save status is understandable.
- Error messages are visible and actionable.
- Stopping the backend does not crash the frontend.
- A failed save leaves the current lesson visible.
- Opening a new lesson warns or handles unsaved changes appropriately.

## Scope-Control Review

Flag findings if Phase 3 adds:

- OpenAI SDK or OpenAI route.
- AI story generation.
- Character extraction.
- Scene planning API.
- Image generation route.
- Audio scripts or video prompts.
- Real ZIP export.
- PowerPoint or worksheet generation.
- Firebase.
- Hosted auth.
- User accounts.
- Cloud sync.

Placeholders or metadata for future image/export paths are acceptable if they do not perform real later-phase work.

## Code Review Focus

Prioritize findings in these areas:

- Persistence does not save the complete Phase 2 lesson object.
- Frontend and backend disagree on lesson shape.
- Current stage is not restored.
- Story lock state is lost on load.
- Character/scene approval state is lost on load.
- Media filter or stale flags are lost on load.
- Frontend uses browser storage instead of backend routes.
- Path traversal or unsafe ID handling.
- Duplicate mutates the source project.
- Project route errors are not JSON.
- Validation is missing or too weak to catch broken scene references.
- Phase 1/2 interactions regress after loading.
- Later-scope features accidentally added.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```md
# Phase 3 Review

## Findings

- [P0/P1/P2/P3] Title
  - File/path:
  - Evidence:
  - Why it matters:
  - Recommended fix:

## Acceptance Summary

- Backend routes:
- Local JSON storage:
- Validation/normalization:
- Frontend project flows:
- Save/open/duplicate restoration:
- Duplicate safety:
- Phase 1/2 behavior preserved:
- Scope control:

## Open Questions

- ...

## Verdict

Pass/Fail with a one-paragraph explanation.
```

If there are no findings, say so clearly and include any residual risks or checks that could not be performed, such as inability to run the browser workflow.

## Severity Guidance

- P0: Phase 3 cannot run or cannot be meaningfully reviewed, for example frontend/backend startup fails completely.
- P1: Major persistence requirement missing or broken, for example no project routes, saves do not restore complete state, path traversal is possible, or duplicate mutates source.
- P2: Important persistence, UX, validation or scope issue, for example weak validation, lost media filter, unclear save errors, or browser storage used for project persistence.
- P3: Minor clarity, naming, documentation or polish issue.

## Non-Goals For This Review

Do not fail Phase 3 because it lacks:

- Complete Setup validation.
- OpenAI story generation.
- Character extraction from locked story.
- Scene planning API.
- Real character images.
- Real scene images.
- Audio/video prompt generation.
- ZIP lesson source pack export.
- PowerPoint or worksheet generation.
- Accounts or cloud sync.

Those belong to later phases.
