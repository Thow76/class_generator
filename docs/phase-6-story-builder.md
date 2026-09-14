# Phase 6 Story Builder

Phase 6 completes the Story Builder surface for Milestone 2. It keeps OpenAI
prompts, schemas and API keys on the backend, and treats the locked story
snapshot as the master source for later milestones.

## Backend Routes

All routes return `{ "lesson": <updated lesson> }` on success. Backend story
operations validate model output before saving, so invalid output does not
replace the current lesson story.

```text
POST /api/story/generate
POST /api/story/regenerate
POST /api/story/regenerate-sentence
POST /api/story/shorten-sentence
POST /api/story/lock
POST /api/story/unlock
```

`/api/story/generate` accepts `{ "lessonId": "lesson-..." }` and creates a full
draft story from validated Setup data.

`/api/story/regenerate` accepts:

```json
{
  "lessonId": "lesson-...",
  "confirmedOverwrite": true
}
```

It requires explicit overwrite confirmation and replaces the sentence array only
after a complete replacement story validates.

`/api/story/regenerate-sentence` and `/api/story/shorten-sentence` accept:

```json
{
  "lessonId": "lesson-...",
  "sentenceId": "sentence-3"
}
```

Both reject locked stories, keep the selected sentence ID and number stable, and
replace only the selected sentence after validating one structured sentence.

`/api/story/lock` accepts `{ "lessonId": "lesson-..." }`.

`/api/story/unlock` accepts:

```json
{
  "lessonId": "lesson-...",
  "confirmedUnlock": true
}
```

Unlock preserves draft sentences, the previous locked snapshot and downstream
records.

## Structured Output

Whole-story generation uses schema version `story-sentences-v1`:

```json
{
  "sentences": [{ "text": "Marta goes to the clinic." }]
}
```

Sentence operations use schema version `story-sentence-operation-v1`:

```json
{
  "sentence": { "text": "Marta asks for help." }
}
```

Validators trim sentence text and reject empty text, embedded numbering,
Markdown bullets, blank lines, unsupported fields and external proficiency
labels.

## Locked Master Story

On lock, the backend writes:

```json
{
  "story": {
    "status": "locked",
    "lockedAt": "2026-09-05T12:00:00.000Z",
    "lockedSentences": [
      {
        "id": "sentence-1",
        "number": 1,
        "text": "Marta goes to the clinic."
      }
    ]
  }
}
```

`story.lockedSentences` is the exact master-story source for Milestone 3. The
Story stage renders `lockedSentences` while locked when the snapshot exists;
draft/unlocked editing uses `story.sentences`.

Legacy locked lessons saved before `lockedSentences` existed are migrated during
normalization when they still have story sentences: the snapshot is derived from
the sentence IDs, array order and exact text in `story.sentences`. Non-empty
snapshots that disagree with the sentence array are still rejected.

## Frontend Behavior

The Story UI supports:

- Per-sentence Regenerate and Shorten buttons backed by backend routes.
- Per-sentence loading and inline error messages.
- Whole-story Regenerate with an overwrite confirmation panel.
- Lock confirmation and deliberate Unlock confirmation.
- Disabled edit, add, delete, reorder, regenerate and shorten controls while
  the story is locked.

While any sentence regenerate or shorten request is in flight, the Story stage
disables all story mutation controls until the backend response is applied. This
prevents a full returned lesson from overwriting newer local story edits.
Project-level New, Open, Duplicate, Save and pending confirmation actions are
also disabled or guarded during the same in-flight sentence operation. The
sentence response is applied only when its operation token is still current and
the active project still matches the saved project used for the request, so a
stale response cannot switch the UI back to an older lesson.

Backend-backed operations save before returning success. Local draft edits,
add/delete/reorder, and setup changes use the existing project save status; the
sidebar marks the lesson unsaved until the tutor saves.

## Stale Downstream Metadata

When a story change happens after a prior lock or after downstream generated or
approved records exist, the lesson marks affected downstream data stale without
deleting it.

Generated or approved characters and scenes receive:

```json
{
  "stale": true,
  "staleReason": "Story sentence changed",
  "staleAt": "2026-09-05T12:00:00.000Z"
}
```

Project-level `media` and `export` metadata may also receive the same stale
fields when a backend story operation changes downstream validity.

## Out Of Scope

Phase 6 does not add character extraction, character images, scene planning,
scene images, audio/video source generation, ZIP export, PowerPoint generation,
worksheet generation, accounts, Firebase or cloud sync.
