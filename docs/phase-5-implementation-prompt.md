# Phase 5 Implementation Prompt

Use this prompt to implement Milestone 2, Phase 5 of Lesson Source Builder.

## Prompt

You are implementing Milestone 2, Phase 5 of Lesson Source Builder.

Milestone 1 produced a persistent local app with Setup validation, a single serializable lesson object, local project save/open/duplicate, and a local placeholder story path. Phase 5 must replace the placeholder story path with the first real OpenAI feature: Generate Story.

Implement Phase 5 only. Add backend-only OpenAI story generation from validated Setup data. Do not implement sentence-level regenerate, sentence-level shorten, whole-story regenerate warnings, character extraction, scene planning, image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase or cloud sync.

## Phase 5 Goal

Turn valid Setup data into a real editable story draft using backend-only OpenAI integration.

Done means:

- `OPENAI_API_KEY` is documented in `.env.example`.
- `.env` remains ignored.
- OpenAI SDK/client code exists only in the backend.
- The frontend never receives or exposes the API key.
- `POST /api/story/generate` exists.
- The route loads or receives the canonical lesson object.
- Setup validation runs before calling OpenAI.
- Server-side prompts include the approved internal ESOL level rules.
- The OpenAI response is structured JSON.
- The response is validated before replacing the current story.
- Generated sentences are saved to `lesson.story.sentences`.
- Story status is set to `draft`.
- Generation metadata is stored.
- The updated lesson persists to local `lesson.json`.
- Frontend Generate Story calls the backend endpoint.
- Frontend shows loading, disabled and error states.
- API errors do not destroy the existing story.

## Phase 5 Scope

Build:

- Backend OpenAI dependency.
- Backend environment loading for `OPENAI_API_KEY`.
- Backend OpenAI client wrapper.
- Backend story generation route.
- Backend story prompt module.
- Backend story response schema/validator.
- Backend Setup validation or shared equivalent.
- Backend story generation service.
- Frontend story API client.
- Frontend Generate Story loading/error state.
- Frontend replacement of Phase 4 placeholder story generation with real backend generation.
- Persistence of generated story into existing project storage.
- Documentation for Phase 5 story generation behavior.
- Focused tests or mockable service checks where practical.

Do not build:

- `POST /api/story/regenerate`.
- `POST /api/story/regenerate-sentence`.
- `POST /api/story/shorten-sentence`.
- Character extraction.
- Scene planning.
- Character images.
- Scene images.
- Audio scripts.
- Video prompts.
- ZIP export.
- PowerPoint or worksheet generation.
- Accounts, login, Firebase or cloud sync.

## Starting Point

Important current files:

```text
frontend/src/App.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/api/projects.js
frontend/src/utils/validateSetup.js
frontend/src/utils/createPlaceholderStory.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/constants.js
frontend/src/data/lessonSchema.js
server/src/index.js
server/src/routes/projects.js
server/src/routes/health.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/projectStore.test.js
docs/phase-4-setup-validation.md
docs/milestone-2-handoff.md
```

Phase 4 currently uses `frontend/src/utils/createPlaceholderStory.js` for a local non-AI story draft after Setup validation. Phase 5 should replace that user-facing Generate Story path with a backend request. Keep the placeholder helper only as test/dev fallback if useful, and ensure the production Generate Story action does not use it when the backend is available.

## Product Rules To Preserve

### Learner Levels

Use only these internal learner levels:

- Literacies Plus
- Complete Beginner
- Beginner 1
- Beginner 1.5
- Beginner 2

Do not introduce CEFR labels such as A1, A2 or B1 into:

- Main app UI.
- Prompt text shown to the tutor.
- Generated story text.
- User-facing errors.
- Generation metadata shown in the app.

### Story Rules

- Generated story starts as editable draft.
- The story remains a list of ordered sentence records.
- Sentence cards should remain wide on desktop.
- Do not shrink story text to force one-line display.
- Existing manual editing behavior must continue to work after generation.
- Existing lock/unlock behavior must continue to work after generation.
- Errors must not overwrite or clear the current story.

