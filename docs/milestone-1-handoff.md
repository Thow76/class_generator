# Lesson Source Builder: Milestone 1 Handoff

## Purpose

Milestone 1 turns the approved Lesson Source Builder prototype into a conventional local application shell with persistent lesson data. It covers Phases 0-4 only:

- Phase 0: Freeze the prototype
- Phase 1: Build the real application shell
- Phase 2: Replace sample data with a real lesson object
- Phase 3: Local save, open and duplicate
- Phase 4: Make Setup fully functional

Milestone 1 must not add OpenAI integration, image generation, PowerPoint generation, worksheet generation, accounts, cloud sync, Firebase, ElevenLabs, or video-platform APIs.

## Milestone Outcome

By the end of Milestone 1, the app should run locally with:

- A frozen copy of the approved prototype for visual and behavioral comparison.
- A React/Vite frontend and Node/Express backend.
- A backend health endpoint that the frontend can call.
- Six stages: Setup, Story, Characters, Scenes, Media and Export.
- Stage navigation with active and completed states.
- Story draft, edit, lock, unlock and warning behavior simulated locally.
- Character cards with lightweight fields and reusable Notes/background controls.
- Dummy character and scene generate/approve states.
- A single lesson JSON object as the app's source of truth.
- Local project folders with save, open and duplicate behavior.
- Fully bound Setup fields with validation.

The critical acceptance path for this milestone is:

1. Open the app.
2. Enter a Shopping lesson in Setup.
3. Move through the six stages.
4. Create or edit a draft story locally.
5. Lock the story.
6. Close and reopen the app.
7. Confirm the same locked story and project state are restored from disk.

## Product Rules To Preserve

- Use only these learner levels:
  - Literacies Plus
  - Complete Beginner
  - Beginner 1
  - Beginner 1.5
  - Beginner 2
- Do not introduce CEFR labels such as A1, A2 or B1 in the main UI.
- Story sentence cards should be wide enough on desktop for typical sentences to stay on one line where reasonable.
- Do not shrink story text merely to force one-line display.
- Character inputs must remain lightweight:
  - Name
  - Age/Age Range
  - Sex/Gender
  - Background/Nationality
  - Optional reusable Notes tags
- Do not add dedicated character fields for hair, clothing, build, personality, expression or visual style.
- Follow the product principle: minimum required input, sensible later defaults, optional user overrides.
- The story must have explicit Draft and Locked states.
- Once locked, downstream stages must treat the exact locked story sentences as authoritative.
- If a locked story is later changed, downstream outputs should be marked stale or potentially stale instead of silently remaining valid.

## Recommended Repository Shape

Use this structure unless an existing project structure requires a small adjustment:

```text
lesson-source-builder/
  prototype/
    lesson-source-builder.dc.html
    support.js
    screenshots/
  frontend/
  server/
  projects/
  docs/
    milestone-1-handoff.md
    approved-ui-rules.md
  .env.example
  .gitignore
  package.json
```

The supplied `.dc.html` prototype and `support.js` should be preserved as reference artifacts. Do not use `support.js` as the application foundation and do not edit it directly.

## Phase 0: Freeze The Prototype

### Goal

Preserve the approved design prototype before changing architecture so the rebuilt app can be compared against it at any time.

### Steps

1. Create `/prototype`.
2. Copy the approved `.dc.html` file into `/prototype`.
3. Copy the generated `support.js` file into `/prototype`.
4. Confirm the prototype opens locally without modification.
5. Capture screenshots for the approved states:
   - Setup
   - Story draft
   - Story locked
   - Characters
   - Scenes
   - Media
   - Export
6. Store screenshots in `/prototype/screenshots`.
7. Create `/docs/approved-ui-rules.md`.
8. Record visual and interaction decisions from the prototype:
   - Six-stage workflow order
   - Left navigation behavior
   - Active/completed stage indicators
   - Story edit, lock and unlock behavior
   - Character card structure
   - Reusable background and Notes tag behavior
   - Scene card structure
   - Media review layout
   - Export layout
   - Desktop story sentence width expectations
