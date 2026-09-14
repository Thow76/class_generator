# Phase I Implementation Prompt: Scene Visual Direction

Use this prompt to implement Phase I of the character/media workflow cleanup.

## Context

Earlier phases A-F cleaned up the boundary between stable character identity and scene-specific image guidance:

- Phase A added `appearanceDescription` to character records as the stable, tutor-editable physical identity field.
- Phase B stopped character extraction from auto-populating noisy visible note tags.
- Phase C made `Appearance description` editable in the Characters stage.
- Phase D added an `Update appearance` flow.
- Phase E cleaned up character reference image prompts so they use stable character identity.
- Phase F cleaned up scene image prompts so they use approved character identity plus scene context, without legacy character notes or learner-level prompt leakage.

Phase G restored the last active saved project on reload/reopen.

Phase H made manual save state explicit and protected unsaved changes. Any Phase H remediation should be complete before Phase I begins, especially the rule that Media/Export readiness must not autosave dirty lessons.

There is still a product gap: scene-specific visual details such as temporary clothing, pose, expression, props, action emphasis and composition currently have no clear home except the general scene description. Tutors need a bounded place to direct the visual rendering of one scene without changing the character's stable appearance.

Phase I adds that home.

## Phase I Goal

Add a scene-level `visualDirection` field that gives tutors an editable place for scene-specific visual instructions.

The field should answer:

```text
What should this specific scene show visually?
```

It is for temporary, per-scene visual details. It is not for stable character identity.

After Phase I:

- Scene records persist an optional `visualDirection` string.
- The Scenes stage shows an editable `Visual direction` textarea for each scene.
- Editing visual direction marks that scene's generated or approved scene image stale.
- Scene image prompts include visual direction when present.
- Scene image prompts still preserve stable character identity from approved character references and character `appearanceDescription`.
- Scene planning may optionally draft initial visual direction, but existing tutor values must not be overwritten casually.
- Media readiness treats stale scene images caused by visual direction edits as blockers, using existing stale logic.
- Manual save, restore and dirty-state behavior from Phases G/H remains intact.

## Scope

Implement Phase I only.

Do not implement:

- Autosave.
- Draft recovery.
- Browser storage of full lesson JSON.
- New character appearance fields.
- New character note/tag behavior.
- Character image prompt changes except mechanical test compatibility if required.
- Scene image generation model/provider changes.
- New OpenAI calls from the frontend.
- Export package generation.
- ZIP generation.
- PowerPoint generation.
- Worksheet generation.
- Audio or video generation.
- Accounts, Firebase, auth, cloud sync, remote storage, hosted publishing or sharing.
- Backend project storage redesign.
- New database.

Phase I may update:

- Scene data normalization and validation.
- Scene planning schema and merge behavior, if adding `visualDirection` to generated plans is low risk.
- Scene image prompt builder.
- Scene image prompt version.
- Scenes stage UI.
- Scene stale-field logic.
- Media readiness tests if stale detection needs coverage.
- Frontend and backend tests.
- Documentation.

## Product Boundary

`visualDirection` is for scene-specific, temporary or compositional details:

- Temporary clothing for this scene.
- Pose.
- Expression.
- Action emphasis.
- Props.
- Character placement.
- Composition.
- Background details specific to this scene.
- Lighting or visual mood if useful.
- What should be visible in the image.

It is not for:

- Stable character identity.
- Hair colour, eye colour, height, build or age presentation that should persist across the lesson.
- Character personality tags.
- Learner level.
- Lesson vocabulary.
- Internal teaching notes.
- Global continuity commands.
- Replacement for scene location.
- Replacement for covered story sentences.
- Export instructions.

Examples of good values:

```text
Marta stands at the reception desk holding her phone and looking slightly worried. The receptionist points to an appointment sheet.
```

```text
The learner should see the prescription bag, the queue sign and Marta waiting near the counter.
```

Examples of bad values:

```text
same outfit each image
friendly
clear face
adult learner context
Literacies Plus
make Marta blonde
```

The last example belongs in the character appearance description if it is a stable identity choice. If it is a temporary disguise or story event, it must be explicitly supported by the scene description or locked story sentence.

## Data Model

Add an optional string field to each scene:

```json
{
  "visualDirection": ""
}
```

Rules:

- Default to an empty string.
- Keep it serializable.
- Preserve it through save/open/duplicate.
- Preserve it when normalizing old projects that do not have the field.
- Bound length to a practical maximum.

