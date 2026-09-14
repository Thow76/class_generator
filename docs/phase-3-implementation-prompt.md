# Phase 3 Implementation Prompt

Use this prompt to implement Milestone 1, Phase 3 of Lesson Source Builder.

## Prompt

You are implementing Milestone 1, Phase 3 of Lesson Source Builder.

Phase 0 froze the approved prototype. Phase 1 built the real React/Vite and Node/Express app shell. Phase 2 refactored the frontend so one normalized, serializable lesson object is the source of truth. Phase 3 must now persist that exact lesson object locally through backend project APIs, while preserving the existing six-stage workflow and UI behavior.

Implement Phase 3 only. Do not add OpenAI integration, real image generation, audio/video source generation, ZIP export, accounts, cloud sync, Firebase, PowerPoint generation or worksheet generation.

## Phase 3 Goal

Make the Phase 2 lesson object persistent.

Done means:

- A user can create a fresh lesson.
- A user can save the current lesson locally through the backend.
- A user can list and open saved lessons.
- A user can duplicate an existing lesson without mutating the original.
- Reopening a lesson restores the same visible UI state.
- The backend stores complete lesson objects as JSON files.
- The frontend never writes project persistence directly through `localStorage`, `sessionStorage` or filesystem APIs.
- Existing Phase 1 and Phase 2 interactions still work after loading a saved project.

## Phase 3 Scope

Build:

- Backend project persistence service.
- Backend project routes.
- Local JSON project storage.
- Project metadata list endpoint.
- Lesson normalization for loaded records.
- Save/load validation using existing `validateLessonShape` logic or a backend-safe equivalent.
- Frontend project API client.
- New Lesson flow.
- Open Existing Lesson flow.
- Duplicate Lesson flow.
- Manual Save action.
- Auto-save if simple and reliable, but manual save is the minimum.
- Visible save/load status.
- Visible save/load error states.
- README or docs update with persistence behavior and local data location.

Do not build:

- OpenAI story generation.
- Character extraction.
- Scene planning.
- Real character image generation.
- Real scene image generation.
- Audio scripts.
- Video prompts.
- ZIP lesson source pack export.
- Firebase.
- Hosted auth.
- User accounts.
- Cloud sync.
- Any broad redesign of the Phase 1/2 workflow.

## Starting Point

Important Phase 2 files:

```text
frontend/src/data/lessonSchema.js
frontend/src/data/createLesson.js
frontend/src/data/demoLesson.js
frontend/src/data/constants.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/validateLessonShape.js
frontend/src/App.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/CharactersStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/stages/ExportStage.jsx
server/src/index.js
server/src/routes/health.js
docs/phase-2-data-model.md
docs/phase-3-handoff.md
```

The Phase 2 lesson object is serializable with `JSON.stringify`. Phase 3 should save and load this object without adding hidden state reconstruction.

## Data Contract

Persist the complete Phase 2 lesson object.

At minimum, persisted lessons must include:

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

Save and load enough data that reopening a lesson restores:

- Current stage.
- Setup field values.
- Story sentences.
- Story draft/locked status.
- Story `lockedAt`.
- Story `modifiedAfterLock`.
- Character field values.
- Character generation status.
- Character approval state.
- Character stale state.
- Scene locations and descriptions.
- Scene sentence references.
- Scene character references.
- Scene image mode/reuse metadata.
- Scene generation status.
- Scene approval state.
- Scene stale state.
- Media filter.
- Export metadata placeholders.

Temporary UI input buffers do not need to persist, including:

- The current text in "add secondary character".
- The current text in "add background".
- The current text in "add note".
- Modal open/closed state.
- Transient loading spinners.

## Local Storage Format

Use backend filesystem storage only.

Recommended structure:

```text
server/
  data/
    projects/
      lesson-20260905-abc123/
        lesson.json
        meta.json
```

Alternative acceptable structure:

```text
server/
  data/
    projects/
      lesson-20260905-abc123.json
```

Prefer the folder-per-project structure because later phases will need image and export subfolders.

Project IDs:

- Must be stable after creation.
- Must be filename-safe.
- Must not be derived solely from lesson title.
- Should not allow path traversal.
- Can use `crypto.randomUUID()`, a timestamp plus random suffix, or another stable local ID generator.

Suggested project folder shape:

```text
server/data/projects/
  lesson-<timestamp>-<short-random>/
    lesson.json
    meta.json
    images/
      characters/
      scenes/
    exports/
```

For Phase 3, only `lesson.json` and optionally `meta.json` need meaningful content. Empty image/export folders may be created as future placeholders.

