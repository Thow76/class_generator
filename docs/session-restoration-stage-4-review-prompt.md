# Session Restoration Stage 4 Review Prompt

Use this prompt to review whether Stage 4 of the session restoration issue was implemented correctly.

## Prompt

You are reviewing Stage 4 of the Lesson Source Builder session restoration work.

Stage 4 was intended to add URL-based project restoration and URL synchronization on top of the accepted Stage 3 localStorage restoration. Review Stage 4 only. Do not implement fixes unless explicitly asked afterward.

The Stage 4 contract is:

- URL `project` query parameter is a restoration source.
- URL `project` takes precedence over localStorage.
- localStorage remains the fallback when no URL project is present.
- Successful active-project changes synchronize the URL with `history.replaceState`.
- localStorage still stores only a project id pointer.
- No autosave, backend API changes, export generation, auth, account sync, cloud sync, or server-side session mechanism is introduced.

## Expected Files

Inspect these files at minimum:

```text
docs/session-restoration-stage-4-url-prompt.md
docs/session-restoration-stage-2-restore-rules.md
docs/session-restoration-stage-3-review-prompt.md
frontend/src/App.jsx
frontend/src/utils/projectSessionStorage.js
frontend/src/utils/projectSessionUrl.js
frontend/test/projectSessionStorage.test.js
frontend/test/projectSessionUrl.test.js
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
server/src/services/projectStore.js
server/src/routes/projects.js
package.json
frontend/package.json
server/package.json
```

If the implementation uses different file names, inspect the equivalent files. If URL helper files are missing, treat that as a likely finding unless equivalent tested URL behavior exists elsewhere.

## Required Behavior To Verify

Stage 4 passes only if:

- Startup safely reads `project` from the URL before reading localStorage.
- A valid-looking URL project id is loaded through the existing project API, normally `getProject(projectId)`.
- URL restore success normalizes and validates the loaded lesson before applying it.
- URL restore success sets `lesson`, `activeProjectId`, `activeProjectIdRef`, `saveStatus`, transient state, media readiness, and project errors consistently with manual open.
- URL restore success writes `lessonSourceBuilder:lastProjectId` to the restored project id.
- URL project id wins when localStorage points to a different valid project.
- Failed URL restore does not silently open a different localStorage project.
- Malformed URL project values do not call the backend.
- Failed or malformed URL restore leaves the failed URL visible.
- No-URL startup still uses Stage 3 localStorage restoration.
- Stage 3 localStorage failure behavior remains intact.
- Successful create, save, open, duplicate, localStorage restore, URL restore, and server-applied project updates synchronize the URL to the active project id.
- URL sync uses `history.replaceState`, not `history.pushState`.
- URL sync preserves unrelated query parameters where practical.
- URL sync preserves hash fragments where practical.
- URL sync avoids repeated writes when the URL already has the correct project id.
- URL handling does not create an infinite startup/render loop.
- Project and stage actions remain disabled during startup/project loading.
- The editable demo stage is not shown while startup restoration is pending.
- localStorage stores only the project id string, never full lesson data.
- Backend storage format and project API contracts are unchanged.

## URL Helper Review Checks

Review `frontend/src/utils/projectSessionUrl.js` or equivalent.

Confirm:

1. The URL query parameter name is exactly `project`.
2. URL parsing uses `URLSearchParams` or an equivalent safe structured parser.
3. Search with no `project` returns no candidate.
4. `?project=lesson-20260911-102000-ab12cd34` returns a valid candidate.
5. Multiple `project` params use the first value.
6. Unrelated query params are ignored for restore selection.
7. Malformed project ids are detected distinctly from absent project ids.
8. Malformed project ids are not returned as restorable project ids.
9. Empty project values have a documented and tested behavior.
10. Location access failures do not throw.
11. URL building adds `project` when missing.
12. URL building replaces an existing `project` value.
13. URL building preserves unrelated query parameters.
14. URL building preserves hash fragments.
15. Invalid project ids are rejected or no-op during URL sync.
16. URL sync calls `history.replaceState`.
17. URL sync does not call `history.pushState`.
18. URL sync does not throw when browser APIs are missing or throw.
19. URL sync avoids writing when the current URL already matches.
20. URL validation reuses `isLikelySafeProjectId()` or otherwise stays consistent with Stage 3 validation.

