# Session Restoration Stage 1 Baseline

## Summary

Lesson Source Builder currently has durable backend project persistence, but no automatic session restoration on frontend startup. Saved lessons are stored by the backend under a project data directory, while the React app starts each browser session from the bundled demo lesson and an in-memory `activeProjectId` of `null`.

The only way a saved project becomes active is through explicit frontend project handlers such as save, new, open, or duplicate. Refreshing the page recreates React state, so unsaved in-browser edits are lost. Saved project data remains on disk and can be manually reopened through the Open panel.

## Backend Persistence

The project store resolves its root directory from `PROJECT_DATA_DIR` or falls back to `server/data/projects` in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:11). The exported `getProjectDataDirectory()` returns that resolved directory, and `getProjectPath(projectId)` joins safe project ids beneath it while rejecting paths outside the data directory in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:143).

Saved projects are project folders named like `lesson-...`. `createProject()` ensures the root exists, creates `images/characters`, `images/scenes`, and `exports`, normalizes the lesson, validates it, and writes files in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:51). `getProject()` reads `lesson.json`, normalizes, validates, and returns the lesson in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:71). `updateProject()` normalizes, validates, and rewrites the project in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:98). `duplicateProject()` reads the source, creates a new project, copies assets, and records `sourceProjectId` metadata in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:109).

The store writes two JSON files per project. `writeProjectFiles()` writes the normalized lesson to `lesson.json` and metadata to `meta.json` in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:196). The exact file paths are `getLessonPath(projectId) -> lesson.json` and `getMetaPath(projectId) -> meta.json` in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:250). JSON writes are atomic temp-file writes followed by rename in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:222).

The lesson data written to disk is the full normalized lesson object. The server-side default shape includes top-level lesson fields, setup, story, characters, scenes metadata, scenes, reusable values, media, export, and `currentStage` in [server/src/services/normalizeLesson.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/normalizeLesson.js:1). Normalization overwrites the lesson id with the project id when provided, normalizes setup, story, characters, scenes, reusable values, media, and export in [server/src/services/normalizeLesson.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/normalizeLesson.js:94). Validation confirms ids, stage, learner level, sentence count, setup, story, characters, metadata, scenes, image paths, and cross-references in [server/src/services/validateLesson.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/validateLesson.js:23).

The metadata written to `meta.json` is `id`, `title`, `theme`, `learnerLevel`, `currentStage`, `createdAt`, `updatedAt`, plus any metadata patch such as `sourceProjectId` during duplication in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:196). `readProjectMetadata()` returns the same list fields for project listing, falling back to filesystem timestamps if metadata is missing in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:180).

Project routes are mounted under `/api/projects` in [server/src/index.js](/Users/home/Documents/ChatGPT/class_generator/server/src/index.js:26). The routes expose list with `GET /`, create with `POST /`, read with `GET /:id`, update with `PUT /:id`, and duplicate with `POST /:id/duplicate` in [server/src/routes/projects.js](/Users/home/Documents/ChatGPT/class_generator/server/src/routes/projects.js:14).

## Frontend Startup State

The app imports `demoLesson` from [frontend/src/data/demoLesson.js](/Users/home/Documents/ChatGPT/class_generator/frontend/src/data/demoLesson.js:20). That demo lesson is built with `createEmptyLesson()` and includes the "At the Doctor's Surgery" lesson content, setup, story sentences, characters, scenes, media defaults, export defaults, and `currentStage: "setup"` in [frontend/src/data/demoLesson.js](/Users/home/Documents/ChatGPT/class_generator/frontend/src/data/demoLesson.js:20). The default lesson factory defines the full frontend lesson shape in [frontend/src/data/createLesson.js](/Users/home/Documents/ChatGPT/class_generator/frontend/src/data/createLesson.js:3).

On component creation, `App` initializes lesson state from the bundled demo and initializes the active project id to `null`:

```js
const [lesson, setLesson] = useState(demoLesson);
const [activeProjectId, setActiveProjectId] = useState(null);
```

Those initializers are in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:86). `activeProjectIdRef` is only a React ref seeded from that state in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:122), and an effect mirrors `activeProjectId` into the ref in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:160).

Startup effects do not load a project. The only empty-dependency startup effect calls `/api/health` in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:134). Other effects mark save status, mirror refs, or check media readiness when the active stage requires it in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:154) and [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:164). Source search found `listProjects()` only inside `loadProjectList()` and `getProject()` only inside `openProject()`, not in a startup effect.

## Manual Project Flow

The frontend API wrapper maps project operations to backend endpoints: `listProjects()` calls `/api/projects`, `createProject()` posts to `/api/projects`, `getProject()` calls `/api/projects/:id`, `saveProject()` puts to `/api/projects/:id`, and `duplicateProject()` posts to `/api/projects/:id/duplicate` in [frontend/src/api/projects.js](/Users/home/Documents/ChatGPT/class_generator/frontend/src/api/projects.js:1).

`projectControls` wires the UI to the project handlers in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:250): new uses `requestNewLesson`, open panel uses `requestOpenProjectPanel`, refresh uses `loadProjectList`, open uses `requestOpenProject`, duplicate uses `requestDuplicateLesson`, and save uses `handleSaveLesson`. The sidebar renders those controls, including the active id or "Not saved yet", in [frontend/src/components/Sidebar.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/components/Sidebar.jsx:35), and renders saved projects from `projectControls.projectList` with manual open buttons in [frontend/src/components/Sidebar.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/components/Sidebar.jsx:135).

`createFreshProject()` creates a backend project, loads the returned lesson into React state, sets the active project id, marks the lesson saved, and refreshes the project list in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1066). `handleSaveLesson()` delegates to `saveCurrentLesson()` in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1087). `saveCurrentLesson()` normalizes and validates the current lesson, then either updates the active project or creates a new project before updating React state and the active id in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1099).

`requestOpenProjectPanel()` opens the saved lesson panel and then calls `loadProjectList()` in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1001). `loadProjectList()` calls the API `listProjects()` and stores the list in React state in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1181). `openProject(projectId)` is the only frontend helper that calls `getProject(projectId)`, then loads that lesson into React state and sets the active id in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1197). `duplicateCurrentProject()` calls `duplicateProject(sourceProjectId)`, loads the returned duplicated lesson, and sets the duplicate id active in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1217).

The helper that updates the active project id is `setActiveProjectIdAndRef(projectId)`. It writes only to `activeProjectIdRef.current` and React state via `setActiveProjectId(projectId)` in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1130). It does not write localStorage, sessionStorage, the URL, cookies, or a server session.

## Refresh And Reopen Behavior

A browser refresh recreates the React component, so `lesson` returns to `demoLesson` and `activeProjectId` returns to `null` from the initializers in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:86). Because unsaved edits exist only in React state until `saveCurrentLesson()` writes them through the API, unsaved in-browser changes are lost on refresh.

Saved project data survives refresh because the backend writes it to `lesson.json` and `meta.json` under the project directory in [server/src/services/projectStore.js](/Users/home/Documents/ChatGPT/class_generator/server/src/services/projectStore.js:196). After refresh, saved projects are still available through `GET /api/projects`, but the app does not call that route until the user opens or refreshes the saved lesson panel through `loadProjectList()` in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1181). The saved lesson itself returns only after a manual `openProject(projectId)` call in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1197).

The backend test suite proves the persistence contract directly. The project store test creates, lists, reads, updates, and then reads `lesson.json` from disk to assert the saved title in [server/test/projectStore.test.js](/Users/home/Documents/ChatGPT/class_generator/server/test/projectStore.test.js:72). Additional tests prove sentence order, stale state, scene references, approvals, duplication, and legacy locked-story migration survive save and open in [server/test/projectStore.test.js](/Users/home/Documents/ChatGPT/class_generator/server/test/projectStore.test.js:99).

