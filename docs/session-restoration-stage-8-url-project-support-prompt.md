# Session Restoration Stage 8 URL Project Support Prompt

Use this prompt to implement Stage 8 of the Lesson Source Builder session restoration work.

## Prompt

You are implementing Stage 8: URL Project Support.

Earlier stages added startup restoration and URL synchronization:

- Stage 3: localStorage last-project restoration.
- Stage 4: startup `?project=...` restoration and automatic URL sync.
- Stage 5: clear invalid URL restore state.
- Stage 6: startup saved-project list loading.
- Stage 7: auto-reopen the most recent saved lesson when no URL/localStorage pointer exists.

Stage 8 should make project URLs feel first-class while the app is already open. A project URL should not be useful only on full page reload; users should be able to copy, share, open, and navigate between project URLs with predictable behavior.

Do not implement autosave, export generation, project deletion, auth, account sync, cloud sync, backend API changes, server-side sessions, or full lesson snapshots in browser storage.

## Stage 8 Goal

Add in-app support for project URLs:

```text
/?project=lesson-...
```

The app should:

- Expose project URLs in the saved lessons UI so users can copy or open direct links.
- Handle browser back/forward navigation when the `project` query parameter changes.
- Open a project when the current URL changes to a different valid `project` id.
- Preserve existing unsaved-change confirmation behavior before switching projects.
- Preserve Stage 4 startup restore precedence and Stage 7 auto-reopen fallback.
- Keep URL mutation safe, predictable, and based on `history.replaceState` for automatic sync.

This is not a routing-framework migration. Keep the implementation small and consistent with the existing React/Vite app.

## Definitions

Project URL:

```text
/?project=<project-id>
```

URL project support in Stage 8 means:

- Building project URLs safely.
- Copying/opening project URLs from UI.
- Responding to browser URL changes after startup.
- Keeping app state and URL state consistent after confirmed project navigation.

It does not mean:

- Adding account-based sharing.
- Making backend project files public beyond the local app.
- Adding cloud collaboration.
- Adding autosave or conflict resolution for unsaved edits.
- Changing backend project routes.

## Required Behavior

Stage 8 is complete only if:

- Startup restore behavior from Stages 4 and 7 remains intact.
- Saved lessons in the Open panel expose a direct project URL action.
- Direct project URL generation uses the existing `project` query parameter.
- Direct project URL generation preserves the current app path where practical.
- Direct project URL generation preserves unrelated query params and hash fragments where practical, replacing only `project`.
- Copy/open project URL actions only use valid-looking project ids.
- Copy/open project URL actions do not store lesson content in browser storage.
- Browser back/forward navigation is handled when `window.location.search` changes.
- If browser navigation changes `project` to a different valid id, the app attempts to open that project.
- If browser navigation changes `project` to the active project id, no network request is made.
- If browser navigation removes `project`, the app does not auto-open a different project or clear the active lesson.
- If browser navigation changes `project` to a malformed value, the app shows the existing invalid URL restore error style and does not call the backend.
- If browser navigation changes `project` to a valid-looking missing project, the app shows a safe URL-project error and does not fall back to localStorage or auto-reopen.
- URL-initiated project switches respect unsaved-change confirmation.
- Cancelling an unsaved-change prompt restores the URL back to the current active project id when possible.
- Confirming an unsaved-change prompt opens the URL-requested project.
- Successful URL-initiated open applies the same state as manual open.
- Successful URL-initiated open writes localStorage and keeps/syncs the URL to the opened project id.
- URL handling does not create infinite loops with automatic `replaceState` URL sync.
- URL handling is guarded against stale async responses and unmounted state updates.
- Stage 5 clear invalid restore behavior still works.
- Stage 6 project-list loading remains list-specific and separate from full project load state.
- Stage 7 auto-reopen still runs only at startup when no explicit URL/localStorage pointer exists.
- Backend API/storage scope remains unchanged.

## Source Context To Read First

Read these files before editing:

```text
docs/session-restoration-stage-4-review-prompt.md
docs/session-restoration-stage-5-review-prompt.md
docs/session-restoration-stage-6-review-prompt.md
docs/session-restoration-stage-7-review-prompt.md
frontend/src/App.jsx
frontend/src/components/Sidebar.jsx
frontend/src/api/projects.js
frontend/src/utils/projectSessionStorage.js
frontend/src/utils/projectSessionUrl.js
frontend/test/projectSessionStorage.test.js
frontend/test/projectSessionUrl.test.js
frontend/src/utils/projectAutoReopen.js
frontend/test/projectAutoReopen.test.js
server/src/routes/projects.js
server/src/services/projectStore.js
package.json
frontend/package.json
server/package.json
```

If equivalent code has moved, inspect the moved files instead.

## Commands To Run Before Editing

Use these commands to ground the implementation:

```sh
git status --short
sed -n '1,220p' frontend/src/utils/projectSessionUrl.js
sed -n '1,340p' frontend/test/projectSessionUrl.test.js
sed -n '185,320p' frontend/src/App.jsx
sed -n '1200,1360p' frontend/src/App.jsx
sed -n '1460,1545p' frontend/src/App.jsx
sed -n '160,230p' frontend/src/components/Sidebar.jsx
rg -n "popstate|addEventListener|removeEventListener|replaceState|pushState|projectQueryParam|buildUrlWithProjectId|clearUrlProjectId|getProjectRestoreCandidateFromUrl|pendingProjectAction|requestOpenProject|openProject|hasUnsavedLessonChanges|discardUnsavedChangesMessage" frontend/src frontend/test
```

## Implementation Guidance

### 1. Extend URL Helper Support

Update `frontend/src/utils/projectSessionUrl.js` or add a nearby URL utility if needed.

Existing helpers likely include:

```js
buildUrlWithProjectId(currentHrefOrLocation, projectId)
replaceUrlProjectId(projectId, windowLike)
clearUrlProjectId(windowLike)
getProjectRestoreCandidateFromUrl(location)
```

Stage 8 may need helpers such as:

```js
export function buildProjectUrl(projectId, currentHrefOrLocation = getDefaultLocation()) {
  // Return current path/search/hash with project=<projectId>.
}

export function readProjectIdFromLocation(location = getDefaultLocation()) {
  // Alias or wrapper around getProjectRestoreCandidateFromUrl.
}

export function getCurrentUrlProjectId(location = getDefaultLocation()) {
  // Return valid project id or null.
}
```

Do not duplicate validation logic. Reuse `isLikelySafeProjectId()`.

Helper rules:

- Preserve unrelated query params.
- Preserve hash fragments.
- Replace existing `project` param.
- Return app-relative URLs for app-relative inputs.
- No-op or return original URL for invalid ids.
- Do not throw on missing/throwing browser APIs.
- Keep `replaceState` in controlled helper code.
- Do not use `pushState` for automatic app state sync.

### 2. Add Project URL Actions In Saved Lessons UI

Update `frontend/src/components/Sidebar.jsx` or equivalent saved-project list UI.

Each saved lesson item should offer a project URL action without disrupting the existing Open behavior.

Acceptable UI options:

- A compact icon button to copy the project link.
- A compact icon button or anchor to open the project URL.
- A contextual link action if it fits the existing UI style.

Recommended project controls:

```js
projectControls.onCopyProjectLink(project.id)
projectControls.getProjectUrl(project.id)
```

or equivalent.

Rules:

- Keep the primary project-list item action as opening the project.
- Do not make text overflow or layout shift inside saved lesson rows.
- Do not expose invalid project ids as links.
- Disable copy/open-link actions while full project loading is active if they would trigger app navigation.
- Copy action should use `navigator.clipboard.writeText()` when available and degrade gracefully if unavailable.
- If clipboard copy fails, show a concise safe project/list error.
- Link action should preserve unsaved-change protections if it opens inside the app.

Do not add verbose explanatory UI text.

### 3. Handle Browser Back/Forward URL Changes

Add a `popstate` listener or equivalent browser URL-change handling in `frontend/src/App.jsx`.

Required behavior:

1. On `popstate`, read the URL project candidate.
2. If no `project` param exists, do not auto-open localStorage or auto-reopen. Keep the current active lesson unless product UI explicitly says otherwise.
3. If `project` is malformed, show the same invalid URL restore style used by startup, do not call backend, and do not mutate localStorage.
4. If `project` is valid and equals the current active project id, do nothing.
5. If `project` is valid and different from active project id, request a URL-driven project open.
6. If there are unsaved changes, show the existing discard confirmation before switching.
7. If the user confirms, open the URL project.
8. If the user cancels, restore the URL back to the active project id when possible with `replaceState`.

Important: `replaceState` does not fire `popstate`. Avoid writing code that depends on it doing so.

### 4. Support URL-Driven Pending Project Actions

The app likely already has `pendingProjectAction` for manual Open/New/Duplicate flows.

Extend it carefully for URL project navigation:

```js
{
  type: "url-open",
  projectId,
  previousProjectId,
  message: discardUnsavedChangesMessage
}
```

or equivalent.

Confirm behavior:

- Confirming opens the URL-requested project.
- Cancelling restores URL to `previousProjectId` if valid.
- Cancelling clears malformed/failed pending URL state appropriately.
- Pending URL navigation should not be confused with startup URL restore.

If there are no unsaved changes, open immediately.

### 5. Add URL-Initiated Open Path

Prefer reusing the existing `openProject(projectId)` implementation if it already:

- Calls `getProject(projectId)`.
- Normalizes and validates the lesson.
- Sets active project id/ref.
- Writes localStorage.
- Syncs URL.
- Clears transient inputs.
- Resets media readiness.
- Sets save status to `saved`.
- Refreshes project list quietly.

If `openProject()` shows raw backend errors, make URL-driven failures use a safe URL-specific message:

```text
The lesson requested in the URL could not be opened.
```

Avoid duplicating manual-open logic unless needed for clearer source-specific failure handling.

### 6. Avoid URL Sync Loops

Stage 4 automatic URL sync likely calls `replaceUrlProjectId(projectId)` after successful active project transitions.