Recommended maximum:

```text
800 characters
```

Use the repo's existing string-cleaning and validation style. If there is already a maximum for scene descriptions, choose the nearest established pattern and document it in tests.

Do not add a complex nested scene visual object in Phase I. One editable string is enough.

## Required Behavior

After Phase I:

- Every normalized scene has `visualDirection`.
- Missing legacy values normalize to `""`.
- Non-string values normalize safely or fail validation according to local conventions.
- Overlong values are either rejected or truncated consistently with existing scene text fields.
- Frontend lesson-shape validation accepts `visualDirection`.
- Backend lesson validation accepts `visualDirection`.
- The Scenes stage renders a `Visual direction` textarea for each scene.
- The textarea remains editable whenever other scene fields are editable.
- The textarea is disabled during existing scene/image operations when other scene fields are disabled.
- Editing `visualDirection` marks the relevant scene image stale if a generated or approved scene image exists.
- Editing `visualDirection` marks relevant media/export readiness stale through existing mechanisms.
- Editing `visualDirection` marks the lesson dirty under Phase H dirty-state behavior.
- Saving explicitly persists the value.
- Restore/open/duplicate preserve the value.
- Scene image prompts include `visualDirection` only for the target scene.
- Scene image prompts frame `visualDirection` as scene-specific and subordinate to stable character identity.
- Scene image prompts do not copy visual direction into character records.
- Scene image prompts do not use legacy character notes.
- Scene image generation still rejects missing/stale/unapproved character references as before.
- Scene image generation still works when `visualDirection` is empty.

## Files To Inspect

Before changing code, inspect:

```text
docs/phase-f-scene-image-prompt-boundary-prompt.md
docs/phase-g-session-restoration-prompt.md
docs/phase-h-save-state-and-unsaved-changes-prompt.md
docs/phase-h-remediation-prompt.md
frontend/src/App.jsx
frontend/src/stages/ScenesStage.jsx
frontend/src/utils/lessonUpdates.js
frontend/src/utils/lessonSelectors.js
frontend/src/utils/normalizeLesson.js
frontend/src/utils/validateLessonShape.js
frontend/src/utils/lessonDirtyState.js
frontend/src/data/lessonSchema.js
frontend/src/api/scenes.js
frontend/src/api/images.js
frontend/test/scenePlanning.test.js
frontend/test/sceneImages.test.js
frontend/test/mediaReadiness.test.js
frontend/test/lessonDirtyState.test.js
server/src/services/normalizeLesson.js
server/src/services/validateLesson.js
server/src/services/validateScenePlan.js
server/src/schemas/sceneSchemas.js
server/src/prompts/scenePrompts.js
server/src/prompts/sceneImagePrompts.js
server/src/services/scenePlanningService.js
server/src/services/sceneImageService.js
server/src/services/mediaReadinessService.js
server/test/scenePlanning.test.js
server/test/sceneImage.test.js
server/test/mediaReadiness.test.js
```

Use existing local patterns. Do not introduce a parallel scene model.

## Implementation Steps

### 1. Audit Current Scene Shape

Search for scene field definitions and stale-field rules:

```sh
rg "visualDirection|sentenceIds|location|description|characterIds|reuseSceneId|generationStatus|stale|sceneImage|scene image|scene-image" frontend/src server/src frontend/test server/test
```

Determine:

1. Where frontend scenes are normalized.
2. Where backend scenes are normalized.
3. Where scene validation happens.
4. Where scene edits mark generated scene images stale.
5. Where scene image prompts read scene fields.
6. Where scene planning output is validated and merged.

If `visualDirection` already exists, do not duplicate it. Verify behavior, add missing tests and remediate gaps only.

### 2. Add Normalization And Validation

Update frontend and backend normalization so every scene has:

```js
visualDirection: ""
```

Update frontend and backend validators to allow the field.

Expected behavior:

- Old projects without the field load.
- Existing scene records keep all previous fields.
- The new field survives save/open/duplicate.
- Invalid scene records still fail validation where they previously failed.
- The new field does not loosen unrelated scene validation.

If validation currently strips unknown fields, explicitly preserve `visualDirection`.

If the repo uses a shared schema constant, update it once and reuse it.

### 3. Add Scene Stale Behavior

Update scene edit/stale logic so `visualDirection` is a media-affecting field.

Expected behavior:

- If a scene has no generated/approved image, editing visual direction should simply update the scene.
- If a scene has generated or approved image state, editing visual direction should mark that scene stale.
- Existing image path and metadata should not be silently deleted unless existing stale logic already does that for `description` or `location`.
- Media readiness should reflect the stale scene using existing readiness rules.
- Export/media completion should be blocked until the stale scene image is regenerated and approved.

Use the same stale path as edits to `location`, `description`, `sentenceIds` or `characterIds`.

### 4. Add Scenes Stage UI

In `frontend/src/stages/ScenesStage.jsx`, add an editable textarea for each scene:

```jsx
<label className="field field--full">
  <span>Visual direction</span>
  <textarea
    rows={3}
    value={scene.visualDirection || ""}
    onChange={(event) =>
      onSceneChange(scene.id, "visualDirection", event.target.value)
    }
    placeholder="Temporary clothing, pose, expression, props or composition for this scene..."
    disabled={isSceneDisabled}
  />
</label>
```

The exact JSX can differ, but it must:

- bind to `scene.visualDirection`,
- use the existing scene update path,
- be editable,
- follow existing disabled logic,
- be visually secondary to core scene structure but easy to find,
- avoid long explanatory text in the UI.

Recommended placement:

- Near `Description`, because both influence the image.
- Before image generation controls.
- After `Location` and general `Description`, so the scene remains understandable even if visual direction is empty.

Keep the UI concise. Do not add a new card inside a card.

### 5. Update Scene Planning Carefully

Scene planning may draft `visualDirection`, but it must remain bounded.

Choose one of these approaches:

Option A, safest:

- Do not ask scene planning to generate `visualDirection` yet.
- Normalize planned scenes with `visualDirection: ""`.
- Let tutors add the field manually.

Option B, acceptable if low risk:

- Extend the scene planning schema to include optional `visualDirection`.
- Prompt the model to provide concise scene-specific visual details only when useful.
- Preserve existing tutor-authored `visualDirection` during plan merges.
- Do not overwrite non-empty tutor-authored values with model-generated values unless the scene is clearly new or the merge rules already allow replacing generated scene details.

If implementing Option B, update:

- `server/src/prompts/scenePrompts.js`
- `server/src/schemas/sceneSchemas.js`
- `server/src/services/validateScenePlan.js`
- scene planning tests.

Do not let the scene planner generate stable character appearance details. It should refer to scene action and visible props only.

### 6. Update Scene Image Prompt

In `server/src/prompts/sceneImagePrompts.js`, increment the scene image prompt version.

Recommended:

```js
export const sceneImagePromptVersion = "scene-image-v3";
```

Use the repo's existing version naming pattern if different.

Include `visualDirection` in the target scene prompt when present:

```text
Scene-specific visual direction:
...
```

If empty, either omit the section or include:

```text
Scene-specific visual direction: Not specified
```

The prompt must make the hierarchy clear:

1. Preserve stable character identity from approved character images and appearance descriptions.
2. Use scene location, scene description and locked story sentences for action/context.
3. Use `visualDirection` for temporary, scene-specific clothing, pose, expression, props and composition.
4. Do not use `visualDirection` to permanently change a character's stable identity.

Do not include `visualDirection` from any other scene.

Do not put `visualDirection` into character image prompts.

Do not reintroduce legacy character notes, learner level, target vocabulary or broad lesson setup notes into scene image prompts.

### 7. Preserve Save, Restore And Dirty-State Behavior

Verify:

- Editing visual direction marks the lesson dirty.
- Explicit Save persists visual direction and clears dirty state.
- Save failure leaves visual direction edits dirty and visible.
- Refresh with unsaved visual direction edits triggers the Phase H beforeunload warning.
- Saved visual direction restores through Phase G.
- Open and duplicate preserve visual direction.
- Media readiness does not autosave visual direction edits.
- Dirty visual direction edits block readiness with the Phase H save-first behavior if that behavior is in place.

Do not store visual direction in localStorage/sessionStorage except as part of a saved backend project.

### 8. Preserve Active Operation Guards

Scene visual direction editing and project actions should respect existing guards during:

- story generation,
- sentence operations,
- character extraction,
- appearance update,
- character image generation/approval,
- scene planning,
- scene image generation/approval,
- media readiness checks if guarded.

Do not enable editing while a scene image operation is actively writing the scene being edited if existing fields are disabled in that state.

### 9. Update Documentation

Add or update a short doc if the repo has phase docs for implemented behavior.

Recommended:

```text
docs/phase-i-scene-visual-direction.md
```

