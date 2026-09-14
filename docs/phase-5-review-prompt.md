# Phase 5 Review Prompt

Use this prompt to review whether Milestone 2, Phase 5 of Lesson Source Builder was implemented correctly. The review should verify backend-only OpenAI story generation from validated Setup data.

## Prompt

You are reviewing Milestone 2, Phase 5 of the Lesson Source Builder implementation.

Your job is to verify that the app now supports the first real OpenAI feature: Generate Story. The backend should load the canonical saved lesson, validate Setup, call OpenAI using a backend-only API key, require structured JSON output, validate the generated story, save it to `lesson.json`, and return the updated lesson to the frontend. The frontend should call the backend route, show loading/error states, and preserve existing story data on failure.

Review Phase 5 only. Do not require sentence-level regenerate, sentence-level shorten, whole-story regenerate warnings, character extraction, scene planning, image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase or cloud sync.

## Phase 5 Goal

Turn valid Setup data into a real editable story draft using backend-only OpenAI integration.

The implementation is correct only if:

- `OPENAI_API_KEY` is documented in `.env.example`.
- `.env` is ignored.
- OpenAI SDK usage exists only in backend code.
- Frontend code never imports OpenAI or receives the API key.
- `POST /api/story/generate` exists.
- The story route accepts a saved lesson/project ID.
- The backend loads the canonical lesson from local project storage.
- Backend Setup validation runs before any OpenAI call.
- Server-side prompts include the approved internal learner-level rules.
- OpenAI output is requested as structured JSON.
- Generated output is validated before story replacement.
- Existing story is preserved on OpenAI or validation failure.
- Generated story is saved to `lesson.story.sentences`.
- Story status becomes `draft`.
- Generation metadata is stored.
- The updated lesson is persisted to `lesson.json`.
- Frontend Generate Story calls the backend route.
- Frontend shows loading, disabled and error states.
- Existing Phase 1-4 behavior still works.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-5-implementation-prompt.md
docs/phase-5-story-generation.md
.env.example
.gitignore
frontend/src/api/story.js
frontend/src/App.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/utils/validateSetup.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
server/package.json
server/src/index.js
server/src/routes/story.js
server/src/services/openaiClient.js
server/src/services/storyGenerationService.js
server/src/services/validateSetup.js
server/src/services/validateStoryGeneration.js
server/src/prompts/storyPrompts.js
server/src/schemas/storySchemas.js
server/src/services/projectStore.js
server/test/storyGeneration.test.js
server/test/projectStore.test.js
```

File names may differ, but the implementation should clearly separate:

- Backend OpenAI client creation.
- Backend prompt construction.
- Backend response format/schema.
- Backend generated-output validation.
- Backend story generation service.
- Backend story route.
- Frontend story API client.
- Frontend generation loading/error UI.
- Phase 5 documentation.

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
rg "OPENAI_API_KEY|OPENAI_STORY_MODEL" .env.example server docs
rg "from ['\\\"]openai['\\\"]|require\\(['\\\"]openai['\\\"]\\)" server frontend
rg "responses\\.create|text:\\s*\\{|format:|json_schema|storyGenerationResponseFormat" server/src
rg "story-generate-v1|story-sentences-v1|generationMeta|lastGeneratedAt|source: \"generated\"" server/src frontend/src docs
rg "createPlaceholderStory|placeholder" frontend/src server/src docs
rg "regenerate-sentence|shorten-sentence|characters/extract|scenes/plan|images/character|images/scene|zip|firebase|auth|login|account" frontend server package.json
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
```