### Character Setup Rules

Use only lightweight character setup fields:

- Name.
- Age or age range.
- Sex or gender.
- Background or nationality.
- Optional secondary character tags.

Do not add dedicated character prompt input fields for hair, clothing, build, personality, expression or visual style.

## Environment And Secrets

## Step 1: Update Environment Configuration

Update:

```text
.env.example
.gitignore
server/src/index.js
server/package.json
```

Requirements:

- Add `OPENAI_API_KEY=` to `.env.example`.
- Ensure `.env` is ignored.
- Load backend environment variables before creating the OpenAI client.
- Do not require the key for health checks or project routes.
- Missing API key should produce a clear JSON error from `POST /api/story/generate`.
- Do not log the API key.
- Do not add keys to docs, tests, fixtures or committed project JSON.

Implementation options:

- Use `dotenv` in the backend.
- Or use an existing environment-loading pattern if one has been added.

Acceptance:

- Backend can start without `OPENAI_API_KEY`.
- Story generation fails clearly if the key is missing.
- Frontend bundle does not contain `OPENAI_API_KEY`.

## Backend Implementation

## Step 2: Install Backend OpenAI SDK

Install the OpenAI SDK in the backend workspace only.

Expected package location:

```text
server/package.json
```

Acceptance:

- OpenAI dependency is not added to `frontend/package.json`.
- Frontend code does not import OpenAI.
- Backend tests/build still run.

## Step 3: Create Backend OpenAI Client

Create:

```text
server/src/services/openaiClient.js
```

Responsibilities:

- Read `process.env.OPENAI_API_KEY`.
- Create the OpenAI client lazily or through a function.
- Throw a typed, readable error if the key is missing.
- Keep model name configurable with a safe default.

Recommended environment variables:

```text
OPENAI_API_KEY=
OPENAI_STORY_MODEL=
```

`OPENAI_STORY_MODEL` is optional. If omitted, use the current project-approved default model and document it in Phase 5 docs. Check official OpenAI docs before choosing SDK-specific API syntax or model names if you are unsure.

Acceptance:

- Client code exists only in backend.
- Missing-key path is testable without making a network call.
- No secret is included in responses.

## Step 4: Add Story Prompt Module

Create:

```text
server/src/prompts/storyPrompts.js
```

Responsibilities:

- Build the story-generation instructions server-side.
- Include prompt version.
- Include structured output requirements.
- Include level-specific generation rules.
- Include all relevant Setup context.

Recommended export:

```js
export const storyPromptVersion = "story-generate-v1";
export function buildStoryGenerationPrompt(lesson) {}
```

Prompt must include:

- Learner level.
- Theme.
- Setting.
- Scenario.
- Sentence count.
- Main character name.
- Main character age or age range.
- Main character sex or gender.
- Main character background or nationality.
- Secondary characters, if any.
- Target vocabulary, if any.
- Additional notes, if any.

Prompt must require:

- Exactly `lesson.sentenceCount` sentences.
- Plain sentence text only.
- Ordered JSON array.
- No Markdown.
- No numbering embedded in text.
- No CEFR labels.
- No unsupported extra fields unless schema allows them.

Acceptance:

- Prompts are versionable backend files.
- Prompt code is not in frontend.
- Prompt is deterministic for a given lesson object except for model output.

## Level-Specific Story Rules

Add these server-side rules.

### Literacies Plus

- Prioritize this level first.
- Use concrete everyday contexts.
- Use very short sentences.
- Prefer high-frequency words.
- Use simple subject-verb-object patterns.
- Avoid idioms and abstract language.
- Avoid unnecessary pronouns if names are clearer.
- Use predictable rhythm and helpful repetition.

### Complete Beginner

- Use short, simple present-tense sentences.
- Keep vocabulary controlled.
- Use clear everyday actions.
- Avoid complex clauses.
- Avoid implied meaning that requires cultural inference.

