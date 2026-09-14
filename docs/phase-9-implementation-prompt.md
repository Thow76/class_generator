# Phase 9 Implementation Prompt

Use this prompt to implement Milestone 3, Phase 9 of Lesson Source Builder.

## Prompt

You are implementing Milestone 3, Phase 9 of Lesson Source Builder.

Phase 7 created editable character records from the locked master story. Phase 8 generated and approved character reference images for visual continuity. Phase 9 should convert the locked story into a reviewable, editable scene plan before any scene images are generated.

Implement Phase 9 only. Do not add scene image generation, audio/video outputs, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable cross-project scene libraries or external media platform integrations.

## Phase 9 Goal

Convert the locked story into sensible visual scene units that the tutor can review and edit before image generation.

Done means:

- Scene planning requires a saved lesson, locked story and approved required character references.
- The backend exposes `POST /api/scenes/plan`.
- The backend sends the locked story, approved character records and lesson setting/context to OpenAI.
- OpenAI returns a structured scene plan.
- The returned plan is validated before saving.
- Scene records are created or merged into `lesson.scenes`.
- Every locked story sentence is covered by at least one scene unless explicitly validated as intentionally unassigned.
- Scene records preserve stable IDs where scenes can be matched safely.
- Existing tutor scene edits are not silently destroyed.
- Scene cards remain editable after planning.
- The Scenes stage has loading, error and success states.
- The tutor can continue editing sentence-to-scene coverage manually.
- No scene images are generated in this phase.

## Starting Point

Important existing files:

```text
docs/phase-7-character-extraction.md
docs/phase-8-character-reference-images.md
docs/phase-8-implementation-prompt.md
frontend/src/App.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/src/data/constants.js
server/src/index.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/openaiClient.js
server/src/routes/story.js
server/src/routes/characters.js
server/src/routes/images.js
server/test/characterExtraction.test.js
server/test/characterImage.test.js
frontend/test/characterImages.test.js
```

Recommended new or updated files:

```text
frontend/src/api/scenes.js
server/src/routes/scenes.js
server/src/services/scenePlanningService.js
server/src/prompts/scenePrompts.js
server/src/schemas/sceneSchemas.js
server/src/services/validateScenePlan.js
server/test/scenePlanning.test.js
frontend/test/scenePlanning.test.js
docs/phase-9-scene-planning.md
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
- The locked master story is authoritative for scene planning.
- Do not use editable draft story text as the scene-planning source.
- Approved character reference images are the visual continuity source for later scene image generation.
- Do not silently delete existing scene work.
- When downstream data becomes stale, flag it rather than destructively deleting user work.
- Keep OpenAI calls and API keys backend-only.
- Use structured JSON responses for scene planning.
- Keep scene planning separate from scene image generation.

## Existing Scene Model To Preserve

Scene records currently use this shape:

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

Phase 9 may add planning metadata only if it remains serializable and normalized. Do not replace the existing scene model.

Recommended optional metadata:

```json
{
  "scenesMeta": {
    "lastPlannedAt": "2026-09-09T12:00:00.000Z",
    "model": "gpt-5-mini",
    "promptVersion": "scene-plan-v1",
    "schemaVersion": "scene-plan-v1",
    "sourceStoryLockedAt": "2026-09-09T11:55:00.000Z",
    "sourceCharacterApprovalState": "approved"
  }
}
```

Only add this if save/open normalization and validation preserve it cleanly.

## Backend API

Add scene routes without disturbing health, project, story, character or image routes.

Expected endpoint:

```text
POST /api/scenes/plan
```

Expected request:

```json
{
  "lessonId": "lesson-20260909-example"
}
```

Expected success response:

```json
{
  "lesson": {
    "id": "lesson-20260909-example",
    "scenes": []
  }
}
```

Return the full updated lesson object to match existing story/character/image operation behavior.

Expected error behavior:

- `400` for missing or malformed `lessonId`.
- `404` for missing project.
- `422` when the story is not locked.
- `422` when the locked story snapshot is missing, empty or invalid.
- `422` when required characters are missing.
- `422` when required characters do not have approved image references.
- `422` when any required character is stale.
- `422` when model output fails schema/semantic validation.
- `503` for missing API key or OpenAI failures.
- `500` only for unexpected server errors.

All errors should be JSON and should avoid exposing secrets or raw provider internals.

## Backend Steps

### Step 1: Register Scene Routes

1. Create `server/src/routes/scenes.js`.
2. Import and register it in `server/src/index.js` under `/api/scenes`.
3. Keep existing health, projects, story, characters and images routes unchanged.
4. Use the same route error style as story/character/image routes.

### Step 2: Build Scene Planning Service

Create `server/src/services/scenePlanningService.js`.

The service should:

1. Validate `lessonId`.
2. Load the raw project if needed to ensure the persisted locked snapshot is explicit and valid.
3. Load the canonical lesson with `getProject(lessonId)`.
4. Validate lesson shape.
5. Require `lesson.story.status === "locked"`.
6. Read exact story text from `lesson.story.lockedSentences`.
7. Require at least one story sentence.
8. Require required characters to exist.
9. Require required characters to have `approved === true`, `generationStatus === "approved"`, non-empty `imagePath` and `stale === false`.
10. Build a backend prompt using lesson context, locked story sentences and approved character summaries.
11. Call OpenAI through the backend client wrapper.
12. Parse structured JSON from the model response.
13. Validate the scene plan.
14. Merge the scene plan into `lesson.scenes`.
15. Save through `updateProject`.
16. Return the updated full lesson.

Do not call OpenAI from the frontend.

### Step 3: Add Scene Planning Prompt

Create `server/src/prompts/scenePrompts.js`.

The prompt should instruct the model to:

- Group locked story sentences into visual scenes.
- Prefer sensible scene units over one image per sentence.
- Keep sentence order.
- Cover every locked story sentence exactly once unless a clear overlap is required and validated.
- Use stable sentence IDs from the locked story.
- Use existing approved character IDs from `lesson.characters`.
- Include only characters present or visually relevant in each scene.
- Use lesson setting and scenario for locations.
- Return a concise editable scene description.
- Avoid image-generation prompt details reserved for Phase 10.
- Avoid camera, lens, shot, rendering and style instructions unless they are already part of a simple scene description.
- Avoid CEFR labels.
- Avoid creating characters not present in approved character records.
- Avoid generating image files or image prompts.

Recommended exports:

```js
export const scenePlanningPromptVersion = "scene-plan-v1";
export function buildScenePlanningPrompt(lesson) {}
```

Include:

- Theme.
- Title.
- Learner level.
- Setting.
- Scenario.
- Locked story sentences with IDs, numbers and exact text.
- Approved characters with IDs, names, role, age, sex, background and notes.
- Character image availability as continuity metadata, but not raw image files unless the chosen model/prompt design truly needs references.

### Step 4: Add Structured Output Schema

Create `server/src/schemas/sceneSchemas.js`.

Expected structured output:

```json
{
  "scenes": [
    {
      "label": "Scene 1",
      "sentenceIds": ["sentence-1", "sentence-2"],
      "location": "Clinic reception desk",
      "description": "Marta speaks to the receptionist at the desk.",
      "characterIds": ["character-marta", "character-receptionist"],
      "imageMode": "generate",
      "reuseSceneId": null
    }
  ]
}
```

Allow only fields that map to the existing scene record or documented metadata. Do not accept image prompts, camera instructions, generated file paths, image URLs or binary data in Phase 9 output.

### Step 5: Validate Scene Plan Output

Create `server/src/services/validateScenePlan.js`.

Validation should reject:

- Missing `scenes` array.
- Empty scene list when the locked story has sentences.
- Scene with empty `sentenceIds`.
- Scene with unknown sentence IDs.
- Scene with duplicate sentence IDs in the same scene.
- Missing coverage of locked story sentence IDs unless explicitly documented as allowed.
- Duplicate coverage of a sentence across multiple scenes unless explicitly documented as allowed.
- Scenes out of story order.
- Unknown character IDs.
- Character IDs for stale or unapproved characters.
- Empty location when the scene needs a visual setting.
- Empty description.
- Unsupported fields such as image prompts, image paths, generated media, camera/lens/rendering fields or CEFR labels.
- Excessively long labels, locations or descriptions.

Validation should normalize:

- Trimmed labels.
- Trimmed locations.
- Trimmed descriptions.
- Deduped sentence IDs.
- Deduped character IDs.
- `imageMode` defaulting to `generate`.
- `reuseSceneId` defaulting to `null`.

Expected coverage policy:

- Prefer every locked story sentence covered exactly once.
- Use scene `sentenceIds` ordered by locked story order.
- Scene order should follow the first covered sentence.

### Step 6: Merge Scene Plan Into Existing Scenes

Add merge logic in `scenePlanningService.js` or a shared helper.

Requirements:

- Preserve existing scene IDs where scenes match safely.
- Preserve existing tutor edits where possible.
- Do not wipe generated/approved scene image state for scenes that still represent the same sentence group unless plan changes make them stale.
- Do not silently delete existing generated/approved scenes; mark stale or preserve as unmatched review records.
- New scenes receive safe stable IDs such as `scene-1`, `scene-2`, or `scene-clinic-reception`.
- Scene `number` values should reflect display order.
- Scene labels should remain clear and editable.
- Existing manual sentence-reference controls should still work after planning.

Recommended matching rule:

- Match existing scenes by exact normalized `sentenceIds` first.
- If no exact match, optionally match by first sentence ID and overlapping sentence IDs.
- Never match solely by label.

For matched scenes:

- Preserve `id`.
- Preserve user-edited `location` or `description` if the existing scene is generated/approved, unless the plan intentionally changes coverage.
- Preserve `imageMode` and `reuseSceneId` where still valid.
- Preserve `generationStatus`, `generationCount`, `imagePath`, `approved`, `stale`, `staleReason` and `staleAt` only if the sentence group and character group are unchanged.
- Mark generated/approved scenes stale if coverage, characters, location or description changes.

For unmatched existing generated/approved scenes:

- Do not delete automatically.
- Mark stale with a clear reason such as `Scene was not found in the latest scene plan.`

For unmatched existing ungenerated scenes:

- It is acceptable to replace them with the new plan if no user work would be lost, but document the behavior and test it.

### Step 7: Update Validation And Normalization

Update server and frontend validation/normalization as needed.

Confirm:

- Scene IDs are safe stable IDs.
- `scene.sentenceIds` reference existing story sentence IDs.
- `scene.characterIds` reference existing character IDs.
- Scenes with empty `sentenceIds` remain valid only if existing manual workflows require that; generated plans should not create empty scenes.
- `imageMode` is valid.
- `reuseSceneId`, if present, references an existing scene.
- Scene planning metadata is serializable and preserved.
- Unknown future fields are not unnecessarily discarded.

Do not make broad schema rewrites beyond what Phase 9 needs.

## Frontend Steps

### Step 1: Add Scene API Client

Create `frontend/src/api/scenes.js`.

Recommended function:

```js
export async function planScenes(lessonId) {}
```

Follow existing API error parsing style. Do not import OpenAI in frontend code.

### Step 2: Add Scene Planning Flow

Update `frontend/src/App.jsx` and `frontend/src/stages/ScenesStage.jsx`.

Add:

- Plan Scenes action.
- Loading state.
- Error state.
- Success state.
- Disabled state until story is locked.
- Disabled state until required characters are approved.
- Disabled state while project/story/character/image operations are active.
- Confirmation when replanning might affect existing generated/approved scenes.

Recommended behavior:

1. User locks story.
2. User extracts characters.
3. User generates and approves required character references.
4. User opens Scenes stage.
5. User clicks Plan Scenes.
6. Frontend saves current project if needed.
7. Frontend calls `POST /api/scenes/plan`.
8. Backend returns updated lesson.
9. Frontend normalizes and validates the lesson.
10. Scene cards render from `lesson.scenes`.
11. Save status reflects backend-saved state.

If required characters are not approved:

- Show the existing prerequisite notice.
- Do not call the backend.
- Keep message concise.

If scenes already exist:

- Replanning should be deliberate.
- Use a confirmation if existing scenes include generated/approved work or manual edits.
- Do not silently overwrite generated/approved scene work.

### Step 3: Preserve Manual Scene Editing

Existing scene editing should continue to work:

- Location.
- Image setting.
- Character tags display.
- Covered sentence add/remove controls.
- Unassigned sentence list.
- Existing dummy Generate Scene / Use This Scene placeholder actions.

Phase 9 should not turn Generate Scene into real image generation. That is Phase 10.

### Step 4: Scene Coverage UI

The current Scenes stage already shows unassigned sentences and per-scene covered sentences.

Ensure after planning:

- Every scene displays its covered sentences in story order.
- Unassigned sentence count reflects the plan.
- Adding/removing sentence references still updates only that scene.
- Removing a sentence from a generated/approved scene marks that scene stale.
- Characters listed on scene cards resolve from `scene.characterIds`.
- Empty scene lists show a useful empty state.

Do not add a large dashboard or marketing-style first screen.

## UI Requirements

- Keep the existing Scenes screen layout.
- Add Plan Scenes near the Scenes stage header or as a compact notice/panel.
- Keep button and status styling consistent.
- Do not add long instructional text in-app.
- Use concise labels:

```text
Plan scenes
Planning scenes...
Approve character references before scene planning.
Scene planning failed. Try again.
```

- Avoid overlapping sentence rows, selectors, badges or action buttons.
- Scene cards should remain usable on desktop and mobile.

## Data Contract

Persist the full updated lesson object. Scene planning should at minimum save:

```text
scenes[].id
scenes[].number
scenes[].label
scenes[].sentenceIds
scenes[].location
scenes[].description
scenes[].characterIds
scenes[].imageMode
scenes[].reuseSceneId
scenes[].generationStatus
scenes[].generationCount
scenes[].imagePath
scenes[].approved
scenes[].stale
scenes[].staleReason
scenes[].staleAt
```

Optional metadata should be saved only if normalized and validated:

```text
scenesMeta.lastPlannedAt
scenesMeta.model
scenesMeta.promptVersion
scenesMeta.schemaVersion
scenesMeta.sourceStoryLockedAt
```

Do not add scene image prompts or scene image paths from model output in Phase 9.

## Backend Tests

Add focused tests in:

```text
server/test/scenePlanning.test.js
```

Cover:

- Missing `lessonId` is rejected.
- Missing project is rejected.
- Draft/unlocked story is rejected.
- Missing/empty/invalid locked snapshot is rejected.
- No characters is rejected.
- Unapproved required characters are rejected.
- Stale required characters are rejected.
- Approved character without image path is rejected.
- Valid plan creates scene records.
- Prompt includes locked story sentence IDs/text and approved character IDs/names.
- Prompt does not include CEFR labels.
- Model output with unknown sentence IDs is rejected.
- Model output missing sentence coverage is rejected.
- Model output with duplicate sentence coverage is rejected unless explicitly allowed.
- Model output with unknown character IDs is rejected.
- Model output with unsupported fields such as image prompts/image paths is rejected.
- Invalid model output does not mutate the saved project.
- Existing matching scene IDs are preserved when sentence coverage matches.
- Existing generated/approved scene state is preserved only when safe.
- Existing generated/approved scenes are marked stale when coverage changes or when unmatched.
- Scene plan saves through `projectStore`.

Use mocked OpenAI responses. Do not require live OpenAI calls for automated tests.

## Frontend Tests

If frontend tests exist, add coverage in:

```text
frontend/test/scenePlanning.test.js
```

Cover:

- Plan Scenes API client posts to `/api/scenes/plan`.
- Plan Scenes disabled when story is not locked.
- Plan Scenes disabled when required character references are not approved.
- Loading state appears while planning.
- API errors do not clear existing scenes.
- Returned lesson updates scene cards.
- Scene coverage selectors still work after planning.
- Replanning confirmation appears when existing generated/approved scenes would be affected.
- Project controls are disabled during scene planning.
- Stale scene planning responses are ignored if active project changes.

If frontend tests are not practical, document manual browser checks.

## Manual QA Checklist

1. Start the app.
2. Confirm `GET /api/health` returns JSON.
3. Open or create a lesson.
4. Complete Setup.
5. Generate or write a story.
6. Lock the story.
7. Extract characters.
8. Generate and approve required character reference images.
9. Navigate to Scenes.
10. Confirm Plan Scenes is enabled.
11. Click Plan Scenes.
12. Confirm loading state appears.
13. Confirm scene cards appear after success.
14. Confirm all locked story sentences are assigned.
15. Confirm scene sentence references display exact story text.
16. Confirm scene character tags match approved characters.
17. Edit a scene location and description.
18. Add and remove sentence references manually.
19. Confirm generated/approved scene placeholders are not real images.
20. Save, refresh and reopen.
21. Confirm scene plan persists.
22. Replan and confirm existing generated/approved scenes are not silently deleted.
23. Confirm no scene image generation route or generated image appears.

Do not run live OpenAI calls unless the environment has an API key and the user explicitly wants a live scene-planning smoke test.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/scenes/plan -H "Content-Type: application/json" -d '{}'
rg "scenes/plan|planScenes|scenePlanning|scene-plan|validateScenePlan|scenesMeta" frontend/src server/src server/test frontend/test docs
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "images/scene|/api/images/scene|scene image|image prompt|audio|video|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

If route-level checks are possible, verify:

```sh
curl -s -X POST http://127.0.0.1:3001/api/scenes/plan \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: JSON error for missing `lessonId`.

