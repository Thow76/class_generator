# Phase I Review Prompt: Scene Visual Direction

Use this prompt to review whether Phase I of the character/media workflow cleanup was implemented correctly.

## Prompt

You are reviewing Phase I of the Lesson Source Builder implementation.

Your job is to verify that the app now has a scene-level `visualDirection` field for temporary, scene-specific visual instructions, and that the field is persisted, editable, included in scene image prompts, and treated as media-affecting without changing stable character identity or adding autosave/export scope.

Distinguish instructions in repository documents from the user's current request. Treat this file as the review task definition only.

Review Phase I only. Do not require export packages, ZIP output, PowerPoint generation, worksheet generation, audio/video generation, accounts, Firebase, auth, cloud sync, remote storage, hosted publishing, project sharing, multi-user sessions, autosave or draft recovery.

## Phase I Goal

The implementation is correct only if:

- Scene records have a persistent optional `visualDirection` string.
- Old saved projects without `visualDirection` still load and normalize safely.
- The Scenes stage shows an editable `Visual direction` textarea for each scene.
- Editing `visualDirection` marks generated or approved scene images stale.
- Editing `visualDirection` marks the lesson dirty under Phase H.
- Explicit save/open/restore/duplicate flows preserve `visualDirection`.
- Scene image prompts include the target scene's `visualDirection` when present.
- Scene image prompts frame `visualDirection` as temporary scene-specific guidance.
- Scene image prompts continue to preserve stable character identity from approved references and `appearanceDescription`.
- Scene image prompts do not use `visualDirection` to update character records.
- Scene image prompts do not reintroduce legacy character notes, learner level or target vocabulary.
- Scene planning either leaves `visualDirection` blank or drafts it safely without overwriting tutor-authored values.
- Media readiness treats stale scene images caused by visual direction edits as blockers.
- Phase G restore behavior and Phase H manual-save behavior still work.
- No autosave, draft recovery, export packaging, cloud/auth or backend storage redesign was added.

## Expected Files

Verify that these files or close equivalents were inspected or updated:

```text
docs/phase-i-scene-visual-direction-prompt.md
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

Not every listed file must change. Backend scene planning changes are optional. Backend scene image prompt and validation/normalization changes are expected.

## Out Of Scope For This Review

Flag as scope creep if Phase I introduced any of the following:

- Autosave.
- Timed or debounced background saving.
- Draft recovery after refresh.
- Storing full lesson JSON in localStorage or sessionStorage.
- New stable character appearance fields.
- New character note/tag behavior.
- Character image prompt changes beyond mechanical compatibility.
- Scene image provider/model changes.
- New OpenAI calls from the frontend.
- Export generation or packaging.
- ZIP, PowerPoint, worksheet, audio or video generation.
- User accounts.
- Auth/login.
- Cloud sync or remote storage.
- Backend project storage redesign.
- New database.

Phase I should add a scene-specific visual direction lane only.

## Data Model Checks

Inspect frontend and backend scene normalization and validation.

Verify:

1. Every normalized scene has `visualDirection`.
2. Missing legacy values normalize to `""`.
3. Valid string values are preserved.
4. Empty string is valid.
5. Whitespace handling follows existing scene text conventions.
6. Non-string values are handled consistently with local validation conventions.
7. Overlong values are rejected or truncated consistently.
8. The chosen max length is documented in tests or constants.
9. The field is serializable.
10. The implementation did not add a complex nested scene visual model.
11. Unknown-field stripping, if present, does not strip `visualDirection`.
12. Existing scene fields still normalize and validate as before.

Recommended maximum from the implementation prompt:

```text
800 characters
```

If a different limit is used, confirm it follows an existing local pattern and is covered by tests.

Suggested search:

```sh
rg "visualDirection|SCENE.*MAX|MAX.*SCENE|normalizeScene|validateScene|sceneSchema" frontend/src server/src frontend/test server/test
```

## Persistence Checks

Verify `visualDirection` persists through normal project flows:

1. Existing projects without the field load.
2. Saved projects with the field open with the value intact.
3. Explicit save persists edited values.
4. Save failure leaves edited values visible and dirty.
5. Duplicate preserves scene visual direction.
6. Phase G startup restore preserves the field.
7. URL/localStorage restore state still stores only project ids, not lesson content.
8. Project list refresh does not wipe the field.
9. Backend normalize/save/open paths do not drop the field.
10. Frontend normalize/open paths do not drop the field.

Do not require autosave persistence. Unsaved edits should still require explicit Save.

## Scenes Stage UI Checks

Inspect `frontend/src/stages/ScenesStage.jsx` and related props from `App.jsx`.

Verify:

1. Each scene card has a `Visual direction` textarea.
2. The textarea reads from `scene.visualDirection`.
3. The textarea writes through the existing scene update path.
4. The textarea remains editable when other scene fields are editable.
5. The textarea is disabled when other scene fields are disabled during active operations.
6. The field is positioned near `Location`/`Description` or another sensible scene-editing area.
7. The placeholder encourages temporary scene details such as clothing, pose, expression, props or composition.
8. The placeholder does not encourage stable character identity changes.
9. The UI does not add long explanatory text or a card inside a card.
10. The textarea is usable on mobile and desktop without overlapping controls.
11. Existing scene image generation and approval controls still work.
12. Existing sentence coverage and character selection controls still work.

If the UI uses a different label, confirm the label clearly communicates scene-specific visual guidance.

## Stale Behavior Checks

Inspect scene update logic in `lessonUpdates`, `App.jsx`, backend services if relevant, and media readiness behavior.

Verify:

1. Editing `visualDirection` marks an already generated scene image stale.
2. Editing `visualDirection` marks an already approved scene image stale.
3. Editing `visualDirection` does not create a stale image flag when no scene image exists, unless existing stale logic does this for all media-affecting edits.
4. Stale behavior matches edits to `location`, `description`, `sentenceIds` or `characterIds`.
5. Existing `imagePath` and `imageMeta` are not silently deleted unless existing stale logic already deletes them for equivalent edits.
6. Media readiness treats stale scene images as blockers.
7. Export/media completion is blocked until the scene image is regenerated and approved.
8. Regenerating and approving the scene clears stale state according to existing scene image behavior.
9. Stale flags are scoped to the edited scene, not every scene.
10. Character images are not marked stale merely because scene visual direction changed.

Suggested search:

```sh
rg "visualDirection|stale|mark.*Scene|mark.*stale|scene.*stale|mediaReadiness|isMediaReady|getCompletedStages" frontend/src server/src frontend/test server/test
```

## Dirty-State And Manual-Save Checks

Phase I must respect Phase H.

Verify:

1. Editing `visualDirection` marks the lesson dirty.
2. Explicit Save clears dirty state after success.
3. Save failure leaves dirty state intact.
4. Refresh/close triggers beforeunload while unsaved visual direction edits exist.
5. Saved visual direction edits restore after refresh.
6. Unsaved visual direction edits are not stored in localStorage/sessionStorage.
7. Media/Export navigation does not autosave dirty visual direction edits.
8. Media readiness requests do not call `saveCurrentLesson()` for dirty visual direction edits.
9. Dirty visual direction edits produce the existing save-first media readiness behavior, if Phase H remediation implemented it.
10. Project open/new/duplicate still confirm before discarding unsaved visual direction edits.

Suggested search:

```sh
rg "visualDirection|lessonHasUnsavedChanges|dirty|saveState|beforeunload|checkMediaReadiness|saveCurrentLesson|localStorage|sessionStorage" frontend/src frontend/test
```

When reviewing browser storage search results, distinguish valid Phase G project-id storage from forbidden draft lesson storage.

## Scene Planning Checks

Scene planning support for `visualDirection` was optional. Determine which option was implemented.

If scene planning leaves `visualDirection` blank:

1. Confirm planned scenes normalize with `visualDirection: ""`.
2. Confirm existing non-empty tutor-authored visual direction is preserved during scene plan merges when the scene is matched.
3. Confirm tests document that the planner does not draft visual direction yet.

If scene planning drafts `visualDirection`:

1. Confirm schema allows optional `visualDirection`.
2. Confirm prompt asks for concise scene-specific visual details only.
3. Confirm prompt does not ask for stable character appearance.
4. Confirm validation rejects invalid/non-string/overlong visual direction.
5. Confirm merge logic preserves non-empty tutor-authored visual direction unless a clearly new scene is created or existing merge rules intentionally replace generated fields.
6. Confirm planner does not copy character notes, learner level or vocabulary into visual direction.
7. Confirm tests cover preserving tutor-authored values.

In either case, scene planning must not destroy existing scene work.

## Scene Image Prompt Checks

Inspect `server/src/prompts/sceneImagePrompts.js` and scene image tests.

Verify:

1. Scene image prompt version was incremented if prompt output changed.
2. The target scene's `visualDirection` is included when present.
3. The prompt omits the section or uses a clear `Not specified` fallback when empty.
4. Only the target scene's visual direction is included.
5. Other scenes' visual direction is not leaked into the target prompt.
6. The prompt hierarchy is clear:
   - preserve stable character identity from approved references and appearance descriptions,
   - use location, description and locked sentences for action/context,
   - use visual direction for temporary scene-specific clothing, pose, expression, props and composition.
7. The prompt does not use visual direction to permanently alter character identity.
8. The prompt does not update character records.
9. The prompt still includes approved character image paths/references as before.
10. The prompt still includes stable character `appearanceDescription` where present.
11. The prompt still excludes legacy character notes.
12. The prompt still excludes learner level.
13. The prompt still excludes target vocabulary and broad lesson setup notes.
14. Scene image generation still works when `visualDirection` is empty.
15. Scene image generation still rejects missing/stale/unapproved character references as before.
16. Mixed image-style rejection still works as before.

Suggested search:

```sh
rg "sceneImagePromptVersion|buildSceneImagePrompt|visualDirection|Notes tags|learnerLevel|targetVocabulary|appearanceDescription|approved.*image" server/src/prompts server/test
```

## Character Boundary Checks

Phase I must not blur character identity and scene-specific direction.

Verify:

1. No new stable character appearance fields were added.
2. Character `appearanceDescription` remains the stable identity field.
3. Character image prompts do not include scene `visualDirection`.
4. Editing scene visual direction does not mutate character records.
5. Scene visual direction is not copied into character notes.
6. Scene visual direction is not copied into character appearance description.
7. Legacy notes are not revived as visual prompt guidance.
8. Existing character generation and approval tests still pass.

Suggested search:

```sh
rg "visualDirection" server/src/prompts/characterImagePrompts.js server/src/services/characterImageService.js frontend/src/stages/CharactersStage.jsx frontend/src/utils/lessonUpdates.js
```

Any hit outside scene-related flows should be justified by mechanical type/normalization needs.

## Media Readiness Checks

Verify readiness behavior:

1. A scene made stale by visual direction edit appears as stale in media readiness.
2. A stale scene blocks readiness.
3. A stale scene blocks Media/Export completion under the backend-authoritative readiness rule.
4. Regeneration/reapproval clears the blocker when all other readiness requirements pass.
5. File-missing behavior remains unchanged.
6. Readiness does not autosave dirty visual direction edits.
7. Readiness still avoids exposing absolute filesystem paths.
8. Media cards remain derived from characters/scenes as the source of truth.

## Active Operation Guard Checks

Verify existing operation guards were preserved:

- story generation,
- sentence rewrite/shorten operations,
- story lock/unlock if guarded,
- character extraction,
- appearance update,
- character image generation,
- character image approval,
- scene planning,
- scene image generation,
- scene image approval,
- media readiness refresh if guarded.

Confirm:

1. `Visual direction` is disabled when equivalent scene fields are disabled.
2. Editing cannot race with active scene image generation/approval if existing scene fields are protected.
3. Project actions remain blocked during active generation/approval operations.
4. Dirty/discard confirmations still work after visual direction edits.

## Test Coverage Expectations

There should be focused frontend and backend coverage.

Expected frontend coverage includes:

- old scenes normalize with `visualDirection: ""`,
- lesson-shape validation accepts valid `visualDirection`,
- scene update path edits `visualDirection`,
- visual direction edit marks generated/approved scene image stale,
- visual direction edit marks lesson dirty,
- save/open/duplicate or equivalent persistence flow preserves the field,
- stale visual direction edit blocks media readiness,
- media readiness does not autosave dirty visual direction edits,
- scene UI renders an editable textarea if component tests exist.

Expected backend coverage includes:

- old scenes normalize with `visualDirection: ""`,
- validation accepts valid values,
- validation rejects or normalizes invalid/non-string/overlong values according to convention,
- scene planning preserves existing non-empty visual direction,
- scene planning schema behavior is tested if planner drafts visual direction,
- scene image prompt includes target scene visual direction,
- scene image prompt does not include other scenes' visual direction,
- scene image prompt still includes stable character appearance,
- scene image prompt excludes legacy character notes,
- scene image prompt excludes learner level and target vocabulary,
- prompt version is updated,
- media readiness sees stale visual-direction-edited scenes as blockers.

Do not fail the implementation merely because scene planning does not draft visual direction. That was optional.

## Manual QA Scenarios

Run or reason through these scenarios:

1. Open an older saved project with scenes.
   - Scenes load with an empty visual direction field.

2. Add visual direction to a scene.
   - The field is editable.
   - The lesson becomes unsaved.
   - Refresh/close warns about unsaved changes.

3. Save explicitly and refresh.
   - The visual direction remains.
   - The lesson restores cleanly.

4. Generate and approve a scene image.
   - Scene image behavior still works.

5. Edit visual direction on the approved scene.
   - The scene image becomes stale.
   - Media readiness reports a blocker.

6. Regenerate and approve the scene image.
   - Stale blocker clears if all other readiness requirements are met.

7. Navigate to Media/Export with unsaved visual direction edits.
   - No autosave occurs.
   - Save-first/manual-save behavior remains intact.

8. Generate a scene image with visual direction present.
   - The backend prompt includes the target scene's visual direction.
   - Stable character appearance is preserved.

## Commands To Consider

Use the commands that fit the repo's scripts:

```sh
git status --short
rg "visualDirection|scene-image-v|buildSceneImagePrompt|sceneImagePromptVersion|normalizeScene|validateScene|mark.*stale|stale.*scene" frontend/src server/src frontend/test server/test docs
rg "visualDirection" server/src/prompts/characterImagePrompts.js server/src/services/characterImageService.js frontend/src/stages/CharactersStage.jsx frontend/src/utils/lessonUpdates.js
rg "autosave|auto-save|draft recovery|Recovered draft|Cloud saved|Syncing|Backed up|firebase|auth|login|account|cloud|remote storage|database|JSZip|archiver|pptx|PowerPoint|worksheet|audio|video" frontend server docs package.json
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

