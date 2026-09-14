# Phase 8 Implementation Prompt

Use this prompt to implement Milestone 3, Phase 8 of Lesson Source Builder.

## Prompt

You are implementing Milestone 3, Phase 8 of Lesson Source Builder.

Phase 7 created editable character records from the locked master story and Setup data. Phase 8 should turn those approved character records into persistent visual reference images. The approved character reference image becomes the primary visual continuity reference for later scene image generation.

Implement Phase 8 only. Do not add scene planning, scene image generation, audio/video outputs, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable cross-project character libraries or external video/audio platform integrations.

## Phase 8 Goal

Generate, review, regenerate and approve stable character reference images for recurring characters.

Done means:

- Character records from Phase 7 can request backend image generation.
- Image generation requires a saved lesson, a locked story and a valid character record.
- The backend creates an internal image prompt from lesson context and the character's lightweight fields.
- The backend calls the image model with the API key on the server only.
- Generated image files are saved inside the local project folder.
- The character record stores the generated image path and metadata.
- The Characters stage displays the generated image.
- Regenerate replaces or supersedes the previous generated image without losing character text fields.
- Use This Character / Approve marks the selected image as the approved continuity reference.
- Approved image state persists after save/open/duplicate.
- Characters required for downstream scenes can be checked for approval.
- No scene planning or scene image generation is introduced.

## Starting Point

Important existing files:

```text
docs/phase-7-character-extraction.md
docs/phase-7-implementation-prompt.md
frontend/src/App.jsx
frontend/src/api/characters.js
frontend/src/stages/CharactersStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/src/data/constants.js
server/src/index.js
server/src/routes/characters.js
server/src/services/characterExtractionService.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/openaiClient.js
server/src/prompts/characterPrompts.js
server/src/schemas/characterSchemas.js
server/test/characterExtraction.test.js
frontend/test/
```

Recommended new or updated files:

```text
frontend/src/api/images.js
server/src/routes/images.js
server/src/services/characterImageService.js
server/src/prompts/characterImagePrompts.js
server/src/services/imageStorage.js
server/test/characterImage.test.js
frontend/test/characterImages.test.js
docs/phase-8-character-reference-images.md
```

Use these names unless the repo already has a stronger convention.

## Product Rules To Preserve

- Use only the internal learner levels:
  - Literacies Plus
  - Complete Beginner
  - Beginner 1
  - Beginner 1.5
  - Beginner 2
- Do not introduce CEFR labels such as A1, A2 or B1 in UI, prompts, docs or generated user-facing metadata.
- Character input remains lightweight:
  - Name
  - Age / age range
  - Sex / gender
  - Background / nationality
  - Notes tags
- Do not add dedicated visible character fields for hair, clothing, build, personality, expression, pose or visual style.
- Use the principle: minimum required input -> sensible AI defaults -> optional user overrides.
- The approved character image is the continuity reference for later scenes.
- Keep OpenAI calls and API keys backend-only.
- Save generated image files inside each local project folder.
- Keep IDs and filenames stable enough to trace images back to project and character records.
- Do not silently delete user work. If replacing image state, retain enough metadata to audit the current approved/generated image.

## Backend API

Add image routes without disturbing health, project, story or character extraction routes.

Recommended endpoint:

```text
POST /api/images/character
```

Expected request:

```json
{
  "lessonId": "lesson-20260909-example",
  "characterId": "character-marta"
}
```

Expected success response:

```json
{
  "lesson": {
    "id": "lesson-20260909-example",
    "characters": []
  },
  "image": {
    "characterId": "character-marta",
    "imagePath": "/api/projects/lesson-20260909-example/assets/images/characters/character-marta-20260909T120000.png"
  }
}
```

Return the full updated lesson object to match existing operation routes. The exact asset URL can differ, but it must be safe to render in the frontend without exposing absolute private filesystem paths.

Optional approval endpoint:

```text
POST /api/images/character/approve
```

Approval may also remain a normal project update if the existing frontend helper safely persists `character.approved`. Prefer a backend approval route if it helps prevent approving missing or stale image files.

Expected error behavior:

- `400` for missing or malformed `lessonId` or `characterId`.
- `404` for missing project.
- `404` for missing character.
- `422` when the story is not locked.
- `422` when the character has no name.
- `422` when the character is stale and should be reviewed before image generation.
- `422` when character extraction has not produced any character records.
- `503` for missing API key or image provider failures.
- `500` only for unexpected server errors.

All errors should be JSON and should avoid exposing secrets, raw provider internals or private filesystem paths.

## Backend Steps

### Step 1: Extend OpenAI Client Configuration

Update `server/src/services/openaiClient.js` or a nearby backend-only module.

Add:

```text
OPENAI_IMAGE_MODEL
```