## App Integration Review Checks

Review `frontend/src/App.jsx` or equivalent.

Confirm:

1. The startup restore path checks URL before localStorage.
2. The startup restore path branches clearly between URL candidate, malformed URL candidate, and no URL candidate.
3. Valid URL candidates are loaded with `getProject(projectId)` or the existing project API.
4. Malformed URL candidates do not call `getProject()`.
5. Failed URL loads do not fall back to localStorage.
6. URL restore failures use a URL-specific user-facing error.
7. Malformed URL values use a clear invalid-id error.
8. Failed/malformed URL paths do not mutate the browser URL.
9. Failed URL restore does not clear unrelated localStorage unless intentionally and safely limited to the same stale id.
10. No-URL startup preserves the Stage 3 localStorage restore behavior.
11. localStorage restore success now syncs the URL to the restored project id.
12. Manual create/save/open/duplicate success syncs the URL to the active project id.
13. Server-applied project updates still keep localStorage and URL in sync.
14. `setActiveProjectIdAndRef(projectId)` or equivalent writes localStorage and syncs URL only for valid project ids.
15. Invalid or null project ids are not written to localStorage and are not synced to the URL.
16. The app does not sync the URL before backend create/save/open/restore succeeds.
17. The restore effect has cancellation/unmount guards.
18. Every startup path exits loading state.
19. Project action loading guards from Stage 3 remain intact.
20. Stage rendering/loading panel guard from Stage 3 remains intact.
21. Existing health check behavior remains independent.

## Failure Cases To Probe

Open findings for any of these:

- URL restore runs after localStorage restore instead of before it.
- URL restore and localStorage restore race each other.
- URL restore failure silently opens the last localStorage project.
- Malformed URL ids are sent to the backend.
- Failed URL restore replaces or clears the URL.
- URL sync uses `pushState`.
- URL sync drops unrelated query params or hash fragments without a documented reason.
- URL sync writes on every render or creates a loop.
- URL sync writes invalid/null ids.
- localStorage stores full lesson JSON or rich payloads.
- Stage 3 loading guards regress.
- Backend project routes or storage format change unnecessarily.

## Commands To Run

Start with status and source inspection:

```sh
git status --short
sed -n '1,420p' docs/session-restoration-stage-4-url-prompt.md
sed -n '1,260p' frontend/src/utils/projectSessionUrl.js
sed -n '1,280p' frontend/test/projectSessionUrl.test.js
sed -n '140,230p' frontend/src/App.jsx
sed -n '1270,1345p' frontend/src/App.jsx
```

Inspect URL and localStorage integration:

```sh
rg -n "projectQueryParam|readProjectIdFromSearch|getProjectRestoreCandidateFromUrl|buildUrlWithProjectId|replaceUrlProjectId|URLSearchParams|history\\.replaceState|history\\.pushState|window\\.location|location\\.search|\\?project|source === \"url\"|source === 'url'" frontend/src frontend/test
rg -n "lessonSourceBuilder:lastProjectId|lastProjectStorageKey|readLastProjectId|writeLastProjectId|clearLastProjectId|isLikelySafeProjectId|localStorage" frontend/src frontend/test
rg -n "setActiveProjectIdAndRef|restoreSavedProject|restoreStartupProject|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject|applyServerLesson|isProjectLoading|loadStatus === \"loading\"" frontend/src/App.jsx frontend/src/components
```

Check for forbidden payloads or scope creep:

```sh
rg -n "JSON\\.stringify\\(lesson|JSON\\.stringify\\(.*lesson|localStorage\\.setItem|setItem\\([^,]+,\\s*JSON|IndexedDB|indexedDB|firebase|auth|login|account|cloud|session" frontend/src frontend/test server/src package.json frontend/package.json server/package.json
rg -n "archiver|JSZip|zip|PowerPoint|pptx|worksheet|audio|video|ElevenLabs|firebase|auth|login|account" frontend server package.json docs
```

Run verification:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If any command cannot run, state exactly why.

## Manual QA Checklist

Manual browser QA is strongly recommended because Stage 4 is startup and URL behavior.

