# Phase 11 Review Prompt

Use this prompt to review whether Milestone 3, Phase 11 of Lesson Source Builder was implemented correctly. The review should verify media readiness only.

## Prompt

You are reviewing Milestone 3, Phase 11 of the Lesson Source Builder implementation.

Your job is to verify that Phase 11 turns the Media stage into a reliable visual-media review and readiness surface. Phase 11 should verify character and scene images are approved, current and file-backed before later export work. It should not create real export packages.

Review Phase 11 only. Do not require ZIP export, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, share links, hosted publishing or external media platform integrations.

## Phase 11 Goal

The implementation is correct only if:

- Media readiness is derived from character and scene records.
- Per-item approval state is not duplicated into `lesson.media.items`.
- Backend readiness checks local project file existence for image paths.
- Missing or malformed item files are reported as readiness blockers without crashing the readiness check.
- Readiness responses do not expose absolute filesystem paths.
- Media is ready only when required characters and scenes are approved, non-stale and file-backed.
- Generated-but-unapproved media is not treated as ready.
- Stale media is not treated as ready.
- Missing characters, missing scenes and uncovered locked story sentences block readiness.
- Media stage clearly shows approved, generated, missing, stale and file-missing states.
- Media stage filters work for All, Needs attention, Characters, Scenes and Approved.
- Export stage displays honest readiness but remains placeholder-only.
- Stage completion uses real media readiness, not merely the presence of generated output.
- Existing character image, scene image, save/open and duplicate flows still work.
- No Phase 12+ or Milestone 4 scope was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-11-implementation-prompt.md
docs/phase-11-media-readiness.md
frontend/src/api/media.js
frontend/src/App.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/stages/ExportStage.jsx
frontend/src/utils/lessonSelectors.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
server/src/index.js
server/src/routes/media.js
server/src/services/mediaReadinessService.js
server/src/services/imageStorage.js
server/src/services/projectStore.js
server/src/services/validateLesson.js
server/test/mediaReadiness.test.js
frontend/test/mediaReadiness.test.js
```

File names may differ, but the implementation should clearly separate:

- Backend media readiness route handling.
- Backend readiness derivation and file checks.
- Frontend media readiness API client.
- Frontend media readiness selectors.
- Media review UI.
- Export readiness summary UI.
- Phase 11 documentation.

## Commands To Consider

Use commands like these as needed:

```sh
git status --short
find server/src server/test frontend/src frontend/test docs -maxdepth 4 -type f | sort
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
npm run dev
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/media/readiness -H "Content-Type: application/json" -d '{}'
rg "media/readiness|mediaReadiness|getMediaReadiness|isMediaReady|getMediaBlockers|file_missing" frontend/src server/src server/test frontend/test docs
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "archiver|JSZip|zip|PowerPoint|pptx|worksheet|audio|video|ElevenLabs|firebase|auth|login|account" frontend server package.json docs
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
```

Expected local URLs if the app is running:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
Media readiness: http://127.0.0.1:3001/api/media/readiness
```

## API Contract To Verify

The backend should expose:

```text
POST /api/media/readiness
```

Expected request:

```json
{
  "lessonId": "lesson-20260910-example"
}
```

Expected success response:

```json
{
  "ready": false,
  "summary": {
    "total": 2,
    "approved": 1,
    "generated": 0,
    "missing": 1,
    "stale": 0,
    "fileMissing": 0
  },
  "items": [],
  "blockers": []
}
```

Expected error behavior:

- `400` for missing `lessonId`.
- `400` for malformed `lessonId`.
- `404` for missing project.
- `422` for invalid saved lesson shape.
- `500` only for unexpected server errors.

All errors should be JSON and should avoid exposing absolute filesystem paths, stack traces or provider internals.

## Review Steps

