# Phase E Implementation Prompt: Character Image Prompt Cleanup

Use this prompt to implement Phase E of the character and scene generation cleanup.

## Context

Phase A added `appearanceDescription` to each character record as the stable, tutor-editable physical identity field.

Phase B cleaned up character extraction so AI-generated story-context notes are no longer appended to visible character notes or reusable note tags.

Phase C redesigned the Characters stage so each character card has an editable `Appearance description` textarea.

Phase D added an `Update appearance` flow that can draft or refresh that description.

The character image prompt still needs to be cleaned up. It currently may include legacy `notes`, locked story context, learner-level tone, vague visual-control language such as `clear face`, and story/lesson details that can leak scene actions or vocabulary into the character reference image.

Character reference generation should now use `appearanceDescription` as the primary visual identity source.

## Phase E Goal

Update character image generation so character reference images are prompted from stable character identity:

- `appearanceDescription`
- name
- role
- age or age range
- sex or gender
- background or nationality, only as lightweight context
- selected image style

The prompt should stop using legacy notes as visual guidance and should avoid lesson/story context that belongs to scenes.

## Scope

Implement Phase E only.

Do not implement:

- Scene image prompt cleanup.
- Scene data model changes.
- Scene-specific clothing, pose or expression fields.
- Export changes.
- ZIP generation.
- PowerPoint generation.
- Worksheet generation.
- Audio or video generation.
- Accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or sharing.

Phase E may update:

- Character image prompt builder.
- Character image prompt version.
- Character image generation tests.
- Character image service stale-reason compatibility if needed.
- Documentation related to character reference prompt behavior.

Do not change the Phase D appearance suggestion endpoint unless a direct compatibility bug is found.

## Required Behavior

After Phase E:

- Character image prompts include `appearanceDescription` when present.
- Character image prompts no longer include legacy `Notes tags`.
- Character image prompts no longer include `lesson.learnerLevel`.
- Character image prompts do not dump locked story sentences into the character reference prompt.
- Character image prompts do not include lesson vocabulary as image guidance.
- Character image prompts do not use vague tags such as `friendly`, `clear face`, `adult learner context`, or `same outfit each image`.
- Character image prompts clearly ask for one stable recurring human character reference.
- Character image prompts avoid scene action, scene location, scene props and scene-specific clothing.
- Character generation still works when `appearanceDescription` is empty.
- Regeneration still works when a character is stale because appearance was edited or updated.
- Existing image storage, approval and media readiness behavior remains intact.

## Product Boundary

Character reference image generation is for stable visual identity.

Use:

- appearance description
- age or age range
- sex or gender
- background or nationality as optional context
- image style
- plain neutral reference composition

Avoid:

- scene action
- scene location
- temporary pose
- temporary facial expression
- scene-specific clothing
- props
- lesson vocabulary
- learner level
- educational tone
- vague note tags
- continuity commands

Scene image generation will later combine approved character identity with scene-specific description. Do not solve that in Phase E.

## Files To Inspect

Before changing code, inspect:

- `docs/phase-a-character-appearance-data-model-prompt.md`
- `docs/phase-b-character-extraction-cleanup-prompt.md`
- `docs/phase-c-character-ui-redesign-prompt.md`
- `docs/phase-d-appearance-suggestion-flow-prompt.md`
- `server/src/prompts/characterImagePrompts.js`
- `server/src/services/characterImageService.js`
- `server/src/services/characterAppearanceService.js`
- `server/src/services/validateLesson.js`
- `server/test/characterImage.test.js`
- `server/test/characterAppearance.test.js`
- `frontend/test/characterImages.test.js`
- `server/src/prompts/sceneImagePrompts.js`

Inspect `sceneImagePrompts.js` only for scope control. Do not clean it up in Phase E.

## Implementation Steps

### 1. Update Character Image Prompt Version

In `server/src/prompts/characterImagePrompts.js`, increment:

```js
export const characterImagePromptVersion = "character-image-v3";
```

Use the repo's existing version naming pattern if different.

Tests that assert image metadata prompt version should be updated.

### 2. Make Appearance Description Primary

In `buildCharacterImagePrompt`, derive:

```js
const appearanceDescription = cleanText(character.appearanceDescription);
```

