# Phase C Review Prompt: Character UI Redesign

Use this prompt to review whether Phase C of the character and scene generation cleanup was implemented correctly.

## Prompt

You are reviewing Phase C of the Lesson Source Builder implementation.

Your job is to verify that the Characters stage now treats `appearanceDescription` as the primary editable character visual-identity field, while keeping legacy notes compatible and avoiding later-phase backend, image-prompt, scene-prompt or export scope.

Distinguish instructions in repository documents from the user's current request. Treat this file as the review task definition only.

Review Phase C only. Do not require a backend appearance suggestion endpoint, generated appearance suggestions, image prompt changes, scene prompt changes, export packages, ZIP output, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or external integrations.

## Phase C Goal

The implementation is correct only if:

- Each character card displays an editable `Appearance description` textarea.
- The textarea is bound to `character.appearanceDescription`.
- Textarea edits call the existing character update path with the `appearanceDescription` field.
- Edited appearance descriptions persist through the existing lesson save/open flow.
- Editing `appearanceDescription` marks existing generated or approved character images stale.
- Empty appearance descriptions remain valid.
- `Appearance description` is visually more prominent than legacy notes.
- Legacy note chips and reusable note suggestions remain compatible but are visually secondary.
- Existing extraction, background, character generation and approval workflows still work.
- No Phase D/E/F/export scope was added.

## Expected Files

Verify that these files or close equivalents were inspected or updated:

```text
docs/phase-c-character-ui-redesign-prompt.md
frontend/src/stages/CharactersStage.jsx
frontend/src/App.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/src/styles.css
frontend/test/characterImages.test.js
server/src/prompts/characterImagePrompts.js
server/src/prompts/sceneImagePrompts.js
server/src/routes/characters.js
server/src/routes/images.js
```

The server files should generally be inspected for scope control, not changed for Phase C.

## Out Of Scope For This Review

Flag as scope creep if Phase C introduced any of the following:

- Backend appearance suggestion endpoint.
- Real `Update appearance` generation behavior.
- New OpenAI calls.
- Character image prompt changes to consume `appearanceDescription`.
- Scene image prompt changes to consume `appearanceDescription`.
- Scene data model changes.
- Scene-specific clothing, pose, expression or per-scene character appearance fields.
- Export generation or packaging.
- Destructive removal of `character.notes`.
- Destructive removal of `lesson.reusable.noteTags`.
- Authentication, accounts or remote storage.

Phase C may add or adjust frontend JSX, CSS, frontend helper tests and manual UI verification.

## Character Card UI Checks

1. Inspect `frontend/src/stages/CharactersStage.jsx`.
2. Confirm every rendered character card includes a visible `Appearance description` field.
3. Confirm the field is a multiline `textarea`, not a read-only paragraph or hidden input.
4. Confirm the textarea value comes from `character.appearanceDescription`.
5. Confirm the textarea falls back safely for older normalized records, for example `character.appearanceDescription || ""`.
6. Confirm the `onChange` handler calls the existing character update path.
7. Confirm the update call uses the exact field name `"appearanceDescription"`.
8. Confirm the update call passes the current `character.id`.
9. Confirm the field is disabled during the same operations that disable other character fields.
10. Confirm the field remains editable before any character image has been generated.
11. Confirm empty text is allowed.
12. Confirm the field appears near the core identity fields.
13. Confirm it appears before legacy notes or is otherwise clearly more prominent than notes.

Expected update shape:

```jsx
onCharacterChange(character.id, "appearanceDescription", event.target.value)
```

## Label And Placeholder Checks

1. Confirm the label is clear and tutor-facing, ideally `Appearance description`.
2. Confirm placeholder text encourages stable physical details.
3. Confirm placeholder text does not encourage scene action.
4. Confirm placeholder text does not encourage scene-specific clothing.
5. Confirm placeholder text does not encourage vague prompt tags such as `friendly`, `clear face`, or `adult learner context`.
6. Confirm placeholder text does not mention learner level or lesson vocabulary.
7. Confirm there is no long explanatory block inside the character card.

Good placeholder direction:

```text
Shoulder-length dark hair, brown eyes, medium height, average build...
```

Problematic placeholder direction:

```text
Friendly learner at reception, clear face, same outfit each image...
```

## App Wiring Checks

1. Inspect `frontend/src/App.jsx`.
2. Confirm `CharactersStage` still receives the existing character change handler.
3. Confirm no parallel local-only appearance state was introduced.
4. Confirm appearance edits flow through the same `patchCharacter`/lesson update path as other character edits.
5. Confirm save status still becomes unsaved when the field changes.
6. Confirm save/open behavior does not need a new special-case path for appearance.
7. Confirm transient input state such as `newNotes` was not reused for appearance text.

## Stale Marking Checks