1. Read `docs/phase-11-implementation-prompt.md`.
2. Read `docs/phase-11-media-readiness.md`.
3. Inspect `server/src/index.js`.
4. Confirm media routes are registered under `/api/media` without disturbing health, projects, story, characters, scenes or images routes.
5. Inspect `server/src/routes/media.js`.
6. Confirm `POST /api/media/readiness` accepts `lessonId`.
7. Confirm route errors map to JSON consistently.
8. Confirm route responses do not leak absolute paths.
9. Inspect `server/src/services/mediaReadinessService.js`.
10. Confirm `lessonId` is validated before project lookup.
11. Confirm missing lesson IDs return `400`.
12. Confirm malformed project IDs return `400`.
13. Confirm missing projects return `404`.
14. Confirm invalid lesson shape returns `422`.
15. Confirm readiness derives items from saved character and scene records.
16. Confirm readiness does not read or trust `lesson.media.items` as the source of per-item approval.
17. Confirm every supported-role character is included unless an intentional optional-character policy is documented and tested.
18. Confirm every current scene record is included unless an intentional optional-scene policy is documented and tested.
19. Confirm draft/unlocked stories are not ready.
20. Confirm missing character records block readiness.
21. Confirm missing scene records block readiness.
22. Confirm uncovered locked story sentences block readiness.
23. Confirm stale lesson-level media/export flags block readiness.
24. Confirm stale character and scene records block readiness.
25. Confirm generated-but-unapproved characters and scenes block readiness.
26. Confirm missing image paths block readiness.
27. Confirm unsafe image paths become item-level invalid/file-missing blockers rather than crashing the whole request.
28. Confirm missing asset files become `file_missing` items.
29. Confirm item-level missing files do not throw route errors.
30. Confirm project-level missing project still throws `404`.
31. Confirm approved, non-stale, file-backed records are counted as approved.
32. Confirm `ready: true` requires no blockers and at least one required media item.
33. Confirm summary counts match item statuses.
34. Confirm blockers are serializable and include enough information to guide fixes.
35. Confirm readiness response never includes absolute filesystem paths.
36. Inspect `server/src/services/imageStorage.js`.
37. Confirm file checks use safe project asset resolution.
38. Confirm malformed paths cannot escape the project asset roots.
39. Inspect frontend `frontend/src/api/media.js`.
40. Confirm it calls `POST /api/media/readiness`.
41. Confirm it parses JSON errors into readable messages.
42. Inspect `frontend/src/utils/lessonSelectors.js`.
43. Confirm `getRequiredMediaItems` derives from character and scene records.
44. Confirm `getMediaSummaryFromItems` counts approved, generated, missing, stale and file-missing states.
45. Confirm `isMediaReady` returns false for stale records.
46. Confirm `isMediaReady` returns false for generated-but-unapproved records.
47. Confirm `isMediaReady` returns false when backend readiness says file-missing.
48. Confirm `getMediaBlockers` includes story, character, scene, stale and item blockers.
49. Confirm `getCompletedStages` no longer marks Media complete just because one generated output exists.
50. Confirm `getCompletedStages` gates Export completion on media readiness.
51. Confirm frontend selector behavior matches backend readiness rules closely enough, with backend file checks treated as authoritative.
52. Inspect normalization and validation.
53. Confirm optional media readiness metadata, if added, is preserved and bounded.
54. Confirm readiness does not depend on stale cached `lastCheckedAt` or similar metadata.
55. Confirm `lesson.media.items` is not repopulated with duplicated approval state.
56. Inspect `frontend/src/App.jsx`.
57. Confirm readiness state has idle/checking/success/error or equivalent.
58. Confirm readiness check saves or uses the current saved project consistently.
59. Confirm stale readiness responses are ignored after project switches.
60. Confirm readiness state resets when project changes, new lesson is created, lesson is duplicated or media-affecting lesson changes occur.
61. Confirm readiness errors do not permanently block New/Open/Duplicate.
62. Confirm Media stage receives readiness data, status, error and refresh callback.
63. Confirm Export stage receives backend readiness only when successful.
64. Inspect `frontend/src/stages/MediaStage.jsx`.
65. Confirm the title/copy no longer calls images placeholders.
66. Confirm readiness summary shows Ready or Needs attention.
67. Confirm summary counts are shown.
68. Confirm Refresh triggers backend readiness check.
69. Confirm backend readiness errors are visible.
70. Confirm filters include All, Needs attention, Characters, Scenes and Approved.
71. Confirm filter updates still persist via `updateMediaFilter`.
72. Confirm cards display image previews through safe asset URLs.
73. Confirm previews fit proportionally and do not crop important content.
74. Confirm cards show status badges for approved/generated/missing/stale/file-missing/invalid.
75. Confirm file-missing state is visible when returned by backend readiness.
76. Confirm stale items remain visible.
77. Confirm generated-but-unapproved items remain visible.
78. Confirm each blocker has useful guidance.
79. Confirm navigation guidance goes back to Characters or Scenes, or clear text guidance exists if callbacks are not supported.
80. Confirm Media stage does not add duplicate generation/approval source-of-truth actions.
81. Inspect `frontend/src/stages/ExportStage.jsx`.
82. Confirm Export stage shows media readiness honestly.
83. Confirm Export stage shows blockers or counts.
84. Confirm Export button is disabled or explicitly placeholder-only when media is not ready.
85. Confirm clicking Export does not create files.
86. Confirm no ZIP/export package generation was added.
87. Confirm existing character image workflows still work.
88. Confirm existing scene image workflows still work.
89. Confirm existing save/open/duplicate workflows still work.
90. Confirm no OpenAI calls were added for Phase 11.
91. Confirm no audio/video/account/cloud/export-package scope was added.

## Backend Tests To Expect

Look for focused backend tests covering:

- Missing `lessonId`.
- Malformed `lessonId`.
- Missing project.
- Invalid saved lesson shape.
- Empty/new lesson returns not ready with blockers.
- Draft/unlocked story returns not ready.
- Missing character records are blockers.
- Unapproved character references are blockers.
- Generated-but-unapproved character references are blockers.
- Stale character references are blockers.
- Character with missing image path is a blocker.
- Character with missing image file returns `file_missing`.
- Approved file-backed character is counted as approved.
- Missing scene records are blockers.
- Scene with missing sentence coverage is a blocker.
- Scene with missing location or description is a blocker.
- Scene with missing character references is a blocker.
- Unapproved scene image is a blocker.
- Generated-but-unapproved scene image is a blocker.
- Stale scene image is a blocker.
- Scene with missing image file returns `file_missing`.
- Uncovered locked story sentence is a blocker.
- Stale `lesson.media` or `lesson.export` flags are blockers.
- Fully approved, non-stale, file-backed characters and scenes produce `ready: true`.
- Readiness response never includes absolute filesystem paths.
- Existing character image tests still pass.
- Existing scene image tests still pass.

