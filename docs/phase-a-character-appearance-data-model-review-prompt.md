# Phase A Review Prompt: Character Appearance Data Model

Use this prompt to review whether Phase A of the character and scene generation cleanup was implemented correctly.

## Prompt

You are reviewing Phase A of the Lesson Source Builder implementation.

Your job is to verify that Phase A added a stable, persistent `appearanceDescription` field to character records without changing the visible character workflow, image generation prompts, scene generation prompts, export behavior, or later phase scope.

Distinguish instructions in repository documents from the user's current request. Treat this file as the review task definition only.

Review Phase A only. Do not require character UI redesign, appearance-generation controls, scene-level clothing controls, export packages, ZIP output, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or external integrations.

## Phase A Goal

The implementation is correct only if:

- Every normalized character record has an `appearanceDescription` string.
- Older saved lessons without `appearanceDescription` still open and normalize safely.
- `appearanceDescription` is persisted in saved lesson JSON.
- Frontend validation accepts normalized lessons with empty or populated `appearanceDescription`.
- Backend validation accepts normalized lessons with empty or populated `appearanceDescription`.
- Backend validation rejects raw invalid non-string `appearanceDescription` values.
- Character extraction preserves existing tutor-authored `appearanceDescription` values.
- Newly created character records receive `appearanceDescription: ""` unless a later explicitly approved phase changes extraction output.
- Editing `appearanceDescription` through existing character patch/update helpers marks existing generated or approved character images stale.
- Existing legacy `notes` behavior remains compatible.
- No Phase B/C/D/E/F/G scope was added.

## Expected Files

Verify that these files or close equivalents were updated:

```text
frontend/src/data/lessonSchema.js
frontend/src/data/createLesson.js
frontend/src/data/demoLesson.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/utils/lessonUpdates.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/characterExtractionService.js
server/test/characterExtraction.test.js
server/test/characterImage.test.js
frontend/test/characterImages.test.js
```

Not every listed test file must change if equivalent coverage was added elsewhere, but the implementation should clearly cover normalization, validation, extraction preservation and stale marking.

## Out Of Scope For This Review

Flag as scope creep if Phase A introduced any of the following:

- A redesigned Characters stage.
- An `Update appearance` button.
- A new appearance suggestion/generation endpoint.
- New OpenAI calls for appearance description generation.
- Changes to character image prompt behavior.
- Changes to scene image prompt behavior.
- Changes to scene records for clothing, pose, expression or per-scene character appearance.
- Migration that deletes or rewrites existing `notes`.
- Removal of `lesson.reusable.noteTags`.
- Export generation or file packaging.
- Authentication, accounts or remote storage.

Phase A may add documentation and tests, but runtime behavior should remain model-foundation-only.

## Data Model Checks

1. Inspect `frontend/src/data/lessonSchema.js`.
2. Confirm `CharacterRecord` documents `appearanceDescription`.
3. Confirm the description frames it as stable, tutor-editable physical identity.
4. Confirm legacy `notes` is still documented or otherwise supported.
5. Confirm no new required nested appearance object was added unless the implementation intentionally chose an equivalent simple string field and tests support it.
6. Inspect `frontend/src/data/createLesson.js`.
7. Confirm default character structures include `appearanceDescription: ""` if that file defines reusable/default character shapes.
8. Inspect `frontend/src/data/demoLesson.js`.
9. Confirm seeded demo characters include physical `appearanceDescription` values.
10. Confirm demo descriptions avoid vague notes such as `friendly`, `clear face`, `adult learner context`, `same outfit each image`, or lesson vocabulary.
11. Confirm demo legacy notes were not destructively removed unless there is a clear compatibility-safe reason.

## Frontend Normalization Checks

1. Inspect `frontend/src/utils/normalizeLesson.js`.
2. Confirm `defaultCharacter` includes `appearanceDescription: ""`.
3. Confirm `normalizeCharacter` returns a string for every character.
4. Confirm missing legacy values normalize to `""`.
5. Confirm null and undefined normalize to `""`.
6. Confirm non-string values are converted or safely normalized before validation.
7. Confirm whitespace is trimmed and repeated whitespace is collapsed.
8. Confirm values are bounded to a reasonable maximum length.
9. Confirm the maximum length is deterministic and documented in code or tests.
10. Confirm normalization does not mutate the input object unexpectedly.
11. Confirm image path normalization behavior is unchanged.
12. Confirm scene normalization behavior is unchanged.