Ensure Stage 8 URL handling does not loop:

- Ignore URL events for the currently active project id.
- Use `replaceState`, not `pushState`, for automatic corrections.
- Do not trigger project opens from the same URL state repeatedly.
- Track pending URL project id if needed to ignore stale async responses.
- Guard against component unmount.

### 7. Preserve Previous Stages

Do not regress:

- Stage 4 startup URL restore precedence.
- Stage 5 clear invalid restore request.
- Stage 6 startup list loading and list-specific status/error.
- Stage 7 auto-reopen only when no URL/localStorage pointer exists at startup.
- localStorage pointer-only storage.
- No backend/API changes.

## Test Requirements

Update `frontend/test/projectSessionUrl.test.js` or add a focused helper test file if URL helper functions are added.

Cover helper behavior:

- Project URL helper builds `?project=<id>` for valid ids.
- Existing `project` param is replaced.
- Unrelated query params are preserved.
- Hash fragments are preserved.
- App-relative output stays app-relative.
- Invalid project ids no-op or return original URL.
- Missing/throwing browser APIs do not throw.

If you extract pure decision logic for URL navigation, add tests such as:

```text
frontend/test/projectUrlNavigation.test.js
```

Cover:

- No URL project means no project switch.
- Malformed URL project returns invalid-url action without backend request.
- URL project equal to active id returns no-op.
- URL project different from active id returns open action.
- Unsaved changes produce pending confirmation action.
- Cancel action restores URL to active project id.
- Confirm action opens requested project id.

Keep tests under the existing `node --test` setup. Do not add React testing libraries or browser automation dependencies unless the repo already uses them.

If app-level popstate behavior cannot be covered with the current test setup, state that residual risk and cover it in manual QA.

## Manual QA Checklist

Run:

```sh
npm run dev
```

Then verify:

1. Open the app with no URL project and confirm existing Stage 7 startup behavior still works.
2. Open the saved lessons panel.
3. Confirm saved lessons expose a project URL action.
4. Copy a project link and confirm it contains `?project=<id>`.
5. Paste the link into a new tab and confirm startup URL restore opens that project.
6. With the app already open, use browser Back/Forward between two project URLs and confirm the active lesson changes accordingly.
7. Navigate to a URL for the currently active project and confirm no extra load or error occurs.
8. Navigate to `/?project=../bad` while the app is open and confirm no backend project request is made.
9. Navigate to `/?project=lesson-valid-shape-but-missing` while the app is open and confirm a safe URL-project error appears.
10. Make unsaved edits, then navigate to a different project URL with browser Back/Forward or a project link.
11. Confirm the app asks before discarding unsaved changes.
12. Cancel the prompt and confirm the URL returns to the active project id.
13. Repeat and confirm the prompt; confirm the requested project opens.
14. Remove `?project` from the URL through browser navigation and confirm the app does not auto-open another lesson or clear the current lesson.
15. Confirm Stage 5 clear invalid restore still works.
16. Confirm Stage 6 Open panel loading/error/list states still work.
17. Confirm Stage 7 auto-reopen still only happens on startup with no URL/localStorage pointer.

If manual QA is not run, state that explicitly in the final response.

## Verification Commands

Run:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Also run targeted checks:

```sh
rg -n "popstate|addEventListener\\(|removeEventListener\\(|buildProjectUrl|getProjectUrl|onCopyProjectLink|url-open|projectQueryParam|buildUrlWithProjectId|getProjectRestoreCandidateFromUrl|replaceUrlProjectId|clearUrlProjectId" frontend/src frontend/test
rg -n "history\\.pushState|history\\.replaceState|navigator\\.clipboard|clipboard|localStorage\\.setItem|JSON\\.stringify\\(lesson|setItem\\([^,]+,\\s*JSON" frontend/src frontend/test
rg -n "router\\.get\\(\"/\"|router\\.get\\(\"/:id\"|listProjects\\(|getProject\\(" server/src frontend/src
```

Expected results:

- URL project support symbols appear in frontend source/tests.
- Automatic sync still uses `replaceState`.
- `pushState` is not used unless explicitly justified for a user-initiated navigation action.
- localStorage writes remain pointer-only.
- Backend routes are unchanged.

## Acceptance Criteria

Stage 8 is acceptable when:

- Users can obtain direct project URLs from the saved lessons UI.
- Direct project URLs still restore on full reload.
- Browser back/forward project URL changes are handled while the app is open.
- URL-driven project switching respects unsaved-change confirmation.
- Malformed/missing URL projects are handled safely without fallback surprises.
- Removing the URL project param while the app is open does not trigger localStorage/auto-reopen.
- Stages 4-7 behavior remains intact.
- Automated verification passes.
- Manual browser QA is either completed or explicitly reported as not run.
- Backend/API/storage scope is unchanged.

## Final Response For The Implementer

In your final response, include:

- A brief summary of what changed.
- Files changed.
- Automated verification results.
- Whether manual browser QA was run.
- Any residual risk, especially around browser Back/Forward and unsaved-change behavior.
