# Phase 11: Media Readiness

Phase 11 turns the Media stage into the final visual-media review before export. It does not create export files.

## Readiness Definition

Media is ready only when:

- The story is locked.
- Required character records exist.
- Every required character has an approved, non-stale, file-backed image.
- Scene records exist.
- Every locked story sentence is assigned to at least one scene.
- Every planned scene has sentence coverage, location, description, valid character references, and an approved, non-stale, file-backed image.
- Lesson-level media and export stale flags are clear.

Current product behavior treats every character record with a supported role and every current scene record as required for readiness.

## Backend API

`POST /api/media/readiness`

Request:

```json
{
  "lessonId": "lesson-20260910-example"
}
```

Success:

```json
{
  "ready": false,
  "summary": {
    "total": 2,
    "approved": 1,
    "generated": 0,
    "missing": 1,
    "stale": 0,
    "fileMissing": 0
  },
  "items": [],
  "blockers": []
}
```

Errors:

- `400` for missing or malformed `lessonId`.
- `404` for a missing project.
- `422` for an invalid saved lesson shape.
- `500` for unexpected server errors.

Error responses are JSON and must not expose absolute filesystem paths.

## File Checks

The backend derives readiness from saved character and scene records, then checks each `imagePath` with local project asset helpers. Missing or malformed item files do not crash the readiness check. They become item statuses:

- `approved`
- `generated`
- `missing`
- `stale`
- `file_missing`
- `invalid`

## Frontend Behavior

The Media stage shows:

- Ready or Needs attention state.
- Counts for approved, generated, missing, stale, and file-missing items.
- Filters for All, Needs attention, Characters, Scenes, and Approved.
- One media card per required character or scene.
- Existing image previews.
- Status, stale, and file-missing badges.
- Guidance back to Characters or Scenes for fixes.
- A Refresh action that asks the backend to verify local files.

The frontend may derive instant readiness from lesson records, but backend readiness is authoritative for file existence.

## Stage Rules

The Media stage is complete only when all required media is approved and non-stale. When backend readiness is available, it also gates completion on local file existence.

The Export stage reports media readiness and blockers. Its export action remains placeholder-only in Phase 11 and writes no files.

## Out Of Scope

Phase 11 does not add ZIP export, PowerPoint generation, worksheet generation, audio or video generation, accounts, auth, cloud sync, remote storage, share links, hosted publishing, or external media integrations.

## Verification Checklist

- Run server and frontend tests.
- Build the frontend.
- Confirm `/api/media/readiness` returns JSON for valid and invalid requests.
- Confirm file-missing items are visible without absolute paths.
- Confirm generated, stale, missing, and approved media show distinct states.
- Confirm Export remains a readiness summary and creates no files.
