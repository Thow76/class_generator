# Phase 9 Review Prompt

Use this prompt to review whether Milestone 3, Phase 9 of Lesson Source Builder was implemented correctly. The review should verify scene planning only.

## Prompt

You are reviewing Milestone 3, Phase 9 of the Lesson Source Builder implementation.

Your job is to verify that Phase 9 converts the locked master story and approved character references into persistent, editable scene records. Phase 9 should create a scene plan for tutor review; it should not generate scene images or introduce later media/export/account scope.

Review Phase 9 only. Do not require scene image generation, audio/video generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable cross-project scene libraries or external media platform integrations.

## Phase 9 Goal

The implementation is correct only if:

- Scene planning requires a saved lesson.
- Scene planning requires `story.status === "locked"`.
- Scene planning uses `story.lockedSentences` as the authoritative source.
- Scene planning rejects missing, empty or mismatched locked story snapshots.
- Scene planning requires required character records to exist.
- Scene planning requires required character references to be approved, non-stale and backed by image paths.
- The backend exposes `POST /api/scenes/plan`.
- The backend calls OpenAI only from server-side code.
- The model response is structured JSON and validated before saving.
- Every locked story sentence is covered exactly once unless a different documented policy is intentionally implemented and tested.
- Scene records are saved into the existing `lesson.scenes` model.
- Replanning preserves stable scene IDs when scenes match safely.
- Existing generated or approved scene work is not silently deleted.
- Changed or unmatched generated/approved scenes are marked stale for review.
- The frontend exposes a Plan Scenes flow with loading, success and error states.
- The frontend keeps manual scene editing usable after planning.
- Existing Phase 1-8 behavior still works.
- No Phase 10+ or Milestone 4 scope was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-9-implementation-prompt.md
docs/phase-9-scene-planning.md
frontend/src/api/scenes.js
frontend/src/App.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
server/src/index.js
server/src/routes/scenes.js
server/src/services/scenePlanningService.js
server/src/prompts/scenePrompts.js
server/src/schemas/sceneSchemas.js
server/src/services/validateScenePlan.js
server/src/services/openaiClient.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/scenePlanning.test.js
frontend/test/scenePlanning.test.js
```

File names may differ, but the implementation should clearly separate:

- Backend scene route handling.
- Backend scene planning orchestration.
- Backend scene prompt construction.
- Backend scene response schema/format definition.
- Backend semantic scene-plan validation.
- Frontend scene API client.
- Frontend scene-planning UI state.
- Scene normalization/validation for save, open and duplicate flows.
- Phase 9 documentation.

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
curl -s -X POST http://127.0.0.1:3001/api/scenes/plan -H "Content-Type: application/json" -d '{}'
rg "scenes/plan|planScenes|scenePlanning|scene-plan|validateScenePlan|scenesMeta" frontend/src server/src server/test frontend/test docs
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "images/scene|/api/images/scene|scene image|image prompt|audio|video|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
```

