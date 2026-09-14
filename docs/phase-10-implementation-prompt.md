# Phase 10 Implementation Prompt

Use this prompt to implement Milestone 3, Phase 10 of Lesson Source Builder.

## Prompt

You are implementing Milestone 3, Phase 10 of Lesson Source Builder.

Phase 8 generated and approved persistent character reference images. Phase 9 planned editable scene records from the locked master story and approved character references. Phase 10 should generate, review, regenerate and approve persistent scene images from those planned scene records.

Implement Phase 10 only. Do not add audio/video generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable cross-project media libraries or external media platform integrations.

## Phase 10 Goal

Generate final scene images from approved character references and planned scene records.

Done means:

- Scene image generation requires a saved lesson.
- Scene image generation requires a locked story with a valid locked snapshot.
- Scene image generation requires an existing planned scene record.
- Scene image generation requires required character references to be approved, non-stale and backed by image paths.
- Scene image generation uses the planned scene's sentence coverage, location, description, character IDs and image mode.
- The backend builds an internal scene image prompt from the planned scene, locked story text, lesson context and approved character reference metadata.
- The backend calls the image model with the API key on the server only.
- Generated scene image files are saved inside the local project folder.
- The scene record stores safe project-relative image paths and serializable image metadata.
- The Scenes stage displays generated scene images proportionally without cropping.
- Regenerate replaces or supersedes the current generated scene image without losing editable scene fields.
- Use This Scene / Approve marks the selected scene image as the approved scene output.
- Approved scene state persists after save/open/duplicate.
- Editing scene fields after generation marks scene images stale and requires regeneration/reapproval.
- Scene images appear in the Media stage through existing derived media item behavior.
- No export or downstream media packaging is introduced.

## Starting Point

Important existing files:

```text
docs/phase-8-character-reference-images.md
docs/phase-8-implementation-prompt.md
docs/phase-9-scene-planning.md
docs/phase-9-implementation-prompt.md
frontend/src/App.jsx
frontend/src/api/images.js
frontend/src/api/scenes.js
frontend/src/stages/ScenesStage.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/src/data/constants.js
frontend/src/styles.css
server/src/index.js
server/src/routes/images.js
server/src/routes/scenes.js
server/src/services/characterImageService.js
server/src/services/scenePlanningService.js
server/src/services/imageStorage.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/openaiClient.js
server/src/prompts/characterImagePrompts.js
server/src/prompts/scenePrompts.js
server/test/characterImage.test.js
server/test/scenePlanning.test.js
frontend/test/characterImages.test.js
frontend/test/scenePlanning.test.js
```

Recommended new or updated files:

```text
server/src/services/sceneImageService.js
server/src/prompts/sceneImagePrompts.js
server/test/sceneImage.test.js
frontend/test/sceneImages.test.js
docs/phase-10-scene-images.md
```

Update existing image routes and storage rather than creating an unrelated image pipeline:

```text
server/src/routes/images.js
server/src/services/imageStorage.js
frontend/src/api/images.js
frontend/src/stages/ScenesStage.jsx
frontend/src/App.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
```

Use these names unless the repo already has a stronger local convention.

## Product Rules To Preserve

- Use only these internal learner levels:
  - Literacies Plus
  - Complete Beginner
  - Beginner 1
  - Beginner 1.5
  - Beginner 2
- Do not introduce CEFR labels such as A1, A2 or B1 in UI, prompts, docs or generated user-facing metadata.
- The locked master story remains authoritative.
- Do not use editable draft story text as the source for image generation.
- Approved character reference images are the continuity source for scene images.
- Do not silently delete existing character, scene or media work.
- When upstream data becomes stale, flag downstream generated scene output rather than destructively deleting it.
- Keep OpenAI calls and API keys backend-only.
- Save generated image files inside each local project folder.
- Store safe project-relative image paths in the lesson object.
- Do not store absolute private filesystem paths in `lesson.json`.
- Keep scene image generation separate from export packaging.
- Keep image style consistent with the approved character references. Characters now support `imageStyle: "illustration" | "photorealistic"`; scene prompts should respect the styles of the characters used in the scene and avoid mixing styles within one lesson.

## Existing Scene Model To Preserve

Scene records use this shape:

```json
{
  "id": "scene-1",
  "number": 1,
  "label": "Scene 1",
  "sentenceIds": ["sentence-1", "sentence-2"],
  "location": "Reception desk",
  "description": "Marta speaks to the receptionist.",
  "characterIds": ["character-marta", "character-receptionist"],
  "imageMode": "generate",
  "reuseSceneId": null,
  "generationStatus": "not_started",
  "generationCount": 0,
  "imagePath": null,
  "approved": false,
  "stale": false
}
```

