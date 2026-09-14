# Phase 10 Remediation Prompt

Use this prompt to fix the Phase 10 review finding about stale scene-image reuse sources.

## Prompt

You are fixing one narrow Phase 10 issue in Lesson Source Builder.

Phase 10 has been implemented and reviewed. The remaining finding is:

```text
[P2] Reuse mode allows stale source scene images
File/path: server/src/services/sceneImageService.js
Evidence: findReusableScene only rejects missing image paths or non-generated/non-approved statuses; it does not reject sourceScene.stale. A service-level probe reused images/scenes/source.png from a stale source and returned targetStatus: "generated".
Why it matters: a stale, outdated scene image can be copied into another scene, become non-stale on the target, and then be approved as final output.
Recommended fix: reject sourceScene.stale in findReusableScene, add a backend test for stale reuse sources, and filter stale source scenes out of the reuse selector in frontend/src/stages/ScenesStage.jsx.
```

Fix this issue only. Do not add audio/video generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable cross-project media libraries or any Phase 11+ scope.

## Scope

Update:

```text
server/src/services/sceneImageService.js
server/test/sceneImage.test.js
frontend/src/stages/ScenesStage.jsx
```

Only update additional files if tests reveal a directly coupled issue.

## Required Behavior

Scene reuse mode must not allow stale source scene images.

For a target scene with:

```json
{
  "imageMode": "reuse",
  "reuseSceneId": "scene-1"
}
```

the source scene must be accepted only when it:

- exists
- is not the target scene
- has `stale !== true`
- has a non-empty safe `imagePath`
- has `generationStatus` of `"generated"` or `"approved"`
- has an existing image file under the project asset root

If the source scene is stale, generation should return a JSON `422` through the existing route error path and should not mutate the target scene.

## Backend Implementation Guidance

In `server/src/services/sceneImageService.js`, update `findReusableScene`.

Add a stale-source guard after the source scene is resolved and before returning it. Use a clear error message and field details consistent with the rest of the service.

Suggested behavior:

```js
if (sourceScene.stale) {
  throw new SceneImageError("Reusable scene is stale.", 422, [
    {
      field: `scenes.${sourceScene.id}.stale`,
      message: "Regenerate or review the source scene before reusing it."
    }
  ]);
}
```

Keep these existing behaviors intact:

- missing `reuseSceneId` returns `422`
- missing source scene returns `422`
- self-reference returns `422`
- source scenes without generated/approved image state return `422`
- missing source image files return `422`
- reuse mode does not call OpenAI
- reuse mode does not mutate the source scene
- target scene receives its own generated-but-unapproved state only after validation succeeds

## Frontend Implementation Guidance

In `frontend/src/stages/ScenesStage.jsx`, update the reuse source dropdown filter.

The dropdown should exclude source scenes that are stale. Prefer filtering source options to scenes that are actually usable for reuse:

```js
lesson.scenes.filter(
  (item) =>
    item.id !== scene.id &&
    item.imagePath &&
    !item.stale &&
    ["generated", "approved"].includes(item.generationStatus)
)
```

If a currently selected `reuseSceneId` becomes stale after selection, the backend must still reject it. The frontend filter is a UX aid, not the only safeguard.

## Regression Tests

Add or update focused tests in `server/test/sceneImage.test.js`.

At minimum, add a test that:

1. Creates a source scene with:
   - `imagePath`
   - `generationStatus: "generated"` or `"approved"`
   - `stale: true`
   - an existing image file
2. Creates a target scene with:
   - `imageMode: "reuse"`
   - `reuseSceneId` pointing at the stale source scene
3. Calls `generateSceneImageForProject`.
4. Asserts:
   - it rejects with `422`
   - error text mentions stale/review/regenerate
   - the image client was not called
   - the target scene remains unmutated in saved project state
   - the source scene remains unmutated

If frontend tests currently cover reuse filtering, update them. If there are no component tests for `ScenesStage`, document the frontend filter as code-inspected and keep the backend test as the hard acceptance guard.

## Acceptance Criteria

- Stale source scenes cannot be reused through the backend service.
- Stale source scenes are not offered in the reuse dropdown.
- Reuse mode still works for valid non-stale generated/approved source scenes.
- Reuse mode still does not call OpenAI.
- Reuse mode still does not mutate the source scene.
- Failed stale-source reuse does not mutate the target scene.
- Existing scene generation and approval behavior remains unchanged.
- Existing character image behavior remains unchanged.
- No Phase 11+ scope is introduced.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
```

Targeted checks:

```sh
rg "Reusable scene is stale|sourceScene.stale|reuseSceneId|imageMode === \"reuse\"" server/src/services/sceneImageService.js server/test/sceneImage.test.js frontend/src/stages/ScenesStage.jsx
rg "audio|video|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

If a full test/build command cannot run for environmental reasons, state exactly what was skipped and why.

## Expected Final Response

Report:

- Files changed.
- The exact stale-source reuse guard added.
- Tests added or updated.
- Commands run and results.
- Any skipped checks.

Keep the response brief and do not claim live OpenAI image behavior was tested unless you actually ran a live provider call.
