# Session Restoration Stage 8 Review Prompt

Use this prompt to review whether Stage 8, URL Project Support, was implemented correctly.

## Prompt

You are reviewing Stage 8 of the Lesson Source Builder session restoration work.

Stage 8 was intended to make project URLs first-class while the app is already open: saved lessons should expose direct project URL actions, browser back/forward should respond to `?project=...` changes, and URL-driven project switches should respect unsaved-change confirmation. Review Stage 8 only. Do not implement fixes unless explicitly asked afterward.

The Stage 8 contract is:

- Startup restore behavior from Stages 4 and 7 remains intact.
- Saved lessons expose project URL actions.
- Project URL generation uses the existing `project` query parameter.
- Browser back/forward URL project changes are handled while the app is open.
- URL-driven project switching respects unsaved-change confirmation.
- Cancelling a URL-driven switch repairs the URL back to the current active project when possible.
- Malformed/missing URL projects are handled safely without fallback surprises.
- Removing `?project` while the app is open does not trigger localStorage restore or auto-reopen.
- URL handling avoids infinite loops with automatic URL sync.
- Backend API/storage scope remains unchanged.

## Expected Files

Inspect these files at minimum:

```text
docs/session-restoration-stage-8-url-project-support-prompt.md
docs/session-restoration-stage-7-review-prompt.md
docs/session-restoration-stage-6-review-prompt.md
docs/session-restoration-stage-5-review-prompt.md
docs/session-restoration-stage-4-review-prompt.md
frontend/src/App.jsx
frontend/src/components/Sidebar.jsx
frontend/src/utils/projectSessionUrl.js
frontend/src/utils/projectUrlNavigation.js
frontend/test/projectSessionUrl.test.js
frontend/test/projectUrlNavigation.test.js
frontend/src/utils/projectSessionStorage.js
frontend/test/projectSessionStorage.test.js
frontend/src/utils/projectAutoReopen.js
frontend/test/projectAutoReopen.test.js
frontend/src/api/projects.js
server/src/routes/projects.js
server/src/services/projectStore.js
package.json
frontend/package.json
server/package.json
```

If the implementation uses different file names, inspect the equivalent files.

## Required Behavior To Verify

Stage 8 passes only if:

- Full page reload with `?project=<valid-id>` still follows Stage 4 startup URL restore.
- Full page reload with no URL/localStorage still follows Stage 7 auto-reopen.
- Saved lessons in the Open panel expose direct project URL actions.
- Project URL actions are unavailable for invalid project ids.
- Project URL generation preserves unrelated query params and hash fragments where practical.
- Copy project link uses a safe URL built by the URL helper, not ad hoc string concatenation.
- Copy project link handles unavailable or throwing clipboard APIs safely.
- Browser `popstate` listener is registered and cleaned up on unmount.
- Browser back/forward to a different valid project id triggers a project open.
- Browser back/forward to the active project id is a no-op and does not call the backend.
- Browser back/forward to a URL with no `project` param does not restore localStorage, does not auto-reopen, and does not clear the active lesson.
- Browser back/forward to malformed `project` shows the invalid URL project error and does not call the backend.
- Browser back/forward to a valid-looking missing project shows a safe URL-project error and does not fall back to localStorage or auto-reopen.
- URL-driven project opens use the existing `getProject(projectId)` path and normalize/validate the lesson.
- URL-driven project opens apply the same state as manual open.
- URL-driven project opens write localStorage and keep/sync the URL.
- URL-driven project opens clear stale restore issue/project error state on success.
- Unsaved changes cause URL-driven project opens to create a pending confirmation instead of immediately switching.
- Confirming the pending URL open opens the requested project.
- Cancelling the pending URL open repairs the URL to the current active project id when possible.
- Cancelling the pending URL open clears/removes `project` when there is no valid active project id.
- URL handling does not create replaceState/popstate loops.
- Stale async URL-open responses cannot overwrite newer active project state.
- Stage 5 clear-invalid-restore behavior remains wired.
- Stage 6 project-list state remains separate from full project `loadStatus`.
- Stage 7 auto-reopen still happens only at startup when no URL/localStorage pointer exists.
- Browser storage remains pointer-only.
- Backend routes/storage format are unchanged.

## URL Helper Review Checks

Review `frontend/src/utils/projectSessionUrl.js` and tests.