Expected development URLs:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
Story generation: http://127.0.0.1:3001/api/story/generate
```

## API Contract To Verify

The backend should expose:

```text
POST /api/story/generate
```

Recommended request:

```json
{
  "lessonId": "lesson-20260905-abc123"
}
```

Expected success response:

```json
{
  "lesson": {}
}
```

The returned `lesson` should be the full updated persisted lesson.

Expected error responses:

- `400` for missing or malformed request body.
- `404` for missing project.
- `422` for incomplete Setup, locked story, invalid lesson shape or invalid generated story.
- `503` or project-standard error for missing API key or OpenAI failure.

Errors should be JSON:

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

## Review Steps

1. Read `docs/phase-5-implementation-prompt.md`.
2. Read `docs/phase-5-story-generation.md`.
3. Inspect `.env.example` and `.gitignore`.
4. Confirm `OPENAI_API_KEY` is documented and `.env` is ignored.
5. Inspect `server/package.json`.
6. Confirm the OpenAI SDK is installed only in the backend package.
7. Inspect `server/src/services/openaiClient.js`.
8. Confirm the client reads environment variables backend-side only.
9. Confirm missing API key produces a typed/readable error without a network call.
10. Inspect `server/src/prompts/storyPrompts.js`.
11. Confirm prompts are server-side and versioned.
12. Confirm prompts include all approved learner-level rules.
13. Confirm prompts require structured JSON, exact sentence count, no Markdown, no embedded numbering and no CEFR labels.
14. Inspect `server/src/schemas/storySchemas.js`.
15. Confirm the OpenAI response format/schema requires a `sentences` array with text values.
16. Inspect `server/src/services/validateSetup.js`.
17. Confirm backend Setup validation matches Phase 4 required fields.
18. Inspect `server/src/services/validateStoryGeneration.js`.
19. Confirm generated story validation rejects bad count, empty text, numbering, Markdown bullets, blank lines, duplicates and external level labels.
20. Inspect `server/src/services/storyGenerationService.js`.
21. Confirm it loads the saved lesson from project storage.
22. Confirm it validates lesson shape and Setup before calling OpenAI.
23. Confirm it replaces the story only after model output validates.
24. Confirm it saves through `projectStore`.
25. Confirm existing story data remains unchanged on model/API/validation failure.
26. Inspect `server/src/routes/story.js`.
27. Confirm `POST /api/story/generate` returns JSON success and JSON errors.
28. Inspect `frontend/src/api/story.js`.
29. Confirm the frontend only sends `lessonId` or an approved payload to the backend and does not know about OpenAI.
30. Inspect `frontend/src/App.jsx` and `frontend/src/stages/SetupStage.jsx`.
31. Confirm Generate Story validates Setup locally, saves/creates a project if needed, calls backend generation, disables double-submit and shows errors.
32. Inspect `frontend/src/stages/StoryStage.jsx`.
33. Confirm generated story displays as editable ordered sentence cards.
34. Run backend tests.
35. Build frontend.
36. If a valid `.env` key is available, run one real generation check.
37. If no key is available, verify missing-key behavior and rely on mocked tests for generation service behavior.
38. Search for accidental Phase 6+ or later milestone scope.
39. Search for frontend OpenAI imports and leaked API keys.

## Acceptance Checklist

Mark each item Pass, Fail, or Not Applicable.

| Item | Result | Evidence |
| --- | --- | --- |
| `.env.example` includes `OPENAI_API_KEY` |  |  |
| `.env.example` includes optional model config if supported |  |  |
| `.env` is ignored |  |  |
| Backend starts without exposing secrets |  |  |
| Health/project routes work without API key |  |  |
| OpenAI SDK is installed only in backend package |  |  |
| Frontend does not import OpenAI SDK |  |  |
| Frontend bundle cannot expose API key |  |  |
| Backend OpenAI client wrapper exists |  |  |
| Missing API key returns clear error |  |  |
| `POST /api/story/generate` exists |  |  |
| Story route accepts lesson/project ID |  |  |
| Story route rejects missing `lessonId` |  |  |
| Story route returns JSON on success |  |  |
| Story route returns JSON on errors |  |  |
| Missing project returns `404` |  |  |
| Incomplete Setup returns validation error before OpenAI call |  |  |
| Locked story is blocked or safely handled |  |  |
| Backend loads canonical lesson from project storage |  |  |
| Backend validates full lesson shape before generation |  |  |
| Backend validates Setup before generation |  |  |
| Prompts live only in backend code |  |  |
| Prompt version is defined |  |  |
| Schema version is defined |  |  |
| Prompts include Theme, Setting and Scenario |  |  |
| Prompts include learner level |  |  |
| Prompts include main character fields |  |  |
| Prompts include optional secondary characters/vocabulary/notes when present |  |  |
| Prompts include Literacies Plus rules |  |  |
| Prompts include Complete Beginner rules |  |  |
| Prompts include Beginner 1 rules |  |  |
| Prompts include Beginner 1.5 rules |  |  |
| Prompts include Beginner 2 rules |  |  |
| Prompt forbids Markdown/commentary |  |  |
| Prompt forbids embedded numbering |  |  |
| Prompt avoids user-facing CEFR labels |  |  |
| OpenAI call requests structured JSON output |  |  |
| Model output parser handles expected Responses API output |  |  |
| Story output validator exists |  |  |
| Validator rejects wrong sentence count |  |  |
| Validator rejects empty sentence text |  |  |
| Validator rejects embedded numbering |  |  |
| Validator rejects Markdown bullets |  |  |
| Validator rejects blank lines |  |  |
| Validator rejects duplicate sentences unless explicitly allowed |  |  |
| Validator rejects external learner/proficiency labels |  |  |
| Existing story is preserved on invalid model output |  |  |
| Existing story is preserved on OpenAI failure |  |  |
| Generated story writes ordered sentence records |  |  |
| Generated story uses stable sentence IDs |  |  |
| Generated sentence records include source/updated metadata if schema expects it |  |  |
| Story status is set to `draft` after generation |  |  |
| Story lock metadata is handled safely |  |  |
| `lastGeneratedAt` or equivalent metadata is stored |  |  |
| `generationMeta.model` is stored |  |  |
| `generationMeta.promptVersion` is stored |  |  |
| `generationMeta.schemaVersion` is stored |  |  |
| `generationMeta.level` matches selected learner level |  |  |
| `generationMeta.sentenceCount` matches Setup sentence count |  |  |
| Generated story is persisted to `lesson.json` |  |  |
| Refresh/open restores generated story |  |  |
| Frontend story API client exists |  |  |
| Frontend Generate Story calls backend route |  |  |
| Frontend validates Setup before request |  |  |
| Frontend saves/creates active project before request if needed |  |  |
| Generate Story button disables while generating |  |  |
| Loading state is visible |  |  |
| Backend validation/API errors are visible |  |  |
| Current story remains visible on error |  |  |
| Generated story appears in Story stage |  |  |
| Generated story remains editable |  |  |
| Existing Story lock/unlock still works |  |  |
| Existing New/Open/Duplicate/Save still works |  |  |
| Existing character dummy flow still works |  |  |
| Existing scene dummy flow still works |  |  |
| Existing Media/Export screens still work |  |  |
| No Phase 6 sentence-regenerate endpoint was added |  |  |
| No Phase 6 sentence-shorten endpoint was added |  |  |
| No character extraction endpoint was added |  |  |
| No scene planning endpoint was added |  |  |
| No image generation endpoint was added |  |  |
| No ZIP export was added |  |  |
| No account/auth/cloud/Firebase flow was added |  |  |
| Production frontend does not import `prototype/support.js` |  |  |

## Required Setup Fields To Verify

Backend generation gating should require:

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

Optional fields should be included in prompts when present but should not block generation:

```text
title
setup.secondaryCharacters
setup.targetVocabulary
setup.additionalNotes
```

## Story Data Checks

After successful generation, inspect `server/data/projects/<PROJECT_ID>/lesson.json`.

Confirm:

```text
story.status = "draft"
story.sentences.length = lesson.sentenceCount
story.sentences[*].id
story.sentences[*].number
story.sentences[*].text
story.sentences[*].source = "generated"
story.sentences[*].updatedAt
story.lastGeneratedAt
story.generationMeta.model
story.generationMeta.promptVersion
story.generationMeta.schemaVersion
story.generationMeta.level
story.generationMeta.sentenceCount
currentStage = "story"
```

Confirm generated story text does not include:

- Markdown bullets.
- Embedded numbering such as `1.` or `1)`.
- CEFR labels.
- Blank strings.
- Duplicate sentences.
- Extra assistant commentary.

## Manual App Flow To Verify

Run the app, then complete this path:

1. Create a new lesson.
2. Leave required Setup fields blank.
3. Click Generate Story.
4. Confirm inline Setup errors appear and no backend generation happens.
5. Complete required Setup fields.
6. Select one approved learner level.
7. Save the lesson or let the Generate Story flow create/save it.
8. Click Generate Story.
9. Confirm button disables and loading text appears.
10. Confirm the app navigates to Story on success.
11. Confirm generated sentence count matches Setup sentence count.
12. Edit one generated sentence manually.
13. Lock the story.
14. Save if needed.
15. Refresh browser.
16. Open the lesson.
17. Confirm the generated/edited/locked story is restored.
18. Duplicate the lesson.
19. Confirm duplicate opens and story data is preserved.

## Error-Safety Checks

Verify:

- Missing `OPENAI_API_KEY` returns a clear error.
- Missing `lessonId` returns `400`.
- Missing project returns `404`.
- Incomplete Setup returns validation details.
- Invalid learner level is rejected before OpenAI.
- Invalid sentence count is rejected before OpenAI.
- Invalid model output does not overwrite the current story.
- OpenAI failure does not overwrite the current story.
- Frontend shows the error and leaves existing lesson state visible.

Use mocked tests where possible; do not require real network calls in automated tests.

## Real Generation Check

Only run this if a valid local `.env` is configured.

```sh
curl -s -X POST http://127.0.0.1:3001/api/story/generate \
  -H "Content-Type: application/json" \
  -d '{"lessonId":"<PROJECT_ID>"}'