## Missing Restoration Mechanisms

There is currently no automatic restoration mechanism for the active project:

- No startup call to `listProjects()` exists; `listProjects()` is only called by `loadProjectList()` in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1181).
- No startup call to `getProject()` exists; `getProject(projectId)` is only called by `openProject(projectId)` in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1197).
- No `localStorage`, `sessionStorage`, `window.location.search`, `location.search`, or `URLSearchParams` usage exists in `frontend/src` based on targeted source search.
- No backend session route or server-side active-project mechanism exists in the project routes; the backend routes expose project resources only in [server/src/routes/projects.js](/Users/home/Documents/ChatGPT/class_generator/server/src/routes/projects.js:14).

The active project id therefore lives only in React memory for the current browser session. It is displayed by the sidebar while present in [frontend/src/components/Sidebar.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/components/Sidebar.jsx:35), but it is not persisted outside the running app.

## Export-Phase Risk

Later export stages depend on a durable project id because media readiness, generated image assets, and export paths are project-scoped. The current behavior allows a user to save a project, refresh, and unknowingly return to the bundled demo lesson with no active project id. That can make export readiness appear disconnected from previously saved data until the user manually reopens the correct saved lesson.

Unsaved export, media, or story edits remain vulnerable to refresh loss because they are only in React state until saved. Saved project files survive, but the frontend does not automatically reconnect to them.

## Stage 2 Assumptions

- The Stage 2 restoration hook should be near `setActiveProjectIdAndRef(projectId)` in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:1130), because every successful create, save, open, and duplicate flow updates the active id through that helper.
- Startup restoration should be added deliberately to `App` startup behavior, near the existing startup health effect in [frontend/src/App.jsx](/Users/home/Documents/ChatGPT/class_generator/frontend/src/App.jsx:134), not hidden inside the API wrapper.
- If Stage 2 uses localStorage, it should persist only a project id or small restoration pointer, not a full lesson payload, so the backend project store remains the source of truth.
- If Stage 2 uses URL restoration, it should validate and load through the existing `getProject()` API path rather than bypassing `openProject()`-style normalization and validation.
- Restoration should preserve the current distinction between saved backend data and unsaved React-only edits. Stage 2 should not imply autosave unless that becomes a separate accepted scope.

## Out Of Scope

This baseline does not implement localStorage restoration, URL query restoration, autosave, export generation, account sync, auth, cloud storage, or any server-side session mechanism. It does not change runtime behavior.

## Verification

Source inspection commands run:

```sh
git status --short
rg -n "useState\\(demoLesson\\)|activeProjectId|setActiveProjectId|localStorage|sessionStorage|location\\.search|URLSearchParams|getProject\\(|listProjects\\(|createProject\\(|saveProject|duplicateProject|loadProjectList|openProject|saveCurrentLesson|setActiveProjectIdAndRef" frontend/src
rg -n "projectsDir|PROJECT_DATA_DIR|listProjects|createProject|getProject|updateProject|duplicateProject|writeProjectFiles|readProjectMetadata|createdAt|updatedAt" server/src
rg -n "localStorage|sessionStorage|location\\.search|URLSearchParams|useState\\(demoLesson\\)|activeProjectId" frontend/src/App.jsx frontend/src
rg -n "PROJECT_DATA_DIR|server/data/projects|writeProjectFiles|getLessonPath|getMetaPath" server/src/services/projectStore.js
```

The targeted restoration search found no `localStorage`, `sessionStorage`, `location.search`, or `URLSearchParams` matches in `frontend/src`; its matches were the demo lesson initializer, active project id state/ref usage, and manual project handlers.

Runtime tests passed after this documentation update:

```sh
npm run test --workspace server
# 115 tests, 115 passed

npm run test --workspace frontend
# 89 tests, 89 passed
```
