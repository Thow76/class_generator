# Phase I: Scene Visual Direction

Phase I adds `visualDirection` to scene records as an optional, scene-specific text field for temporary image guidance. Normalization backfills missing legacy values to `""` and bounds saved text to 800 characters.

The Scenes stage now shows a `Visual direction` textarea near the scene description. It is for temporary clothing, pose, expression, props, character placement, composition and visible scene details. It is not a stable character identity field.

Editing `visualDirection` uses the existing scene update path. If the scene already has generated or approved image work, the edit clears approval and marks the scene image stale without deleting the existing image path.

Scene image prompts are now `scene-image-v3`. They include the target scene's visual direction when present, while keeping approved character reference images and `appearanceDescription` as the source of stable character identity. Visual direction is not copied into character records, and scene planning leaves the field blank unless a tutor edits it.

Out of scope remains unchanged: no autosave, draft recovery, export packaging, ZIP/PowerPoint/worksheet generation, cloud sync, auth or backend storage redesign.
