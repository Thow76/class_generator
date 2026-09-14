# Session Restoration Stage 2 Restore Rules Prompt

Use this prompt to implement Stage 2 of the session restoration issue for Lesson Source Builder.

## Prompt

You are implementing Stage 2 of the Lesson Source Builder session restoration work.

Stage 1 established the baseline: backend project persistence exists, but the frontend starts each browser session from `demoLesson` with `activeProjectId` set to `null`, and there is no automatic restoration of the last active lesson.

Your Stage 2 job is to define the restoration rules clearly and document them for later implementation stages. This stage should produce a precise restoration contract, including precedence, failure behavior, and user-facing expectations.

Stage 2 is primarily product/technical specification work. Do not implement runtime restoration yet unless explicitly instructed after this stage. Do not add `localStorage` reads/writes to the app, do not mutate URL state, do not change startup effects, and do not alter save/open behavior in this stage.

## Stage 2 Goal

Create a clear restoration-rules document that later implementation stages can follow without ambiguity.

The restoration decision order should be:

1. If the URL contains a valid project id, for example `?project=lesson-...`, attempt to restore that project first.
2. Otherwise, if localStorage contains a last active project id, attempt to restore that project.
3. Otherwise, start from the bundled `demoLesson` exactly as the app does today.

The rules must also define what happens when a restore candidate is missing, malformed, deleted, unreadable, or fails validation.

## Required Output

Create this Markdown document:

```text
docs/session-restoration-stage-2-restore-rules.md
```

The document should be specific enough that Stage 3 can implement localStorage persistence and Stage 4 can implement URL restoration without revisiting product decisions.

## Required Sections

Use this structure unless you have a strong reason to improve it:

```md
# Session Restoration Stage 2 Restore Rules

## Summary

## Restoration Sources

## Precedence Rules

## Valid Project Ids

## Startup Decision Flow

## Successful Restore Behavior

## Failed Restore Behavior

## LocalStorage Contract

## URL Contract

## Project List Role

## Loading And Error UX

## Unsaved Changes Policy

## Privacy And Data Scope

## Stage 3 Assumptions

## Stage 4 Assumptions

## Out Of Scope

## Acceptance Criteria
```

## Source Context To Read

Read these files before writing the Stage 2 rules:

```text
docs/session-restoration-stage-1-baseline.md
docs/session-restoration-stage-1-baseline-prompt.md
frontend/src/App.jsx
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
server/src/services/projectStore.js
server/src/routes/projects.js
server/src/services/validateLesson.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
```

If the code has moved, inspect the equivalent files.

## Commands To Consider

Use these commands to ground the rules in current code:

```sh
git status --short
sed -n '1,260p' docs/session-restoration-stage-1-baseline.md
rg -n "useState\\(demoLesson\\)|activeProjectId|activeProjectIdRef|setActiveProjectIdAndRef|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject" frontend/src/App.jsx
rg -n "localStorage|sessionStorage|window\\.location|location\\.search|URLSearchParams|history\\.replaceState|history\\.pushState|document\\.cookie" frontend/src
rg -n "isSafeProjectId|assertSafeProjectId|ProjectStoreError|validateLesson|normalizeLesson" server/src
sed -n '1,130p' frontend/src/api/projects.js
sed -n '1180,1245p' frontend/src/App.jsx
sed -n '1,220p' server/src/routes/projects.js
sed -n '1,180p' server/src/services/projectStore.js
```

Tests are not required for a documentation-only rules stage, but if you touch runtime code by mistake, run:

```sh
npm run test --workspace frontend
npm run test --workspace server
```

## Restoration Sources

The Stage 2 document must define exactly two future restoration sources:

```text
URL query parameter: project
localStorage key: lessonSourceBuilder:lastProjectId
```

The URL source should allow deep links and bookmarks. The localStorage source should remember the last active project for the current browser profile.

The document must explicitly say not to store the full lesson in localStorage. The backend project store remains the source of truth for lesson data.

