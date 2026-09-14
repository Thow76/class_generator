# Phase 4 Implementation Prompt

Use this prompt to implement Milestone 1, Phase 4 of Lesson Source Builder.

## Prompt

You are implementing Milestone 1, Phase 4 of Lesson Source Builder.

Phase 0 froze the approved prototype. Phase 1 built the React/Vite and Node/Express shell. Phase 2 made one normalized lesson object the frontend source of truth. Phase 3 made that lesson object persistent through backend project APIs. Phase 4 must now make the Setup stage fully functional: every Setup field must be bound to persisted lesson data, required fields must be validated, and the user must be blocked from entering the story workflow until the minimum lesson brief is complete.

Implement Phase 4 only. Do not add OpenAI integration, real story generation, character extraction, scene planning, image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase or cloud sync.

## Phase 4 Goal

Bind the Setup UI to persistent lesson data and prevent invalid story workflow entry.

Done means:

- Every Setup field is represented in the saved `lesson.json`.
- Setup values persist after save, browser refresh and open.
- Required Setup fields show clear inline validation.
- Generate Story or placeholder story creation is blocked until required fields are complete.
- Learner level options match the approved service-specific list exactly.
- No CEFR labels appear in the main app UI.
- Existing Phase 1-3 behavior still works.

## Phase 4 Scope

Build:

- Setup-specific validation rules.
- Inline validation messages near Setup fields.
- Required vs optional Setup field definitions.
- Disabled or guarded Generate Story action while required fields are missing.
- A local placeholder story creation path if needed for Milestone 1 acceptance.
- Save/load preservation for all Setup fields.
- Clear validation state after opening or creating lessons.
- Tests or focused validation checks where practical.
- Documentation for Setup validation behavior.

Do not build:

- OpenAI story generation.
- OpenAI SDK usage.
- Backend `/api/story/generate`.
- Character extraction.
- Scene planning.
- Image generation.
- Audio scripts.
- Video prompts.
- ZIP export.
- A new dashboard or landing page.
- Accounts, login, Firebase or cloud sync.

## Starting Point

Important current files:

```text
frontend/src/stages/SetupStage.jsx
frontend/src/App.jsx
frontend/src/data/constants.js
frontend/src/data/lessonSchema.js
frontend/src/data/createLesson.js
frontend/src/data/demoLesson.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/validateLessonShape.js
frontend/src/utils/normalizeLesson.js
frontend/src/api/projects.js
server/src/routes/projects.js
server/src/services/validateLesson.js
server/src/services/normalizeLesson.js
docs/phase-2-data-model.md
docs/phase-3-persistence.md
```

The current Setup stage already renders the core fields. Phase 4 should make them validated, persisted and workflow-gating capable.

## Product Rules To Preserve

### Learner Levels

The learner level selector must contain only:

- Literacies Plus
- Complete Beginner
- Beginner 1
- Beginner 1.5
- Beginner 2

Do not show CEFR labels such as A1, A2 or B1 in the main app UI, validation text, placeholder text, saved defaults or documentation intended for users.

### Character Setup

Character input must remain lightweight:

- Main character name.
- Age or age range.
- Sex or gender.
- Background or nationality.
- Optional secondary character tags.

Do not add dedicated character fields for:

- Hair.
- Clothing.
- Build.
- Personality.
- Expression.
- Visual style.

### Product Principle

Follow:

```text
minimum required input -> sensible AI defaults later -> optional user overrides
```

Phase 4 should require only what is needed to draft a useful story later. Do not make optional future media details mandatory.

## Setup Data Contract

These fields must be represented in the lesson object and persisted through Phase 3 save/open:

```text
theme
title
learnerLevel
setting
scenario
sentenceCount
setup.mainCharacter.name
setup.mainCharacter.age
setup.mainCharacter.sex
setup.mainCharacter.background
setup.secondaryCharacters
setup.targetVocabulary
setup.additionalNotes
```

If the implementation uses slightly different labels in the UI, the saved object should still map clearly to these fields.

## Required Fields

Recommended required fields for story workflow entry:

```text
theme
learnerLevel
setting
scenario
setup.mainCharacter.name
setup.mainCharacter.age
setup.mainCharacter.sex
setup.mainCharacter.background
sentenceCount
```

Optional fields:

```text
title
setup.secondaryCharacters
setup.targetVocabulary
setup.additionalNotes
```

