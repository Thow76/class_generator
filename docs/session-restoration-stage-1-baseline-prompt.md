# Session Restoration Stage 1 Baseline Prompt

Use this prompt to complete Stage 1 of the session restoration issue for Lesson Source Builder.

## Prompt

You are baselining the current persistence and startup behavior for Lesson Source Builder before any session restoration implementation begins.

Your job is to confirm, document, and prove the current behavior:

- Saved lessons are persisted on disk by the backend project store.
- The frontend starts a fresh browser session from the bundled demo lesson.
- The frontend does not automatically restore the last opened or saved lesson after refresh or reopening localhost.
- Unsaved React state is lost on refresh.
- Saved projects remain available on disk and can be manually reopened.
- The active project id lives only in memory during the browser session.
- No localStorage, URL query parameter, or server-side session mechanism currently restores the active project.

Stage 1 is discovery and documentation only. Do not implement localStorage restoration, URL restoration, autosave, export generation, account sync, auth, cloud storage, or any later-stage behavior.

## Stage 1 Goal

Create a clear baseline that future stages can rely on.

The baseline is complete only if it answers these questions with file-backed evidence:

1. Where does the backend store saved lesson projects?
2. Which backend API routes create, list, read, update, and duplicate projects?
3. What lesson data is written to disk?
4. What metadata is written to disk?
5. What does the frontend initialize as the first lesson state?
6. What does the frontend initialize as the first active project id?
7. Which frontend handlers create, save, open, and duplicate projects?
8. Which helper updates `activeProjectId`?
9. Does that helper persist the project id anywhere outside React state?
10. Does startup call `listProjects()` automatically?
11. Does startup call `getProject()` automatically?
12. Does startup read `localStorage`?
13. Does startup read `window.location.search` or a `project` query param?
14. What happens to unsaved in-browser changes after refresh?
15. What happens to saved project data after refresh?

## Expected Files To Inspect

Inspect these files at minimum:

```text
frontend/src/App.jsx
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
frontend/src/data/demoLesson.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
server/src/index.js
server/src/routes/projects.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/projectStore.test.js
package.json
frontend/package.json
server/package.json
```

If related behavior is delegated elsewhere, inspect those files too. Keep the scope limited to persistence, project opening, and startup state.

## Commands To Consider

Use read-only commands first:

```sh
git status --short
rg -n "useState\\(demoLesson\\)|activeProjectId|setActiveProjectId|localStorage|sessionStorage|location\\.search|URLSearchParams|getProject\\(|listProjects\\(|createProject\\(|saveProject|duplicateProject|loadProjectList|openProject|saveCurrentLesson|setActiveProjectIdAndRef" frontend/src
rg -n "projectsDir|PROJECT_DATA_DIR|listProjects|createProject|getProject|updateProject|duplicateProject|writeProjectFiles|readProjectMetadata|createdAt|updatedAt" server/src
sed -n '1,180p' frontend/src/App.jsx
sed -n '980,1255p' frontend/src/App.jsx
sed -n '1,120p' frontend/src/api/projects.js
sed -n '1,220p' frontend/src/components/Sidebar.jsx
sed -n '1,260p' server/src/services/projectStore.js
sed -n '1,220p' server/src/routes/projects.js
sed -n '1,80p' server/src/index.js
npm run test --workspace server
npm run test --workspace frontend
```

Only run the app manually if you need runtime confirmation:

```sh
npm run dev
```

Expected local URLs when the app is running:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
```

## Manual Behavior Check

If you run the app, verify this exact behavior:

1. Open the app at `http://127.0.0.1:5173/`.
2. Confirm the initial lesson is the bundled demo lesson if no manual open action is taken.
3. Create or save a lesson.
4. Confirm a project folder appears under the backend project data directory, normally:

```text
server/data/projects/<project-id>/
```

5. Confirm the project folder contains persisted lesson data and metadata.
6. Make an unsaved in-browser change.
7. Refresh the browser.
8. Confirm the unsaved change is gone.
9. Confirm the app does not automatically reopen the saved project.
10. Use the Open panel to manually reopen the saved project.
11. Confirm saved data returns after manual reopening.

Do not treat manual QA as a replacement for source inspection. The final Stage 1 output must cite source files and line numbers.

## Evidence To Capture

Capture concise evidence for each of these implementation facts:

- `frontend/src/App.jsx` initializes:

```js
const [lesson, setLesson] = useState(demoLesson);
const [activeProjectId, setActiveProjectId] = useState(null);
```

- `frontend/src/App.jsx` has project handlers or equivalents:

```text
createFreshProject
handleSaveLesson
saveCurrentLesson
openProject
duplicateCurrentProject
loadProjectList
setActiveProjectIdAndRef
```

- `frontend/src/api/projects.js` maps to backend project endpoints.
- `server/src/index.js` mounts project routes under `/api/projects`.
- `server/src/routes/projects.js` exposes create/list/read/update/duplicate behavior.
- `server/src/services/projectStore.js` resolves the project directory through `PROJECT_DATA_DIR` or `server/data/projects`.
- `server/src/services/projectStore.js` writes lesson and metadata JSON files.
- No existing startup effect in `frontend/src/App.jsx` restores from localStorage or URL.

Use exact current line numbers from the working tree. Do not rely on stale line numbers from prior discussion.

## Output Artifact

Create or update one Markdown file under `docs/` with the Stage 1 findings.

Recommended file:

```text
docs/session-restoration-stage-1-baseline.md
```

The document should include:

- A short summary of current behavior.
- File-backed evidence with line references.
- Backend persistence flow.
- Frontend startup flow.
- Frontend manual open/save flow.
- What survives refresh.
- What does not survive refresh.
- Risks this creates for later export stages.
- A precise list of assumptions for Stage 2.
- A list of deliberately out-of-scope items.

## Suggested Document Structure

Use this structure unless you have a strong reason to improve it:

```md
# Session Restoration Stage 1 Baseline

## Summary

## Backend Persistence

## Frontend Startup State

## Manual Project Flow

## Refresh And Reopen Behavior

## Missing Restoration Mechanisms

## Export-Phase Risk

## Stage 2 Assumptions

## Out Of Scope

## Verification
```

## Acceptance Criteria

Stage 1 is done when:

- The baseline document exists in `docs/`.
- The document cites current source files and line numbers.
- It confirms backend disk persistence.
- It confirms frontend demo-first startup.
- It confirms no automatic restoration of the last active project.
- It confirms saved projects are manually reopenable.
- It distinguishes unsaved in-memory changes from saved project data.
- It identifies exactly where later stages should hook restoration behavior.
- It does not modify application runtime behavior.
- It does not introduce localStorage, URL params, autosave, export behavior, auth, or cloud sync.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run test --workspace frontend
```

If you only changed documentation, tests may be unchanged, but still run them if the environment allows. If a command cannot run, state exactly why.

Also run targeted source checks:

```sh
rg -n "localStorage|sessionStorage|location\\.search|URLSearchParams|useState\\(demoLesson\\)|activeProjectId" frontend/src/App.jsx frontend/src
rg -n "PROJECT_DATA_DIR|server/data/projects|writeProjectFiles|getLessonPath|getMetaPath" server/src/services/projectStore.js
```

## Expected Final Response

Report:

- The baseline document path.
- The main finding in one or two sentences.
- Commands run and results.
- Any manual QA performed or skipped.
- Confirmation that no runtime behavior was changed.

Keep the final response concise.