## Backend Implementation

## Step 1: Add Project Store Service

Create:

```text
server/src/services/projectStore.js
```

Responsibilities:

- Resolve the local project data directory.
- Ensure `server/data/projects/` exists.
- Generate safe project IDs.
- Validate project IDs before reading/writing.
- Create a project folder.
- Write `lesson.json` atomically enough for local development.
- Read `lesson.json`.
- List projects with metadata.
- Duplicate a project.
- Return clear errors for missing or malformed projects.

Recommended service functions:

```js
export async function listProjects()
export async function createProject(initialLesson)
export async function getProject(projectId)
export async function updateProject(projectId, lesson)
export async function duplicateProject(projectId)
export function isSafeProjectId(projectId)
```

If using CommonJS instead of ES modules, keep equivalent exports consistent with the existing server style.

Acceptance:

- Store service can create, read, update, list and duplicate projects.
- Store service rejects path traversal IDs such as `../x`.
- Store service does not overwrite another project during duplicate.
- Store service preserves unknown lesson fields where practical.

## Step 2: Add Backend Lesson Normalization

Create a backend-safe normalizer, for example:

```text
server/src/services/normalizeLesson.js
```

Purpose:

- Merge loaded lessons with the current default shape.
- Fill missing optional fields.
- Preserve unknown future fields.
- Ensure required top-level sections exist.
- Ensure `id` matches the project ID when saving or loading, unless there is a documented reason not to.

Options:

- Duplicate the minimal default lesson shape server-side.
- Share schema-like constants manually.
- Keep the backend normalizer intentionally small and conservative.

Do not import frontend code directly into the backend unless the project is explicitly configured for safe shared modules. A simple duplicated default shape is acceptable for Phase 3.

Acceptance:

- Older or partial local files do not crash the app.
- Unknown fields are not silently discarded.
- Required arrays default to arrays.
- Required objects default to objects.

## Step 3: Add Backend Validation

Create backend validation for saved/loaded lessons, for example:

```text
server/src/services/validateLesson.js
```

Minimum checks:

- Lesson is an object.
- `id` is present.
- `currentStage` is one of `setup`, `story`, `characters`, `scenes`, `media`, `export`.
- `learnerLevel` is one of the approved values.
- `story.status` is `draft` or `locked`.
- `story.sentences` is an array.
- Every sentence has a safe stable `id`.
- Every character has a safe stable `id`.
- Every scene has a safe stable `id`.
- Every `scene.sentenceIds` entry references an existing story sentence.
- Every `scene.characterIds` entry references an existing character, if character IDs are present.

Validation should return structured errors, not just throw generic exceptions.

Acceptance:

- Malformed save requests return `400`.
- Missing projects return `404`.
- Unexpected server errors return `500`.
- Validation errors are visible enough for frontend error messaging and debugging.

## Step 4: Add Project Routes

Create:

```text
server/src/routes/projects.js
```

Mount it in:

```text
server/src/index.js
```