Expected local URLs if the app is running:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
Scene planning: http://127.0.0.1:3001/api/scenes/plan
```

## API Contract To Verify

The backend should expose:

```text
POST /api/scenes/plan
```

Expected request:

```json
{
  "lessonId": "lesson-20260909-example"
}
```

Expected success response:

```json
{
  "lesson": {
    "id": "lesson-20260909-example",
    "scenes": []
  }
}
```

The response should return the full updated lesson object, matching the story, character and image operation pattern.

Expected error behavior:

- `400` for missing or malformed `lessonId`.
- `404` for missing project.
- `422` when the story is not locked.
- `422` when the locked story snapshot is missing, empty or invalid.
- `422` when required characters are missing.
- `422` when required characters do not have approved image references.
- `422` when any required character is stale.
- `422` when model output fails schema or semantic validation.
- `503` for missing OpenAI configuration or provider failures.
- `500` only for unexpected server errors.

All errors should be JSON and should avoid exposing secrets, raw provider internals, absolute private filesystem paths or stack traces.

## Review Steps

1. Read `docs/phase-9-implementation-prompt.md`.
2. Read `docs/phase-9-scene-planning.md`.
3. Inspect `server/src/index.js`.
4. Confirm scene routes are registered without disturbing health, projects, story, characters or images routes.
5. Inspect `server/src/routes/scenes.js`.
6. Confirm `POST /api/scenes/plan` accepts `lessonId`, returns `{ lesson }` on success and returns JSON errors on failure.
7. Confirm missing `lessonId` returns `400`.
8. Confirm malformed project IDs return `400`, not `404` or `500`.
9. Confirm missing projects return `404`.
10. Inspect `server/src/services/scenePlanningService.js`.
11. Confirm local validation happens before the OpenAI call.
12. Confirm the service requires a saved project and uses project-store persistence.
13. Confirm the service validates canonical lesson shape before mutation.
14. Confirm the service rejects unlocked or draft stories.
15. Confirm the service checks the raw persisted locked snapshot before normalization can repair legacy data.
16. Confirm the service rejects missing, empty, mismatched or malformed `story.lockedSentences`.
17. Confirm planning source text comes from `story.lockedSentences`, not editable `story.sentences`.
18. Confirm required characters include the setup main character by name, not merely any `role: "main"` record.
19. Confirm required main, secondary and supporting characters are checked by stable IDs.
20. Confirm required characters must have `approved: true`, `generationStatus: "approved"`, non-empty `imagePath` and `stale !== true`.
21. Confirm stale or unapproved required characters fail before OpenAI is called.
22. Confirm optional/background character handling is intentional and documented.
23. Confirm OpenAI is called through `server/src/services/openaiClient.js` or an equivalent backend wrapper.
24. Confirm the frontend never imports OpenAI or reads API keys.
25. Confirm missing OpenAI configuration maps to a JSON `503`.
26. Confirm provider failures map to a JSON `503` without mutating the project.
27. Inspect `server/src/prompts/scenePrompts.js`.
28. Confirm the prompt includes locked sentence IDs and text.
29. Confirm the prompt includes only approved character IDs/names/roles needed for continuity.
30. Confirm the prompt includes useful lesson setup context such as setting, scenario and learner level.
31. Confirm the prompt asks for scene grouping, not image generation.
32. Confirm the prompt tells the model not to invent characters.
33. Confirm the prompt avoids camera, lens, rendering, style and image-prompt language reserved for later phases.
34. Confirm the prompt avoids CEFR labels such as A1, A2 and B1.
35. Confirm the prompt is versioned.
36. Inspect `server/src/schemas/sceneSchemas.js`.
37. Confirm the structured response format accepts only scene-planning fields that map to the existing scene model.
38. Confirm unsupported generated media fields are not part of the schema.
39. Inspect `server/src/services/validateScenePlan.js`.
40. Confirm invalid JSON or empty model output is rejected.
41. Confirm missing `scenes` is rejected.
42. Confirm an empty scene list is rejected for a non-empty locked story.
43. Confirm each scene requires `label`, `sentenceIds`, `location`, `description`, `characterIds`, `imageMode` and `reuseSceneId` or documented equivalents.
44. Confirm unknown sentence IDs are rejected.
45. Confirm duplicate sentence IDs within one scene are rejected.
46. Confirm duplicate sentence coverage across scenes is rejected unless a different policy is documented and tested.
47. Confirm missing coverage for any locked sentence is rejected.
48. Confirm scenes must follow locked story order.
49. Confirm unknown character IDs are rejected.
50. Confirm unapproved, stale or image-less character IDs are rejected.
51. Confirm empty labels, locations and descriptions are rejected.
52. Confirm overly long labels, locations and descriptions are rejected.
53. Confirm unsupported fields such as `imagePrompt`, `imagePath`, `imageUrl`, `camera`, `lens`, `style`, `audio`, `video` or `zip` are rejected.
54. Confirm CEFR labels in returned scene text are rejected.
55. Confirm validation normalizes safe values by trimming text and sorting sentence IDs by locked story order.
56. Confirm invalid model output does not save partial scene changes.
57. Inspect the scene merge logic.
58. Confirm exact sentence coverage matches preserve existing scene IDs.
59. Confirm overlap matching is conservative and never matches by label alone.
60. Confirm new scenes receive stable safe IDs that do not collide.
61. Confirm generated or approved matched scenes preserve generation state, approval state and image path for review.
62. Confirm generated or approved matched scenes are marked stale when coverage, characters, location or description changes.
63. Confirm generated or approved unmatched scenes are preserved and marked stale.
64. Confirm ungenerated unmatched scenes may be replaced only when that behavior is intentional and documented.
65. Confirm existing manual edits are not silently destroyed in a way that loses meaningful user work.
66. Confirm successful planning updates `currentStage` to `scenes` only if that matches the app's workflow convention.
67. Confirm planning metadata such as `scenesMeta` is serializable and preserved by normalization, validation, save, open and duplicate flows.
68. Inspect `frontend/src/api/scenes.js`.
69. Confirm it calls `POST /api/scenes/plan`.
70. Confirm it parses JSON errors into readable messages.
71. Inspect `frontend/src/App.jsx`.
72. Confirm scene planning saves the current lesson before calling the backend.
73. Confirm scene planning applies the returned lesson only if the response still belongs to the active project/operation.
74. Confirm project switching, new lesson, open lesson, duplicate, story operations, character extraction and character image operations are disabled or guarded while scene planning is active.
75. Confirm scene planning status can recover after success and error.
76. Confirm scene planning errors do not permanently block project controls.
77. Confirm scene planning does not mark unrelated save/open state incorrectly.
78. Inspect `frontend/src/stages/ScenesStage.jsx`.
79. Confirm Plan Scenes is visible on the Scenes stage.
80. Confirm Plan Scenes is disabled until the story is locked and required character references are approved.
81. Confirm loading, success and error states are visible.
82. Confirm replanning existing scenes requires confirmation.
83. Confirm the confirmation text makes clear that generated/approved scene work will be preserved for review when stale.
84. Confirm manual scene editing controls remain available after planning.
85. Confirm manual scene editing controls are disabled during active planning.
86. Confirm unassigned sentence display updates after planned and manual coverage changes.
87. Inspect `frontend/src/utils/lessonUpdates.js`.
88. Confirm manual scene coverage, location, description, image mode and approval edits still mark affected generated/approved scene records stale where appropriate.
89. Inspect `frontend/src/utils/lessonSelectors.js`.
90. Confirm scene readiness selectors use the same character approval rules as the backend where practical.
91. Inspect normalization and validation on both frontend and backend.
92. Confirm `scenes` and optional `scenesMeta` survive save/open/duplicate.
93. Confirm unknown future fields are not silently discarded unless the app already has a documented stripping policy.
94. Confirm malformed saved scene data is handled with clear validation errors or safe normalization.
95. Confirm existing Phase 6 story regeneration/lock/unlock behavior still marks characters and scenes stale as intended.
96. Confirm existing Phase 7 character extraction behavior still preserves setup main character guarantees.
97. Confirm existing Phase 8 character image generation/approval behavior still works and feeds Phase 9 readiness.
98. Confirm no browser `localStorage` or direct frontend filesystem persistence was introduced.
99. Confirm no scene image generation endpoint, image-generation model call or image prompt builder was added.
100. Confirm no account/cloud/export/media scope was added.

## Backend Tests To Expect

Look for focused backend tests covering:

- Missing `lessonId`.
- Malformed `lessonId`.
- Missing project.
- Draft/unlocked story rejection.
- Raw locked snapshot missing/empty/mismatch rejection.
- Use of locked story snapshot instead of editable story text.
- Missing setup main character rejection.
- Missing character records rejection.
- Unapproved character rejection.
- Stale character rejection.
- Character with no image path rejection.
- OpenAI is not called when local validation fails.
- Missing OpenAI configuration maps to `503`.
- Provider failure maps to `503` and does not mutate the project.
- Invalid JSON response rejection.
- Missing scenes array rejection.
- Empty scene plan rejection for non-empty story.
- Unknown sentence ID rejection.
- Duplicate sentence coverage rejection.
- Missing sentence coverage rejection.
- Out-of-order scene rejection.
- Unknown/unapproved/stale character ID rejection.
- Unsupported future media fields rejection.
- CEFR label rejection.
- Successful planning saves scenes and metadata.
- Successful planning preserves stable IDs on exact coverage match.
- Replanning marks changed generated/approved scenes stale.
- Replanning preserves unmatched generated/approved scenes as stale.
- Invalid model output does not save partial scene changes.

## Frontend Tests To Expect

Look for focused frontend tests covering:

- `planScenes` API client success.
- `planScenes` API client error parsing.
- Plan Scenes disabled when the story is not locked.
- Plan Scenes disabled when required character references are not approved.
- Plan Scenes visible/enabled when prerequisites are satisfied.
- Loading, success and error states.
- Replanning confirmation when scenes already exist.
- Manual scene coverage controls still work after planning.
- Scene planning active state disables conflicting operations or ignores stale responses.
- Scene planning error state does not permanently block project controls.

## Manual QA Checklist

Run the app with `npm run dev`, then verify:

1. Health still returns JSON at `/api/health`.
2. Project list still returns JSON at `/api/projects`.
3. Create or open a saved lesson.
4. Generate and lock a story.
5. Extract required characters.
6. Generate and approve required character references.
7. Go to Scenes.
8. Confirm Plan Scenes is enabled only after prerequisites are satisfied.
9. Click Plan Scenes.
10. Confirm loading state appears.
11. Confirm scene cards appear and cover the locked story sentences.
12. Confirm current stage, scenes and metadata persist after save/open.
13. Edit a scene location or description.
14. Add and remove sentence references manually.
15. Confirm unassigned sentence state updates correctly.
16. Replan with existing scenes and confirm the warning appears first.
17. Confirm generated or approved existing scene work is preserved or marked stale, not silently deleted.
18. Confirm opening a different project during planning does not allow a stale response to overwrite the active project.
19. Confirm scene planning failures show visible errors and leave the lesson usable.
20. Confirm no scene image files are generated by Phase 9.

## Targeted Regression Probes

Use code inspection or small tests for these edge cases:

- Persisted `story.sentences` text differs from `story.lockedSentences`; the prompt and output should use the locked snapshot only.
- A locked project has empty or missing `lockedSentences`; scene planning should return `422` instead of silently rebuilding from editable text.
- Setup main character is `Marta`, but `lesson.characters` contains only `{ name: "Alex", role: "main" }`; scene planning should reject missing required characters.
- A required character is approved but stale; scene planning should reject it.
- A required character has `approved: true` but `generationStatus !== "approved"`; scene planning should reject it.
- A model response references `sentence-999`; validation should reject it.
- A model response covers `sentence-1` twice; validation should reject it.
- A model response omits a locked sentence; validation should reject it.
- A model response references an optional, stale, unknown or unapproved character; validation should reject it.
- A model response includes `imagePrompt`, `imagePath`, `camera`, `style`, `audio`, `video` or `zip`; validation should reject it.
- Replanning changes the sentence coverage for a generated scene; the old generated work should be preserved and marked stale where appropriate.
- Replanning while the user switches projects should not apply the old response to the new active lesson.

## Severity Guidance

Use these severity levels:

- `[P1]` for issues that can overwrite user work, use the wrong story source, bypass required character approvals, call OpenAI from the frontend, mutate projects after failed validation, or add forbidden Phase 10+ scope.
- `[P2]` for broken error contracts, missing stale marking, incomplete merge preservation, project-switch race conditions, persistence gaps, or disabled/error states that block normal workflows.
- `[P3]` for documentation gaps, minor UX clarity issues, narrow test gaps or hardening issues that do not break core acceptance.

## Review Output Format

Return your review in this format:

```text
Phase 9 Review

Findings
- [severity] Title
  File/path: path:line
  Evidence: concise evidence from code, test or runtime probe.
  Why it matters: user-facing or data-integrity impact.
  Recommended fix: specific change to make.

Acceptance Summary
- Backend route/API contract: Pass/Fail with notes.
- Locked story authority: Pass/Fail with notes.
- Character-reference prerequisites: Pass/Fail with notes.
- Scene-plan validation: Pass/Fail with notes.
- Scene merge/persistence: Pass/Fail with notes.
- Frontend planning flow: Pass/Fail with notes.
- Phase 1-8 regression risk: Pass/Fail with notes.
- Scope control: Pass/Fail with notes.

Verification
- Commands run and results.
- API probes run and results.
- Manual browser checks run or not run.
- Live OpenAI checks run or not run.

Open Questions
- Any unresolved assumptions.

Verdict
- Pass, fail or pass with follow-up, with one short rationale.
```

If no findings are found, say so clearly and still report any meaningful residual risk, such as skipped live OpenAI checks.
