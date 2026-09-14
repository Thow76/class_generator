# Phase 1 Review Prompt

Use this prompt to review whether Milestone 1, Phase 1 of Lesson Source Builder was implemented correctly. The review should verify the real application shell, backend health endpoint and simulated interactions only.

## Prompt

You are reviewing Milestone 1, Phase 1 of the Lesson Source Builder implementation.

Your job is to verify that the approved frozen prototype has been recreated as a conventional React/Vite frontend and Node/Express backend, without adding later milestone scope.

Review Phase 1 only. You may inspect Phase 0 artifacts only to confirm that the prototype remains frozen and that the rebuilt UI matches the approved visual and behavioral reference. Do not require Phase 2+ features such as persistence, real lesson JSON storage, OpenAI integration, real image generation or real export.

## Phase 1 Goal

Recreate the approved prototype in a conventional application structure with no AI integration.

The implementation is correct only if:

- A real React/Vite frontend exists under `frontend/`.
- A real Node/Express backend exists under `server/`.
- The backend exposes a working health endpoint.
- The frontend calls the backend health endpoint.
- The app opens directly into the six-stage workflow.
- Setup, Story, Characters, Scenes, Media and Export all render.
- Stage navigation, active state and completed indicators work.
- Story draft, edit, lock and unlock behavior works using local state.
- Character reusable Notes tags and background controls work using local state.
- Dummy character generate/approve actions work.
- Dummy scene generate/approve actions work.
- The UI remains visually aligned with the frozen prototype.
- The frozen prototype remains untouched.
- The production app does not import or depend on `prototype/support.js`.

## Expected Files

Verify that these files or close equivalents exist:

```text
package.json
package-lock.json
.env.example
.gitignore
README.md
docs/approved-ui-rules.md
docs/phase-1-handoff.md
prototype/lesson-source-builder.dc.html
prototype/support.js
prototype/screenshots/01-setup.png
prototype/screenshots/02-story-draft.png
prototype/screenshots/03-story-locked.png
prototype/screenshots/04-characters.png
prototype/screenshots/05-scenes.png
prototype/screenshots/06-media.png
prototype/screenshots/07-export.png
frontend/package.json
frontend/index.html
frontend/vite.config.js
frontend/src/main.jsx
frontend/src/App.jsx
frontend/src/styles.css
frontend/src/data/sampleLesson.js
frontend/src/components/AppShell.jsx
frontend/src/components/Sidebar.jsx
frontend/src/components/StageHeader.jsx
frontend/src/components/StatusBadge.jsx
frontend/src/components/Icon.jsx
frontend/src/stages/SetupStage.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/CharactersStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/stages/ExportStage.jsx
server/package.json
server/src/index.js
server/src/routes/health.js
```

File names may differ, but the implementation should clearly separate frontend, backend, prototype and docs.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
find . -maxdepth 3 -type f | sort
npm run dev
npm run dev:frontend
npm run dev:server
npm run prototype
curl -s http://127.0.0.1:3001/api/health
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server package.json README.md docs
rg "OpenAI|openai|firebase|ElevenLabs|ppt|powerpoint|worksheet|zip|cloud|account|auth" frontend server package.json
```

Expected development URLs:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Prototype preview, if needed: http://127.0.0.1:4173/
```

The backend health response should be JSON and may look like:

```json
{
  "ok": true,
  "service": "lesson-source-builder-api",
  "phase": "1"
}
```

## Review Steps

1. Inspect the repository structure.
2. Confirm Phase 0 prototype files and screenshots still exist.
3. Confirm `frontend/` and `server/` are separate from `prototype/`.
4. Read root `package.json`, `frontend/package.json` and `server/package.json`.
5. Confirm root scripts can start the frontend and backend together or clearly provide separate commands.
6. Start the backend and verify `GET /api/health`.
7. Start the frontend and verify it renders the app at `http://127.0.0.1:5173/`.
8. Confirm the frontend can call `/api/health` through the Vite proxy or equivalent setup.
9. Open browser dev tools and check for blocking console errors.
10. Navigate through all six workflow stages.
11. Compare each rebuilt stage against the matching Phase 0 screenshot.
12. Exercise Story draft editing, dummy regenerate, dummy shorten, lock confirmation and unlock behavior.
13. Exercise character background reuse, Notes tags, dummy Generate Character and dummy Use This Character.
14. Exercise scene location edits, dummy Generate Scene and dummy Use This Scene.
15. Exercise Media filters: All, Characters and Scenes.
16. Exercise Export summary and confirm export is placeholder only.
17. Search for accidental imports from `prototype/support.js`.
18. Search for accidental Phase 2+ scope such as OpenAI, persistence routes, real image generation or real ZIP export.
19. Verify the prototype files were not edited as part of Phase 1.

## Acceptance Checklist

Mark each item Pass, Fail, or Not Applicable.