9. Mark the prototype as frozen in documentation.

### Implementation Notes

- The prototype is a visual and behavioral reference only.
- Do not refactor the prototype.
- Do not wire the production app to prototype runtime code.
- Do not edit `support.js`.

### Done When

- `/prototype` contains the approved `.dc.html` and `support.js`.
- The prototype still opens locally.
- Screenshots exist for the key screens and states.
- Approved UI and interaction rules are documented.

## Phase 1: Build The Real Application Shell

### Goal

Recreate the approved prototype in a conventional application structure without AI integration.

### Frontend Steps

1. Create a React/Vite frontend in `/frontend`.
2. Add the six stages:
   - Setup
   - Story
   - Characters
   - Scenes
   - Media
   - Export
3. Recreate the left navigation.
4. Implement active stage state.
5. Implement completed stage indicators.
6. Recreate the approved colors, typography, spacing, cards and buttons.
7. Preserve desktop-first layout behavior.
8. Make story sentence cards wide on desktop.
9. Add responsive behavior only where needed to avoid layout breakage.
10. Avoid adding a marketing landing page. The app should open directly into the workflow.

### Backend Steps

1. Create a Node/Express backend in `/server`.
2. Add a health endpoint, for example `GET /api/health`.
3. Return a simple JSON response from the health endpoint.
4. Configure local development ports for frontend and backend.
5. Add frontend-to-backend call for the health endpoint.
6. Keep backend structure ready for later API routes, but do not add OpenAI yet.

### Interaction Steps

1. Implement stage navigation.
2. Allow moving between stages.
3. Implement Story draft editing with local UI state.
4. Implement Lock Story confirmation.
5. On lock:
   - Change story status to locked.
   - Disable story editing.
   - Show a clear locked state such as `MASTER STORY - LOCKED`.
6. Implement deliberate Unlock Story behavior.
7. If unlocking or changing a locked story while downstream dummy content exists, show a stale-content warning.
8. Implement character Notes tags.
9. Implement reusable background selection.
10. Implement dummy Generate Character action.
11. Implement dummy Approve Character action.
12. Implement dummy Generate Scene action.
13. Implement dummy Approve Scene action.

### Out Of Scope

- No OpenAI API calls.
- No real story generation.
- No real character extraction.
- No real image generation.
- No ZIP export yet unless a placeholder button is needed.

### Done When

- The app starts locally.
- The frontend can call the backend health endpoint.
- All six stages render.
- Stage navigation works.
- Story edit, lock and unlock behavior works.
- Character reusable tags and background controls work.
- Dummy character generate/approve states work.
- Dummy scene generate/approve states work.
- Desktop story sentence cards match the approved wide layout.
- The production app visually and behaviorally matches the frozen prototype closely enough for side-by-side comparison.

## Phase 2: Replace Sample Data With A Real Lesson Object

### Goal

Make one lesson/project object the single source of truth for every screen.

### Initial Lesson Shape

Use this as the baseline schema:

```json
{
  "id": "lesson-001",
  "theme": "",
  "title": "",
  "learnerLevel": "Literacies Plus",
  "setting": "",
  "scenario": "",
  "sentenceCount": 9,
  "story": {
    "status": "draft",
    "sentences": [],
    "lockedAt": null,
    "modifiedAfterLock": false
  },
  "characters": [],
  "scenes": [],
  "media": {},
  "currentStage": "setup"
}
```

### Schema Steps

1. Add stable lesson ID.
2. Add setup fields:
   - Theme
   - Lesson title
   - Learner level
   - Setting
   - Main situation/scenario
   - Main character name
   - Main character age or age range
   - Main character sex/gender
   - Main character background/nationality
   - Secondary characters
   - Story sentence count
   - Target vocabulary
   - Additional notes
3. Add story fields:
   - `story.sentences`
   - `story.status`
   - `story.lockedAt`
   - `story.modifiedAfterLock`
4. Add character records with:
   - ID
   - Name
   - Role
   - Age
   - Sex
   - Background
   - Notes
   - Generation status
   - Image path
   - Approved state
