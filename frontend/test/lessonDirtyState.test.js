import assert from "node:assert/strict";
import test from "node:test";

import { demoLesson } from "../src/data/demoLesson.js";
import {
  createLessonSnapshot,
  lessonsHaveUnsavedChanges
} from "../src/utils/lessonDirtyState.js";
import { normalizeLessonForClient } from "../src/utils/normalizeLesson.js";

test("a saved/restored lesson snapshot starts clean", () => {
  const snapshot = createLessonSnapshot(demoLesson);

  assert.equal(lessonsHaveUnsavedChanges(demoLesson, snapshot), false);
});

test("setup edits are dirty compared with the saved snapshot", () => {
  const snapshot = createLessonSnapshot(demoLesson);
  const edited = {
    ...demoLesson,
    theme: "Community transport"
  };

  assert.equal(lessonsHaveUnsavedChanges(edited, snapshot), true);
});

test("story edits are dirty compared with the saved snapshot", () => {
  const snapshot = createLessonSnapshot(demoLesson);
  const edited = {
    ...demoLesson,
    story: {
      ...demoLesson.story,
      sentences: demoLesson.story.sentences.map((sentence) =>
        sentence.id === "sentence-1"
          ? { ...sentence, text: "Marta phones the surgery." }
          : sentence
      )
    }
  };

  assert.equal(lessonsHaveUnsavedChanges(edited, snapshot), true);
});

test("character appearance edits are dirty compared with the saved snapshot", () => {
  const snapshot = createLessonSnapshot(demoLesson);
  const edited = {
    ...demoLesson,
    characters: demoLesson.characters.map((character) =>
      character.id === "character-marta"
        ? {
            ...character,
            appearanceDescription:
              "Woman in her mid 30s with dark hair, brown eyes and a blue coat."
          }
        : character
    )
  };

  assert.equal(lessonsHaveUnsavedChanges(edited, snapshot), true);
});

test("scene edits are dirty compared with the saved snapshot", () => {
  const snapshot = createLessonSnapshot(demoLesson);
  const edited = {
    ...demoLesson,
    scenes: demoLesson.scenes.map((scene) =>
      scene.id === "scene-1"
        ? { ...scene, description: "Marta checks in at the front desk." }
        : scene
    )
  };

  assert.equal(lessonsHaveUnsavedChanges(edited, snapshot), true);
});

test("scene visual direction edits are dirty compared with the saved snapshot", () => {
  const normalized = normalizeLessonForClient(demoLesson);
  const snapshot = createLessonSnapshot(normalized);
  const edited = {
    ...normalized,
    scenes: normalized.scenes.map((scene) =>
      scene.id === "scene-1"
        ? {
            ...scene,
            visualDirection:
              "Marta stands at the reception desk holding her phone."
          }
        : scene
    )
  };

  assert.equal(lessonsHaveUnsavedChanges(edited, snapshot), true);
});

test("normalization-equivalent lessons compare cleanly", () => {
  const normalized = normalizeLessonForClient(demoLesson);
  const snapshot = createLessonSnapshot(normalized);
  const equivalent = {
    ...normalized,
    characters: normalized.characters.map((character) =>
      character.id === "character-marta"
        ? {
            ...character,
            appearanceDescription:
              " Woman in her mid 30s with shoulder-length dark brown hair, brown eyes, light skin and an average build. "
          }
        : character
    )
  };

  assert.equal(lessonsHaveUnsavedChanges(equivalent, snapshot), false);
});

test("canonical snapshots compare cleanly when object key order differs", () => {
  const normalized = normalizeLessonForClient({
    ...demoLesson,
    characters: demoLesson.characters.map((character) =>
      character.id === "character-marta"
        ? {
            ...character,
            imagePath: "images/characters/marta.png",
            imageMeta: {
              prompt: "Reference portrait",
              model: "image-model",
              seed: 42
            }
          }
        : character
    )
  });
  const snapshot = createLessonSnapshot(normalized);
  const equivalent = {
    ...normalized,
    characters: normalized.characters.map((character) =>
      character.id === "character-marta"
        ? {
            ...character,
            imageMeta: {
              seed: 42,
              model: "image-model",
              prompt: "Reference portrait"
            }
          }
        : character
    )
  };

  assert.equal(lessonsHaveUnsavedChanges(equivalent, snapshot), false);
});

test("top-level save display metadata does not make a lesson dirty", () => {
  const normalized = normalizeLessonForClient(demoLesson);
  const snapshot = createLessonSnapshot({
    ...normalized,
    lastSavedAt: "2026-09-13T10:00:00.000Z",
    saveStatus: "saved"
  });
  const equivalent = {
    ...normalized,
    lastSavedAt: "2026-09-13T10:05:00.000Z",
    saveStatus: "unsaved"
  };

  assert.equal(lessonsHaveUnsavedChanges(equivalent, snapshot), false);
});

test("media-relevant content edits are dirty compared with the saved snapshot", () => {
  const snapshot = createLessonSnapshot(demoLesson);
  const edited = {
    ...demoLesson,
    characters: demoLesson.characters.map((character) =>
      character.id === "character-marta"
        ? {
            ...character,
            imagePath: "images/characters/marta.png",
            generationStatus: "generated",
            imageMeta: { prompt: "Reference portrait" }
          }
        : character
    )
  };

  assert.equal(lessonsHaveUnsavedChanges(edited, snapshot), true);
});

test("a meaningful lesson without a saved snapshot is treated as unsaved", () => {
  assert.equal(lessonsHaveUnsavedChanges(demoLesson, null), true);
});
