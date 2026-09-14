# Phase 8 Remediation Prompt

Use this prompt to fix the remaining Milestone 3, Phase 8 review findings for Lesson Source Builder.

## Prompt

You are remediating Milestone 3, Phase 8 of Lesson Source Builder.

Phase 8 added backend-generated persistent character reference images. The core route, image service, prompt builder, local image storage, asset serving, frontend API client and Characters-stage UI are largely implemented. Two issues remain:

- malformed `characterId` values return `404` instead of the required `400`;
- generated image payloads are base64-decoded but not content-validated before being saved as `.png`.

Fix these issues only. Do not add scene planning, scene image generation, audio/video outputs, ZIP export, PowerPoint generation, worksheet generation, accounts, Firebase, auth, cloud sync, reusable cross-project character libraries or external media platform integrations.

## Findings To Fix

### P2: Malformed `characterId` Returns 404 Instead Of 400

Current behavior:

- `assertRequiredIds` in `server/src/services/characterImageService.js` checks only that `characterId` is a non-empty string.
- A malformed ID such as `"../bad"` reaches `findCharacter`.
- The service reports `Character not found.` with `404`.

Why this matters:

- Phase 8 API contract requires malformed IDs to return `400`.
- Treating malformed input as a missing character weakens route validation and makes tests/API behavior inconsistent.
- Storage validation already knows how to reject unsafe character IDs, but it runs too late because lookup happens first.

Fix requirement:

- Validate `characterId` before project lookup or character lookup.
- Use the same safe record ID rules as lesson validation/image storage.
- Return `400` for malformed `characterId`.
- Preserve `404` for safe but missing character IDs.
- Apply the same validation to both generation and approval endpoints.
- Add tests for malformed `characterId` on both endpoints.

Recommended files:

```text
server/src/services/characterImageService.js
server/src/services/imageStorage.js
server/test/characterImage.test.js
docs/phase-8-character-reference-images.md
```

Recommended helper:

```js
const safeRecordIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

function isSafeRecordId(value) {
  return typeof value === "string" && safeRecordIdPattern.test(value);
}
```

Then in `assertRequiredIds`:

```js
if (typeof characterId !== "string" || characterId.trim() === "") {
  throw new CharacterImageError("Request body must include characterId.", 400);
}

if (!isSafeRecordId(characterId)) {
  throw new CharacterImageError("Character id is malformed.", 400);
}
```

Prefer sharing the helper if the codebase already has a clean exported utility. Do not create an awkward dependency cycle just to share a regex.

### P3: Generated Image Data Is Not Content-Validated Before Saving As PNG

Current behavior:

- `decodeImageData` in `server/src/services/imageStorage.js` accepts any non-empty string and passes it to `Buffer.from(value, "base64")`.
- `saveCharacterImage` writes the resulting bytes with a `.png` extension.
- A corrupt or non-PNG provider response could create a file and mark the character as generated.

Why this matters:

- The app should not mark a character image generated when the returned payload is not a usable image.
- A `.png` extension should not be written for arbitrary bytes.
- This is a hardening issue but also protects the tutor from broken image cards and bad persisted state.

Fix requirement:

- Validate decoded image data before writing the file.
- For Phase 8's current `.png` output, require:
  - valid base64 input;
  - a non-empty decoded buffer;
  - PNG magic bytes.
- If the implementation supports other extensions later, validate the expected signature for each supported extension or require a trusted provider content type before choosing the extension.
- Do not update the lesson or mark the character generated if image validation fails.
- Return a typed JSON error, likely `503`, for unusable provider image data.
- Add tests for malformed base64 and valid base64 that decodes to non-PNG bytes.

Recommended files:

```text
server/src/services/imageStorage.js
server/src/services/characterImageService.js
server/test/characterImage.test.js
docs/phase-8-character-reference-images.md
```

Recommended PNG check:

```js
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a
]);

function assertPngBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length <= pngSignature.length) {
    throw new ImageStorageError("Image response did not include usable PNG data.", 503);
  }

  if (!buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new ImageStorageError("Image response did not include usable PNG data.", 503);
  }
}
```

Base64 validation guidance:

- Do not rely on `Buffer.from(value, "base64")` alone; it can tolerate malformed input.
- Normalize whitespace if provider output may include line breaks.
- Reject strings with invalid base64 characters.
- Re-encode comparison is acceptable if implemented carefully.
- Ensure decoded data is validated after decoding.

## Implementation Steps

