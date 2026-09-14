# Session Restoration Stage 2 Restore Rules

## Summary

Stage 1 established that Lesson Source Builder has durable backend project persistence, but no automatic frontend session restoration. The React app currently initializes from the bundled `demoLesson` with `activeProjectId` set to `null` in `frontend/src/App.jsx`, and saved projects are reopened only through manual project actions.

Stage 2 defines the restoration contract for later implementation. It does not implement runtime restoration, browser storage, URL mutation, startup effects, save/open behavior changes, autosave, or backend API changes.

Future restoration must consider exactly two restoration sources:

- URL query parameter: `project`
- localStorage key: `lessonSourceBuilder:lastProjectId`

The backend project store remains the source of truth for lesson data. Browser storage must store only a project id pointer, never full lesson JSON.

## Restoration Sources

The URL source supports explicit navigation, deep links, and bookmarks:

```text
/?project=lesson-...
```

The localStorage source remembers the last active saved project for the current browser profile:

```text
lessonSourceBuilder:lastProjectId
```

Both sources identify a backend project id. Neither source contains lesson content, generated media data, export state, API responses, or unsaved form state.

## Precedence Rules

Restoration precedence is:

1. If the URL contains a valid `project` query parameter, attempt to restore that project first.
2. Otherwise, if localStorage contains a valid `lessonSourceBuilder:lastProjectId`, attempt to restore that project.
3. Otherwise, start from the bundled `demoLesson` exactly as the app does today.

Concrete outcomes:

- No URL project and no localStorage id -> start the demo lesson.
- No URL project and localStorage id loads -> restore the localStorage project.
- URL project loads and localStorage points elsewhere -> restore the URL project and update localStorage to that id.
- URL project fails and localStorage points elsewhere -> do not silently open the localStorage project.
- Malformed URL project -> reject the URL candidate, show a clear error, and use the demo lesson.
- Deleted localStorage project -> clear `lessonSourceBuilder:lastProjectId` and start the demo lesson.

URL intent is explicit. A failed URL restore must not quietly fall through to a different stored last project, because that would open content other than the requested deep link. localStorage intent is implicit convenience state, so a failed localStorage restore should be handled softly and should fall back to the demo lesson.

## Valid Project Ids

The backend `isSafeProjectId(projectId)` rule in `server/src/services/projectStore.js` is the authoritative project id validation rule. Project ids must:

- Be strings.
- Start with `lesson-`.
- Match the backend's safe id character set.
- Be bounded in length.
- Avoid path separators, `..`, null bytes, encoded traversal, and decoded traversal.

