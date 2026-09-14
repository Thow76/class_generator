# Phase 2 Review Prompt

Use this prompt to review whether Milestone 1, Phase 2 of Lesson Source Builder was implemented correctly. The review should verify the lesson data-model refactor only.

## Prompt

You are reviewing Milestone 1, Phase 2 of the Lesson Source Builder implementation.

Your job is to verify that Phase 1's local app shell has been refactored so one normalized, serializable lesson object is the single source of truth for the UI. The app should still behave like the Phase 1 shell, but stage rendering and updates should now flow through the lesson object rather than hard-coded sample data or isolated per-component state.

Review Phase 2 only. Do not require Phase 3 persistence, New/Open/Duplicate Lesson, backend project CRUD, OpenAI integration, real image generation, media generation, or ZIP export.

## Phase 2 Goal

Replace hard-coded sample data with a real lesson object.

The implementation is correct only if:

- A clear lesson schema exists.
- A lesson factory or initializer exists.
- Demo/seed data conforms to the schema.
- One top-level lesson object drives Setup, Story, Characters, Scenes, Media and Export.
- Stage navigation uses `lesson.currentStage`.
- Story sentences, characters and scenes have stable IDs.
- Scene records reference story sentence IDs.
- Character and scene approval, generation and stale states live in the lesson object.
- Media and Export derive their display state from the lesson object.
- Phase 1 behavior still works after the refactor.
- No Phase 3+ persistence or later AI/export scope was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-2-implementation-prompt.md
docs/phase-2-data-model.md
frontend/src/data/lessonSchema.js
frontend/src/data/createLesson.js
frontend/src/data/demoLesson.js
frontend/src/data/constants.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/validateLessonShape.js
frontend/src/App.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/CharactersStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/stages/ExportStage.jsx
server/src/routes/health.js
server/src/index.js
```

File names may differ, but the implementation should clearly separate:

- Data constants.
- Lesson schema.
- Lesson creation/initialization.
- Demo seed data.
- Lesson update helpers.
- Lesson selectors/derived state.
- Lightweight schema validation.
- Stage UI components.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
find frontend/src -maxdepth 3 -type f | sort
npm run dev
npm run dev:frontend
npm run dev:server
curl -s http://127.0.0.1:3001/api/health
rg "currentStage|demoLesson|createEmptyLesson|validateLessonShape|generationStatus|approved|stale|sentenceIds|characterIds" frontend/src
rg "phase-1-demo|Marta|Doctor|Receptionist|doctor's surgery" frontend/src
rg "localStorage|sessionStorage|fs\\.|writeFile|readFile|/api/projects|OpenAI|openai|zip|firebase|auth|login|account" frontend server package.json
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
```

