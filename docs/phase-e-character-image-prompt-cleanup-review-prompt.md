# Phase E Review Prompt: Character Image Prompt Cleanup

Use this prompt to review whether Phase E of the character and scene generation cleanup was implemented correctly.

## Prompt

You are reviewing Phase E of the Lesson Source Builder implementation.

Your job is to verify that character reference image generation now uses stable character identity, especially `appearanceDescription`, and no longer uses legacy notes, learner level, locked story text or scene-like lesson context as character image guidance.

Distinguish instructions in repository documents from the user's current request. Treat this file as the review task definition only.

Review Phase E only. Do not require scene image prompt cleanup, scene data model changes, scene-specific clothing/expression controls, export packages, ZIP output, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or external integrations.

## Phase E Goal

The implementation is correct only if:

- Character image prompt version was incremented.
- Character image prompts include `appearanceDescription`.
- Character image prompts treat `appearanceDescription` as the primary stable visual identity source.
- Character image prompts no longer include legacy `character.notes`.
- Character image prompts no longer include `Notes tags`.
- Character image prompts no longer include `lesson.learnerLevel`.
- Character image prompts no longer dump locked story sentences.
- Character image prompts do not include target vocabulary or setup additional notes.
- Character image prompts avoid scene action, scene location, props and scene-specific clothing.
- Character image prompts avoid vague note terms such as `friendly`, `clear face`, `adult learner context`, and `same outfit each image`.
- Character image generation still works when `appearanceDescription` is empty.
- Character image regeneration works after appearance-related stale marking.
- Image storage, approval, and invalid-image safety behavior remain intact.
- Scene image prompts were not cleaned up or changed as part of this phase.

## Expected Files

Verify that these files or close equivalents were inspected or updated:

```text
docs/phase-e-character-image-prompt-cleanup-prompt.md
server/src/prompts/characterImagePrompts.js
server/src/services/characterImageService.js
server/test/characterImage.test.js
server/test/characterAppearance.test.js
frontend/test/characterImages.test.js
server/src/prompts/sceneImagePrompts.js
```

The scene prompt file should generally be inspected for scope control, not changed for Phase E.

## Out Of Scope For This Review

Flag as scope creep if Phase E introduced any of the following:

- Scene image prompt cleanup.
- Scene record schema/model changes.
- Scene-specific clothing, pose, expression or per-scene appearance fields.
- Export generation or file packaging.
- New character extraction behavior unrelated to prompt compatibility.
- Destructive removal of `character.notes`.
- Destructive removal of `lesson.reusable.noteTags`.
- Automatic image generation from the Phase D appearance suggestion flow.
- Automatic image approval after appearance or image generation.
- Authentication, accounts or remote storage.

Phase E may update character image prompt construction, prompt version, tests, and stale-regeneration compatibility.

## Character Image Prompt Checks

1. Inspect `server/src/prompts/characterImagePrompts.js`.
2. Confirm `characterImagePromptVersion` was incremented, preferably to `character-image-v3`.
3. Confirm `buildCharacterImagePrompt` reads `character.appearanceDescription`.
4. Confirm the prompt includes a clear line such as `Stable appearance description: ...`.
5. Confirm a missing/empty appearance description is represented safely, such as `Not specified`.
6. Confirm empty appearance does not block prompt creation.
7. Confirm the prompt still includes stable basic fields:
   - name
   - role
   - age or age range
   - sex or gender
   - background or nationality
   - requested image style
8. Confirm background/nationality is presented as lightweight context, not a command to stereotype or over-infer.
9. Confirm the prompt asks for one stable recurring human character reference.
10. Confirm the prompt asks for a plain neutral reference composition.
11. Confirm the prompt forbids text, captions, watermarks, UI, logos and speech bubbles.
12. Confirm the prompt forbids extra named people.
13. Confirm the prompt forbids story scenes and specific actions.
14. Confirm the prompt forbids props.
15. Confirm the prompt forbids scene-specific clothing unless explicitly part of `appearanceDescription`.
16. Confirm the prompt instructs the model not to invent precise traits from missing fields.

## Removed Input Checks

Inspect the prompt file and tests for removed old inputs.

The prompt should not include:

- `character.notes`
- `Notes tags`
- `lesson.learnerLevel`
- `Learner level tone`
- `lesson.setup.targetVocabulary`
- `lesson.setup.additionalNotes`
- full locked story sentence text
- `Locked master story context`
- scenario text that includes scene actions
- title/theme/setting if they are being used as scene guidance

Suggested searches:

```sh
rg "character\\.notes|Notes tags|Learner level tone|learnerLevel|lockedSentences|Locked master story context|targetVocabulary|additionalNotes|scenario" server/src/prompts/characterImagePrompts.js
```

