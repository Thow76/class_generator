# Phase 4 Review Prompt

Use this prompt to review whether Milestone 1, Phase 4 of Lesson Source Builder was implemented correctly. The review should verify Setup validation, workflow gating and persistence of Setup data only.

## Prompt

You are reviewing Milestone 1, Phase 4 of the Lesson Source Builder implementation.

Your job is to verify that the Setup stage is now fully functional: every Setup field is bound to the persisted lesson object, required fields are validated with clear inline messages, and the user cannot enter the story workflow through Generate Story until the minimum lesson brief is complete.

Review Phase 4 only. Do not require OpenAI story generation, character extraction, scene planning, image generation, audio/video source generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase or cloud sync.

## Phase 4 Goal

Bind the Setup UI to persistent lesson data and prevent invalid story workflow entry.

The implementation is correct only if:

- Every Setup field is represented in the saved `lesson.json`.
- Setup values persist after save, refresh and open.
- Required Setup fields are centrally defined.
- Required Setup fields are validated.
- Inline validation messages appear near invalid required fields.
- Generate Story is blocked while required Setup fields are missing.
- Valid Setup can enter Story.
- Placeholder story behavior is local, clearly named and not presented as AI generation.
- Setup completed indicator reflects Setup readiness.
- Existing Phase 1-3 behavior still works.
- No Milestone 2+ AI/media/export/account scope was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-4-implementation-prompt.md
docs/phase-4-setup-validation.md
frontend/src/utils/validateSetup.js
frontend/src/utils/createPlaceholderStory.js
frontend/src/stages/SetupStage.jsx
frontend/src/App.jsx
frontend/src/utils/lessonSelectors.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/validateLessonShape.js
frontend/src/utils/normalizeLesson.js
frontend/src/data/constants.js
frontend/src/data/createLesson.js
frontend/src/data/demoLesson.js
server/src/services/validateLesson.js
server/src/services/normalizeLesson.js
server/src/routes/projects.js
server/test/projectStore.test.js
```

File names may differ, but the implementation should clearly separate:

- Setup workflow validation.
- Placeholder story creation.
- Setup UI error display.
- Completed-stage derivation.
- Persistence validation/normalization.
- Phase 4 documentation.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
find frontend/src docs server/src server/test -maxdepth 4 -type f | sort
npm run build --workspace frontend
npm run test --workspace server
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
rg "validateSetup|isSetupComplete|requiredSetup|optionalSetup|createPlaceholderStory|placeholder" frontend/src docs
rg "OpenAI|openai|zip|firebase|auth|login|account|ElevenLabs|PowerPoint|worksheet" frontend server package.json
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
rg "A1|A2|B1|CEFR" frontend/src docs README.md
```

