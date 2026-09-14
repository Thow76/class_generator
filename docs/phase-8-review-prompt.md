# Phase 8 Review Prompt

Use this prompt to review whether Milestone 3, Phase 8 of Lesson Source Builder was implemented correctly. The review should verify character reference image generation only.

## Prompt

You are reviewing Milestone 3, Phase 8 of the Lesson Source Builder implementation.

Your job is to verify that Phase 8 replaces the dummy character-generation placeholder with persistent backend-generated character reference images. The approved character reference image should become the visual continuity source for later scene work.

Review Phase 8 only. Do not require scene planning, scene image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable cross-project character libraries or external media platform integrations.

## Phase 8 Goal

Generate, review, regenerate and approve stable character reference images for recurring characters.

The implementation is correct only if:

- Character image generation requires a saved project, locked story and valid character record.
- Image generation uses backend-only OpenAI image calls.
- The backend builds an internal character image prompt from lightweight character fields and locked story context.
- Generated image files are saved inside the local project folder.
- The lesson stores safe project-relative image paths and serializable image metadata.
- The frontend renders generated images through safe project asset URLs.
- Regeneration preserves character text fields and notes, increments generation count and clears approval.
- Approval requires an existing generated image file.
- Editing character details or notes after generation marks the character/image stale or needing review.
- Approved image state persists after save/open/duplicate.
- Existing Phase 7 extraction/merge behavior still works.
- Existing Phase 6 locked story behavior still works.
- No Phase 9+ or Milestone 4 scope was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-8-implementation-prompt.md
docs/phase-8-character-reference-images.md
frontend/src/api/images.js
frontend/src/App.jsx
frontend/src/stages/CharactersStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
server/src/index.js
server/src/routes/images.js
server/src/services/characterImageService.js
server/src/services/imageStorage.js
server/src/prompts/characterImagePrompts.js
server/src/services/openaiClient.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/characterImage.test.js
frontend/test/characterImages.test.js
```

File names may differ, but the implementation should clearly separate:

- Backend image routes.
- Backend character image generation service.
- Backend local image storage and safe asset serving.
- Backend image prompt construction.
- Frontend image API client.
- Frontend per-character image operation state.
- Character record normalization/validation.
- Phase 8 documentation.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
find server/src server/test frontend/src frontend/test docs -maxdepth 4 -type f | sort
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/images/character -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://127.0.0.1:3001/api/images/character/approve -H "Content-Type: application/json" -d '{}'
rg "images/character|characterImage|generateCharacterImage|approveCharacterImage|imageStorage|imagePath|imageMeta|OPENAI_IMAGE_MODEL" frontend/src server/src server/test frontend/test docs .env.example
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "hair|clothing|build|personality|expression|pose|visual style" frontend/src server/src docs
rg "scenes/plan|images/scene|/api/scenes|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
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
POST /api/images/character
POST /api/images/character/approve
GET  /api/projects/:id/assets/images/characters/<file>
```

If approval is intentionally handled through normal project save instead of a backend route, verify equivalent safeguards exist and are documented.