Rationale:

- `title` can be blank because later generation or the user can supply it.
- Secondary characters are optional because some lessons may only need one recurring character.
- Target vocabulary and additional notes are guidance, not minimum viable story context.

If you choose a different required/optional split, document the reason in the Phase 4 docs and keep it aligned with the product principle.

## Validation Behavior

## Step 1: Add Setup Validation Helpers

Create a focused helper, for example:

```text
frontend/src/utils/validateSetup.js
```

Suggested exports:

```js
export const requiredSetupFields = [...]
export function validateSetup(lesson)
export function isSetupComplete(lesson)
export function getSetupFieldError(errors, fieldId)
```

Validation should return structured data, not only strings.

Suggested error shape:

```js
{
  field: "setup.mainCharacter.name",
  message: "Enter the main character name."
}
```

Acceptance:

- Required field definitions are centralized.
- Validation can be reused by `SetupStage`, `App.jsx` and tests.
- Validation does not mutate the lesson object.

## Step 2: Define Field IDs

Use stable field IDs so errors can map cleanly to UI fields.

Suggested IDs:

```text
theme
learnerLevel
setting
scenario
sentenceCount
setup.mainCharacter.name
setup.mainCharacter.age
setup.mainCharacter.sex
setup.mainCharacter.background
```

Optional field IDs may also be defined for consistency:

```text
title
setup.secondaryCharacters
setup.targetVocabulary
setup.additionalNotes
```

Acceptance:

- Error objects map to actual fields.
- Field IDs are not duplicated inconsistently across components.

## Step 3: Implement Validation Rules

Rules:

- Required text fields must contain non-whitespace text.
- Learner level must be one of the approved `learnerLevels`.
- Sentence count must be one of the approved `sentenceCounts`.
- Main character sex/gender must contain a meaningful value from `sexOptions`.
- Secondary character tags should be trimmed and deduplicated.
- Target vocabulary and additional notes may be blank.

Consider whether `Unspecified` is acceptable for main character sex/gender. If accepted, document it. If not accepted, validation should prompt the user to choose a more specific value.

Acceptance:

- Empty strings fail required validation.
- Whitespace-only values fail required validation.
- Invalid learner level fails validation.
- Invalid sentence count fails validation.
- Optional fields do not block Story entry.

## Step 4: Add Inline Validation UI

Update `SetupStage.jsx` so fields can display validation messages.

Recommended prop additions:

```js
setupErrors
showSetupValidation
onFieldBlur
onGenerateStory
```

Each field should support:

- Error text near the input.
- Accessible error association where practical.
- Visual invalid state on the input.
- Short, practical message.

Example messages:

```text
Enter a theme.
Choose a learner level.
Enter the setting.
Describe the main situation.
Enter the main character name.
Enter an age or age range.
Choose sex or gender.
Enter a background or nationality.
Choose the number of sentences.
```

Do not add long explanatory copy to the UI.

Acceptance:

- Missing required fields show inline messages.
- Messages appear near the relevant field.
- Messages clear when the field becomes valid.
- The layout does not jump or overlap badly when errors appear.

## Step 5: Choose Validation Timing

Use a calm validation pattern:

- Validate on Generate Story click.
- Validate touched fields on blur.
- Validate live after a field has shown an error.
- Do not show every error immediately on first page load.

Recommended state:

```text
touchedSetupFields
hasSubmittedSetup
setupErrors
```

Alternative:

- Show validation only after Generate Story is attempted, then update live.

Acceptance:

- A new blank lesson does not start covered in errors.
- Attempting to Generate Story reveals all missing required fields.
- Fixing fields removes errors without requiring a page refresh.

## Step 6: Gate Generate Story / Placeholder Story

Phase 4 must prevent story workflow entry when required Setup fields are missing.

Current Phase 1/2/3 behavior may use `onGenerateStory` to navigate to Story. Replace or wrap it:

1. User clicks Generate Story.
2. App validates Setup.
3. If invalid:
   - Keep user on Setup.
   - Show inline field errors.
   - Show a short summary message if useful.
   - Do not modify story sentences.
   - Do not set `currentStage` to `story`.
4. If valid:
   - Allow story workflow entry.
   - Create or preserve a local placeholder story draft as needed.
   - Set `lesson.story.status` to `draft` if placeholder story is created.
   - Navigate to Story.
   - Mark lesson unsaved if story/currentStage changes.

