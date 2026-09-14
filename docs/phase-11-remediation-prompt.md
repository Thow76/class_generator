# Phase 11 Remediation Prompt

Use this prompt to fix the Phase 11 review finding about Export and stage completion trusting frontend-derived media readiness without a backend file check.

## Prompt

You are fixing one narrow Phase 11 issue in Lesson Source Builder.

Phase 11 has been implemented and reviewed. The remaining finding is:

```text
[P1] Export readiness can be marked complete without a backend file check
File/path: frontend/src/utils/lessonSelectors.js, frontend/src/App.jsx, frontend/src/stages/ExportStage.jsx
Evidence: when no backend readiness result exists, isMediaReady(lesson, null) treats approved records with imagePath as ready without checking files. Probe result: {"mediaReadyWithoutBackend":true,"completedStagesWithoutBackend":["setup","story","characters","scenes","media","export"]} for missing image paths. App only auto-checks readiness on Media entry, not Export.
Why it matters: a user can open/navigate to Export before a successful backend readiness check and see Media/Export complete with the export button enabled even if files are missing.
Recommended fix: make stage completion and Export availability require a successful backend readiness result, or trigger/check backend readiness before enabling Export. Keep frontend-derived readiness only as an "unverified" Media-stage preview.
```

Fix this issue only. Do not add ZIP export, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or Phase 12+ scope.

## Scope

Likely update:

```text
frontend/src/utils/lessonSelectors.js
frontend/src/App.jsx
frontend/src/stages/ExportStage.jsx
frontend/src/stages/MediaStage.jsx
frontend/test/mediaReadiness.test.js
```

Only update additional files if tests reveal a directly coupled issue.

Do not change the backend readiness contract unless you discover a direct backend bug while adding tests. The backend file-backed readiness route is already the authoritative source for Phase 11.

## Required Behavior

Export readiness and stage completion must require an authoritative successful backend media readiness result.

The frontend may still derive local media item previews from the lesson object for the Media stage, but those derived previews must be treated as unverified. They must not:

- mark Media complete
- mark Export complete
- enable Export
- imply local asset files exist
- override a missing, checking or failed backend readiness result

Use the backend readiness result from `POST /api/media/readiness` as the source of truth for:

- Media stage completion
- Export stage completion
- Export button enabled/disabled state
- "ready for export" wording
- file-missing blockers

## Implementation Guidance

### Selector Rules

In `frontend/src/utils/lessonSelectors.js`, make the readiness distinction explicit.

Recommended shape:

- Keep `getRequiredMediaItems(lesson)` for local preview cards.
- Keep `getMediaSummaryFromItems(items)` for local preview counts.
- Keep or adjust `getMediaBlockers(lesson, readiness)` so backend blockers are authoritative when supplied.
- Change `isMediaReady(lesson, readiness)` so it returns `true` only when `readiness?.ready === true`.
- If there is no successful backend readiness object, return `false`.
- Do not fall back to checking approved records with `imagePath` for export readiness.
- If a derived local readiness helper is still useful, give it a name that cannot be confused with authoritative readiness, such as `getUnverifiedMediaPreviewState`.

`getCompletedStages(lesson, readiness)` should not include `media` or `export` unless `readiness?.ready === true`.

Important: if the app has no backend readiness result, Media and Export are not complete even if all lesson records look approved in memory.

### App Behavior

In `frontend/src/App.jsx`, review all places where completion state and Export stage props are computed.

Required behavior:

- Pass a backend readiness object to completion helpers only when readiness status is successful.
- Treat idle, checking and error states as not ready for completion/export.
- If the user navigates directly to Export and there is no successful backend readiness result for the current project, trigger a readiness check or show a clear "check media readiness first" state.
- Do not enable Export while readiness is idle, checking or error.
- Keep stale-response guards for project switches.
- Keep readiness reset behavior for media-affecting lesson changes.
- Do not let readiness errors permanently block New/Open/Duplicate.

Acceptable approaches:

1. Auto-run backend readiness when entering Export if there is a saved current project and no successful readiness result exists.
2. Require the user to click a check/refresh action before Export can be enabled.
3. Do both: auto-check on entry and expose a manual retry button.

