import assert from "node:assert/strict";
import test from "node:test";

import { approveSceneImage, generateSceneImage } from "../src/api/images.js";
import { createEmptyLesson } from "../src/data/createLesson.js";
import { patchScene } from "../src/utils/lessonUpdates.js";
import { getMediaItems, getProjectAssetUrl } from "../src/utils/lessonSelectors.js";
import { normalizeLessonForClient } from "../src/utils/normalizeLesson.js";
import { validateLessonShape } from "../src/utils/validateLessonShape.js";

function lessonWithScene(overrides = {}) {
  return createEmptyLesson({
    id: "lesson-current",
    story: {
      status: "locked",
      lockedAt: "2026-09-10T11:50:00.000Z",
      sentences: [{ id: "sentence-1", number: 1, text: "Marta goes to class." }],
      lockedSentences: [
        { id: "sentence-1", number: 1, text: "Marta goes to class." }
      ]
    },
    characters: [
      {
        id: "character-marta",
        name: "Marta",
        role: "main",
        age: "34",
        sex: "Woman",
        background: "Polish",
        appearanceDescription: "",
        notes: ["clear face"],
        imageStyle: "illustration",
        generationStatus: "approved",
        generationCount: 1,
        imagePath: "images/characters/marta.png",
        approved: true,
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-1"],
        location: "Classroom",
        description: "Marta sits at a classroom table.",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false,
        ...overrides
      }
    ]
  });
}

test("generateSceneImage calls backend image API", async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    requests.push({ path, options });
    return responseJson({
      lesson: lessonWithScene({
        generationStatus: "generated",
        generationCount: 1,
        imagePath: "images/scenes/scene-1.png"
      }),
      image: {
        sceneId: "scene-1",
        projectRelativePath: "images/scenes/scene-1.png"
      }
    });
  };

  try {
    const result = await generateSceneImage("lesson-current", "scene-1");
    assert.equal(requests[0].path, "/api/images/scene");
    assert.equal(requests[0].options.method, "POST");
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      lessonId: "lesson-current",
      sceneId: "scene-1"
    });
    assert.equal(result.lesson.scenes[0].imagePath, "images/scenes/scene-1.png");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("approveSceneImage parses backend errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    responseJson(
      {
        error: "Generate an image before approving this scene.",
        details: [
          {
            field: "scenes.imagePath",
            message: "Generate an image before approving this scene."
          }
        ]
      },
      422
    );

  try {
    await assert.rejects(
      () => approveSceneImage("lesson-current", "scene-1"),
      /scenes.imagePath/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("scene image paths become renderable asset URLs and derived media items", () => {
  const lesson = lessonWithScene({
    generationStatus: "generated",
    imagePath: "images/scenes/scene-1.png"
  });

  assert.equal(
    getProjectAssetUrl("lesson-current", "images/scenes/scene-1.png"),
    "/api/projects/lesson-current/assets/images/scenes/scene-1.png"
  );
  assert.equal(
    getMediaItems(lesson).find((item) => item.id === "scene-1").imagePath,
    "images/scenes/scene-1.png"
  );
});

test("editing generated scene details clears approval and keeps image", () => {
  const lesson = lessonWithScene({
    generationStatus: "approved",
    generationCount: 2,
    imagePath: "images/scenes/scene-1.png",
    approved: true,
    stale: false
  });

  const edited = patchScene(lesson, "scene-1", {
    description: "Marta speaks with a teacher at the classroom table."
  });

  assert.equal(edited.scenes[0].imagePath, "images/scenes/scene-1.png");
  assert.equal(edited.scenes[0].generationStatus, "generated");
  assert.equal(edited.scenes[0].approved, false);
  assert.equal(edited.scenes[0].stale, true);
});

test("editing generated scene visual direction marks the scene image stale", () => {
  const lesson = lessonWithScene({
    generationStatus: "approved",
    generationCount: 2,
    imagePath: "images/scenes/scene-1.png",
    approved: true,
    stale: false
  });

  const edited = patchScene(lesson, "scene-1", {
    visualDirection: "Marta holds her notebook and looks toward the classroom door."
  });

  assert.equal(
    edited.scenes[0].visualDirection,
    "Marta holds her notebook and looks toward the classroom door."
  );
  assert.equal(edited.scenes[0].imagePath, "images/scenes/scene-1.png");
  assert.equal(edited.scenes[0].generationStatus, "generated");
  assert.equal(edited.scenes[0].approved, false);
  assert.equal(edited.scenes[0].stale, true);
});

test("legacy scenes normalize with empty visual direction and validate cleanly", () => {
  const lesson = lessonWithScene();
  delete lesson.scenes[0].visualDirection;

  const normalized = normalizeLessonForClient(lesson);

  assert.equal(normalized.scenes[0].visualDirection, "");
  assert.deepEqual(validateLessonShape(normalized), []);
});

test("scene visual direction normalizes to the client maximum", () => {
  const normalized = normalizeLessonForClient(
    lessonWithScene({
      visualDirection: "  Marta   waits  near  the  board.  "
    })
  );
  const longNormalized = normalizeLessonForClient(
    lessonWithScene({
      visualDirection: "x".repeat(900)
    })
  );
  const invalid = lessonWithScene({
    visualDirection: "x".repeat(801)
  });

  assert.equal(normalized.scenes[0].visualDirection, "Marta waits near the board.");
  assert.equal(longNormalized.scenes[0].visualDirection.length, 800);
  assert.deepEqual(validateLessonShape(invalid), [
    "scene-1 visualDirection is too long."
  ]);
});

test("legacy generated scene placeholders normalize back to needing generation", () => {
  const normalized = normalizeLessonForClient(
    lessonWithScene({
      generationStatus: "generated",
      approved: true,
      imagePath: null,
      imageMeta: {
        model: "test-image-model",
        promptVersion: "scene-image-v1"
      }
    })
  );

  assert.equal(normalized.scenes[0].generationStatus, "not_started");
  assert.equal(normalized.scenes[0].approved, false);
  assert.equal(normalized.scenes[0].stale, true);
  assert.deepEqual(validateLessonShape(normalized), []);
});

function responseJson(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}