### Beginner 1

- Use simple sentences with slightly more variety.
- Allow basic connectors when useful.
- Keep events easy to visualize.
- Keep vocabulary tied to the selected situation.

### Beginner 1.5

- Allow modest sentence variety.
- Use familiar connectors such as `and`, `but` and `because` sparingly.
- Keep the plot linear.
- Avoid dense grammar or long noun phrases.

### Beginner 2

- Allow somewhat richer sentences while staying accessible.
- Use practical everyday language.
- Keep the story grounded in the requested scenario.
- Avoid drifting into intermediate-level complexity.

## Step 5: Add Story Response Schema And Validation

Create:

```text
server/src/schemas/storySchemas.js
```

or:

```text
server/src/services/validateStoryGeneration.js
```

Minimum expected model output:

```json
{
  "sentences": [
    {
      "text": "Marta goes to the shop."
    }
  ]
}
```

Validation rules:

- Response is an object.
- `sentences` exists.
- `sentences` is an array.
- Array length equals `lesson.sentenceCount`.
- Every item has a non-empty string `text`.
- Text is trimmed.
- Text does not include numbering prefixes such as `1.` or `1)`.
- Text does not contain Markdown bullets.
- Text does not contain CEFR labels.
- Text does not contain blank lines.
- Sentences are not duplicates unless a documented level rule permits controlled repetition.

Acceptance:

- Invalid model output does not overwrite the current story.
- Validation errors are readable in server logs and frontend responses.
- Validation can be tested without calling OpenAI.

## Step 6: Add Story Generation Service

Create:

```text
server/src/services/storyGenerationService.js
```

Responsibilities:

1. Load canonical project lesson when given a lesson ID.
2. Normalize and validate lesson shape.
3. Validate Setup readiness before OpenAI call.
4. Build the prompt.
5. Call OpenAI.
6. Parse structured response.
7. Validate generated story.
8. Convert generated text into story sentence records.
9. Update the lesson object.
10. Save the updated lesson through `projectStore`.
11. Return the updated lesson.

Generated sentence records should include:

```json
{
  "id": "sentence-1",
  "number": 1,
  "text": "Marta goes to the shop.",
  "stale": false,
  "source": "generated",
  "updatedAt": "2026-09-05T12:00:00.000Z"
}
```

Story metadata should include:

```json
{
  "status": "draft",
  "lockedAt": null,
  "modifiedAfterLock": false,
  "lastGeneratedAt": "2026-09-05T12:00:00.000Z",
  "generationMeta": {
    "model": "configured-model-name",
    "promptVersion": "story-generate-v1",
    "schemaVersion": "story-sentences-v1",
    "level": "Literacies Plus",
    "sentenceCount": 9
  }
}
```

Preserve or reset behavior:

- Replace the full story only after model output validates.
- Set `story.status` to `draft`.
- Reset `story.lockedAt` to `null` when replacing the full generated draft.
- Set `story.modifiedAfterLock` to `false` for a fresh generated draft if there is no downstream output.
- If replacing a previously locked story with downstream output, require a warning/confirmation in Phase 6. Phase 5 may block generation when story is locked and tell the user to unlock first.
- Do not delete characters or scenes.

Acceptance:

- Service can be tested with a mocked OpenAI response.
- Project file is updated only after validation succeeds.
- Existing story remains unchanged on OpenAI or validation failure.

## Step 7: Add Story Route

Create:

```text
server/src/routes/story.js
```

Mount it in:

```text
server/src/index.js
```

Recommended endpoint:

```text
POST /api/story/generate
```

Recommended request:

```json
{
  "lessonId": "lesson-20260905-abc123"
}
```

Why `lessonId` is preferred:

- Phase 3 already persists canonical lessons.
- Backend can load the latest saved project state.
- Frontend cannot accidentally send stale partial Setup data as truth.

Acceptable alternate request if needed:

```json
{
  "lesson": {}
}
```