The key rule is that Export must never become enabled from frontend-derived readiness alone.

### Export Stage

In `frontend/src/stages/ExportStage.jsx`, make the state honest:

- Show "checking" when backend readiness is in flight.
- Show backend readiness errors with a retry path if supported by props.
- Show "not verified" or equivalent when no successful backend readiness exists.
- Disable the Export button unless backend readiness is successful and `ready === true`.
- Keep Export placeholder-only. Clicking Export must not create files.
- Avoid wording that says the lesson is ready for export when readiness is unverified.

### Media Stage

In `frontend/src/stages/MediaStage.jsx`, keep local derived cards useful but label the source of truth correctly:

- Local preview cards may still render before backend readiness has run.
- The readiness banner should distinguish unverified local preview from backend-verified readiness.
- Backend file-missing and invalid statuses should remain visible after a successful readiness check.
- The Refresh or Check readiness action should remain available.

Do not remove the existing filters or visual media review surface.

## Regression Tests

Add or update frontend tests in `frontend/test/mediaReadiness.test.js`.

At minimum, cover:

1. `isMediaReady(lesson, null)` returns `false` even when character and scene records are approved and have `imagePath`.
2. `getCompletedStages(lesson, null)` does not include `media` or `export`.
3. `getCompletedStages(lesson, { ready: false, ... })` does not include `media` or `export`.
4. `getCompletedStages(lesson, { ready: true, ... })` includes `media` and may include `export` according to the established completion model.
5. Backend readiness with `file_missing` keeps readiness false and blocks completion.
6. Export-stage tests, if present, confirm the export action is disabled when readiness is idle, checking, error or absent.
7. Export-stage tests, if present, confirm the export action is enabled only when backend readiness succeeded with `ready: true`.

If existing tests expected frontend-only readiness to pass, update them to the new authoritative-backend rule.

## Manual QA Checklist

Run the app with `npm run dev`, then verify:

1. Open a saved project with approved character and scene records.
2. Before checking Media readiness, navigate directly to Export.
3. Confirm Export is not enabled from local lesson state alone.
4. Confirm the UI either auto-checks backend readiness or clearly asks the user to check media readiness.
5. Delete or temporarily rename a local image file for an approved character or scene.
6. Run Media readiness.
7. Confirm file-missing appears as a blocker.
8. Navigate to Export.
9. Confirm Media and Export are not marked complete.
10. Restore the file.
11. Run Media readiness again.
12. Confirm Media and Export become complete only after backend readiness returns `ready: true`.
13. Confirm New/Open/Duplicate still work after a readiness error.
14. Confirm clicking Export still creates no files in Phase 11.

## Acceptance Criteria

- `isMediaReady(lesson, null)` returns `false`.
- Stage completion never marks Media or Export complete without a successful backend readiness result.
- Export is never enabled without a successful backend readiness result with `ready: true`.
- Frontend-derived media state is used only as an unverified preview.
- Backend file-missing readiness blockers are preserved and visible.
- Media-stage filters and preview cards still work.
- Export remains placeholder-only and creates no files.
- Save/open/duplicate behavior remains intact.
- Existing Phase 1-10 workflows remain intact.
- No Phase 12+ scope is introduced.

## Verification Commands

Run:

```sh
npm run test --workspace frontend
npm run test --workspace server
npm run build --workspace frontend
```

Targeted checks:

```sh
rg "isMediaReady|getCompletedStages|mediaReadiness|ready === true|file_missing" frontend/src frontend/test
rg "archiver|JSZip|zip|PowerPoint|pptx|worksheet|audio|video|ElevenLabs|firebase|auth|login|account" frontend server package.json docs
```

If a full test/build command cannot run for environmental reasons, state exactly what was skipped and why.

## Expected Final Response

Report:

- Files changed.
- How backend readiness became authoritative for completion/export.
- Tests added or updated.
- Commands run and results.
- Any skipped checks.

Keep the response brief. Do not claim real export generation was tested, because Phase 11 must remain placeholder-only.
