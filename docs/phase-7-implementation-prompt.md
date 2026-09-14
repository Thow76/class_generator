# Phase 7 Implementation Prompt

Use this prompt to implement Milestone 3, Phase 7 of Lesson Source Builder.

## Prompt

You are implementing Milestone 3, Phase 7 of Lesson Source Builder.

Milestone 2 produced a reliable Setup -> AI Story -> edit/regenerate/shorten -> locked master story workflow. Phase 7 begins Milestone 3 by generating editable character records from the locked master story and Setup data.

Implement Phase 7 only. Do not add character reference image generation, scene planning, scene image generation, audio/video outputs, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase or cloud sync.

## Phase 7 Goal

Create the required character cards without forcing the tutor to re-enter story information.

Done means:

- Character extraction requires a locked story.
- The backend exposes `POST /api/characters/extract`.
- The backend sends only the locked master story and relevant Setup context to OpenAI.
- OpenAI returns structured recurring human character data.
- Extracted data is validated before saving.
- Extracted characters are merged with Setup main/secondary character data.
- Existing character records, user edits, notes and approval/generated state are preserved where the character still matches.
- New required recurring characters receive stable IDs and editable character records.
- Missing or no-longer-recurring existing characters are not silently deleted.
- The Characters stage has a clear loading/error/success flow.
- The simplified character card fields remain unchanged: Name, Age / age range, Sex / gender, Background / nationality and Notes tags.
- The app does not generate images in this phase.

## Starting Point

Important existing files:

```text
frontend/src/App.jsx
frontend/src/api/story.js
frontend/src/stages/CharactersStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/src/data/constants.js
server/src/index.js
server/src/routes/story.js
server/src/services/storyGenerationService.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/openaiClient.js
server/src/prompts/storyPrompts.js
server/src/schemas/storySchemas.js
server/test/storyGeneration.test.js
server/test/storyOperations.test.js
server/test/projectStore.test.js
docs/phase-6-story-builder.md
docs/milestone-2-handoff.md
```

Recommended new files:

```text
frontend/src/api/characters.js
server/src/routes/characters.js
server/src/services/characterExtractionService.js
server/src/prompts/characterPrompts.js
server/src/schemas/characterSchemas.js
server/src/services/validateCharacterExtraction.js
server/test/characterExtraction.test.js
docs/phase-7-character-extraction.md
```

Use these names unless the codebase has a stronger local convention.

## Product Rules To Preserve

- Use only these learner levels:
  - Literacies Plus
  - Complete Beginner
  - Beginner 1
  - Beginner 1.5
  - Beginner 2
- Do not introduce CEFR labels such as A1, A2 or B1 in UI, prompts, generated user-facing text or documentation.
- Character input must remain lightweight:
  - Name
  - Age / age range
  - Sex / gender
  - Background / nationality
  - Optional reusable Notes tags
- Do not add dedicated character fields for hair, clothing, build, personality, expression, pose or visual style.
- Use the principle: minimum required input -> sensible AI defaults -> optional user overrides.
- The locked master story is authoritative for downstream generation.
- Do not use draft story text for character extraction.
- Do not silently delete existing character work.
- Keep OpenAI prompts, schemas and API keys on the backend only.
- Use structured JSON responses.

## Backend API

Add a new characters route without disturbing existing health, project or story routes.

Expected route:

```text
POST /api/characters/extract
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
    "characters": []
  }
}
```

Return the full updated lesson object to match existing story operation behavior.

Expected error behavior:

- `400` for missing or malformed `lessonId`.
- `404` for missing project.
- `422` when the story is not locked.
- `422` when the locked story snapshot is empty or invalid.
- `422` when model output fails schema/semantic validation.
- `503` for OpenAI transport/service failures.
- `500` only for unexpected server errors.

All errors should be JSON and should avoid exposing secrets or raw provider internals.

## Backend Steps

### Step 1: Register Character Routes

1. Create `server/src/routes/characters.js`.
2. Import and register the route in `server/src/index.js` under `/api/characters`.
3. Keep `GET /api/health`, project routes and story routes unchanged.
4. Use the same route error style already used by story routes where practical.

### Step 2: Build The Character Extraction Service

Create `server/src/services/characterExtractionService.js`.

The service should:

1. Validate that `lessonId` is present.
2. Load the canonical lesson with `getProject(lessonId)`.
3. Validate the lesson shape.
4. Require `lesson.story.status === "locked"`.
5. Read exact story text from `lesson.story.lockedSentences`.
6. Reject extraction if `lockedSentences` is missing, empty or invalid.
7. Build a backend prompt using Setup data and locked story sentences.
8. Call OpenAI through the existing backend OpenAI client wrapper.
9. Parse structured JSON from the model response.
10. Validate the extracted character list.
11. Merge extracted records into `lesson.characters`.
12. Save through `updateProject`.
13. Return the updated lesson.

Do not call OpenAI from the frontend.

### Step 3: Add Character Prompts

Create `server/src/prompts/characterPrompts.js`.

The prompt should instruct the model to:

- Extract recurring human characters required by the locked story.
- Include the Setup main character.
- Include Setup secondary characters only if they are present in or clearly needed by the story.
- Avoid inventing unnecessary background characters.
- Avoid extracting locations, animals, objects, organizations or generic crowds.
- Return only data that belongs in lightweight character cards.
- Preserve the app's internal learner level labels exactly if mentioned.
- Avoid CEFR labels.
- Leave unknown age, sex or background empty rather than inventing precise facts.
- Prefer broad age ranges when the story implies a life stage but not an exact age.
- Use short notes only when they help later image/story continuity.

Recommended exported constants:

```js
export const characterExtractionPromptVersion = "character-extract-v1";
export function buildCharacterExtractionPrompt(lesson) {}
```

Include:

- Theme.
- Title.
- Learner level.
- Setting.
- Scenario.
- Setup main character.
- Setup secondary character tags.
- Target vocabulary only if useful.
- Additional notes only if useful.
- Locked story sentences with stable sentence IDs and numbers.

### Step 4: Add Structured Output Schema

Create `server/src/schemas/characterSchemas.js`.

Expected structured output:

```json
{
  "characters": [
    {
      "name": "Marta",
      "role": "main",
      "age": "34",
      "sex": "Woman",
      "background": "Polish",
      "notes": ["needs appointment"],
      "storySentenceIds": ["sentence-1", "sentence-2"]
    }
  ]
}
```

Allowed `role` values should match existing app data:

```text
main
secondary
supporting
```

Allowed `sex` values should match existing constants:

```text
Woman
Man
Non-binary
Unspecified
```

Keep `storySentenceIds` optional if it complicates the current model, but prefer it in the backend validation/merge layer because it helps verify that extracted characters are grounded in the locked story. Do not add `storySentenceIds` to visible character cards unless the UI already has a natural place for it.

### Step 5: Validate Model Output

Create `server/src/services/validateCharacterExtraction.js`.

Validation should reject:

- Missing `characters` array.
- Empty character names.
- Unsupported roles.
- Unsupported sex/gender values.
- Dedicated visual/personality fields such as hair, clothing, build, expression, pose or visual style.
- Non-human or non-character entities.
- Duplicate names after normalization.
- Unsupported story sentence IDs.
- Output with CEFR labels.
- Excessively long notes.

Validation should normalize:

- Trimmed names.
- Role values.
- Sex/gender values.
- Background strings.
- Notes as short trimmed unique tags.
- Story sentence IDs as existing locked sentence IDs only.

If the model returns no recurring characters, fail with a clear validation error unless the locked story truly has no human character. For ordinary ESOL stories, at least the Setup main character should be present.

### Step 6: Merge Extracted Characters

Add a merge helper in `characterExtractionService.js` or a shared lesson update module.

Merge priorities:

1. Existing user-edited character fields should win over model output when a matching record exists.
2. Setup main character data should win over model output for the main character.
3. Setup secondary character tag names should help match and seed extracted secondary/supporting characters.
4. Model output should fill blank age, sex, background and notes.
5. Existing notes should be preserved and model notes appended as reusable tags when useful.
6. Existing `generationStatus`, `generationCount`, `imagePath`, `approved`, `stale`, `staleReason` and `staleAt` should be preserved for matching characters.
7. Characters no longer found by extraction should not be deleted automatically.
8. If an existing generated or approved character no longer appears in extraction, mark it stale or leave it with a clear stale reason instead of deleting it.

Matching rules:

- Match first by exact normalized name.
- Also match Setup main character by role/name.
- Use case-insensitive matching.
- Ignore extra whitespace and simple punctuation differences where practical.
- Do not merge two different people just because their roles match.

Stable ID rules:

- Preserve existing IDs for matched characters.
- Generate safe stable IDs for new characters, such as `character-marta`.
- If a generated ID already exists, append a numeric suffix.
- IDs must pass backend `validateLesson` safe ID rules.
- Do not reuse deleted IDs if avoidable.

Recommended character record shape:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "role": "main",
  "age": "34",
  "sex": "Woman",
  "background": "Polish",
  "notes": ["appointment"],
  "generationStatus": "not_started",
  "generationCount": 0,
  "imagePath": null,
  "approved": false,
  "stale": false
}
```

Do not set `generationStatus` to `generated` for extracted text records. In the existing UI that status represents the image/reference placeholder state. Phase 8 will replace that behavior with real character reference image generation.

### Step 7: Update Lesson Validation And Normalization

Update server and frontend validation only as needed.

Confirm:

- Character IDs are safe stable IDs.
- Character roles are valid.
- Character `generationStatus` remains one of existing generation statuses.
- Character `notes` is an array.
- Character records remain serializable.
- Unknown future fields are not silently discarded by save/open normalization.

Avoid broad schema rewrites. Phase 7 should attach extraction metadata to the existing lesson object rather than replacing the character model.

Optional metadata:

```json
{
  "charactersMeta": {
    "lastExtractedAt": "2026-09-09T12:00:00.000Z",
    "promptVersion": "character-extract-v1",
    "schemaVersion": "character-extract-v1",
    "model": "gpt-5-mini",
    "sourceStoryLockedAt": "2026-09-09T11:55:00.000Z"
  }
}
```

Only add metadata if it can be normalized, validated and preserved cleanly. Do not make metadata visible unless useful.

## Frontend Steps

### Step 1: Add Character API Client

Create `frontend/src/api/characters.js` with:

```js
export async function extractCharacters(lessonId) {}
```

Follow the existing API client error handling style.

### Step 2: Add Characters Stage Extraction Flow

Update `frontend/src/App.jsx` and `frontend/src/stages/CharactersStage.jsx`.

Add:

- Extract Characters from Story action.
- Loading state.
- Error state.
- Success state or save status update.
- Disabled state when story is not locked.
- Disabled state while project save/load/story operations are active.

Recommended behavior:

1. User completes and locks the story.
2. User opens Characters stage.
3. User clicks Extract Characters.
4. Frontend saves the current project if needed.
5. Frontend calls `POST /api/characters/extract`.
6. Backend returns updated lesson.
7. Frontend normalizes and validates the lesson.
8. Character cards render from `lesson.characters`.
9. Save status reflects backend-saved state.

If the story is not locked:

- Show a clear inline message in the Characters stage.
- Do not call the backend.
- Guide the user back to Story using existing navigation patterns if available.

### Step 3: Preserve Existing Character Editing

Existing character card editing should continue to work:

- Name.
- Age / age range.
- Sex / gender.
- Background / nationality.
- Notes tags.
- Reusable background list.
- Reusable note tags.
- Use this character / approve placeholder action.

The existing dummy `Generate character` placeholder should not become real image generation in Phase 7. If needed, keep it as a placeholder/local state action until Phase 8.

### Step 4: Handle Re-Extraction Safely

If the user clicks Extract Characters again:

- Do not delete existing characters automatically.
- Preserve user edits for matched characters.
- Add newly discovered recurring characters.
- Mark unmatched generated/approved characters stale instead of deleting them.
- Consider showing a confirmation if extraction might update existing records.
- Keep the flow simple and consistent with existing confirmation patterns.

## UI Requirements

- Keep the existing Characters screen layout.
- Do not turn Characters into a dashboard or marketing screen.
- Add the extraction action near the Characters stage header or as a compact panel.
- Keep button and status styling consistent with the current app.
- Do not add large explanatory blocks of in-app text.
- Use concise status/error copy.
- Avoid overlapping controls and card content on mobile and desktop.
- Character cards should remain editable after extraction.

Suggested in-app labels:

```text
Extract characters
Extracting characters...
Lock the story before extracting characters.
Character extraction failed. Try again.
```

Do not use labels that imply image generation, such as "Generate reference image", in Phase 7.

## Backend Tests

Add focused tests in `server/test/characterExtraction.test.js`.

Cover:

- Missing `lessonId` is rejected.
- Missing project is rejected.
- Draft story is rejected.
- Locked story with empty locked snapshot is rejected.
- Valid extraction creates character records.
- Setup main character is included and prefilled.
- Setup main character fields win over model output.
- Setup secondary character names merge with extracted records.
- Existing matching character ID is preserved.
- Existing matching notes are preserved.
- Existing generated/approved/image placeholder state is preserved for matching characters.
- Existing unmatched generated/approved characters are not deleted.
- Duplicate extracted names are rejected or de-duped safely.
- Non-human entities are rejected.
- Disallowed dedicated fields are rejected.
- Unsupported sex/role values are rejected.
- Invalid story sentence references are rejected.
- Invalid model output does not mutate the saved project.
- API key missing behavior remains typed and backend-only.

Use mocked OpenAI responses. Do not require live OpenAI calls for automated tests.

## Frontend Tests Or Manual Checks

If a frontend test runner exists, add tests for:

- Extract button disabled when story is draft.
- Extract button enabled when story is locked.
- Loading state appears while extraction is in flight.
- Returned lesson updates character cards.
- API errors do not clear existing characters.
- Project action guards still work during active model operations.

If no frontend test runner exists, perform manual browser checks and document what was not automated.

Manual QA checklist:

1. Start the app.
2. Open or create a lesson.
3. Complete Setup.
4. Generate a story.
5. Lock the story.
6. Navigate to Characters.
7. Click Extract Characters.
8. Confirm character cards appear for recurring human characters.
9. Confirm the main character is prefilled from Setup.
10. Confirm secondary characters are merged when they appear in the locked story.
11. Edit a character field and add a note.
12. Save, refresh and reopen.
13. Confirm character edits and notes persist.
14. Re-run extraction and confirm the edited fields are not overwritten.
15. Confirm no character reference images are generated.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run build --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "characters/extract|extractCharacters|characterExtraction|character-extract" frontend/src server/src server/test docs
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "OPENAI_API_KEY|OPENAI_STORY_MODEL|OPENAI_CHARACTER_MODEL" .env.example server
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "hair|clothing|build|personality|expression|pose|visual style" frontend/src server/src docs
rg "images/character|images/scene|/api/images|scenes/plan|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

If route-level curl checks are possible, also verify:

```sh
curl -s -X POST http://127.0.0.1:3001/api/characters/extract \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: JSON error for missing `lessonId`.