Confirm:

1. `buildProjectUrl()` or equivalent exists.
2. It uses `project` as the query parameter name.
3. It adds `project=<id>` for valid project ids.
4. It replaces an existing `project` param.
5. It preserves unrelated query params.
6. It preserves hash fragments.
7. It returns app-relative output for app-relative inputs.
8. It rejects or no-ops invalid project ids.
9. It does not throw on missing/throwing browser APIs.
10. Existing helpers for startup restore, replace sync, and clear URL still behave as before.
11. Automatic URL sync still uses `history.replaceState`.
12. `history.pushState` is used only if explicitly justified for a user-initiated project-link navigation action.

## URL Navigation Helper Review Checks

Review `frontend/src/utils/projectUrlNavigation.js` and tests.

Confirm:

1. No URL `project` returns a no-op decision.
2. Malformed URL `project` returns an invalid-url decision.
3. URL `project` equal to active project returns a no-op decision.
4. Different URL `project` with no unsaved changes returns an open decision.
5. Different URL `project` with unsaved changes returns a confirm-open decision.
6. Cancel URL repair rebuilds a URL for the active project when there is a valid active id.
7. Cancel URL repair removes `project` when there is no valid active id.
8. Decision logic does not call backend APIs or mutate browser state.
9. Decision logic reuses existing URL parsing and project-id validation helpers.

## App Integration Review Checks

Review `frontend/src/App.jsx` or equivalent.

Confirm:

1. A `popstate` listener is installed once and removed on cleanup.
2. The listener delegates to current refs/state to avoid stale closure bugs.
3. The listener reads the current URL via the helper/decision function.
4. The no-project decision does not open another project.
5. The current-project decision does not call `getProject()`.
6. The malformed-project decision sets a safe URL restore error and does not call `getProject()`.
7. The open decision calls the project open path with source `"url"` or equivalent.
8. The confirm-open decision stores a pending URL-open action.
9. Pending URL-open confirmation opens the requested project.
10. Pending URL-open cancellation repairs the URL through `replaceState`.
11. URL-open failure uses a safe URL-specific error.
12. Successful URL-open clears restore issue and project error state.
13. URL-open does not fall back to localStorage or auto-reopen on failure.
14. `replaceUrlProjectId()` remains the common success-path URL sync for active project transitions.
15. URL handling is guarded by operation/loading checks where necessary.
16. URL handling does not bypass existing unsaved-change protections.

## Sidebar/UI Review Checks

Review `frontend/src/components/Sidebar.jsx` or equivalent.

Confirm:

1. Saved lesson rows keep their primary Open behavior.
2. A copy-link action is visible and keyboard-accessible.
3. An open-project-link action is visible and keyboard-accessible if implemented.
4. Icon buttons have useful `aria-label` and `title` text.
5. Link actions are disabled for invalid/unavailable project URLs.
6. Link actions are disabled during full project loading if they would trigger navigation.
7. Copy-link failure appears as a concise safe list/project error.
8. The saved lesson row layout remains stable and text does not overflow awkwardly.

## Test Review Checks

Review frontend tests.

Confirm tests cover:

- `buildProjectUrl()` helper behavior for valid ids.
- Replacement of existing `project`.
- Preservation of unrelated params and hash.
- App-relative output.
- Invalid ids.
- URL navigation no-op for absent project.
- URL navigation invalid-url for malformed project.
- URL navigation no-op for active project.
- URL navigation open for different saved project.
- URL navigation confirm-open when unsaved changes exist.
- Cancel URL repair to active project.
- Cancel URL repair with no active project.

If app-level popstate/copy-link behavior is not automated, note that residual risk and rely on manual QA.

## Failure Cases To Probe

Open findings for any of these:

- Copy/open project links are built with ad hoc string concatenation.
- Project links drop unrelated query params or hash fragments unexpectedly.
- `popstate` listener is not cleaned up.
- Back/forward to no `project` triggers localStorage restore or auto-reopen.
- Back/forward to malformed project calls the backend.
- Back/forward to the current active project reloads it unnecessarily.
- URL-open with unsaved edits bypasses confirmation.
- Cancelling URL-open leaves the URL pointing at the unconfirmed project.
- Confirming URL-open does not open the requested project.
- URL-open failure falls back to localStorage or auto-reopen.
- URL handling creates a loop with `replaceState`.
- URL-open stale async response can overwrite a newer active project.
- Stage 5 clear invalid restore no longer works.
- Stage 6 project-list loading regresses into global loading.
- Stage 7 auto-reopen runs after in-app URL removal.
- Browser storage stores full lesson JSON or rich payloads.
- Backend API/storage changed unnecessarily.