1. Read `docs/phase-8-implementation-prompt.md`.
2. Read `docs/phase-8-review-prompt.md`.
3. Read `docs/phase-8-character-reference-images.md`.
4. Confirm the malformed `characterId` behavior still reproduces.
5. Add service-layer safe ID validation for `characterId`.
6. Add generation endpoint test: malformed `characterId` returns a `400`-class `CharacterImageError`.
7. Add approval endpoint test: malformed `characterId` returns a `400`-class `CharacterImageError`.
8. Confirm safe but missing IDs still return `404`.
9. Add strict image data validation before file write.
10. Add tests for invalid base64 input.
11. Add tests for base64 that decodes to non-PNG bytes.
12. Confirm invalid image payloads do not write files.
13. Confirm invalid image payloads do not mutate `lesson.json`.
14. Update Phase 8 documentation with the stricter ID and image validation behavior.
15. Run all verification commands.

## Regression Tests To Add Or Update

Add focused tests in:

```text
server/test/characterImage.test.js
```

Cover:

- `generateCharacterImageForProject(projectId, "../bad", ...)` rejects with status `400`.
- `approveCharacterImageForProject(projectId, "../bad")` rejects with status `400`.
- `generateCharacterImageForProject(projectId, "character-missing", ...)` still rejects with status `404`.
- `approveCharacterImageForProject(projectId, "character-missing")` still rejects with status `404`.
- Image response with malformed base64 rejects.
- Image response with empty decoded bytes rejects.
- Image response with valid base64 but non-PNG bytes rejects.
- Invalid image response leaves the target character unchanged.
- Invalid image response does not create a file in `images/characters`.
- Valid tiny PNG fixture still saves and updates the target character.

Suggested invalid image fixtures:

```js
const malformedBase64 = "not valid base64 ***";
const nonPngBase64 = Buffer.from("not a png").toString("base64");
const emptyBase64 = "";
```

Use a known tiny PNG fixture for the positive case.

## Acceptance Criteria

- Malformed `characterId` returns `400` for character image generation.
- Malformed `characterId` returns `400` for character image approval.
- Safe but missing `characterId` still returns `404`.
- Safe valid `characterId` generation path still works.
- Safe valid `characterId` approval path still works.
- Malformed base64 image data is rejected before file write.
- Empty decoded image data is rejected before file write.
- Non-PNG bytes are rejected when saving a `.png`.
- Invalid image data does not mutate the lesson.
- Invalid image data does not mark a character as generated.
- Invalid image data does not leave behind a generated asset file.
- Existing Phase 8 image generation, approval, stale handling and asset route tests still pass.
- Existing Phase 7 character extraction tests still pass.
- Existing Phase 6 story tests still pass.
- No Phase 9+ or Milestone 4 scope is introduced.

## Verification Commands

Run:

```sh
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/images/character -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://127.0.0.1:3001/api/images/character/approve -H "Content-Type: application/json" -d '{}'
rg "Character id is malformed|isSafeRecordId|safeRecordIdPattern|pngSignature|usable PNG|decodeImageData" server/src server/test docs
rg "from ['\"]openai['\"]|require\\(['\"]openai['\"]\\)" server frontend
rg "scenes/plan|images/scene|/api/scenes|zip|firebase|auth|login|account|PowerPoint|worksheet|ElevenLabs" frontend server package.json docs
```

Optional route probes if a dev server is running:

```sh
curl -s -X POST http://127.0.0.1:3001/api/images/character \
  -H "Content-Type: application/json" \
  -d '{"lessonId":"lesson-existing","characterId":"../bad"}'

curl -s -X POST http://127.0.0.1:3001/api/images/character/approve \
  -H "Content-Type: application/json" \
  -d '{"lessonId":"lesson-existing","characterId":"../bad"}'
```

Expected: JSON `400` responses for malformed `characterId`.

Do not run live OpenAI image generation unless the environment has an API key and the user explicitly wants a live smoke test.

## Documentation Update

Update `docs/phase-8-character-reference-images.md` with:

- Malformed `characterId` values return `400`.
- Safe but missing character IDs return `404`.
- Saved `.png` files require valid decoded PNG data.
- Invalid provider image payloads do not mutate lesson state.
- Verification commands that passed.

## Handoff Notes

This remediation is small but important: validate identity before lookup, and validate image bytes before persistence. Keep the rest of Phase 8 intact. Do not change prompt behavior, approval semantics, asset routing, or frontend UI unless needed to surface the corrected errors cleanly.