Recommended default:

```text
gpt-image-1
```

Keep `OPENAI_API_KEY` backend-only. If the existing OpenAI SDK image API differs by installed SDK version, use the current official SDK method available in this project and cover it with mocked tests.

Update `.env.example` with:

```text
OPENAI_IMAGE_MODEL=
```

### Step 2: Add Character Image Prompt Builder

Create `server/src/prompts/characterImagePrompts.js`.

The prompt should build one internal image instruction from:

- Lesson title.
- Theme.
- Setting.
- Scenario.
- Learner level only if useful for tone, without CEFR labels.
- Locked master story summary or exact relevant sentences.
- Character name.
- Character role.
- Age / age range.
- Sex / gender.
- Background / nationality.
- Notes tags.
- Project-wide visual style.

Prompt rules:

- Produce a clear, friendly ESOL lesson character reference image.
- Make a single recurring human character the subject.
- Use a consistent project-wide style suitable for all later scene images.
- Avoid text, captions, watermarks, UI, logos and speech bubbles in the image.
- Avoid adding extra named characters.
- Avoid inventing precise traits from missing fields.
- Respect the lightweight character fields and notes.
- Do not expose prompt text directly in the frontend unless useful for debugging.

Recommended exports:

```js
export const characterImagePromptVersion = "character-image-v1";
export function buildCharacterImagePrompt(lesson, character) {}
```

### Step 3: Save Images In Project Storage

Create `server/src/services/imageStorage.js` or extend `projectStore` carefully.

Requirements:

- Save character images under:

```text
server/data/projects/<projectId>/images/characters/
```

- Use safe filenames based on project ID, character ID and timestamp or generation count.
- Do not use lesson title or character name directly as unsafe paths.
- Decode base64 image data or persist binary response data using Node filesystem APIs on the backend.
- Write files atomically where practical.
- Return a frontend-safe asset URL or project-relative path.
- Never return raw absolute filesystem paths to the browser if avoidable.
- Validate file extensions and content type.
- Reject path traversal and malformed IDs.

Recommended image path stored in the lesson:

```text
images/characters/character-marta-20260909T120000.png
```

Recommended frontend URL:

```text
/api/projects/<projectId>/assets/images/characters/character-marta-20260909T120000.png
```

If using relative paths in `character.imagePath`, add a helper that converts them to display URLs.

### Step 4: Serve Project Image Assets Safely

Add a safe backend route for local project assets if one does not exist.

Recommended endpoint:

```text
GET /api/projects/:id/assets/*path
```

Requirements:

- Validate project ID with existing safe project ID rules.
- Restrict served paths to the project directory.
- Restrict assets to known folders such as `images/characters` and `images/scenes`.
- Set a safe content type.
- Return `404` for missing files.
- Return `400` for malformed paths.
- Do not serve `lesson.json`, `meta.json`, `.env` or arbitrary server files.

If static asset serving already exists, reuse it and add tests for traversal safety.

### Step 5: Implement Character Image Service

Create `server/src/services/characterImageService.js`.

The service should:

1. Validate `lessonId` and `characterId`.
2. Load the canonical lesson with `getProject(lessonId)`.
3. Validate lesson shape.
4. Require `story.status === "locked"`.
5. Require a valid `story.lockedSentences` snapshot.
6. Find the character by stable ID.
7. Require a non-empty character name.
8. Reject stale characters unless the product explicitly allows regeneration from stale records with warning metadata.
9. Build the internal image prompt.
10. Call the image model through the backend OpenAI client.
11. Validate that the response contains usable image data.
12. Save the image file into the project folder.
13. Update only the target character record:
    - `imagePath`
    - `generationStatus: "generated"`
    - `generationCount + 1`
    - `approved: false`
    - `stale: false`
    - image metadata such as model, prompt version, generatedAt and file name if supported
14. Preserve character text fields, notes and ID.
15. Preserve unrelated character records exactly.
16. Save through `updateProject`.
17. Return the updated full lesson and image metadata.

Recommended metadata:

```json
{
  "imageMeta": {
    "model": "gpt-image-1",
    "promptVersion": "character-image-v1",
    "generatedAt": "2026-09-09T12:00:00.000Z",
    "sourceStoryLockedAt": "2026-09-09T11:55:00.000Z"
  }
}
```

Attach metadata to the character record as `imageMeta` or use an established project metadata shape. Keep it serializable.

### Step 6: Approval Behavior

Existing Phase 1/7 `Use this character` may already set `generationStatus: "approved"` and `approved: true`.

For Phase 8, approval should mean:

- There is a generated image file for the character.
- `character.imagePath` points to that file.
- `character.approved === true`.
- `character.generationStatus === "approved"`.
- The approved image is the visual continuity source for Phase 9/10.

