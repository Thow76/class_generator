# Phase F Implementation Prompt: Scene Image Prompt Boundary

Use this prompt to implement Phase F of the character and scene generation cleanup.

## Context

Phase A added `appearanceDescription` to each character record as the stable, tutor-editable physical identity field.

Phase B cleaned up character extraction so AI-generated story-context notes are no longer appended to visible character notes or reusable note tags.

Phase C redesigned the Characters stage so each character card has an editable `Appearance description` textarea.

Phase D added an `Update appearance` flow for drafting or refreshing that description.

Phase E cleaned up character reference image prompts so character images use stable character identity and no longer use legacy notes, learner level or locked story sentence dumps.

Scene image generation still needs a matching boundary cleanup. The scene image prompt should combine:

- the approved character reference identity,
- stable character appearance,
- the scene record's location and description,
- the locked story sentences covered by that scene,
- the scene's selected/referenced characters,
- and the approved character image paths for visual continuity.

It should not use legacy character notes, learner-level tone, broad lesson vocabulary or character-stage prompt hacks.

## Phase F Goal

Update scene image generation so prompts clearly separate:

- stable character identity from approved character records/references, and
- scene-specific action/location/props/clothing/expression from the scene record and covered sentences.

Scene prompts should not push scene details back into character records. They should render the current scene while preserving approved character identity.

## Scope

Implement Phase F only.

Do not implement:

- New scene record fields.
- Scene-specific clothing/pose/expression UI controls.
- Scene planning schema changes unless a tiny prompt-only wording change is needed for compatibility.
- Character image prompt changes.
- Character appearance suggestion changes.
- Export changes.
- ZIP generation.
- PowerPoint generation.
- Worksheet generation.
- Audio or video generation.
- Accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or sharing.

Phase F may update:

- Scene image prompt builder.
- Scene image prompt version.
- Scene image generation tests.
- Scene prompt documentation.

Do not change the scene data model in this phase.

## Required Behavior

After Phase F:

- Scene image prompts include scene location.
- Scene image prompts include scene description.
- Scene image prompts include the locked story sentences covered by the scene.
- Scene image prompts include approved character image paths.
- Scene image prompts include stable character appearance descriptions where present.
- Scene image prompts no longer include legacy character `Notes tags`.
- Scene image prompts no longer include `lesson.learnerLevel`.
- Scene image prompts do not use vague character note terms such as `friendly`, `clear face`, `adult learner context`, or `same outfit each image`.
- Scene image prompts instruct the model to preserve stable character identity from the approved reference image and appearance description.
- Scene image prompts allow scene-specific clothing/action/expression only when present in the scene description or covered story sentences.
- Scene image prompts do not update character records.
- Scene image generation still rejects unapproved/stale/missing character references as before.
- Scene image generation still rejects mixed character image styles as before.
- Scene image generation still works for scenes without characters where that was previously valid.
- Scene image storage, approval and media readiness behavior remain intact.

## Product Boundary

Scene image generation is for a specific planned story scene.

Use:

- scene label
- scene location
- scene description
- covered locked story sentences
- character IDs/names/basic fields
- character `appearanceDescription`
- approved character image paths
- image style

Avoid:

- legacy character notes
- learner level
- target vocabulary
- setup additional notes
- broad lesson scenario as visual instruction
- random continuity commands
- changing stable character identity
- generating new named characters
- adding scene-specific clothing unless the scene description or story explicitly supports it

Do not add new scene fields in Phase F. Scene-specific details continue to live in `scene.description` for now.

## Files To Inspect

Before changing code, inspect:

- `docs/phase-e-character-image-prompt-cleanup-prompt.md`
- `server/src/prompts/sceneImagePrompts.js`
- `server/src/prompts/characterImagePrompts.js`
- `server/src/prompts/scenePrompts.js`
- `server/src/services/sceneImageService.js`
- `server/src/services/mediaReadinessService.js`
- `server/src/services/validateLesson.js`
- `server/test/sceneImage.test.js`
- `server/test/scenePlanning.test.js`
- `frontend/test/sceneImages.test.js`
- `frontend/test/mediaReadiness.test.js`

Inspect `characterImagePrompts.js` only to reuse style normalization and ensure Phase E behavior is not regressed.

## Implementation Steps

### 1. Update Scene Image Prompt Version

In `server/src/prompts/sceneImagePrompts.js`, increment:

```js
export const sceneImagePromptVersion = "scene-image-v2";
```

Use the repo's existing version naming pattern if different.

Update tests that assert scene image metadata prompt version.

### 2. Keep Scene Context, But Make It Scene-Bounded

Scene image prompts should still include the locked story sentences covered by the scene because they are the current scene's action/context.

Keep or refine:

```text
Locked story sentences covered by this scene:
```