Expected development URLs:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Prototype reference, if needed: http://127.0.0.1:4173/
```

## Review Steps

1. Inspect the repository structure.
2. Read `docs/phase-2-implementation-prompt.md`.
3. Read `docs/phase-2-data-model.md`.
4. Inspect `frontend/src/data/lessonSchema.js`.
5. Confirm the schema documents all required Phase 2 sections:
   - Lesson
   - Setup data
   - Story
   - Story sentence
   - Character record
   - Scene record
   - Reusable values
   - Media metadata
   - Export metadata
6. Inspect `frontend/src/data/createLesson.js`.
7. Confirm a new empty lesson can be initialized with a complete default shape.
8. Inspect `frontend/src/data/demoLesson.js`.
9. Confirm demo data conforms to the same schema and is isolated as seed/demo data.
10. Inspect `frontend/src/App.jsx`.
11. Confirm the top-level React state stores one lesson object.
12. Confirm stage navigation reads from and writes to `lesson.currentStage`.
13. Confirm the app does not keep a separate competing `currentStage` source of truth.
14. Inspect `frontend/src/utils/lessonUpdates.js`.
15. Confirm update helpers use stable IDs for sentences, characters and scenes.
16. Inspect `frontend/src/utils/lessonSelectors.js`.
17. Confirm completed-stage and media/export derived state comes from the lesson object.
18. Inspect `frontend/src/utils/validateLessonShape.js`.
19. Confirm it checks at least the demo lesson's required shape and references.
20. Inspect each stage component.
21. Confirm stage components render from props derived from the lesson object, not hard-coded lesson-specific data.
22. Start the app and verify Phase 1 behavior still works.
23. Exercise Setup edits, Story edits, lock/unlock, dummy character flow, dummy scene flow, Media filters and Export summary.
24. Search for accidental Phase 3+ scope such as file-system persistence, `/api/projects`, localStorage or project CRUD.
25. Search for accidental OpenAI/image/export/cloud/auth scope.
26. Search for imports from `prototype/support.js`.

## Acceptance Checklist

Mark each item Pass, Fail, or Not Applicable.

| Item | Result | Evidence |
| --- | --- | --- |
| Lesson schema exists |  |  |
| Schema documents top-level lesson fields |  |  |
| Schema documents setup fields |  |  |
| Schema documents story and story sentence records |  |  |
| Schema documents character records |  |  |
| Schema documents scene records |  |  |
| Schema documents reusable values |  |  |
| Schema documents media/export metadata |  |  |
| Lesson factory or initializer exists |  |  |
| Empty lesson initializer produces complete object shape |  |  |
| Demo lesson conforms to Phase 2 schema |  |  |
| Demo data is isolated from stage components |  |  |
| One top-level lesson object drives app state |  |  |
| `lesson.currentStage` is navigation source of truth |  |  |
| No separate competing `currentStage` state remains |  |  |
| Setup stage renders from lesson data |  |  |
| Setup edits update the lesson object |  |  |
| Story stage renders from `lesson.story` |  |  |
| Story edits update sentence records by stable ID |  |  |
| Story lock updates `lesson.story.status` |  |  |
| Story lock records `lesson.story.lockedAt` |  |  |
| Story unlock updates `lesson.story.status` without deleting downstream data |  |  |
| Story changes after downstream output mark stale/potentially stale state |  |  |
| Characters render from `lesson.characters` |  |  |
| Character updates use stable character IDs |  |  |
| Character generation state lives in each character record |  |  |
| Character approval state lives in each character record |  |  |
| Character stale state lives in each character record |  |  |
| Reusable backgrounds live in the lesson object |  |  |
| Reusable note tags live in the lesson object |  |  |
| Scenes render from `lesson.scenes` |  |  |
| Scene updates use stable scene IDs |  |  |
| Scene `sentenceIds` reference existing story sentences |  |  |
| Scene `characterIds`, if present, reference existing characters |  |  |
| Scene generation state lives in each scene record |  |  |
| Scene approval state lives in each scene record |  |  |
| Scene stale state lives in each scene record |  |  |
| Media items derive from characters/scenes or avoid duplicate approval state |  |  |
| Media filter works after the refactor |  |  |
| Export summary derives from lesson data |  |  |
| Export action remains placeholder only |  |  |
| Lightweight validation/schema guard exists |  |  |
| Validation checks scene sentence references |  |  |
| Validation checks approved learner levels |  |  |
| Learner level list remains service-specific only |  |  |
| No CEFR labels appear in the main UI |  |  |
| Character fields remain lightweight |  |  |
| No forbidden character fields were added |  |  |
| Backend health endpoint still works |  |  |
| Frontend still starts locally |  |  |
| No file-system persistence was added |  |  |
| No New/Open/Duplicate lesson behavior was added |  |  |
| No `/api/projects` CRUD routes were added |  |  |
| No OpenAI integration was added |  |  |
| No image generation route or package was added |  |  |
| No ZIP export was added |  |  |
| Production frontend does not import `prototype/support.js` |  |  |

## Data Model Checks

### Required Top-Level Lesson Fields

Confirm the lesson object includes:

```text
id
theme
title
learnerLevel
setting
scenario
sentenceCount
setup
story
characters
scenes
reusable
media
export
currentStage
```

### Required Setup Fields

Confirm setup data includes:

```text
setup.mainCharacter.name
setup.mainCharacter.age
setup.mainCharacter.sex
setup.mainCharacter.background
setup.secondaryCharacters
setup.targetVocabulary
setup.additionalNotes
```

If the implementation uses `gender` instead of `sex`, verify it is consistent across schema, data, UI and update helpers. Prefer consistency over a partial rename.

### Required Story Fields

Confirm story data includes:

```text
story.status
story.sentences
story.lockedAt
story.modifiedAfterLock
```

Each sentence should include:

```text
id
number
text
stale
```

`number` may be explicitly stored or consistently derived, but ordering must be stable and reviewable.

### Required Character Fields

Confirm each character includes:

```text
id
name
role
age
sex
background
notes
generationStatus
imagePath
approved
stale
```

If the implementation keeps a legacy `status` field instead of `generationStatus`, verify it is documented, consistent and does not split approval state across multiple conflicting fields.

### Required Scene Fields

Confirm each scene includes:

```text
id
number
label
sentenceIds
location
description
characterIds
imageMode
reuseSceneId
generationStatus
imagePath
approved
stale
```

If any field is absent, decide whether it is a genuine Phase 2 gap or an intentional simplification documented for Phase 3.

## Functional Review Checklist

Run the app and verify:

- The frontend opens directly into the workflow.
- Sidebar navigation still works.
- Active stage follows `lesson.currentStage`.
- Completed-stage indicators still work.
- Setup fields are editable.
- Secondary character tags still add/remove.
- Story sentences render correctly.
- Inline story editing still works.
- Dummy sentence regenerate still works.
- Dummy sentence shorten still works.
- Story lock confirmation still appears.
- Confirming lock disables editing.
- Unlocking is deliberate.
- Character backgrounds still add/reuse.
- Character Notes tags still add/remove.
- Dummy Generate Character still changes visible state.
- Dummy Use This Character still approves the card.
- Scene location editing still works.
- Dummy Generate Scene still changes visible state.
- Dummy Use This Scene still approves the card.
- Media filters still work.
- Export counts update when approvals change.

## Hard-Coded Data Review

Demo lesson content may still include the Phase 1 doctor/Marta example, but only in seed/demo files.

Flag as findings if lesson-specific demo text appears in:

- Stage components.
- Shared UI components.
- Selectors in a way that encodes business logic for only the demo lesson.
- Update helpers in a way that depends on specific names or IDs.

Acceptable places for demo content:

- `frontend/src/data/demoLesson.js`
- `frontend/src/data/sampleLesson.js`, if it is only a compatibility re-export or clearly documented seed data.

## Scope-Control Review

Phase 2 should not implement Phase 3 or later work.

Flag as findings if the implementation adds:

- File-system project persistence.
- Browser localStorage/sessionStorage persistence for project state.
- New Lesson.
- Open Existing Lesson.
- Duplicate Previous Lesson.
- Backend `/api/projects` CRUD routes.
- OpenAI SDK or OpenAI API calls.
- Story generation endpoints.
- Character extraction endpoints.
- Scene planning endpoints.
- Image generation endpoints.
- ZIP export.
- Audio/video source generation.
- Firebase, auth, accounts or cloud sync.

Small placeholders in metadata, buttons or docs are acceptable if they do not perform real later-phase work.

## Product Constraints To Verify

### Learner Levels

The app must show only:

- Literacies Plus
- Complete Beginner
- Beginner 1
- Beginner 1.5
- Beginner 2

No CEFR labels such as A1, A2 or B1 should appear in the main UI.

### Character Fields

Character inputs must remain limited to:

- Name
- Age or age range
- Sex or gender
- Background or nationality
- Optional reusable Notes tags

The app must not add dedicated character fields for:

- Hair
- Clothing
- Build
- Personality
- Expression
- Visual style

### Story Authority

Verify that story state is represented so later phases can treat locked sentences as authoritative:

- `draft` and `locked` states are explicit.
- `lockedAt` is stored.
- `modifiedAfterLock` is stored.
- Downstream stale state is represented in characters/scenes.
- Unlocking or changing story text does not delete downstream records.

## Code Review Focus

Prioritize findings in these areas:

- Multiple competing sources of truth for the lesson state.
- Stage components owning hidden copies of story, character or scene data.
- Hard-coded demo lesson content outside demo/seed files.
- Updates by array index where stable ID updates are required.
- Scene sentence references that can break when story order changes.
- Media/export duplicating approval state instead of deriving from lesson records.
- Inconsistent `sex`/`gender`, `status`/`generationStatus`, or `approved` modeling.
- Lesson object containing unserializable values.
- Phase 3+ scope accidentally added.
- Regressions to Phase 1 shell behavior.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```md
# Phase 2 Review