5. Add scene records with:
   - ID
   - Sentence references
   - Location
   - Description
   - Character references
   - Reuse/new-image setting
   - Image path
   - Approved state
6. Add media/export metadata placeholders.
7. Add current stage.

### Refactor Steps

1. Remove hard-coded doctor/Marta/sample lesson data from UI components.
2. Pass the lesson object into stage components.
3. Make each stage render from the lesson object.
4. Update the lesson object through explicit update handlers.
5. Keep generated IDs stable once records are created.
6. Keep file paths and approval states in the lesson object rather than isolated UI state.

### Done When

- Loading a single lesson JSON object recreates the full project state.
- Every stage renders from that object.
- Hard-coded sample story, character and scene data are removed or clearly isolated as optional seed/dev data.

## Phase 3: Local Save, Open And Duplicate

### Goal

Make the app persistent before adding AI features.

### Project Folder Structure

Each lesson should be stored in its own folder under `/projects`:

```text
projects/
  lesson-001/
    lesson.json
    images/
      characters/
      scenes/
    exports/
```

Milestone 1 only needs `lesson.json`; image and export folders can be created as placeholders for later phases.

### New Lesson Steps

1. Add New Lesson action.
2. Generate a unique lesson ID.
3. Initialize empty lesson data from the schema.
4. Create a project folder under `/projects`.
5. Save `lesson.json`.
6. Set current stage to Setup.

### Auto-Save Steps

1. Auto-save Setup changes.
2. Auto-save Story edits.
3. Auto-save Story lock and unlock state.
4. Auto-save character changes.
5. Auto-save reusable Notes tags.
6. Auto-save reusable background values.
7. Auto-save scene changes.
8. Auto-save current stage.
9. Show lightweight save status in the UI.
10. Handle save failures with a visible error state.

### Open Existing Lesson Steps

1. Add Open Existing Lesson action.
2. Read local project folders from `/projects`.
3. List available lessons.
4. Show enough metadata to identify a lesson:
   - Title
   - Theme
   - Learner level
   - Last modified date
5. Load selected `lesson.json`.
6. Restore the saved current stage.
7. Render all stages from loaded data.

### Duplicate Previous Lesson Steps

1. Add Duplicate Previous Lesson action.
2. Select an existing lesson.
3. Deep-copy reusable setup data.
4. Assign a new stable lesson ID.
5. Reset fields that should not carry forward:
   - Story lock timestamp
   - Generated image paths
   - Character approval states
   - Scene approval states
   - Export metadata
6. Preserve fields that help reuse:
   - Theme, if appropriate
   - Learner level
   - Setting, if appropriate
   - Reusable backgrounds
   - Reusable Notes tags
7. Save the duplicate as a new project folder.

### Backend API Suggestions

Recommended local endpoints for Milestone 1:

```text
GET    /api/health
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
POST   /api/projects/:id/duplicate
```

### Done When

- The user can create a new lesson.
- Lesson data is saved to a local project folder.
- The user can close the app, reopen it and continue the same project.
- The locked story state persists after reopening.
- Existing lessons can be listed and opened.
- A previous lesson can be duplicated into a new project.

## Phase 4: Make Setup Fully Functional

### Goal

Bind the Setup UI to persistent lesson data and prevent invalid story workflow entry.

### Bound Setup Fields

Bind these fields to `lesson.json`:

- Theme
- Lesson title
- Learner level
- Setting
- Main situation/scenario
- Main character name
- Age or age range
- Sex/gender
- Background/nationality
- Secondary characters
- Story sentence count
- Target vocabulary
- Additional notes

### Learner Level Rules

The learner level selector must contain only:

- Literacies Plus
- Complete Beginner
- Beginner 1
- Beginner 1.5
- Beginner 2

Do not show CEFR labels in the main app.

### Validation Steps

1. Define mandatory fields for story drafting.
2. Recommended required fields:
   - Theme
   - Learner level
   - Setting
   - Main situation/scenario
   - Main character name
   - Main character age or age range
   - Main character sex/gender
   - Main character background/nationality
   - Story sentence count
