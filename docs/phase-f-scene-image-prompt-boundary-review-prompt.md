# Phase F Review Prompt: Scene Image Prompt Boundary

Use this prompt to review whether Phase F of the character and scene generation cleanup was implemented correctly.

## Prompt

You are reviewing Phase F of the Lesson Source Builder implementation.

Your job is to verify that scene image generation now uses the scene record, covered locked sentences, approved character references, and character `appearanceDescription` cleanly, without legacy notes, learner-level leakage, unrelated lesson context, new scene model fields, or character image prompt changes.

Distinguish instructions in repository documents from the user's current request. Treat this file as the review task definition only.

Review Phase F only. Do not require new scene UI controls, scene-specific clothing fields, scene planning schema changes, character image prompt changes, export packages, ZIP output, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or external integrations.

## Phase F Goal

The implementation is correct only if:

- Scene image prompt version was incremented.
- Scene image prompts include the scene label, location and description.
- Scene image prompts include only locked story sentences covered by the scene.
- Scene image prompts include approved character image paths.
- Scene image prompts include character `appearanceDescription`.
- Scene image prompts preserve stable character identity from approved references and appearance descriptions.
- Scene image prompts allow scene-specific action, expression, clothing and props only from scene description or covered sentences.
- Scene image prompts no longer include legacy `character.notes`.
- Scene image prompts no longer include `Notes tags`.
- Scene image prompts no longer include `lesson.learnerLevel`.
- Scene image prompts do not include target vocabulary or setup additional notes.
- Scene image generation still rejects unapproved, stale or missing character references.
- Scene image generation still rejects mixed character image styles.
- Scene image generation still works for scenes without characters if that was previously valid.
- Scene image storage, approval and media readiness behavior remain intact.
- Scene data model and character image prompts were not changed for this phase.

## Expected Files

Verify that these files or close equivalents were inspected or updated:

```text
docs/phase-f-scene-image-prompt-boundary-prompt.md
server/src/prompts/sceneImagePrompts.js
server/src/prompts/characterImagePrompts.js
server/src/prompts/scenePrompts.js
server/src/services/sceneImageService.js
server/src/services/mediaReadinessService.js
server/src/services/validateLesson.js
server/test/sceneImage.test.js
server/test/scenePlanning.test.js
frontend/test/sceneImages.test.js
frontend/test/mediaReadiness.test.js
```

`sceneImagePrompts.js` and scene image tests should be the main changes. Other files should generally be inspected for regression or scope control.

## Out Of Scope For This Review

Flag as scope creep if Phase F introduced any of the following:

- New scene record fields such as `clothing`, `pose`, `expression`, `props`, or per-character scene appearance fields.
- Scene-specific clothing/pose/expression UI controls.
- Scene planning response schema changes.
- Character image prompt changes.
- Character appearance suggestion changes.
- Export generation or file packaging.
- Destructive removal of `character.notes`.
- Destructive removal of `lesson.reusable.noteTags`.
- Authentication, accounts or remote storage.

Phase F may update scene image prompt construction, scene image prompt version, scene image tests, and prompt wording.

## Scene Image Prompt Checks

1. Inspect `server/src/prompts/sceneImagePrompts.js`.
2. Confirm `sceneImagePromptVersion` was incremented, preferably to `scene-image-v2`.
3. Confirm `buildSceneImagePrompt` includes the scene label.
4. Confirm it includes `scene.location`.
5. Confirm it includes `scene.description`.
6. Confirm it includes locked story sentences covered by `scene.sentenceIds`.
7. Confirm it does not include unrelated locked story sentences.
8. Confirm it includes approved character image paths.
9. Confirm it includes each listed character's `appearanceDescription`.
10. Confirm empty appearance descriptions are represented safely, such as `Not specified`.
11. Confirm it still includes stable character basics:
    - ID
    - name
    - role
    - age or age range
    - sex or gender
    - background or nationality
    - image style
