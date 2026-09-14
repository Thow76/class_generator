# Lesson Source Builder: Phase 1 Handoff

## Purpose

Phase 1 builds the real application shell for Lesson Source Builder. The goal is to recreate the approved prototype in a conventional React/Vite frontend and Node/Express backend, without AI integration and without persistent lesson storage.

Phase 1 should prove that the rebuilt application can match the frozen prototype's visual structure and core simulated interactions while using normal application code rather than the generated prototype runtime.

## Phase 1 Scope

Build:

- React/Vite frontend in `frontend/`.
- Node/Express backend in `server/`.
- Root development scripts.
- Backend health endpoint.
- Frontend health check call.
- Six-stage workflow shell.
- Approved left navigation.
- Approved visual system.
- Story draft, edit, lock and unlock behavior using local state.
- Character Notes tags and reusable background controls using local state.
- Dummy Generate/Approve Character state transitions.
- Dummy Generate/Approve Scene state transitions.
- Media and Export review screens with placeholder data from local state.

Do not build:

- OpenAI integration.
- Real story generation.
- Character extraction.
- Image generation.
- Local file persistence.
- Save/open/duplicate lessons.
- ZIP export.
- PowerPoint generation.
- Worksheet generation.
- ElevenLabs integration.
- Video-platform integration.
- Firebase, accounts, cloud sync or hosted auth.

## Relationship To Phase 0

Phase 0 froze the approved prototype here:

```text
prototype/lesson-source-builder.dc.html
prototype/support.js
prototype/screenshots/
```

Phase 1 must use those files only as visual and behavioral references.

Do not:

- Edit `prototype/lesson-source-builder.dc.html`.
- Edit `prototype/support.js`.
- Import `prototype/support.js` into the real app.
- Build production app behavior by wrapping or reusing the generated prototype runtime.

Do:

- Compare the rebuilt app against the screenshots.
- Preserve the documented product rules in `docs/approved-ui-rules.md`.
- Keep the prototype available for side-by-side comparison.

## Recommended Repository Shape After Phase 1

```text
lesson-source-builder/
  prototype/
    lesson-source-builder.dc.html
    support.js
    screenshots/
  frontend/
    index.html
    package.json
    vite.config.js
    src/
      App.jsx
      main.jsx
      styles.css
      data/
      components/
      stages/
  server/
    package.json
    src/
      index.js
      routes/
  docs/
    approved-ui-rules.md
    milestone-1-handoff.md
    phase-0-review-prompt.md
    phase-1-handoff.md
  projects/
  .env.example
  .gitignore
  package.json
```

Exact file names may differ, but the separation of `prototype/`, `frontend/`, `server/`, `docs/` and future `projects/` should remain clear.

## Technical Direction

### Frontend

- Use React.
- Use Vite.
- Use ordinary component structure.
- Keep stage navigation and stage content in app state for Phase 1.
- Use CSS or a small local style system rather than depending on prototype-generated styles.
- Use Material Symbols Rounded if matching the prototype icon language directly.
- Keep the UI desktop-first.
- Add responsive rules only to prevent broken layouts on narrower screens.

### Backend

- Use Node.js.
- Use Express.
- Keep backend code small and boring in Phase 1.
- Add one health route.
- Configure CORS or Vite proxy so the frontend can call the backend in local development.
- Prepare route structure for future APIs, but do not add OpenAI routes yet.

### State

Phase 1 may use local frontend state. Persistence belongs to Phase 3.

Use local state for:

- Current stage.
- Completed stage indicators.
- Setup form placeholder values.
- Story sentences.
- Story status: draft or locked.
- Story lock confirmation state.
- Character cards.
- Reusable background values.
- Reusable Notes tags.
- Character generation and approval states.
- Scene cards.
- Scene generation and approval states.
- Media filter state.

Avoid hard-coding state deep inside individual components in a way that will make Phase 2 difficult. Prefer one top-level sample lesson object or state reducer that can later become the real lesson object.

## Product Rules To Preserve

### Learner Levels

Only show these learner levels:

- Literacies Plus
- Complete Beginner
- Beginner 1
- Beginner 1.5
- Beginner 2

Do not show CEFR labels such as A1, A2 or B1 in the main application UI.

### Character Inputs