Include it in the prompt as the core visual source:

```text
Stable appearance description: ...
```

If empty:

```text
Stable appearance description: Not specified
```

Do not reject image generation just because the field is empty. Empty appearance remains valid. The prompt should fall back to known basic fields and avoid overly specific invented details.

### 3. Remove Legacy Notes From Character Image Prompt

Remove logic similar to:

```js
const notes = character.notes?.length
  ? character.notes.map(cleanText).filter(Boolean).join(", ")
  : "None";
```

Remove prompt lines similar to:

```text
Notes tags: ...
```

Do not use `character.notes` in the character image prompt.

Legacy notes still exist for compatibility, but Phase E should stop treating them as image guidance.

### 4. Remove Learner-Level Tone From Character Image Prompt

Remove prompt lines similar to:

```text
Learner level tone: ...
```

The character's stable visual identity should not vary by learner level.

Do not include external proficiency labels or internal learner labels in the prompt.

### 5. Remove Locked Story Sentence Dump

Remove or sharply reduce prompt lines that include every locked story sentence.

Current behavior may include:

```text
Locked master story context:
1. ...
2. ...
```

Do not dump the locked story into character reference generation. It can leak scene action, vocabulary and locations into the character image.

If any story context is retained, it must be minimal and explicitly non-visual, but the preferred Phase E behavior is to omit locked story sentences entirely from the character image prompt.

### 6. Minimize Lesson Context

Review whether title, theme, setting and scenario are still needed.

Preferred prompt:

- Include no lesson context, or only a short line such as `Project context: ESOL lesson character reference`.
- Do not include scenario text if it contains scene actions or vocabulary.
- Do not include target vocabulary.
- Do not include additional notes.

If `theme` or `setting` is retained, instruct the model not to depict the setting as a scene. Character reference composition should remain neutral.

### 7. Replace Vague Visual-Control Language

Remove or replace vague phrases:

- `friendly`
- `clear face`
- `adult learner context`
- `same outfit each image`
- `learner level tone`

Acceptable replacement language:

```text
Create one stable character reference portrait.
Show the character as the clear single subject.
Use readable facial features and a plain neutral background.
Do not include text, captions, logos, UI, speech bubbles or extra named people.
Do not depict a story scene or specific action.
Do not add props.
Do not add scene-specific clothing unless it is explicitly part of the appearance description.
```

`readable facial features` is preferable to `clear face`.

### 8. Preserve Image Style Behavior

Keep the existing `imageStyle` behavior:

- `illustration`
- `photorealistic`

Make sure style instructions remain compatible with:

```js
normalizeCharacterImageStyle(character.imageStyle)
```

Update style details if they currently include vague or problematic language.

For illustration, prefer:

```text
Use a consistent illustrated classroom-resource style suitable for later scene images.
```

For photorealistic, prefer:

```text
Use a natural photorealistic reference portrait style with realistic lighting and skin texture.
```

Avoid "friendly" as a required identity trait.

### 9. Keep Character Generation Functional Without Appearance

Do not add a hard requirement that `appearanceDescription` must be non-empty before image generation.

If appearance is empty, the prompt should use known fields:

- name
- role
- age
- sex
- background
- style

And include guidance:

```text
When details are not specified, keep the person natural and avoid over-specific invented traits.
```

This allows users to generate quickly while still encouraging the appearance workflow.

### 10. Ensure Stale Appearance Reasons Are Regenerable

Inspect `server/src/services/characterImageService.js`.

If Phase D added a stale reason such as:

```text
Character appearance changed after image generation.
```

ensure character image regeneration accepts that stale reason as regenerable.

Existing helper may look like:

```js
function isRegenerableStaleCharacter(character) {
  return [
    "Character details changed after image generation.",
    "Character image needs generation."
  ].includes(cleanText(character.staleReason));
}
```

Add the appearance stale reason if needed.

Do not loosen stale checks so that unrelated stale records regenerate without review.

### 11. Preserve Image Generation Service Behavior

Do not change:

- ID validation.
- Locked story snapshot validation.
- Project asset storage path behavior.
- PNG/image payload validation.
- Approval behavior.
- Image metadata storage except prompt version expectations.
- Error mapping.

