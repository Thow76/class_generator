# Phase 11 Implementation Prompt

Use this prompt to implement Milestone 3, Phase 11 of Lesson Source Builder.

## Prompt

You are implementing Milestone 3, Phase 11 of Lesson Source Builder.

Phase 7 created editable character records. Phase 8 generated and approved character reference images. Phase 9 planned editable scenes. Phase 10 generated and approved persistent scene images. Phase 11 should turn the Media stage into a real media review and readiness surface that verifies all required visual assets are approved, non-stale, file-backed and ready for the later export pipeline.

Implement Phase 11 only. Do not add ZIP export, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, share links, hosted publishing or external media platform integrations.

## Phase 11 Goal

Provide a reliable final visual-media review before export.

Done means:

- The Media stage no longer reads like a placeholder.
- The Media stage derives review items from character and scene records.
- The Media stage clearly shows which character and scene images are approved, generated-but-unapproved, missing, stale or file-missing.
- The app can verify that approved image paths still resolve to files in the local project folder.
- The app can compute a single media readiness result for the whole lesson.
- Export stage availability/completion is based on real media readiness, not merely the existence of any approved character or scene.
- The Media stage gives clear navigation or workflow guidance back to Characters or Scenes for fixes.
- Media review state persists only where useful and does not duplicate per-item approval state.
- Existing character and scene generation/approval workflows remain the source of truth.
- No real export package is created in this phase.

## Starting Point

Important existing files:

```text
docs/phase-8-character-reference-images.md
docs/phase-9-scene-planning.md
docs/phase-10-scene-images.md
docs/phase-10-implementation-prompt.md
frontend/src/App.jsx
frontend/src/stages/MediaStage.jsx
frontend/src/stages/ExportStage.jsx
frontend/src/stages/CharactersStage.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/utils/lessonSelectors.js
frontend/src/utils/lessonUpdates.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/data/lessonSchema.js
frontend/src/api/images.js
frontend/src/api/projects.js
server/src/index.js
server/src/routes/images.js
server/src/routes/projects.js
server/src/services/projectStore.js
server/src/services/imageStorage.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/test/characterImage.test.js
server/test/sceneImage.test.js
frontend/test/characterImages.test.js
frontend/test/sceneImages.test.js
```

Recommended new or updated files:

```text
frontend/src/api/media.js
server/src/routes/media.js
server/src/services/mediaReadinessService.js
server/test/mediaReadiness.test.js
frontend/test/mediaReadiness.test.js
docs/phase-11-media-readiness.md
```

Use these names unless the repo already has a stronger convention.

## Product Rules To Preserve

- Use only these internal learner levels:
  - Literacies Plus
  - Complete Beginner
  - Beginner 1
  - Beginner 1.5
  - Beginner 2
- Do not introduce CEFR labels such as A1, A2 or B1 in UI, prompts, docs or metadata.
- Character and scene records remain the source of truth for media state.
- Do not duplicate per-item approval state into `lesson.media.items`.
- Do not silently delete user work.
- Stale media must be flagged, not hidden.
- Missing files must be reported clearly.
- Keep OpenAI calls and API keys backend-only.
- Do not add new OpenAI calls in Phase 11.
- Do not create ZIP files or export folders with final outputs.
- Keep the Export stage a summary/placeholder unless explicitly limited to displaying readiness.

## Media Readiness Definition

Define media as ready only when all of these are true:

- Story is locked.
- Required character records exist.
- Every required character has:
  - `approved === true`
  - `generationStatus === "approved"`
  - `stale !== true`
  - a safe non-empty `imagePath`
  - an image file that exists in the local project assets.
- Scene records exist.
- Every locked story sentence is assigned to at least one scene, according to the existing scene-reference selectors/policy.
- Every scene that is part of the planned lesson has:
  - non-empty sentence coverage
  - non-empty location
  - non-empty description
  - valid character references
  - `approved === true`
  - `generationStatus === "approved"`
  - `stale !== true`
  - a safe non-empty `imagePath`
  - an image file that exists in the local project assets.
