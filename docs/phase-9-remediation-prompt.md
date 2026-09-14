# Phase 9 Remediation Prompt

Use this prompt to fix the Phase 9 review finding about interleaved scene sentence coverage.

## Prompt

You are fixing one narrow Phase 9 issue in Lesson Source Builder.

Phase 9 has been implemented and reviewed. The remaining finding is:

```text
[P2] Scene order validation allows interleaved sentence coverage
File/path: server/src/services/validateScenePlan.js
Evidence: validation compares each scene's first sentence position to the previous scene's first position only. A targeted probe was accepted for Scene 1 = [sentence-1, sentence-3] followed by Scene 2 = [sentence-2].
Why it matters: a model response can pass validation while displaying story sentences out of narrative order, weakening the locked story order contract.
Recommended fix: track the previous scene's maximum covered sentence position and reject any later scene whose first position is less than or equal to that max. Add a regression test for interleaved coverage.
```

Fix this issue only. Do not add scene image generation, audio/video generation, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable scene libraries or any Phase 10+ scope.

## Scope

Update:

```text
server/src/services/validateScenePlan.js
server/test/scenePlanning.test.js
```

Only update additional files if the implementation has moved the validator or tests to a different equivalent location.

## Required Behavior

Scene plan validation must reject interleaved coverage across scenes.

Valid contiguous or increasing scene groups:

```text
Scene 1: sentence-1, sentence-2
Scene 2: sentence-3
Scene 3: sentence-4, sentence-5
```

Invalid interleaved scene groups:

```text
Scene 1: sentence-1, sentence-3
Scene 2: sentence-2
```

```text
Scene 1: sentence-2
Scene 2: sentence-1, sentence-3
```

```text
Scene 1: sentence-1, sentence-4
Scene 2: sentence-2, sentence-3
```

The validator should still:

- Sort sentence IDs within a scene by locked story order for normalized output.
- Reject unknown sentence IDs.
- Reject duplicate sentence IDs within a scene.
- Reject duplicate sentence coverage across scenes.
- Reject missing sentence coverage.
- Preserve the existing JSON error shape and status behavior.
- Avoid mutating the saved project when validation fails.

## Implementation Guidance

In `server/src/services/validateScenePlan.js`, the current scene order check compares only each scene's first covered sentence position to the previous scene's first covered sentence position.

Replace that logic with a range-boundary check:

1. Keep a variable such as `previousMaxPosition`, initialized to `-1`.
2. For each normalized non-empty scene:
   - Compute `firstPosition` from the first normalized sentence ID.
   - Compute `lastPosition` from the last normalized sentence ID.
   - If `firstPosition <= previousMaxPosition`, add the existing story-order validation error.
   - Otherwise set `previousMaxPosition = lastPosition`.
3. Keep the existing validation message unless there is a strong local convention for more specific error text.

This ensures any later scene begins after the full covered range of the prior scene, not merely after the prior scene's first sentence.

Be careful with scenes that already have other sentence validation errors. Avoid introducing `undefined` comparisons if `sentenceIds` is empty or invalid.

## Regression Tests

Add focused tests in `server/test/scenePlanning.test.js`.

At minimum, add a test that rejects:

```js
{
  scenes: [
    {
      label: "Scene 1",
      sentenceIds: ["sentence-1", "sentence-3"],
      location: "Reception desk",
      description: "The first and third story beats are incorrectly grouped around another scene.",
      characterIds: ["character-marta", "character-receptionist"],
      imageMode: "generate",
      reuseSceneId: null
    },
    {
      label: "Scene 2",
      sentenceIds: ["sentence-2"],
      location: "Reception desk",
      description: "The second story beat is interleaved after a later beat.",
      characterIds: ["character-marta", "character-receptionist"],
      imageMode: "generate",
      reuseSceneId: null
    },
    {
      label: "Scene 3",
      sentenceIds: ["sentence-4", "sentence-5", "sentence-6"],
      location: "Training room",
      description: "The remaining story beats continue in order.",
      characterIds: ["character-marta", "character-coach"],
      imageMode: "generate",
      reuseSceneId: null
    }
  ]
}
```

Adjust character IDs, sentence IDs and descriptions to match the existing test fixture helpers.

Also keep or add a positive test showing that contiguous grouped scenes remain valid:

```text
Scene 1: sentence-1, sentence-2
Scene 2: sentence-3
Scene 3: sentence-4, sentence-5, sentence-6
```

If an existing happy-path test already covers this, do not duplicate it unnecessarily.

## Acceptance Criteria

- `validateScenePlan` rejects interleaved scene coverage.
- `validateScenePlan` still accepts valid grouped scenes in locked story order.
- Existing duplicate, unknown, missing coverage and unsupported-field validation still works.
- The validator still returns normalized scene records for valid plans.
- No frontend behavior changes are required unless tests reveal a coupled issue.
- No Phase 10+ scope is introduced.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
```

Also run targeted scans:

```sh
rg "previousFirstPosition|previousMaxPosition|Scenes must follow locked story order" server/src/services/validateScenePlan.js server/test/scenePlanning.test.js
rg "images/scene|/api/images/scene|scene image|image prompt|audio|video|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

If a full frontend test/build is unavailable for environmental reasons, state exactly what was skipped and why.

## Expected Final Response

Report:

- Files changed.
- The exact validation rule added.
- Tests added or updated.
- Commands run and results.
- Any skipped checks.

Keep the response brief and do not claim live OpenAI behavior was tested unless you actually ran a live provider call.