## Findings

- [P0/P1/P2/P3] Title
  - File/path:
  - Evidence:
  - Why it matters:
  - Recommended fix:

## Acceptance Summary

- Single lesson object:
- Schema/factory/demo data:
- Stage rendering from lesson:
- Stable IDs and references:
- Media/export derivation:
- Phase 1 behavior preserved:
- Phase 2 scope control:

## Open Questions

- ...

## Verdict

Pass/Fail with a one-paragraph explanation.
```

If there are no findings, say so clearly and include any residual risks or checks that could not be performed, such as inability to run the app or inspect the browser manually.

## Severity Guidance

- P0: Phase 2 cannot run or cannot be meaningfully reviewed, for example the frontend fails to start.
- P1: Major Phase 2 requirement missing or broken, for example no single lesson object, no schema/factory, stage navigation does not work, or scene references are invalid.
- P2: Important data-model, product or migration issue, for example duplicate sources of truth, hard-coded demo data in stages, inconsistent status fields, or accidental Phase 3 scope.
- P3: Minor clarity, naming, documentation or polish issue.

## Non-Goals For This Review

Do not fail Phase 2 because it lacks:

- Real project save/open/duplicate.
- Auto-save.
- Backend project CRUD routes.
- OpenAI story generation.
- Character extraction from a locked story.
- Scene planning API.
- Real character images.
- Real scene images.
- Audio/video prompts.
- ZIP export.

Those belong to later phases.
