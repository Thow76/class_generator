# Phase A Implementation Prompt: Character Appearance Data Model

Use this prompt to implement Phase A of the character and scene generation cleanup.

## Context

The Lesson Source Builder currently uses character `notes` as a broad catch-all field. These notes are visible in the Characters stage and are also used by image prompts. In practice, the field now mixes tutor-authored guidance, AI-extracted story context, vague image-generation advice and scene-level details.

Examples of problematic notes observed in the current implementation include:

- `same outfit each image`
- `clear face`
- `friendly`
- `adult learner context`
- `appointment`
- `symptoms`
- `prescription`
- `pain`
- `queue`

This is making the character generation model unclear. Character generation should be based on a stable, editable physical appearance description. Scene-specific visual details should belong to scenes, not to the character record.

## Phase A Goal

Clarify the data model by adding an editable, persistent `appearanceDescription` field to character records.

This phase should only establish the model, normalization, validation and compatibility foundations. It should not redesign the UI, add appearance generation, change scene generation, or remove legacy notes.

## Scope

Implement Phase A only.

Do not implement:

- Character card UI redesign.
- `Update appearance` button.
- Backend appearance suggestion endpoint.
- Character image prompt changes.
- Scene image prompt changes.
- Scene data model changes.
- Export changes.
- ZIP generation.
- PowerPoint generation.
- Worksheet generation.
- Audio or video generation.
- Accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or sharing.

## Current Problem

The existing `CharacterRecord` uses:

```js
notes: []
```

as the only flexible tutor-editable visual guidance field.

That is no longer precise enough. The app needs a separate character-level field for stable physical identity:

```js
appearanceDescription: ""
```

This field should describe what the person generally looks like across the lesson.

## Desired Character Boundary

`appearanceDescription` is for stable physical identity, such as:

- Hair length, colour and broad style.
- Eye colour when known or chosen by the tutor.
- Approximate height.
- Approximate build.
- Skin tone or complexion when the tutor chooses to specify it.
- Age presentation.
- Facial features.
- Distinctive stable physical features.
- A stable default visual identity that should survive across scenes.

`appearanceDescription` is not for:

- Current scene action.
- Scene location.
- Temporary pose.
- Temporary facial expression.
- Clothing that changes scene by scene.
- Props held in a scene.
- Lesson vocabulary.
- Learner level.
- Educational tone.
- Vague style tags such as `friendly`, `clear face` or `adult learner context`.
- Global continuity commands such as `same outfit each image`.

Scene-specific appearance and clothing should be handled in later scene phases.

## Data Model Requirements

Add `appearanceDescription` to every character record shape used by the app.

The field must be:

- A string.
- Persistent in saved lesson JSON.
- Editable in later phases.
- Normalized safely when opening older project files.
- Preserved during character extraction and merge operations.
- Included in frontend and backend validation.
- Treated as part of the generated character image dependency surface, so later edits can mark existing generated character images stale.

## Files To Inspect

Before changing code, inspect the current implementations:

- `frontend/src/data/lessonSchema.js`
- `frontend/src/data/createLesson.js`
- `frontend/src/data/demoLesson.js`
- `frontend/src/utils/normalizeLesson.js`
- `frontend/src/utils/validateLessonShape.js`
- `frontend/src/utils/lessonUpdates.js`
- `server/src/services/normalizeLesson.js`
- `server/src/services/validateLesson.js`
- `server/src/services/characterExtractionService.js`
- `server/test/characterExtraction.test.js`
- `server/test/characterImage.test.js`
- `frontend/test/characterImages.test.js`

Add or update related tests where appropriate.

## Implementation Steps

### 1. Update Shared Character Shape Documentation

In `frontend/src/data/lessonSchema.js`, update the `CharacterRecord` typedef to include:

```js
 * @property {string} appearanceDescription Stable tutor-editable physical description used for character identity.
```

Place it near `background` and before legacy `notes`, because it is part of the core character description.

Do not remove `notes` in this phase.

### 2. Update Frontend Defaults

In `frontend/src/utils/normalizeLesson.js`, add:

```js
appearanceDescription: ""
```

to `defaultCharacter`.

Ensure `normalizeCharacter` always returns a string value:

```js
normalized.appearanceDescription = normalizeLongText(
  normalized.appearanceDescription
);
```

If no helper exists, add a small local helper that:

- Converts null/undefined to `""`.
- Converts other values with `String(value)`.
- Trims leading/trailing whitespace.
- Collapses repeated whitespace to a single space.
- Enforces a reasonable maximum length.

Recommended maximum: 600 characters.

If truncating, do so deterministically with `slice(0, 600).trim()`.

Do the same in `frontend/src/data/createLesson.js` if that file defines default lesson/character structures directly.

### 3. Update Backend Defaults

In `server/src/services/normalizeLesson.js`, add:

```js
appearanceDescription: ""
```

to `DEFAULT_CHARACTER`.

Ensure backend normalization safely handles older saved projects that do not have the field.

Backend normalization should also clean the value as a bounded string. Use the same behavior as the frontend where practical:

- Null/undefined -> `""`.
- String conversion.
- Trim.
- Collapse whitespace.
- Maximum 600 characters.

Do not reject older projects for missing `appearanceDescription`.

### 4. Update Demo Data Carefully