## Documentation

Add `docs/phase-9-scene-planning.md` or equivalent with:

- The `POST /api/scenes/plan` contract.
- Prerequisites: locked story and approved character references.
- Structured scene plan output shape.
- Scene validation/coverage rules.
- Scene merge rules.
- Manual scene editing behavior after planning.
- Replanning behavior.
- What remains out of scope for Phase 10+.
- Verification that was run.

## Acceptance Criteria

- `POST /api/scenes/plan` exists and returns JSON.
- Missing or malformed request data returns JSON errors.
- Scene planning requires a locked story.
- Scene planning uses `story.lockedSentences`, not draft story text.
- Scene planning requires approved, non-stale character references.
- OpenAI calls happen only on the backend.
- Structured scene plan output is validated before save.
- Invalid model output does not mutate the project.
- New scene records receive safe stable IDs.
- Every locked story sentence is covered according to the documented policy.
- Scene character IDs reference existing approved characters.
- Existing generated/approved scene work is not silently deleted.
- Scene planning result persists after save/open/duplicate.
- Existing manual scene reference controls still work.
- No scene image generation is added.
- No audio/video/export/account/cloud scope is added.
- Server tests pass.
- Frontend tests pass if present.
- Frontend build passes.

## Handoff Notes

Phase 9 should create the reviewable visual structure for the lesson, not the images themselves.

The clean path is:

1. Locked story is exact.
2. Required character references are approved.
3. Backend proposes a structured scene plan.
4. Tutor reviews and edits scene coverage.
5. Scene records persist as the source for Phase 10 scene image generation.

Keep Phase 9 deliberately text-and-structure only. Phase 10 will generate scene images from the approved scene records and approved character references.
