# Phase C Implementation Prompt: Character UI Redesign

Use this prompt to implement Phase C of the character and scene generation cleanup.

## Context

Phase A added `appearanceDescription` to character records as the stable, tutor-editable physical identity field.

Phase B cleaned up character extraction so AI-generated story-context notes are no longer appended to visible character notes or reusable note tags.

The Characters stage still presents legacy `Notes tags` as the main flexible guidance surface. That no longer matches the desired model. Tutors need a clear editable field for what the character physically looks like, while scene-specific clothing, pose, action and expression should remain out of the character card until later scene phases.

## Phase C Goal

Redesign the Characters stage so `appearanceDescription` becomes the primary editable visual-identity field for each character.

The character card should answer a simple question:

```text
What does this person generally look like across the lesson?
```

Phase C is a frontend/UI phase. It should wire editing to the existing `appearanceDescription` field and keep legacy notes compatible but de-emphasized.

## Scope

Implement Phase C only.

Do not implement:

- Backend appearance suggestion endpoint.
- Real `Update appearance` generation behavior.
- New OpenAI calls.
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

After Phase C:

- Each character card shows an editable `Appearance description` textarea.
- The textarea reads from `character.appearanceDescription`.
- Edits call the existing character update path and persist through the existing save flow.
- Editing appearance marks generated or approved character images stale via the Phase A stale-field behavior.
- Empty appearance descriptions are allowed.
- The UI makes `Appearance description` more prominent than legacy notes.
- Legacy notes remain compatible and editable, but should be visually secondary.
- Reusable note suggestions should not dominate the character card.
- Existing character generation and approval buttons still work.
- Existing character extraction button still works.
- Existing background controls still work.
- Existing responsive layout remains usable on mobile and desktop.

## Product Boundary

`Appearance description` is for stable physical identity:

- Hair length, colour and broad style.
- Eye colour if the tutor wants to specify it.
- Approximate height.
- Approximate build.
- Skin tone or complexion if the tutor wants to specify it.
- Age presentation.
- Facial features.
- Distinctive stable physical features.

It is not for:

- Scene action.
- Scene location.
- Temporary pose.
- Temporary facial expression.
- Scene-specific clothing.
- Props.
- Lesson vocabulary.
- Learner level.
- Educational tone.
- Vague image tags such as `friendly`, `clear face`, or `adult learner context`.
- Global continuity commands such as `same outfit each image`.

Do not add explanatory walls of text inside the UI. Labels and placeholders should be concise and practical.

## Update Appearance Button Boundary

The product direction includes an eventual `Update appearance` button that can generate or refresh a draft appearance description.

That real generation flow belongs to Phase D.

For Phase C, choose one of these safe approaches:

1. Preferred: do not render `Update appearance` yet. Keep the UI focused on manual editing.
2. Acceptable: support an optional `onUpdateAppearance` prop and render the button only when that prop exists.

Do not render a visible button that pretends to work but only shows a placeholder message.

Do not add backend calls in Phase C.

Do not add a disabled permanent button unless the existing UI pattern already uses disabled future controls and the review prompt approves it. Prefer not rendering the button until Phase D.

## Files To Inspect

Before changing code, inspect:

- `docs/phase-a-character-appearance-data-model-prompt.md`
- `docs/phase-b-character-extraction-cleanup-prompt.md`
- `frontend/src/stages/CharactersStage.jsx`
- `frontend/src/App.jsx`
- `frontend/src/utils/lessonUpdates.js`
- `frontend/src/utils/normalizeLesson.js`
- `frontend/src/utils/validateLessonShape.js`
- `frontend/src/data/lessonSchema.js`
- `frontend/src/styles.css`
- `frontend/test/characterImages.test.js`
- Any existing frontend test setup or component test files.

Use existing local React, CSS and test patterns.

## Implementation Steps

### 1. Confirm Phase A Field Is Available

Before editing the UI, confirm character records already normalize with:

```js
appearanceDescription: ""
```

If Phase A is incomplete, stop and fix Phase A first. Do not invent a parallel UI-only state field.