## Frontend Tests To Expect

Look for focused frontend tests covering:

- `getMediaReadiness` API client success.
- `getMediaReadiness` API client error parsing.
- Derived media items include required characters and scenes.
- Media summary counts approved/generated/missing/stale/file-missing items.
- `isMediaReady` returns false for stale items.
- `isMediaReady` returns false for generated-but-unapproved items.
- `isMediaReady` returns false when backend readiness reports file-missing.
- `isMediaReady` returns true when all required media is approved/non-stale/file-backed.
- `getMediaBlockers` returns useful story/character/scene/item blockers.
- `getCompletedStages` does not mark Media complete for only one generated item.
- `getCompletedStages` marks Media complete only when required media is ready.
- `getCompletedStages` gates Export completion on media readiness.
- `updateMediaFilter` still persists filter changes.
- Normalization preserves optional media readiness metadata if added.
- Readiness responses are ignored after project switch or stale token if tested at app-helper level.

## Manual QA Checklist

Run the app with `npm run dev`, then verify:

1. `GET /api/health` still returns JSON.
2. `GET /api/projects` still returns JSON.
3. `POST /api/media/readiness` with `{}` returns JSON `400`.
4. Open a project with locked story, approved characters and approved scenes.
5. Go to Media.
6. Click Refresh.
7. Confirm the stage says Ready only when all required images are approved and non-stale.
8. Confirm generated-but-unapproved items show as needing attention.
9. Confirm stale items show as needing attention.
10. Delete or temporarily rename a local image file and click Refresh.
11. Confirm file-missing state is visible without exposing absolute paths.
12. Restore the file.
13. Confirm All, Needs attention, Characters, Scenes and Approved filters work.
14. Confirm Media stage image previews fit proportionally.
15. Confirm guidance links or text direct the user back to Characters or Scenes.
16. Confirm stage completion/navigation state updates only when readiness is satisfied.
17. Confirm Export stage reports media readiness and blockers.
18. Confirm Export remains placeholder-only and creates no files.
19. Confirm New/Open/Duplicate still work after a readiness API error.

Do not perform real ZIP/export package checks in Phase 11.

## Targeted Regression Probes

Use code inspection or small tests for these edge cases:

- `lesson.media.items` contains stale duplicated data; readiness should ignore it and derive from characters/scenes.
- A character is approved with `imagePath` but the file is missing; readiness should return `file_missing`, not `ready: true`.
- A scene is approved with `imagePath` but the file is missing; readiness should return `file_missing`, not `ready: true`.
- A generated but unapproved scene has a valid file; readiness should still be false.
- A stale approved character has a valid file; readiness should still be false.
- Locked story has an uncovered sentence; readiness should be false.
- `lesson.media.stale === true` or `lesson.export.stale === true`; readiness should be false.
- Backend readiness succeeds with no absolute path leakage after a missing-file check.
- User switches projects while readiness check is in flight; old response should not update the new active project.
- Export button click does not write any files.

## Severity Guidance

Use these severity levels:

- `[P1]` for issues that can mark incomplete/stale/file-missing media as export-ready, duplicate stale approval state as source of truth, create real export files, leak filesystem paths, or add forbidden account/cloud/export/media-platform scope.
- `[P2]` for broken API contracts, incomplete blocker detection, frontend/backend readiness mismatch, stale readiness races, stage completion errors, missing file-check coverage, or UI states that block normal workflows.
- `[P3]` for documentation gaps, minor UX clarity issues, narrow test gaps or hardening issues that do not break core acceptance.

## Review Output Format

Return your review in this format:

```text
Phase 11 Review

Findings
- [severity] Title
  File/path: path:line
  Evidence: concise evidence from code, test or runtime probe.
  Why it matters: user-facing or data-integrity impact.
  Recommended fix: specific change to make.

Acceptance Summary
- Backend route/API contract: Pass/Fail with notes.
- Readiness derivation/source of truth: Pass/Fail with notes.
- File-existence checks/path safety: Pass/Fail with notes.
- Frontend Media review UI: Pass/Fail with notes.
- Stage completion/export readiness: Pass/Fail with notes.
- Export boundary: Pass/Fail with notes.
- Phase 1-10 regression risk: Pass/Fail with notes.
- Scope control: Pass/Fail with notes.

Verification
- Commands run and results.
- API probes run and results.
- Manual browser checks run or not run.

Open Questions
- Any unresolved assumptions.

Verdict
- Pass, fail or pass with follow-up, with one short rationale.
```

If no findings are found, say so clearly and still report any meaningful residual risk, such as skipped browser checks.