Phase 10 may add serializable image metadata to scenes, for example:

```json
{
  "imageMeta": {
    "model": "gpt-image-1",
    "promptVersion": "scene-image-v1",
    "generatedAt": "2026-09-10T12:00:00.000Z",
    "sourceStoryLockedAt": "2026-09-10T11:50:00.000Z",
    "sourceScenesPlannedAt": "2026-09-10T11:55:00.000Z",
    "sourceCharacterImagePaths": [
      "images/characters/lesson-example-character-marta.png"
    ],
    "imageStyle": "illustration",
    "fileName": "lesson-example-scene-1-20260910T120000Z.png"
  }
}
```

Do not replace the existing scene model. Do not create a parallel media table for scene images.

## Backend API

Extend the existing image routes without disturbing health, project, story, character, scene-planning or character-image routes.

Expected endpoints:

```text
POST /api/images/scene
POST /api/images/scene/approve
```

### `POST /api/images/scene`

Expected request:

```json
{
  "lessonId": "lesson-20260910-example",
  "sceneId": "scene-1"
}
```

Expected success response:

```json
{
  "lesson": {
    "id": "lesson-20260910-example",
    "scenes": []
  },
  "image": {
    "sceneId": "scene-1",
    "imagePath": "/api/projects/lesson-20260910-example/assets/images/scenes/lesson-20260910-example-scene-1-20260910T120000Z.png",
    "projectRelativePath": "images/scenes/lesson-20260910-example-scene-1-20260910T120000Z.png",
    "imageMeta": {}
  }
}
```

Return the full updated lesson object to match existing operation routes.

### `POST /api/images/scene/approve`

Expected request:

```json
{
  "lessonId": "lesson-20260910-example",
  "sceneId": "scene-1"
}
```

Expected success response:

```json
{
  "lesson": {
    "id": "lesson-20260910-example",
    "scenes": []
  }
}
```

### Error Behavior

Expected scene image generation errors:

- `400` for missing or malformed `lessonId`.
- `400` for missing or malformed `sceneId`.
- `404` for missing project.
- `404` for missing scene when IDs are safe but not found.
- `422` when the story is not locked.
- `422` when the locked story snapshot is missing, empty or invalid.
- `422` when scene planning has not produced any scene records.
- `422` when the target scene has no sentence coverage.
- `422` when the target scene references unknown locked story sentence IDs.
- `422` when the target scene has empty location or description.
- `422` when `imageMode === "reuse"` but `reuseSceneId` is missing or invalid.
- `422` when a reused source scene has no generated/approved image.
- `422` when target scene characters are missing.
- `422` when any target scene character is stale, unapproved, lacks `imagePath` or has missing image file.
- `422` when the target scene itself is stale and should be reviewed before generation.
- `503` for missing API key or image provider failures.
- `500` only for unexpected server errors.

Expected approval errors:

- `400` for missing or malformed IDs.
- `404` for missing project or missing scene.
- `422` when the scene has no image path.
- `422` when the scene is stale.
- `422` when the generated image file is missing.

All errors should be JSON and should avoid exposing secrets, raw provider internals, absolute filesystem paths or stack traces.

## Backend Steps

### Step 1: Extend Image Storage For Scenes

Update `server/src/services/imageStorage.js`.

Add or generalize saving so scene images are stored under:

```text
server/data/projects/<projectId>/images/scenes/
```

Requirements:

- Keep existing character image storage behavior working.
- Validate project IDs and scene IDs before file writes.
- Use safe filenames based on project ID, scene ID and timestamp or generation count.
- Do not use lesson title, scene label, location or description directly as unsafe filenames.
- Decode and content-validate provider image data before saving.
- Preserve existing PNG validation for `.png` outputs.
- Write files atomically where practical.
- Return:
  - safe `fileName`
  - project-relative path such as `images/scenes/example.png`
  - renderable asset URL
  - content type
- Never return absolute filesystem paths to the frontend.
- Keep asset serving restricted to approved image roots.

Recommended exports:

```js
export async function saveSceneImage(projectId, sceneId, imageData, options = {}) {}
```

If you generalize `saveCharacterImage`, keep route tests that prove malformed character IDs still return the previous contract.

### Step 2: Add Scene Image Prompt Builder

Create `server/src/prompts/sceneImagePrompts.js`.

The prompt should build one internal image instruction from:

- Lesson title.
- Theme.
- Setting.
- Scenario.
- Internal learner level only as tone context.
- Locked story sentences covered by the scene, using exact locked snapshot text.
- Scene label.
- Scene location.
- Scene description.
- Characters listed in `scene.characterIds`.
- Approved character summaries:
  - ID
  - name
  - role
  - age
  - sex / gender
  - background / nationality
  - notes
  - selected `imageStyle`
  - approved image path metadata, without exposing absolute paths.

Prompt rules:

- Generate one scene image for ESOL teaching material.
- Depict the planned scene, not a character portrait.
- Keep all referenced characters visually consistent with their approved reference images.
- Include only characters listed on the scene record unless the scene description clearly needs anonymous background people.
- Avoid inventing named characters.
- Avoid text, captions, watermarks, UI, logos and speech bubbles in the image.
- Avoid external learner labels such as A1, A2, B1 or CEFR.
- Respect `imageStyle`; if characters in the scene disagree, reject generation with a clear validation error so the user can align character styles before generating the scene.
- Prefer clear, readable teaching-resource composition over dramatic cinematic framing.
- Do not expose the prompt in the frontend unless a debug-only path already exists.

Recommended exports:

```js
export const sceneImagePromptVersion = "scene-image-v1";
export function buildSceneImagePrompt(lesson, scene) {}
```

If the image API supports input/reference images in the installed SDK, you may pass approved character image files as references from the backend only. If not, keep the prompt explicit about continuity and include character image path metadata in `imageMeta`. Do not send image references from the frontend.

### Step 3: Build Scene Image Service

Create `server/src/services/sceneImageService.js`.

The service should:

1. Validate `lessonId` and `sceneId`.
2. Load the raw project if needed to ensure the persisted locked snapshot is explicit and valid.
3. Load the canonical lesson with `getProject(lessonId)`.
4. Validate lesson shape.
5. Require `lesson.story.status === "locked"`.
6. Require a non-empty, valid `lesson.story.lockedSentences`.
7. Find the target scene by stable ID.
8. Reject stale target scenes.
9. Validate target scene fields:
   - non-empty `sentenceIds`
   - known locked sentence IDs
   - non-empty location
   - non-empty description
   - valid `imageMode`
10. Resolve scene characters by `scene.characterIds`.
11. Require each scene character to exist, be approved, have `generationStatus === "approved"`, have a non-empty safe `imagePath`, be non-stale and have an existing image file.
12. If `scene.imageMode === "reuse"`:
   - require `reuseSceneId`
   - find the source scene
   - require an existing generated/approved image on the source scene
   - copy the source image path and relevant metadata into the target scene
   - increment or preserve generation count according to existing local conventions
   - clear approval on the target unless reuse approval is explicitly confirmed
   - do not call OpenAI
13. If `scene.imageMode === "generate"`:
   - build the scene image prompt
   - call the image model through the backend OpenAI wrapper
   - validate provider image response
   - save the file under `images/scenes/`
   - update only the target scene
14. Set target scene after generation:
   - `imagePath`
   - `generationStatus: "generated"`
   - incremented `generationCount`
   - `approved: false`
   - `stale: false`
   - `staleReason: null`
   - `staleAt: null`
   - serializable `imageMeta`
15. Preserve scene editable fields:
   - label
   - sentenceIds
   - location
   - description
   - characterIds
   - imageMode
   - reuseSceneId
16. Save through `updateProject`.
17. Return the updated full lesson plus image response metadata.

Do not call OpenAI from the frontend.

### Step 4: Add Scene Approval Service

Add an approval function in `sceneImageService.js`.

The approval service should:

1. Validate `lessonId` and `sceneId`.
2. Load and validate the lesson.
3. Find the scene by ID.
4. Require `scene.imagePath`.
5. Reject stale scenes.
6. Verify the image file exists under the project asset root.
7. Set `generationStatus: "approved"` and `approved: true`.
8. Preserve image path and metadata.
9. Preserve unrelated scenes and characters.
10. Save through `updateProject`.

### Step 5: Register Routes

Update `server/src/routes/images.js`.

Add:

```text
POST /api/images/scene
POST /api/images/scene/approve
```

Keep existing routes:

```text
POST /api/images/character
POST /api/images/character/approve
```

Use consistent error mapping. Route logs should not leak provider internals or absolute paths.

### Step 6: Frontend API Client

Update `frontend/src/api/images.js`.

Add:

```js
export async function generateSceneImage(lessonId, sceneId) {}
export async function approveSceneImage(lessonId, sceneId) {}
```

Match the existing character image API client style. Parse backend JSON errors into readable messages.

### Step 7: Frontend App State

Update `frontend/src/App.jsx`.

Replace placeholder scene operations:

```js
markSceneGenerated
markSceneApproved
```

with backend-backed operations.

Recommended behavior:

- Save the current lesson before generating a scene image.
- Maintain per-scene operation state like `sceneImageOperations`.
- Disable conflicting project/story/character/scene-planning operations while a scene image operation is active.
- Ignore stale scene-image responses if the active project changes before the backend returns.
- Show per-scene loading and error state.
- Apply the returned lesson only when the operation token and project ID still match.
- Refresh the project list quietly after successful generation/approval.
- Do not block unrelated scenes forever after an error.

If the existing app has reusable helper logic for character image operations, share patterns where sensible without over-abstracting.

### Step 8: Scenes Stage UI

Update `frontend/src/stages/ScenesStage.jsx`.

Requirements:

- Display generated scene images using `getProjectAssetUrl(lesson.id, scene.imagePath)`.
- Use proportional fit, not cropping. Reuse `.asset-image` styling if it already uses `object-fit: contain`.
- Preserve placeholder UI when no image exists.
- Show loading state for the target scene:
  - Generating scene...
  - Approving scene...
- Show per-scene error messages.
- Disable Generate/Regenerate when:
  - scene image operation is active
  - scene planning is active
  - story is unlocked
  - scene is stale
  - scene has no sentence coverage
  - scene has empty location or description
  - scene references unapproved/stale/missing character references
- Disable Use This Scene until:
  - scene has `imagePath`
  - scene is not stale
  - generated file exists according to backend approval route
- Keep manual scene editing controls available when no operation is active.
- Manual edits after generation should continue to mark the scene stale and clear approval.
- Keep the UI quiet and consistent with the existing workflow.

Do not turn the Scenes stage into a dashboard or media export screen.

### Step 9: Normalize And Validate

Update frontend and backend normalization/validation only as needed.

Ensure:

- `scene.imagePath` accepts safe project-relative scene image paths.
- `scene.imageMeta` is serializable and bounded.
- `scene.generationStatus === "approved"` implies `approved === true` when an image path exists.
- Missing optional `imageMeta` from old projects does not break load.
- Unknown future metadata fields are not silently discarded unless the existing app already has a documented stripping policy.

Keep existing save/open/duplicate behavior intact.

### Step 10: Documentation

Create `docs/phase-10-scene-images.md`.

Include:

- API contract.
- Prerequisites.
- Scene image prompt sources.
- Storage location.
- Reuse mode behavior.
- Approval behavior.
- Stale behavior.
- Verification checklist.
- Explicit out-of-scope list.

## Prompt And Image Style Notes

Character records may now include:

```json
{
  "imageStyle": "illustration"
}
```

or:

```json
{
  "imageStyle": "photorealistic"
}
```

Scene generation should respect approved character styles. Recommended policy:

- If all scene characters use the same `imageStyle`, use that style.
- If scene characters differ, reject generation with `422` and ask the user to align character image styles before scene generation.
- Store the resolved style in `scene.imageMeta.imageStyle`.

This avoids a photorealistic character being composited into an illustrated scene or vice versa.

## Reuse Mode

Scene records already include:

```json
{
  "imageMode": "reuse",
  "reuseSceneId": "scene-1"
}
```

For Phase 10:

- `imageMode: "generate"` should call the image model.
- `imageMode: "reuse"` should not call the image model.
- Reuse should copy or reference the source scene image safely.
- The target scene should still have its own approval state.
- Reuse should reject missing, stale or imageless source scenes.
- Reuse should reject circular or self references.
- Reuse should not mutate the source scene.

If reuse UX is not fully ready, keep the existing dropdown but return clear backend validation errors. Do not silently fall back to generation.

## Backend Tests

Add focused tests in `server/test/sceneImage.test.js`.

Cover:

- Missing `lessonId` returns `400`.
- Missing `sceneId` returns `400`.
- Malformed `sceneId` returns `400`.
- Safe missing scene ID returns `404`.
- Missing project returns `404`.
- Draft/unlocked story returns `422`.
- Missing/empty/mismatched locked snapshot returns `422`.
- No scenes planned returns `422`.
- Target scene with empty `sentenceIds` returns `422`.
- Target scene with unknown sentence IDs returns `422`.
- Target scene with empty location or description returns `422`.
- Target scene marked stale returns `422`.
- Missing scene character returns `422`.
- Unapproved scene character returns `422`.
- Stale scene character returns `422`.
- Scene character missing image path returns `422`.
- Scene character image file missing returns `422`.
- Mixed character image styles return `422`.
- Local validation failures do not call OpenAI.
- Missing API key maps to `503`.
- Provider failure maps to `503` and does not mutate saved project.
- Invalid image payload maps to `503` and does not mutate saved project or write files.
- Successful generation saves a file under `images/scenes/`.
- Successful generation updates only the target scene.
- Successful generation preserves label, sentenceIds, location, description, characterIds, imageMode and reuseSceneId.
- Successful generation increments `generationCount`.
- Successful generation clears approval.
- Successful generation writes serializable `imageMeta`.
- Regeneration increments count and replaces/supersedes image path without losing editable fields.
- Approval requires an existing scene image file.
- Approval rejects stale scenes.
- Approval updates only the target scene.
- Reuse mode does not call OpenAI.
- Reuse mode rejects missing/stale/imageless source scenes.
- Reuse mode does not mutate the source scene.
- Existing character image route tests still pass.
- Existing scene planning route tests still pass.