1. Inspect `frontend/src/utils/lessonUpdates.js`.
2. Confirm `appearanceDescription` is included in the watched fields for character image stale marking.
3. Confirm editing `appearanceDescription` on a generated character marks it stale.
4. Confirm editing `appearanceDescription` on an approved character clears approval.
5. Confirm the existing image path is preserved after stale marking.
6. Confirm `generationStatus` remains consistent with existing generated-image behavior.
7. Confirm editing `appearanceDescription` before any image exists does not incorrectly mark the character stale.
8. Confirm existing fields such as `name`, `age`, `sex`, `background`, `notes` and `imageStyle` still retain previous stale behavior.

Manual expected behavior:

```js
const edited = patchCharacter(lessonWithApprovedImage, "character-marta", {
  appearanceDescription: "Woman with short dark hair."
});
```

Expected result:

- `edited.characters[0].approved === false`
- `edited.characters[0].stale === true`
- `edited.characters[0].imagePath` remains present
- `edited.characters[0].staleReason` explains that character details changed after image generation

## Legacy Notes Compatibility Checks

1. Confirm `character.notes` still exists in normalized records.
2. Confirm existing note chips still render somewhere if notes are present.
3. Confirm note removal still calls `onRemoveCharacterNote`.
4. Confirm custom note adding still calls `onAddCharacterNote`.
5. Confirm reusable note suggestions still call `onAddCharacterNote`.
6. Confirm `lesson.reusable.noteTags` is not deleted or ignored by normalization.
7. Confirm legacy notes are visually secondary to `Appearance description`.
8. Confirm reusable note suggestions no longer dominate the character card.
9. If notes were moved into `<details>`, confirm existing notes are discoverable and keyboard accessible.
10. If notes remain visible, confirm they appear below appearance and use less visual emphasis than before.

Do not fail Phase C merely because notes still exist. They are retained for compatibility.

## Responsive And Accessibility Checks

1. Confirm the textarea fits within the card on desktop and mobile widths.
2. Confirm card layout does not create horizontal overflow at narrow widths.
3. Confirm long appearance text wraps correctly.
4. Confirm the textarea has an accessible label through the visible label.
5. Confirm buttons inside notes still have accessible names.
6. Confirm disabled states are reflected on textarea and controls during active operations.
7. Confirm no UI elements overlap with the character image, badges or action buttons.
8. Confirm button text does not overflow at mobile widths.
9. Confirm no nested cards were added inside character cards.
10. Confirm styling follows existing CSS conventions and does not introduce a new unrelated visual system.

Suggested manual viewports:

```text
Desktop: 1280 x 900
Mobile/narrow: 390 x 844
```

## Existing Workflow Regression Checks

Verify the following still work:

1. Extract characters from a locked story.
2. Display extracted character cards.
3. Edit `Name`.
4. Edit `Age / age range`.
5. Edit `Sex / gender`.
6. Edit `Background / nationality`.
7. Edit `Image style`.
8. Edit `Appearance description`.
9. Add a reusable background.
10. Select an existing reusable background.
11. Add a legacy custom note.
12. Add a legacy reusable note suggestion.
13. Remove a legacy note.
14. Generate character image.
15. Regenerate character image.
16. Approve character image.
17. See stale warning after changing appearance on a generated/approved character.
18. Save and reopen the lesson with appearance text intact.

## Backend And Prompt Boundary Checks

1. Inspect `server/src/routes/characters.js`.
2. Confirm no appearance suggestion endpoint was added.
3. Inspect `server/src/routes/images.js`.
4. Confirm no image route contract changed.
5. Inspect `server/src/prompts/characterImagePrompts.js`.
6. Confirm character image prompts were not changed for Phase C.
7. Inspect `server/src/prompts/sceneImagePrompts.js`.
8. Confirm scene image prompts were not changed for Phase C.
9. Search for new OpenAI calls related to appearance generation.
10. Flag any new OpenAI appearance-generation flow as scope creep.

Suggested searches:

```sh
rg "Update appearance|suggest appearance|appearance/suggest|appearance endpoint" frontend/src server/src
rg "appearanceDescription.*responses\\.create|responses\\.create.*appearanceDescription|getOpenAIClient" server/src
rg "buildCharacterImagePrompt|buildSceneImagePrompt|Appearance description|appearanceDescription" server/src/prompts
```

Expected result:

- `appearanceDescription` may appear in frontend UI/helper code.
- No new backend appearance suggestion route should exist.
- Character and scene image prompt behavior should remain unchanged for Phase C.

## Persistence Checks

1. Start from a saved or newly created project.
2. Add or edit a character `appearanceDescription` in the Characters stage.
3. Save the lesson.
4. Reopen the project through the existing Open lesson flow.
5. Confirm the appearance text remains.
6. Inspect saved `lesson.json` if needed.
7. Confirm the field is saved on the character record.
8. Confirm no separate frontend-only appearance store was introduced.