If approval stays frontend-only:

- Ensure it cannot approve a character with no generated image.
- Ensure it persists through the existing project save flow.

If adding backend approval:

- Validate project and character IDs.
- Verify the image path exists inside the project folder.
- Update only that character.
- Preserve unrelated records.
- Return the full updated lesson.

## Frontend Steps

### Step 1: Add Image API Client

Create `frontend/src/api/images.js`.

Recommended functions:

```js
export async function generateCharacterImage(lessonId, characterId) {}
export async function approveCharacterImage(lessonId, characterId) {}
```

If approval remains local, omit `approveCharacterImage`.

Follow existing API error parsing style. Do not import OpenAI in frontend code.

### Step 2: Wire Character Generation To Backend

Update `frontend/src/App.jsx`.

Replace the local placeholder `onGenerateCharacter` behavior with backend image generation.

Expected flow:

1. User clicks Generate Character or Regenerate.
2. Frontend saves current lesson if needed.
3. Frontend calls `POST /api/images/character`.
4. While request is in flight, disable that character's image actions.
5. Prefer disabling all character text edits and project switching during the in-flight image request to avoid full-lesson response races.
6. Backend returns updated lesson.
7. Frontend normalizes and validates returned lesson.
8. Character card displays the generated image.
9. Save status reflects backend-saved state.

Track per-character image operation state:

```js
{
  [characterId]: {
    status: "loading" | "error",
    error: ""
  }
}
```

Use operation tokens or active project ID checks so stale responses cannot switch the UI back to an older project if the user somehow changes projects while a request is in flight.

### Step 3: Display Generated Images

Update `frontend/src/stages/CharactersStage.jsx`.

Character cards should:

- Show a generated image when `character.imagePath` exists.
- Fall back to the existing placeholder when no image exists.
- Show per-card loading state during generation.
- Show per-card error state without clearing the current image.
- Show generated/approved badge state clearly.
- Use Regenerate label when an image already exists.
- Disable Use This Character until a generated image exists.
- Avoid layout jumps when image loads or fails.

Do not add new character data fields for visual details. Notes tags remain the only tutor-adjustable image guidance field in this phase.

### Step 4: Preserve Character Editing

Character card editing should still work:

- Name.
- Age / age range.
- Sex / gender.
- Background / nationality.
- Notes tags.
- Reusable backgrounds.

When a tutor edits fields or notes after an image is generated:

- Mark the character stale or mark the approved/generated image as needing review.
- Do not silently keep an approved image marked valid if the character identity fields changed.
- Do not delete the existing image file or path automatically.
- Regenerate should clear approval and produce a new generated image.

Suggested stale reason:

```text
Character details changed after image generation.
```

### Step 5: Continue-To-Scenes Readiness

Phase 8 should support checking whether required characters are approved, but it should not implement scene planning.

Add selector/helper if useful:

```js
export function areRequiredCharactersApproved(lesson) {}
```

Expected:

- Returns true only when every non-stale recurring character that is required for downstream scenes has `approved === true` and an `imagePath`.
- Existing stale characters should block readiness until reviewed/regenerated/approved.
- The Scenes stage may show a quiet prerequisite message, but do not build scene planning in this phase.

Do not add `POST /api/scenes/plan` in Phase 8.

## Data Model Updates

Preserve the existing character record shape and add only image metadata needed for persistence and audit.