## Frontend Tests

Add focused tests in `frontend/test/sceneImages.test.js` or extend existing image tests if that is the local convention.

Cover:

- `generateSceneImage` calls `POST /api/images/scene`.
- `approveSceneImage` calls `POST /api/images/scene/approve`.
- API client parses backend scene image errors.
- `getProjectAssetUrl` renders `images/scenes/...` paths.
- Manual scene edits after generation mark scenes stale without clearing image path.
- Scene approval requires image path and unstale scene.
- Normalization preserves scene image path and metadata.
- Validation rejects unsafe scene image paths.
- Scene image operation stale responses are ignored after project switch.
- Scene image operation stale responses are ignored after operation token changes.
- Scene image errors remain visible for the target scene.

If component tests are not available, add utility/API tests and document remaining manual QA.

## Manual QA Checklist

Run:

```sh
npm run dev
```

Then verify:

1. `GET /api/health` still returns JSON.
2. `GET /api/projects` still returns JSON.
3. Create or open a saved lesson.
4. Lock a story.
5. Extract characters.
6. Generate and approve required character references.
7. Plan scenes.
8. Confirm each scene has sentence coverage, location, description and characters.
9. Generate a scene image.
10. Confirm loading state appears.
11. Confirm generated scene image displays fully and proportionally.
12. Confirm the generated scene image file exists under `server/data/projects/<id>/images/scenes/`.
13. Confirm the scene record stores a project-relative `imagePath`.
14. Approve the scene.
15. Save, refresh and reopen the project.
16. Confirm scene image and approval state persist.
17. Edit scene description after approval.
18. Confirm the scene becomes stale and approval is cleared.
19. Regenerate the stale scene after review.
20. Confirm only the target scene changes.
21. Try approving an imageless scene and confirm a visible error.
22. Try generating with a stale/unapproved character and confirm a visible error.
23. Try `imageMode: reuse` with a valid source scene image if the UI supports selecting `reuseSceneId`.
24. Confirm Media stage lists scene image state through derived media items.

Do not perform ZIP/export checks in Phase 10.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
```

If useful while the dev server is running:

```sh
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/images/scene -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://127.0.0.1:3001/api/images/scene/approve -H "Content-Type: application/json" -d '{}'
```

Targeted scans:

```sh
rg "images/scene|generateSceneImage|approveSceneImage|sceneImage|scene-image|saveSceneImage" frontend/src server/src server/test frontend/test docs
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "audio|video|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
```

Expected scan results:

- OpenAI imports should remain backend-only, preferably through the existing backend wrapper.
- CEFR labels should not appear in active app/server source.
- Audio/video/export/account/cloud scope should not appear in implementation code.
- Prototype dependency imports should not appear in active frontend/server code.

## Acceptance Criteria

- A user can generate a scene image from a planned scene.
- A user can regenerate a scene image without losing scene text/coverage edits.
- A user can approve a scene image.
- Generated scene image files are saved under the project data directory.
- Saved scene image paths are project-relative and safe.
- Generated scene images display fully and proportionally in the Scenes stage.
- Scene image state persists after save/open/duplicate.
- Stale scene or character state blocks unsafe generation/approval.
- Reuse mode does not call OpenAI and handles invalid sources safely.
- Existing character image generation and approval still work.
- Existing scene planning still works.
- Existing Phase 1-9 workflows still work.
- No audio/video/export/account/cloud scope is introduced.

## Handoff Notes

Phase 10 should be a direct extension of the existing image pipeline. The best implementation reuses the local project asset serving and operation patterns already built for character reference images, while treating scene records as the source of truth for generated scene images.

Keep the change boring and traceable: one planned scene in, one scene image out, stored locally, displayed in the card, approved when the tutor chooses it, and marked stale when upstream scene or character data changes.
