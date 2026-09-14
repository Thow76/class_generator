# Phase 5 Story Generation

Phase 5 replaces the local placeholder story path with backend-only OpenAI story
generation. The frontend sends a saved lesson id to the backend, and the backend
loads the canonical `lesson.json`, validates Setup, generates structured JSON,
validates the model output, then persists the updated lesson.

## Environment

Copy `.env.example` to `.env` for local development and set:

```text
OPENAI_API_KEY=
OPENAI_STORY_MODEL=
```

`OPENAI_API_KEY` is required only when calling `POST /api/story/generate`.
Health checks and project save/open routes still work without it.

`OPENAI_STORY_MODEL` is optional. When omitted, the backend uses
`gpt-5-mini`.

`.env` is ignored by Git. The API key is read only by backend code in
`server/src/services/openaiClient.js` and is never sent to the frontend.

## Route

```http
POST /api/story/generate
Content-Type: application/json

{
  "lessonId": "lesson-20260905-abc123"
}
```

Successful response:

```json
{
  "lesson": {}
}
```

The returned lesson is the full saved lesson after generation.

Error responses are JSON and do not expose prompts or secrets:

```json
{
  "error": "Setup is incomplete.",
  "details": [
    {
      "field": "scenario",
      "message": "Describe the main situation."
    }
  ]
}
```

## Validation

The backend validates the full lesson shape and Setup readiness before calling
OpenAI. Required Setup fields are:

```text
theme
learnerLevel
setting
scenario
sentenceCount
setup.mainCharacter.name
setup.mainCharacter.age
setup.mainCharacter.sex
setup.mainCharacter.background
```

Generated output must be structured JSON with this minimum shape:

```json
{
  "sentences": [
    {
      "text": "Marta goes to the shop."
    }
  ]
}
```

The backend rejects responses with the wrong sentence count, empty text,
embedded numbering, Markdown bullets, blank lines, duplicate sentences, external
proficiency labels, or unsupported fields. Invalid model output does not replace
the existing story.

## Prompting

Prompts live in `server/src/prompts/storyPrompts.js` and are versioned with:

```text
story-generate-v1
```

The prompt includes the approved internal learner level rules for:

```text
Literacies Plus
Complete Beginner
Beginner 1
Beginner 1.5
Beginner 2
```

The frontend does not contain story prompt text and does not import the OpenAI
SDK.

## Metadata

Generated sentence records are saved to `lesson.story.sentences`:

```json
{
  "id": "sentence-1",
  "number": 1,
  "text": "Marta goes to the shop.",
  "stale": false,
  "source": "generated",
  "updatedAt": "2026-09-05T12:00:00.000Z"
}
```

`lesson.story.sentences` array order is the authoritative story sequence.
Sentence `id` values are stable identity for downstream references. The
`number` field is display metadata only and is recalculated from array position
during frontend and backend normalization.

The story is saved as an editable draft:

```json
{
  "status": "draft",
  "lockedAt": null,
  "modifiedAfterLock": false,
  "lastGeneratedAt": "2026-09-05T12:00:00.000Z",
  "generationMeta": {
    "model": "gpt-5-mini",
    "promptVersion": "story-generate-v1",
    "schemaVersion": "story-sentences-v1",
    "level": "Literacies Plus",
    "sentenceCount": 9
  }
}
```

If generation succeeds, the updated lesson is written to local `lesson.json`.
If generation or validation fails, the current story remains unchanged.

## Frontend Flow

The Setup stage validates locally first. When valid, the app saves the current
lesson, calls `POST /api/story/generate` with the saved lesson id, disables the
Generate Story button while the request is running, and navigates to Story on
success. Backend errors are shown on Setup and do not clear the current lesson.

## Out Of Scope

Phase 5 does not add sentence-level regenerate, sentence-level shorten,
whole-story regenerate warnings, character extraction, scene planning, image
generation, media generation, ZIP export, PowerPoint or worksheet generation,
accounts, Firebase, or cloud sync.