- There are no stale media/export flags caused by later story, character or scene edits.

If the current product intentionally allows optional/background scenes or optional characters to remain unapproved, document the rule and encode it consistently in tests. Otherwise treat every current scene record and every required character as part of readiness.

## Backend API

Add a local media-readiness route. Do not disturb existing routes.

Recommended endpoint:

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
    "total": 8,
    "approved": 6,
    "generated": 1,
    "missing": 1,
    "stale": 0,
    "fileMissing": 0
  },
  "items": [
    {
      "id": "character-marta",
      "kind": "Characters",
      "title": "Marta",
      "status": "approved",
      "approved": true,
      "generationStatus": "approved",
      "stale": false,
      "imagePath": "images/characters/marta.png",
      "fileExists": true,
      "blocking": false,
      "messages": []
    },
    {
      "id": "scene-1",
      "kind": "Scenes",
      "title": "Scene 1",
      "status": "missing",
      "approved": false,
      "generationStatus": "not_started",
      "stale": false,
      "imagePath": null,
      "fileExists": false,
      "blocking": true,
      "messages": ["Generate and approve this scene image."]
    }
  ],
  "blockers": [
    {
      "id": "scene-1",
      "kind": "Scenes",
      "message": "Generate and approve this scene image."
    }
  ]
}
```

Error behavior:

- `400` for missing or malformed `lessonId`.
- `404` for missing project.
- `422` if the saved lesson shape is invalid.
- `500` only for unexpected server errors.

All errors should be JSON and should avoid exposing absolute filesystem paths.

## Backend Steps

### Step 1: Add Media Readiness Service

Create `server/src/services/mediaReadinessService.js`.

The service should:

1. Validate `lessonId`.
2. Load the saved lesson with `getProject(lessonId)`.
3. Validate lesson shape.
4. Derive media items from characters and scenes.
5. Check each image path with existing project asset helpers.
6. Avoid throwing for individual missing asset files; represent file-missing as item status unless the project itself is missing.
7. Compute item statuses.
8. Compute summary counts.
9. Compute blockers.
10. Return a serializable readiness result.

Recommended item status values:

```text
approved
generated
missing
stale
file_missing
invalid
```

Recommended helper exports:

```js
export async function getMediaReadinessForProject(lessonId) {}
export async function buildMediaReadiness(lesson, options = {}) {}
export function summarizeMediaItems(items) {}
```

The service should use existing storage helpers such as `projectAssetExists`. If needed, add a non-throwing helper that distinguishes malformed paths from missing files without leaking filesystem paths.

### Step 2: Add Media Routes

Create `server/src/routes/media.js`.

Register it in `server/src/index.js` under:

```text
/api/media
```

Add:

```text
POST /api/media/readiness
```

Keep health, projects, story, characters, scenes and images routes unchanged.

### Step 3: Preserve Lesson Schema

Do not store per-item readiness in `lesson.media.items`.

Optional persisted metadata is allowed if it is bounded and clearly audit-only:

```json
{
  "media": {
    "filter": "All",
    "items": [],
    "stale": false,
    "staleReason": null,
    "staleAt": null,
    "lastCheckedAt": "2026-09-10T12:00:00.000Z"
  }
}
```

If you add fields such as `lastCheckedAt`, update frontend and backend normalization/validation. Do not make readiness depend on stale cached data.

### Step 4: Frontend API Client

Create `frontend/src/api/media.js`.

Recommended export:

```js
export async function getMediaReadiness(lessonId) {}
```

Use the same error parsing pattern as existing API clients.

### Step 5: Frontend Selectors

Update `frontend/src/utils/lessonSelectors.js`.

Add pure derived helpers for the frontend:

```js
export function getRequiredMediaItems(lesson) {}
export function getMediaSummaryFromItems(items) {}
export function isMediaReady(lesson, readiness = null) {}
export function getMediaBlockers(lesson, readiness = null) {}
```

Frontend-only derived readiness can be used for instant UI state, but backend readiness remains authoritative for file existence.

Update `getCompletedStages` so:

- `media` is completed only when required media records are approved and non-stale.
- `export` is completed/enabled only when media is ready.
- Simply having one generated character or scene no longer marks Media complete.

### Step 6: Media Stage UI

Update `frontend/src/stages/MediaStage.jsx`.

The Media stage should become a review surface.

Required UI:

- Header title such as `Media review`.
- Readiness summary:
  - Ready / Needs attention
  - approved count
  - generated-but-unapproved count
  - missing count
  - stale count
  - file-missing count from backend readiness
- Filter controls:
  - All
  - Needs attention
  - Characters
  - Scenes
  - Approved
- Media cards for every derived item.
- Cards should display:
  - image preview when present
  - kind
  - title
  - status badge
  - stale badge when applicable
  - file missing badge when applicable
  - short action guidance
- Empty states for no characters/scenes yet.
- Refresh/check readiness action that calls the backend readiness API.
- Visible error state if backend readiness check fails.

Do not add generation or approval actions here unless they route to existing Character/Scene stages or are purely navigational. The generation and approval source of truth should remain in Characters and Scenes.

Navigation guidance may be simple:

- “Go to Characters” / “Go to Scenes” callbacks passed from `App.jsx`.
- Or text guidance if the app has no stage navigation callback convention.

Avoid a dashboard/marketing layout. Keep the review dense, scannable and workflow-oriented.

### Step 7: App Wiring

Update `frontend/src/App.jsx`.

Recommended behavior:

- Track media readiness status:
  - `idle`
  - `checking`
  - `success`
  - `error`
- Load/check readiness when entering Media stage or when the user clicks Refresh.
- Ignore stale readiness responses after project switches.
- Clear readiness state when project changes, new lesson is created, lesson is duplicated or media-affecting operations occur.
- Pass readiness data and callbacks into `MediaStage`.
- Continue saving normal lesson changes through existing project save flow.

Do not block New/Open/Duplicate forever if readiness check fails.

### Step 8: Export Stage Readiness Summary

Update `frontend/src/stages/ExportStage.jsx` only enough to display honest readiness.

Expected behavior:

- Show whether media is ready.
- Show counts of approved characters and approved scenes.
- Show any stale media/export warning already present on the lesson.
- Keep the export button disabled or clearly placeholder-only when media is not ready.
- Keep the existing “no files created” behavior or equivalent placeholder messaging.

Do not create ZIP files or write export outputs in Phase 11.

### Step 9: Documentation

Create `docs/phase-11-media-readiness.md`.

Include:

- Media readiness definition.
- Backend readiness API contract.
- Frontend review behavior.
- File-existence checks.
- Stage completion rules.
- Out-of-scope export boundary.
- Verification checklist.

## Backend Tests

Add focused tests in `server/test/mediaReadiness.test.js`.

Cover:

- Missing `lessonId` returns `400`.
- Malformed `lessonId` returns `400`.
- Missing project returns `404`.
- Invalid saved lesson shape returns `422`.
- Empty/new lesson is not ready and reports blockers.
- Draft/unlocked story is not ready.
- Missing character records are blockers.
- Unapproved character reference is a blocker.
- Generated-but-unapproved character reference is a blocker.
- Stale character reference is a blocker.
- Character with missing image path is a blocker.
- Character with missing image file returns `file_missing`.
- Approved file-backed character is counted as approved.
- Missing scene records are blockers.
- Scene with missing sentence coverage is a blocker.
- Scene with missing location/description is a blocker.
- Unapproved scene image is a blocker.
- Generated-but-unapproved scene image is a blocker.
- Stale scene image is a blocker.
- Scene with missing image file returns `file_missing`.
- Fully approved, non-stale, file-backed characters and scenes produce `ready: true`.
- Readiness response never includes absolute filesystem paths.
- Existing character image tests still pass.
- Existing scene image tests still pass.

## Frontend Tests

Add focused tests in `frontend/test/mediaReadiness.test.js`.

Cover:

- `getMediaReadiness` calls `POST /api/media/readiness`.
- API client parses readiness errors.
- Derived media items include characters and scenes with image paths.
- Media summary counts approved/generated/missing/stale items.
- `isMediaReady` returns false for stale items.
- `isMediaReady` returns false for generated-but-unapproved items.
- `isMediaReady` returns false for file-missing backend readiness.
- `isMediaReady` returns true when all required media is approved/non-stale/file-backed.
- `getCompletedStages` does not mark Media complete for only one generated item.
- `getCompletedStages` marks Media complete when all required media is approved/non-stale.
- `getCompletedStages` gates Export completion/readiness on media readiness.
- Media filter updates still persist through `updateMediaFilter`.
- Normalization preserves optional media readiness metadata if added.

If component tests are not available, add selector/API tests and document remaining manual QA.

## Manual QA Checklist

Run:

```sh
npm run dev
```

Then verify:

1. `GET /api/health` still returns JSON.
2. `GET /api/projects` still returns JSON.
3. Open a project with locked story, approved characters and approved scenes.
4. Go to Media.
5. Confirm the stage says Ready only when all required images are approved and non-stale.
6. Confirm generated-but-unapproved items show as needing attention.
7. Confirm stale items show as needing attention.
8. Delete or temporarily rename a local image file and refresh readiness.
9. Confirm file-missing state is visible without exposing absolute paths.
10. Restore the file.
11. Confirm Characters and Scenes filters work.
12. Confirm Needs attention filter shows only blockers.
13. Confirm Media stage image previews fit proportionally.
14. Confirm stage completion/navigation state updates only when readiness is satisfied.
15. Confirm Export stage remains placeholder-only and creates no files.
16. Confirm New/Open/Duplicate still work after a readiness API error.

Do not perform real ZIP/export checks in Phase 11.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
```

