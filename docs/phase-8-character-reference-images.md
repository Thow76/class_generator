# Phase 8 Character Reference Images

Milestone 3, Phase 8 replaces the placeholder character generation state with persistent character reference images. These images are generated on the backend, saved inside the local project folder and used as the approved continuity reference for later scene work.

## API Contract

`POST /api/images/character`

Request:

```json
{
  "lessonId": "lesson-20260909-example",
  "characterId": "character-marta"
}
```

Response:

```json
{
  "lesson": {},
  "image": {
    "characterId": "character-marta",
    "imagePath": "/api/projects/lesson-20260909-example/assets/images/characters/lesson-20260909-example-character-marta-20260909T120000Z.png",
    "projectRelativePath": "images/characters/lesson-20260909-example-character-marta-20260909T120000Z.png",
    "imageMeta": {}
  }
}
```

Malformed `lessonId` or `characterId` values return `400`. A `characterId`
that is syntactically safe but not present in the lesson returns `404`.

`POST /api/images/character/approve`

Request:

```json
{
  "lessonId": "lesson-20260909-example",
  "characterId": "character-marta"
}
```

Response:

```json
{
  "lesson": {}
}
```

## Configuration

The backend uses `OPENAI_API_KEY` and never exposes the key to the frontend. Character images use `OPENAI_IMAGE_MODEL`, defaulting to `gpt-image-1` when the environment variable is blank.

## Prompt Rules

`server/src/prompts/characterImagePrompts.js` builds one internal image prompt from the lesson title, theme, setting, scenario, learner level, locked story sentences and the lightweight character fields:

- Name
- Role
- Age or age range
- Sex or gender
- Background or nationality
- Notes tags

The prompt asks for one friendly ESOL lesson character reference image, avoids text/captions/logos/speech bubbles, avoids extra named characters and avoids inventing precise traits from missing fields.

## Storage

Generated character images are saved under:

```text
server/data/projects/<projectId>/images/characters/
```

The stored lesson record keeps a project-relative path such as:

```text
images/characters/lesson-20260909-example-character-marta-20260909T120000Z.png
```

The frontend renders images through the safe asset route:

```text
GET /api/projects/:id/assets/images/characters/<file>.png
```

Asset serving is restricted to approved image folders and image extensions. It rejects traversal paths and does not serve lesson JSON, metadata, `.env` files or arbitrary project files.

Character image files saved as `.png` require valid decoded PNG data. Malformed
base64, empty decoded bytes and non-PNG payloads from the image provider are
rejected before any generated file is written or lesson state is updated.

## Character Metadata

Generation updates only the selected character:

```json
{
  "generationStatus": "generated",
  "generationCount": 1,
  "imagePath": "images/characters/lesson-20260909-example-character-marta-20260909T120000Z.png",
  "approved": false,
  "stale": false,
  "imageMeta": {
    "model": "gpt-image-1",
    "promptVersion": "character-image-v1",
    "generatedAt": "2026-09-09T12:00:00.000Z",
    "sourceStoryLockedAt": "2026-09-09T11:55:00.000Z",
    "fileName": "lesson-20260909-example-character-marta-20260909T120000Z.png"
  }
}
```

Existing text fields, notes and other characters are preserved.

## Approval And Regeneration

Approval requires an existing generated image path and verifies the file exists inside the project folder. Approval sets `approved: true` and `generationStatus: "approved"`.

Regeneration creates a new saved image, increments `generationCount`, clears approval and preserves the character text fields and notes. Previous files are not deleted automatically.

## Stale Behavior

Editing character identity fields or notes after image generation marks the character stale, clears approval and keeps the existing image path for audit. The tutor must regenerate and approve the character again before it is ready for downstream scenes.

## Out Of Scope

Phase 8 does not add scene planning, scene image generation, audio or video generation, ZIP export, PowerPoint generation, worksheet generation, accounts, auth, Firebase, cloud sync, reusable cross-project character libraries or external media integrations.

## Verification

Run so far:

```sh
npm run test --workspace server
npm run test --workspace frontend
npm run build --workspace frontend
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/projects
curl -s -X POST http://127.0.0.1:3001/api/images/character -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://127.0.0.1:3001/api/images/character/approve -H "Content-Type: application/json" -d '{}'
rg "Character id is malformed|isSafeRecordId|safeRecordIdPattern|pngSignature|usable PNG|decodeImageData" server/src server/test docs
```