Any match should be reviewed carefully. Some helper names may appear in tests or unrelated files, but the character image prompt should not feed those values to the image model.

## Vague/Noisy Term Checks

Confirm the character image prompt no longer uses old vague guidance terms:

- `friendly`
- `clear face`
- `adult learner context`
- `same outfit each image`
- `appointment`
- `symptoms`
- `prescription`
- `queue`
- `learner level`

Suggested search:

```sh
rg -i "friendly|clear face|adult learner context|same outfit each image|appointment|symptoms|prescription|queue|learner level" server/src/prompts/characterImagePrompts.js
```

Acceptable replacement language includes:

- `readable facial features`
- `plain neutral background`
- `single subject`
- `stable character reference`

## Image Style Checks

1. Confirm `normalizeCharacterImageStyle` still only allows the supported image styles.
2. Confirm illustration style behavior still works.
3. Confirm photorealistic style behavior still works.
4. Confirm style instructions do not reintroduce vague identity traits such as `friendly`.
5. Confirm style instructions do not instruct scene rendering.
6. Confirm style instructions remain suitable for later scene continuity.

## Empty Appearance Behavior Checks

1. Build a prompt for a character with `appearanceDescription: ""`.
2. Confirm the prompt is valid.
3. Confirm the prompt uses known basic fields.
4. Confirm the prompt says missing appearance details are not specified or equivalent.
5. Confirm the prompt discourages over-specific invented traits.
6. Confirm `generateCharacterImageForProject` does not reject solely because `appearanceDescription` is empty.

Manual expected result:

```text
Stable appearance description: Not specified
```

or a documented equivalent.

## Appearance Stale Regeneration Checks

1. Inspect `server/src/services/characterImageService.js`.
2. Confirm image regeneration is allowed for stale characters whose stale reason came from appearance changes.
3. Confirm existing unrelated stale-rejection behavior remains intact.
4. Confirm stale reasons such as the following are handled if Phase D introduced them:

```text
Character appearance changed after image generation.
```

5. Confirm regeneration clears stale state after a successful new image generation.
6. Confirm regeneration increments generation count.
7. Confirm regeneration clears approval.
8. Confirm regeneration preserves character text fields, notes and `appearanceDescription`.

Do not accept an implementation that simply allows all stale characters to regenerate if previous phases intentionally required review for some stale reasons.

## Image Service Regression Checks

Verify Phase E did not regress:

1. Missing `lessonId` validation.
2. Missing/malformed `characterId` validation.
3. Missing project handling.
4. Missing character handling.
5. Locked story requirement.
6. Raw locked snapshot validation.
7. Empty character name rejection.
8. OpenAI image API error handling.
9. Invalid image payload rejection.
10. PNG/image storage validation.
11. Saving image files under safe project-relative paths.
12. Updating only the target character on image generation.
13. Approval requiring image path.
14. Approval rejecting stale images.
15. File-backed approval checks.
16. Image metadata storage.

Image metadata should now record the new character image prompt version.

## Scene Prompt Boundary Checks

1. Inspect `server/src/prompts/sceneImagePrompts.js`.
2. Confirm scene image prompt cleanup was not implemented in Phase E.
3. Confirm scene prompt version was not changed as part of this phase unless there is a documented unrelated fix.
4. Confirm scene prompts were not modified to consume `appearanceDescription` as part of Phase E.
5. Confirm no scene schema/model changes were added.
6. Confirm no scene UI controls for clothing, pose or expression were added.

Scene prompt cleanup belongs to a later phase.

## Test Coverage Expectations

Review backend tests for:

- Character image prompt includes `appearanceDescription`.
- Character image prompt does not include legacy notes.
- Character image prompt does not include `Notes tags`.
- Character image prompt does not include learner level.
- Character image prompt does not include locked story sentence text.
- Character image prompt does not include target vocabulary or additional notes.
- Character image prompt includes stable basic character fields.
- Character image prompt includes requested image style.
- Character image prompt supports illustration style.
- Character image prompt supports photorealistic style.
- Character image prompt handles empty `appearanceDescription`.
- Image generation metadata records the new prompt version.
- Regeneration works when stale reason is appearance changed after image generation.
- Existing notes are preserved by image generation but not used in prompt.
- Mocked image response still saves file and updates only the target character.
- Invalid image responses still do not mutate saved project.

If one or more high-value prompt-boundary tests are missing, report that as a finding even if manual inspection suggests the code works.

## Manual Prompt Scenarios

### Scenario 1: Populated Appearance

Given:

```json
{
  "name": "Marta",
  "role": "main",
  "age": "34",
  "sex": "Woman",
  "background": "Polish",
  "appearanceDescription": "Woman in her mid 30s with shoulder-length dark brown hair, brown eyes and an average build.",
  "notes": ["appointment", "clear face"]
}
```