### `POST /api/images/character`

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
  "lesson": {},
  "image": {
    "characterId": "character-marta",
    "imagePath": "/api/projects/lesson-20260909-example/assets/images/characters/example.png",
    "projectRelativePath": "images/characters/example.png",
    "imageMeta": {}
  }
}
```

Expected behavior:

- Rejects missing `lessonId` or `characterId`.
- Rejects malformed project or character IDs.
- Rejects missing project.
- Rejects missing character.
- Rejects draft/unlocked stories.
- Rejects empty or invalid locked story snapshots.
- Rejects empty character names.
- Rejects stale characters unless explicitly allowed with documented recovery behavior.
- Calls the image model only after all local validation passes.
- Saves the returned image inside the project folder.
- Updates only the target character.
- Preserves character text fields, notes and unrelated characters.
- Increments `generationCount`.
- Sets `generationStatus` to `generated`.
- Clears `approved`.
- Stores project-relative `imagePath`.
- Stores serializable image metadata.
- Returns JSON errors with appropriate status codes.

### `POST /api/images/character/approve`

Expected request:

```json
{
  "lessonId": "lesson-20260909-example",
  "characterId": "character-marta"
}
```

Expected behavior:

- Rejects missing or malformed IDs.
- Rejects missing project.
- Rejects missing character.
- Rejects characters with no image path.
- Rejects stale characters.
- Verifies the image file exists inside the project folder.
- Sets `approved: true`.
- Sets `generationStatus: "approved"`.
- Preserves image path and metadata.
- Preserves unrelated records.

### Asset Route

Expected behavior:

- Serves generated images from approved project image folders.
- Rejects path traversal.
- Rejects unsupported extensions.
- Rejects paths outside allowed image folders.
- Does not serve `lesson.json`, `meta.json`, `.env` or arbitrary server files.
- Does not expose absolute private filesystem paths.

## Review Steps

1. Read `docs/phase-8-implementation-prompt.md`.
2. Read `docs/phase-8-character-reference-images.md`.
3. Inspect `server/src/index.js`.
4. Confirm image routes and asset routes are registered without disturbing health/project/story/character routes.
5. Inspect `server/src/routes/images.js`.
6. Confirm all image routes return JSON and use consistent error mapping.
7. Inspect `server/src/services/openaiClient.js`.
8. Confirm `OPENAI_IMAGE_MODEL` or equivalent is backend-only and documented.
9. Confirm missing API key errors are typed and do not leak secrets.
10. Inspect `server/src/prompts/characterImagePrompts.js`.
11. Confirm prompts are server-side and versioned.
12. Confirm prompts use lightweight character fields and locked story context.
13. Confirm prompts avoid CEFR labels.
14. Confirm prompts do not ask for visible text, captions, logos, UI or speech bubbles.
15. Confirm prompts do not rely on hidden dedicated visual fields.
16. Inspect `server/src/services/characterImageService.js`.
17. Confirm service validates `lessonId` and `characterId`.
18. Confirm service loads canonical project state from `projectStore`.
19. Confirm service validates lesson shape before mutation.
20. Confirm service requires a locked story.
21. Confirm service requires a valid explicit locked snapshot where appropriate.
22. Confirm service finds characters by stable ID, not array index.
23. Confirm service rejects missing characters.
24. Confirm service rejects empty character names.
25. Confirm service rejects or carefully handles stale characters.
26. Confirm OpenAI image generation is called only after validation passes.
27. Confirm image response data is validated before saving.
28. Confirm invalid image response does not mutate the saved project.
29. Confirm provider failures do not mutate the saved project.
30. Confirm generated files are saved under the project image folder.
31. Confirm only the target character is updated.
32. Confirm text fields and notes are preserved.
33. Confirm regeneration increments `generationCount`.
34. Confirm regeneration clears `approved`.
35. Confirm regeneration does not delete previous image files unless documented.
36. Confirm image metadata includes model, prompt version, generated time and source story lock time.
37. Inspect `server/src/services/imageStorage.js`.
38. Confirm project and character IDs are validated before file writes.
39. Confirm filenames are safe and do not use raw lesson title or unsanitized names.
40. Confirm file writes are atomic where practical.
41. Confirm returned paths are project-relative or frontend-safe URLs.
42. Confirm absolute filesystem paths are not stored in `lesson.json`.
43. Confirm asset serving validates path roots and extensions.
44. Confirm asset serving rejects encoded traversal attempts.
45. Confirm asset serving cannot expose arbitrary project files.
46. Inspect `server/src/services/validateLesson.js` and server normalization.
47. Confirm `imagePath` is validated as safe or normalized.
48. Confirm approved/generated status with missing image path is handled safely.
49. Confirm legacy placeholder generated characters without image paths do not crash open/save.
50. Inspect `frontend/src/api/images.js`.
51. Confirm frontend image API calls backend routes only.
52. Confirm frontend does not import OpenAI.
53. Confirm frontend error parsing surfaces useful messages.
54. Inspect `frontend/src/App.jsx`.
55. Confirm Generate Character uses backend image generation, not local placeholder mutation.
56. Confirm Approve uses backend approval or equivalent guarded logic.
57. Confirm current project is saved before image generation when needed.
58. Confirm returned lessons are normalized/validated before applying.
59. Confirm image operation loading/error state is per character.
60. Confirm project switching and other operation guards prevent stale response races.
61. Confirm stale image responses cannot switch back to an old project.
62. Inspect `frontend/src/stages/CharactersStage.jsx`.
63. Confirm generated images render when `imagePath` exists.
64. Confirm image URLs are built through a safe helper.
65. Confirm placeholders remain for characters without images.
66. Confirm loading and error states do not clear existing images.
67. Confirm Use This Character is disabled until a generated image exists.
68. Confirm stale characters cannot be approved.
69. Confirm Regenerate label appears when an image exists.
70. Confirm card layout remains stable while images load or fail.
71. Inspect `frontend/src/utils/lessonUpdates.js`.
72. Confirm editing character identity fields or notes marks generated/approved image state stale.
73. Confirm editing keeps image path for audit.
74. Confirm editing clears approval when image validity changes.
75. Inspect `frontend/src/utils/lessonSelectors.js`.
76. Confirm required-character approval readiness requires image paths, approval and non-stale state.
77. Run backend tests.
78. Run frontend tests.
79. Build frontend.
80. Perform route-level JSON error checks.
81. If a valid API key is available and the user wants it, perform one live image generation smoke test.
82. If no key is available, verify missing-key behavior and rely on mocked tests.
83. Manually exercise character image generation and approval in the browser if possible.

## Backend Test Expectations

`server/test/characterImage.test.js` or equivalent should cover:

- Missing `lessonId`.
- Missing `characterId`.
- Malformed IDs.
- Missing project.
- Missing character.
- Draft/unlocked story rejection.
- Empty or invalid locked snapshot rejection.
- Empty character name rejection.
- Empty character list rejection.
- Stale character generation rejection or explicit allowed regeneration behavior.
- Prompt includes lightweight character fields.
- Prompt includes locked story context.
- Prompt excludes CEFR labels.
- Mocked image response saves a file under the project character image folder.
- Stored `imagePath` is project-relative.
- Generated image updates only the target character.
- Character text fields and notes are preserved.
- Generation count increments.
- Regeneration clears approval.
- Previous image files are not destructively removed unless documented.
- Invalid image response does not mutate the project.
- Provider failure does not mutate the project.
- Approval rejects missing image path.
- Approval rejects missing image file.
- Approval rejects stale character.
- Approval persists valid approved image state.
- Asset route rejects path traversal.
- Asset route rejects unsupported extension.
- Asset route does not expose `lesson.json`, `meta.json`, `.env` or arbitrary files.

Tests should use mocked image responses. Live OpenAI image calls should not be required for automated tests.

## Frontend Test Expectations

`frontend/test/characterImages.test.js` or equivalent should cover:

- Generate Character calls backend image API.
- Approve Character calls backend approval or equivalent guarded save.
- Per-character loading state exists.
- Per-character errors do not clear existing images.
- Generated image paths become renderable project asset URLs.
- Use This Character is disabled until an image exists.
- Approval requires image path and non-stale character.
- Editing character fields after generation marks stale and clears approval.
- Editing notes after generation marks stale and keeps image path.
- Required-character readiness requires approved image path and non-stale state.
- Legacy generated placeholder records without image paths normalize safely.
- Project controls are disabled during image generation.
- Stale image operation responses are ignored if active project changes.

## Manual QA Checklist

Use a project with completed Setup, locked story and extracted characters.

1. Start the app.
2. Confirm `GET /api/health` returns JSON.
3. Confirm `GET /api/projects` returns JSON.
4. Open or create a lesson.
5. Complete Setup.
6. Generate or write a story.
7. Lock the story.
8. Extract characters.
9. Click Generate Character for one character.
10. Confirm loading state appears on that character only.
11. Confirm project switching controls are unavailable during generation.
12. Confirm a generated image appears after success.
13. Confirm `lesson.json` stores a project-relative image path.
14. Confirm the image file exists under `server/data/projects/<projectId>/images/characters/`.
15. Refresh and reopen the project.
16. Confirm the image still displays.
17. Click Use This Character.
18. Save, refresh and reopen.
19. Confirm approval persists.
20. Edit a character detail or note.
21. Confirm the character becomes stale or needs review.
22. Confirm approval clears but the image remains visible for audit.
23. Regenerate the character.
24. Confirm approval clears until Use This Character is clicked again.
25. Confirm generation count increments.
26. Confirm unrelated character cards are unchanged.
27. Confirm generated image URLs do not expose absolute filesystem paths.
28. Attempt to load a disallowed asset path and confirm it fails.
29. Confirm no scene planning or scene image UI was added.

## Targeted Regression Scenarios

### Safe Asset Paths

Generate a character image and inspect the saved lesson JSON.

Expected:

- `character.imagePath` looks like `images/characters/<safe-file>.png`.
- It does not start with `/`.
- It does not contain `..`.
- It does not contain a private absolute path such as `/Users/...`.
- The browser render path is produced through `/api/projects/:id/assets/...`.

### Regeneration Preservation

Start with an approved character that has text fields, notes and an image.

Expected after regeneration:

- Character ID is unchanged.
- Name, age, sex, background and notes are unchanged.
- New `imagePath` is stored.
- `generationCount` increments.
- `approved` becomes false.
- `generationStatus` becomes `generated`.
- Unrelated characters are unchanged.

### Edit After Image Generation

Edit a generated or approved character field.

Expected:

- Existing image path remains.
- Character becomes stale or needs review.
- Approval is cleared.
- The stale reason is clear.
- Save/open preserves the stale state.

### Asset Traversal

Try paths such as:

```text
/api/projects/<id>/assets/../lesson.json
/api/projects/<id>/assets/images/characters/..%2F..%2Flesson.json
/api/projects/<id>/assets/meta.json
/api/projects/<id>/assets/images/characters/file.txt
```

Expected:

- All return `400` or `404`.
- None return project JSON or arbitrary file contents.

## Scope Control Checks

Fail the review if Phase 8 adds any of the following implementation scope:

- Scene planning routes.
- Scene image generation.
- Audio or video prompt generation.
- ZIP export.
- PowerPoint or worksheet generation.
- Accounts, login, Firebase or cloud sync.
- Reusable cross-project character library.
- Dedicated visible character visual/personality fields.
- CEFR labels in app/prompt/docs paths under review.

Documentation may mention future phases as out of scope, but implementation files should not add those behaviors.

## Common Failure Modes

Look specifically for:

- Frontend importing OpenAI or exposing API keys.
- Image generation allowed for draft/unlocked stories.
- Image generation allowed for missing or stale character records.
- Image response saved before validation.
- Absolute filesystem paths stored in `lesson.json`.
- Unsafe asset route serving arbitrary project files.
- Approval allowed with no image path or missing file.
- Regeneration wiping character text fields or notes.
- Regeneration leaving `approved: true`.
- Character edits after image generation leaving approved image marked valid.
- Per-character errors clearing current images.
- Full returned image-operation lesson clobbering a different active project.
- Dummy placeholder generation still being used instead of backend image generation.
- Phase 9 scene planning leaking into Phase 8.

## Review Output Format

Return the review in this format:

```md
## Phase 8 Review

### Findings

- [P1] Title
  - File/path: `path:line`
  - Evidence: ...
  - Why it matters: ...
  - Recommended fix: ...

### Acceptance Summary

- Backend image route/API contract: Pass/Fail
- Backend-only OpenAI boundary: Pass/Fail
- Prompt construction: Pass/Fail
- Image storage and asset serving: Pass/Fail
- Character record persistence: Pass/Fail
- Approval/regeneration behavior: Pass/Fail
- Frontend image flow: Pass/Fail
- Stale/edit behavior: Pass/Fail
- Phase 7 regression risk: Pass/Fail
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

- `P1`: Blocks Phase 8 acceptance, risks secret/file exposure, or can lose user work.
- `P2`: Important correctness, persistence, UX or scope issue.
- `P3`: Small polish, documentation or test coverage issue.

If no issues are found, say that clearly and mention any residual test or live-image coverage gaps.
