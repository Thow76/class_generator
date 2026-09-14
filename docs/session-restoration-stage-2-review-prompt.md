# Session Restoration Stage 2 Review Prompt

Use this prompt to review whether Stage 2 of the session restoration issue was completed correctly.

## Prompt

You are reviewing Stage 2 of the Lesson Source Builder session restoration work.

Stage 2 was intended to define the restoration rules only. It should produce a precise product and technical contract for later stages, especially Stage 3 localStorage persistence and Stage 4 URL restoration.

Your job is to verify that the Stage 2 rules document is complete, internally consistent, grounded in the Stage 1 baseline, and limited to documentation. Review Stage 2 only. Do not implement localStorage persistence, URL parsing, URL synchronization, startup restoration, autosave, export generation, auth, account sync, cloud storage, backend API changes, or later-stage behavior.

## Stage 2 Expected Output

The expected Stage 2 artifact is:

```text
docs/session-restoration-stage-2-restore-rules.md
```

The Stage 2 handoff prompt is:

```text
docs/session-restoration-stage-2-restore-rules-prompt.md
```

The Stage 1 baseline context is:

```text
docs/session-restoration-stage-1-baseline.md
```

The implementation is correct only if the Stage 2 document defines the restoration contract without changing runtime behavior.

## Required Contract

The Stage 2 document must define exactly these future restoration sources:

```text
URL query parameter: project
localStorage key: lessonSourceBuilder:lastProjectId
```

It must define this precedence:

1. URL `project` query parameter wins over localStorage.
2. localStorage is used only when the URL does not specify a project.
3. The bundled `demoLesson` is used only when neither URL nor localStorage yields a restorable project.

It must define this source-of-truth boundary:

- Browser storage stores only a project id pointer.
- Full lesson data remains in backend project files.
- The frontend may do lightweight validation before a request.
- The backend remains authoritative for project id validation and lesson loading.

It must define this failure policy:

- Failed URL restore shows a clear error and does not silently fall through to a different localStorage project.
- Failed localStorage restore clears the stale key and falls back softly to the demo lesson.
- Malformed candidates do not crash startup and should not be sent to the backend when obviously unsafe.
- Errors must not expose stack traces or absolute filesystem paths.

## Files To Inspect

Inspect these files at minimum:

```text
docs/session-restoration-stage-2-restore-rules.md
docs/session-restoration-stage-2-restore-rules-prompt.md
docs/session-restoration-stage-1-baseline.md
frontend/src/App.jsx
frontend/src/api/projects.js
frontend/src/components/Sidebar.jsx
server/src/services/projectStore.js
server/src/routes/projects.js
server/src/services/validateLesson.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
package.json
frontend/package.json
server/package.json
```

If the Stage 2 document cites or depends on additional files, inspect those files enough to verify the claim.

## Review Checks

1. Confirm `docs/session-restoration-stage-2-restore-rules.md` exists.
2. Confirm the document references the Stage 1 baseline accurately.
3. Confirm the document is a rules/specification artifact, not a runtime implementation.
4. Confirm it says Stage 2 does not implement restoration yet.
5. Confirm it defines URL query parameter `project` as a future restoration source.
6. Confirm it defines localStorage key `lessonSourceBuilder:lastProjectId` exactly.
7. Confirm it does not introduce additional restoration sources such as cookies, server sessions, full localStorage lesson snapshots, IndexedDB, cloud sync, or account state.
8. Confirm URL project precedence over localStorage is explicit.
9. Confirm localStorage fallback applies only when no URL project is present.
10. Confirm demo fallback applies only when neither source yields a restorable project or after allowed failure fallback.
11. Confirm the document includes concrete precedence examples.
12. Confirm the URL failure policy does not silently open a different localStorage project.
13. Confirm the localStorage failure policy clears malformed or stale stored ids.
14. Confirm malformed candidate behavior is covered for both URL and localStorage.
15. Confirm failed restore behavior keeps the app usable.
16. Confirm restore errors should not expose stack traces, raw internals, or absolute filesystem paths.
17. Confirm valid project id rules are tied to the backend `isSafeProjectId` rule or equivalent.
18. Confirm the document does not require the frontend to perfectly duplicate backend validation.
19. Confirm it recommends a lightweight frontend helper such as `isLikelySafeProjectId(value)` or equivalent.
20. Confirm the startup decision flow is complete from startup loading state through final restored/demo state.
21. Confirm startup flow reads URL before localStorage.
22. Confirm startup flow fetches candidate projects through the existing frontend project API.
23. Confirm startup flow normalizes and validates loaded lessons with existing frontend helpers.
24. Confirm successful restore behavior matches manual open behavior closely enough: set lesson, active project id/ref, saved status, loaded status, clear transient inputs, reset media readiness, and clear project errors.
25. Confirm successful restore updates localStorage to the restored project id.
26. Confirm URL mutation is reserved for Stage 4 or later, not Stage 2.
27. Confirm project list role is decided clearly.
28. Confirm restoration does not require opening the saved-project panel.
29. Confirm project-list failure is not allowed to block direct URL restore when the project can be loaded.
30. Confirm loading/error UX distinguishes explicit URL failures from softer localStorage failures.
31. Confirm the document avoids presenting the demo lesson as definitely active while restoration is still pending.
32. Confirm unsaved changes policy states restoration is not autosave.
33. Confirm it states restoration reopens last saved backend project state, not unsaved React state.
34. Confirm privacy/data scope states localStorage stores only a project id pointer.
35. Confirm privacy/data scope excludes account identity, auth tokens, generated image data, export data, API responses, and full lesson JSON.
36. Confirm Stage 3 assumptions are specific to localStorage persistence and do not include URL synchronization.
37. Confirm Stage 4 assumptions are specific to URL restoration/synchronization and preserve URL precedence.
38. Confirm out-of-scope items include localStorage implementation, URL implementation, startup behavior changes, autosave, project deletion UI, export generation, auth, cloud sync, backend storage format changes, and project API contract changes.
39. Confirm acceptance criteria in the Stage 2 document match the handoff prompt.
40. Confirm no frontend or backend runtime files were changed as part of Stage 2 unless explicitly justified by the implementer.