```

Replace `<PROJECT_ID>` with a saved project whose Setup is complete.

If no key is available, do not fail the implementation solely for skipping real generation. Verify the missing-key path and mocked service tests instead.

## Secret-Safety Checks

Verify:

- No API key value is checked into files.
- `.env` is ignored.
- The frontend does not import `openai`.
- The frontend does not mention `OPENAI_API_KEY`.
- Server logs do not print API keys.
- Error responses do not include API keys.
- Error responses do not include full prompt text unless explicitly intended for local developer debugging.

## Scope-Control Review

Flag findings if Phase 5 adds:

- Sentence-level regenerate endpoint.
- Sentence-level shorten endpoint.
- Whole-story regenerate endpoint or overwrite workflow.
- Character extraction.
- Scene planning API.
- Image generation route.
- Audio scripts.
- Video prompts.
- ZIP export.
- PowerPoint or worksheet generation.
- Firebase.
- Hosted auth.
- User accounts.
- Cloud sync.

Placeholders, TODOs or documentation references to Phase 6+ are acceptable if they do not implement real later-phase behavior.

## Code Review Focus

Prioritize findings in these areas:

- API key exposed to frontend.
- OpenAI client created in frontend.
- Story route can overwrite current story before model output validates.
- Setup validation missing on backend.
- Generated output validation too weak.
- Wrong sentence count can be saved.
- Missing API key crashes the server or frontend.
- Errors clear existing story data.
- Generated story is not persisted.
- Frontend marks story as saved when backend save failed.
- Prompt omits learner-level rules.
- Generated story can contain CEFR labels or numbering.
- Phase 6+ scope was implemented prematurely.
- Existing save/open/duplicate or lock/unlock behavior regressed.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```md
# Phase 5 Review

