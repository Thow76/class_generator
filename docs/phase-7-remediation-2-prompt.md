# Phase 7 Remediation 2 Prompt

Use this prompt to fix the remaining Milestone 3, Phase 7 main-character merge edge case in Lesson Source Builder.

## Prompt

You are remediating one remaining Phase 7 issue in Lesson Source Builder.

Phase 7 character extraction is implemented, and the previous remediation fixed raw locked-snapshot validation and story-operation error blocking. One P1 edge case remains: the Setup main character can still be lost when an unrelated existing character has `role: "main"`.

Fix this issue only. Do not add Phase 8 character reference image generation, scene planning, scene image generation, audio/video outputs, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth or cloud sync.

## Finding To Fix

### P1: Setup Main Can Be Lost When An Existing Unrelated `role: "main"` Record Exists

Current failure case:

1. Setup main character is `Marta`.
2. Existing `lesson.characters` contains:

```json
{
  "id": "character-alex",
  "name": "Alex",
  "role": "main"
}
```

3. The extraction model omits `Marta` and returns only another character, such as `Receptionist`.
4. Remediation logic inserts a synthetic Setup main extraction record for `Marta`.
5. Merge logic sees the synthetic `Marta` record as a setup-main match.
6. `findExistingMainCharacter()` falls back to an existing `role: "main"` record.
7. The unrelated `Alex` record is treated as the existing Setup main record.
8. `chooseValue(existing?.name, setupValues.name, ...)` preserves `Alex`.
9. The final saved lesson still has no `Marta`.

Why this matters:

- Phase 7 requires the Setup main character to be guaranteed in the final character records.
- The previous remediation explicitly said not to merge two different people just because their roles match.
- Losing the Setup main character can break character review and downstream visual continuity.

## Required Behavior

- If `lesson.setup.mainCharacter.name` is non-empty, the final saved `lesson.characters` must include a character whose normalized name matches it.
- Setup main matching must be identity/name based, not role-only.
- An existing unrelated `role: "main"` character must not be used as the match for the Setup main character.
- If the Setup main character is missing from model output, add it as a new character record unless an existing same-name record already exists.
- If an existing same-name Setup main record exists, preserve its ID, tutor edits, notes and generated/approved/image placeholder state.
- Existing unrelated main-role characters should be preserved and, if generated/approved and not found in extraction, marked stale according to the existing unmatched-character policy.
- There should be no final character array where `Marta` is absent merely because `Alex` had `role: "main"`.

## Recommended Code Direction

Inspect:

```text
server/src/services/characterExtractionService.js
server/test/characterExtraction.test.js
docs/phase-7-character-extraction.md
```

The risky code is the role-based fallback in `findExistingMainCharacter()` or equivalent logic:

```js
return character.role === "main" && setupMain.nameKey;
```

Remove or narrow this fallback.

Safer behavior:

```js
function findExistingSetupMainCharacter(characters, setupMain) {
  if (!setupMain.nameKey) return null;

  return (
    characters.find(
      (character) => normalizeName(character.name) === setupMain.nameKey
    ) || null
  );
}
```

Then ensure the synthetic Setup main record creates a new safe ID when no same-name existing record is found.

Do not match by `role: "main"` alone.

## Merge Rules To Preserve

Keep the existing good behavior:

- Setup main fields win over model guesses for the Setup main character.
- Existing same-name character IDs are preserved.
- Existing same-name tutor edits are preserved according to the current merge policy.
- Existing same-name `generationStatus`, `generationCount`, `imagePath`, `approved`, `stale`, `staleReason` and `staleAt` are preserved.
- Model output that includes a different `main` character than Setup main is rejected or handled without overwriting the Setup main identity.
- Existing unmatched generated/approved characters are retained and marked stale.
- Invalid model output does not mutate the saved project.
- Raw locked-snapshot validation remains intact.

## Implementation Steps

1. Reproduce the edge case with a focused test or direct service call:
   - Setup main is `Marta`.
   - Existing character is `Alex` with `role: "main"`.
   - Extracted output omits `Marta`.
   - Current result incorrectly lacks `Marta`.
2. Update the merge helper so Setup main existing-record matching uses normalized name only.
3. Ensure the synthetic Setup main record is inserted when the model omits Setup main.
4. Ensure the synthetic Setup main record creates a new safe ID if no same-name existing record exists.
5. Ensure unrelated `role: "main"` records are preserved separately and are not rewritten into Setup main.
6. Add regression tests for the edge case.
7. Add at least one test proving same-name existing Setup main records still preserve ID and generated/approved fields.
8. Add or update documentation with the explicit rule: never merge Setup main by role alone.
9. Run verification commands.