Acceptance:

- Invalid Setup cannot navigate to Story via Generate Story.
- Valid Setup can navigate to Story.
- Story creation remains local placeholder behavior only.
- No OpenAI request is made.

## Step 7: Placeholder Story Creation

Milestone 1 may use a local placeholder story so the acceptance path can still test edit, lock, save and reopen.

Rules:

- Name the code clearly as placeholder or demo, for example `createPlaceholderStory`.
- Do not call it AI generation.
- Do not create a backend story route.
- Store sentences in `lesson.story.sentences`.
- Use stable sentence IDs.
- Respect `lesson.sentenceCount`.
- Set `lesson.story.status` to `draft`.
- Reset `lockedAt` to `null` if replacing the story.
- Set `modifiedAfterLock` appropriately, usually `false` for a new placeholder draft.

Recommended placeholder content:

- Use the Setup theme, scenario, setting and main character name.
- Keep sentences simple.
- It is acceptable if sentences are generic because real story generation starts in Milestone 2.

Acceptance:

- Placeholder sentences are created only after Setup is valid.
- The number of placeholder sentences matches `lesson.sentenceCount`.
- Placeholder story persists after save/open.
- The UI does not imply OpenAI was used.

## Step 8: Persist Setup Validation-Relevant Data

Phase 3 already saves the full lesson object. Phase 4 must verify all Setup fields survive save/open.

Ensure:

- Top-level fields persist.
- `setup.mainCharacter` fields persist.
- `setup.secondaryCharacters` persist.
- `setup.targetVocabulary` persists.
- `setup.additionalNotes` persists.
- `sentenceCount` persists as a number.
- `learnerLevel` persists as an approved string.

Do not persist transient validation UI state unless there is a clear reason.

Acceptance:

- Save/open restores Setup field values.
- Save/open restores placeholder story if created.
- Validation recalculates from lesson data after load.

## Step 9: Keep Backend Validation Aligned

Update backend validation only where needed.

Backend `validateLesson` should continue to reject invalid lesson object structure. For Phase 4, consider adding structural checks for:

- Approved learner level.
- Approved sentence count.
- Required Setup object shape.
- Main character object shape.
- Secondary characters array shape.

Do not make backend project save reject incomplete Setup drafts unless the product requires every saved lesson to be story-ready. Users should be able to save an incomplete lesson draft.

Recommended split:

- Backend lesson validation: shape integrity and safe values.
- Frontend Setup validation: required fields for story workflow entry.

Acceptance:

- Incomplete drafts can still save.
- Invalid enum values are rejected or normalized safely.
- Setup workflow gating remains frontend-visible.

## Step 10: Update Completed Stage Logic

Completed stage indicators should align with Setup readiness.

Update `getCompletedStages` or equivalent so Setup is completed only when required Setup fields are valid.

Do not mark Setup complete merely because a few fields such as theme/title/scenario are filled.

Acceptance:

- Setup stage completed indicator appears only when Setup is story-ready.
- Clearing a required field removes completed state.
- Saved/opened lessons show completed state correctly.

## Step 11: Add Tests Or Focused Checks

If a frontend test runner exists, add tests for `validateSetup`.

If no frontend test runner exists, add a small script or keep checks manual. Do not add a heavy testing framework unless it is straightforward.

Recommended validation tests:

- Empty lesson is invalid.
- Whitespace-only required fields are invalid.
- Complete minimum Setup is valid.
- Optional fields do not affect validity.
- Invalid learner level is invalid.
- Invalid sentence count is invalid.
- Error messages map to field IDs.

If backend validation changes, run or add backend tests.

Acceptance:

- Validation logic can be verified without clicking every field manually.
- Existing backend tests still pass.

## Step 12: Update Documentation

Add or update a short doc:

```text
docs/phase-4-setup-validation.md
```

Document:

- Required Setup fields.
- Optional Setup fields.
- Generate Story gating behavior.
- Placeholder story behavior.
- Persistence expectations.
- Out-of-scope Milestone 2 AI generation.

Acceptance:

- A reviewer can understand Phase 4 behavior without reading every component.
- Milestone 2 implementer can see where real story generation should replace placeholder story creation.

## Suggested Files To Add Or Update

Likely add:

```text
frontend/src/utils/validateSetup.js
frontend/src/utils/createPlaceholderStory.js
docs/phase-4-setup-validation.md
```

Likely update:

```text
frontend/src/App.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/utils/lessonSelectors.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/constants.js
frontend/src/data/createLesson.js
frontend/src/data/demoLesson.js
server/src/services/validateLesson.js
server/test/projectStore.test.js
README.md
```

Only update backend files if necessary for shape/enum consistency.

## Manual QA Checklist

### Startup

- `npm run dev` starts frontend and backend.
- Frontend renders Setup.
- `GET /api/health` returns JSON.
- `GET /api/projects` returns JSON.

### Required Field Validation

- Create a new lesson.
- Clear all Setup required fields.
- Click Generate Story.
- Confirm the app stays on Setup.
- Confirm inline errors appear near required fields.
- Enter whitespace-only values and confirm they remain invalid.
- Fill Theme and confirm its error clears.
- Fill Setting and confirm its error clears.
- Fill Scenario and confirm its error clears.
- Fill main character name and confirm its error clears.
- Fill age/age range and confirm its error clears.
- Choose sex/gender and confirm its error clears.
- Fill background/nationality and confirm its error clears.
- Choose sentence count and confirm its error clears.
- Confirm optional fields can remain blank.

### Story Gate

- With missing required fields, click Generate Story.
- Confirm no placeholder story is created.
- Confirm current stage remains Setup.
- Complete required fields.
- Click Generate Story.
- Confirm app navigates to Story.
- Confirm placeholder story appears or existing story is preserved according to documented behavior.
- Confirm story status is draft.
- Confirm sentence count matches Setup sentence count if creating a new placeholder story.

### Persistence

- Complete required Setup fields.
- Add optional target vocabulary.
- Add optional additional notes.
- Add a secondary character.
- Generate placeholder story.
- Save lesson.
- Refresh browser.
- Open saved lesson.
- Confirm all Setup fields are restored.
- Confirm validation state reflects loaded data.
- Confirm placeholder story is restored.

### Completed Stage Indicator

- Complete required Setup fields.
- Confirm Setup appears completed.
- Clear one required field.
- Confirm Setup no longer appears completed.
- Save and reopen.
- Confirm completed indicator is recalculated correctly.

### Regression Checks

- Story edit still works.
- Story lock/unlock still works.
- Character dummy generate/approve still works.
- Scene dummy generate/approve still works.
- Media filter still works.
- Export summary still works.
- Save/open/duplicate still works.

### Scope Checks

- Confirm no OpenAI package or API route was added.
- Confirm no real image generation was added.
- Confirm no ZIP export was added.
- Confirm no account/auth/cloud/Firebase flow was added.
- Confirm frontend does not import `prototype/support.js`.

## Verification Commands

Run available commands:

```sh
npm run build --workspace frontend
npm run test --workspace server
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "validateSetup|isSetupComplete|requiredSetup|createPlaceholderStory|placeholder" frontend/src docs
rg "OpenAI|openai|zip|firebase|auth|login|account|ElevenLabs|PowerPoint|worksheet" frontend server package.json
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
rg "A1|A2|B1|CEFR" frontend/src docs README.md
```

If a frontend test runner is added, run the frontend tests and document the command.

## Acceptance Criteria

- Every Setup field is represented in `lesson.json`.
- Setup values save and load correctly.
- Required fields are centrally defined.
- Required field validation works.
- Inline validation messages appear near missing fields.
- Generate Story is blocked when required fields are missing.
- Generate Story works when required fields are complete.
- Placeholder story behavior is local and clearly named.
- Learner levels exactly match the approved list.
- No CEFR labels appear in the main app UI.
- Setup completed indicator reflects validation readiness.
- Existing Phase 1-3 behavior still works.
- No Milestone 2+ scope has been introduced.

## Handoff To Milestone 2

Milestone 2 will replace the local placeholder story path with backend-only OpenAI story generation.

Before handing off, ensure:

- Setup validation can be reused before calling the real story endpoint.
- Required Setup fields are stable.
- Placeholder story creation is isolated and easy to replace.
- The frontend already has clear loading/error placement for Generate Story, or has obvious room for it.
- The persisted lesson object contains all Setup data needed for story generation.
- API keys are still not present in frontend code.

## Implementation Response Format

When implementation is complete, respond with:

```md
## Summary

- ...

## Changed Files

- ...

## Verification

- ...

## Notes For Milestone 2

- ...
```

Mention any tests, browser checks or route checks that could not be completed.
