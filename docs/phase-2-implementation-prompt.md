# Phase 2 Implementation Prompt

Use this prompt to implement Milestone 1, Phase 2 of Lesson Source Builder.

## Prompt

You are implementing Milestone 1, Phase 2 of Lesson Source Builder.

Phase 0 froze the approved prototype. Phase 1 created the real React/Vite frontend and Node/Express backend shell with local simulated interactions. Phase 2 must now replace hard-coded sample/demo data with one normalized lesson/project object that acts as the single source of truth for the whole UI.

Implement Phase 2 only. Do not add Phase 3 persistence, local project save/open/duplicate, OpenAI integration, image generation, ZIP export or downstream media generation.

## Phase 2 Goal

Remove hard-coded doctor/Marta data from the stage components and make all screens render from one lesson/project object.

Done means:

- The app has a clear lesson schema.
- A single lesson object drives Setup, Story, Characters, Scenes, Media and Export.
- Stage components receive lesson data and update it through explicit handlers.
- IDs are stable for story sentences, characters and scenes.
- Demo data, if still present, is isolated as seed data only.
- Loading one lesson object in memory can recreate the full current project state.

## Phase 2 Scope

Build:

- A normalized lesson/project schema.
- A lesson factory or initializer.
- A centralized demo lesson object that conforms to the Phase 2 schema.
- Refactored frontend state so the app uses `lesson.currentStage` rather than a separate unrelated current-stage state.
- Refactored stage components so they render from the lesson object.
- Explicit update helpers for Setup, Story, Characters, Scenes, Media and stage navigation.
- Character records with stable IDs and required metadata.
- Scene records with stable IDs and sentence references.
- Media/export metadata placeholders.
- Optional developer-only schema checks or tests if practical.

Do not build:

- File-system persistence.
- Auto-save.
- New Lesson.
- Open Existing Lesson.
- Duplicate Previous Lesson.
- Backend project CRUD routes.
- OpenAI story generation.
- Character extraction.
- Scene planning API.
- Real image generation.
- Real audio/video source generation.
- ZIP export.

## Current Starting Point

The Phase 1 implementation currently includes:

```text
frontend/src/App.jsx
frontend/src/data/sampleLesson.js
frontend/src/stages/SetupStage.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/CharactersStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/stages/ExportStage.jsx
frontend/src/components/
server/src/index.js
server/src/routes/health.js
```

Phase 1 has local sample data and UI state. Phase 2 should preserve the existing UI and interactions while changing the underlying data model.

## Product Rules To Preserve

### Learner Levels

The app must use only these learner levels:

- Literacies Plus
- Complete Beginner
- Beginner 1
- Beginner 1.5
- Beginner 2

Do not add CEFR labels such as A1, A2 or B1 in the main UI.

### Character Inputs

Character input must remain lightweight:

- Name
- Age or age range
- Sex or gender
- Background or nationality
- Optional reusable Notes tags

Do not add dedicated character fields for:

- Hair
- Clothing
- Build
- Personality
- Expression
- Visual style

### Story Rules

- Story must have explicit Draft and Locked states.
- Once locked, downstream stages should use the exact locked sentences.
- If a locked story is later changed, downstream data should be marked stale or potentially stale.
- Phase 2 can keep Phase 1 dummy stale behavior, but it should be represented in the lesson object.

## Target Lesson Schema

Create a lesson object close to this shape:

```json
{
  "id": "lesson-001",
  "theme": "",
  "title": "",
  "learnerLevel": "Literacies Plus",
  "setting": "",
  "scenario": "",
  "sentenceCount": 9,
  "setup": {
    "mainCharacter": {
      "name": "",
      "age": "",
      "sex": "",
      "background": ""
    },
    "secondaryCharacters": [],
    "targetVocabulary": "",
    "additionalNotes": ""
  },
  "story": {
    "status": "draft",
    "sentences": [],
    "lockedAt": null,
    "modifiedAfterLock": false
  },
  "characters": [],
  "scenes": [],
  "reusable": {
    "backgrounds": [],
    "noteTags": []
  },
  "media": {
    "filter": "All",
    "items": []
  },
  "export": {
    "lastExportedAt": null,
    "lastExportPath": null
  },
  "currentStage": "setup"
}
```

You may adjust property names if the existing code strongly favors another local convention, but keep the model coherent and documented.

## Required Record Shapes

### Story Sentence

Each story sentence should include:

```json
{
  "id": "sentence-1",
  "number": 1,
  "text": "Marta goes to the doctor's surgery.",
  "stale": false
}
```

Requirements:

- IDs must be stable.
- Number/order must be explicit or derivable consistently.
- Text must live in the lesson object.
- No stage component should own its own independent sentence list.

### Character Record

Each character should include:

```json
{
  "id": "character-marta",
  "name": "Marta",
  "role": "main",
  "age": "34",
  "sex": "Woman",
  "background": "Polish",
  "notes": ["same outfit each image", "clear face"],
  "generationStatus": "not_started",
  "imagePath": null,
  "approved": false,
  "stale": false
}
```

Requirements:

- Use `sex` or `gender` consistently. Prefer `sex` if aligning with the original plan.
- Keep lightweight fields only.
- Include an image path placeholder, but do not generate images.
- Include approved state.
- Include stale state.
- Include generation status for dummy Phase 1 actions.

Suggested generation statuses:

- `not_started`
- `generated`
- `approved`

### Scene Record

Each scene should include:

```json
{
  "id": "scene-1",
  "number": 1,
  "label": "Scene 1",
  "sentenceIds": ["sentence-1", "sentence-2"],
  "location": "Reception desk",
  "description": "",
  "characterIds": ["character-marta", "character-receptionist"],
  "imageMode": "generate",
  "reuseSceneId": null,
  "generationStatus": "not_started",
  "imagePath": null,
  "approved": false,
  "stale": false
}
```

Requirements:

- Scene records must reference story sentences by stable sentence ID.
- Scene records should reference characters by stable character ID where practical.
- Reuse/new-image choice should be represented in the object.
- Image path placeholder should exist, but no images should be generated.
- Approved and stale states should live in the lesson object.

### Media Metadata

Media can be minimal in Phase 2:

```json
{
  "filter": "All",
  "items": []
}
```

The Media stage may still derive display items from `lesson.characters` and `lesson.scenes` rather than storing duplicate media items. If deriving items, document that choice near the selector/helper.

### Export Metadata

Export can be minimal in Phase 2:

```json
{
  "lastExportedAt": null,
  "lastExportPath": null
}
```

Do not implement real export.

## Recommended Files To Add Or Update

### Add

Recommended new files:

```text
frontend/src/data/lessonSchema.js
frontend/src/data/createLesson.js
frontend/src/data/demoLesson.js
frontend/src/utils/lessonUpdates.js
```

Use fewer files if the codebase is still small, but keep schema, seed data and update helpers easy to find.

### Update

Likely files to update:

```text
frontend/src/App.jsx
frontend/src/data/sampleLesson.js
frontend/src/stages/SetupStage.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/CharactersStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/stages/ExportStage.jsx
frontend/src/components/Sidebar.jsx
```

`sampleLesson.js` may be replaced by `demoLesson.js`, or kept as a compatibility export if that reduces churn.

## Implementation Steps

## Step 1: Define The Phase 2 Schema

Create a clear in-code schema source.

Options:

- JSDoc typedefs in `frontend/src/data/lessonSchema.js`.
- TypeScript types if the project has already moved to TypeScript.
- Plain documented object factories if keeping JavaScript simple.

Minimum typedefs or documented shapes:

- `Lesson`
- `SetupData`
- `Story`
- `StorySentence`
- `CharacterRecord`
- `SceneRecord`
- `ReusableValues`
- `MediaMetadata`
- `ExportMetadata`

Acceptance:

- A developer can find the full lesson shape in one place.
- Required fields are documented.
- The schema reflects Phase 2 needs without adding later implementation details.

## Step 2: Create A Lesson Factory

Create a factory such as:

```js
export function createEmptyLesson(overrides = {}) {
  return {
    id: "lesson-001",
    theme: "",
    title: "",
    learnerLevel: "Literacies Plus",
    setting: "",
    scenario: "",
    sentenceCount: 9,
    setup: {
      mainCharacter: {
        name: "",
        age: "",
        sex: "",
        background: ""
      },
      secondaryCharacters: [],
      targetVocabulary: "",
      additionalNotes: ""
    },
    story: {
      status: "draft",
      sentences: [],
      lockedAt: null,
      modifiedAfterLock: false
    },
    characters: [],
    scenes: [],
    reusable: {
      backgrounds: [],
      noteTags: []
    },
    media: {
      filter: "All",
      items: []
    },
    export: {
      lastExportedAt: null,
      lastExportPath: null
    },
    currentStage: "setup",
    ...overrides
  };
}
```

If nested overrides are needed, add a small merge helper rather than scattering object literals throughout the app.

Acceptance:

- New lesson objects can be initialized consistently.
- Demo data uses the same factory or exact same schema.
- No stage component creates its own incompatible lesson shape.