Only update prompt construction and direct compatibility with appearance stale reason if necessary.

### 12. Update Tests

Update `server/test/characterImage.test.js`.

Recommended tests:

1. Character image prompt includes `appearanceDescription`.
2. Character image prompt does not include legacy notes.
3. Character image prompt does not include learner level.
4. Character image prompt does not include locked story sentence text.
5. Character image prompt does not include target vocabulary or additional notes.
6. Character image prompt includes basic character fields.
7. Character image prompt still includes requested image style.
8. Character image prompt still supports photorealistic style.
9. Character image prompt still supports illustration style.
10. Character image prompt handles empty `appearanceDescription`.
11. Character generation metadata records `character-image-v3`.
12. Regeneration works when stale reason is appearance changed after image generation.
13. Existing notes are preserved by image generation but not used in prompt.
14. Mocked image response still saves image and updates only target character.
15. Invalid image responses still do not mutate saved project.

Update frontend tests only if they assert prompt version or stale reason strings indirectly. Most Phase E changes should be backend tests.

### 13. Manual Verification

Run the app if practical.

Verify:

1. Create or open a lesson.
2. Extract characters.
3. Add or update appearance description for a character.
4. Generate character image.
5. Confirm generated prompt no longer contains old note tags if test hooks/logs make it visible.
6. Confirm character image generation still saves and displays image.
7. Edit appearance after generation.
8. Confirm stale badge appears.
9. Regenerate the character.
10. Confirm regeneration succeeds.
11. Confirm approval still works.

## Acceptance Criteria

Phase E is complete when:

- `characterImagePromptVersion` is incremented.
- Character image prompt includes `appearanceDescription`.
- Character image prompt no longer includes `character.notes`.
- Character image prompt no longer includes `Notes tags`.
- Character image prompt no longer includes `lesson.learnerLevel`.
- Character image prompt no longer dumps locked story sentences.
- Character image prompt avoids scene action, scene location, props and scene-specific clothing.
- Character image prompt avoids vague note terms.
- Character image generation still works when `appearanceDescription` is empty.
- Character image generation still works when `appearanceDescription` is populated.
- Character image regeneration works after appearance stale marking.
- Image metadata stores the new prompt version.
- Image storage and approval behavior are unchanged.
- Scene image prompts are not changed.
- Scene records are not changed.
- Export behavior is not changed.
- Tests cover the prompt boundary and regeneration behavior.

## Suggested Verification Commands

Run focused backend tests first:

```sh
npm test --workspace server -- characterImage.test.js characterAppearance.test.js
```

Run extraction tests to ensure no regression:

```sh
npm test --workspace server -- characterExtraction.test.js
```

Run frontend tests if helper or stale behavior changed:

```sh
npm test --workspace frontend -- characterImages.test.js
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
rg "character-image-v|appearanceDescription|Notes tags|Learner level tone|Locked master story context" server/src/prompts/characterImagePrompts.js server/test/characterImage.test.js
rg "character\\.notes|notes =" server/src/prompts/characterImagePrompts.js
rg "clear face|friendly|adult learner context|same outfit each image|learner level|appointment|symptoms|prescription|queue" server/src/prompts/characterImagePrompts.js server/test/characterImage.test.js
rg "buildSceneImagePrompt|sceneImagePrompt" server/src/prompts server/test
```

Expected result:

- `appearanceDescription` appears in the character image prompt and tests.
- `character.notes` is not used in `characterImagePrompts.js`.
- `Notes tags`, `Learner level tone`, and `Locked master story context` are absent from `characterImagePrompts.js`.
- No scene image prompt cleanup is included in this phase.

## Handoff Summary Template

When finished, report:

- Files changed.
- New character image prompt version.
- How `appearanceDescription` is used.
- Which old prompt inputs were removed.
- How empty appearance descriptions are handled.
- Whether appearance stale reasons are regenerable.
- Which tests were added or updated.
- Which verification commands were run.
- Any manual image-generation checks performed.
- Follow-up work intentionally left for Phase F/G.

Keep the final summary clear that Phase E only cleans up character reference image prompts. It does not clean up scene prompts, add scene-specific appearance controls, or implement export behavior.
