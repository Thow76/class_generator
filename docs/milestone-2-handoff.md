# Lesson Source Builder: Milestone 2 Handoff

## Purpose

Milestone 2 turns the persistent Milestone 1 shell into a functional AI-assisted Story Builder. It covers Phases 5-6 only:

- Phase 5: First OpenAI feature: Generate Story
- Phase 6: Complete the Story Builder

Milestone 2 must produce a reliable Setup -> AI story -> edit/regenerate/shorten -> lock workflow. The locked master story becomes the authoritative source for all later character, scene, media and export work.

## Milestone Outcome

By the end of Milestone 2, the app should support:

- Backend-only OpenAI integration.
- Server-side prompt and schema management.
- `POST /api/story/generate` for whole-story generation.
- Structured story responses containing an ordered sentence array.
- ESOL level-specific story generation rules for the approved learner levels.
- Editable draft story sentences.
- One-sentence regenerate.
- One-sentence shorten.
- Whole-story regenerate with overwrite warning.
- Lock Story confirmation.
- Exact locked master story preservation.
- Deliberate Unlock Story behavior.
- Stale downstream warning behavior when a locked story changes.
- Backend-saved generated, regenerated, shortened, locked and unlocked story states, with honest unsaved status for local draft edits until the tutor saves.

The critical acceptance path for this milestone is:

1. Open an existing or new lesson.
2. Complete required Setup fields.
3. Generate a story using the selected internal ESOL level.
4. Edit one sentence manually.
5. Regenerate one different sentence.
6. Shorten one sentence.
7. Lock the story.
8. Close and reopen the app.
9. Confirm the exact locked story is restored.
10. Unlock the story deliberately.
11. Change a locked sentence.
12. Confirm downstream records are marked stale or potentially stale instead of silently remaining valid.

## Scope

### In Scope

- Install and configure the OpenAI SDK on the backend.
- Read the API key from backend environment variables only.
- Add backend story-generation routes.
- Add server-side prompts and schemas.
- Validate request payloads before calling OpenAI.
- Validate OpenAI responses before saving them.
- Add frontend loading, disabled and error states.
- Update the Story UI to handle generated content and sentence-level actions.
- Persist story changes to local project `lesson.json`.
- Preserve locked story exactness.
- Mark downstream records stale when story changes after downstream work exists.

### Out Of Scope

- Character extraction.
- Character image generation.
- Scene planning.
- Scene image generation.
- Audio/video prompt generation.
- ZIP export.
- PowerPoint generation.
- Worksheet generation.
- ElevenLabs integration.
- Video-platform integration.
- Firebase, accounts, cloud sync or remote project storage.

## Prerequisites

Milestone 2 should start only after Milestone 1 is reliable:

- Local app starts.
- Frontend and backend both run.
- Backend health endpoint works.
- Setup fields persist.
- Story draft/lock/unlock behavior works without AI.
- New, open and duplicate lesson workflows work.
- Lesson state renders from one lesson object.
- `lesson.json` is the project source of truth.

Do not begin Milestone 2 if story persistence or lock state persistence is unreliable.

## Product Rules To Preserve

- Use only these learner levels:
  - Literacies Plus
  - Complete Beginner
  - Beginner 1
  - Beginner 1.5
  - Beginner 2
- Do not introduce CEFR labels such as A1, A2 or B1 in the main app.
- Story sentences should have enough horizontal space to remain on one line on desktop where reasonable.
- Do not shrink story font size to force one-line display.
- The fixed master story is authoritative for downstream work.
- Once locked, downstream generation must use the exact approved sentences.
- If a locked story changes later, downstream outputs should be marked stale or potentially stale.
- Do not silently delete user work when marking downstream data stale.
- Keep OpenAI prompts and schemas server-side and versionable.
- Never expose the OpenAI API key in frontend code.
- Use structured JSON responses for story operations.

## Recommended Repository Additions

Adjust names to match the existing codebase, but keep the same ownership boundaries:

```text
server/
  src/
    routes/
      storyRoutes.js
    services/
      openaiClient.js
      storyGenerationService.js
    prompts/
      storyPrompts.js
    schemas/
      storySchemas.js
    validation/
      lessonValidation.js
frontend/
  src/
    api/
      storyApi.js
    components/
      StoryBuilder/
    state/
      lessonStore.js
docs/
  milestone-2-handoff.md
.env.example
```

If the project is not yet split into `src/` folders, use the current app conventions rather than forcing this exact structure.

## Environment And Secrets

### Required Environment Variable

The backend should read:

```text
OPENAI_API_KEY=
```

### Steps

1. Add `OPENAI_API_KEY` to `.env.example` with an empty placeholder value.
2. Ensure `.env` is ignored by Git.
3. Load environment variables in backend startup code.
4. Create the OpenAI client only on the backend.
5. Do not pass API keys to the frontend.
6. Do not add API keys to checked-in docs, tests or fixtures.
7. Make missing API key errors clear at startup or on first story request.

### Done When

- Backend can read `OPENAI_API_KEY` locally.
- Frontend bundle contains no API key.
- `.env` is not tracked.
- `.env.example` documents the required variable.

## Lesson Data Model Updates

Milestone 2 should preserve the Milestone 1 lesson object and add only fields needed for reliable story generation and auditing.

Recommended story shape:

```json
{
  "story": {
    "status": "draft",
    "sentences": [
      {
        "id": "sentence-001",
        "number": 1,
        "text": "Marta goes to the shop.",
        "source": "generated",
        "updatedAt": "2026-09-05T12:00:00.000Z"
      }
    ],
    "lockedAt": null,
    "lockedSentences": [],
    "modifiedAfterLock": false,
    "lastGeneratedAt": null,
    "generationMeta": {
      "model": "",
      "promptVersion": "",
      "level": "",
      "sentenceCount": 9
    }
  }
}
```

### Notes

- Existing `story.sentences` may already be a string array. If so, either migrate it to sentence objects or keep strings and add metadata elsewhere. Prefer sentence objects if the codebase can absorb the change cleanly.
- Keep sentence IDs stable after creation where possible.
- `lockedSentences` should capture the exact approved text at lock time.
- If storing both `sentences` and `lockedSentences`, define which field each UI state reads from:
  - Draft/unlocked view reads from `story.sentences`.
  - Locked downstream source reads from `story.lockedSentences`.
- If the app chooses not to duplicate locked sentences, it must still guarantee exact text preservation through tests and save/load behavior.

## Phase 5: First OpenAI Feature - Generate Story

### Goal

Turn Setup data into a real editable story draft using backend-only OpenAI integration.

### Backend Steps

1. Install the OpenAI SDK in the backend package.
2. Create a backend OpenAI client wrapper.
3. Add `POST /api/story/generate`.
4. Validate the request contains a valid lesson ID or lesson setup payload.
5. Load the latest lesson data from disk if the route accepts a lesson ID.
6. Validate required Setup fields before calling OpenAI.
7. Build generation instructions on the backend.
8. Include selected learner level, theme, setting, scenario, characters, sentence count, vocabulary and notes.
9. Require structured JSON output.
10. Validate returned JSON before mutating `lesson.json`.
11. Ensure the returned sentence count matches the requested count or handle mismatch explicitly.
12. Save the generated sentence array to `lesson.story.sentences`.
13. Set `lesson.story.status` to `draft`.
14. Set `story.lastGeneratedAt`.
15. Store generation metadata such as model, level and prompt version.
16. Return the updated story or full lesson object to the frontend.

### Frontend Steps

1. Add a Story API client function for `POST /api/story/generate`.
2. Wire Generate Story to the backend endpoint.
3. Disable Generate Story while a request is running.
4. Show a clear loading state.
5. Show validation errors returned by the backend.
6. Show API errors in the Story screen without losing the current draft.
7. Populate sentence cards from the returned story data.
8. Auto-save or accept backend-saved lesson data according to the app's persistence pattern.
9. Keep existing manual story editing behavior.