## Step 3: Convert Phase 1 Sample Data Into Demo Lesson Data

Replace the current Phase 1 sample object with one demo lesson object that fully conforms to the schema.

Move or rename:

```text
frontend/src/data/sampleLesson.js
```

to something like:

```text
frontend/src/data/demoLesson.js
```

The demo lesson may still use the current doctor/Marta example, but it must be isolated as seed data only.

Acceptance:

- Demo lesson is clearly named as demo/seed data.
- Story, characters and scenes all use stable IDs.
- Character and scene records conform to the Phase 2 schema.
- No stage component contains hard-coded Marta/doctor story records.

## Step 4: Make `lesson.currentStage` The Navigation Source

Remove separate unrelated navigation state if present.

Current Phase 1 uses a local state pattern like:

```js
const [lesson, setLesson] = useState(initialLesson);
const [currentStage, setCurrentStage] = useState("setup");
```

Refactor so the current stage is read from:

```js
lesson.currentStage
```

Add a handler such as:

```js
function setCurrentStage(stageId) {
  setLesson((current) => ({
    ...current,
    currentStage: stageId
  }));
}
```

Acceptance:

- Current stage lives in the lesson object.
- Sidebar and stage rendering use `lesson.currentStage`.
- Changing stages updates the lesson object.
- There is no duplicate source of truth for current stage.

## Step 5: Refactor Setup Data Into The Lesson Object

Make the Setup stage read and write only through the lesson object.

Map fields as follows:

- Theme -> `lesson.theme`
- Lesson title -> `lesson.title`
- Learner level -> `lesson.learnerLevel`
- Setting -> `lesson.setting`
- Main situation/scenario -> `lesson.scenario`
- Main character name -> `lesson.setup.mainCharacter.name`
- Age/age range -> `lesson.setup.mainCharacter.age`
- Sex/gender -> `lesson.setup.mainCharacter.sex`
- Background/nationality -> `lesson.setup.mainCharacter.background`
- Secondary characters -> `lesson.setup.secondaryCharacters`
- Story sentence count -> `lesson.sentenceCount`
- Target vocabulary -> `lesson.setup.targetVocabulary`
- Additional notes -> `lesson.setup.additionalNotes`

Acceptance:

- Setup fields render from the lesson object.
- Editing any Setup field updates the lesson object.
- Learner levels remain restricted to the approved list.
- Secondary characters live under `lesson.setup.secondaryCharacters`.

## Step 6: Refactor Story Data Into The Lesson Object

Make Story stage render from:

```js
lesson.story
lesson.story.sentences
```

Implement or preserve handlers:

- Update sentence text.
- Dummy regenerate one sentence.
- Dummy shorten one sentence.
- Lock story.
- Unlock story.
- Mark downstream data stale when story changes after downstream output exists.

When locking:

- Set `lesson.story.status` to `locked`.
- Set `lesson.story.lockedAt` to an ISO timestamp.
- Leave `lesson.story.sentences` unchanged.

When unlocking:

- Set `lesson.story.status` to `draft`.
- Do not clear `lockedAt` unless there is a clear reason.
- Do not delete downstream records.

Acceptance:

- Story status lives in the lesson object.
- Sentences live in the lesson object.
- Lock/unlock state persists in memory as part of the lesson.
- Dummy controls update sentence objects in the lesson.
- Downstream stale markers live on character/scene records.

## Step 7: Refactor Character Data Into The Lesson Object

Update character rendering and handlers to use:

```js
lesson.characters
lesson.reusable.backgrounds
lesson.reusable.noteTags
```

Replace old fields if needed:

- `status` -> `generationStatus` plus `approved`, or keep `status` only if it is documented and consistent.
- `gender` -> `sex`, or keep `gender` only if used consistently.
- `backgrounds` -> `reusable.backgrounds`.
- `noteOptions` -> `reusable.noteTags`.

Recommended behavior:

- Dummy Generate Character sets `generationStatus` to `generated` and `approved` to `false`.
- Dummy Regenerate increments a generation count only if already present or useful; do not add complexity if unnecessary.
- Use This Character sets `generationStatus` to `approved` and `approved` to `true`.
- Editing character fields updates the matching character record by ID.
- Adding a background adds to `lesson.reusable.backgrounds`.
- Adding a note tag adds to both the character and reusable tags where appropriate.

Acceptance:

- Characters render from `lesson.characters`.
- Character fields are updated by stable character ID.
- Background reuse values live in `lesson.reusable.backgrounds`.
- Notes tag options live in `lesson.reusable.noteTags`.
- Approved state lives on each character record.
- No forbidden character fields are introduced.

