# Phase 7 Remediation Prompt

Use this prompt to fix the remaining Milestone 3, Phase 7 review findings for Lesson Source Builder.

## Prompt

You are remediating Milestone 3, Phase 7 of Lesson Source Builder.

Phase 7 added backend-backed character extraction from the locked master story. The core route, prompt, schema, validator, merge service, frontend API client and Characters-stage UI are present, but three correctness issues remain.

Fix these issues only. Do not add Phase 8 character reference image generation, scene planning, scene image generation, audio/video outputs, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth or cloud sync.

## Findings To Fix

### P1: Setup Main Character Is Not Guaranteed If The Model Omits It

Current behavior:

- Character merge maps over `extractedCharacters`.
- Validation rejects an empty `characters` array, but it does not reject an extraction array that omits `lesson.setup.mainCharacter.name`.
- If the model returns only `Receptionist`, the saved lesson can omit the required main character, such as `Marta`.

Why this matters:

- Phase 7 requires extracted characters to be merged with Setup main/secondary data.
- The Setup main character is a required participant in the lesson context and should always have a character card.
- A model omission should not cause the app to lose the main character.

Fix requirement:

- Guarantee the Setup main character is present in the final merged `lesson.characters` whenever `lesson.setup.mainCharacter.name` is non-empty.
- Prefer adding this guarantee in merge logic so the final saved lesson is correct even if validation allows model omissions.
- Also consider adding validation or a service-level check that flags model output missing the Setup main character, but do not rely on validation alone unless the user can recover cleanly.
- The guaranteed main character should:
  - use a safe stable ID;
  - have role `main`;
  - preserve an existing matching main character ID and tutor edits where present;
  - use Setup name, age, sex and background as authoritative values;
  - preserve existing notes and append useful model notes only when matched;
  - keep `generationStatus`, `generationCount`, `imagePath`, `approved`, `stale`, `staleReason` and `staleAt` for an existing matched record.

Recommended files:

```text
server/src/services/characterExtractionService.js
server/src/services/validateCharacterExtraction.js
server/test/characterExtraction.test.js
```

### P1: Extraction Can Silently Rebuild Missing Locked Snapshots From Editable Story Text

Current behavior:

- `projectStore.getProject(...)` normalizes lessons on load.
- `server/src/services/normalizeLesson.js` derives `story.lockedSentences` from `story.sentences` when the story is locked and the snapshot is absent or empty.
- This is useful for legacy project open/save compatibility, but Phase 7 specifically requires extraction from a valid locked master snapshot.
- Because extraction loads through `getProject`, the extraction service may never see that the original saved file had an empty or missing snapshot.

Why this matters:

- Phase 7 must extract from `story.lockedSentences`, not editable story text.
- Legacy migration should keep old projects openable, but extraction should not silently treat editable draft text as the locked master source for AI generation.

Fix requirement:

- Preserve legacy project open/save/duplicate behavior from the previous remediation.
- Add an extraction-specific guard that can detect whether the persisted project originally had a valid locked snapshot before normalization derived one.
- `POST /api/characters/extract` should return `422` when the saved project has:
  - `story.status === "locked"`; and
  - missing `story.lockedSentences`; or
  - empty `story.lockedSentences`; or
  - invalid/mismatched non-empty `story.lockedSentences`.
- Do not weaken general project open/save migration. Existing locked projects without snapshots should still open, but the tutor should need to explicitly lock/save a valid master snapshot before extraction.
- Provide a clear error message, for example: `Lock the story again before extracting characters.`

Implementation options:

1. Add a raw project read helper in `projectStore`, such as `getRawProject(projectId)`, used only by extraction validation.
2. Add a `getProject(projectId, { migrateLegacyLockedSnapshot: false })` option if it fits the existing store design.
3. Add metadata during normalization that records whether `lockedSentences` was derived, then make extraction reject derived snapshots unless the project is explicitly saved after re-locking.

Choose the smallest option that keeps the project store clean and does not disrupt normal open/save behavior.

Recommended files:

```text
server/src/services/projectStore.js
server/src/services/normalizeLesson.js
server/src/services/characterExtractionService.js
server/src/services/validateLesson.js
server/test/characterExtraction.test.js
server/test/projectStore.test.js
docs/phase-7-character-extraction.md
```