Only use the payload-based route if project persistence is unavailable or there is a strong reason. If using payload mode, still save through the project store when possible.

Response:

```json
{
  "lesson": {}
}
```

Error responses:

- `400` for malformed request.
- `404` for missing project.
- `422` for invalid Setup or invalid generated story shape.
- `503` or `500` for missing API key/configuration or OpenAI failures, depending on local error policy.

All route errors should return JSON:

```json
{
  "error": "Setup is incomplete.",
  "details": [
    {
      "field": "scenario",
      "message": "Describe the main situation."
    }
  ]
}
```

Acceptance:

- Route returns updated full lesson.
- Route saves generated story.
- Route does not expose prompts or secrets in user-facing responses.
- Health and project routes still work.

## Step 8: Add Backend Setup Validation

Do not rely only on frontend Setup validation.

Create backend equivalent validation or reuse a backend-safe shared module:

```text
server/src/services/validateSetup.js
```

Required fields:

```text
theme
learnerLevel
setting
scenario
sentenceCount
setup.mainCharacter.name
setup.mainCharacter.age
setup.mainCharacter.sex
setup.mainCharacter.background
```

Optional fields:

```text
title
setup.secondaryCharacters
setup.targetVocabulary
setup.additionalNotes
```

Acceptance:

- Missing required Setup fields return validation errors before OpenAI is called.
- Invalid learner level returns validation error before OpenAI is called.
- Invalid sentence count returns validation error before OpenAI is called.
- Incomplete lessons can still save through project routes; they just cannot generate stories.

## Frontend Implementation

## Step 9: Add Story API Client

Create:

```text
frontend/src/api/story.js
```

Suggested export:

```js
export async function generateStory(lessonId) {}
```

Responsibilities:

- `POST /api/story/generate`.
- Send active project ID.
- Parse JSON.
- Throw readable errors on non-OK responses.
- Preserve backend validation details where possible.

Acceptance:

- Frontend API client does not know about OpenAI.
- Errors are easy for `App.jsx` or `SetupStage.jsx` to display.

## Step 10: Replace Placeholder Generate Story Path

Current Phase 4 behavior:

- Validate Setup.
- Create placeholder story locally.
- Navigate to Story.

Phase 5 behavior:

1. Validate Setup on the frontend.
2. If invalid, stay on Setup and show inline errors.
3. If valid but no active project exists, save/create the project first.
4. Call `POST /api/story/generate` with the active lesson ID.
5. Show loading state while request is running.
6. Disable Generate Story while request is running.
7. On success:
   - Normalize and validate the returned lesson.
   - Replace local lesson state with returned lesson.
   - Set active project ID if needed.
   - Mark save status as saved if backend already persisted it.
   - Navigate to Story.
8. On failure:
   - Keep current lesson and story visible.
   - Show a readable error.
   - Leave save status honest.

Acceptance:

- Generate Story no longer creates placeholder content when backend generation succeeds.
- Placeholder helper is not user-facing in normal Phase 5 flow.
- Existing story is not lost on failure.

## Step 11: Add Generate Story UI States

Update `SetupStage.jsx` and/or app shell to show:

- Setup validation errors.
- Story generation loading state.
- Disabled Generate Story button during generation.
- Backend validation or API errors.

Recommended state names:

```text
storyGenerationStatus: idle | validating | generating | error
storyGenerationError
```

Button labels:

- Idle: `Generate story`
- Loading: `Generating story...`

Keep the UI concise. Do not add long explanatory text.

Acceptance:

- User can see when generation is running.
- User cannot double-submit generation accidentally.
- Backend errors are visible and do not crash the app.

## Step 12: Update Story Stage For Generated Metadata

The Story stage should continue rendering sentence cards from `lesson.story.sentences`.

Add only modest metadata display if useful:

- Draft status.
- Learner level.
- Sentence count.
- Last generated time, if helpful.

Do not clutter the Story page.

Acceptance:

- Generated story appears as ordered editable sentence cards.
- Existing edit, lock and unlock behavior still works.
- Story layout remains wide on desktop.

