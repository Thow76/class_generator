# Phase 6 Implementation Prompt

Use this prompt to implement Milestone 2, Phase 6 of Lesson Source Builder.

## Prompt

You are implementing Milestone 2, Phase 6 of Lesson Source Builder.

Milestone 1 created a persistent local lesson builder. Phase 5 added backend-only OpenAI story generation from validated Setup data. Phase 6 must complete the Story Builder so the tutor can generate, edit, selectively regenerate, shorten, reorder if available, regenerate the whole story with warnings, lock the exact master story, unlock deliberately, and preserve stale-downstream warnings when story changes affect later work.

Implement Phase 6 only. Do not add character extraction, character image generation, scene planning, scene image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase or cloud sync.

## Phase 6 Goal

Make the locked master story reliable enough to drive all later stages.

Done means:

- Manual story editing is reliable and persists.
- One-sentence Regenerate is backed by OpenAI.
- One-sentence Shorten is backed by OpenAI.
- Whole-story Regenerate is backed by OpenAI and guarded by overwrite warnings.
- Locked master story text is exact and persisted.
- Locked story disables editing, add/delete/reorder, regenerate and shorten controls.
- Unlock Story is deliberate and warns when downstream work exists.
- Story changes after lock or after downstream work mark downstream records stale or potentially stale.
- Existing project save/open/duplicate behavior still works.
- Existing Phase 5 Generate Story still works.
- API keys remain backend-only.

## Phase 6 Scope

Build:

- Backend story operation endpoints for one-sentence regenerate, one-sentence shorten and whole-story regenerate.
- Backend prompt modules for sentence-level operations.
- Backend structured output schemas and validators for one-sentence operations.
- Frontend API client functions for new story operations.
- Per-sentence loading and error states.
- Whole-story regenerate confirmation flow.
- Manual edit persistence and metadata.
- Exact locked-story snapshot.
- Lock and unlock persistence improvements.
- Stale downstream metadata on characters, scenes and media/export placeholders where appropriate.
- Tests for story operation helpers and services with mocked OpenAI responses.
- Documentation for completed Story Builder behavior.

Do not build:

- Character extraction from story.
- Character reference image generation.
- Scene plan generation.
- Scene image generation.
- Audio scripts.
- Video prompts.
- ZIP export.
- PowerPoint or worksheet generation.
- Accounts, login, Firebase or cloud sync.

## Starting Point

Important current files:

```text
frontend/src/App.jsx
frontend/src/api/story.js
frontend/src/stages/StoryStage.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
server/src/routes/story.js
server/src/services/storyGenerationService.js
server/src/services/openaiClient.js
server/src/services/projectStore.js
server/src/services/validateLesson.js
server/src/services/validateSetup.js
server/src/services/validateStoryGeneration.js
server/src/prompts/storyPrompts.js
server/src/schemas/storySchemas.js
server/test/storyGeneration.test.js
docs/phase-5-story-generation.md
docs/milestone-2-handoff.md
```

There may also be narrower `docs/phase-6a-*` files. Treat them as supporting subphase references if they are present, but use this document as the umbrella Phase 6 implementation handoff.

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
- Generated story text.
- User-facing errors.
- Prompt text shown to the tutor.
- Generation metadata shown in the app.

### Story Authority

- Draft story can be edited.
- Locked story is the master source for downstream work.
- Downstream stages must use the exact locked sentences.
- If story changes after locking or after downstream output exists, downstream records must be marked stale or potentially stale.
- Do not silently delete downstream work.
- Do not silently leave generated downstream work marked valid after story text changes.

### Layout

- Story sentence cards must remain wide on desktop.
- Do not shrink sentence text just to force one-line display.
- Text and controls must not overlap.
- Loading/error states must not cause sentence cards to jump unpredictably.

## Story Data Model

Update the story model only where needed. Preserve the Phase 2/5 lesson object shape and maintain JSON serializability.

Recommended story shape:

```json
{
  "story": {
    "status": "draft",
    "sentences": [
      {
        "id": "sentence-1",
        "number": 1,
        "text": "Marta goes to the shop.",
        "stale": false,
        "source": "generated",
        "updatedAt": "2026-09-05T12:00:00.000Z"
      }
    ],
    "lockedAt": null,
    "lockedSentences": [],
    "modifiedAfterLock": false,
    "lastGeneratedAt": null,
    "generationMeta": {
      "model": "gpt-5-mini",
      "promptVersion": "story-generate-v1",
      "schemaVersion": "story-sentences-v1",
      "level": "Literacies Plus",
      "sentenceCount": 9
    }
  }
}
```

`story.lockedSentences` should capture an exact snapshot at lock time:

```json
[
  {
    "id": "sentence-1",
    "number": 1,
    "text": "Marta goes to the shop."
  }
]
```

Rules:

- Keep sentence IDs stable when text changes.
- Keep sentence IDs stable when a sentence is regenerated or shortened.
- Keep sentence IDs stable when sentences are reordered.
- New manually added sentences should get new stable IDs.
- Deleted sentence IDs should not be reused inside the same lesson if avoidable.
- `number` is display/order metadata and should match array order after normalization.
- Locked downstream source should be either `lockedSentences` or a clearly documented exact equivalent.

## Backend API

Recommended endpoints:

```text
POST /api/story/generate
POST /api/story/regenerate
POST /api/story/regenerate-sentence
POST /api/story/shorten-sentence
```

Optional endpoints if useful:

```text
POST /api/story/lock
POST /api/story/unlock
```

If lock/unlock are already reliable through project save/update routes, dedicated lock/unlock routes are optional. Use dedicated routes only if they make validation, exact snapshotting or persistence safer.

## Backend Implementation

## Step 1: Refactor Story Operation Service Boundaries

Keep or extend:

```text
server/src/services/storyGenerationService.js
```

Or split into:

```text
server/src/services/storyService.js
server/src/services/storyGenerationService.js
server/src/services/storySentenceService.js
```

Responsibilities:

- Load canonical lesson by project ID.
- Validate lesson shape.
- Validate Setup readiness for generation operations.
- Validate story is editable for draft-only operations.
- Build operation-specific prompt.
- Call OpenAI through backend client only.
- Parse and validate structured output.
- Apply changes to only the intended story fields.
- Save updated lesson through `projectStore`.
- Return updated full lesson.

Acceptance:

- No OpenAI logic moves to frontend.
- Existing `POST /api/story/generate` still works.
- New sentence operations are mockable in tests.

## Step 2: Add One-Sentence Response Schema

Add schema/validator support for exactly one sentence.

Recommended files:

```text
server/src/schemas/storySchemas.js
server/src/services/validateStoryGeneration.js
```

Expected output:

```json
{
  "sentence": {
    "text": "Marta asks for help."
  }
}
```

Validation rules:

- Response is an object.
- `sentence.text` exists.
- Text is a non-empty string.
- Text is trimmed.
- Text does not include embedded numbering.
- Text does not include Markdown bullets.
- Text does not include blank lines.
- Text does not include CEFR labels.
- Text does not include extra commentary.
- Text fits the selected learner level as far as deterministic checks can reasonably verify.

Acceptance:

- Invalid one-sentence output does not replace existing sentence text.
- Validator is testable without OpenAI.

## Step 3: Add Regenerate One Sentence Prompt

Add backend prompt builder:

```text
server/src/prompts/storyPrompts.js
```

Suggested export:

```js
export const storyRegenerateSentencePromptVersion = "story-regenerate-sentence-v1";
export function buildRegenerateSentencePrompt(lesson, sentence) {}
```

Prompt should include:

- Full current story in order.
- Target sentence ID or number.
- Current target sentence text.
- Lesson learner level.
- Setup context.
- Target vocabulary and notes if present.
- Instruction to return exactly one replacement sentence.
- Instruction to preserve the target sentence's story role.
- Instruction to preserve names, essential meaning and continuity.
- Instruction not to rewrite other sentences.

Acceptance:

- Prompt is server-side and versioned.
- Prompt makes it clear that only one sentence should be returned.

## Step 4: Implement Regenerate One Sentence Endpoint

Add route:

```text
POST /api/story/regenerate-sentence
```

Recommended request:

```json
{
  "lessonId": "lesson-20260905-abc123",
  "sentenceId": "sentence-3"
}
```

Backend behavior:

1. Validate `lessonId` and `sentenceId`.
2. Load canonical lesson.
3. Reject if story is locked.
4. Confirm sentence exists.
5. Build regenerate-sentence prompt.
6. Call OpenAI.
7. Validate one-sentence response.
8. Replace only the selected sentence's `text`.
9. Preserve selected sentence `id` and `number`.
10. Set selected sentence `source` to `regenerated`.
11. Set selected sentence `updatedAt`.
12. If story had previously been locked or downstream output exists, mark stale flags as needed.
13. Save updated lesson.
14. Return updated lesson.

Acceptance:

- Only the selected sentence changes.
- Sentence ID is preserved.
- Other sentence text is unchanged.
- Existing story is preserved on failure.

## Step 5: Add Shorten One Sentence Prompt

Add backend prompt builder:

```js
export const storyShortenSentencePromptVersion = "story-shorten-sentence-v1";
export function buildShortenSentencePrompt(lesson, sentence) {}
```

Prompt should include:

- Full current story in order.
- Target sentence ID or number.
- Current target sentence text.
- Lesson learner level.
- Setup context.
- Instruction to return exactly one shorter sentence.
- Instruction to preserve core meaning.
- Instruction to preserve names, required vocabulary and essential action.
- Instruction not to add new story events.
- Instruction not to rewrite other sentences.

Acceptance:

- Prompt is server-side and versioned.
- Prompt clearly prioritizes shorter text with same meaning.

## Step 6: Implement Shorten One Sentence Endpoint

Add route:

```text
POST /api/story/shorten-sentence
```

Recommended request:

```json
{
  "lessonId": "lesson-20260905-abc123",
  "sentenceId": "sentence-3"
}
```

Backend behavior:

1. Validate `lessonId` and `sentenceId`.
2. Load canonical lesson.
3. Reject if story is locked.
4. Confirm sentence exists.
5. Build shorten prompt.
6. Call OpenAI.
7. Validate one-sentence response.
8. Replace only the selected sentence.
9. Preserve selected sentence `id` and `number`.
10. Set selected sentence `source` to `shortened`.
11. Set selected sentence `updatedAt`.
12. Save updated lesson.
13. Return updated lesson.

Optional deterministic check:

- If shortened text is not actually shorter than the original, either reject it or retry once.

Acceptance:

- Only the selected sentence changes.
- Result is not longer than the original unless documented as an accepted edge case.
- Existing story is preserved on failure.

## Step 7: Implement Regenerate Whole Story

Add route:

```text
POST /api/story/regenerate
```

or reuse:

```text
POST /api/story/generate
```

Prefer a separate route if it makes overwrite confirmation explicit.

Recommended request:

```json
{
  "lessonId": "lesson-20260905-abc123",
  "confirmedOverwrite": true
}
```

Backend behavior:

1. Validate `lessonId`.
2. Load canonical lesson.
3. Validate Setup.
4. If story is locked, require explicit unlock or explicit confirmed overwrite.
5. If story has existing sentences, require `confirmedOverwrite`.
6. Generate a complete replacement story.
7. Validate full story output.
8. Replace full sentence array only after validation succeeds.
9. Set story status to `draft`.
10. Clear or reset lock metadata only after explicit confirmation.
11. Mark downstream records stale if downstream output exists.
12. Save updated lesson.
13. Return updated lesson.

Frontend behavior:

- Show confirmation before overwriting existing/manual story text.
- If story is locked, require deliberate unlock or an explicit stronger confirmation.
- Do not silently discard manual edits.

Acceptance:

- Whole-story regeneration cannot accidentally overwrite existing work.
- Invalid generation does not overwrite current story.
- Downstream stale markers are applied when needed.

## Step 8: Strengthen Manual Sentence Editing

Manual edit behavior:

- Only draft stories are editable.
- Update by stable sentence ID.
- Preserve sentence order.
- Preserve sentence ID.
- Update `source` to `manual` or preserve prior source plus `editedAt`, according to documented local convention.
- Set `updatedAt`.
- Persist immediately through existing save flow or clearly mark unsaved.
- If story was previously locked or downstream output exists, mark downstream stale as needed.

If existing add/delete/reorder features are present, preserve and align them:

- Add sentence creates a new stable ID.
- Delete sentence removes scene references safely.
- Reorder sentence keeps IDs and updates display numbers.
- Add/delete/reorder disabled when story is locked.
- Add/delete/reorder mark downstream stale when appropriate.

Acceptance:

- Manual edits survive save/open.
- Add/delete/reorder, if present, survive save/open.
- Locked story cannot be modified through manual controls.

## Step 9: Implement Exact Lock Story Snapshot

Lock behavior:

1. Show explicit confirmation.
2. Explain locked story becomes the master source.
3. On confirm, set `story.status` to `locked`.
4. Set `story.lockedAt` to an ISO timestamp.
5. Store exact ordered locked sentence snapshot in `story.lockedSentences`.
6. Persist immediately.
7. Disable editing and generation controls.
8. Display clear locked state.

Locked snapshot should preserve:

- Sentence ID.
- Sentence number/order.
- Exact text.

Acceptance:

- Locked text persists after refresh/open.
- Locked state persists after refresh/open.
- Locked story cards render exact locked text or exact story text if the implementation documents a single-source equivalent.
- No draft operation can mutate a locked story.

## Step 10: Implement Deliberate Unlock Story

Unlock behavior:

1. Unlock action is visible only when locked.
2. If downstream output exists, show warning.
3. User must confirm unlock.
4. Set `story.status` to `draft`.
5. Preserve sentence text as the draft starting point.
6. Preserve `lockedSentences` for audit unless explicitly documented otherwise.
7. Do not delete downstream records.
8. Mark future story edits after unlock as stale-risk changes.

Acceptance:

- Unlock is never accidental.
- Downstream work remains visible.
- A user can cancel unlock.
- Unlock state persists after save/open.

## Step 11: Implement Stale Downstream Metadata

When story changes after downstream work exists or after a story had been locked, update downstream records.

Recommended fields:

```json
{
  "stale": true,
  "staleReason": "Story changed after lock",
  "staleAt": "2026-09-05T12:00:00.000Z"
}
```

Apply to:

- Characters with generated or approved state.
- Scenes with generated or approved state.
- Media metadata if it has project-level stale fields.
- Export metadata if it has project-level stale fields.

Trigger stale markers for:

- Manual sentence text edit after lock.
- Regenerate one sentence after lock/downstream output.
- Shorten one sentence after lock/downstream output.
- Add sentence after lock/downstream output.
- Delete sentence after lock/downstream output.
- Reorder sentence after lock/downstream output.
- Regenerate whole story after downstream output exists.

Do not mark stale for:

- Normal draft edits before lock and before downstream output exists.
- Pure UI state changes.
- Opening or saving unchanged lessons.

Acceptance:

- Stale markers persist.
- Stale warnings are visible in relevant downstream stages.
- User work is not deleted automatically.

## Step 12: Frontend Story API Client

Update:

```text
frontend/src/api/story.js
```

Suggested exports:

```js
export async function generateStory(lessonId) {}
export async function regenerateStory(lessonId, options) {}
export async function regenerateSentence(lessonId, sentenceId) {}
export async function shortenSentence(lessonId, sentenceId) {}
```

Client rules:

- Use backend routes only.
- Throw readable `StoryApiError` errors.
- Preserve backend validation details.
- Do not import OpenAI.
- Do not include prompts in frontend code.

Acceptance:

- API client supports all Phase 6 story operations.
- Frontend errors are readable and scoped to the relevant operation.

## Step 13: Frontend Story UI States

Update `App.jsx` and `StoryStage.jsx`.

Required states:

- Whole-story generation/regeneration loading.
- Per-sentence regenerate loading.
- Per-sentence shorten loading.
- Per-sentence error.
- Whole-story regenerate confirmation.
- Save/persistence error after story operation.

