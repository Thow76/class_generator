# Phase 9 Scene Planning

Phase 9 converts the locked master story into editable scene records. It creates a reviewable visual structure only; later phases can build from these records.

## API Contract

`POST /api/scenes/plan`

Request:

```json
{
  "lessonId": "lesson-20260909-example"
}
```

Success response:

```json
{
  "lesson": {
    "id": "lesson-20260909-example",
    "scenes": []
  }
}
```

The response returns the full saved lesson, matching the story and character operation pattern.

## Prerequisites

Scene planning requires:

- A saved lesson id.
- `story.status` set to `locked`.
- A non-empty `story.lockedSentences` snapshot that matches the persisted story.
- Extracted required character records.
- Required character records with `approved: true`, `generationStatus: "approved"`, a non-empty `imagePath`, and `stale: false`.

The backend uses `story.lockedSentences` as the planning source. Draft text is not used.

## Structured Output

The model returns:

```json
{
  "scenes": [
    {
      "label": "Scene 1",
      "sentenceIds": ["sentence-1", "sentence-2"],
      "location": "Clinic reception desk",
      "description": "Marta speaks to the receptionist at the desk.",
      "characterIds": ["character-marta", "character-receptionist"],
      "imageMode": "generate",
      "reuseSceneId": null
    }
  ]
}
```

Only fields that map to the existing scene record are accepted.

## Validation Rules

The scene plan is rejected before save if it:

- Omits the `scenes` array.
- Returns no scenes for a non-empty locked story.
- Uses unknown sentence ids.
- Leaves a locked story sentence uncovered.
- Covers a sentence more than once.
- Places scenes out of story order.
- Uses unknown, stale, or unapproved character ids.
- Provides empty labels, locations, or descriptions.
- Adds fields reserved for later media phases.
- Adds unsupported external learner labels.
- Exceeds bounded text lengths.

Accepted scene fields are trimmed and sentence ids are sorted by locked story order.

## Merge Rules

Planning merges into `lesson.scenes`.

- Existing scenes are matched first by exact sentence coverage.
- If no exact match exists, a scene may match by first sentence id plus overlap.
- Scenes never match by label alone.
- Matched scenes keep their stable id.
- New scenes receive safe ids such as `scene-1`.
- Generated or approved matched scenes keep their existing generated state for review.
- Generated or approved matched scenes are marked stale if coverage, characters, location, or description no longer match.
- Generated or approved unmatched scenes are preserved and marked stale.
- Ungenerated unmatched scenes may be replaced by the new plan.

## Editing After Planning

Tutors can continue to edit scene location, description, image setting, and sentence coverage. Removing or adding sentence coverage on generated or approved scene records marks that scene stale. The unassigned sentence list still reflects manual coverage changes.

## Metadata

When planning succeeds, `scenesMeta` stores:

- `lastPlannedAt`
- `model`
- `promptVersion`
- `schemaVersion`
- `sourceStoryLockedAt`
- `sourceCharacterApprovalState`

Normalization and validation preserve this metadata during save, open, and duplicate flows.

## Verification

Automated checks added:

- `server/test/scenePlanning.test.js`
- `frontend/test/scenePlanning.test.js`

Manual checks should confirm the Scenes stage enables planning only after the story is locked and required character references are approved, shows loading/error/success states, preserves existing scene work during replanning, and keeps sentence coverage editing usable.
