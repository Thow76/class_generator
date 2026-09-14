# Session Restoration Stage 1 Review Prompt

Use this prompt to review whether Stage 1 of the session restoration issue was completed correctly.

## Prompt

You are reviewing Stage 1 of the Lesson Source Builder session restoration work.

Stage 1 was intended to produce a baseline document only. It should confirm the current persistence and startup behavior before any implementation begins.

Your job is to verify that the Stage 1 baseline is accurate, evidence-backed, and limited to documentation. Review Stage 1 only. Do not implement session restoration, localStorage persistence, URL query restoration, autosave, export generation, auth, account sync, cloud storage, or later-stage behavior.

## Stage 1 Expected Output

The expected Stage 1 artifact is:

```text
docs/session-restoration-stage-1-baseline.md
```

The original handoff prompt is:

```text
docs/session-restoration-stage-1-baseline-prompt.md
```

The implementation is correct only if the baseline document proves these facts with current source references:

- Backend project persistence exists.
- Saved projects are stored under `PROJECT_DATA_DIR` or the fallback `server/data/projects`.
- Project folders contain persisted lesson data and metadata.
- The backend exposes project list/create/read/update/duplicate routes.
- The frontend initializes `lesson` from `demoLesson`.
- The frontend initializes `activeProjectId` as `null`.
- The frontend does not automatically reopen the last saved or opened project on startup.
- Manual project open/save/create/duplicate flows exist.
- Saved projects remain available after refresh and can be reopened manually.
- Unsaved in-browser React state is lost on refresh.
- The active project id is currently in memory only.
- No existing restoration mechanism uses `localStorage`, `sessionStorage`, URL query params, cookies, or server-side session state.
- Stage 1 did not change application runtime behavior.

## Files To Inspect

Inspect these files at minimum:

```text
docs/session-restoration-stage-1-baseline.md
docs/session-restoration-stage-1-baseline-prompt.md
frontend/src/App.jsx
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
frontend/src/data/demoLesson.js
frontend/src/data/createLesson.js
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

If the baseline cites additional files, inspect those cited files enough to verify the claims.

## Review Checks

1. Confirm `docs/session-restoration-stage-1-baseline.md` exists.
2. Confirm the document is about current behavior, not proposed implementation.
3. Confirm every major claim has a source file and line reference.
4. Confirm line references resolve to the claimed code in the current working tree.
5. Confirm backend persistence is described accurately.
6. Confirm `PROJECT_DATA_DIR` and the fallback project directory are described accurately.
7. Confirm project ids are constrained to safe `lesson-...` ids.
8. Confirm project creation creates project subdirectories for lesson assets and exports.
9. Confirm `lesson.json` and `meta.json` or their current equivalents are identified accurately.
10. Confirm metadata fields such as `id`, `title`, `theme`, `learnerLevel`, `currentStage`, `createdAt`, and `updatedAt` are described accurately.
11. Confirm project listing sorts or returns saved project metadata as described.
12. Confirm project routes are mounted under `/api/projects`.
13. Confirm list, create, read, update, and duplicate project routes are identified accurately.
14. Confirm frontend project API helpers map to the correct backend endpoints.
15. Confirm `App` initializes `lesson` from `demoLesson`.
16. Confirm `App` initializes `activeProjectId` to `null`.
17. Confirm the baseline identifies the startup health check without mistaking it for project restoration.
18. Confirm no startup effect currently calls `listProjects()` to restore an active lesson.
19. Confirm no startup effect currently calls `getProject()` to restore an active lesson.
20. Confirm manual open flows call `loadProjectList()` and `openProject(projectId)` or their current equivalents.
21. Confirm manual save/create/duplicate flows update the active project id through the existing helper or equivalent.
22. Confirm `setActiveProjectIdAndRef(projectId)` or equivalent writes only to React state/ref.
23. Confirm the baseline accurately states that active project id is not persisted outside memory.
24. Confirm targeted search finds no active restoration usage of `localStorage`, `sessionStorage`, `URLSearchParams`, or `window.location.search` in frontend startup behavior.
25. Confirm the baseline distinguishes unsaved in-memory edits from saved backend project data.
26. Confirm the export-phase risk is explained without drifting into export implementation.
27. Confirm Stage 2 assumptions are precise and useful.
28. Confirm out-of-scope items are listed and were respected.
29. Confirm Stage 1 did not modify frontend or backend runtime files unless the repository history clearly shows only documentation was intended.
30. Confirm tests reported in the baseline were actually run or that skipped tests are honestly documented.

## Commands To Run

Start with status and file inspection:

```sh
git status --short
sed -n '1,260p' docs/session-restoration-stage-1-baseline.md
sed -n '1,260p' docs/session-restoration-stage-1-baseline-prompt.md
```

Verify source claims:

```sh
rg -n "useState\\(demoLesson\\)|activeProjectId|setActiveProjectId|activeProjectIdRef|loadProjectList|openProject|saveCurrentLesson|setActiveProjectIdAndRef" frontend/src/App.jsx
rg -n "localStorage|sessionStorage|window\\.location|location\\.search|URLSearchParams|history\\.replaceState|history\\.pushState|document\\.cookie" frontend/src
rg -n "listProjects\\(|createProject\\(|getProject\\(|saveProject\\(|duplicateProject\\(" frontend/src/api/projects.js frontend/src/App.jsx
rg -n "projectsDir|PROJECT_DATA_DIR|getProjectDataDirectory|getProjectPath|createProject|listProjects|getProject|updateProject|duplicateProject|writeProjectFiles|getLessonPath|getMetaPath" server/src/services/projectStore.js
rg -n "projectsRouter|/api/projects" server/src/index.js server/src/routes/projects.js
```

Run tests if the environment allows:

```sh
npm run test --workspace server
npm run test --workspace frontend
```

Optional manual QA if the source evidence is ambiguous:

```sh
npm run dev
```

Then verify in the browser:

```text
http://127.0.0.1:5173/
```

Manual QA should check only current behavior:

- App initially shows the demo lesson if no saved project is manually opened.
- Saving creates or updates a project on disk.
- Unsaved in-browser edits disappear after refresh.
- Saved projects remain listed and can be reopened manually.
- The app does not automatically reopen the last saved project after refresh.

## Findings Guidance

Use a code-review style response.

Lead with findings, ordered by severity. Use exact file and line references. A finding should be opened if:

- The baseline document is missing.
- The baseline omits a required Stage 1 fact.
- A cited line does not support the claim.
- The document says restoration exists when it does not.
- The document says restoration does not exist when source code shows it does.
- Runtime files were changed for Stage 1.
- The baseline confuses saved backend persistence with automatic frontend restoration.
- The baseline does not distinguish unsaved React state from saved project data.
- Tests or manual QA are misreported.

If no issues are found, say that clearly and mention any residual risk, such as manual QA not being performed.

## Acceptance Criteria

Stage 1 passes review only if:

- `docs/session-restoration-stage-1-baseline.md` exists.
- It matches the original Stage 1 handoff scope.
- It is source-backed with current line references.
- It accurately documents backend disk persistence.
- It accurately documents frontend demo-first startup.
- It accurately documents manual open/save/create/duplicate flows.
- It confirms no automatic session restoration currently exists.
- It confirms no active project id persistence currently exists.
- It accurately states refresh behavior for saved and unsaved data.
- It identifies useful Stage 2 hook points.
- It reports verification commands and results honestly.
- It does not include or accompany runtime behavior changes.

## Expected Final Response

Return:

- Findings first, with severity and file/line references.
- Open questions or assumptions.
- Brief verification summary.
- Brief final verdict: pass or needs remediation.

Keep the response focused on Stage 1. Do not propose or implement Stage 2 unless explicitly asked afterward.