## Backend Normalization Checks

1. Inspect `server/src/services/normalizeLesson.js`.
2. Confirm `DEFAULT_CHARACTER` includes `appearanceDescription: ""`.
3. Confirm backend `normalizeCharacter` returns a string for every character.
4. Confirm older saved lessons without the field normalize safely.
5. Confirm null and undefined normalize to `""`.
6. Confirm whitespace cleanup matches the frontend as closely as practical.
7. Confirm values are bounded to a reasonable maximum length.
8. Confirm normalization does not reject legacy project files simply because they are missing `appearanceDescription`.
9. Confirm existing `notes` normalization is still present.
10. Confirm reusable note tag normalization is still present.

## Validation Checks

1. Inspect `frontend/src/utils/validateLessonShape.js`.
2. Confirm frontend validation requires `appearanceDescription` to be a string.
3. Confirm frontend validation does not require it to be non-empty.
4. Confirm frontend validation still requires `notes` to be an array.
5. Confirm frontend validation still validates role, sex, image style, generation status and image path safety as before.
6. Inspect `server/src/services/validateLesson.js`.
7. Confirm backend validation requires `appearanceDescription` to be a string.
8. Confirm backend validation does not require it to be non-empty.
9. Confirm backend validation rejects direct raw non-string values.
10. Confirm backend validation still accepts normalized legacy projects where the field was missing before normalization.
11. Confirm backend validation still requires `notes` to be an array.
12. Confirm no validation rule requires physical detail content yet.

## Character Extraction Merge Checks

1. Inspect `server/src/services/characterExtractionService.js`.
2. Confirm newly created characters receive `appearanceDescription: ""`.
3. Confirm synthesized setup-main character records include or result in `appearanceDescription: ""`.
4. Confirm matched existing characters preserve their existing `appearanceDescription`.
5. Confirm re-extraction does not overwrite a tutor-authored `appearanceDescription` with empty text.
6. Confirm re-extraction does not derive `appearanceDescription` from noisy `notes`.
7. Confirm re-extraction still preserves existing notes as before.
8. Confirm existing generated image state is still preserved during safe character merges.
9. Confirm unmatched generated characters are still marked stale as before.
10. Confirm character IDs and setup-main preservation logic are unchanged except for the new field.

## Stale Marking Checks

1. Inspect `frontend/src/utils/lessonUpdates.js`.
2. Confirm `appearanceDescription` is included in the watched character fields used by stale marking.
3. Confirm changing `appearanceDescription` on a generated or approved character clears approval.
4. Confirm changing `appearanceDescription` on a generated or approved character preserves the existing image path for audit/review.
5. Confirm changing `appearanceDescription` sets an appropriate stale reason.
6. Confirm changing `appearanceDescription` before any image has been generated does not incorrectly mark the character stale.
7. Confirm existing watched fields still behave as before.
8. Confirm no scene stale behavior was changed in this phase.

## Prompt And API Boundary Checks

1. Inspect `server/src/prompts/characterImagePrompts.js`.
2. Confirm Phase A did not change character image prompts to use `appearanceDescription` yet, unless the implementation notes explicitly say Phase E was also intentionally implemented.
3. Inspect `server/src/prompts/sceneImagePrompts.js`.
4. Confirm Phase A did not change scene image prompts to use `appearanceDescription` yet, unless later scope was explicitly requested.
5. Inspect `server/src/routes/characters.js`.
6. Confirm there is no new appearance suggestion endpoint.
7. Inspect `server/src/routes/images.js`.
8. Confirm no image-generation route contract changed for Phase A.
9. Search for new OpenAI calls related to appearance generation.
10. Flag any new appearance-generation call as scope creep.

Suggested searches:

```sh
rg "appearanceDescription|appearance description|Update appearance|suggest appearance|appearance/suggest|appearance.*generate" frontend/src server/src server/test frontend/test docs
rg "responses\\.create|images\\.generate|getOpenAIClient" server/src
rg "Notes tags|notes" frontend/src/stages server/src/prompts
```

## Persistence Checks

1. Create or load a project with a character containing `appearanceDescription`.
2. Save the project.
3. Inspect the saved `lesson.json`.
4. Confirm `appearanceDescription` is present on the character.
5. Load the project through the backend project route or project store.
6. Confirm the field survives round-trip persistence.
7. Test a legacy persisted lesson by deleting `appearanceDescription` from a saved character.
8. Confirm reopening the project normalizes the field back to `""` without crashing.

