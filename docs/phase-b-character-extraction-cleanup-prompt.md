# Phase B Implementation Prompt: Character Extraction Cleanup

Use this prompt to implement Phase B of the character and scene generation cleanup.

## Context

Phase A added `appearanceDescription` to character records as the stable, tutor-editable physical identity field.

The current character extraction flow still treats `notes` as an AI-generated catch-all field. In practice, extraction can produce notes such as lesson vocabulary, scene actions, educational context and vague image advice. Those notes then appear in the Characters stage and pollute downstream image guidance.

Observed examples include:

- `appointment`
- `symptoms`
- `prescription`
- `pain`
- `queue`
- `friendly`
- `clear face`
- `adult learner context`
- `same outfit each image`

These are not reliable character identity data. Character extraction should identify recurring human characters and preserve tutor-authored character data. It should not automatically add visible note tags derived from story context.

## Phase B Goal

Clean up character extraction so it no longer auto-populates noisy visible character notes.

Character extraction should produce and merge lightweight character records without taking over tutor-controlled appearance or note fields.

Phase B should make extraction safer and quieter. It should not redesign the UI, add appearance generation, or change image prompts.

## Scope

Implement Phase B only.

Do not implement:

- Character card UI redesign.
- `Update appearance` button.
- Backend appearance suggestion endpoint.
- Character image prompt changes.
- Scene image prompt changes.
- Scene data model changes.
- Scene-specific clothing, pose or expression fields.
- Export changes.
- ZIP generation.
- PowerPoint generation.
- Worksheet generation.
- Audio or video generation.
- Accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or sharing.

## Required Behavior

After Phase B:

- Character extraction still finds the Setup main character.
- Character extraction still finds recurring secondary/supporting human characters.
- Character extraction still uses locked story sentence IDs to ground characters.
- Character extraction still preserves existing character IDs where names match.
- Character extraction still preserves tutor edits on matched characters.
- Character extraction preserves existing `appearanceDescription`.
- Character extraction does not overwrite `appearanceDescription`.
- Character extraction does not invent `appearanceDescription`.
- Character extraction does not append model-generated notes to visible `character.notes`.
- New extracted characters should default to `notes: []`.
- Existing character notes should be preserved exactly unless the tutor later edits them.
- `lesson.reusable.noteTags` should not be expanded from AI-extracted character notes.
- Legacy projects that already contain notes should continue to open and save.

## Desired Data Boundary

Character extraction is responsible for:

- `name`
- `role`
- `age`
- `sex`
- `background`
- `storySentenceIds`

Character extraction is not responsible for:

- Tutor-authored `appearanceDescription`
- Tutor-authored `notes`
- Image prompt advice
- Scene clothing
- Scene expression
- Scene action
- Lesson vocabulary tags
- Learner-level labels
- Educational tone tags

`appearanceDescription` will be handled by later phases as an editable, possibly suggested field.

`notes` remains for backward compatibility, but Phase B should stop adding AI-generated notes to it.

## Files To Inspect

Before changing code, inspect:

- `docs/phase-a-character-appearance-data-model-prompt.md`
- `frontend/src/data/lessonSchema.js`
- `frontend/src/utils/normalizeLesson.js`
- `server/src/prompts/characterPrompts.js`
- `server/src/schemas/characterSchemas.js`
- `server/src/services/validateCharacterExtraction.js`
- `server/src/services/characterExtractionService.js`
- `server/src/services/normalizeLesson.js`
- `server/src/services/validateLesson.js`
- `server/test/characterExtraction.test.js`
- `frontend/test/characterImages.test.js`

Use existing local patterns for schemas, validation errors, normalization and tests.

## Implementation Steps

### 1. Update Character Extraction Prompt

In `server/src/prompts/characterPrompts.js`, remove or revise instructions that encourage generated character notes.

Current problematic instruction may be similar to:

```text
- Notes must be short reusable tags that help later continuity.
```

Replace with instructions that make the boundary clear:

```text
- Do not generate character notes.
- Do not generate appearance descriptions.
- Character notes and appearance descriptions are tutor-controlled fields.
- Use locked story sentence IDs only to ground which characters recur in the story.
```

If the output schema still requires `notes`, instruct the model to return:

```text
- Return notes as an empty array.
```

Also ensure the prompt still says:

- Include the Setup main character.
- Include Setup secondary characters only when present in or clearly needed by the locked story.
- Prefer named or role-named recurring humans over one-off background people.
- Avoid inventing unnecessary background characters.
- Leave unknown age, sex or background empty, except use `Unspecified` for unknown sex.
- Do not use external proficiency labels.

### 2. Decide Whether To Keep `notes` In The Extraction Schema

Prefer the least disruptive change.

Option A, recommended for Phase B:

- Keep `notes` in the extraction response schema for compatibility.
- Require it to be an array.
- Prompt the model to return `notes: []`.
- Ignore extracted notes during merge even if the model returns values.

Option B, larger change:

- Remove `notes` from the extraction response schema.
- Update validation and tests accordingly.

Use Option A unless there is a strong reason to change the schema. It keeps the backend response contract stable while fixing the noisy behavior.

### 3. Sanitize Or Ignore Extracted Notes

In `server/src/services/characterExtractionService.js`, stop appending `extracted.notes` to `character.notes`.

Current behavior may be similar to:

```js
notes: mergeTags(existing?.notes || [], extracted.notes || [])
```

Change it so matched characters preserve only their existing notes:

```js
notes: existing?.notes || []
```

For new extracted characters:

```js
notes: []
```

If a helper such as `createNewCharacter` currently uses `extracted.notes`, remove that dependency.

Do not delete the `mergeTags` helper if it is still used for backgrounds or other fields.

### 4. Preserve `appearanceDescription`

Make sure extraction merge preserves `appearanceDescription` on existing matched characters.

For matched existing characters:

```js
appearanceDescription: existing?.appearanceDescription || ""
```

For new characters:

```js
appearanceDescription: ""
```

Do not populate `appearanceDescription` from extracted notes, story text, lesson setup, or AI output in Phase B.

### 5. Stop Expanding Reusable Note Tags From Extraction Output

In `applyExtractedCharacters`, review how `lesson.reusable.noteTags` is updated.

Current behavior may be similar to:

```js
noteTags: mergeTags(
  lesson.reusable.noteTags,
  mergedCharacters.flatMap((character) => character.notes)
)
```

This can preserve user-entered reusable tags, but it should not add AI-extracted notes after Phase B.

Recommended behavior:

```js
noteTags: lesson.reusable.noteTags
```

or, if normalization is needed:

```js
noteTags: mergeTags(lesson.reusable.noteTags, [])
```

Do not remove existing reusable note tags from legacy projects.

Do not auto-add notes from extracted characters into `lesson.reusable.noteTags`.

### 6. Update Character Extraction Validation If Needed

If `notes` remains in the schema:

- Keep validating it as an array.
- Keep rejecting malformed values.
- Keep blocking unsupported proficiency labels if a note is present.
- Consider normalizing returned notes to `[]` before merge, or simply ignore them during merge.

If `notes` is removed from the schema:

- Update `server/src/schemas/characterSchemas.js`.
- Update `server/src/services/validateCharacterExtraction.js`.
- Update every test fixture that expects `notes`.

Again, prefer keeping `notes` in the extraction schema but ignoring it in merge.

### 7. Preserve Existing Tutor Notes

Existing manually curated notes should survive extraction.

Example:

Before extraction:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "notes": ["short dark hair"],
  "appearanceDescription": "Woman in her mid 30s with shoulder-length dark brown hair."
}
```

Model returns:

```json
{
  "name": "Marta",
  "notes": ["appointment", "queue"]
}
```

After extraction:

```json
{
  "notes": ["short dark hair"],
  "appearanceDescription": "Woman in her mid 30s with shoulder-length dark brown hair."
}
```

No `appointment` or `queue` should be appended.

### 8. Preserve Generated State Correctly

Do not regress existing generation-state behavior.

Matched existing characters should still preserve:

- `id`
- `generationStatus`
- `generationCount`
- `imagePath`
- `imageMeta`
- `approved`
- `stale`
- `staleReason`
- `staleAt`
- `imageStyle`
- existing `notes`
- existing `appearanceDescription`

Unmatched generated characters should still be preserved and marked stale according to existing rules.

### 9. Update Tests

Update `server/test/characterExtraction.test.js` first.

Add or update tests for:

1. Extracted model notes are ignored for new characters.
2. Extracted model notes are not appended to matched existing characters.
3. Existing tutor notes are preserved exactly.
4. Existing reusable note tags are preserved.
5. Reusable note tags are not expanded from extracted model notes.
6. Existing `appearanceDescription` is preserved through re-extraction.
7. New extracted characters default to `appearanceDescription: ""`.
8. Generated/approved character state remains preserved on matched characters.
9. Omitted Setup main behavior still works.
10. Conflicting Setup main validation still works.

Example assertion changes:

Before Phase B, a test may assert:

```js
assert.deepEqual(marta.notes, ["clear face", "needs appointment"]);
```

After Phase B, it should assert:

```js
assert.deepEqual(marta.notes, ["clear face"]);
```

For a new extracted character:

```js
assert.deepEqual(receptionist.notes, []);
assert.equal(receptionist.appearanceDescription, "");
```

Also add or update frontend tests only if frontend helpers depend on extraction outputs. Phase B should mainly be backend extraction behavior.

### 10. Confirm No Prompt/Image Scope Changed

Search the image prompt files:

- `server/src/prompts/characterImagePrompts.js`
- `server/src/prompts/sceneImagePrompts.js`

Do not change them in Phase B unless a test requires a purely mechanical compatibility update. Prompt cleanup belongs to a later phase.

### 11. Confirm No UI Scope Changed

Search the Characters stage:

- `frontend/src/stages/CharactersStage.jsx`

Do not remove the Notes UI in Phase B.

Do not add an Appearance UI in Phase B unless Phase A already added a passive field display and the current task explicitly requires a mechanical compatibility fix. UI redesign belongs to a later phase.

## Acceptance Criteria

Phase B is complete when:

- Character extraction still succeeds for valid locked lessons.
- The Setup main character is still guaranteed in saved character records.
- New extracted characters have `notes: []`.
- Matched existing characters preserve existing notes exactly.
- Extracted model notes are ignored and not surfaced in `character.notes`.
- `lesson.reusable.noteTags` is not expanded from model-extracted character notes.
- Existing reusable note tags remain intact.
- Existing `appearanceDescription` values survive re-extraction.
- New extracted characters default to `appearanceDescription: ""`.
- Existing generated/approved character state is preserved when character records match.
- Existing unmatched generated character stale behavior still works.
- Character extraction prompt clearly tells the model not to generate notes or appearance descriptions.
- No new appearance endpoint has been added.
- No image prompt behavior has changed.
- No scene prompt behavior has changed.
- No character UI redesign has been added.
- Tests cover the behavior above.

## Suggested Verification Commands

Run focused tests first:

```sh
npm test --workspace server -- characterExtraction.test.js
```

Then run related suites:

```sh
npm test --workspace server -- characterExtraction.test.js characterImage.test.js scenePlanning.test.js
npm test --workspace frontend -- characterImages.test.js
```

If file filters are unsupported, run:

```sh
npm test --workspace server
npm test --workspace frontend
```

Also run build/lint/format commands if they exist:

```sh
npm run build --workspace frontend
```

Use `package.json` scripts as the source of truth for available commands.

## Review Search Commands

Use these searches to confirm scope and behavior:

```sh
rg "notes: mergeTags|flatMap\\(\\(character\\) => character\\.notes\\)|extracted\\.notes" server/src/services/characterExtractionService.js
rg "Notes must|Return notes|Do not generate character notes|appearanceDescription" server/src/prompts/characterPrompts.js
rg "Update appearance|suggest appearance|appearance/suggest|appearance endpoint" frontend/src server/src
rg "buildCharacterImagePrompt|buildSceneImagePrompt|Notes tags" server/src/prompts
```

Expected result:

- `extracted.notes` should not be used to populate saved character notes.
- Character extraction prompt should discourage generated notes.
- No appearance endpoint should exist yet.
- Image prompt files should be unchanged except for unrelated existing code.

## Handoff Summary Template

When finished, report:

- Files changed.
- How character extraction prompt behavior changed.
- Whether extraction schema still includes `notes`.
- How extracted notes are ignored or sanitized.
- How existing tutor notes are preserved.
- How reusable note tags are preserved without auto-expansion.
- How `appearanceDescription` is preserved.
- Which tests were added or updated.
- Which verification commands were run.
- Any follow-up work intentionally left for later phases.

Keep the final summary clear that Phase B only cleans extraction behavior. It does not implement the editable appearance UI, appearance update button, appearance generation endpoint, image prompt cleanup, scene prompt cleanup or exports.