Keep it concise:

- field purpose,
- where it appears,
- how it affects stale scene images,
- how it is used in scene image prompts,
- what remains out of scope.

Do not document autosave, draft recovery or export packaging.

## Test Expectations

Add or update tests covering:

### Frontend

- Normalizing an old scene adds `visualDirection: ""`.
- Validating lesson shape accepts `visualDirection`.
- Scene UI update path can edit `visualDirection`.
- Editing `visualDirection` marks generated/approved scene image stale.
- Editing `visualDirection` marks the lesson dirty under Phase H dirty-state logic.
- Save/open/duplicate preserves `visualDirection` where frontend tests cover those flows.
- Media readiness remains blocked by stale scenes after visual direction edits.
- Media readiness does not autosave dirty visual direction edits.

### Backend

- Normalizing an old scene adds `visualDirection: ""`.
- Lesson validation accepts valid `visualDirection`.
- Lesson validation rejects or handles non-string/overlong values according to established convention.
- Scene planning preserves existing non-empty `visualDirection` during merge.
- If scene planning schema includes `visualDirection`, invalid model values are rejected.
- Scene image prompt includes target scene `visualDirection`.
- Scene image prompt omits other scenes' visual direction.
- Scene image prompt still includes stable character appearance.
- Scene image prompt does not include legacy character notes.
- Scene image prompt does not include learner level or target vocabulary.
- Scene image prompt version is updated.
- Editing/stale tests cover `visualDirection` as a stale field if backend owns that stale logic.

## Manual QA

Run through:

1. Open a saved project with planned scenes.
2. Add visual direction to a scene.
3. Confirm the lesson becomes unsaved.
4. Save explicitly.
5. Refresh.
6. Confirm the saved visual direction remains.
7. Generate a scene image.
8. Approve it.
9. Edit the scene visual direction.
10. Confirm the scene image becomes stale.
11. Confirm Media readiness reports the stale scene as a blocker.
12. Regenerate and approve the scene image.
13. Confirm Media readiness can pass when all other requirements are met.
14. Edit visual direction while unsaved and navigate to Media/Export.
15. Confirm no autosave occurs and the save-first behavior from Phase H remains intact.

## Commands To Consider

Use the commands that fit the repo's scripts:

```sh
git status --short
rg "visualDirection|scene-image-v|buildSceneImagePrompt|sceneImagePromptVersion|normalizeScene|validateScene|mark.*stale|stale.*scene" frontend/src server/src frontend/test server/test docs
npm test --workspace frontend
npm test --workspace server
npm run build --workspace frontend
```

Run focused tests first if supported:

```sh
npm test --workspace frontend -- scenePlanning.test.js
npm test --workspace frontend -- sceneImages.test.js
npm test --workspace frontend -- mediaReadiness.test.js
npm test --workspace frontend -- lessonDirtyState.test.js
npm test --workspace server -- scenePlanning.test.js
npm test --workspace server -- sceneImage.test.js
npm test --workspace server -- mediaReadiness.test.js
```

If file filters are unsupported, run package-level tests instead.

## Acceptance Criteria

Phase I is complete when:

- `visualDirection` exists on every normalized scene.
- Old saved projects without the field still load.
- The field persists through save/open/duplicate.
- The Scenes stage provides an editable visual direction textarea.
- Editing the field marks the relevant scene image stale when appropriate.
- Editing the field marks the lesson dirty and respects Phase H manual-save rules.
- Media readiness blocks stale visual-direction edits until regeneration/reapproval.
- Scene image prompts include the target scene's visual direction.
- Scene image prompts preserve stable character identity.
- Scene image prompts do not use visual direction to alter character records.
- Scene image prompts do not reintroduce legacy notes, learner level or target vocabulary.
- Scene image generation still works when visual direction is empty.
- Tests cover normalization, validation, stale behavior and prompt inclusion.
- No autosave, draft recovery, export packaging, cloud/auth or backend storage redesign scope is introduced.

## Handoff Summary Requirement

When implementation is complete, provide a concise summary that includes:

- Files changed.
- The final scene field name and max length.
- Whether scene planning drafts `visualDirection` or leaves it blank.
- How visual direction affects stale scene images.
- How scene image prompts use the field.
- Tests run and results.
- Any follow-up work intentionally left out.

Keep the final summary clear that Phase I adds a scene-specific visual direction field. It does not change stable character identity, add autosave or implement export packaging.