Recommended shape:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "role": "main",
  "age": "34",
  "sex": "Woman",
  "background": "Polish",
  "notes": ["clear face"],
  "generationStatus": "generated",
  "generationCount": 1,
  "imagePath": "images/characters/character-marta-20260909T120000.png",
  "approved": false,
  "stale": false,
  "imageMeta": {
    "model": "gpt-image-1",
    "promptVersion": "character-image-v1",
    "generatedAt": "2026-09-09T12:00:00.000Z",
    "sourceStoryLockedAt": "2026-09-09T11:55:00.000Z"
  }
}
```

Validation should ensure:

- `imagePath` is either `null` or a safe project-relative asset path.
- Approved characters must have an `imagePath`.
- `generationStatus: "generated"` should have an `imagePath`.
- `generationStatus: "approved"` should have `approved: true` and an `imagePath`.
- `imageMeta`, if present, is serializable and bounded.
- Unknown future fields are not silently discarded.

Migration should preserve old placeholder records. If an existing project has `generationStatus: "generated"` but no image path from earlier placeholder phases, do not crash the app; normalize or mark the record as needing generation according to the least surprising behavior.

## Tests

### Backend Tests

Add focused tests in:

```text
server/test/characterImage.test.js
```

Cover:

- Missing `lessonId` is rejected.
- Missing `characterId` is rejected.
- Missing project returns a typed error.
- Missing character returns a typed error.
- Draft/unlocked story is rejected.
- Empty or invalid locked snapshot is rejected.
- Character with empty name is rejected.
- Stale character image generation is rejected or explicitly handled.
- Image prompt includes character fields and locked story context.
- Image prompt does not include CEFR labels.
- Mocked image response saves a file under the project character image folder.
- Stored image path is project-relative or frontend-safe.
- Generated image updates only the target character.
- Generated image preserves text fields and notes.
- Generated image increments `generationCount`.
- Regeneration clears `approved`.
- Invalid image response does not mutate the saved project.
- Image provider failure does not mutate the saved project.
- Asset serving rejects path traversal.
- Asset serving does not expose `lesson.json`, `meta.json`, `.env` or arbitrary files.

Use mocked OpenAI image responses. Do not require live image generation for automated tests.

### Frontend Tests

If frontend tests exist, add coverage in `frontend/test/characterImages.test.js` or equivalent.

Cover:

- Generate Character calls backend image API.
- Per-character loading state appears.
- Per-character errors do not clear existing images.
- Generated image is rendered when `imagePath` exists.
- Use This Character is disabled until an image exists.
- Approval requires image path.
- Character edits after image generation mark the image/character stale.
- Project controls are disabled during image generation.
- Stale image-generation responses are ignored if active project changed.

If frontend tests are not practical, document manual browser checks.

## Manual QA Checklist

1. Start the app.
2. Confirm `GET /api/health` returns JSON.
3. Open or create a lesson.
4. Complete Setup.
5. Generate or write a story.
6. Lock the story.
7. Extract characters.
8. Confirm at least one character card exists.
9. Click Generate Character for one character.
10. Confirm loading state appears.
11. Confirm a generated image appears in the character card.
12. Confirm `lesson.json` stores a project-relative image path.
13. Confirm the image file exists under `server/data/projects/<projectId>/images/characters/`.
14. Refresh and reopen the project.
15. Confirm the image still displays.
16. Click Use This Character.
17. Save, refresh and reopen.
18. Confirm approval persists.
19. Edit a character detail or note.
20. Confirm the character becomes stale or needs review.
21. Regenerate the character.
22. Confirm approval clears until Use This Character is clicked again.
23. Confirm another character card is not changed by this generation.
24. Confirm no scene plan route or scene image UI was added.

Do not run live image generation unless the environment has an API key and the user explicitly wants a live smoke test.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/images/character -H "Content-Type: application/json" -d '{}'
rg "images/character|characterImage|generateCharacterImage|imagePath|imageMeta|OPENAI_IMAGE_MODEL" frontend/src server/src server/test frontend/test docs .env.example
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "hair|clothing|build|personality|expression|pose|visual style" frontend/src server/src docs
rg "scenes/plan|images/scene|/api/scenes|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

If a dev server is needed for curl checks, start it with the existing dev command and stop it after verification.

## Documentation

Add `docs/phase-8-character-reference-images.md` or equivalent with:

- The `POST /api/images/character` contract.
- Image model/environment configuration.
- Character image prompt rules.
- Local image storage path and frontend-safe asset URL behavior.
- Character record image metadata.
- Approval semantics.
- Regeneration semantics.
- Stale behavior when character details change.
- What remains out of scope for Phase 9+.
- Verification that was run.

## Acceptance Criteria

- `POST /api/images/character` exists and returns JSON.
- Missing or malformed request data returns JSON errors.
- Image generation requires a saved project, locked story and valid character.
- OpenAI image calls happen only on the backend.
- Generated images are saved inside the local project folder.
- Frontend renders generated images from safe asset URLs.
- Character records persist `imagePath`, generation status, count and image metadata.
- Regeneration preserves character text fields and notes.
- Regeneration clears prior approval.
- Approval requires an existing generated image.
- Approved character image state persists after save/open/duplicate.
- Editing character identity fields after generation marks the image/character stale or needing review.
- Asset serving is path-safe and does not expose arbitrary files.
- Existing Phase 7 extraction and merge behavior still works.
- Existing Phase 6 locked story behavior still works.
- No scene planning or scene image generation is added.
- No audio/video/export/account/cloud scope is added.
- Server tests pass.
- Frontend tests pass if present.
- Frontend build passes.

## Handoff Notes

Phase 8 should replace the dummy character-generation placeholder with real persistent character reference images. Keep the tutor-facing character data model lightweight; notes tags are the optional guidance surface.

The clean path is:

1. Extracted character record exists.
2. Backend builds an internal image prompt.
3. Backend generates and saves an image in the project folder.
4. Frontend displays the saved image.
5. Tutor approves the image as the continuity reference.

Phase 9 can plan scenes once required character references are approved. Do not start scene planning in this phase.
