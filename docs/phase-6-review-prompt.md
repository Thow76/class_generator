# Phase 6 Review Prompt

Use this prompt to review whether Milestone 2, Phase 6 of Lesson Source Builder was implemented correctly. The review should verify the completed Story Builder only.

## Prompt

You are reviewing Milestone 2, Phase 6 of the Lesson Source Builder implementation.

Your job is to verify that the Story Builder is now reliable enough to produce and preserve the locked master story for downstream character, scene, media and export work. The app should support backend-backed story generation, one-sentence regeneration, one-sentence shortening, whole-story regeneration with overwrite confirmation, exact story locking, deliberate unlock, persistence, and stale downstream metadata.

Review Phase 6 only. Do not require character extraction, character image generation, scene planning, scene image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase or cloud sync.

## Phase 6 Goal

Make the locked master story reliable enough to drive all later stages.

The implementation is correct only if:

- Phase 5 Generate Story still works.
- Manual story edits persist.
- Regenerate one sentence is backed by backend OpenAI.
- Regenerate one sentence changes only the selected sentence.
- Shorten one sentence is backed by backend OpenAI.
- Shorten one sentence changes only the selected sentence.
- Whole-story Regenerate is guarded by explicit overwrite confirmation.
- Whole-story Regenerate never overwrites current story on invalid model output.
- Lock Story stores an exact locked-story snapshot.
- Locked Story disables edit, add, delete, reorder, regenerate and shorten controls.
- Unlock Story is deliberate and cancelable.
- Story changes after lock or downstream output mark relevant downstream data stale.
- Stale flags persist.
- No downstream user work is silently deleted.
- Frontend shows operation-specific loading and error states.
- API keys remain backend-only.
- No Milestone 3+ scope was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-6-implementation-prompt.md
docs/phase-6-story-builder.md
frontend/src/api/story.js
frontend/src/App.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
server/src/routes/story.js
server/src/services/storyGenerationService.js
server/src/services/validateStoryGeneration.js
server/src/prompts/storyPrompts.js
server/src/schemas/storySchemas.js
server/src/services/openaiClient.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/storyGeneration.test.js
server/test/storyOperations.test.js
server/test/sentenceOrdering.test.js
server/test/projectStore.test.js
```

File names may differ, but the implementation should clearly separate:

- Backend story routes.
- Backend story operation service logic.
- Backend prompts and schemas.
- Backend generated-output validation.
- Frontend story API client.
- Frontend Story UI state.
- Lesson update/normalization helpers.
- Phase 6 documentation.

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
rg "regenerate-sentence|shorten-sentence|/api/story/regenerate|/api/story/lock|/api/story/unlock" frontend/src server/src docs
rg "lockedSentences|staleReason|staleAt|modifiedAfterLock|confirmedOverwrite|confirmedUnlock" frontend/src server/src docs
rg "story-sentence-operation-v1|story-regenerate-sentence-v1|story-shorten-sentence-v1" server/src docs
rg "from ['\\\"]openai['\\\"]|require\\(['\\\"]openai['\\\"]\\)" server frontend
rg "OPENAI_API_KEY|OPENAI_STORY_MODEL" .env.example server
rg "characters/extract|scenes/plan|images/character|images/scene|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
```