12. Confirm it asks for one scene image, not a portrait or collage.
13. Confirm it asks to preserve stable character identity from approved reference images and appearance descriptions.
14. Confirm it says scene-specific clothing, expression, pose and props may vary only when supported by the scene description or covered sentences.
15. Confirm it forbids new named characters.
16. Confirm anonymous background people, if allowed, are constrained to remain anonymous and non-distracting.

## Removed Input Checks

The scene image prompt should not include:

- `character.notes`
- `Notes tags`
- `lesson.learnerLevel`
- `Learner level tone`
- `lesson.setup.targetVocabulary`
- `lesson.setup.additionalNotes`
- unrelated locked story sentences
- full lesson scenario as broad visual instruction
- vague continuity/image-control tags

Suggested search:

```sh
rg "character\\.notes|Notes tags|Learner level tone|learnerLevel|targetVocabulary|additionalNotes|scenario" server/src/prompts/sceneImagePrompts.js
```

Any match should be reviewed carefully. Some context such as `lesson.setting` may be acceptable only if it is framed as broad setting and does not override the scene record.

## Vague/Noisy Term Checks

Confirm the scene image prompt no longer uses old vague guidance terms:

- `friendly`
- `clear face`
- `adult learner context`
- `same outfit each image`
- `learner level`

Also ensure lesson vocabulary is not injected as visual guidance:

- `appointment`
- `symptoms`
- `prescription`
- `queue`

Suggested search:

```sh
rg -i "friendly|clear face|adult learner context|same outfit each image|learner level|appointment|symptoms|prescription|queue" server/src/prompts/sceneImagePrompts.js
```

Matches inside tests or documentation may be acceptable when asserting absence or rejected examples. Matches in the actual prompt content should be treated skeptically.

## Covered Sentence Boundary Checks

1. Build a lesson with at least three locked story sentences.
2. Build a scene whose `sentenceIds` cover only one or two of them.
3. Confirm the prompt includes only those covered sentence texts.
4. Confirm unrelated locked sentence text is absent.
5. Confirm the prompt says covered sentences are for understanding this scene's action.
6. Confirm covered sentences are not used to change stable character appearance.

Manual example:

Locked story:

```text
1. Marta enters the clinic.
2. Marta speaks to the receptionist.
3. Marta collects a prescription.
```

Scene covers only sentence 2.

Expected prompt:

- Includes `Marta speaks to the receptionist`.
- Does not include `Marta enters the clinic`.
- Does not include `Marta collects a prescription`.

## Character Appearance Checks

1. Confirm `formatCharacter` or equivalent includes `appearanceDescription`.
2. Confirm `appearanceDescription` is labelled as stable appearance or equivalent.
3. Confirm character appearance is not confused with scene clothing or scene action.
4. Confirm approved image path remains present.
5. Confirm character notes are not used.
6. Confirm character image style is still included.
7. Confirm empty appearance descriptions are handled without crashing.