### Suggested Request Contract

If routes are project-based:

```json
{
  "lessonId": "lesson-001"
}
```

If routes are payload-based:

```json
{
  "lesson": {
    "id": "lesson-001",
    "theme": "Shopping",
    "title": "At the Corner Shop",
    "learnerLevel": "Literacies Plus",
    "setting": "Local corner shop",
    "scenario": "A learner buys milk and bread.",
    "sentenceCount": 9,
    "targetVocabulary": ["milk", "bread", "please"],
    "additionalNotes": "Keep sentences very short.",
    "characters": []
  }
}
```

Prefer `lessonId` when local persistence is already in place so the backend can load the canonical project state.

### Suggested Response Contract

Return either the full updated lesson or a story patch. Prefer returning the full updated lesson if that is already the app convention.

```json
{
  "lesson": {
    "id": "lesson-001",
    "story": {
      "status": "draft",
      "sentences": [
        {
          "id": "sentence-001",
          "number": 1,
          "text": "Marta goes to the shop.",
          "source": "generated",
          "updatedAt": "2026-09-05T12:00:00.000Z"
        }
      ],
      "lockedAt": null,
      "modifiedAfterLock": false
    }
  }
}
```

### Structured Output Requirements

The model response must contain:

- An ordered sentence array.
- One text value per sentence.
- No Markdown wrapper.
- No numbering embedded in the sentence text.
- No CEFR labels.
- No extra prose outside the structured output.

Recommended schema:

```json
{
  "sentences": [
    {
      "text": "Marta goes to the shop."
    }
  ]
}
```

### Story Validation

Validate at minimum:

- `sentences` exists.
- `sentences` is an array.
- Array length matches `lesson.sentenceCount`.
- Every sentence has a non-empty `text`.
- Text values are strings.
- Text values do not contain list numbering prefixes such as `1.`.
- Text values do not contain unsupported learner-level labels.
- Text values are not duplicates unless repetition is intentionally allowed for the selected level.

If validation fails:

- Do not overwrite the current story.
- Return a clear error.
- Log enough detail for debugging without logging secrets.
- Allow the user to try again.

### Level-Specific Generation Rules

Keep these rules in a server-side prompt file. They are product rules, not UI copy.

#### Literacies Plus

- Prioritize this level first.
- Use very concrete, everyday contexts.
- Use very short sentences.
- Prefer high-frequency words.
- Use simple subject-verb-object patterns.
- Avoid idioms and abstract language.
- Avoid unnecessary pronouns if names are clearer.
- Support early literacy needs with predictable rhythm and repetition.

#### Complete Beginner

- Use short, simple present-tense sentences.
- Keep vocabulary controlled.
- Use clear everyday actions.
- Avoid complex clauses.
- Avoid implied meaning that requires cultural inference.

#### Beginner 1

- Use simple sentences with slightly more variety.
- Allow basic connectors when useful.
- Keep events easy to visualize.
- Keep vocabulary tied to the selected situation.

#### Beginner 1.5

- Allow modest sentence variety.
- Use familiar connectors such as `and`, `but` and `because` sparingly.
- Keep the plot linear.
- Avoid dense grammar or long noun phrases.

#### Beginner 2

- Allow somewhat richer sentences while staying accessible.
- Use practical everyday language.
- Keep the story grounded in the requested scenario.
- Avoid drifting into intermediate-level complexity.

### Error States

Handle:

- Missing API key.
- Missing required Setup fields.
- Invalid learner level.
- Network/API failure.
- Rate limit or quota failure.
- Model response not valid JSON.
- Model response fails schema validation.
- File save failure after successful generation.

### Done When

- A valid Setup submission generates a plausible editable story.
- The selected internal ESOL level is used.
- The story appears as ordered editable sentence cards.
- The generated story is saved to `lesson.json`.
- API errors do not destroy existing story data.
- The API key is never exposed to the frontend.