Expected development URLs:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
```

## API Contract To Verify

The backend should expose:

```text
POST /api/story/generate
POST /api/story/regenerate
POST /api/story/regenerate-sentence
POST /api/story/shorten-sentence
POST /api/story/lock
POST /api/story/unlock
```

### `POST /api/story/regenerate`

Expected request:

```json
{
  "lessonId": "lesson-20260905-abc123",
  "confirmedOverwrite": true
}
```

Expected behavior:

- Rejects missing `lessonId`.
- Requires `confirmedOverwrite: true` before replacing existing story.
- Validates Setup.
- Calls OpenAI on backend.
- Validates full generated story.
- Replaces sentence array only after validation succeeds.
- Marks downstream data stale when downstream output exists.
- Saves and returns the updated full lesson.

### `POST /api/story/regenerate-sentence`

Expected request:

```json
{
  "lessonId": "lesson-20260905-abc123",
  "sentenceId": "sentence-3"
}
```

Expected behavior:

- Rejects missing `lessonId` or `sentenceId`.
- Rejects locked stories.
- Rejects missing sentence.
- Calls OpenAI on backend.
- Validates exactly one sentence.
- Replaces only the selected sentence text.
- Preserves selected sentence ID and number.
- Saves and returns the updated full lesson.

### `POST /api/story/shorten-sentence`

Expected behavior:

- Same as regenerate-sentence, but prompt asks for shorter same-meaning text.
- Should reject or clearly handle output longer than the original.
- Replaces only the selected sentence text.

### `POST /api/story/lock`

Expected behavior:

- Rejects missing project.
- Rejects empty story.
- Sets `story.status` to `locked`.
- Sets `story.lockedAt`.
- Stores exact `story.lockedSentences` snapshot.
- Saves and returns updated lesson.

### `POST /api/story/unlock`

Expected request:

```json
{
  "lessonId": "lesson-20260905-abc123",
  "confirmedUnlock": true
}
```

Expected behavior:

- Requires explicit confirmation.
- Sets `story.status` to `draft`.
- Preserves draft sentences.
- Preserves locked snapshot for audit unless explicitly documented otherwise.
- Preserves downstream records.
- Saves and returns updated lesson.

All routes should return JSON errors with appropriate status codes.

## Review Steps

1. Read `docs/phase-6-implementation-prompt.md`.
2. Read `docs/phase-6-story-builder.md`.
3. Inspect `server/src/routes/story.js`.
4. Confirm all Phase 6 story endpoints exist and return JSON.
5. Inspect `server/src/services/storyGenerationService.js`.
6. Confirm operations load canonical project state from `projectStore`.
7. Confirm story operations validate lesson shape before mutation.
8. Confirm draft-only operations reject locked stories.
9. Confirm one-sentence operations preserve sentence ID and number.
10. Confirm whole-story regeneration requires overwrite confirmation.
11. Confirm model output is validated before saving.
12. Confirm invalid model output preserves existing story.
13. Confirm backend operations save through `projectStore` before success.
14. Inspect `server/src/prompts/storyPrompts.js`.
15. Confirm one-sentence regenerate and shorten prompts are server-side and versioned.
16. Confirm prompts include story context, target sentence and learner level.
17. Inspect `server/src/schemas/storySchemas.js`.
18. Confirm one-sentence operation schema/version exists.
19. Inspect `server/src/services/validateStoryGeneration.js`.
20. Confirm one-sentence validation rejects empty text, numbering, Markdown bullets, blank lines, unsupported fields and external level labels.
21. Inspect `frontend/src/api/story.js`.
22. Confirm frontend calls backend story routes and does not import OpenAI.
23. Inspect `frontend/src/App.jsx`.
24. Confirm frontend has per-sentence operation state and whole-story confirmation state.
25. Inspect `frontend/src/stages/StoryStage.jsx`.
26. Confirm Story UI shows per-sentence loading/errors, whole-story confirmation, lock/unlock confirmations and locked disabled state.
27. Inspect lesson schema/normalizers.
28. Confirm `lockedSentences`, `staleReason` and `staleAt` are normalized and validated as needed.
29. Run backend tests.
30. Build frontend.
31. If a valid API key is available, perform manual live checks for one story, one sentence regeneration and one sentence shorten.
32. If no key is available, verify missing-key behavior and rely on mocked tests.
33. Manually test lock/unlock/stale behavior in the browser.
34. Search for Milestone 3+ scope creep.
35. Search for frontend OpenAI imports or leaked secrets.

## Acceptance Checklist

Mark each item Pass, Fail, or Not Applicable.

| Item | Result | Evidence |
| --- | --- | --- |
| Phase 6 documentation exists |  |  |
| `POST /api/story/generate` still works |  |  |
| `POST /api/story/regenerate` exists |  |  |
| `POST /api/story/regenerate-sentence` exists |  |  |
| `POST /api/story/shorten-sentence` exists |  |  |
| `POST /api/story/lock` exists or equivalent lock persistence exists |  |  |
| `POST /api/story/unlock` exists or equivalent unlock persistence exists |  |  |
| Story routes return JSON success responses |  |  |
| Story routes return JSON error responses |  |  |
| Missing `lessonId` is rejected |  |  |
| Missing `sentenceId` is rejected for sentence operations |  |  |
| Missing sentence returns a clear error |  |  |
| Locked story rejects regenerate sentence |  |  |
| Locked story rejects shorten sentence |  |  |
| Whole-story regenerate requires overwrite confirmation |  |  |
| Whole-story regenerate validates Setup |  |  |
| Backend calls OpenAI only from server code |  |  |
| Frontend does not import OpenAI SDK |  |  |
| API key remains backend-only |  |  |
| One-sentence prompts are server-side |  |  |
| One-sentence prompt versions are stored |  |  |
| One-sentence schema version is stored |  |  |
| Regenerate sentence prompt includes full story context |  |  |
| Shorten sentence prompt includes full story context |  |  |
| Regenerate sentence prompt targets exactly one sentence |  |  |
| Shorten sentence prompt targets exactly one sentence |  |  |
| One-sentence validator exists |  |  |
| One-sentence validator rejects empty text |  |  |
| One-sentence validator rejects numbering |  |  |
| One-sentence validator rejects Markdown bullets |  |  |
| One-sentence validator rejects blank lines |  |  |
| One-sentence validator rejects unsupported fields |  |  |
| One-sentence validator rejects external learner labels |  |  |
| Regenerate sentence changes only selected sentence |  |  |
| Regenerate sentence preserves selected ID |  |  |
| Regenerate sentence preserves selected number/order |  |  |
| Shorten sentence changes only selected sentence |  |  |
| Shorten sentence preserves selected ID |  |  |
| Shorten sentence preserves selected number/order |  |  |
| Shorten sentence rejects or handles longer output |  |  |
| Invalid one-sentence output preserves current story |  |  |
| Invalid whole-story output preserves current story |  |  |
| Backend story operations save before returning success |  |  |
| Manual sentence edits persist |  |  |
| Manual edits preserve sentence IDs |  |  |
| Add sentence, if present, creates stable new IDs |  |  |
| Delete sentence, if present, does not break scene references silently |  |  |
| Reorder sentence, if present, preserves IDs and updates numbers |  |  |
| Story operations mark save state honestly |  |  |
| Whole-story regenerate confirmation appears in UI |  |  |
| Cancel whole-story regenerate preserves story |  |  |
| Per-sentence loading state appears |  |  |
| Per-sentence errors appear near sentence card |  |  |
| Failed sentence operation leaves other sentences unchanged |  |  |
| Lock Story requires confirmation |  |  |
| Lock Story sets `story.status` to `locked` |  |  |
| Lock Story sets `story.lockedAt` |  |  |
| Lock Story stores exact `story.lockedSentences` snapshot |  |  |
| Locked story renders exact locked text |  |  |
| Locked story disables edit controls |  |  |
| Locked story disables add/delete/reorder controls |  |  |
| Locked story disables regenerate/shorten controls |  |  |
| Locked story persists after refresh/open |  |  |
| Unlock Story requires deliberate confirmation |  |  |
| Cancel Unlock leaves story locked |  |  |
| Unlock preserves story sentences |  |  |
| Unlock preserves locked snapshot for audit or documents alternative |  |  |
| Unlock preserves downstream records |  |  |
| Story changes after lock mark downstream records stale |  |  |
| Story changes after downstream output mark downstream records stale |  |  |
| Stale records include `staleReason` |  |  |
| Stale records include `staleAt` |  |  |
| Stale media/export metadata is handled if modeled |  |  |
| Stale flags persist after save/open |  |  |
| No downstream records are silently deleted |  |  |
| New/Open/Duplicate/Save still work |  |  |
| Setup validation still gates story generation |  |  |
| Media and Export still render |  |  |
| No character extraction endpoint was added |  |  |
| No scene planning endpoint was added |  |  |
| No image generation endpoint was added |  |  |
| No ZIP export was added |  |  |
| No auth/account/cloud/Firebase flow was added |  |  |
| Production frontend does not import `prototype/support.js` |  |  |

## Story Data Checks

After locking a story, inspect `server/data/projects/<PROJECT_ID>/lesson.json`.

Confirm:

```text
story.status = "locked"
story.lockedAt
story.lockedSentences[*].id
story.lockedSentences[*].number
story.lockedSentences[*].text
```

Confirm locked snapshot text exactly matches the story text at the moment of locking.

After regenerating or shortening one sentence, confirm:

```text
only selected story.sentences[*].text changed
selected sentence id stayed the same
selected sentence number stayed the same
selected sentence source changed to regenerated or shortened
selected sentence updatedAt changed
operation metadata exists if modeled
```

After stale-triggering story changes, confirm generated or approved downstream records include:

```text
stale = true
staleReason
staleAt
```

## Manual App Flow To Verify

Run the app, then complete this path:

1. Create or open a lesson with complete Setup.
2. Generate a story.
3. Edit one sentence manually.
4. Save or confirm unsaved status appears.
5. Refresh/open and confirm manual edit persists.
6. Click Regenerate on one sentence.
7. Confirm only that sentence shows loading.
8. Confirm only that sentence changes.
9. Click Shorten on a different sentence.
10. Confirm only that sentence shows loading.
11. Confirm only that sentence changes.
12. Click Regenerate Whole Story.
13. Confirm overwrite warning appears.
14. Cancel and confirm story is unchanged.
15. Confirm overwrite and verify full story replacement.
16. Lock the story.
17. Confirm locked state hides/disables editing and generation controls.
18. Refresh/open and confirm exact locked text is restored.
19. Generate/approve at least one dummy character or scene.
20. Unlock the story.
21. Confirm warning appears and can be canceled.
22. Confirm unlock.
23. Change one story sentence.
24. Confirm downstream records are marked stale.
25. Save/open and confirm stale flags persist.

## Error-Safety Checks

Verify:

- Missing API key returns a clear error.
- Missing project returns `404`.
- Missing sentence returns a clear error.
- Locked story rejects sentence operations.
- Invalid model output does not replace story text.
- OpenAI failure does not replace story text.
- Frontend keeps current story visible on error.
- Save failure does not falsely report success.

Use mocked tests where possible. Do not require automated tests to make real OpenAI calls.

## Secret-Safety Checks

Verify:

- No API key value is checked into files.
- `.env` remains ignored.
- Frontend does not import `openai`.
- Frontend does not mention `OPENAI_API_KEY`.
- Server logs do not print API keys.
- Error responses do not include API keys.
- Prompt text is not exposed to the frontend unless explicitly intended and safe.

## Scope-Control Review

Flag findings if Phase 6 adds:

- Character extraction.
- Scene planning API.
- Character image generation.
- Scene image generation.
- Audio scripts.
- Video prompts.
- ZIP export.
- PowerPoint or worksheet generation.
- Firebase.
- Hosted auth.
- User accounts.
- Cloud sync.

Backend story endpoints are in scope. Downstream dummy character/scene stale-state updates are in scope.

## Code Review Focus

Prioritize findings in these areas:

- Locked story can be mutated through any UI or API path.
- Locked snapshot is missing, incomplete or not exact.
- One-sentence operations update the wrong sentence or multiple sentences.
- Sentence IDs change during regenerate/shorten/edit/reorder.
- Whole-story regenerate can overwrite without confirmation.
- Invalid OpenAI output can overwrite current story.
- Backend does not save before returning success.
- Frontend indicates success when backend save failed.
- Stale downstream state is missing or not persisted.
- Downstream user work is deleted instead of marked stale.
- API key or OpenAI code leaks into frontend.
- Phase 3+ product scope was added prematurely.
- Story layout regresses or controls overlap.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```md
# Phase 6 Review