If useful while the dev server is running:

```sh
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/media/readiness -H "Content-Type: application/json" -d '{}'
```

Targeted scans:

```sh
rg "media/readiness|mediaReadiness|getMediaReadiness|isMediaReady|getMediaBlockers" frontend/src server/src server/test frontend/test docs
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "archiver|JSZip|zip|PowerPoint|pptx|worksheet|audio|video|ElevenLabs|firebase|auth|login|account" frontend server package.json docs
rg "support\\.js|lesson-source-builder\\.dc\\.html|prototype/" frontend server
```

Expected scan results:

- No new OpenAI calls are introduced.
- No CEFR labels are introduced in active app/server source.
- No ZIP/export package library is added.
- No audio/video/account/cloud scope is added.
- Prototype imports remain absent from active frontend/server code.

## Acceptance Criteria

- Media stage clearly shows readiness from real character and scene records.
- Backend readiness API verifies local image file existence.
- Missing files are visible as readiness blockers.
- Generated-but-unapproved media is not treated as ready.
- Stale media is not treated as ready.
- Stage completion no longer marks Media complete just because one item exists.
- Export readiness is gated by media readiness.
- No real ZIP/export package is created.
- Existing character image workflows still work.
- Existing scene image workflows still work.
- Existing save/open/duplicate behavior still works.
- No Phase 12+ or Milestone 4 scope is introduced.

## Handoff Notes

Phase 11 is a review and readiness phase, not a generation phase and not an export phase. The best outcome is a trustworthy Media stage that answers one question clearly: “Is every visual asset needed for this lesson approved, current and still present on disk?”

Keep the implementation derived, local and conservative. Characters and scenes remain the media source of truth; Phase 11 simply audits them, displays the result and prevents the user from mistaking incomplete media for export-ready work.