## Phase 6: Complete The Story Builder

### Goal

Make the locked master story reliable enough to drive all later stages.

### Manual Sentence Editing

1. Allow direct manual editing of any draft sentence.
2. Auto-save sentence edits.
3. Preserve sentence order.
4. Preserve stable sentence IDs when text changes.
5. Mark manually edited sentences with metadata if useful.
6. If the story was previously locked, set `story.modifiedAfterLock` to `true`.
7. If downstream records exist, mark them stale or potentially stale.

### Regenerate One Sentence

Add a backend endpoint such as:

```text
POST /api/story/regenerate-sentence
```

Request should include:

- Lesson ID.
- Selected sentence ID or number.
- Whole current story.
- Selected sentence text.
- Lesson setup context.
- Learner level.

Backend behavior:

1. Validate the story is editable.
2. Load canonical lesson data.
3. Send the whole story and selected sentence context to OpenAI.
4. Ask for exactly one replacement sentence.
5. Preserve meaning and story continuity.
6. Validate the response.
7. Replace only the selected sentence.
8. Preserve sentence number and ID.
9. Save the updated lesson.
10. Return the updated lesson or story.

Frontend behavior:

1. Show loading state on only the selected sentence.
2. Disable conflicting actions for that sentence while running.
3. Keep other sentence cards visible.
4. Replace only the selected sentence on success.
5. Show inline error near the selected sentence on failure.

### Shorten One Sentence

Add a backend endpoint such as:

```text
POST /api/story/shorten-sentence
```

Backend behavior:

1. Validate the story is editable.
2. Send selected sentence, whole story and lesson context.
3. Ask for a shorter sentence with the same core meaning.
4. Preserve names, required vocabulary and essential action.
5. Validate the response.
6. Replace only the selected sentence.
7. Save the updated lesson.

Frontend behavior:

1. Show loading state on only the selected sentence.
2. Replace only the selected sentence on success.
3. Show inline error on failure.

### Regenerate Whole Story

Backend can reuse:

```text
POST /api/story/generate
```

or expose:

```text
POST /api/story/regenerate
```

Required behavior:

1. If the story has manual changes, warn before overwriting.
2. If the story is locked, require deliberate unlock or explicit overwrite confirmation.
3. Generate a complete replacement story from Setup context.
4. Validate the full response.
5. Replace the full sentence array only after validation succeeds.
6. Set status to `draft`.
7. Clear `lockedAt` only if the user has explicitly unlocked or confirmed replacement.
8. Mark downstream records stale if they exist.
9. Save the updated lesson.

### Lock Story

Required behavior:

1. Show explicit Lock Story confirmation.
2. Explain that the locked story becomes the master source for later stages.
3. On confirmation, set `story.status` to `locked`.
4. Record `story.lockedAt`.
5. Store the exact locked sentence texts.
6. Disable sentence editing controls.
7. Hide Regenerate and Shorten controls.
8. Display a clear locked state such as `MASTER STORY - LOCKED`.
9. Auto-save immediately.

### Unlock Story

Required behavior:

1. Unlock must be deliberate, not accidental.
2. Show a warning if downstream characters, scenes, media or exports exist.
3. On confirmation, set `story.status` to `draft`.
4. Preserve the locked story text as the draft starting point unless the user explicitly chooses another behavior.
5. Do not delete downstream work.
6. If story text changes after unlock, mark downstream records stale or potentially stale.

### Stale Downstream Data

Milestone 2 should implement the stale flag behavior even if later stages still use dummy content.

Recommended fields:

```json
{
  "characters": [
    {
      "id": "character-001",
      "stale": true,
      "staleReason": "Story changed after lock",
      "staleAt": "2026-09-05T12:00:00.000Z"
    }
  ],
  "scenes": [
    {
      "id": "scene-001",
      "stale": true,
      "staleReason": "Story changed after lock",
      "staleAt": "2026-09-05T12:00:00.000Z"
    }
  ],
  "media": {
    "stale": true,
    "staleReason": "Story changed after lock",
    "staleAt": "2026-09-05T12:00:00.000Z"
  }
}
```