Expected development URLs:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
```

## Review Steps

1. Read `docs/phase-4-implementation-prompt.md`.
2. Read `docs/phase-4-setup-validation.md`.
3. Inspect `frontend/src/utils/validateSetup.js`.
4. Confirm required and optional Setup fields are centrally defined.
5. Confirm validation returns structured errors with stable field IDs.
6. Confirm whitespace-only required text values fail validation.
7. Confirm learner level is validated against the approved service-specific list.
8. Confirm sentence count is validated against approved sentence-count options.
9. Confirm main-character sex/gender is validated consistently.
10. Inspect `frontend/src/stages/SetupStage.jsx`.
11. Confirm all Setup inputs render from `lesson` data.
12. Confirm inline errors appear near the relevant fields.
13. Confirm invalid fields use accessible error state where practical.
14. Inspect `frontend/src/App.jsx`.
15. Confirm Generate Story validates Setup before stage navigation.
16. Confirm invalid Setup keeps the user on Setup.
17. Confirm valid Setup can navigate to Story.
18. Confirm placeholder story creation is local and clearly named.
19. Confirm placeholder story respects `lesson.sentenceCount`.
20. Confirm placeholder story writes to `lesson.story.sentences`.
21. Inspect `frontend/src/utils/lessonSelectors.js`.
22. Confirm Setup completed state uses `isSetupComplete` or equivalent validation, not a partial field check.
23. Inspect frontend/backend normalizers and validators.
24. Confirm saved/opened lessons preserve all Setup fields.
25. Confirm incomplete lessons can still save as drafts.
26. Start the app and manually test validation, placeholder Story entry, save/open and regression flows.
27. Search for CEFR labels in main UI code.
28. Search for accidental OpenAI, image generation, ZIP export, auth/cloud or prototype runtime dependencies.

## Acceptance Checklist

Mark each item Pass, Fail, or Not Applicable.

| Item | Result | Evidence |
| --- | --- | --- |
| Phase 4 validation documentation exists |  |  |
| Setup validation helper exists |  |  |
| Required Setup fields are centrally defined |  |  |
| Optional Setup fields are documented or centrally defined |  |  |
| Validation returns structured field-level errors |  |  |
| Empty required fields fail validation |  |  |
| Whitespace-only required fields fail validation |  |  |
| Invalid learner level fails validation |  |  |
| Invalid sentence count fails validation |  |  |
| Main-character sex/gender validation is consistent |  |  |
| New blank lesson does not immediately show every error |  |  |
| Errors appear after field blur or Generate Story attempt |  |  |
| Inline errors appear near relevant fields |  |  |
| Errors clear when fields become valid |  |  |
| Setup Stage renders Theme from lesson data |  |  |
| Setup Stage renders Lesson title from lesson data |  |  |
| Setup Stage renders Learner level from lesson data |  |  |
| Setup Stage renders Setting from lesson data |  |  |
| Setup Stage renders Scenario from lesson data |  |  |
| Setup Stage renders main character name from lesson data |  |  |
| Setup Stage renders age/age range from lesson data |  |  |
| Setup Stage renders sex/gender from lesson data |  |  |
| Setup Stage renders background/nationality from lesson data |  |  |
| Setup Stage renders secondary characters from lesson data |  |  |
| Setup Stage renders sentence count from lesson data |  |  |
| Setup Stage renders target vocabulary from lesson data |  |  |
| Setup Stage renders additional notes from lesson data |  |  |
| Generate Story is blocked when required fields are missing |  |  |
| Invalid Generate Story attempt keeps current stage on Setup |  |  |
| Invalid Generate Story attempt does not create placeholder story |  |  |
| Valid Setup can enter Story |  |  |
| Placeholder story creation is clearly local/non-AI |  |  |
| Placeholder story respects selected sentence count |  |  |
| Placeholder story uses stable sentence IDs |  |  |
| Placeholder story sets story status to draft |  |  |
| Placeholder story resets or handles lock metadata correctly |  |  |
| Setup completed indicator reflects validation readiness |  |  |
| Clearing a required Setup field removes completed state |  |  |
| Incomplete Setup draft can still save |  |  |
| Complete Setup values save and load correctly |  |  |
| Placeholder story saves and loads correctly |  |  |
| Learner levels match approved list exactly |  |  |
| No CEFR labels appear in main UI |  |  |
| Character setup fields remain lightweight |  |  |
| No forbidden character fields were added |  |  |
| Existing save/open/duplicate behavior still works |  |  |
| Existing Story edit/lock/unlock behavior still works |  |  |
| Existing character dummy flow still works |  |  |
| Existing scene dummy flow still works |  |  |
| Existing Media filter still works |  |  |
| Existing Export summary still works |  |  |
| No OpenAI integration was added |  |  |
| No real image generation was added |  |  |
| No ZIP export was added |  |  |
| No account/auth/cloud/Firebase flow was added |  |  |
| Production frontend does not import `prototype/support.js` |  |  |

## Required Setup Fields To Verify

The default required fields should be:

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

If the implementation uses a different required set, verify the difference is documented and follows the product principle:

```text
minimum required input -> sensible AI defaults later -> optional user overrides
```

## Optional Setup Fields To Verify

These fields should save and load but should not block story entry:

```text
title
setup.secondaryCharacters
setup.targetVocabulary
setup.additionalNotes
```

Flag a finding if optional guidance fields are made mandatory without clear product rationale.

## Setup Persistence Checks

Save a lesson and inspect `server/data/projects/<PROJECT_ID>/lesson.json`.

Confirm the saved JSON includes the current values for:

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

Confirm transient UI state is not persisted:

- Field touched flags.
- Validation submitted flags.
- Current text being typed into add-secondary-character input.
- Open/closed validation UI state.

## Manual App Flow To Verify

Run the app, then complete this path:

1. Create a new lesson.
2. Confirm Setup opens without showing every validation error immediately.
3. Clear required Setup fields if defaults are present.
4. Click Generate Story.
5. Confirm the app stays on Setup.
6. Confirm inline errors appear near missing required fields.
7. Enter whitespace-only text in a required field.
8. Confirm it remains invalid.
9. Fill Theme.
10. Fill Setting.
11. Fill Scenario.
12. Fill main character name.
13. Fill age or age range.
14. Choose sex/gender.
15. Fill background/nationality.
16. Choose sentence count.
17. Leave optional title, secondary characters, target vocabulary and notes blank.
18. Click Generate Story.
19. Confirm the app navigates to Story.
20. Confirm a local placeholder story appears or existing story is preserved according to docs.
21. Confirm placeholder sentence count matches Setup sentence count.
22. Save the lesson.
23. Refresh the browser.
24. Open the saved lesson.
25. Confirm Setup fields and Story placeholder are restored.
26. Clear one required Setup field.
27. Confirm Setup completed indicator is removed.
28. Confirm save/open/duplicate still works.

## Backend Review Checks

Backend validation should preserve Phase 3 behavior while supporting Phase 4 shape safety.

Verify:

- `GET /api/health` still works.
- `GET /api/projects` still works.
- Incomplete Setup drafts can save.
- Invalid enum values such as bad learner levels or bad sentence counts are rejected or normalized safely.
- Project route errors remain JSON.
- No backend story generation route was added.

Do not require backend validation to enforce all story-entry required fields. Story-entry gating can remain frontend-visible so users can save incomplete drafts.

## Scope-Control Review

Flag findings if Phase 4 adds:

- OpenAI SDK or API calls.
- `/api/story/generate`.
- Real AI story generation.
- Character extraction.
- Scene planning API.
- Image generation route.
- Audio scripts.
- Video prompts.
- ZIP export.
- PowerPoint or worksheet generation.
- Firebase.
- Hosted auth.
- User accounts.
- Cloud sync.

Local placeholder story creation is acceptable only if it is clearly named as placeholder behavior and does not call external services.

## Code Review Focus

Prioritize findings in these areas:

- Generate Story can bypass Setup validation.
- Sidebar navigation can bypass Setup gating for Story or later stages if the product intended gating globally.
- Required field validation is scattered or duplicated inconsistently.
- Errors are not mapped to the right field.
- New blank lesson shows an overwhelming wall of errors.
- Optional fields incorrectly block story entry.
- Setup completed indicator uses stale partial checks instead of validation readiness.
- Placeholder story generation overwrites manual story text unexpectedly.
- Placeholder story does not respect sentence count.
- Placeholder story is mislabeled as AI generation.
- Incomplete Setup drafts cannot be saved.
- Save/open loses Setup field values.
- CEFR labels appear in user-facing UI.
- Forbidden character detail fields were added.
- Milestone 2+ scope slipped in.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```md
# Phase 4 Review