## Findings

- [P0/P1/P2/P3] Title
  - File/path:
  - Evidence:
  - Why it matters:
  - Recommended fix:

## Acceptance Summary

- Environment/secrets:
- Backend story route:
- Prompt/schema/versioning:
- Setup and output validation:
- Persistence:
- Frontend Generate Story flow:
- Error safety:
- Regression checks:
- Scope control:

## Open Questions

- ...

## Verdict

Pass/Fail with a one-paragraph explanation.
```

If there are no findings, say so clearly and include any residual risks or checks that could not be performed, such as no valid API key for a live generation test.

## Severity Guidance

- P0: Phase 5 cannot run or cannot be meaningfully reviewed, for example frontend/backend startup fails completely.
- P1: Major Phase 5 requirement missing or unsafe, for example API key exposure, no story route, no backend Setup validation, invalid model output overwrites story, or generated story is not persisted.
- P2: Important generation, validation, UX or scope issue, for example weak output validation, unclear frontend errors, missing metadata, or accidental Phase 6 endpoint.
- P3: Minor clarity, naming, documentation or polish issue.

## Non-Goals For This Review

Do not fail Phase 5 because it lacks:

- Regenerate one sentence.
- Shorten one sentence.
- Regenerate whole story.
- Stronger lock-story exactness beyond existing behavior.
- Character extraction from locked story.
- Scene planning API.
- Real character images.
- Real scene images.
- Audio/video prompt generation.
- ZIP lesson source pack export.
- PowerPoint or worksheet generation.
- Accounts or cloud sync.

Those belong to Phase 6 or later milestones.