### P2: Project Controls Can Remain Blocked After A Story Operation Error

Current behavior:

- `isStoryOperationActive` is derived as:

```js
storyGenerationStatus === "generating" || storyOperationStatus !== "idle"
```

- This treats `"error"` as active.
- `isProjectActionDisabled` then keeps Save/Open/Duplicate/New blocked after a failed lock/unlock/regenerate until another story operation resets the state.

Why this matters:

- Project controls should be blocked while model/story operations are actually in flight.
- Error states need to remain visible without trapping the user.
- This can regress save/open/duplicate behavior after a failed operation.

Fix requirement:

- Treat only loading/in-flight statuses as active.
- Do not treat `"error"` as active.
- Keep the visible error message intact.
- Ensure New/Open/Duplicate/Save become available after a failed operation unless another active operation is running.
- Apply the same principle to character extraction and story generation statuses if needed.

Recommended shape:

```js
const isStoryOperationActive =
  storyGenerationStatus === "generating" ||
  ["regenerating", "locking", "unlocking"].includes(storyOperationStatus);
```

Adjust the loading status names to match the current app.

Recommended files:

```text
frontend/src/App.jsx
frontend/src/components/Sidebar.jsx
frontend/src/stages/StoryStage.jsx
frontend/src/stages/CharactersStage.jsx
```

## Implementation Steps

1. Read `docs/phase-7-implementation-prompt.md`.
2. Read `docs/phase-7-review-prompt.md`.
3. Read `docs/phase-7-character-extraction.md`.
4. Reproduce or confirm each finding through tests or code inspection.
5. Update character merge logic so the Setup main character is always present in the final saved character array.
6. Add tests where model output omits the Setup main character and verify the saved lesson still includes it.
7. Add tests where model output conflicts with Setup main values and verify Setup values win.
8. Add an extraction-specific raw locked snapshot validation guard.
9. Add tests proving ordinary legacy locked projects still open.
10. Add tests proving extraction rejects a locked saved project whose original file lacks a usable locked snapshot.
11. Add tests proving extraction accepts the project after a proper re-lock or after saving a valid snapshot.
12. Fix `isStoryOperationActive` so error states do not disable project controls.
13. Verify project controls still disable during actual loading states.
14. Update documentation to describe the extraction snapshot requirement and the recovery path for legacy projects.
15. Run the verification commands.

## Main Character Merge Details

Recommended helper behavior:

```js
function ensureSetupMainCharacter(lesson, extractedCharacters) {
  const setupMain = lesson.setup?.mainCharacter;
  if (!setupMain?.name?.trim()) return extractedCharacters;

  const setupNameKey = normalizeName(setupMain.name);
  const hasMain = extractedCharacters.some(
    (character) =>
      normalizeName(character.name) === setupNameKey || character.role === "main"
  );

  if (hasMain) return extractedCharacters;

  return [
    {
      name: setupMain.name,
      role: "main",
      age: setupMain.age || "",
      sex: setupMain.sex || "Unspecified",
      background: setupMain.background || "",
      notes: [],
      storySentenceIds: []
    },
    ...extractedCharacters
  ];
}
```

Adjust this to local style. Be careful with the `character.role === "main"` condition: if the model returns a different person as `main`, the final merge must still preserve the Setup main character and avoid incorrectly merging two different people.

Acceptance details:

- If the model omits `Marta`, add `Marta`.
- If the model returns `Marta` with conflicting age/background, keep Setup values.
- If an existing `Marta` record exists, preserve its ID and generated/approved state.
- If the model returns a different `main` character, keep the Setup main as `main`; decide whether the model's record should become `supporting` or fail validation. Prefer failing validation if the conflict is ambiguous.

## Locked Snapshot Guard Details

The previous migration correctly lets old projects open. Do not remove that compatibility.

For extraction, validate the original persisted story snapshot before normalized migration can hide the problem.

Expected behavior:

```text
Open old locked project without lockedSentences -> succeeds.
Save/open old locked project after migration -> succeeds.
Extract characters from old locked project without an original snapshot -> 422.
Relock the story to create an explicit snapshot -> extraction may proceed.
Extract characters from locked project with valid lockedSentences -> succeeds.
Extract characters from locked project with mismatched lockedSentences -> 422.
```