Suggested state shape:

```js
{
  storyOperationStatus: "idle" | "generating" | "regenerating" | "error",
  sentenceOperations: {
    "sentence-3": {
      operation: "regenerate",
      status: "loading",
      error: ""
    }
  }
}
```

UI rules:

- Disable only conflicting controls while a sentence operation runs.
- Keep other sentence cards visible.
- Show inline sentence errors near the sentence card.
- Keep existing draft visible on error.
- Disable all edit/generation controls when locked.
- Use existing confirmation panel pattern instead of browser alerts.

Acceptance:

- User sees which sentence is being regenerated or shortened.
- Failed sentence operation does not affect other sentences.
- Locked state hides/disables edit and generation controls.

## Step 14: Persistence Requirements

Save after:

- Whole story generation.
- Manual sentence edit.
- Sentence add/delete/reorder, if present.
- One-sentence regenerate.
- One-sentence shorten.
- Whole-story regenerate.
- Lock Story.
- Unlock Story.
- Stale flag updates.

Backend-backed story operations should save before returning success.

Frontend-only operations should either:

- Auto-save through existing project routes, or
- Clearly mark save status as unsaved and preserve warnings before New/Open.

Acceptance:

- Refresh/open restores latest story operation result.
- Save status is honest.
- Backend save failure is visible.
- Frontend does not claim success if persistence failed.

## Step 15: Tests

Add or update tests without making real OpenAI calls.

Recommended backend tests:

- Regenerate one sentence updates only selected sentence.
- Regenerate one sentence preserves ID and number.
- Regenerate one sentence rejects locked story.
- Regenerate one sentence rejects missing sentence ID.
- Shorten one sentence updates only selected sentence.
- Shorten one sentence preserves ID and number.
- Shorten one sentence rejects invalid model output.
- Whole-story regenerate requires overwrite confirmation when story exists.
- Whole-story regenerate preserves existing story on invalid output.
- Whole-story regenerate marks downstream records stale when needed.
- Lock story creates exact `lockedSentences` snapshot.
- Unlock story preserves sentences and downstream records.
- Stale metadata is applied without deleting downstream records.

Recommended frontend or utility tests if a test runner exists:

- Manual edit preserves ID.
- Add/delete/reorder disabled when locked.
- Completed story state still works.
- Scene references remain valid after sentence delete/reorder where applicable.

Acceptance:

- `npm run test --workspace server` passes.
- Tests use mocked OpenAI clients.
- Tests do not require `OPENAI_API_KEY`.

## Step 16: Documentation

Add:

```text
docs/phase-6-story-builder.md
```

Document:

- Story operation routes.
- Request/response contracts.
- Lock/unlock behavior.
- Exact locked-story snapshot.
- Stale downstream behavior.
- Frontend loading/error states.
- What remains out of scope for Milestone 3.

Update existing docs only where necessary:

```text
docs/milestone-2-handoff.md
docs/phase-5-story-generation.md
README.md
```

Acceptance:

- A reviewer can understand Phase 6 behavior.
- Milestone 3 implementer can identify the locked master story source.

## Suggested Files To Add Or Update

Likely add:

```text
docs/phase-6-story-builder.md
server/test/storyOperations.test.js
```

Likely update:

```text
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
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/storyGeneration.test.js
```

Only split files when it reduces real complexity.

## Manual QA Checklist

### Startup

- `npm run dev` starts frontend and backend.
- `GET /api/health` works.
- `GET /api/projects` works.
- Existing Generate Story works.

### Generate And Edit

- Create or open a lesson with complete Setup.
- Generate a story.
- Edit one sentence manually.
- Confirm sentence ID remains stable in `lesson.json`.
- Save or confirm auto-save.
- Refresh/open and confirm the manual edit persists.

### Regenerate One Sentence

- Click Regenerate on one draft sentence.
- Confirm only that sentence shows loading.
- Confirm other sentence controls remain visible unless intentionally disabled.
- Confirm only selected sentence text changes.
- Confirm selected sentence ID and order are preserved.
- Confirm updated lesson persists.
- Simulate or trigger an error and confirm existing story remains unchanged.