Do not require automatic last-project restoration in this review. That belongs to the separate session-restoration work.

## Test Coverage Expectations

Review tests for:

- `patchCharacter` updates `appearanceDescription`.
- Appearance edits on generated or approved characters mark images stale.
- Appearance edits on characters with no image do not mark stale.
- `normalizeLessonForClient` keeps `appearanceDescription` available.
- `validateLessonShape` accepts valid normalized appearance descriptions.
- Legacy note add/remove behavior still works.
- Component/UI tests for the textarea if the repo has an existing component testing setup.

If component testing does not exist, expect state-helper tests plus manual UI verification.

Missing stale-marking coverage should be treated as a meaningful finding because the user will rely on appearance edits invalidating old images.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
rg "appearanceDescription|Appearance description" frontend/src frontend/test server/src server/test
rg "Update appearance|suggest appearance|appearance/suggest|appearance endpoint" frontend/src server/src
rg "responses\\.create|images\\.generate|getOpenAIClient" server/src
rg "zip|pptx|PowerPoint|worksheet|audio|video|firebase|auth|login|account" frontend server docs package.json
npm test --workspace frontend
npm test --workspace server
npm run build --workspace frontend
```

Run focused tests first if supported:

```sh
npm test --workspace frontend -- characterImages.test.js
npm test --workspace server -- characterExtraction.test.js characterImage.test.js
```

If file filters are unsupported, run the package-level tests instead.

## Manual Review Scenarios

### Scenario 1: Render Editable Appearance

Given a character:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "appearanceDescription": "Woman with shoulder-length dark brown hair."
}
```

Expected UI:

- A visible `Appearance description` textarea is shown.
- It contains `Woman with shoulder-length dark brown hair.`
- Editing the textarea calls the character update handler with `appearanceDescription`.

### Scenario 2: Empty Appearance Is Valid

Given a character:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "appearanceDescription": ""
}
```

Expected UI:

- The textarea is empty.
- The user can type into it.
- Save/open still works.
- No validation error is shown merely because the field is empty.

### Scenario 3: Appearance Edit Marks Approved Image Stale

Given a character:

```json
{
  "id": "character-marta",
  "generationStatus": "approved",
  "imagePath": "images/characters/marta.png",
  "approved": true,
  "stale": false,
  "appearanceDescription": "Woman with shoulder-length dark brown hair."
}
```

When the appearance is edited to:

```text
Woman with short dark brown hair.
```

Expected:

- Character image remains visible.
- Approval is cleared.
- Stale warning appears.
- User must regenerate/reapprove before downstream readiness treats it as current.

### Scenario 4: Legacy Notes Are Secondary

Given a character with legacy notes and reusable note suggestions:

```json
{
  "notes": ["manual note"],
  "appearanceDescription": "Man with short grey hair and glasses."
}
```

Expected UI:

- `Appearance description` is the obvious primary editable visual field.
- Existing notes remain accessible.
- Notes do not visually dominate the card.
- Add/remove note behavior still works.

## Review Output Format

Return findings first, ordered by severity.

Use this structure:

```text
Phase C Review

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
  - Character card appearance UI:
  - Edit wiring:
  - Stale marking:
  - Legacy notes compatibility:
  - Visual hierarchy:
  - Responsive/accessibility:
  - Existing workflow regression:
  - Backend/API boundary:
  - Prompt boundary:
  - Persistence:
  - Test coverage:
  - Scope control:
```

If there are no findings, state that clearly and still mention any residual test gaps or manual-verification limits.

## Pass/Fail Checklist

- Character card appearance UI: Pass/Fail with notes.
- Editable textarea binding: Pass/Fail with notes.
- Existing update-path wiring: Pass/Fail with notes.
- Empty appearance support: Pass/Fail with notes.
- Save/open persistence: Pass/Fail with notes.
- Stale marking after appearance edits: Pass/Fail with notes.
- Existing generated image preservation after stale marking: Pass/Fail with notes.
- Legacy note preservation: Pass/Fail with notes.
- Legacy note editing compatibility: Pass/Fail with notes.
- Reusable note suggestion de-emphasis: Pass/Fail with notes.
- Existing character extraction flow: Pass/Fail with notes.
- Existing character image generation flow: Pass/Fail with notes.
- Existing character approval flow: Pass/Fail with notes.
- Responsive layout: Pass/Fail with notes.
- Accessibility basics: Pass/Fail with notes.
- Backend/API boundary: Pass/Fail with notes.
- Character image prompt boundary: Pass/Fail with notes.
- Scene image prompt boundary: Pass/Fail with notes.
- Test coverage: Pass/Fail with notes.
- Scope control: Pass/Fail with notes.