## Step 8: Refactor Scene Data Into The Lesson Object

Update scene rendering and handlers to use:

```js
lesson.scenes
lesson.story.sentences
lesson.characters
```

Scene cards should:

- Render scene label/number from the scene record.
- Render covered sentences by looking up `scene.sentenceIds` in `lesson.story.sentences`.
- Render character references from `scene.characterIds` where present.
- Allow location edits to update the scene record.
- Preserve image mode, for example `generate` or `reuse`.
- Store approval and stale states on the scene record.

Recommended behavior:

- Dummy Generate Scene sets `generationStatus` to `generated` and `approved` to `false`.
- Dummy Regenerate keeps the same stable scene ID.
- Use This Scene sets `generationStatus` to `approved` and `approved` to `true`.

Acceptance:

- Scenes render from `lesson.scenes`.
- Covered sentence text is derived through stable sentence IDs.
- Scene updates happen by stable scene ID.
- Scene image mode is represented in the lesson object.
- Approved state lives on each scene record.

## Step 9: Refactor Media To Derive From Lesson Data

Media stage should render from the lesson object.

Preferred approach:

- Store UI filter in `lesson.media.filter` or in local UI-only state if documented.
- Derive visible media review items from `lesson.characters` and `lesson.scenes`.
- Avoid duplicating character/scene approval state into separate media records.

Derived media item shape can be local to a selector/helper:

```js
{
  id: "character-marta",
  kind: "Character",
  title: "Marta",
  approved: true,
  stale: false,
  imagePath: null
}
```

Acceptance:

- Media items reflect current character and scene states.
- Changing a character or scene approval state updates Media automatically.
- The All/Characters/Scenes filter still works.
- No independent duplicate approval state is introduced.

## Step 10: Refactor Export To Summarize Lesson Data

Export stage should summarize from the lesson object.

Use:

- `lesson.title`
- `lesson.learnerLevel`
- `lesson.story.status`
- `lesson.story.sentences.length`
- Approved character count from `lesson.characters`
- Approved scene count from `lesson.scenes`
- `lesson.export` metadata placeholders

Acceptance:

- Export counts update when local story/character/scene state changes.
- Export action remains placeholder only.
- No real ZIP or file export is implemented.

## Step 11: Centralize Lesson Update Helpers

Avoid scattering ad hoc nested object updates everywhere.

Create small helpers where helpful, for example:

```js
updateLessonField(lesson, field, value)
updateSetupField(lesson, path, value)
updateSentence(lesson, sentenceId, patch)
updateCharacter(lesson, characterId, patch)
updateScene(lesson, sceneId, patch)
markDownstreamStale(lesson)
```

In React, these may be implemented as local handler functions in `App.jsx` for now, but keep them clear enough to move into utilities later.

Acceptance:

- Updates are explicit and easy to audit.
- Nested updates preserve unrelated lesson data.
- Character and scene updates use stable IDs, not array indexes.
- Sentence updates use stable IDs, not array indexes.

## Step 12: Add Lightweight Schema Guards

Add lightweight checks if practical.

Options:

- A `validateLessonShape` helper used in development.
- A small script that imports the demo lesson and verifies required fields.
- Unit tests if the project already has a test runner.

Minimum checks:

- Lesson has `id`.
- Lesson has `currentStage`.
- Learner level is one of the approved values.
- Story status is `draft` or `locked`.
- Every sentence has `id` and `text`.
- Every character has `id` and `name`.
- Every scene has `id` and `sentenceIds`.
- Scene `sentenceIds` reference existing story sentence IDs.

Acceptance:

- There is some way to catch malformed demo lesson data.
- Checks do not block normal app use in production.

## Step 13: Preserve Phase 1 UI Behavior

After refactoring, manually verify that Phase 1 behavior still works:

- App starts.
- Backend health check still works.
- Six stages render.
- Stage navigation works.
- Setup fields edit.
- Story edit works.
- Story lock/unlock works.
- Character dummy generate/approve works.
- Scene dummy generate/approve works.
- Media filters work.
- Export summary updates.

Acceptance:

- Phase 2 changes do not regress Phase 1 user-visible behavior.
- Visual styling remains aligned with the frozen prototype.

## Step 14: Update Documentation

Update docs minimally so the next phase can continue from the new data model.

Recommended updates:

- Add a short `docs/phase-2-data-model.md`, or add a Phase 2 section to an existing docs file.
- Document the final lesson object shape.
- Document which fields are persisted later in Phase 3.
- Document that Phase 2 is still in-memory only.
- Document that demo data is seed data, not business logic.