Character cards and setup character inputs must remain lightweight:

- Name
- Age or age range
- Sex or gender
- Background or nationality
- Optional reusable Notes tags

Do not add dedicated fields for:

- Hair
- Clothing
- Build
- Personality
- Expression
- Visual style

### Story States

Story must have explicit Draft and Locked states.

In draft state:

- Sentences can be edited.
- Edit, Regenerate and Shorten controls can be visible.
- Lock Story action is available.

In locked state:

- Editing is disabled.
- Sentence edit controls are hidden or disabled.
- Lock icon or locked treatment is visible on sentence cards.
- A clear label such as `MASTER STORY - LOCKED` or `Master story - locked` is visible.
- Unlocking requires deliberate user action.

### Desktop Sentence Layout

Story sentence cards should be wide enough on desktop for typical lesson sentences to remain on one line where reasonable.

Do not reduce story font size just to force one-line sentences.

## Implementation Plan

## Step 1: Establish Project Scripts

Create or update the root `package.json` so a developer can start both apps from the repository root.

Recommended scripts:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace frontend\" \"npm run dev --workspace server\"",
    "dev:frontend": "npm run dev --workspace frontend",
    "dev:server": "npm run dev --workspace server"
  }
}
```

If workspaces are not used, provide equivalent scripts, for example:

```json
{
  "scripts": {
    "dev": "concurrently \"npm --prefix server run dev\" \"npm --prefix frontend run dev\"",
    "dev:frontend": "npm --prefix frontend run dev",
    "dev:server": "npm --prefix server run dev"
  }
}
```

Add dependencies needed for local development only:

- `concurrently`, if using one command to run both apps.
- `nodemon`, if using automatic backend reload.

Acceptance:

- `npm run dev` starts both frontend and backend, or the README clearly documents separate commands.
- Existing Phase 0 prototype preview remains available.

## Step 2: Create The Express Backend

Create the backend app under `server/`.

Recommended files:

```text
server/
  package.json
  src/
    index.js
    routes/
      health.js
```

Implement:

- Express app creation.
- JSON middleware.
- CORS or Vite proxy compatibility.
- `GET /api/health`.
- Configurable port through `PORT`, defaulting to a local development port such as `3001`.

Suggested health response:

```json
{
  "ok": true,
  "service": "lesson-source-builder-api",
  "phase": "1"
}
```

Acceptance:

- `npm run dev:server` starts the server.
- Visiting `http://localhost:3001/api/health` returns JSON.
- The server does not require an OpenAI API key.
- The server does not expose secrets.

## Step 3: Create The React/Vite Frontend

Create the frontend app under `frontend/`.

Recommended files:

```text
frontend/
  index.html
  package.json
  vite.config.js
  src/
    main.jsx
    App.jsx
    styles.css
    data/
      sampleLesson.js
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

The exact component names can differ, but the app should be decomposed by workflow stage.

Acceptance:

- `npm run dev:frontend` starts Vite.
- The app opens directly into the Lesson Source Builder workflow.
- There is no marketing landing page.
- The frontend does not import from `prototype/support.js`.

## Step 4: Add Frontend-To-Backend Health Check

Add a small frontend health check to confirm backend connectivity.

Implementation options:

- Display a subtle status indicator in the sidebar footer.
- Display a small status line in a developer-only footer.
- Log the result during development, if visible UI would interfere with prototype fidelity.

Recommended visible state:

- `API connected`
- `API unavailable`

Acceptance:

- The frontend calls `GET /api/health`.
- Success and failure states are handled.
- A backend outage does not break stage navigation.

## Step 5: Build The App Shell

Implement the main app layout:

- Persistent left sidebar.
- Main content area.
- Stage header per screen.
- Desktop-first maximum content width.
- Full-height app background.

Sidebar must include stages in this exact order:

1. Setup
2. Story
3. Characters
4. Scenes
5. Media
6. Export

Sidebar behavior:

- Active stage is visually highlighted.
- Completed stages show completed treatment.
- Current stage shows active treatment.
- Incomplete stages remain visible.
- Stage labels should match the approved language.

Acceptance:

- Clicking a stage changes the visible content.
- Active indicator updates.
- Completed indicator updates based on local state.
- Sidebar remains stable as content changes.

## Step 6: Recreate The Approved Visual System

Use `docs/approved-ui-rules.md` and prototype screenshots as the source of truth.

Preserve:

- Roboto-style typography.
- Material Symbols Rounded icon direction, if icons are used.
- Warm off-white app background.
- White content cards.
- Subtle outline borders.
- Teal primary action color.
- Muted status fills.
- Compact desktop-first spacing.
- Page headers with:
  - Small uppercase step label.
  - 28px-ish page title.
  - Concise supporting copy.
- Filled primary buttons.
- Outlined or surface secondary buttons.

Avoid:

- Decorative landing-page hero sections.
- Oversized marketing-style cards.
- Single-color redesigns unrelated to the prototype.
- Nested cards.
- Purple/blue gradient redesigns.

Acceptance:

- Rebuilt screens can be compared visually to the Phase 0 screenshots.
- Layout, hierarchy and spacing feel like the approved prototype.
- Text does not overflow buttons, cards or sidebar items.
- UI remains usable at common desktop widths.

## Step 7: Implement Setup Stage Shell

Build the Setup screen with local state only.

Sections:

- Lesson
- Situation
- Characters
- Language

Fields:

- Theme
- Lesson title
- Learner level
- Setting
- Main situation/scenario
- Main character name
- Approximate age
- Sex/gender
- Background/nationality
- Secondary characters as removable tags
- Sentence count
- Target vocabulary
- Additional notes

Sentence count options:

- 6
- 8
- 9
- 10
- 12

Phase 1 does not need full validation. Phase 4 owns complete Setup validation. However, controls should be wired to local state and behave normally.

Acceptance:

- All fields render.
- Fields can be edited.
- Learner levels match the approved list exactly.
- Secondary characters can be added and removed as tags.
- No CEFR labels appear.

## Step 8: Implement Story Stage Shell

Build the Story screen with local sample sentences.

Story behavior:

- Draft status is visible.
- Story sentences render as numbered cards.
- Sentence cards use a wide desktop layout.
- Unlocked sentence cards show Edit, Regenerate and Shorten controls.
- Edit opens inline editing.
- Saving an edit updates local state.
- Regenerate can perform a dummy replacement or visible simulated state transition.
- Shorten can perform a dummy shortened value or visible simulated state transition.
- Lock Story opens a confirmation panel or modal.
- Confirming lock sets story status to locked.
- Locked status is visible.
- Locked sentence cards hide or disable editing controls.
- Unlock Story is available as a deliberate action.

No real AI calls should occur.

Acceptance:

- Draft story can be edited locally.
- Lock confirmation appears.
- Confirming lock disables editing.
- Locked state is visually obvious.
- Unlock returns the story to editable draft state.
- Sentence cards remain wide on desktop.

## Step 9: Implement Character Stage Shell

Build the Characters screen using local sample character records.

Character card fields:

- Name
- Age or age range
- Sex or gender
- Background or nationality
- Optional reusable Notes tags

Character card states:

- Empty/reference placeholder.
- Generated dummy state.
- Approved dummy state.

Reusable background behavior:

- Background field can select from existing values.
- New background values can be added.
- Reused values appear as options on other character cards.

Notes tag behavior:

- Suggested notes can be added.
- New notes can be typed and added.
- Existing notes can be removed.
- Tags are reusable where appropriate.

Dummy actions:

- `Generate character` sets generated state and displays a placeholder visual/reference area.
- `Regenerate` resets or updates generated state.
- `Use this character` sets approved state.
- Approved cards show an approved badge and primary border.

Acceptance:

- Character cards render with only the approved lightweight fields.
- Background reuse works locally.
- Notes tags can be added and removed.
- Dummy generate and approve states are visible.
- No dedicated hair, clothing, build, personality, expression or visual style fields appear.

## Step 10: Implement Scenes Stage Shell

Build the Scenes screen using local sample scene records.

Scene card fields:

- Scene label or number.
- Image/reference placeholder.
- Editable location.
- Covered story sentences.
- Generate new image or reuse previous image setting, if represented in Phase 1.
- Approved badge when approved.

Dummy actions:

- `Generate scene` sets generated state.
- `Regenerate` updates generated state.
- `Use this scene` sets approved state.

Acceptance:

- Scene cards render in a responsive grid.
- Cards are no narrower than approximately 360px on desktop where space allows.
- Location is editable.
- Covered sentences are visible.
- Dummy generate and approve states are visible.
- Approved scene cards show approved treatment.

## Step 11: Implement Media Stage Shell

Build the Media screen as a review area for locally generated/approved placeholder media.

Include:

- Header title: `Image review`.
- Filters:
  - All
  - Characters
  - Scenes
- Compact media grid.
- Character placeholder items.
- Scene placeholder items.
- Approved status indicators.
- Missing/not-generated state where applicable.

Acceptance:

- Filters switch visible media items.
- Approved status appears accurately from local state.
- Character and scene items use distinguishable placeholder treatments.

## Step 12: Implement Export Stage Shell

Build the Export screen as a non-functional or placeholder export summary.

Include:

- Header title: `Export lesson source`.
- Lesson summary card.
- Learner level.
- Locked story sentence count.
- Approved character count.
- Approved scene count.
- Primary placeholder action: `Export lesson source`.
- Secondary placeholder action: `Preview lesson`, if matching prototype.

The export button may be disabled, show a placeholder message, or simulate a local state. Real ZIP creation belongs to Phase 12.

Acceptance:

- Export screen renders.
- Counts reflect local app state.
- Export action does not create real downstream artifacts.
- UI makes it clear enough that Phase 1 export is not the real final export pipeline.

## Step 13: Add Basic Stale-Warning Behavior

Phase 1 should include the first visible version of stale-content behavior, even though persistence and real downstream generation are later phases.

Implement:

- If story is locked and character or scene dummy outputs exist, unlocking should show a warning.
- If the user changes story text after unlocking, character and scene dummy records may show a `Potentially stale` indicator.
- Do not delete downstream dummy records automatically.

Acceptance:

- Unlocking a story with downstream dummy output is deliberate.
- The app warns about downstream risk.
- Existing dummy character and scene work remains visible.
- Stale state is visible rather than destructive.

## Step 14: Compare Against Phase 0 Screenshots

Before considering Phase 1 complete, compare the rebuilt screens against:

```text
prototype/screenshots/01-setup.png
prototype/screenshots/02-story-draft.png
prototype/screenshots/03-story-locked.png
prototype/screenshots/04-characters.png
prototype/screenshots/05-scenes.png
prototype/screenshots/06-media.png
prototype/screenshots/07-export.png
```

Check:

- Stage order.
- Sidebar treatment.
- Page header hierarchy.
- Card density.
- Button treatment.
- Story sentence width.
- Locked story visuals.
- Character card fields.
- Scene card structure.
- Media review layout.
- Export summary layout.

Acceptance:

- Differences are intentional and documented.
- Rebuilt app does not drift into a new product design.
- Any mismatches that would affect later implementation are fixed before moving to Phase 2.

## Suggested Component Responsibilities

### `App`

- Owns top-level local app state.
- Owns current stage.
- Passes stage data and event handlers to stage components.
- Calls backend health endpoint.

### `AppShell`

- Defines sidebar and main content layout.
- Receives current stage and navigation handlers.

### `Sidebar`

- Renders fixed workflow order.
- Shows active/completed/incomplete states.
- Handles stage clicks.

### `StageHeader`

- Renders step label, title and supporting copy.
- Keeps page headers consistent.

### `SetupStage`

- Renders Phase 1 setup form.
- Updates local setup state.
- Handles secondary character tags.

### `StoryStage`

- Renders draft/locked story.
- Handles edit, dummy regenerate, dummy shorten, lock and unlock.

### `CharactersStage`

- Renders character cards.
- Handles reusable backgrounds, notes tags and dummy approval state.

### `ScenesStage`

- Renders scene cards.
- Handles location edits and dummy approval state.

### `MediaStage`

- Renders local review items.
- Handles All/Characters/Scenes filter.

### `ExportStage`

- Renders project summary.
- Shows placeholder export controls.

## Suggested Local State Shape

Phase 1 does not need the final Phase 2 schema, but it should be close enough to migrate cleanly:

```js
const initialLesson = {
  id: "phase-1-demo",
  theme: "Shopping",
  title: "At the supermarket",
  learnerLevel: "Literacies Plus",
  setting: "Local supermarket",
  scenario: "A learner buys food and asks for help.",
  sentenceCount: 9,
  secondaryCharacters: ["cashier"],
  targetVocabulary: ["bread", "milk", "how much"],
  notes: "",
  story: {
    status: "draft",
    sentences: [
      "Marta goes to the supermarket.",
      "She needs bread and milk."
    ],
    lockedAt: null,
    modifiedAfterLock: false
  },
  characters: [],
  scenes: [],
  media: {},
  currentStage: "setup"
};
```

Keep IDs stable for sample character and scene records once created, even in local state. That will make Phase 2 easier.

## Development Commands

Document the actual commands used by the implementation. Recommended commands:

```sh
npm install
npm run dev
npm run dev:frontend
npm run dev:server
```

If the project uses separate installs:

```sh
npm install --prefix frontend
npm install --prefix server
npm --prefix frontend run dev
npm --prefix server run dev
```

## Manual QA Checklist

### Startup

- Root development command starts both apps.
- Backend health endpoint responds with JSON.
- Frontend renders without a blank screen.
- Frontend can call backend health endpoint.

### Prototype Safety

- `prototype/lesson-source-builder.dc.html` is unchanged by Phase 1 work.
- `prototype/support.js` is unchanged by Phase 1 work.
- Production frontend does not import `prototype/support.js`.
- Production frontend does not depend on generated prototype runtime globals.

### Workflow

- Setup renders.
- Story renders.
- Characters renders.
- Scenes renders.
- Media renders.
- Export renders.
- Stage navigation works by clicking sidebar rows.
- Active stage is visually clear.
- Completed stages are visually distinct.

### Setup

- All Phase 1 setup fields render.
- Fields are editable.
- Learner levels match the approved list exactly.
- CEFR labels do not appear.
- Secondary character tags can be added and removed.

### Story

- Draft badge appears in draft state.
- Sentences render as numbered cards.
- Inline edit works.
- Dummy Regenerate control produces visible feedback.
- Dummy Shorten control produces visible feedback.
- Lock confirmation appears.
- Confirming lock disables editing.
- Locked label appears.
- Unlock is deliberate.
- Stale warning appears when unlocking after downstream dummy output exists.

### Characters

- Character fields stay within the approved lightweight set.
- Background values can be reused.
- Notes tags can be added.
- Notes tags can be removed.
- Dummy Generate Character changes state.
- Dummy Use This Character approves the card.
- Approved treatment is visible.

### Scenes

- Scene cards render.
- Location can be edited.
- Covered sentences are visible.
- Dummy Generate Scene changes state.
- Dummy Use This Scene approves the card.
- Approved treatment is visible.

### Media

- All filter works.
- Characters filter works.
- Scenes filter works.
- Approval statuses reflect local state.

### Export

- Summary counts reflect local state.
- Export action is placeholder only.
- No ZIP or final asset pack is produced in Phase 1.

### Layout

- Story cards are wide on desktop.
- Text does not overlap controls.
- Buttons do not resize unpredictably.
- Sidebar does not jump when stages change.
- Cards do not nest inside other cards.
- No page relies on a decorative marketing hero.

## Phase 1 Done Criteria

Phase 1 is complete when:

- The real app shell starts locally.
- Backend health check works.
- Frontend can call the backend.
- All six stages render.
- Stage navigation works.
- Active and completed indicators work.
- Setup fields render and update local state.
- Story edit, lock and unlock behavior works.
- Character reusable tags and background controls work.
- Dummy character generate/approve states work.
- Dummy scene generate/approve states work.
- Media and Export screens reflect local state.
- Story sentence cards use the approved wide desktop layout.
- The frozen prototype remains untouched.
- No OpenAI/API/image/export/persistence scope has been added accidentally.

## Handoff To Phase 2

Phase 2 should replace Phase 1 local sample state with one real lesson object as the source of truth.

Before starting Phase 2, confirm:

- The top-level app state is easy to migrate into a `lesson` object.
- Stage components receive data through props or a clear shared state boundary.
- IDs for local sample characters and scenes are stable.
- Hard-coded demo data is isolated in one obvious file or initializer.
- UI behavior does not depend on hidden prototype globals.

Phase 2 should not need to redesign the UI. It should mainly replace local shell data with a real lesson/project object.