Do not run live OpenAI calls unless the environment has an API key and the user explicitly wants a live smoke test.

## Documentation

Add `docs/phase-7-character-extraction.md` or update equivalent docs with:

- The `POST /api/characters/extract` contract.
- The locked-story requirement.
- The character merge rules.
- The structured output shape.
- What remains out of scope for Phase 8+.
- Any verification that was run.

## Acceptance Criteria

- `POST /api/characters/extract` exists and returns JSON.
- Extraction requires a locked story.
- Extraction uses `story.lockedSentences`, not draft story text.
- Extracted output is structured and validated before save.
- Invalid model output does not mutate the project.
- Main character Setup data is preserved and merged.
- Secondary character Setup data helps seed matching records.
- New recurring human characters receive stable safe IDs.
- Existing matching characters keep their IDs and user edits.
- Existing generated/approved/image placeholder state is not wiped for matching characters.
- Existing unmatched characters are not silently deleted.
- Character cards render from the updated persisted lesson object.
- Character edits after extraction still save/open correctly.
- API key remains backend-only.
- No character image generation is added.
- No scene planning or scene image generation is added.
- No Milestone 4 export/audio/video scope is added.
- Server tests pass.
- Frontend build passes.

## Handoff Notes

Phase 7 should make the Characters stage data-driven from the locked story without starting image generation.

The clean path is:

1. Locked story is the source.
2. Backend extracts recurring human characters.
3. Backend validates and merges with Setup/existing records.
4. Frontend renders editable character cards from the saved lesson.

The next phase, Phase 8, can generate approved visual references from these records. Keep Phase 7 intentionally text-only so character identity and merge behavior are reliable before images enter the workflow.