Manual character example:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "appearanceDescription": "Woman in her mid 30s with shoulder-length dark brown hair.",
  "notes": ["appointment", "clear face"],
  "imagePath": "images/characters/marta.png"
}
```

Expected prompt:

- Includes `Woman in her mid 30s with shoulder-length dark brown hair`.
- Includes `images/characters/marta.png`.
- Does not include `appointment`.
- Does not include `clear face`.
- Does not include `Notes tags`.

## Image Style Checks

1. Confirm mixed character image styles are still rejected.
2. Confirm `normalizeCharacterImageStyle` behavior is unchanged.
3. Confirm illustration style still works.
4. Confirm photorealistic style still works.
5. Confirm style instructions do not reintroduce learner-level tone.
6. Confirm style instructions do not conflict with the scene/character boundary.

## Scene Image Service Regression Checks

Verify Phase F did not regress:

1. Missing `lessonId` validation.
2. Missing/malformed `sceneId` validation.
3. Missing project handling.
4. Missing scene handling.
5. Locked story requirement.
6. Raw locked snapshot validation.
7. Scene location requirement.
8. Scene reuse mode behavior.
9. Approved character prerequisite checks.
10. Stale character rejection.
11. Missing character image file/path checks.
12. Mixed style rejection.
13. OpenAI image API error handling.
14. Invalid image payload rejection.
15. Safe image storage.
16. Updating only the target scene on image generation.
17. Scene approval requiring image path.
18. Scene approval rejecting stale records.
19. File-backed approval checks.
20. Scene image metadata storage.

Scene image metadata should now record the new scene prompt version.

## Scene Data Model Boundary Checks

1. Search frontend and backend source for newly added scene model fields.
2. Confirm no new fields such as the following were added:
   - `characterAppearances`
   - `clothing`
   - `pose`
   - `expression`
   - `props`
   - `wardrobe`
3. Confirm existing scene fields remain:
   - `location`
   - `description`
   - `characterIds`
   - `sentenceIds`
   - image generation fields
4. Confirm frontend scene UI was not expanded with new clothing/pose/expression controls.

Suggested search:

```sh
rg "characterAppearances|clothing|pose|expression|props|wardrobe" frontend/src server/src frontend/test server/test
```

Some words may appear in prompt text or tests. Model/schema/UI additions should be flagged as scope creep.

## Character Image Prompt Boundary Checks

1. Inspect `server/src/prompts/characterImagePrompts.js`.
2. Confirm Phase F did not modify character image prompt behavior.
3. Confirm character image prompt version did not change as part of Phase F.
4. Confirm Phase E tests still pass.

Suggested search:

```sh
rg "characterImagePromptVersion|buildCharacterImagePrompt|scene-image" server/src/prompts/characterImagePrompts.js server/test/characterImage.test.js
```

## Scene Planning Boundary Checks

1. Inspect `server/src/prompts/scenePrompts.js`.
2. Confirm scene planning schema and validation were not changed.
3. If scene planning prompt wording changed, confirm it was minimal and only clarifies that `scene.description` can carry visible scene action/props/temporary clothing when relevant.
4. Confirm scene planning tests still pass.
5. Confirm scene merge/persistence behavior is unchanged.

## Test Coverage Expectations

Review tests for:

- Scene prompt includes scene label, location and description.
- Scene prompt includes only covered locked story sentences.
- Scene prompt excludes unrelated locked story sentences.
- Scene prompt includes approved character image paths.
- Scene prompt includes `appearanceDescription`.
- Scene prompt handles empty appearance descriptions.
- Scene prompt excludes legacy notes.
- Scene prompt excludes `Notes tags`.
- Scene prompt excludes learner level.
- Scene prompt excludes target vocabulary and setup additional notes.
- Scene prompt contains stable character identity preservation instructions.
- Scene prompt constrains scene-specific clothing/action/expression to scene description or covered sentences.
- Mixed style rejection still works.
- Unapproved/stale/missing character rejection still works.
- Scene image metadata records the new prompt version.
- Mocked scene image generation still saves file and updates only the target scene.
- Invalid image responses still do not mutate saved project.
- Scene approval still requires generated, non-stale, file-backed scene images.

If one or more high-value prompt-boundary tests are missing, report that as a finding even if manual inspection suggests the code works.

## Manual Prompt Scenarios

### Scenario 1: Normal Scene With Characters

Given:

```json
{
  "location": "Clinic reception desk",
  "description": "Marta speaks with the receptionist at the desk.",
  "sentenceIds": ["sentence-2"],
  "characterIds": ["character-marta", "character-receptionist"]
}
```

Expected prompt:

- Includes `Clinic reception desk`.
- Includes `Marta speaks with the receptionist at the desk`.
- Includes only the locked sentence for `sentence-2`.
- Includes Marta and Receptionist approved image paths.
- Includes their stable appearance descriptions.
- Does not include their notes.

### Scenario 2: Character With No Appearance Description

Given a character with:

```json
{
  "appearanceDescription": "",
  "imagePath": "images/characters/receptionist.png"
}
```

Expected prompt:

- Includes `Stable appearance description: Not specified` or equivalent.
- Includes the approved image path.
- Does not crash or omit the character.

### Scenario 3: Legacy Noisy Notes Do Not Leak

Given character notes:

```json
["friendly", "clear face", "appointment", "queue"]
```

Expected prompt:

- Does not include those note values.
- Does not include `Notes tags`.

### Scenario 4: Unrelated Sentences Are Excluded

Given a scene covering sentence 1 only, expected:

- Prompt includes sentence 1 text.
- Prompt does not include sentence 2 or sentence 3 text.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
rg "scene-image-v|appearanceDescription|Notes tags|Learner level tone|learnerLevel" server/src/prompts/sceneImagePrompts.js server/test/sceneImage.test.js
rg "character\\.notes|notes =" server/src/prompts/sceneImagePrompts.js
rg -i "friendly|clear face|adult learner context|same outfit each image|learner level|appointment|symptoms|prescription|queue" server/src/prompts/sceneImagePrompts.js server/test/sceneImage.test.js
rg "characterAppearances|clothing|pose|expression|props|wardrobe" frontend/src server/src frontend/test server/test
rg "characterImagePromptVersion|buildCharacterImagePrompt" server/src/prompts/characterImagePrompts.js server/test/characterImage.test.js
npm test --workspace server
npm test --workspace frontend
npm run build --workspace frontend
```