Stale behavior rules:

- Mark stale when a story that had been locked is changed.
- Mark stale when a whole story is regenerated after downstream data exists.
- Mark stale when sentence order changes after downstream data exists.
- Do not mark stale for normal draft edits before any lock or downstream work exists.
- Show warnings clearly in downstream stages.
- Do not delete downstream character, scene or media records automatically.

### Done When

- The user can generate a story.
- The user can edit any sentence manually.
- The user can regenerate one sentence without changing other sentences.
- The user can shorten one sentence without changing other sentences.
- The user can regenerate the whole story after confirming overwrite risk.
- The user can lock the story.
- Locked text is exact and persists after app restart.
- Locked story disables editing and generation controls.
- The user can deliberately unlock the story.
- Changes after lock mark downstream records stale or potentially stale.

## Backend API Summary

Recommended endpoints:

```text
POST /api/story/generate
POST /api/story/regenerate
POST /api/story/regenerate-sentence
POST /api/story/shorten-sentence
POST /api/story/lock
POST /api/story/unlock
```

If the current backend already uses project-level update endpoints, the lock and unlock operations can be implemented through those existing routes. Use dedicated story endpoints if they make validation and intent clearer.

## Frontend UI Requirements

### Story Page Header

The Story page should clearly show:

- Story status: Draft or Master story - locked.
- Current learner level.
- Sentence count.
- Save status.
- Generate or Regenerate Whole Story action.
- Lock or Unlock Story action depending on state.

### Sentence Cards

Each draft sentence card should support:

- Sentence number.
- Editable sentence text.
- Save state or auto-save feedback.
- Edit mode if editing is explicit.
- Regenerate action.
- Shorten action.
- Inline loading state.
- Inline error state.

Each locked sentence card should show:

- Sentence number.
- Exact locked text.
- Lock indicator.
- No edit, regenerate or shorten controls.

### Confirmations

Use confirmation UI for:

- Lock Story.
- Unlock Story when downstream data exists.
- Regenerate Whole Story when manual changes exist.
- Regenerate Whole Story when locked story exists.

Do not use a browser alert if the app already has a modal or panel pattern.

## Prompt And Schema Versioning

Story prompts should be versioned in code.

Recommended metadata:

```json
{
  "promptVersion": "story-generate-v1",
  "schemaVersion": "story-sentences-v1",
  "model": "configured-model-name"
}
```

Store enough metadata to debug generated output later, but do not store secrets or full API credentials.

## Persistence Requirements

Save after:

- Whole story generation.
- Manual sentence edit.
- One-sentence regeneration.
- One-sentence shortening.
- Whole-story regeneration.
- Lock Story.
- Unlock Story.
- Stale downstream flag updates.

On save failure:

- Show a visible error.
- Do not imply the story is safely persisted.
- Avoid advancing the user into downstream stages until persistence succeeds.

## Testing And QA Checklist

### Environment

- `.env.example` includes `OPENAI_API_KEY`.
- `.env` is ignored by Git.
- Missing API key produces a clear error.
- Frontend bundle does not expose the API key.

### Generate Story

- Generate Story is disabled when required Setup fields are missing.
- Generate Story shows loading state.
- Generate Story sends request to backend.
- Backend validates Setup fields.
- Backend rejects invalid learner levels.
- Backend returns structured story data.
- Invalid model output does not overwrite current story.
- Generated story is saved to `lesson.json`.

### Learner Levels

- Literacies Plus generation uses the strictest, simplest style.
- Complete Beginner generation remains simple and concrete.
- Beginner 1 generation allows mild variety.
- Beginner 1.5 generation allows modest connectors.
- Beginner 2 generation is richer but still accessible.
- No CEFR labels appear in generated UI or story metadata shown to the tutor.

### Manual Editing