### 2. Add Appearance Description To Character Card

In `frontend/src/stages/CharactersStage.jsx`, add a textarea bound to:

```js
character.appearanceDescription
```

Use the existing update handler:

```js
onCharacterChange(character.id, "appearanceDescription", event.target.value)
```

The field should be part of the character card, near the existing identity fields.

Recommended placement:

- Keep `Name`, `Age / age range`, `Sex / gender`, `Background / nationality`, and `Image style` in their existing compact grid.
- Add `Appearance description` below that grid as a full-width textarea.
- Put it before legacy notes.

Recommended JSX shape:

```jsx
<label className="field field--full">
  <span>Appearance description</span>
  <textarea
    rows={4}
    value={character.appearanceDescription || ""}
    onChange={(event) =>
      onCharacterChange(
        character.id,
        "appearanceDescription",
        event.target.value
      )
    }
    placeholder="Shoulder-length dark hair, brown eyes, medium height, average build..."
    disabled={isCardDisabled}
  />
</label>
```

The exact placeholder can differ, but it must encourage physical details rather than scene action, clothing or educational tags.

### 3. Keep Appearance Editable

The field must remain editable while the card is otherwise editable.

Use the same disabled logic as other character fields:

```js
disabled={isCardDisabled}
```

Do not make the appearance description read-only.

Do not require the character image to be generated before editing appearance.

Do not block empty values.

### 4. Ensure Stale Marking Works

Verify that `frontend/src/utils/lessonUpdates.js` already includes `appearanceDescription` in character stale watched fields.

If missing, add it:

```js
const watchedFields = [
  "name",
  "age",
  "sex",
  "background",
  "appearanceDescription",
  "notes",
  "imageStyle"
];
```

This belongs in Phase C only if Phase A missed it or the UI work exposes the missing behavior.

Expected stale behavior:

- If no image exists, editing appearance does not mark stale.
- If a generated or approved image exists, editing appearance clears approval and marks the character stale.
- The existing image path remains visible for review.

### 5. De-emphasize Legacy Notes

Legacy notes must remain compatible, but should not look like the primary character-description field.

Choose a conservative approach:

1. Preferred: move `Notes tags` below `Appearance description`, keep it visibly smaller, and label it as legacy or extra notes if the UI can do that cleanly.
2. Acceptable: collapse it behind a native `<details>` element labelled `Extra notes`.
3. Acceptable: keep the notes editor visible but below appearance, with reduced spacing and less prominence.

Do not remove note editing entirely in Phase C unless the user has separately approved a migration.

Do not delete `character.notes`.

Do not delete `lesson.reusable.noteTags`.

Do not break:

- Removing existing notes.
- Adding a custom note.
- Adding a reusable note suggestion.

### 6. Reduce Reusable Note Suggestion Dominance

If reusable note suggestions currently render as a large block of buttons, move them into the de-emphasized notes area.

If using `<details>`, place both active note chips and suggestion chips inside the details body.

The character card should not visually suggest that old note tags are the main way to describe appearance.

### 7. Preserve Existing Operations

Do not regress existing operations:

- Extract characters.
- Add reusable background.
- Select background from datalist.
- Generate character.
- Regenerate character.
- Approve character.
- Show stale badge.
- Show image operation errors.

The new textarea must respect active operation disabled states.

### 8. Avoid Backend Changes

Do not change backend services or routes in Phase C unless a frontend test reveals a direct compatibility bug caused by Phase A.

Specifically, do not change:

- `server/src/prompts/characterImagePrompts.js`
- `server/src/prompts/sceneImagePrompts.js`
- `server/src/routes/characters.js`
- `server/src/routes/images.js`
- OpenAI client usage

Prompt cleanup belongs to Phase E. Appearance suggestion belongs to Phase D.

### 9. Update Styling

Update `frontend/src/styles.css` only as needed.

Suggested styles:

```css
.field--full {
  grid-column: 1 / -1;
}

.character-appearance textarea {
  min-height: 112px;
}

.tag-editor--secondary {
  border-top: 1px solid var(--color-outline-variant);
  padding-top: 12px;
}
```