If the chosen implementation writes derived snapshots back to disk during a normal save, document whether that counts as an explicit valid snapshot. Prefer requiring an actual lock/re-lock action if the app can guide the user clearly.

## Frontend Project Control Details

Audit active-state derivation in `App.jsx`.

Confirm these are active only while loading:

```text
storyGenerationStatus === "generating"
storyOperationStatus === "regenerating"
storyOperationStatus === "locking"
storyOperationStatus === "unlocking"
characterExtractionStatus === "extracting"
sentenceOperations[...].status === "loading"
```

Confirm these are not active blockers:

```text
storyGenerationStatus === "error"
storyOperationStatus === "error"
characterExtractionStatus === "error"
```

The UI should keep error text visible while allowing Save/New/Open/Duplicate if no operation is in flight.

## Acceptance Criteria

- Model output that omits the Setup main character still results in a saved main character card.
- Setup main character fields win over model guesses.
- Existing matching main character ID, edits, notes and generated/approved placeholder state are preserved.
- A model output with only secondary/supporting characters cannot cause the main character to disappear.
- General legacy locked projects without snapshots still open.
- Character extraction rejects locked projects whose persisted locked snapshot was missing, empty or invalid before migration.
- The extraction error clearly tells the tutor how to recover.
- Extraction still succeeds for projects with a valid explicit locked snapshot.
- Project controls are disabled during actual story/character/sentence loading operations.
- Project controls are not disabled merely because a story operation is in an error state.
- Existing Phase 6 overwrite guards, locked snapshot validation and story operation concurrency guards still work.
- No Phase 8+ scope is introduced.

## Regression Tests To Add Or Update

Backend tests:

```text
server/test/characterExtraction.test.js
server/test/projectStore.test.js
```

Cover:

- Extraction response omits Setup main; saved lesson includes Setup main.
- Extraction response includes conflicting Setup main values; saved lesson uses Setup values.
- Existing Setup main record keeps ID and generated/approved/image placeholder fields.
- Extraction response includes a different `main` than Setup main; implementation either rejects clearly or preserves Setup main without merging them incorrectly.
- Legacy locked project without `lockedSentences` opens through normal project store.
- Extraction rejects a project whose raw persisted `lockedSentences` is missing.
- Extraction rejects a project whose raw persisted `lockedSentences` is empty.
- Extraction rejects a project whose raw persisted `lockedSentences` mismatches story sentences.
- Extraction accepts a project with a valid raw persisted `lockedSentences` snapshot.
- Invalid extraction output still does not mutate the project.

Frontend tests or manual checks:

- Trigger a story operation error and confirm New/Open/Duplicate/Save are not permanently disabled.
- Confirm project controls disable during `regenerating`, `locking`, `unlocking`, `generating`, `extracting` and sentence `loading`.
- Confirm visible error text remains after project controls unblock.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run build --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/characters/extract -H "Content-Type: application/json" -d '{}'
rg "setupMain|mainCharacter|lockedSentences|raw|migrat|characterExtraction|characters/extract" server/src server/test frontend/src docs
rg "isStoryOperationActive|storyOperationStatus !==|regenerating|locking|unlocking|isProjectActionDisabled" frontend/src/App.jsx frontend/src/components/Sidebar.jsx
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "A1|A2|B1|CEFR" frontend/src server/src docs README.md
rg "images/character|images/scene|/api/images|scenes/plan|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

Do not run live OpenAI calls unless the environment has an API key and the user explicitly wants a live smoke test.

## Documentation Update

Update `docs/phase-7-character-extraction.md` after the fix with:

- Main character guarantee behavior.
- Extraction requirement for an explicit valid locked snapshot.
- Recovery path for legacy locked projects with derived snapshots.
- Story operation error-state unblock behavior.
- Verification commands that passed.

## Handoff Notes

Keep the distinction sharp:

- Project open/save migration may derive snapshots for old local files.
- Character extraction must use a real locked master snapshot and reject missing/empty/invalid original snapshots.

Do not solve the second issue by weakening Phase 6 legacy migration globally. The goal is compatibility for opening old work, plus stricter source integrity before AI extraction.