## Commands To Run

Start with repository status and document inspection:

```sh
git status --short
sed -n '1,360p' docs/session-restoration-stage-2-restore-rules.md
sed -n '1,360p' docs/session-restoration-stage-2-restore-rules-prompt.md
sed -n '1,260p' docs/session-restoration-stage-1-baseline.md
```

Verify source grounding:

```sh
rg -n "useState\\(demoLesson\\)|activeProjectId|activeProjectIdRef|setActiveProjectIdAndRef|loadProjectList|openProject|saveCurrentLesson|createFreshProject|duplicateCurrentProject" frontend/src/App.jsx
rg -n "localStorage|sessionStorage|window\\.location|location\\.search|URLSearchParams|history\\.replaceState|history\\.pushState|document\\.cookie" frontend/src
rg -n "listProjects\\(|createProject\\(|getProject\\(|saveProject\\(|duplicateProject\\(" frontend/src/api/projects.js frontend/src/App.jsx
rg -n "isSafeProjectId|assertSafeProjectId|ProjectStoreError|projectsDir|PROJECT_DATA_DIR|getProjectPath" server/src/services/projectStore.js server/src/routes/projects.js
```

Check for accidental runtime implementation:

```sh
git diff -- frontend/src server/src frontend/test server/test package.json frontend/package.json server/package.json
git diff -- docs/session-restoration-stage-2-restore-rules.md
```

Run tests if runtime files changed, or if you want extra confidence:

```sh
npm run test --workspace frontend
npm run test --workspace server
```

For a pure documentation stage, tests are optional if no runtime files changed. If tests are skipped, say that they were skipped because the review found documentation-only changes.

## Findings Guidance

Use a code-review style response.

Lead with findings, ordered by severity. Use exact file and line references. Open a finding if:

- The Stage 2 rules document is missing.
- The document omits either restoration source.
- The localStorage key is misspelled or inconsistent.
- The URL parameter name is misspelled or inconsistent.
- The precedence rules are ambiguous or contradict the handoff prompt.
- Failed URL restore can silently open a different localStorage project.
- Failed localStorage restore does not clear stale or malformed storage.
- The document suggests storing full lesson data in browser storage.
- The document makes localStorage authoritative over backend project files.
- The document lacks startup decision flow.
- The document lacks successful or failed restore behavior.
- Stage 3 and Stage 4 boundaries are blurred.
- Runtime code was changed during Stage 2.
- The document introduces out-of-scope features such as autosave, export generation, auth, cloud sync, or backend API changes.

If no issues are found, say that clearly and mention any residual risk, such as lack of manual QA or tests not being necessary for a documentation-only stage.

## Acceptance Criteria

Stage 2 passes review only if:

- `docs/session-restoration-stage-2-restore-rules.md` exists.
- It is grounded in `docs/session-restoration-stage-1-baseline.md`.
- It defines exactly the URL `project` parameter and `lessonSourceBuilder:lastProjectId` localStorage key.
- It defines URL-over-localStorage-over-demo precedence.
- It defines valid project id expectations with backend validation as authoritative.
- It defines complete startup decision flow.
- It defines successful restore behavior.
- It defines failed restore behavior for URL, localStorage, and malformed candidates.
- It states localStorage stores only a project id pointer.
- It states backend project files remain the source of truth.
- It keeps localStorage implementation in Stage 3 and URL implementation in Stage 4.
- It reports out-of-scope boundaries clearly.
- It does not modify frontend or backend runtime behavior.

## Expected Final Response

Return:

- Findings first, with severity and file/line references.
- Open questions or assumptions.
- Verification commands run and results.
- Brief final verdict: pass or needs remediation.

Keep the response focused on Stage 2. Do not propose or implement Stage 3 unless explicitly asked afterward.