But make clear:

```text
Use these sentences only to understand this scene's action. Do not use them to change stable character appearance.
```

Do not include the entire lesson story outside `scene.sentenceIds`.

Do not include unrelated locked sentences.

### 3. Remove Learner-Level Tone

Remove prompt lines similar to:

```text
Learner level tone: ...
```

Scene visual composition should be clear for teaching material, but should not depend on internal learner-level labels.

Do not include external proficiency labels or internal learner labels in the scene image prompt.

### 4. Minimize Lesson-Level Context

Review whether title, theme, setting and scenario are still needed.

Preferred behavior:

- Use `scene.location` and `scene.description` as the visual source of truth.
- Use covered sentences as supporting context.
- Avoid title/theme/scenario if they duplicate or broaden beyond the scene.

If `lesson.setting` is retained, frame it as broad setting context only.

Do not include:

- `lesson.setup.targetVocabulary`
- `lesson.setup.additionalNotes`
- learner level
- full lesson scenario as a visual instruction if it contains actions not in the current scene.

### 5. Remove Legacy Character Notes From Scene Prompt

In `formatCharacter`, remove logic similar to:

```js
const notes = Array.isArray(character.notes)
  ? character.notes.map(cleanText).filter(Boolean).join(", ")
  : "";
```

Remove prompt lines similar to:

```text
Notes tags: ...
```

Do not use `character.notes` in scene image prompts.

Legacy notes still exist for compatibility, but Phase F should stop treating them as scene image guidance.

### 6. Include Stable Character Appearance

In `formatCharacter`, include:

```text
Stable appearance description: ...
```

Use:

```js
cleanText(character.appearanceDescription) || "Not specified"
```

This tells the scene prompt how the person generally looks while preserving approved image reference continuity.

### 7. Keep Approved Image Path As Continuity Anchor

Keep:

```text
Approved image path: ...
```

The image path remains important because the scene image should match the approved reference.

Also keep basic fields:

- ID
- name
- role
- age
- sex
- background/nationality
- image style

But do not use those fields to over-infer traits that are not specified.

### 8. Strengthen Character Consistency Instructions

Add or refine scene prompt instructions:

```text
Preserve each listed character's stable physical identity from the approved reference image and appearance description.
Do not change hair, facial features, age presentation, body type or other stable identity traits unless the scene description explicitly requires a temporary visible change.
Scene-specific clothing, expression, pose and props may vary only when supported by the scene description or covered sentences.
```

Make sure this does not accidentally tell the image model to edit reference images or create collages. It should produce one scene image.

### 9. Clarify Character Inclusion Rules

Keep or refine:

```text
Include only the listed characters unless the scene description clearly needs anonymous background people.
Do not invent named characters.
```

If anonymous background people are allowed, ensure the prompt says they must not distract from listed characters or become named/recurring people.

### 10. Preserve Image Style Behavior

Keep existing mixed-style rejection:

```js
if (imageStyles.size > 1) {
  throw new Error("Scene characters use mixed image styles.");
}
```

Keep `normalizeCharacterImageStyle` behavior.

Update style text if it contains vague terms or conflicts with the new boundary.

For photorealistic:

```text
Use a photorealistic classroom-resource style with natural lighting and realistic people.
```

For illustration:

```text
Use a consistent illustrated classroom-resource style with warm, realistic detail.
```

Avoid learner-level or personality tone.

### 11. Do Not Change Scene Data Model

Do not add fields such as:

- `scene.characterAppearances`
- `scene.clothing`
- `scene.pose`
- `scene.expression`
- `scene.props`

Those may be considered later, but Phase F should only clarify prompt usage of existing scene data.

### 12. Do Not Change Scene Planning Schema

Prefer not to change `server/src/prompts/scenePrompts.js`.

If a tiny wording update is necessary, it should only clarify that `scene.description` may contain visible action, props and temporary clothing when relevant.

Do not change scene planning response schema, validation, merge behavior, or frontend planning UI in Phase F.

### 13. Preserve Scene Image Service Behavior

Do not regress:

- ID validation.
- Locked story snapshot validation.
- Scene existence checks.
- Scene location requirement.
- Approved character prerequisite checks.
- Character image file/path checks.
- Reuse mode behavior.
- Mixed image style rejection.
- Image payload validation.
- Safe image storage.
- Scene approval behavior.
- Media readiness behavior.

Only update prompt construction and prompt-version expectations.

### 14. Update Tests

Update `server/test/sceneImage.test.js`.

Recommended tests:

1. Scene image prompt includes scene label, location and description.
2. Scene image prompt includes only covered locked story sentences.
3. Scene image prompt does not include unrelated locked story sentences.
4. Scene image prompt includes approved character image paths.
5. Scene image prompt includes `appearanceDescription`.
6. Scene image prompt does not include legacy character notes.
7. Scene image prompt does not include `Notes tags`.
8. Scene image prompt does not include learner level.
9. Scene image prompt does not include target vocabulary or setup additional notes.
10. Scene image prompt preserves mixed-style rejection.
11. Scene image prompt supports empty character appearance descriptions.
12. Scene image metadata records `scene-image-v2`.
13. Mocked scene image generation still saves file and updates only target scene.
14. Invalid image responses still do not mutate saved project.
15. Approval behavior still requires generated, non-stale, file-backed scene images.

Update `server/test/scenePlanning.test.js` only if a minimal planning prompt wording change is made.

Update frontend tests only if prompt-version or scene stale behavior affects frontend helpers. Most Phase F work should be backend tests.

### 15. Manual Verification

Run the app if practical.

Verify:

1. Create/open a lesson with approved character images.
2. Plan scenes.
3. Confirm each scene has location, description and character IDs.
4. Generate a scene image.
5. Confirm generation succeeds.
6. Confirm scene image metadata stores the new prompt version.
7. Confirm character notes do not need to be deleted for scene generation.
8. Confirm scene generation still rejects unapproved/stale characters.
9. Confirm mixed image styles still reject.
10. Confirm scene approval still works.
11. Confirm media readiness still works for approved, non-stale, file-backed scene images.

## Acceptance Criteria

Phase F is complete when:

- `sceneImagePromptVersion` is incremented.
- Scene image prompts include scene location and description.
- Scene image prompts include covered locked story sentences only.
- Scene image prompts include approved character image paths.
- Scene image prompts include character `appearanceDescription`.
- Scene image prompts no longer include `character.notes`.
- Scene image prompts no longer include `Notes tags`.
- Scene image prompts no longer include learner level.
- Scene image prompts do not include target vocabulary or setup additional notes.
- Scene image prompts explicitly preserve stable character identity.
- Scene image prompts allow scene-specific clothing/action/expression only from scene description or covered sentences.
- Scene image prompts do not add new named characters.
- Scene image generation still works with empty appearance descriptions.
- Scene image generation still rejects unapproved/stale/missing character references.
- Mixed image style rejection still works.
- Scene image metadata stores the new prompt version.
- Scene image storage and approval behavior are unchanged.
- Scene data model is unchanged.
- Character image prompts are unchanged.
- Export behavior is unchanged.
- Tests cover prompt boundary and regression behavior.

## Suggested Verification Commands

Run focused backend tests first:

```sh
npm test --workspace server -- sceneImage.test.js scenePlanning.test.js mediaReadiness.test.js
```

Run character image tests to ensure no cross-regression:

```sh
npm test --workspace server -- characterImage.test.js
```

Run frontend tests if helpers were touched:

```sh
npm test --workspace frontend -- sceneImages.test.js mediaReadiness.test.js
```

If file filters are unsupported:

```sh
npm test --workspace server
npm test --workspace frontend
```

Build frontend if relevant:

```sh
npm run build --workspace frontend
```

Use `package.json` scripts as the source of truth for available commands.

## Review Search Commands

Use these searches during self-review:

```sh
rg "scene-image-v|appearanceDescription|Notes tags|Learner level tone|learnerLevel" server/src/prompts/sceneImagePrompts.js server/test/sceneImage.test.js
rg "character\\.notes|notes =" server/src/prompts/sceneImagePrompts.js
rg -i "friendly|clear face|adult learner context|same outfit each image|learner level|appointment|symptoms|prescription|queue" server/src/prompts/sceneImagePrompts.js server/test/sceneImage.test.js
rg "characterImagePromptVersion|buildCharacterImagePrompt" server/src/prompts/characterImagePrompts.js server/test/characterImage.test.js
rg "characterAppearances|clothing|pose|expression|props" frontend/src server/src
```

Expected result:

- `appearanceDescription` appears in scene image prompts/tests.
- `character.notes` is not used in `sceneImagePrompts.js`.
- `Notes tags` and learner-level tone are absent from `sceneImagePrompts.js`.
- Character image prompt files should not change for Phase F.
- No new scene model fields should appear.

## Handoff Summary Template

When finished, report:

- Files changed.
- New scene image prompt version.
- How scene prompts use `appearanceDescription`.
- Which old prompt inputs were removed.
- How covered story sentences are bounded to the current scene.
- How stable character identity is preserved.
- Whether scene planning prompt was untouched or minimally changed.
- Which tests were added or updated.
- Which verification commands were run.
- Any manual scene-generation checks performed.
- Follow-up work intentionally left for later phases.

Keep the final summary clear that Phase F only cleans up scene image prompt boundaries. It does not add scene-specific UI controls, new scene fields, character prompt changes, or export behavior.
