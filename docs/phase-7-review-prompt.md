# Phase 7 Review Prompt

Use this prompt to review whether Milestone 3, Phase 7 of Lesson Source Builder was implemented correctly. The review should verify character extraction from the locked master story only.

## Prompt

You are reviewing Milestone 3, Phase 7 of the Lesson Source Builder implementation.

Your job is to verify that Phase 7 correctly creates editable character records from the locked master story and Setup data. The implementation should add backend-backed character extraction, structured output validation, safe merging into existing character records, and a clear Characters-stage frontend flow.

Review Phase 7 only. Do not require character reference image generation, scene planning, scene image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase or cloud sync.

## Phase 7 Goal

Create the required character cards without forcing the tutor to re-enter story information.

The implementation is correct only if:

- Character extraction requires a locked story.
- Extraction uses `story.lockedSentences`, not draft story text.
- The backend exposes `POST /api/characters/extract`.
- OpenAI calls, prompts, schemas and API keys remain backend-only.
- The model response is structured JSON and is validated before saving.
- Extracted recurring human characters are merged with Setup main/secondary character information.
- Setup main character values win over conflicting model output.
- Existing matching character IDs, tutor edits, notes, approval state, placeholder generation state and image path are preserved.
- New recurring characters receive safe stable IDs.
- Existing unmatched generated or approved characters are retained and marked stale rather than silently deleted.
- Character cards remain lightweight: Name, Age / age range, Sex / gender, Background / nationality and Notes tags.
- The Characters stage shows clear loading and error states.
- Existing save/open/duplicate and Phase 6 story behavior still works.
- No Phase 8+ or Milestone 4 scope was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-7-implementation-prompt.md
docs/phase-7-character-extraction.md
frontend/src/api/characters.js
frontend/src/App.jsx
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
server/src/services/validateCharacterExtraction.js
server/src/prompts/characterPrompts.js
server/src/schemas/characterSchemas.js
server/src/services/openaiClient.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/characterExtraction.test.js
```

File names may differ, but the implementation should clearly separate:

- Backend character routes.
- Backend extraction and merge service logic.
- Backend prompts and structured output schemas.
- Backend generated-output validation.
- Frontend character API client.
- Frontend Characters-stage extraction UI state.
- Lesson validation/normalization changes.
- Phase 7 documentation.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
find server/src server/test frontend/src docs -maxdepth 4 -type f | sort
npm run test --workspace server
npm run build --workspace frontend
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/characters/extract -H "Content-Type: application/json" -d '{}'
rg "characters/extract|extractCharacters|characterExtraction|character-extract" frontend/src server/src server/test docs
rg "lockedSentences|story\\.sentences|story\\.status|lockedAt" server/src/services/characterExtractionService.js server/src/prompts/characterPrompts.js server/src/services/validateCharacterExtraction.js
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "OPENAI_API_KEY|OPENAI_STORY_MODEL|OPENAI_CHARACTER_MODEL" .env.example server
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "hair|clothing|build|personality|expression|pose|visual style" frontend/src server/src docs
rg "images/character|images/scene|/api/images|scenes/plan|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
```

