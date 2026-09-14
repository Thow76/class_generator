# Phase 10: Scene Images

Phase 10 turns planned scene records into persistent scene image assets.

## Scope

- Scene images are generated only from saved projects.
- The locked story snapshot remains the source of story text.
- Planned scene records remain the source of sentence coverage, location, description, characters and image mode.
- Approved character reference images are required before scene image generation.
- Generated files are stored under each project in `images/scenes/`.
- Lesson JSON stores project-relative image paths and bounded serializable metadata.
- The Media stage continues to derive scene media from scene records.

## Backend

Scene image endpoints live on the existing image router:

- `POST /api/images/scene`
- `POST /api/images/scene/approve`

`sceneImageService` validates the saved lesson, locked snapshot, target scene and approved character references before generation. `sceneImagePrompts` builds the internal prompt from lesson context, locked covered sentences, planned scene fields and character reference metadata. Scene image files are saved through the shared image storage service.

Reuse-mode scenes copy the source scene image path and metadata without calling the image provider. Approval verifies that the generated image file still exists before marking the scene approved.

## Frontend

The Scenes stage now calls the backend for scene generation and approval. Per-scene operation state shows loading and error messages, and manual scene edits remain available when no scene operation is running.

Generated scene images are displayed with proportional fit in both the Scenes stage and the derived Media stage. Editing generated scene fields keeps the image path for review, clears approval and marks the scene stale.