## Step 13: Preserve Persistence Behavior

Phase 5 generation should persist the updated lesson.

Recommended behavior:

- Backend route saves the updated lesson to `lesson.json`.
- Frontend treats returned lesson as saved.
- If backend save fails after generation, return an error and do not imply success.

Acceptance:

- Refresh and open project restores generated story.
- `lesson.json` contains generated sentence records and metadata.
- Existing New/Open/Duplicate/Save flows still work.

## Step 14: Add Tests Or Focused Verification

Add focused tests where practical.

Backend tests should avoid real OpenAI calls. Use dependency injection, a mock client, or validate lower-level pure helpers.

Recommended tests:

- Backend Setup validation rejects missing required fields.
- Backend Setup validation accepts minimum complete Setup.
- Story response validation accepts valid structured output.
- Story response validation rejects wrong sentence count.
- Story response validation rejects empty sentence text.
- Story response validation rejects numbered sentence text.
- Story response validation rejects CEFR labels.
- Story generation service preserves existing story on invalid model output.
- Missing API key returns a clear typed error.
- Project route tests still pass.

Manual verification may be needed for real OpenAI call once `.env` is configured.

Acceptance:

- Tests do not require a real API key.
- Tests do not make network calls.
- Manual real-generation test is documented separately.

## Step 15: Update Documentation

Add:

```text
docs/phase-5-story-generation.md
```

Document:

- Required environment variables.
- Backend-only OpenAI boundary.
- Story generation route contract.
- Setup validation before generation.
- Prompt and schema versioning.
- Generated story metadata.
- Error behavior.
- Out-of-scope Phase 6 actions.

Update `.env.example`:

```text
OPENAI_API_KEY=
OPENAI_STORY_MODEL=
```

Acceptance:

- A reviewer can understand how story generation works.
- A future Phase 6 implementer can reuse the story service boundaries.

## Suggested Files To Add Or Update

Likely add:

```text
frontend/src/api/story.js
server/src/routes/story.js
server/src/services/openaiClient.js
server/src/services/storyGenerationService.js
server/src/services/validateSetup.js
server/src/services/validateStoryGeneration.js
server/src/prompts/storyPrompts.js
server/src/schemas/storySchemas.js
server/test/storyGeneration.test.js
docs/phase-5-story-generation.md
```

Likely update:

```text
.env.example
.gitignore
frontend/src/App.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
server/package.json
server/src/index.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/projectStore.test.js
README.md
```

Only update schema/normalizers where needed for story metadata such as `source`, `updatedAt`, `lastGeneratedAt` and `generationMeta`.

## Manual QA Checklist

### Environment

- `.env.example` includes `OPENAI_API_KEY`.
- `.env.example` includes optional `OPENAI_STORY_MODEL`, if supported.
- `.env` is ignored by Git.
- Backend starts without exposing secrets.
- Missing API key produces a clear Generate Story error.
- Frontend bundle does not contain API key text or value.

### Backend Routes

- `GET /api/health` still works.
- `GET /api/projects` still works.
- `POST /api/story/generate` exists.
- Missing `lessonId` returns JSON error.
- Missing project returns JSON `404`.
- Incomplete Setup returns JSON validation error before OpenAI call.
- Invalid learner level returns validation error.
- Valid Setup with configured key generates a story.

### Frontend Generate Story

- Create or open a lesson.
- Leave required Setup fields blank.
- Click Generate Story.
- Confirm inline Setup errors appear.
- Fill required Setup fields.
- Click Generate Story.
- Confirm button disables and loading state appears.
- Confirm user cannot double-submit.
- Confirm generated story appears in Story.
- Confirm generated sentence count matches selected sentence count.
- Confirm story is editable.
- Confirm Lock Story still works.
- Confirm Save/Open restores generated story.

### Error Safety