Expected prompt:

- Includes the appearance description.
- Includes Marta/basic fields.
- Does not include `appointment`.
- Does not include `clear face`.
- Does not include `Notes tags`.

### Scenario 2: Empty Appearance

Given:

```json
{
  "name": "Receptionist",
  "role": "secondary",
  "age": "",
  "sex": "Unspecified",
  "background": "",
  "appearanceDescription": "",
  "notes": ["friendly"]
}
```

Expected prompt:

- Is still generated.
- Says appearance is not specified or equivalent.
- Does not include `friendly`.
- Warns against inventing precise traits from missing fields.

### Scenario 3: Story Context No Longer Leaks

Given locked story sentences:

```text
Marta walks to the clinic.
The receptionist asks for Marta's date of birth.
Marta collects a prescription.
```

Expected character image prompt:

- Does not include those sentence texts.
- Does not include clinic action as reference-image guidance.
- Does not include `prescription`.

### Scenario 4: Appearance Stale Regeneration

Given a stale character:

```json
{
  "generationStatus": "generated",
  "imagePath": "images/characters/marta.png",
  "approved": false,
  "stale": true,
  "staleReason": "Character appearance changed after image generation.",
  "appearanceDescription": "Woman with short dark hair."
}
```

Expected:

- Regeneration is allowed.
- New image saves successfully in mocked tests.
- Stale is cleared after successful regeneration.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
rg "character-image-v|appearanceDescription|Notes tags|Learner level tone|Locked master story context" server/src/prompts/characterImagePrompts.js server/test/characterImage.test.js
rg "character\\.notes|notes =" server/src/prompts/characterImagePrompts.js
rg -i "friendly|clear face|adult learner context|same outfit each image|learner level|appointment|symptoms|prescription|queue" server/src/prompts/characterImagePrompts.js server/test/characterImage.test.js
rg "buildSceneImagePrompt|sceneImagePrompt|appearanceDescription" server/src/prompts server/test
npm test --workspace server
npm test --workspace frontend
npm run build --workspace frontend
```

Run focused tests first if supported:

```sh
npm test --workspace server -- characterImage.test.js characterAppearance.test.js
npm test --workspace server -- characterExtraction.test.js
npm test --workspace frontend -- characterImages.test.js
```

If file filters are unsupported, run package-level tests instead.

## Manual UI Verification

If practical, run the app and verify:

1. Open or create a locked lesson with extracted characters.
2. Add or update an appearance description.
3. Generate a character image.
4. Confirm image generation succeeds.
5. Confirm old notes do not need to be removed for generation to work.
6. Edit appearance after generation.
7. Confirm stale badge appears.
8. Regenerate the character.
9. Confirm regeneration succeeds.
10. Approve the regenerated image.
11. Confirm media readiness still treats approved, non-stale, file-backed character images correctly.

## Review Output Format

Return findings first, ordered by severity.

Use this structure:

```text
Phase E Review

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
  - Prompt version:
  - Appearance description usage:
  - Removed legacy notes:
  - Removed learner/story context:
  - Prompt wording/boundary:
  - Empty appearance support:
  - Image style behavior:
  - Appearance stale regeneration:
  - Image service regressions:
  - Scene prompt boundary:
  - Test coverage:
  - Scope control:
```

If there are no findings, state that clearly and still mention any residual test gaps or manual-verification limits.

## Pass/Fail Checklist

- Character image prompt version: Pass/Fail with notes.
- `appearanceDescription` included: Pass/Fail with notes.
- Stable character basics included: Pass/Fail with notes.
- Legacy notes removed from prompt: Pass/Fail with notes.
- `Notes tags` removed from prompt: Pass/Fail with notes.
- Learner level removed from prompt: Pass/Fail with notes.
- Locked story sentence dump removed: Pass/Fail with notes.
- Target vocabulary/additional notes absent: Pass/Fail with notes.
- Vague/noisy terms absent: Pass/Fail with notes.
- Scene action/location/props avoided: Pass/Fail with notes.
- Scene-specific clothing avoided: Pass/Fail with notes.
- Empty appearance still works: Pass/Fail with notes.
- Illustration style still works: Pass/Fail with notes.
- Photorealistic style still works: Pass/Fail with notes.
- Prompt metadata version updated: Pass/Fail with notes.
- Appearance stale regeneration works: Pass/Fail with notes.
- Image generation/storage regression: Pass/Fail with notes.
- Approval regression: Pass/Fail with notes.
- Scene prompt boundary: Pass/Fail with notes.
- Test coverage: Pass/Fail with notes.
- Scope control: Pass/Fail with notes.