3. Treat target vocabulary, secondary characters and additional notes as optional.
4. Validate required fields on change and before continuing to Story.
5. Show clear inline validation messages near the relevant fields.
6. Prevent story generation or dummy story creation while required fields are missing.
7. Keep validation language short and practical.

### Setup-To-Story Behavior

Milestone 1 should not generate a real AI story. Instead:

1. If required Setup fields are complete, allow the user to continue to Story.
2. Provide a local placeholder story creation action if needed for testing Story lock behavior.
3. Make clear in code naming that this is a placeholder or dummy action.
4. Store placeholder story sentences in `lesson.story.sentences`.
5. Set `lesson.story.status` to `draft`.

### Done When

- Every Setup field is represented in `lesson.json`.
- Setup values persist after closing and reopening the app.
- Missing required fields show inline validation.
- Story workflow entry is blocked until required fields are complete.
- Learner level options match the service-specific list exactly.

## Suggested Work Sequence

Implement Milestone 1 in this order:

1. Phase 0: freeze prototype and document UI rules.
2. Phase 1 backend: create Express app and health endpoint.
3. Phase 1 frontend: create Vite app, stage shell and navigation.
4. Phase 1 interactions: story lock/unlock, dummy character and scene states.
5. Phase 2: centralize all state into one lesson object.
6. Phase 3: save, open and duplicate local projects.
7. Phase 4: bind and validate Setup fully.
8. Final milestone QA against the critical acceptance path.

## Testing And QA Checklist

### Prototype Preservation

- Prototype file opens locally.
- `support.js` is unchanged after freezing.
- Screenshots exist for all required screens.

### App Startup

- Backend starts without errors.
- Frontend starts without errors.
- Frontend health check succeeds.

### Navigation

- Setup renders.
- Story renders.
- Characters renders.
- Scenes renders.
- Media renders.
- Export renders.
- Active stage indicator updates.
- Completed stage indicators update predictably.

### Story

- Draft story can be edited.
- Lock confirmation appears.
- Locked story cannot be edited.
- Locked state is visually clear.
- Unlock is deliberate.
- Changing a previously locked story marks downstream dummy data stale or potentially stale.

### Characters

- Character cards use only the approved lightweight fields.
- Notes tags can be added and reused.
- Background values can be reused.
- Dummy Generate Character changes state visibly.
- Dummy Approve Character changes state visibly.

### Scenes

- Scene cards render.
- Dummy Generate Scene changes state visibly.
- Dummy Approve Scene changes state visibly.
- Reuse/new-image setting is represented if included in the shell.

### Persistence

- New Lesson creates a project folder.
- `lesson.json` is written.
- Setup changes auto-save.
- Story changes auto-save.
- Character and scene changes auto-save.
- Current stage is restored after reopening.
- Open Existing Lesson works.
- Duplicate Previous Lesson creates a new ID and new project folder.

### Setup Validation

- Required fields are enforced.
- Inline validation appears near missing fields.
- Learner levels exactly match the approved list.
- No CEFR labels appear in the main UI.

## Milestone 1 Deliverables

- Frozen prototype in `/prototype`.
- Prototype screenshots in `/prototype/screenshots`.
- Approved UI rules in `/docs/approved-ui-rules.md`.
- React/Vite frontend in `/frontend`.
- Node/Express backend in `/server`.
- Local project storage in `/projects`.
- `.env.example`.
- `.gitignore`.
- Root package scripts for local development.
- Working local app that satisfies the Milestone 1 acceptance path.

## Handoff Notes For The Next Milestone

Milestone 2 should begin only after Milestone 1 persistence and story lock behavior are reliable. The next milestone will add backend-only OpenAI integration for story generation, structured story output validation, sentence-level regenerate/shorten actions, and final master-story locking behavior.

Before starting Milestone 2, verify that API keys are never exposed in frontend code and that prompts/schemas will live server-side in versionable files.