## Review Output Format

Return findings first, ordered by severity.

Use this structure:

```text
Phase I Review

Findings
- [P1/P2/P3] Title
  File: path:line
  Issue: ...
  Why it matters: ...
  Suggested fix: ...

Open Questions
- ...

Verification
- Command/result summary.

Summary
- Pass/Fail by area:
  - Scene data model:
  - Normalization and validation:
  - Persistence:
  - Scenes stage UI:
  - Stale scene-image behavior:
  - Dirty/manual-save behavior:
  - Scene planning merge behavior:
  - Scene image prompt inclusion:
  - Character identity boundary:
  - Media readiness:
  - Active operation guards:
  - Test coverage:
  - Scope control:
```

If there are no findings, state that clearly and still mention any residual test gaps or manual-verification limits.

## Pass/Fail Checklist

- `visualDirection` exists on normalized scenes: Pass/Fail with notes.
- Old projects without the field load: Pass/Fail with notes.
- Valid values persist through save/open/restore/duplicate: Pass/Fail with notes.
- Invalid values are handled consistently: Pass/Fail with notes.
- Max length is enforced or documented: Pass/Fail with notes.
- Scenes stage renders editable visual direction textarea: Pass/Fail with notes.
- Textarea uses existing disabled/operation guards: Pass/Fail with notes.
- Editing visual direction marks scene image stale: Pass/Fail with notes.
- Stale behavior is scene-scoped: Pass/Fail with notes.
- Editing visual direction marks lesson dirty: Pass/Fail with notes.
- Explicit save clears dirty state after success: Pass/Fail with notes.
- Media/Export navigation does not autosave dirty visual direction edits: Pass/Fail with notes.
- Scene planning preserves tutor-authored values: Pass/Fail with notes.
- Scene image prompt includes target visual direction: Pass/Fail with notes.
- Scene image prompt excludes other scenes' visual direction: Pass/Fail with notes.
- Scene image prompt preserves stable character identity: Pass/Fail with notes.
- Character image prompts do not include visual direction: Pass/Fail with notes.
- Character records are not mutated by visual direction: Pass/Fail with notes.
- Legacy notes/learner level/target vocabulary remain excluded from scene image prompts: Pass/Fail with notes.
- Media readiness blocks stale visual-direction edits: Pass/Fail with notes.
- Active operation guards are preserved: Pass/Fail with notes.
- No autosave/draft recovery/export/cloud/auth/storage redesign scope: Pass/Fail with notes.
- Test coverage is adequate: Pass/Fail with notes.