## Findings

- [P0/P1/P2/P3] Title
  - File/path:
  - Evidence:
  - Why it matters:
  - Recommended fix:

## Acceptance Summary

- Setup data binding:
- Required/optional validation:
- Inline errors:
- Story gate:
- Placeholder story:
- Persistence:
- Completed-stage behavior:
- Regression checks:
- Scope control:

## Open Questions

- ...

## Verdict

Pass/Fail with a one-paragraph explanation.
```

If there are no findings, say so clearly and include any residual risks or checks that could not be performed, such as inability to run the full browser workflow.

## Severity Guidance

- P0: Phase 4 cannot run or cannot be meaningfully reviewed, for example frontend startup fails completely.
- P1: Major Phase 4 requirement missing or broken, for example Generate Story bypasses required fields, Setup data does not persist, or learner levels violate product rules.
- P2: Important validation, UX, persistence or scope issue, for example optional fields block story entry, errors are confusing, placeholder story overwrites user work, or completed indicator is wrong.
- P3: Minor clarity, naming, documentation or polish issue.

## Non-Goals For This Review

Do not fail Phase 4 because it lacks:

- Real OpenAI story generation.
- Backend story generation endpoint.
- Character extraction from locked story.
- Scene planning API.
- Real character images.
- Real scene images.
- Audio/video prompt generation.
- ZIP lesson source pack export.
- PowerPoint or worksheet generation.
- Accounts or cloud sync.

Those belong to later milestones.