- Temporarily remove or unset `OPENAI_API_KEY`.
- Click Generate Story with valid Setup.
- Confirm current story remains unchanged.
- Confirm error is visible.
- Restore key.
- If possible, simulate invalid model response through tests/mocks and confirm current story remains unchanged.

### Persistence

- Generate story.
- Inspect `server/data/projects/<PROJECT_ID>/lesson.json`.
- Confirm `story.status` is `draft`.
- Confirm `story.sentences` contains generated sentence records.
- Confirm `story.lastGeneratedAt` or equivalent metadata exists.
- Confirm `story.generationMeta.level` matches selected learner level.
- Refresh browser.
- Open saved lesson.
- Confirm generated story is restored.

### Regression

- Manual sentence edit still works.
- Story lock/unlock still works.
- New Lesson still works.
- Open Existing Lesson still works.
- Duplicate Lesson still works.
- Character dummy generate/approve still works.
- Scene dummy generate/approve still works.
- Media filter still works.
- Export summary still works.

### Scope

- No sentence-level OpenAI regenerate endpoint was added.
- No sentence-level OpenAI shorten endpoint was added.
- No character extraction endpoint was added.
- No scene planning endpoint was added.
- No image generation endpoint was added.
- No ZIP export was added.
- No auth/account/cloud/Firebase flow was added.
- Frontend does not import OpenAI SDK.
- Frontend does not import `prototype/support.js`.

## Verification Commands

Run available commands:

```sh
npm run build --workspace frontend
npm run test --workspace server
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "OPENAI_API_KEY|OPENAI_STORY_MODEL" .env.example server
rg "from ['\\\"]openai['\\\"]|require\\(['\\\"]openai['\\\"]\\)" server frontend
rg "createPlaceholderStory|placeholder" frontend/src server/src docs
rg "regenerate-sentence|shorten-sentence|characters/extract|scenes/plan|images/character|images/scene|zip|firebase|auth|login|account" frontend server package.json
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
```

Real generation check, only when `.env` has a valid key:

```sh
curl -s -X POST http://127.0.0.1:3001/api/story/generate \
  -H "Content-Type: application/json" \
  -d '{"lessonId":"<PROJECT_ID>"}'
```

Replace `<PROJECT_ID>` with a saved project that has complete Setup fields.

## Phase 5 Acceptance Criteria

- Backend OpenAI SDK is installed only for the backend.
- Backend reads `OPENAI_API_KEY` from environment.
- `.env.example` documents required story-generation env vars.
- `POST /api/story/generate` exists.
- Route validates project ID/request body.
- Route validates Setup before OpenAI call.
- Prompts and level-specific rules live server-side.
- OpenAI response is structured JSON.
- Response validation runs before story replacement.
- Generated story sentence count matches Setup sentence count.
- Generated story uses approved learner level behavior.
- Generated story contains no CEFR labels.
- Generated story is saved to `lesson.json`.
- Frontend Generate Story uses backend route.
- Frontend shows loading and disabled states.
- Frontend shows backend validation/API errors.
- Existing story is preserved on failure.
- Existing Phase 1-4 behavior still works.
- No Phase 6+ or later milestone scope was added.

## Handoff To Phase 6

Phase 6 will complete the Story Builder.

Before handing off, ensure:

- Story generation service is cleanly reusable.
- Prompt and schema versions are stored in metadata.
- Sentence records have stable IDs.
- Manual edits still preserve IDs.
- Story route error behavior is consistent.
- The frontend has an obvious place for sentence-level loading/error states.
- Lock/unlock behavior still persists exact story text.

Phase 6 should add:

- Regenerate one sentence.
- Shorten one sentence.
- Regenerate whole story with overwrite warning.
- Stronger locked-master-story guarantees.
- Stale downstream behavior when story changes after lock.

## Implementation Response Format

When implementation is complete, respond with:

```md
## Summary

- ...

## Changed Files

- ...

## Verification

- ...

## OpenAI/Environment Notes

- ...

## Notes For Phase 6

- ...
```

Mention any tests, browser checks, route checks or real OpenAI generation checks that could not be completed.
