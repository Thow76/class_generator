# Phase 7 Character Extraction

Phase 7 adds backend-driven character extraction from the locked master story.

## Implemented Scope

- `POST /api/characters/extract` extracts editable character records for a saved lesson.
- Extraction requires `story.status === "locked"` and uses `story.lockedSentences`, not draft text.
- The OpenAI call, prompt and structured schema live on the backend.
- Model output is validated before save.
- Extracted records are merged with Setup main and secondary character data.
- The Setup main character is guaranteed in the final saved character list even if the model omits it.
- Setup main character name, age, sex and background remain authoritative over model guesses.
- Setup main matching is based on normalized name identity, never role alone.
- Existing unrelated `main` role records are preserved separately and may be marked stale when unmatched.
- Existing matching character IDs, tutor edits, notes, approval state and placeholder generation state are preserved.
- Existing generated or approved characters that no longer appear are retained and marked stale.
- The Characters stage now has a compact extraction action with loading, success and error states.
- Story operation error states remain visible without keeping project controls disabled.

## Locked Snapshot Requirement

General project open/save still migrates old locked lessons by deriving `story.lockedSentences` when needed, so legacy work remains openable.

Character extraction is stricter. Before using the normalized lesson, the backend checks the raw saved project file and requires an explicit, non-empty locked sentence snapshot that matches the saved story. If the raw snapshot is missing, empty or mismatched, extraction returns `422` with guidance to lock the story again before extracting characters.

Recovery path for legacy projects:

1. Open the lesson.
2. Unlock and lock the story again to create an explicit master snapshot.
3. Save the lesson.
4. Run character extraction.

## Exclusions

Phase 7 does not generate character images, scene plans, scene images, audio, video, ZIP files, PowerPoint files, worksheets, accounts, Firebase or cloud sync.

## Verification

Run:

```sh
npm run test --workspace server
npm run build --workspace frontend
```

Also run the frontend test suite when touching operation guards:

```sh
npm run test --workspace frontend
```