## Commands To Run

Start with source inspection:

```sh
git status --short
sed -n '1,412p' docs/session-restoration-stage-8-url-project-support-prompt.md
sed -n '1,220p' frontend/src/utils/projectSessionUrl.js
sed -n '1,220p' frontend/src/utils/projectUrlNavigation.js
sed -n '1,360p' frontend/test/projectSessionUrl.test.js
sed -n '1,220p' frontend/test/projectUrlNavigation.test.js
sed -n '330,390p' frontend/src/App.jsx
sed -n '1370,1475p' frontend/src/App.jsx
sed -n '1488,1558p' frontend/src/App.jsx
sed -n '1558,1665p' frontend/src/App.jsx
sed -n '205,290p' frontend/src/components/Sidebar.jsx
```

Inspect symbols and scope:

```sh
rg -n "popstate|addEventListener\\(|removeEventListener\\(|buildProjectUrl|getProjectUrl|onCopyProjectLink|onOpenProjectLink|url-open|projectQueryParam|buildUrlWithProjectId|getProjectRestoreCandidateFromUrl|replaceUrlProjectId|clearUrlProjectId|decideProjectUrlNavigation|buildUrlForCancelledProjectNavigation" frontend/src frontend/test
rg -n "history\\.pushState|history\\.replaceState|navigator\\.clipboard|clipboard|localStorage\\.setItem|JSON\\.stringify\\(lesson|setItem\\([^,]+,\\s*JSON" frontend/src frontend/test
rg -n "router\\.get\\(\"/\"|router\\.get\\(\"/:id\"|listProjects\\(|getProject\\(" server/src frontend/src
```

Run verification:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

If any command cannot run, state exactly why.

## Manual QA Checklist

Manual browser QA is strongly recommended because Stage 8 is browser-history and clipboard behavior.

Run:

```sh
npm run dev
```

Then verify:

1. Open the app with no URL project and confirm Stage 7 startup behavior still works.
2. Open the saved lessons panel.
3. Confirm saved lessons expose a project URL/copy action.
4. Copy a project link and confirm it contains `?project=<id>`.
5. Paste the copied link into a new tab and confirm startup URL restore opens that project.
6. Use the in-app project link/open action for another saved lesson and confirm it opens.
7. Use browser Back/Forward between two project URLs and confirm the active lesson changes accordingly.
8. Navigate to the active project URL and confirm no extra load or error occurs.
9. Navigate to `/?project=../bad` while the app is open and confirm no backend project load occurs.
10. Navigate to `/?project=lesson-valid-shape-but-missing` while the app is open and confirm a safe URL-project error appears.
11. Make unsaved edits, then navigate to a different project URL.
12. Confirm the app asks before discarding unsaved changes.
13. Cancel the prompt and confirm the URL returns to the active project id.
14. Repeat and confirm the prompt; confirm the requested project opens.
15. Remove `?project` from the URL through browser navigation and confirm the app does not auto-open another lesson or clear the current lesson.
16. Confirm Stage 5 clear invalid restore still works.
17. Confirm Stage 6 Open panel loading/error/list states still work.
18. Confirm Stage 7 auto-reopen still only happens on startup with no URL/localStorage pointer.

If manual QA is not run, state that explicitly.

## Report Format

Return findings first, ordered by severity:

```text
**Findings**

- [P1] [file (line N)](...): Description of the bug, why it violates Stage 8, and the likely user impact.
- [P2] ...
```

Then include:

```text
**Checks**

- URL helper behavior:
- URL navigation decision behavior:
- App popstate integration:
- Sidebar project link UI:
- Stage 5/6/7 regression scope:
- Storage/backend scope:

**Verification**

- `npm run test --workspace frontend`: passed/failed/not run
- `npm run test --workspace server`: passed/failed/not run
- `npm run build --workspace frontend`: passed/failed/not run
- Manual browser QA: run/not run, with notes
```

If there are no findings, say that clearly and mention residual manual-QA or app-level test gaps.