In `frontend/src/data/demoLesson.js`, add `appearanceDescription` to each seeded character.

Keep these descriptions simple and physical. Avoid vague notes.

Example:

```js
appearanceDescription:
  "Woman in her mid 30s with shoulder-length dark brown hair, brown eyes, light skin and an average build."
```

Do not remove existing legacy `notes` in this phase unless a test requires a minor update. Phase A is compatibility-first.

### 5. Update Frontend Validation

In `frontend/src/utils/validateLessonShape.js`, validate that every character has a string `appearanceDescription`.

Recommended rule:

```js
if (typeof character.appearanceDescription !== "string") {
  errors.push(`${character.id || "A character"} appearanceDescription must be a string.`);
}
```

If the frontend normalizer converts legacy or invalid values to strings, this validation should mostly protect internal consistency.

Do not require the field to be non-empty yet. Empty appearance descriptions are valid in Phase A.

### 6. Update Backend Validation

In `server/src/services/validateLesson.js`, validate that every character has a string `appearanceDescription`.

Recommended rule:

```js
if (typeof character?.appearanceDescription !== "string") {
  errors.push({
    path: `${path}.appearanceDescription`,
    message: `${character?.id || "A character"} appearanceDescription must be a string.`
  });
}
```

Do not require non-empty values.

Also ensure metadata bounds are unaffected.

### 7. Preserve Appearance During Character Extraction Merge

In `server/src/services/characterExtractionService.js`, update character creation and merging.

For newly created characters:

```js
appearanceDescription: cleanText(extracted.appearanceDescription) || ""
```

However, if the Phase A extraction schema does not include `appearanceDescription`, simply initialize new records to:

```js
appearanceDescription: ""
```

For existing matched characters, preserve existing tutor edits:

```js
appearanceDescription: cleanLongText(existing?.appearanceDescription)
```

Do not let AI-extracted notes overwrite or imply `appearanceDescription` in this phase.

If `ensureSetupMainCharacter` synthesizes a setup main character, include:

```js
appearanceDescription: ""
```

if that object is expected to pass through shared merge code.

### 8. Mark Character Images Stale When Appearance Changes

In `frontend/src/utils/lessonUpdates.js`, update the watched fields in `markCharacterImageStaleIfNeeded`.

Current watched fields likely include:

```js
["name", "age", "sex", "background", "notes", "imageStyle"]
```

Add:

```js
"appearanceDescription"
```

This means that once UI editing arrives, changing the appearance description will correctly mark existing generated/approved character references as stale.

Do not remove `notes` from the watched fields in Phase A unless explicitly instructed later. Notes remain legacy-compatible for now.

### 9. Keep Existing Notes Compatible

Do not remove:

- `character.notes`
- `lesson.reusable.noteTags`
- existing note normalization
- existing note validation
- existing note tests

Phase A introduces the new field while preserving old data.

Later phases can reduce, hide or migrate notes.

### 10. Add Tests

Add focused tests for the new model field.

Recommended backend tests:

1. `normalizeLesson` adds `appearanceDescription: ""` to legacy characters.
2. `normalizeLesson` cleans whitespace in `appearanceDescription`.
3. `validateLesson` rejects a non-string `appearanceDescription` if validation is called directly on invalid raw data.
4. `applyExtractedCharacters` preserves an existing character's `appearanceDescription`.
5. New extracted characters receive `appearanceDescription: ""`.

Recommended frontend tests:

1. `normalizeLessonForClient` adds `appearanceDescription: ""` to legacy characters.
2. `normalizeLessonForClient` cleans whitespace in `appearanceDescription`.
3. `validateLessonShape` accepts normalized characters with empty appearance descriptions.
4. `patchCharacter(..., { appearanceDescription: "..." })` marks generated/approved images stale.

Prefer updating existing character-related test files rather than creating broad new suites.

## Acceptance Criteria

Phase A is complete when:

- Every normalized character has an `appearanceDescription` string.
- Older saved lessons without the field still open.
- The backend persists the field in `lesson.json`.
- Frontend validation accepts normalized lessons with the field.
- Backend validation accepts normalized lessons with the field.
- Backend validation rejects invalid raw non-string values.
- Character extraction preserves existing appearance descriptions.
- New character records get an empty appearance description by default.
- Editing `appearanceDescription` through `patchCharacter` marks existing generated/approved character images stale.
- Existing notes still work as before.
- No UI redesign has been implemented.
- No image prompt changes have been implemented.
- No appearance generation endpoint has been implemented.
- No scene generation changes have been implemented.

## Suggested Verification Commands

Run the focused tests first:

```sh
npm test --workspace server -- characterExtraction.test.js characterImage.test.js projectStore.test.js
npm test --workspace frontend -- characterImages.test.js
```

If the repo test scripts do not accept file filters, run the nearest available package test commands:

```sh
npm test --workspace server
npm test --workspace frontend
```

Also run formatting/linting commands if they exist in `package.json`.

## Handoff Summary Template

When finished, report:

- Files changed.
- How legacy characters are normalized.
- How `appearanceDescription` is validated.
- Whether extraction preserves existing tutor-authored appearance descriptions.
- Which tests were run.
- Any follow-up work intentionally left for Phase B/C/D.

Keep the final implementation summary clear that this phase only adds the model foundation.