- Any draft sentence can be edited.
- Edits auto-save.
- Sentence order remains stable.
- Sentence IDs remain stable.
- Existing story is not lost on API error.

### Sentence Actions

- Regenerate one sentence changes only that sentence.
- Shorten one sentence changes only that sentence.
- Loading state is scoped to the selected sentence.
- Inline errors appear without losing draft text.

### Whole Story Regeneration

- Manual changes trigger overwrite warning.
- Locked story triggers explicit confirmation or requires unlock.
- Failed regeneration does not overwrite current story.
- Successful regeneration saves a new draft.

### Lock And Unlock

- Lock Story requires confirmation.
- Lock Story records `lockedAt`.
- Lock Story stores exact locked sentence text.
- Locked state disables editing controls.
- Locked story persists after restart.
- Unlock Story is deliberate.
- Unlock Story preserves text.

### Stale Downstream Warnings

- Story changes after lock set `modifiedAfterLock`.
- Existing character records are marked stale or potentially stale.
- Existing scene records are marked stale or potentially stale.
- Existing media/export metadata is marked stale if present.
- Downstream data is not deleted automatically.
- Downstream stages show stale warnings.

### Restart Persistence

- Generated draft story persists after restart.
- Manual sentence edits persist after restart.
- Locked story persists after restart.
- Unlock state persists after restart.
- Stale flags persist after restart.

## Suggested Manual Test Script

1. Start backend and frontend.
2. Create a new lesson.
3. Enter Setup:
   - Theme: Shopping
   - Lesson title: At the Corner Shop
   - Learner level: Literacies Plus
   - Setting: Local corner shop
   - Scenario: A learner buys milk and bread.
   - Main character name: Marta
   - Age: 34
   - Sex/Gender: Woman
   - Background/Nationality: Colombian
   - Sentence count: 9
   - Target vocabulary: milk, bread, please, thank you
4. Generate Story.
5. Confirm 9 sentences appear.
6. Edit sentence 2 manually.
7. Regenerate sentence 4.
8. Shorten sentence 6.
9. Lock Story.
10. Confirm edit/regenerate/shorten controls disappear.
11. Close and reopen app.
12. Open the lesson.
13. Confirm locked text is identical.
14. Add or confirm dummy downstream character/scene data exists.
15. Unlock Story.
16. Edit one sentence.
17. Confirm downstream stale warning appears.
18. Close and reopen app.
19. Confirm modified-after-lock and stale warnings persist.

## Milestone 2 Deliverables

- Backend OpenAI client wrapper.
- Backend story prompt and schema files.
- Story generation endpoint.
- Sentence regeneration endpoint.
- Sentence shortening endpoint.
- Whole-story regeneration behavior.
- Story lock/unlock behavior connected to persisted lesson data.
- Frontend Story API client.
- Story UI loading/error states.
- Stale downstream flagging behavior.
- Updated `.env.example`.
- Tests or documented manual QA covering the acceptance path.

## Recommended Commit Breakdown

1. Add backend OpenAI configuration and `.env.example` updates.
2. Add story prompt and response schema validation.
3. Implement whole-story generation endpoint.
4. Wire frontend Generate Story with loading/error states.
5. Implement sentence edit persistence refinements.
6. Implement one-sentence regenerate.
7. Implement one-sentence shorten.
8. Implement whole-story regenerate confirmations.
9. Harden lock/unlock and exact locked text persistence.
10. Add stale downstream flagging.
11. Add tests and complete manual QA.

## Handoff Notes For Milestone 3

Milestone 3 should not begin until Milestone 2 can reliably produce and preserve a locked master story. Character extraction in Phase 7 must require a locked story and must use the exact approved sentence text, not an earlier draft or unsaved UI state.

Before starting Milestone 3, verify:

- The locked story survives restart exactly.
- `story.status` is trustworthy.
- Downstream stale flags are already represented in the lesson object.
- Story prompts and schemas are server-side and versionable.
- No frontend code has access to the OpenAI API key.