## Findings

- [P0/P1/P2/P3] Title
  - File/path:
  - Evidence:
  - Why it matters:
  - Recommended fix:

## Acceptance Summary

- Backend story operations:
- Prompt/schema/versioning:
- Output validation:
- Frontend Story UI:
- Persistence:
- Locked master story:
- Unlock and stale behavior:
- Error safety:
- Regression checks:
- Scope control:

## Open Questions

- ...

## Verdict

Pass/Fail with a one-paragraph explanation.
```

If there are no findings, say so clearly and include any residual risks or checks that could not be performed, such as no valid API key for live OpenAI checks.

## Severity Guidance

- P0: Phase 6 cannot run or cannot be meaningfully reviewed, for example frontend/backend startup fails completely.
- P1: Major Story Builder requirement missing or unsafe, for example locked story can be changed, no locked snapshot, sentence operation changes multiple sentences, invalid model output overwrites story, or API key leaks to frontend.
- P2: Important story, persistence, UX or scope issue, for example stale flags are incomplete, metadata is missing, errors are unclear, or a Milestone 3 endpoint was added early.
- P3: Minor clarity, naming, documentation or polish issue.

## Non-Goals For This Review

Do not fail Phase 6 because it lacks:

- Character extraction from locked story.
- Character reference image generation.
- Scene planning API.
- Scene image generation.
- Audio/video prompt generation.
- ZIP lesson source pack export.
- PowerPoint or worksheet generation.
- Accounts or cloud sync.

Those belong to Milestone 3 or later.