Run focused tests first if supported:

```sh
npm test --workspace server -- sceneImage.test.js scenePlanning.test.js mediaReadiness.test.js
npm test --workspace server -- characterImage.test.js
npm test --workspace frontend -- sceneImages.test.js mediaReadiness.test.js
```

If file filters are unsupported, run package-level tests instead.

## Manual UI Verification

If practical, run the app and verify:

1. Open or create a lesson with approved character images.
2. Plan scenes.
3. Confirm scenes have location, description, covered sentences and character IDs.
4. Generate a scene image.
5. Confirm scene image generation succeeds.
6. Confirm scene image metadata stores the new prompt version if visible in saved JSON.
7. Confirm legacy character notes do not need to be removed for scene generation.
8. Confirm scene generation still rejects unapproved or stale characters.
9. Confirm mixed image styles still reject.
10. Approve the scene image.
11. Confirm media readiness still works for approved, non-stale, file-backed scene images.

## Review Output Format

Return findings first, ordered by severity.

Use this structure:

```text
Phase F Review

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
  - Scene prompt version:
  - Scene record usage:
  - Covered sentence boundary:
  - Character appearance usage:
  - Approved reference continuity:
  - Removed legacy notes:
  - Removed learner/lesson leakage:
  - Stable identity instructions:
  - Scene-specific detail boundary:
  - Scene image service regressions:
  - Scene data model boundary:
  - Character prompt boundary:
  - Scene planning boundary:
  - Test coverage:
  - Scope control:
```

If there are no findings, state that clearly and still mention any residual test gaps or manual-verification limits.

## Pass/Fail Checklist

- Scene image prompt version: Pass/Fail with notes.
- Scene label/location/description included: Pass/Fail with notes.
- Covered sentences included: Pass/Fail with notes.
- Unrelated sentences excluded: Pass/Fail with notes.
- Approved character image paths included: Pass/Fail with notes.
- Character `appearanceDescription` included: Pass/Fail with notes.
- Empty appearance handled: Pass/Fail with notes.
- Legacy character notes removed from prompt: Pass/Fail with notes.
- `Notes tags` removed from prompt: Pass/Fail with notes.
- Learner level removed from prompt: Pass/Fail with notes.
- Target vocabulary/additional notes absent: Pass/Fail with notes.
- Vague/noisy terms absent: Pass/Fail with notes.
- Stable character identity preservation: Pass/Fail with notes.
- Scene-specific details bounded to scene data: Pass/Fail with notes.
- New named characters forbidden: Pass/Fail with notes.
- Mixed style rejection preserved: Pass/Fail with notes.
- Unapproved/stale character rejection preserved: Pass/Fail with notes.
- Scene image storage regression: Pass/Fail with notes.
- Scene approval regression: Pass/Fail with notes.
- Scene data model unchanged: Pass/Fail with notes.
- Character image prompt unchanged: Pass/Fail with notes.
- Scene planning boundary: Pass/Fail with notes.
- Test coverage: Pass/Fail with notes.
- Scope control: Pass/Fail with notes.