## Precedence Rules

Document this precedence:

1. URL `project` query param wins over localStorage.
2. localStorage is used only when the URL does not specify a project.
3. Demo lesson is used only when neither URL nor localStorage yields a restorable project.

Include examples:

```text
No URL project, no localStorage id -> start demo lesson.
No URL project, localStorage id exists and loads -> restore localStorage project.
URL project exists and loads, localStorage points elsewhere -> restore URL project.
URL project fails, localStorage points elsewhere -> do not silently open the localStorage project unless the rules explicitly allow it.
Malformed URL project -> reject URL candidate and fall back according to the chosen failure policy.
Deleted localStorage project -> clear stale localStorage id and start demo lesson.
```

For the failure policy, prefer predictable user intent:

- If a URL project is present but cannot be loaded, show an error explaining that the requested project could not be opened.
- Do not silently open a different localStorage project after a failed URL project, because the URL is an explicit navigation request.
- If a localStorage project cannot be loaded, clear the stale localStorage value and fall back to the demo lesson.

## Valid Project Id Rules

The Stage 2 document must define what counts as a valid restoration candidate.

Use the backend rule as the source of truth:

```text
Project ids must look like lesson-...
They must not contain path separators, `..`, null bytes, or decoded traversal.
They must be bounded in length.
```

Do not require the frontend to duplicate every backend validation detail perfectly. The frontend may do lightweight validation to avoid obviously bad requests, but the backend remains authoritative.

The document should recommend a small frontend helper in a later stage, such as:

```text
isLikelySafeProjectId(value)
```

That helper should reject non-strings, blank values, ids not starting with `lesson-`, very long values, slashes, backslashes, `..`, and null bytes.

## Startup Decision Flow

Define the future startup flow precisely:

1. App starts in a restoring/loading state.
2. Read `project` from `window.location.search`.
3. Read `lessonSourceBuilder:lastProjectId` from localStorage.
4. Choose the restore candidate using the precedence rules.
5. If there is no candidate, show the demo lesson.
6. If there is a candidate, fetch the project through the existing frontend project API.
7. Normalize and validate the loaded lesson using the existing frontend helpers.
8. Set `lesson`, `activeProjectId`, save status, project list, transient UI state, and media readiness consistently with manual `openProject()`.
9. If restore fails, follow the failed-restore policy.
10. End restoring/loading state.

The rules should identify whether startup should fetch `listProjects()` first. Recommended policy:

- URL project restore may call `getProject(projectId)` directly because the URL is explicit.
- localStorage restore may either call `getProject(projectId)` directly or first call `listProjects()` to confirm existence.
- If the UI wants an up-to-date saved-project panel after restore, call `listProjects()` quietly after restoration.

Document the chosen approach and why.

## Successful Restore Behavior

Define what should happen after a successful restore:

- `lesson` is the normalized loaded lesson.
- `activeProjectId` equals the loaded lesson/project id.
- `saveStatus` is `saved`.
- `loadStatus` becomes `loaded` or equivalent.
- project errors are cleared.
- transient inputs and pending generation state are cleared.
- media readiness is reset unless an existing current-project readiness result is still valid.
- localStorage is updated to the restored project id.
- the URL may be updated only in the later URL stage, according to Stage 4 rules.

The document should recommend reusing existing helpers where possible, especially the existing manual open flow and `setActiveProjectIdAndRef(projectId)`.

## Failed Restore Behavior

Define failure behavior for each candidate type:

### URL Candidate Failure

If `?project=lesson-...` exists but cannot be loaded:

- Keep the user on the app.
- Show a clear project error.
- Do not silently restore a different localStorage project.
- Keep or return to the demo lesson.
- Do not clear localStorage unless the failed URL project id is also the stored localStorage id.
- Leave the URL unchanged so the user can see what failed.

### LocalStorage Candidate Failure

If the stored project id cannot be loaded:

- Clear `lessonSourceBuilder:lastProjectId`.
- Show the demo lesson.
- Optionally show a non-blocking message that the last lesson could not be restored.
- Do not treat this as a permanent app error.

### Malformed Candidate

If a candidate is malformed:

- Do not call the backend for obviously unsafe values.
- For malformed localStorage values, clear the key.
- For malformed URL values, show an error or ignore the candidate according to the documented policy.
- Never expose stack traces or absolute filesystem paths.

## LocalStorage Contract

Define the future localStorage key exactly:

```text
lessonSourceBuilder:lastProjectId
```

The value should be only the active project id string, for example:

```text
lesson-20260911-102000-ab12cd34
```

Rules:

- Write the key after successful create, save, open, duplicate, and restore.
- Clear the key only when it is stale, malformed, or explicitly superseded by a user action that leaves no active project.
- Do not store lesson JSON, image paths, media readiness, API responses, or unsaved form state in this key.
- Treat localStorage as a convenience pointer, not authoritative storage.
- Wrap localStorage access in safe helpers so private browsing or storage errors do not crash the app.

## URL Contract

Define the future URL format:

```text
/?project=lesson-...
```

Rules:

- The `project` parameter identifies the project to restore.
- URL project takes precedence over localStorage.
- A successful URL restore should update localStorage to that project id.
- Later stages may use `history.replaceState` to keep the URL in sync after successful opens/saves.
- URL updates should preserve unrelated query parameters where practical.
- URL handling should not cause infinite restore loops.
- Invalid or missing URL params should not crash startup.

## Project List Role

Decide and document how the project list participates.

Recommended:

- Restoration should not require the project panel to be opened.
- Successful restoration can quietly refresh the project list so the Open panel is ready.
- If startup uses `listProjects()` for localStorage existence checking, it should not block URL restore unnecessarily.
- Project list failure should not prevent direct URL `getProject()` restore if the requested project can be loaded.

## Loading And Error UX

Define expected UX:

- While restoring, avoid presenting the demo lesson as if it were definitely active.
- Existing `loadStatus` may be reused, or a dedicated `restoreStatus` may be introduced later.
- Restore errors should appear in the existing project error area when practical.
- A failed localStorage restore should be softer than a failed URL restore.
- New/Open/Duplicate/Save should remain usable after a restoration failure.

## Unsaved Changes Policy

Document that Stage 2 restoration rules do not introduce autosave.

Rules:

- Unsaved React state remains vulnerable to refresh until a separate autosave feature exists.
- Restoration reopens the last saved project state from disk, not unsaved in-memory edits.
- If the app later adds autosave, that should be a separate stage with its own conflict rules.

## Privacy And Data Scope

Document:

- localStorage stores only a project id pointer.
- Lesson content remains on the backend project store.
- No account identity, auth token, generated image data, export data, or full lesson JSON should be stored in browser storage for this stage.
- Restoration is browser-profile local and not cross-device.

## Out Of Scope

Explicitly list these as out of scope for Stage 2:

- Implementing localStorage reads or writes.
- Implementing URL reads or writes.
- Changing `App` startup behavior.
- Autosave.
- Conflict resolution for unsaved edits.
- Project deletion UI.
- Export package generation.
- Auth, accounts, cloud sync, Firebase, hosted publishing, or remote storage.
- Changing backend storage format.
- Changing project API contracts.

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

## Verification

After writing the Stage 2 rules, run:

```sh
git diff -- docs/session-restoration-stage-2-restore-rules.md
git status --short
```

If runtime files were accidentally changed, stop and revert only your own accidental changes. Do not revert unrelated user changes.

If you intentionally touched runtime files despite this prompt, run:

```sh
npm run test --workspace frontend
npm run test --workspace server
```

and explain why runtime changes were necessary.

## Expected Final Response

Report:

- The Stage 2 rules document path.
- A brief summary of the chosen precedence and failure policy.
- Whether any runtime files were changed.
- Commands run and results.
- Any open questions for Stage 3 or Stage 4.

Keep the final response concise.