### Shorten One Sentence

- Click Shorten on one draft sentence.
- Confirm only that sentence shows loading.
- Confirm selected sentence becomes shorter or the app returns a clear error.
- Confirm selected sentence ID and order are preserved.
- Confirm updated lesson persists.

### Regenerate Whole Story

- Make a manual edit.
- Click Regenerate Whole Story.
- Confirm overwrite warning appears.
- Cancel and confirm story remains unchanged.
- Confirm overwrite.
- Confirm story is replaced only after successful validation.
- Confirm generated sentence count is correct.

### Lock Story

- Lock story.
- Confirm explicit lock confirmation appears.
- Confirm locked status is visible.
- Confirm editing, add/delete/reorder, regenerate and shorten controls are unavailable.
- Inspect saved lesson and confirm `lockedAt` and exact locked snapshot exist.
- Refresh/open and confirm exact locked text is restored.

### Unlock Story

- With downstream dummy output present, click Unlock Story.
- Confirm warning appears.
- Cancel and confirm story remains locked.
- Confirm unlock.
- Confirm story becomes draft.
- Confirm downstream records remain visible.

### Stale Downstream

- Generate/approve at least one character or scene.
- Lock the story.
- Unlock the story.
- Change one sentence.
- Confirm generated/approved downstream records are marked stale or potentially stale.
- Confirm stale markers persist after save/open.
- Confirm downstream records are not deleted.

### Regression

- New Lesson still works.
- Open Existing Lesson still works.
- Duplicate Lesson still works.
- Setup validation still gates story generation.
- Media filter still works.
- Export summary still works.
- Frontend bundle does not expose API key.

## Verification Commands

Run available commands:

```sh
npm run build --workspace frontend
npm run test --workspace server
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "regenerate-sentence|shorten-sentence|/api/story/regenerate|lockedSentences|staleReason|staleAt" frontend/src server/src docs
rg "from ['\\\"]openai['\\\"]|require\\(['\\\"]openai['\\\"]\\)" server frontend
rg "OPENAI_API_KEY|OPENAI_STORY_MODEL" .env.example server
rg "characters/extract|scenes/plan|images/character|images/scene|zip|firebase|auth|login|account|PowerPoint|worksheet" frontend server package.json docs
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
```

Real OpenAI checks should be manual and optional depending on local `.env`. Automated tests must use mocked OpenAI clients.

## Phase 6 Acceptance Criteria

- Phase 5 Generate Story still works.
- Manual sentence edits persist.
- Regenerate one sentence uses backend OpenAI.
- Regenerate one sentence changes only the selected sentence.
- Shorten one sentence uses backend OpenAI.
- Shorten one sentence changes only the selected sentence.
- Whole-story regenerate requires confirmation before overwriting existing story.
- Invalid model output never overwrites the current story.
- Locked story stores exact locked text.
- Locked story disables all edit/generation/reorder controls.
- Unlock is deliberate and cancelable.
- Story changes after lock or downstream output mark relevant downstream data stale.
- Stale flags persist.
- No downstream user work is silently deleted.
- Frontend shows per-operation loading and errors.
- Generated and edited story state persists after refresh/open.
- API keys remain backend-only.
- No Milestone 3+ scope has been introduced.

## Handoff To Milestone 3

Milestone 3 starts character and scene generation from the locked master story.

Before handing off, ensure:

- There is one clearly documented source for exact locked story text.
- Story sentence IDs are stable enough for downstream references.
- Locked story persists after refresh/open.
- Story operations cannot modify a locked story accidentally.
- Stale downstream metadata is available and visible.
- Backend story services are separated from future character/scene services.

Milestone 3 should begin with:

- Character extraction from locked story.
- Character records merged with Setup character data.
- Character reference image generation after character approval workflow is ready.

## Implementation Response Format

When implementation is complete, respond with:

```md
## Summary

- ...

## Changed Files

- ...

## Verification

- ...

## Story Builder Notes

- ...

## Notes For Milestone 3

- ...
```

Mention any tests, browser checks, route checks or real OpenAI checks that could not be completed.