Suggested API:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
POST   /api/projects/:id/duplicate
```

### `GET /api/projects`

Returns saved project metadata.

Suggested response:

```json
{
  "projects": [
    {
      "id": "lesson-20260905-abc123",
      "title": "At the Doctor's Surgery",
      "theme": "Everyday health and services",
      "learnerLevel": "Literacies Plus",
      "currentStage": "story",
      "updatedAt": "2026-09-05T12:00:00.000Z"
    }
  ]
}
```

### `POST /api/projects`

Creates a fresh project.

Request options:

- Empty body: server creates a default empty lesson.
- Body containing partial lesson overrides: server merges with default lesson.

Suggested response:

```json
{
  "project": {
    "id": "lesson-20260905-abc123",
    "lesson": {}
  }
}
```

### `GET /api/projects/:id`

Returns a complete lesson object.

Suggested response:

```json
{
  "lesson": {}
}
```

### `PUT /api/projects/:id`

Saves the complete lesson object.

Suggested request:

```json
{
  "lesson": {}
}
```

Suggested response:

```json
{
  "lesson": {},
  "savedAt": "2026-09-05T12:00:00.000Z"
}
```

### `POST /api/projects/:id/duplicate`

Creates a new project from an existing project.

Duplicate behavior:

- Assign a new project ID.
- Assign the new ID to the duplicated lesson object.
- Preserve user-authored setup, story, characters, scenes and reusable values.
- Preserve current stage unless that creates confusing UX; if reset to Setup, document the decision.
- Do not mutate the original project.
- Clear or preserve generated/approved dummy state according to Phase 3 handoff. If unsure, preserve all visible state for Phase 3 because the goal is a faithful duplicate.

Suggested response:

```json
{
  "lesson": {},
  "sourceProjectId": "lesson-20260905-abc123"
}
```

Acceptance:

- All routes return JSON.
- All route errors return JSON.
- Health route still works.
- Project routes are backend-only and do not require OpenAI or external services.

## Step 5: Add Backend Tests Or Focused Verification

If a test runner already exists, add focused tests for:

- Safe project ID validation.
- Create project.
- List projects.
- Read project.
- Update project.
- Duplicate project.
- Missing project returns not found.
- Malformed ID is rejected.
- Invalid lesson shape is rejected.
- Duplicate does not mutate original.

If no test runner exists, add a small backend script or document manual `curl` checks. Prefer adding a lightweight test runner only if it does not balloon scope.

Acceptance:

- Project-store behavior is covered by tests or focused manual verification.
- The verification path is documented.

## Frontend Implementation

## Step 6: Add Project API Client

Create:

```text
frontend/src/api/projects.js
```

Suggested functions:

```js
export async function listProjects()
export async function createProject(initialLesson)
export async function getProject(projectId)
export async function saveProject(projectId, lesson)
export async function duplicateProject(projectId)
```

Client rules:

- Use `fetch`.
- Call `/api/projects`.
- Throw useful errors when responses are not OK.
- Parse validation errors and expose readable messages.
- Do not use `localStorage` or `sessionStorage` for project persistence.

Acceptance:

- Frontend API client covers all backend project routes.
- Error handling is centralized enough that components do not repeat low-level fetch parsing everywhere.

## Step 7: Add Project UI State

Keep `App.jsx` as the lesson owner unless it becomes too large.

Add state for:

```text
lesson
projectList
projectStatus
saveStatus
loadStatus
projectError
isOpenProjectPanelVisible
```

Suggested save statuses:

```text
unsaved
saving
saved
error
```

Suggested load statuses:

```text
idle
loading
loaded
error
```

When loaded lesson changes through user action:

- Mark save status as `unsaved`.
- Do not mark unsaved for transient UI buffers such as current note input.

Acceptance:

- Save state reflects meaningful project changes.
- Loading and saving errors are visible.
- Temporary input buffers are not persisted or treated as project changes.

## Step 8: Add Project Controls To The UI

Add quiet project controls that fit the existing left-navigation workflow.

Recommended placement:

- Sidebar top or footer.
- Compact toolbar above stage content.
- Small project menu.

Controls:

- New Lesson.
- Open Lesson.
- Duplicate Lesson.
- Save.

Avoid:

- A marketing-style dashboard.
- Replacing the workflow with a project browser as the first screen.
- Large decorative cards.

Acceptance:

- User can access New/Open/Duplicate/Save without disrupting the six-stage workflow.
- Controls are visually consistent with existing buttons.
- Controls do not cause layout overlap at desktop widths.

## Step 9: Implement New Lesson Flow

Behavior:

1. User clicks New Lesson.
2. Frontend calls `POST /api/projects`.
3. Backend creates a fresh lesson object and project folder.
4. Frontend receives the new lesson.
5. Frontend replaces current `lesson` state with the new lesson.
6. App navigates to `lesson.currentStage`, normally `setup`.
7. Save status becomes `saved`.

Prompting:

- If the current lesson has unsaved changes, warn before replacing it.
- Keep the warning concise.

Acceptance:

- New lesson gets a stable ID.
- New lesson starts with empty/default setup data.
- New lesson renders without crashing.
- Existing unsaved work is not silently discarded.

## Step 10: Implement Manual Save

Behavior:

1. User clicks Save.
2. Frontend validates the lesson shape if a frontend validator exists.
3. Frontend calls `PUT /api/projects/:id` with the full lesson object.
4. Backend validates and normalizes the lesson.
5. Backend writes `lesson.json`.
6. Frontend updates save status to `saved`.
7. Frontend shows a useful error if save fails.

Acceptance:

- Saving writes the complete lesson object.
- Saving preserves current stage.
- Saving preserves story lock state.
- Saving preserves character and scene approval states.
- Save errors are visible.

## Step 11: Implement Open Existing Lesson Flow

Behavior:

1. User clicks Open Lesson.
2. Frontend calls `GET /api/projects`.
3. UI displays available projects.
4. User selects a project.
5. Frontend calls `GET /api/projects/:id`.
6. Frontend normalizes/validates the loaded lesson if needed.
7. Frontend replaces current `lesson` state.
8. App restores `lesson.currentStage`.

Project list should show:

- Title.
- Theme.
- Learner level.
- Current stage.
- Last updated timestamp.

Prompting:

- If the current lesson has unsaved changes, warn before opening another lesson.

Acceptance:

- Saved lessons can be listed.
- A selected lesson can be opened.
- Loaded UI state matches the saved lesson.
- Missing/corrupt project errors are visible.

## Step 12: Implement Duplicate Lesson Flow

Behavior:

1. User clicks Duplicate Lesson.
2. If duplicating current lesson, save or warn if unsaved changes exist.
3. Frontend calls `POST /api/projects/:id/duplicate`.
4. Backend reads the source lesson.
5. Backend creates a new project ID.
6. Backend writes a new lesson object with the new ID.
7. Frontend loads the duplicate as the current lesson.

Duplicate behavior for Phase 3:

- Must not mutate the original.
- Must assign a new stable ID.
- Should preserve the current visible state unless the implementation explicitly documents reset behavior.
- Should preserve dummy generated/approved states if the goal is "duplicate this project exactly."
- If the implementation chooses to clear dummy generation/approval state, it must do so consistently and document the rule.

Acceptance:

- Duplicate has a different ID.
- Original remains unchanged.
- Duplicate opens successfully.
- Project list shows both original and duplicate.

## Step 13: Optional Auto-Save

Manual save is the minimum requirement.

If auto-save is added:

- Debounce saves.
- Save only meaningful lesson object changes.
- Show saving/saved/error state.
- Avoid racing saves when opening or creating projects.
- Avoid saving transient UI buffers.
- Do not auto-save while validation is failing.

Acceptance:

- Auto-save does not overwrite newly opened lessons with stale previous state.
- Auto-save failures are visible.
- Manual save remains available.

## Step 14: Preserve Existing Workflow Behavior

After persistence is added, verify existing behavior:

- Setup fields edit.
- Secondary characters add/remove.
- Story sentence editing works.
- Story lock/unlock works.
- Dummy regenerate/shorten still works.
- Character background reuse works.
- Character notes work.
- Dummy character generate/approve works.
- Scene location edits work.
- Dummy scene generate/approve works.
- Media filters work.
- Export summary reflects the loaded lesson.

Acceptance:

- Loading a saved project does not break any stage.
- Saved state remains consistent after interacting with all six stages.

## Step 15: Update Documentation

Update docs minimally:

- Add or update Phase 3 data/persistence documentation.
- Document where local projects are stored.
- Document project route API.
- Document save/open/duplicate behavior.
- Document that Phase 3 remains local-only and does not include OpenAI or export.
- Update README with startup and basic persistence usage if needed.

Recommended file:

```text
docs/phase-3-persistence.md
```

Acceptance:

- A future implementer can understand the local storage format.
- A reviewer can find the route contract.
- The Phase 4 implementer can build Setup validation without reverse-engineering persistence.

## Backend Safety Requirements

Project ID handling:

- Reject IDs containing `/`, `\`, `..`, null bytes or URL-encoded traversal.
- Only read/write inside the configured project data directory.
- Do not accept arbitrary filesystem paths from the frontend.

Write behavior:

- Use pretty JSON for reviewability.
- Consider write-to-temp-then-rename for safer local writes.
- Include `updatedAt` either in metadata or derived from file stats.

Error responses:

- Return JSON consistently.
- Use appropriate status codes:
  - `400` for malformed request or invalid ID.
  - `404` for missing project.
  - `422` for invalid lesson shape, if using semantic validation.
  - `500` for unexpected server errors.

## Frontend UX Requirements

Save/open UI should be quiet and work-focused.

Required states:

- No project loaded or default project loaded.
- Unsaved changes.
- Saving.
- Saved.
- Save error.
- Loading project list.
- Opening project.
- Open error.
- Duplicate in progress.
- Duplicate error.

Warnings:

- Warn before New Lesson if current lesson has unsaved changes.
- Warn before Open Lesson if current lesson has unsaved changes.
- Warn before Duplicate only if duplication would ignore unsaved changes.

Do not use browser alert boxes if the existing app has a styled confirmation pattern that can be reused.

## Validation And Migration Requirements

Before saving:

- Validate current lesson shape.
- Ensure learner level is allowed.
- Ensure current stage is allowed.
- Ensure story status is `draft` or `locked`.
- Ensure scene sentence references are valid.

After loading:

- Normalize missing optional fields.
- Preserve unknown future fields.
- Validate the normalized shape.
- Show an error if the lesson is too malformed to safely load.

Do not silently discard unknown fields, because later phases may add more data.

## Manual QA Checklist

### Startup

- `npm run dev` starts frontend and backend.
- Frontend renders.
- `GET /api/health` returns JSON.
- `GET /api/projects` returns JSON.

### New Lesson

- New Lesson creates a backend project.
- New lesson has a unique ID.
- New lesson starts at Setup.
- Empty/default lesson renders without crashing.

### Save

- Edit Theme.
- Edit Lesson title.
- Edit Setup main character fields.
- Add a secondary character.
- Edit a story sentence.
- Lock the story.
- Generate and approve one character.
- Generate and approve one scene.
- Switch Media filter to Scenes.
- Save.
- Confirm save status changes to saved.
- Confirm `lesson.json` exists under backend project storage.

### Open

- Refresh the browser.
- Open the saved lesson.
- Confirm current stage is restored.
- Confirm setup edits are restored.
- Confirm story edits are restored.
- Confirm story locked state is restored.
- Confirm character approval is restored.
- Confirm scene approval is restored.
- Confirm Media filter is restored.
- Confirm Export summary matches restored state.

### Duplicate

- Duplicate the saved lesson.
- Confirm duplicate has a new ID.
- Confirm original still exists.
- Confirm duplicate opens.
- Edit duplicate.
- Save duplicate.
- Reopen original.
- Confirm original was not mutated by duplicate edits.

### Errors

- Request a missing project ID and confirm `404`.
- Request a malformed project ID and confirm `400`.
- Try saving a malformed lesson, if practical, and confirm validation error.
- Stop backend and confirm frontend shows save/load failure rather than crashing.

### Scope

- Confirm no OpenAI integration was added.
- Confirm no image generation route was added.
- Confirm no ZIP export was added.
- Confirm no account/auth/cloud/Firebase flow was added.
- Confirm frontend does not use `localStorage` or `sessionStorage` for persistence.
- Confirm frontend does not import `prototype/support.js`.

## Verification Commands

Run available commands:

```sh
npm run build --workspace frontend
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "OpenAI|openai|zip|firebase|auth|login|account|ElevenLabs|PowerPoint|worksheet" frontend server package.json
rg "localStorage|sessionStorage" frontend/src
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
find server/data/projects -maxdepth 3 -type f -name "lesson.json" -print
```

If route or service tests are added, run the relevant test command and include it in the final implementation summary.

## Suggested Curl Checks

After starting the backend:

```sh
curl -s http://127.0.0.1:3001/api/projects
```

Create a project:

```sh
curl -s -X POST http://127.0.0.1:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{}'
```

Open a project:

```sh
curl -s http://127.0.0.1:3001/api/projects/<PROJECT_ID>
```

Save a project:

```sh
curl -s -X PUT http://127.0.0.1:3001/api/projects/<PROJECT_ID> \
  -H "Content-Type: application/json" \
  -d '{"lesson":{}}'