Run:

```sh
npm run dev
```

Then verify:

1. Clear localStorage and open `http://127.0.0.1:5173/`.
2. Confirm the app starts with the demo lesson.
3. Create or save a lesson.
4. Confirm the URL changes to `?project=<project-id>`.
5. Confirm localStorage contains only `lessonSourceBuilder:lastProjectId` with the project id.
6. Refresh and confirm the URL project restores.
7. Open a different saved lesson and confirm URL/localStorage update.
8. Duplicate a lesson and confirm URL/localStorage update to the duplicate id.
9. Set localStorage to project A and open `/?project=<project-B>`.
10. Confirm project B opens and localStorage updates to project B.
11. Open `/?project=lesson-does-not-exist-but-valid-shape`.
12. Confirm the app shows a clear URL restore error.
13. Confirm the localStorage project is not opened after URL failure.
14. Confirm the failed URL remains in the address bar.
15. Open `/?project=../lesson-bad`.
16. Confirm no backend project load is attempted for the malformed id, if visible in network/logs.
17. Confirm the app falls back to demo and shows a clear invalid URL id error.
18. Remove the URL project param and set localStorage to a valid saved id.
19. Refresh and confirm localStorage restore still works and syncs the URL.
20. Confirm Save and Duplicate are disabled while startup restore is loading.
21. Confirm editable demo content is not shown while startup restore is loading.
22. Confirm New/Open/Duplicate/Save work after restore success and failure.

## Test Review Checks

Review `frontend/test/projectSessionUrl.test.js` or equivalent.

Confirm tests cover:

- exact query param name `project`;
- no-candidate search;
- valid candidate search;
- malformed candidate search;
- empty project behavior;
- multiple project params using the first value;
- preserving unrelated query params;
- preserving hash fragments;
- replacing existing project param;
- adding missing project param;
- invalid id no-op/rejection;
- safe behavior when location or history access throws;
- `replaceState` usage;
- no `pushState` usage;
- no redundant write when URL already matches.

If App startup tests are absent, do not fail solely for that if the repo lacks a practical React mount harness, but note the manual QA risk.

## Findings Guidance

Use a code-review style response.

Lead with findings, ordered by severity. Include exact file and line references. A finding should be opened if:

- URL helper or equivalent URL implementation is missing.
- URL restore does not take precedence over localStorage.
- URL restore failure falls through to localStorage.
- Malformed URL candidates call the backend.
- URL sync uses `pushState`.
- URL sync runs before project persistence succeeds.
- URL sync drops unrelated query/hash state unexpectedly.
- localStorage-only Stage 3 behavior regresses when no URL param is present.
- Stage 3 storage safety or loading guards regress.
- Full lesson data is stored in browser storage.
- Backend project API/storage behavior changed without need.
- Tests do not cover URL helper behavior.
- Verification or manual QA results are misreported.

If no issues are found, say that clearly and mention residual risk, especially if manual browser QA was skipped.

## Acceptance Criteria

Stage 4 passes review only if:

- URL helper functions exist and are tested, or equivalent tested URL behavior exists.
- URL query parameter name is exactly `project`.
- Startup reads URL `project` before localStorage.
- Valid URL project ids restore through the existing backend project API.
- URL restore success updates app state like manual open.
- URL restore success writes localStorage to the restored project id.
- URL restore failure does not fall through to a different localStorage project.
- Malformed URL project values do not call the backend.
- Failed/malformed URL restore leaves the failed URL visible.
- No-URL startup still uses Stage 3 localStorage restoration.
- Successful active-project transitions sync the URL with `history.replaceState`.
- URL sync preserves unrelated query params and hashes where practical.
- URL sync avoids history spam and infinite loops.
- localStorage still stores only a project id pointer.
- No autosave is introduced.
- No backend project storage or API contract changes are introduced.
- Frontend tests pass.
- Server tests pass.
- Frontend build passes.

## Expected Final Response

Return:

- Findings first, with severity and file/line references.
- Open questions or assumptions.
- Verification commands run and results.
- Manual QA performed or skipped.
- Brief final verdict: pass or needs remediation.

Keep the response focused on Stage 4. Do not implement fixes unless explicitly asked afterward.