| Item | Result | Evidence |
| --- | --- | --- |
| React/Vite frontend exists under `frontend/` |  |  |
| Node/Express backend exists under `server/` |  |  |
| Root dev scripts are present and usable |  |  |
| Backend starts locally |  |  |
| `GET /api/health` returns JSON |  |  |
| Frontend starts locally |  |  |
| Frontend calls the health endpoint |  |  |
| App opens directly into workflow, not a marketing page |  |  |
| Setup stage renders |  |  |
| Story stage renders |  |  |
| Characters stage renders |  |  |
| Scenes stage renders |  |  |
| Media stage renders |  |  |
| Export stage renders |  |  |
| Sidebar stage order is Setup, Story, Characters, Scenes, Media, Export |  |  |
| Active stage indicator works |  |  |
| Completed stage indicators work |  |  |
| Visual system matches the approved prototype closely |  |  |
| Story sentence cards are wide on desktop |  |  |
| Story draft editing works |  |  |
| Dummy Regenerate sentence behavior works |  |  |
| Dummy Shorten sentence behavior works |  |  |
| Lock Story requires confirmation |  |  |
| Locked story disables or hides editing controls |  |  |
| Locked story state is visually clear |  |  |
| Unlock Story is deliberate |  |  |
| Stale warning or stale state appears when changing locked story after downstream dummy output exists |  |  |
| Setup learner levels match the approved list exactly |  |  |
| No CEFR labels appear in the main app UI |  |  |
| Character fields stay lightweight |  |  |
| No hair/clothing/build/personality/expression/visual-style character fields appear |  |  |
| Character background reuse works |  |  |
| Character Notes tags can be added and removed |  |  |
| Dummy Generate Character changes visible state |  |  |
| Dummy Use This Character approves the card |  |  |
| Scene cards render in a usable responsive grid |  |  |
| Scene location editing works |  |  |
| Scene covered sentences are visible |  |  |
| Dummy Generate Scene changes visible state |  |  |
| Dummy Use This Scene approves the card |  |  |
| Media All filter works |  |  |
| Media Characters filter works |  |  |
| Media Scenes filter works |  |  |
| Export summary reflects local state |  |  |
| Export action is placeholder only |  |  |
| No OpenAI integration exists |  |  |
| No real image generation exists |  |  |
| No local save/open/duplicate persistence exists |  |  |
| No real ZIP export exists |  |  |
| Production frontend does not import `prototype/support.js` |  |  |
| Frozen prototype files remain untouched |  |  |

## Product Constraints To Verify

### Workflow

The workflow order must be:

1. Setup
2. Story
3. Characters
4. Scenes
5. Media
6. Export

### Learner Levels

The app must show only:

- Literacies Plus
- Complete Beginner
- Beginner 1
- Beginner 1.5
- Beginner 2

Do not accept CEFR labels such as A1, A2 or B1 in the main application UI.

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

### Story Behavior

The story must support:

- Draft state.
- Locked state.
- Inline editing while draft.
- Confirmation before locking.
- Editing disabled or hidden while locked.
- Deliberate unlock.
- Stale warning or stale marker when downstream dummy outputs may no longer match changed story text.

### Phase 1 Boundaries

Phase 1 must not include:

- OpenAI API calls.
- Real story generation.
- Character extraction.
- Image API calls.
- Local project save/open/duplicate.
- Real lesson JSON persistence.
- ZIP lesson source pack export.
- PowerPoint or worksheet generation.
- Firebase, accounts, auth or cloud sync.

## Visual Review Checklist

Compare the rebuilt app against:

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

- Sidebar width, rhythm and stage order.
- App title treatment.
- Active, completed and incomplete stage icons.
- Warm off-white app background.
- White cards with subtle borders.
- Teal primary buttons.
- Muted status treatments.
- Page header hierarchy.
- Compact desktop-first spacing.
- Setup sections and fields.
- Story two-column/wide-card desktop layout.
- Locked story card treatment.
- Character card field set and approval treatment.
- Scene card layout and approval treatment.
- Media filter and card grid behavior.
- Export summary layout and placeholder action treatment.

Do not require pixel-perfect matching. Do flag product-level visual drift that would make later phases rebuild the wrong interface.

## Code Review Focus

Prioritize findings in these areas:

- Prototype-safety violations.
- Broken app startup or health check.
- Missing workflow stages.
- Broken Story lock/unlock behavior.
- Product rule violations.
- Scope creep into later phases.
- UI state structure that will make Phase 2 migration unnecessarily hard.
- Components depending on generated prototype globals.
- Missing visible error handling for backend health failure.
- Layout issues causing overlap, clipped text or unstable controls.

## Review Output Format

Return findings first, ordered by severity.

Use this format:

```md
# Phase 1 Review

## Findings

- [P0/P1/P2/P3] Title
  - File/path:
  - Evidence:
  - Why it matters:
  - Recommended fix:

## Acceptance Summary

- App startup:
- Backend health:
- Six-stage workflow:
- Story lock/edit/unlock:
- Character dummy flow:
- Scene dummy flow:
- Visual parity:
- Phase 1 scope control:
- Prototype safety:

## Open Questions

- ...

## Verdict

Pass/Fail with a one-paragraph explanation.
```

If there are no findings, say so clearly and include any residual risks or checks that could not be performed, such as inability to visually inspect the app in a browser.

## Severity Guidance

- P0: Phase 1 cannot run or cannot be meaningfully reviewed, for example app startup fails completely.
- P1: Major Phase 1 requirement missing or broken, for example no health endpoint, missing stage, prototype runtime dependency, or broken Story locking.
- P2: Important product, UX, state or scope issue, for example CEFR labels appear, character fields drift, health failure is unhandled, or Phase 2 migration will be difficult.
- P3: Minor clarity, naming, documentation or polish issue.

## Non-Goals For This Review

Do not fail Phase 1 because it lacks:

- Real OpenAI story generation.
- Persistent `lesson.json` project storage.
- New/open/duplicate lesson behavior.
- Character extraction from story.
- Real character images.
- Real scene planning.
- Real scene images.
- Audio/video prompts.
- ZIP export.

Those belong to later phases.
