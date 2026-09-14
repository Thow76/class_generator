# Phase 10 Review Prompt

Use this prompt to review whether Milestone 3, Phase 10 of Lesson Source Builder was implemented correctly. The review should verify scene image generation only.

## Prompt

You are reviewing Milestone 3, Phase 10 of the Lesson Source Builder implementation.

Your job is to verify that Phase 10 generates, persists, displays, regenerates and approves scene images from Phase 9 planned scene records and Phase 8 approved character references.

Review Phase 10 only. Do not require audio/video generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable cross-project media libraries or external media platform integrations.

## Phase 10 Goal

The implementation is correct only if:

- Scene image generation requires a saved lesson.
- Scene image generation requires a locked story with a valid explicit locked snapshot.
- Scene image generation requires an existing planned scene record.
- Scene image generation uses the planned scene record as the source of scene fields.
- Scene image generation uses locked story text, not editable draft text.
- Scene image generation requires approved, non-stale character reference images for every scene character.
- Scene image generation rejects missing character image files.
- Scene image generation rejects stale scene records.
- Scene image generation rejects mixed character image styles within a scene.
- The backend exposes `POST /api/images/scene`.
- The backend exposes `POST /api/images/scene/approve`.
- The backend calls OpenAI image generation only from server-side code.
- Generated scene image files are saved under the project data directory.
- Scene records store safe project-relative image paths and serializable metadata.
- The Scenes stage displays generated scene images proportionally without cropping.
- Regeneration preserves editable scene fields.
- Approval verifies the generated file exists before marking the scene approved.
- Reuse mode does not call OpenAI and does not mutate the source scene.
- Scene image state persists after save/open/duplicate.
- Scene images appear in the Media stage through existing derived media behavior.
- Existing Phase 1-9 behavior still works.
- No Phase 11+ or Milestone 4 scope was added.

## Expected Files

Verify that these files or close equivalents exist:

```text
docs/phase-10-implementation-prompt.md
docs/phase-10-scene-images.md
frontend/src/api/images.js
frontend/src/App.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/styles.css
server/src/routes/images.js
server/src/services/sceneImageService.js
server/src/prompts/sceneImagePrompts.js
server/src/services/imageStorage.js
server/src/services/openaiClient.js
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/sceneImage.test.js
frontend/test/sceneImages.test.js
```

File names may differ, but the implementation should clearly separate:

- Backend scene image route handling.
- Backend scene image generation/approval service.
- Backend scene image prompt construction.
- Backend local image storage and safe asset serving.
- Frontend scene image API client.
- Frontend per-scene operation state.
- Scene record normalization/validation.
- Phase 10 documentation.

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
curl -s -X POST http://127.0.0.1:3001/api/images/scene -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://127.0.0.1:3001/api/images/scene/approve -H "Content-Type: application/json" -d '{}'
rg "images/scene|generateSceneImage|approveSceneImage|sceneImage|scene-image|saveSceneImage" frontend/src server/src server/test frontend/test docs
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "audio|video|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
```

Expected local URLs if the app is running:

```text
Frontend: http://127.0.0.1:5173/
Backend health: http://127.0.0.1:3001/api/health
Projects list: http://127.0.0.1:3001/api/projects
Scene generation: http://127.0.0.1:3001/api/images/scene
Scene approval: http://127.0.0.1:3001/api/images/scene/approve
```

## API Contract To Verify

The backend should expose:

```text
POST /api/images/scene
POST /api/images/scene/approve
```

### `POST /api/images/scene`

Expected request:

```json
{
  "lessonId": "lesson-20260910-example",
  "sceneId": "scene-1"
}
```

Expected success response:

```json
{
  "lesson": {
    "id": "lesson-20260910-example",
    "scenes": []
  },
  "image": {
    "sceneId": "scene-1",
    "imagePath": "/api/projects/lesson-20260910-example/assets/images/scenes/example.png",
    "projectRelativePath": "images/scenes/example.png",
    "imageMeta": {}
  }
}
```

Expected generation errors:

- `400` for missing or malformed `lessonId`.
- `400` for missing or malformed `sceneId`.
- `404` for missing project.
- `404` for missing scene when the scene ID is safe but not found.
- `422` when the story is not locked.
- `422` when the locked story snapshot is missing, empty or invalid.
- `422` when no scene plan exists.
- `422` when target scene has no sentence coverage.
- `422` when target scene references unknown locked story sentence IDs.
- `422` when target scene has empty location or description.
- `422` when target scene is stale.
- `422` when target scene has no characters.
- `422` when any target scene character is missing.
- `422` when any target scene character is stale, unapproved or missing image path.
- `422` when any target scene character image file is missing.
- `422` when target scene character image styles are mixed.
- `422` when `imageMode === "reuse"` but `reuseSceneId` is missing, invalid, self-referential or points to an unusable source scene.
- `503` for missing OpenAI configuration or provider failures.
- `500` only for unexpected server errors.

### `POST /api/images/scene/approve`

Expected request:

```json
{
  "lessonId": "lesson-20260910-example",
  "sceneId": "scene-1"
}
```

Expected approval errors:

- `400` for missing or malformed IDs.
- `404` for missing project.
- `404` for missing scene.
- `422` when the scene has no image path.
- `422` when the scene is stale.
- `422` when the generated scene image file is missing.

All errors should be JSON and should avoid exposing secrets, raw provider internals, absolute private filesystem paths or stack traces.

## Review Steps

1. Read `docs/phase-10-implementation-prompt.md`.
2. Read `docs/phase-10-scene-images.md`.
3. Inspect `server/src/index.js`.
4. Confirm image routes remain registered without disturbing health, projects, story, characters or scene-planning routes.
5. Inspect `server/src/routes/images.js`.
6. Confirm character image routes still exist.
7. Confirm scene image generation and approval routes exist.
8. Confirm all image route errors map to JSON consistently.
9. Confirm scene errors are not accidentally routed through character-only error mapping.
10. Confirm route logs do not leak provider internals or absolute paths.
11. Inspect `server/src/services/imageStorage.js`.
12. Confirm character image storage still works.
13. Confirm scene images save under `images/scenes/`.
14. Confirm project IDs and scene IDs are validated before file writes.
15. Confirm filenames use safe IDs/timestamps, not lesson title, scene label, location or description.
16. Confirm generated image payloads are decoded and content-validated before writing.
17. Confirm PNG signature validation still applies to `.png` outputs.
18. Confirm writes are atomic where practical.
19. Confirm returned paths are project-relative or safe asset URLs.
20. Confirm absolute filesystem paths are not stored in `lesson.json`.
21. Confirm asset serving remains restricted to allowed image roots and extensions.
22. Inspect `server/src/prompts/sceneImagePrompts.js`.
23. Confirm prompt uses locked story sentences covered by the target scene.
24. Confirm prompt uses scene label, location, description and character IDs.
25. Confirm prompt includes approved character reference metadata without absolute paths.
26. Confirm prompt respects `imageStyle`.
27. Confirm mixed image styles are rejected before prompt/model call, not silently resolved.
28. Confirm prompt asks for a scene image, not a character portrait.
29. Confirm prompt avoids text, captions, watermarks, UI, logos and speech bubbles.
30. Confirm prompt avoids CEFR labels.
31. Confirm prompt avoids audio/video/export instructions.
32. Confirm prompt is versioned.
33. Inspect `server/src/services/sceneImageService.js`.
34. Confirm `lessonId` and `sceneId` are validated before project/scene lookup.
35. Confirm malformed `sceneId` returns `400`.
36. Confirm safe missing scene IDs return `404`.
37. Confirm service checks raw persisted locked snapshot before normalization can repair legacy data.
38. Confirm service uses `story.lockedSentences` as the story source.
39. Confirm service rejects unlocked/draft stories.
40. Confirm service rejects empty or invalid locked snapshots.
41. Confirm service rejects lessons with no planned scenes.
42. Confirm service rejects stale target scenes.
43. Confirm service rejects empty target scene sentence coverage.
44. Confirm service rejects scene sentence IDs not present in the locked snapshot.
45. Confirm service rejects empty scene location and description.
46. Confirm service rejects invalid `imageMode`.
47. Confirm service rejects scenes with no character IDs.
48. Confirm service resolves characters by stable ID, not array index.
49. Confirm service rejects missing characters.
50. Confirm service requires every target scene character to be approved.
51. Confirm service requires every target scene character to have `generationStatus === "approved"`.
52. Confirm service requires every target scene character to be non-stale.
53. Confirm service requires every target scene character to have an existing image file.
54. Confirm service rejects mixed character image styles.
55. Confirm local validation failures happen before OpenAI is called.
56. Confirm missing OpenAI configuration maps to JSON `503`.
57. Confirm provider failures map to JSON `503` and do not mutate the saved project.
58. Confirm invalid provider image payloads do not mutate the saved project or write files.
59. Confirm successful generation saves a file under `images/scenes/`.
60. Confirm successful generation updates only the target scene.
61. Confirm successful generation preserves label, sentenceIds, location, description, characterIds, imageMode and reuseSceneId.
62. Confirm successful generation increments `generationCount`.
63. Confirm successful generation sets `generationStatus: "generated"`.
64. Confirm successful generation clears approval.
65. Confirm successful generation clears stale state only after a valid generation.
66. Confirm successful generation writes serializable `imageMeta`.
67. Confirm `imageMeta` includes model, prompt version, generated time, source story lock time, source scene plan time, source character image paths, resolved image style and file name.
68. Confirm regeneration supersedes/replaces the current scene image path without deleting unrelated scene data.
69. Inspect reuse-mode behavior.
70. Confirm `imageMode: "reuse"` does not call OpenAI.
71. Confirm reuse rejects missing `reuseSceneId`.
72. Confirm reuse rejects self-reference.
73. Confirm reuse rejects missing source scenes.
74. Confirm reuse rejects stale source scenes if the implementation claims to do so.
75. Confirm reuse rejects source scenes with no generated/approved image.
76. Confirm reuse verifies the source image file exists.
77. Confirm reuse does not mutate the source scene.
78. Confirm reuse gives the target scene its own approval state.
79. Confirm reuse metadata records source scene ID and source image path.
80. Inspect `approveSceneImageForProject`.
81. Confirm approval validates IDs and lesson shape.
82. Confirm approval rejects missing scenes.
83. Confirm approval rejects imageless scenes.
84. Confirm approval rejects stale scenes.
85. Confirm approval verifies the image file exists under project assets.
86. Confirm approval preserves image path and metadata.
87. Confirm approval updates only the target scene.
88. Inspect frontend normalization and validation.
89. Confirm scene image paths allow safe `images/scenes/...` values.
90. Confirm unsafe scene image paths are rejected or normalized safely.
91. Confirm scene `imageMeta` survives save/open/duplicate.
92. Confirm old projects with no scene `imageMeta` still load.
93. Inspect `frontend/src/api/images.js`.
94. Confirm `generateSceneImage` calls `POST /api/images/scene`.
95. Confirm `approveSceneImage` calls `POST /api/images/scene/approve`.
96. Confirm JSON errors are surfaced readably.
97. Inspect `frontend/src/App.jsx`.
98. Confirm scene image generation saves the current lesson first.
99. Confirm per-scene operation state exists.
100. Confirm scene image operation responses are ignored after project switch.
101. Confirm scene image operation responses are ignored after stale operation tokens.
102. Confirm project New/Open/Duplicate and conflicting operations are disabled or guarded while a scene image operation is active.
103. Confirm operation error state does not permanently block project controls.
104. Confirm the project list refreshes quietly after successful generation/approval.
105. Inspect `frontend/src/stages/ScenesStage.jsx`.
106. Confirm generated scene images render through safe project asset URLs.
107. Confirm scene image display uses proportional fit, not crop.
108. Confirm placeholder UI remains when no image exists.
109. Confirm target-scene loading text is visible for generation and approval.
110. Confirm per-scene errors are visible.
111. Confirm Generate/Regenerate is disabled when scene planning or scene image operation is active.
112. Confirm Generate/Regenerate is disabled for stale scenes.
113. Confirm Generate/Regenerate is disabled for empty coverage/location/description.
114. Confirm Generate/Regenerate is disabled when referenced characters are not approved/non-stale/image-backed.
115. Confirm Use This Scene is disabled until an image path exists and the scene is non-stale.
116. Confirm manual scene editing stays available when no scene operation is active.
117. Confirm manual scene edits after generation mark the scene stale and clear approval.
118. Confirm reuse scene selector excludes the current scene.
119. Confirm reuse UI does not imply export or media packaging.
120. Inspect `frontend/src/stages/MediaStage.jsx` and selectors.
121. Confirm scene images appear through derived media items.
122. Confirm no duplicate media table/state was added unnecessarily.
123. Confirm existing Phase 8 character image generation still works.
124. Confirm existing Phase 9 scene planning still works.
125. Confirm no audio/video/export/account/cloud scope was added.

## Backend Tests To Expect

Look for focused backend tests covering:

- Missing `lessonId`.
- Missing `sceneId`.
- Malformed `sceneId`.
- Safe missing scene ID.
- Missing project.
- Draft/unlocked story rejection.
- Raw locked snapshot missing/empty/mismatch rejection.
- No scene plan rejection.
- Empty scene sentence coverage rejection.
- Unknown locked sentence ID rejection.
- Empty scene location rejection.
- Empty scene description rejection.
- Stale target scene rejection.
- Missing scene character rejection.
- Unapproved scene character rejection.
- Stale scene character rejection.
- Scene character missing image path rejection.
- Scene character image file missing rejection.
- Mixed character image style rejection.
- OpenAI not called when local validation fails.
- Missing API key maps to `503`.
- Provider failure maps to `503` without mutation.
- Invalid image payload maps to `503` without mutation or file writes.
- Prompt includes planned scene fields, locked story text and character reference metadata.
- Prompt avoids CEFR labels.
- Successful generation saves a file under `images/scenes/`.
- Successful generation updates only the target scene.
- Successful generation preserves editable scene fields.
- Regeneration increments count and clears approval.
- Approval requires an existing image file.
- Approval rejects stale scenes.
- Reuse mode does not call OpenAI.
- Reuse mode rejects missing/stale/imageless source scenes.
- Reuse mode does not mutate the source scene.
- Character image route regressions still pass.
- Scene planning route regressions still pass.

## Frontend Tests To Expect

Look for focused frontend tests covering:

- `generateSceneImage` API client success.
- `approveSceneImage` API client success.
- API client error parsing.
- Scene project-relative image paths become renderable asset URLs.
- Derived Media stage items include scene image paths.
- Manual scene edits after generation keep image path but mark stale and clear approval.
- Scene approval requires image path and unstale scene.
- Normalization preserves scene image path and metadata.
- Validation rejects unsafe scene image paths.
- Stale scene image responses are ignored after project switch.
- Stale scene image responses are ignored after operation token changes.
- Scene image errors remain visible for the target scene.

## Manual QA Checklist

Run the app with `npm run dev`, then verify:

1. `GET /api/health` still returns JSON.
2. `GET /api/projects` still returns JSON.
3. Create or open a saved lesson.
4. Lock a story.
5. Extract characters.
6. Generate and approve required character references.
7. Plan scenes.
8. Confirm scene cards have sentence coverage, location, description and characters.
9. Generate one scene image.
10. Confirm loading state appears.
11. Confirm the generated scene image displays fully and proportionally.
12. Confirm a scene image file exists under `server/data/projects/<id>/images/scenes/`.
13. Confirm the scene record stores a project-relative `imagePath`.
14. Approve the scene.
15. Save, refresh and reopen the project.
16. Confirm the scene image and approval state persist.
17. Confirm the scene appears in the Media stage.
18. Edit the scene description after approval.
19. Confirm the scene becomes stale and approval clears while image remains visible for review.
20. Regenerate the scene.
21. Confirm only the target scene changes.
22. Try approving an imageless scene and confirm a visible error.
23. Try generating with a stale/unapproved character and confirm a visible error.
24. Try generating with mixed illustration/photorealistic character styles and confirm a visible error.
25. Try reuse mode with a valid source scene image.
26. Confirm reuse does not create a new provider call if instrumented or mocked.
27. Confirm source scene is not mutated by reuse.
28. Confirm New/Open/Duplicate cannot apply stale scene-image responses to another project.

Do not perform ZIP/export checks in Phase 10.

## Targeted Regression Probes

Use code inspection or small tests for these edge cases:

- Persisted `story.sentences` text differs from `story.lockedSentences`; scene image prompt should use the locked snapshot only.
- Persisted locked story has missing/empty `lockedSentences`; scene image generation should return `422`, not rebuild from editable text.
- Scene references `sentence-999`; generation should return `422`.
- Scene is stale but has `imagePath`; generation and approval should reject until reviewed/regenerated.
- Scene includes character `character-missing`; generation should return `422`.
- Scene character is approved but image file is missing; generation should return `422`.
- Scene character is approved but stale; generation should return `422`.
- Scene has one illustrated character and one photorealistic character; generation should return `422`.
- Provider returns malformed base64 or non-PNG data; project should not mutate and no file should be written.
- Reuse scene points to itself; generation should return `422`.
- Reuse source scene is stale or missing its file; generation should return `422`.
- User switches projects while scene generation is in flight; old response should not overwrite the active lesson.

## Severity Guidance

Use these severity levels:

- `[P1]` for issues that can overwrite user work, use editable story text instead of locked text, approve missing files, call OpenAI from the frontend, mutate projects after failed validation, leak secrets/absolute paths, or introduce forbidden export/account/cloud/media scope.
- `[P2]` for broken API contracts, missing stale-state guards, unsafe reuse behavior, missing character-reference validation, project-switch race conditions, persistence gaps, or UI states that block normal workflows.
- `[P3]` for documentation gaps, minor UX clarity issues, narrow test gaps or hardening issues that do not break core acceptance.

## Review Output Format

Return your review in this format:

```text
Phase 10 Review

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
- Scene image generation/storage: Pass/Fail with notes.
- Scene image approval: Pass/Fail with notes.
- Reuse mode: Pass/Fail with notes.
- Frontend scene image flow: Pass/Fail with notes.
- Persistence/media derivation: Pass/Fail with notes.
- Phase 1-9 regression risk: Pass/Fail with notes.
- Scope control: Pass/Fail with notes.

Verification
- Commands run and results.
- API probes run and results.
- Manual browser checks run or not run.
- Live OpenAI image checks run or not run.

Open Questions
- Any unresolved assumptions.

Verdict
- Pass, fail or pass with follow-up, with one short rationale.
```

If no findings are found, say so clearly and still report any meaningful residual risk, such as skipped live OpenAI image checks.