## Regression Tests To Add

Add focused tests in:

```text
server/test/characterExtraction.test.js
```

Suggested test: model omits Setup main and unrelated existing main exists.

Input lesson:

```json
{
  "setup": {
    "mainCharacter": {
      "name": "Marta",
      "age": "34",
      "sex": "Woman",
      "background": "Polish"
    }
  },
  "characters": [
    {
      "id": "character-alex",
      "name": "Alex",
      "role": "main",
      "age": "40",
      "sex": "Man",
      "background": "",
      "notes": ["existing"],
      "generationStatus": "generated",
      "generationCount": 1,
      "imagePath": "/tmp/alex.png",
      "approved": true,
      "stale": false
    }
  ]
}
```

Model output:

```json
{
  "characters": [
    {
      "name": "Receptionist",
      "role": "secondary",
      "age": "",
      "sex": "Unspecified",
      "background": "",
      "notes": [],
      "storySentenceIds": ["sentence-2"]
    }
  ]
}
```

Expected result:

- `lesson.characters` includes `Marta`.
- `Marta.role === "main"`.
- `Marta.age === "34"`.
- `Marta.sex === "Woman"`.
- `Marta.background === "Polish"`.
- `Marta.id` is a safe stable ID, such as `character-marta`.
- `Alex` remains a separate character.
- `Alex.name` is not rewritten to `Marta`.
- `Alex` is marked stale if the existing unmatched generated/approved policy applies.

Suggested test: same-name existing main is preserved.

Input existing character:

```json
{
  "id": "character-custom-marta",
  "name": "Marta",
  "role": "main",
  "generationStatus": "generated",
  "generationCount": 2,
  "imagePath": "/tmp/marta.png",
  "approved": true
}
```

Expected result:

- `character-custom-marta` remains the ID for Marta.
- Generated/approved/image placeholder state is preserved.
- Setup values still win for age, sex and background.

Suggested test: different model main remains rejected or does not replace Setup main.

Model output:

```json
{
  "characters": [
    {
      "name": "Alex",
      "role": "main",
      "age": "",
      "sex": "Unspecified",
      "background": "",
      "notes": [],
      "storySentenceIds": ["sentence-1"]
    }
  ]
}
```

Expected result:

- Either validation rejects the conflicting model main; or
- final lesson still includes Setup main `Marta` and does not merge her into `Alex`.

Prefer rejection for ambiguity if that matches the current remediation.

## Acceptance Criteria

- The direct merge probe described in the review no longer reproduces.
- Setup main is present in the final lesson when model output omits it.
- Existing unrelated `role: "main"` records are never treated as the Setup main solely because of role.
- Existing same-name Setup main records still preserve stable ID and generated/approved/image fields.
- Existing unmatched generated/approved characters are retained and marked stale according to current policy.
- Main-character conflict handling with model output remains clear and tested.
- Existing raw locked-snapshot extraction guard remains passing.
- Existing story-operation error unblock remains passing.
- No Phase 8+ scope is introduced.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run build --workspace frontend
npm run test --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/characters/extract -H "Content-Type: application/json" -d '{}'
rg "findExistingMainCharacter|findExistingSetupMainCharacter|setupMainMatch|ensureSetupMainCharacter|character-alex|character-marta" server/src server/test docs
rg "return character\\.role === .main|role === .main. && setupMain" server/src/services/characterExtractionService.js
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "images/character|images/scene|/api/images|scenes/plan|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

The second `rg` command should return no role-only Setup main matching fallback after the fix.

Do not run live OpenAI calls unless the environment has an API key and the user explicitly wants a live smoke test.

## Documentation Update

Update `docs/phase-7-character-extraction.md` with:

- Setup main character is guaranteed by normalized-name identity.
- Existing `role: "main"` records are not enough to match Setup main.
- Unrelated existing main-role records are preserved separately and may be marked stale if unmatched.
- Verification commands that passed.

## Handoff Notes

This is an identity bug, not a schema expansion. Keep the character card model unchanged and avoid adding new UI fields. The fix should make the merge stricter and safer: same person by normalized name is a match; same role alone is not.