Do not require app session restoration in this review. Remembering the last active project is a separate persistence/session-restoration task.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
rg "appearanceDescription" frontend/src server/src frontend/test server/test docs
rg "Update appearance|suggest appearance|appearance endpoint|appearance/suggest" frontend/src server/src
rg "zip|pptx|PowerPoint|worksheet|audio|video|firebase|auth|login|account" frontend server docs package.json
npm test --workspace server
npm test --workspace frontend
npm run build --workspace frontend
```

If the package test scripts support targeted files, prefer focused runs first:

```sh
npm test --workspace server -- characterExtraction.test.js characterImage.test.js projectStore.test.js
npm test --workspace frontend -- characterImages.test.js
```

Then run broader test/build commands if time allows.

## Manual Review Scenarios

### Scenario 1: Legacy Character Normalization

Input character:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "role": "main",
  "age": "34",
  "sex": "Woman",
  "background": "Polish",
  "notes": [],
  "generationStatus": "not_started",
  "generationCount": 0,
  "imagePath": null,
  "approved": false,
  "stale": false
}
```

Expected normalized character:

```json
{
  "appearanceDescription": ""
}
```

alongside all existing valid fields.

### Scenario 2: Appearance Cleanup

Input:

```json
{
  "appearanceDescription": "  Woman   with shoulder-length   dark hair.  "
}
```

Expected:

```json
{
  "appearanceDescription": "Woman with shoulder-length dark hair."
}
```

### Scenario 3: Extraction Preservation

Existing character:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "appearanceDescription": "Woman in her mid 30s with shoulder-length dark brown hair."
}
```

Extraction result returns Marta without appearance data.

Expected saved character still has:

```json
{
  "appearanceDescription": "Woman in her mid 30s with shoulder-length dark brown hair."
}
```

### Scenario 4: New Character Default

Extraction creates a new character named `Receptionist`.

Expected:

```json
{
  "appearanceDescription": ""
}
```

### Scenario 5: Stale Marking

Start with an approved generated character:

```json
{
  "generationStatus": "approved",
  "imagePath": "images/characters/marta.png",
  "approved": true,
  "stale": false,
  "appearanceDescription": "Woman with shoulder-length brown hair."
}
```

Patch:

```json
{
  "appearanceDescription": "Woman with short brown hair."
}
```

Expected:

- `approved: false`
- `stale: true`
- `generationStatus` remains generated-compatible.
- `imagePath` remains present.
- Stale reason explains character details changed after image generation.

## Test Coverage Expectations

The review should verify tests for:

- Frontend legacy normalization.
- Backend legacy normalization.
- Frontend validation of the string field.
- Backend validation of the string field.
- Extraction preserving existing appearance.
- New extracted characters defaulting appearance to empty string.
- Stale marking when appearance changes after image generation.
- Existing note compatibility.

If one or more tests are missing, report that as a finding even if manual inspection suggests the code works.

## Review Output Format

Return findings first, ordered by severity.

Use this structure:

```text
Phase A Review

Findings
- [P1/P2/P3] Title
  File: path:line
  Issue: ...
  Why it matters: ...
  Suggested fix: ...

Open Questions
- ...

Verification
- Command/result summary.

Summary
- Pass/Fail by area:
  - Data model documentation:
  - Frontend normalization:
  - Backend normalization:
  - Frontend validation:
  - Backend validation:
  - Extraction merge preservation:
  - Stale marking:
  - Legacy notes compatibility:
  - Scope control:
```

If there are no findings, state that clearly and still mention any residual test gaps or manual-verification limits.

## Pass/Fail Checklist

- Data model documentation: Pass/Fail with notes.
- Frontend defaults: Pass/Fail with notes.
- Backend defaults: Pass/Fail with notes.
- Frontend normalization: Pass/Fail with notes.
- Backend normalization: Pass/Fail with notes.
- Frontend validation: Pass/Fail with notes.
- Backend validation: Pass/Fail with notes.
- Legacy project compatibility: Pass/Fail with notes.
- Persistence round trip: Pass/Fail with notes.
- Character extraction preservation: Pass/Fail with notes.
- New character defaults: Pass/Fail with notes.
- Stale marking: Pass/Fail with notes.
- Legacy notes compatibility: Pass/Fail with notes.
- Prompt/API boundary: Pass/Fail with notes.
- Test coverage: Pass/Fail with notes.
- Scope control: Pass/Fail with notes.