Acceptance:

- The data model is understandable without reverse-engineering the components.
- Phase 3 implementer can see where persistence should attach.

## Suggested Final File Structure

After Phase 2, aim for something like:

```text
frontend/src/
  App.jsx
  main.jsx
  styles.css
  data/
    demoLesson.js
    lessonSchema.js
    createLesson.js
    constants.js
  utils/
    lessonSelectors.js
    lessonUpdates.js
    validateLessonShape.js
  components/
    AppShell.jsx
    Sidebar.jsx
    StageHeader.jsx
    StatusBadge.jsx
    Icon.jsx
  stages/
    SetupStage.jsx
    StoryStage.jsx
    CharactersStage.jsx
    ScenesStage.jsx
    MediaStage.jsx
    ExportStage.jsx
```

Do not over-abstract if the app is still small. The important part is that the lesson object is coherent and centralized.

## Manual QA Checklist

### Startup

- `npm run dev` starts frontend and backend.
- `GET /api/health` still returns JSON.
- Frontend still shows API connected/unavailable state correctly.

### Data Model

- One top-level lesson object exists.
- The lesson object includes `id`.
- The lesson object includes `currentStage`.
- The lesson object includes top-level setup summary fields.
- Main character setup data is represented.
- Secondary characters are represented.
- Story state is represented.
- Character records are represented.
- Scene records are represented.
- Reusable backgrounds and note tags are represented.
- Media/export metadata placeholders are represented.

### Rendering

- Setup renders from lesson data.
- Story renders from lesson data.
- Characters render from lesson data.
- Scenes render from lesson data.
- Media renders from lesson data or derived selectors.
- Export summarizes lesson data.

### Updates

- Editing Setup updates the lesson object.
- Changing stage updates `lesson.currentStage`.
- Editing a story sentence updates the matching sentence by ID.
- Locking story updates `lesson.story.status`.
- Unlocking story updates `lesson.story.status`.
- Character edits update the matching character by ID.
- Character background reuse updates reusable lesson values.
- Character Notes tags update character and reusable values.
- Scene edits update the matching scene by ID.
- Dummy approval states update the matching character/scene records.

### References

- Scene `sentenceIds` resolve to existing story sentences.
- Scene `characterIds`, if present, resolve to existing characters.
- No UI relies on array index as durable record identity.
- IDs do not change during dummy regenerate/approve actions.

### Scope Control

- No file-system save/open/duplicate was added.
- No `/api/projects` CRUD routes were added.
- No OpenAI package or API route was added.
- No image generation route was added.
- No ZIP export was added.
- No Firebase/auth/cloud sync was added.

## Phase 2 Done Criteria

Phase 2 is complete when:

- A single lesson object is the source of truth for the app state.
- All six stages render from that lesson object.
- Stage navigation uses `lesson.currentStage`.
- Story, character and scene records use stable IDs.
- Character and scene approvals live in the lesson object.
- Stale markers live in the lesson object.
- Media and Export reflect lesson data rather than independent duplicate sample state.
- Demo data is isolated and conforms to the same schema.
- Phase 1 UI behavior still works.
- No Phase 3+ scope has been introduced.

## Verification Commands

Run the commands that are available in the project:

```sh
npm run dev
npm run dev:frontend
npm run dev:server
curl -s http://127.0.0.1:3001/api/health
rg "phase-1-demo|Marta|Doctor|Receptionist|doctor's surgery" frontend/src
rg "localStorage|fs\\.|writeFile|readFile|/api/projects|OpenAI|openai|zip|firebase|auth" frontend server
```

Notes:

- Demo data may still contain Marta/Doctor text if isolated in one seed/demo file.
- Stage components should not contain hard-coded lesson-specific content.
- `fs` may appear only if already present for unrelated tooling; Phase 2 should not add persistence logic.

## Handoff To Phase 3

Phase 3 will make the Phase 2 lesson object persistent.

Before handing off, ensure:

- The full lesson object can be serialized with `JSON.stringify`.
- The serialized object contains enough data to recreate the current UI state.
- There are no functions, class instances, DOM nodes or unserializable values inside the lesson object.
- Demo-only UI state is separate from project state, or intentionally represented in the lesson object.
- A future backend `projects/:id` route can save and load this object without needing to reconstruct hidden frontend state.

## Implementation Response Format

When implementation is complete, respond with:

```md
## Summary

- ...

## Changed Files

- ...

## Verification

- ...

## Notes For Phase 3

- ...
```

Mention any tests or manual checks that could not be completed.