The current backend implementation rejects non-strings and ids longer than 96 characters, requires `lesson-` followed by letters, numbers, underscores, or hyphens, safely decodes the id, rejects `/`, `\`, `..`, and null bytes after decoding, and requires the decoded value to equal the original value.

The frontend does not need to duplicate every backend validation detail perfectly. Later stages should add a small lightweight helper such as `isLikelySafeProjectId(value)` before calling the backend for restoration candidates. That helper should reject non-strings, blank values, ids not starting with `lesson-`, very long values, slashes, backslashes, `..`, and null bytes. The backend must still make the final decision.

## Startup Decision Flow

Future startup restoration should follow this order:

1. Start the app in a restoring/loading state so the demo lesson is not presented as definitely active before restoration finishes.
2. Read `project` from `window.location.search`.
3. Safely read `lessonSourceBuilder:lastProjectId` from localStorage.
4. Choose the restoration candidate using the precedence rules.
5. If there is no candidate, keep or show the bundled `demoLesson`.
6. If there is a candidate, fetch it through the existing frontend project API with `getProject(projectId)`.
7. Normalize and validate the loaded lesson with the existing frontend helpers, matching `normalizeAndValidateLoadedLesson()`.
8. Apply restored state consistently with manual `openProject(projectId)`: set `lesson`, set `activeProjectId`, clear transient inputs, reset media readiness, set `saveStatus` to `saved`, clear project errors, and end the loading state.
9. If restoration fails, follow the failed-restore policy for the candidate type.
10. Quietly refresh the project list after the restoration decision has completed when practical.
11. End the restoring/loading state.

Chosen project-list policy: URL and localStorage restoration should call `getProject(projectId)` directly rather than requiring `listProjects()` first. Direct fetch matches the explicit backend resource contract, avoids blocking a URL deep link on project-list metadata, and lets the backend return the precise missing, malformed, unreadable, or validation failure. After the restore succeeds or after fallback to the demo lesson, the app may call `loadProjectList({ quiet: true })` so the Open panel is ready.

## Successful Restore Behavior

After a successful restore:

- `lesson` is the normalized loaded lesson.
- `activeProjectId` equals the restored lesson/project id.
- `activeProjectIdRef.current` is kept in sync, preferably through `setActiveProjectIdAndRef(projectId)`.
- `saveStatus` is `saved`.
- `loadStatus` becomes `loaded` or the future equivalent.
- `projectError` is cleared.
- Transient inputs and pending generation state are cleared consistently with manual open behavior.
- Media readiness is reset unless a later implementation can prove an existing current-project readiness result is still valid.
- The Open project panel is not forced open.
- localStorage is updated to the restored project id.
- URL updates happen only in the later URL implementation stage according to the Stage 4 rules.

Future implementation should reuse the manual open flow in `frontend/src/App.jsx` as much as possible. The existing `openProject(projectId)` path already calls `getProject()`, `normalizeAndValidateLoadedLesson()`, `setActiveProjectIdAndRef()`, `clearTransientInputs()`, `resetMediaReadiness()`, and sets saved/loaded state.

## Failed Restore Behavior

Restore failure includes missing projects, deleted project folders, malformed ids, unreadable project files, malformed `lesson.json`, backend validation failure, frontend validation failure, network/API failure, or storage access failure.

For all failures:

- Keep the user in the app.
- Never expose stack traces, absolute filesystem paths, temp file paths, or raw internals.
- Leave New, Open, Duplicate, and Save usable after the failure.
- Avoid saving over or deleting backend project data as part of startup recovery.

### URL Candidate Failure

If `?project=lesson-...` exists but cannot be loaded:

- Show a clear project error explaining that the requested lesson could not be opened.
- Do not silently restore a different localStorage project.
- Keep or return to the bundled demo lesson.
- Do not clear localStorage unless the failed URL project id is also the stored localStorage id.
- Leave the URL unchanged so the user can see and edit the failed requested id.
- Treat malformed URL candidates as explicit URL failures and do not call the backend for obviously unsafe values.

Examples of user-facing messages can be concise, such as "The lesson requested in the URL could not be opened." The underlying API error may be appended when it is safe and user-readable, such as "Project not found."

### LocalStorage Candidate Failure

If `lessonSourceBuilder:lastProjectId` exists but cannot be loaded:

- Clear `lessonSourceBuilder:lastProjectId`.
- Show the bundled demo lesson.
- Optionally show a non-blocking message that the last lesson could not be restored.
- Do not treat this as a permanent app error.
- Do not mutate the URL.

This applies when the stored project was deleted, fails backend validation, is unreadable, or no longer exists.

### Malformed Candidate

If a candidate is malformed:

- Do not call the backend for obviously unsafe values.
- For malformed localStorage values, clear `lessonSourceBuilder:lastProjectId` and start the demo lesson.
- For malformed URL values, show a clear URL restore error and start the demo lesson.
- Do not store the malformed value back to localStorage.

## LocalStorage Contract

The future localStorage key is exactly:

```text
lessonSourceBuilder:lastProjectId
```

The value is only the active project id string, for example:

```text
lesson-20260911-102000-ab12cd34
```

Rules:

- Write the key after successful create, save, open, duplicate, and restore.
- Prefer writing through or near the future equivalent of `setActiveProjectIdAndRef(projectId)` so all successful active-project transitions stay consistent.
- Clear the key only when it is stale, malformed, or explicitly superseded by a user action that leaves no active saved project.
- Do not store lesson JSON, image paths, media readiness, API responses, export data, auth data, or unsaved form state in this key.
- Treat localStorage as a convenience pointer, not authoritative storage.
- Wrap reads, writes, and removals in safe helpers so private browsing, blocked storage, quota errors, or security exceptions do not crash the app.
- Storage helper failures should degrade to demo startup, not a blank app.

## URL Contract

The future URL format is exactly:

```text
/?project=lesson-...
```

Rules:

- The `project` parameter identifies the project to restore.
- URL project takes precedence over localStorage.
- A successful URL restore updates localStorage to the restored project id.
- Later stages may use `history.replaceState` to keep the URL in sync after successful opens, creates, saves, duplicates, or restores.
- URL updates should preserve unrelated query parameters where practical.
- URL updates should avoid browser history spam for automatic state synchronization.
- URL handling must not cause infinite restore loops.
- Invalid, malformed, or missing URL params must not crash startup.
- Stage 2 does not introduce any URL reads or writes.

If multiple `project` parameters are present, later implementation should choose the first value returned by `URLSearchParams.get("project")` and ignore the rest.

## Project List Role

Restoration should not require the saved-project panel to be open. Startup should not depend on the user pressing Open or Refresh.

Project list behavior:

- URL restore should not wait for `listProjects()` before calling `getProject(projectId)`.
- localStorage restore should also call `getProject(projectId)` directly; a 404 or validation error is enough to clear the stale pointer.
- Project list failure should not prevent direct URL restore if the requested project can be loaded.
- Successful restoration can quietly refresh the project list so the Open panel is ready.
- If project-list refresh fails after a successful direct restore, the lesson should remain restored and the list error can be shown or deferred according to existing project error UX.

This choice keeps restoration tied to the backend read route and avoids treating list metadata as the gatekeeper for opening a saved lesson.

## Loading And Error UX

While restoring, avoid presenting the demo lesson as if it were definitely active. Later stages may reuse `loadStatus` or introduce a dedicated `restoreStatus`; either approach is acceptable if the UI clearly avoids a false settled state during startup.

Expected UX:

- A startup restore may show the existing loading project status or an equivalent quiet loading indicator.
- Restore errors should appear in the existing project error area when practical.
- A failed URL restore should be more visible because the user explicitly requested a project.
- A failed localStorage restore should be softer because the user did not explicitly navigate to that id.
- New, Open, Duplicate, and Save should remain available after restoration failure.
- If the app falls back to the demo lesson, the sidebar should continue to show no active saved project unless the user saves or opens one.

## Unsaved Changes Policy

Stage 2 restoration rules do not introduce autosave.

Rules:

- Unsaved React state remains vulnerable to refresh until a separate autosave feature exists.
- Restoration reopens the last saved project state from the backend project store, not unsaved in-memory edits.
- localStorage stores only which project to attempt to reopen, not pending edits.
- URL restoration identifies a saved backend project, not a draft browser session.
- If the app later adds autosave, that work needs a separate conflict policy for saved backend data versus unsaved browser drafts.

## Privacy And Data Scope

The privacy boundary for this stage is intentionally small:

- localStorage stores only a project id pointer.
- Lesson content remains in backend project files managed by the project store.
- No account identity, auth token, generated image data, export package data, API responses, or full lesson JSON should be stored in browser storage for this stage.
- Restoration is local to the current browser profile and local backend data directory.
- Restoration is not cross-device sync.
- Restoration is not account-scoped, cloud-backed, or authenticated.

## Stage 3 Assumptions

Stage 3 is expected to implement localStorage persistence without URL restoration.

Assumptions:

- Add safe localStorage helpers for reading, writing, and clearing `lessonSourceBuilder:lastProjectId`.
- Add `isLikelySafeProjectId(value)` or an equivalent lightweight frontend guard.
- Persist the active project id after successful create, save, open, duplicate, and localStorage restore.
- On startup, when no URL project is present, attempt to restore the stored id via `getProject(projectId)`.
- Clear malformed or stale localStorage values.
- Do not store full lesson data in localStorage.
- Keep backend validation authoritative.
- Reuse the existing manual open behavior and `setActiveProjectIdAndRef(projectId)` pattern where practical.
- Do not mutate the URL in Stage 3.

## Stage 4 Assumptions

Stage 4 is expected to implement URL restoration and optional URL synchronization.

Assumptions:

- Read `project` from `window.location.search` during startup.
- Give URL `project` precedence over localStorage.
- Attempt URL restore directly with `getProject(projectId)`.
- Do not fall back to a different localStorage project after a failed URL restore.
- On successful URL restore, update localStorage to the URL project id.
- Leave failed URL ids visible in the address bar.
- If URL synchronization is added after successful user actions, use `history.replaceState` where appropriate, preserve unrelated query params where practical, and avoid loops.
- Do not change backend project API contracts.

## Out Of Scope

The following are out of scope for Stage 2:

- Implementing localStorage reads or writes.
- Implementing URL reads or writes.
- Changing `App` startup behavior.
- Changing save, open, create, or duplicate runtime behavior.
- Autosave.
- Conflict resolution for unsaved edits.
- Project deletion UI.
- Export package generation.
- Auth, accounts, cloud sync, Firebase, hosted publishing, or remote storage.
- Changing backend storage format.
- Changing project API contracts.
- Changing validation rules.

## Acceptance Criteria

Stage 2 is complete when:

- `docs/session-restoration-stage-2-restore-rules.md` exists.
- It references Stage 1 baseline findings.
- It defines URL and localStorage restoration sources.
- It defines exact precedence rules.
- It defines valid project id expectations.
- It defines startup decision flow.
- It defines successful restore behavior.
- It defines failed restore behavior for URL, localStorage, and malformed candidates.
- It defines the localStorage key exactly as `lessonSourceBuilder:lastProjectId`.
- It defines URL format exactly as `/?project=lesson-...`.
- It states that localStorage stores only a project id pointer.
- It states backend project files remain the source of truth.
- It identifies expected Stage 3 and Stage 4 implementation assumptions.
- It does not modify frontend or backend runtime behavior.