Expected local URLs if the app is running:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
```

## API Contract To Verify

The backend should expose:

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

The success response should include the full updated lesson object, consistent with existing story routes.

Expected error behavior:

- Missing `lessonId` returns JSON `400`.
- Malformed project IDs return JSON `400`.
- Missing projects return JSON `404`.
- Draft or unlocked stories return JSON `422`.
- Locked stories with no usable locked sentence snapshot return JSON `422`.
- Malformed model output returns JSON `422` and does not mutate the saved project.
- OpenAI transport/service failures return JSON `503`.
- Unexpected failures return JSON `500` without leaking secrets or raw provider internals.

## Review Steps

1. Read `docs/phase-7-implementation-prompt.md`.
2. Read `docs/phase-7-character-extraction.md`.
3. Inspect `server/src/index.js`.
4. Confirm character routes are registered under `/api/characters`.
5. Confirm health, project and story routes are not disturbed.
6. Inspect `server/src/routes/characters.js`.
7. Confirm `POST /extract` or `POST /api/characters/extract` validates `lessonId`.
8. Confirm route errors are JSON with appropriate status codes.
9. Inspect `server/src/services/characterExtractionService.js`.
10. Confirm the service loads the canonical saved lesson from `projectStore`.
11. Confirm the service validates lesson shape before mutation.
12. Confirm extraction requires `lesson.story.status === "locked"`.
13. Confirm extraction reads from `story.lockedSentences`.
14. Confirm extraction does not read from editable draft `story.sentences` except for validation/migration checks.
15. Confirm empty or invalid locked snapshots are rejected.
16. Confirm OpenAI is called through the backend client wrapper only.
17. Confirm invalid model output is parsed/validated before any save occurs.
18. Confirm successful extraction saves through `updateProject`.
19. Confirm returned lesson has `currentStage` set appropriately, usually `characters`.
20. Inspect `server/src/prompts/characterPrompts.js`.
21. Confirm prompts are server-side and versioned.
22. Confirm prompts include the locked story sentence IDs, numbers and exact text.
23. Confirm prompts include relevant Setup context.
24. Confirm prompts instruct the model to avoid unnecessary invented characters.
25. Confirm prompts ask for lightweight card fields only.
26. Confirm prompts do not include CEFR labels.
27. Inspect `server/src/schemas/characterSchemas.js`.
28. Confirm structured output schema has a version.
29. Confirm schema requires a `characters` array.
30. Confirm schema limits fields to the Phase 7 contract.
31. Inspect `server/src/services/validateCharacterExtraction.js`.
32. Confirm validation rejects missing or empty character names.
33. Confirm validation rejects unsupported roles.
34. Confirm validation rejects unsupported sex/gender values.
35. Confirm validation rejects duplicate normalized names or safely de-dupes them with clear logic.
36. Confirm validation rejects unsupported story sentence IDs.
37. Confirm validation rejects non-character entities.
38. Confirm validation rejects disallowed dedicated visual/personality fields.
39. Confirm validation rejects external proficiency labels such as CEFR labels.
40. Confirm notes are trimmed, bounded and de-duped.
41. Confirm unknown age, sex and background values can remain blank or `Unspecified`.
42. Inspect character merge logic.
43. Confirm Setup main character is included even if model output omits or conflicts with it.
44. Confirm Setup main character age, sex and background win over model output.
45. Confirm Setup secondary names help seed matching secondary records.
46. Confirm existing matching records keep their stable IDs.
47. Confirm existing tutor-edited fields are not overwritten by model output.
48. Confirm existing notes are preserved and new notes are appended safely.
49. Confirm existing `generationStatus`, `generationCount`, `imagePath`, `approved`, `stale`, `staleReason` and `staleAt` are preserved for matched records.
50. Confirm new characters get safe stable IDs.
51. Confirm ID collisions are handled with suffixes or equivalent safe logic.
52. Confirm extracted text records do not set image/reference `generationStatus` to `generated`.
53. Confirm unmatched generated/approved characters are preserved and marked stale.
54. Confirm unmatched ungenerated characters are not silently deleted unless a clear documented policy says otherwise.
55. Inspect `server/src/services/validateLesson.js` and server normalization.
56. Confirm any Phase 7 metadata is normalized and preserved.
57. Confirm character records remain serializable JSON.
58. Confirm unknown future fields are not unnecessarily discarded.
59. Inspect `frontend/src/api/characters.js`.
60. Confirm the frontend calls only the backend route and does not import OpenAI.
61. Confirm frontend API errors are surfaced clearly.
62. Inspect `frontend/src/App.jsx`.
63. Confirm extraction saves current project state before calling the backend when needed.
64. Confirm returned lessons are normalized and validated before being applied.
65. Confirm API errors do not clear existing characters.
66. Confirm save status is correct after backend-saved extraction.
67. Confirm project switching/concurrent model-operation guards still protect active operations.
68. Inspect `frontend/src/stages/CharactersStage.jsx`.
69. Confirm the Extract Characters action is visible but compact.
70. Confirm the action is disabled or guarded while the story is not locked.
71. Confirm the action is disabled while project/story model operations are active.
72. Confirm loading, success and error states are clear.
73. Confirm existing character card fields remain lightweight.
74. Confirm no new dedicated visual/personality fields were added.
75. Confirm dummy/local Generate Character behavior did not become real image generation.
76. Confirm reusable backgrounds and note tags still work.
77. Confirm character edits still mark the lesson unsaved and persist after save/open.
78. Run backend tests.
79. Build frontend.
80. Perform route-level JSON error checks.
81. If a valid API key is available and the user wants it, perform one live extraction smoke test.
82. If no key is available, verify missing-key behavior and rely on mocked tests.
83. Manually exercise the Characters stage in the browser if possible.

## Backend Test Expectations

`server/test/characterExtraction.test.js` or equivalent should cover:

- Missing `lessonId`.
- Missing project.
- Draft story rejection.
- Locked story with empty or invalid locked snapshot rejection.
- Valid extraction creates editable character records.
- Setup main character is included.
- Setup main character fields win over model output.
- Setup secondary names merge with extracted records.
- Existing matching character ID is preserved.
- Existing matching notes are preserved.
- Existing generated/approved/image placeholder state is preserved.
- Existing unmatched generated/approved characters are retained and marked stale.
- Duplicate extracted names are rejected or de-duped safely.
- Non-character entities are rejected.
- Disallowed dedicated fields are rejected.
- Unsupported sex/role values are rejected.
- Invalid story sentence references are rejected.
- Invalid model output does not mutate the saved project.
- Missing API key behavior remains typed and backend-only.

Tests should use mocked OpenAI responses. Live OpenAI calls should not be required for automated tests.

## Manual QA Checklist

Use a project with completed Setup and a locked story.

1. Start the app.
2. Confirm `GET /api/health` returns JSON.
3. Confirm `GET /api/projects` returns JSON.
4. Open or create a lesson.
5. Complete Setup with a main character and at least one secondary character.
6. Generate or manually create a story.
7. Lock the story.
8. Navigate to Characters.
9. Confirm Extract Characters is enabled only after lock.
10. Click Extract Characters.
11. Confirm loading state appears and controls do not overlap.
12. Confirm character cards appear after success.
13. Confirm the main character is prefilled from Setup.
14. Confirm secondary character tags merge when relevant.
15. Edit a character name, age, sex, background and note.
16. Save, refresh and reopen.
17. Confirm character edits persist.
18. Re-run extraction.
19. Confirm matching edited fields are not overwritten.
20. Confirm generated/approved placeholder state is not wiped for matched characters.
21. Confirm unmatched generated/approved characters are retained with stale status.
22. Confirm API errors do not clear existing characters.
23. Confirm no character images are generated.
24. Confirm scene planning is not introduced.

## Targeted Regression Scenarios

### Locked Story Source

Create a lesson where `story.sentences` differs from `story.lockedSentences` after unlock/relock history. Extraction must use `lockedSentences` only.

Expected:

- Prompt input includes locked sentence text.
- Prompt input does not use divergent draft text as the extraction source.
- Extracted `storySentenceIds` reference locked sentence IDs.

### Setup Main Character Conflict

Use Setup:

```json
{
  "mainCharacter": {
    "name": "Marta",
    "age": "34",
    "sex": "Woman",
    "background": "Polish"
  }
}
```

Return model output with conflicting values:

```json
{
  "characters": [
    {
      "name": "Marta",
      "role": "main",
      "age": "40",
      "sex": "Unspecified",
      "background": "Spanish",
      "notes": []
    }
  ]
}
```

Expected:

- Saved character uses age `34`.
- Saved character uses sex `Woman`.
- Saved character uses background `Polish`.

### Existing Character Preservation

Start with an existing matched character:

```json
{
  "id": "character-custom-marta",
  "name": "Marta",
  "age": "mid 30s",
  "background": "Polish community",
  "notes": ["clear face"],
  "generationStatus": "generated",
  "generationCount": 2,
  "imagePath": "/tmp/marta.png",
  "approved": true
}
```

Expected after extraction:

- ID remains `character-custom-marta`.
- Existing notes remain.
- Generated/approved/image placeholder fields remain.
- User edits are not overwritten unexpectedly.

### Invalid Output Preservation

Return invalid model output, such as duplicate names or unsupported fields.

Expected:

- Route returns a validation error.
- Existing `lesson.characters` on disk is unchanged.
- Frontend keeps existing cards visible.

## Scope Control Checks

Fail the review if Phase 7 adds any of the following implementation scope:

- Real character reference image generation.
- Image API calls.
- Scene planning routes.
- Scene image generation.
- Audio or video prompt generation.
- ZIP export.
- PowerPoint or worksheet generation.
- Accounts, login, Firebase or cloud sync.
- Dedicated character visual/personality fields.
- CEFR labels in app/prompt/docs paths under review.

Documentation may mention future phases as out of scope, but implementation files should not add those behaviors.

## Common Failure Modes

Look specifically for:

- Extraction allowed from draft stories.
- Prompt built from `story.sentences` instead of `story.lockedSentences`.
- Model output saved before validation.
- Existing characters replaced wholesale.
- Setup main character overwritten by model guesses.
- Existing image placeholder/approval state wiped on re-extraction.
- Unmatched approved characters deleted instead of marked stale.
- New character IDs based on array index rather than stable names.
- Duplicate extracted names creating duplicate cards.
- Frontend importing OpenAI or exposing API keys.
- Extract button enabled during unrelated model operations.
- API errors clearing current characters.
- In-app fields expanding beyond the simplified character card contract.
- Phase 8 image work leaking into Phase 7.

## Review Output Format

Return the review in this format:

```md
## Phase 7 Review

### Findings

- [P1] Title
  - File/path: `path:line`
  - Evidence: ...
  - Why it matters: ...
  - Recommended fix: ...

### Acceptance Summary

- Backend route/API contract: Pass/Fail
- Locked-story source: Pass/Fail
- OpenAI backend-only boundary: Pass/Fail
- Structured validation: Pass/Fail
- Merge behavior: Pass/Fail
- Frontend extraction flow: Pass/Fail
- Persistence/save-open behavior: Pass/Fail
- Phase 6 regression risk: Pass/Fail
- Scope control: Pass/Fail

### Verification

Passed:

- ...

Not run:

- ...

### Open Questions

- ...

### Verdict

Pass/Fail with a short explanation.
```

Severity guidance:

- `P1`: Blocks Phase 7 acceptance or can lose user work.
- `P2`: Important correctness, persistence, UX or scope issue.
- `P3`: Small polish, documentation or test coverage issue.

If no issues are found, say that clearly and mention any residual test or live-API coverage gaps.