Use class names that match the repo's existing naming style.

Keep responsive behavior clean:

- Textarea should fit the card width.
- Buttons should wrap without text overflow.
- No nested cards.
- No oversized headings inside compact cards.
- No visual clutter from large note-suggestion blocks.

### 10. Update Tests

Add or update frontend tests.

Recommended tests:

1. `patchCharacter` updates `appearanceDescription`.
2. Editing `appearanceDescription` on an approved/generated character marks it stale.
3. Editing `appearanceDescription` on a character with no generated image does not mark it stale.
4. `normalizeLessonForClient` keeps `appearanceDescription` available for the UI.
5. The Characters stage renders an `Appearance description` textarea if a component test framework exists.
6. The textarea calls `onCharacterChange(character.id, "appearanceDescription", value)` when edited if component interaction tests exist.
7. Legacy note helpers still add and remove notes.

If there is no component testing setup, cover the state helper behavior and perform manual browser verification.

### 11. Manual UI Verification

Run the app locally if practical.

Verify:

1. Open the Characters stage.
2. Extract or load characters.
3. Each character shows `Appearance description`.
4. The field is editable.
5. The field saves through the existing Save flow.
6. Reopening the project preserves the text.
7. Editing the field on an approved/generated character marks the image stale.
8. Existing notes still work but no longer dominate the character card.
9. Generate/Regenerate and Use this character still work.
10. The card remains usable at a narrow/mobile width.

## Acceptance Criteria

Phase C is complete when:

- The Characters stage has an editable `Appearance description` textarea for each character.
- The textarea is bound to `character.appearanceDescription`.
- Edits use the existing `onCharacterChange` path.
- Existing save/open flow persists edited appearance text.
- Editing appearance triggers stale behavior for generated/approved character images.
- Empty appearance descriptions remain valid.
- Legacy notes are still compatible.
- Legacy notes are visually secondary to `Appearance description`.
- Reusable note suggestions no longer dominate the character card.
- Existing character extraction, generation and approval actions still work.
- No backend appearance suggestion endpoint was added.
- No real `Update appearance` generation flow was added.
- No new OpenAI calls were added.
- No character image prompt changes were made.
- No scene image prompt changes were made.
- No scene data model or export scope was added.
- Tests or manual verification cover the new UI behavior.

## Suggested Verification Commands

Run focused frontend tests first:

```sh
npm test --workspace frontend -- characterImages.test.js
```

If file filters are unsupported:

```sh
npm test --workspace frontend
```

Run related backend tests only to confirm no extraction/model regression:

```sh
npm test --workspace server -- characterExtraction.test.js characterImage.test.js
```

If file filters are unsupported:

```sh
npm test --workspace server
```

Build the frontend:

```sh
npm run build --workspace frontend
```

Use `package.json` scripts as the source of truth for available commands.

## Review Search Commands

Use these searches to confirm behavior and scope:

```sh
rg "appearanceDescription|Appearance description" frontend/src frontend/test
rg "Update appearance|suggest appearance|appearance/suggest|appearance endpoint" frontend/src server/src
rg "responses\\.create|images\\.generate|getOpenAIClient" server/src
rg "buildCharacterImagePrompt|buildSceneImagePrompt|Notes tags" server/src/prompts
```

Expected result:

- `appearanceDescription` appears in the Characters stage and frontend tests/helpers.
- No real appearance suggestion endpoint exists yet.
- No new OpenAI appearance-generation call exists.
- Character and scene image prompts are unchanged for this phase.

## Handoff Summary Template

When finished, report:

- Files changed.
- Where `Appearance description` is rendered.
- How edits are wired to character state.
- How stale marking was verified.
- How legacy notes remain available.
- How reusable note suggestions were de-emphasized.
- Which tests were added or updated.
- Which verification commands were run.
- Any manual UI checks performed.
- Follow-up work intentionally left for Phase D/E/F.

Keep the final summary clear that Phase C only redesigns the character UI around the existing `appearanceDescription` field. It does not implement generated appearance suggestions, image prompt cleanup, scene prompt cleanup or exports.