```

Duplicate a project:

```sh
curl -s -X POST http://127.0.0.1:3001/api/projects/<PROJECT_ID>/duplicate
```

Replace `<PROJECT_ID>` and the save payload with a valid lesson object for real checks.

## Phase 3 Done Criteria

Phase 3 is complete when:

- Backend project routes exist and work.
- Local project JSON storage exists.
- New Lesson works.
- Manual Save works.
- Open Existing Lesson works.
- Duplicate Lesson works.
- Reopened lessons restore the same visible UI state.
- Project IDs are stable and safe.
- Duplicates receive new IDs and do not mutate originals.
- Save/load validation exists.
- Frontend handles save/load errors visibly.
- Existing Phase 1/2 interactions still work after opening saved projects.
- No future-scope AI, media generation, cloud/account or ZIP export features were added.

## Handoff To Phase 4

Phase 4 will make Setup fully functional and validated.

Before handing off, ensure:

- Setup fields are persisted exactly where Phase 2 defined them.
- Missing fields can be validated without changing persistence.
- Save/open/duplicate does not hide Setup validation needs.
- The current loaded lesson object remains serializable.
- Project APIs can save any valid lesson object produced by Phase 4.

## Implementation Response Format

When implementation is complete, respond with:

```md
## Summary

- ...

## Changed Files

- ...

## Verification

- ...

## Persistence Notes

- ...

## Notes For Phase 4

- ...
```

Mention any tests or manual checks that could not be completed.
