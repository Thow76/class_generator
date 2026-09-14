import assert from "node:assert/strict";
import test from "node:test";

import { planScenes } from "../src/api/scenes.js";
import { createEmptyLesson } from "../src/data/createLesson.js";
import {
  addSceneSentenceReference,
  patchScene,
  removeSceneSentenceReference
} from "../src/utils/lessonUpdates.js";
import {
  areRequiredCharactersApproved,
  getSceneSentenceRecords,
  getUnassignedStorySentences
} from "../src/utils/lessonSelectors.js";
import { normalizeLessonForClient } from "../src/utils/normalizeLesson.js";
import { validateLessonShape } from "../src/utils/validateLessonShape.js";

function lessonWithScenes(overrides = {}) {
  return createEmptyLesson({
    id: "lesson-current",
    story: {
      status: "locked",
      lockedAt: "2026-09-09T11:55:00.000Z",
      sentences: [
        { id: "sentence-1", number: 1, text: "Marta goes to the clinic." },
        { id: "sentence-2", number: 2, text: "She speaks to the receptionist." }
      ],
      lockedSentences: [
        { id: "sentence-1", number: 1, text: "Marta goes to the clinic." },
        { id: "sentence-2", number: 2, text: "She speaks to the receptionist." }
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
        notes: [],
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
        location: "Clinic entrance",
        description: "Marta arrives at the clinic.",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false
      }
    ],
    ...overrides
  });
}

test("planScenes calls backend scene planning API", async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    requests.push({ path, options });
    return responseJson({
      lesson: lessonWithScenes({
        scenes: [
          {
            ...lessonWithScenes().scenes[0],
            sentenceIds: ["sentence-1", "sentence-2"],
            location: "Clinic reception desk"
          }
        ]
      })
    });
  };

  try {
    const result = await planScenes("lesson-current");
    assert.equal(requests[0].path, "/api/scenes/plan");
    assert.equal(requests[0].options.method, "POST");
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      lessonId: "lesson-current"
    });
    assert.equal(result.scenes[0].location, "Clinic reception desk");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("planScenes parses backend scene errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    responseJson(
      {
        error: "Approve character references before scene planning.",
        details: [
          {
            field: "characters.character-marta.imagePath",
            message: "Approve character references before scene planning."
          }
        ]
      },
      422
    );

  try {
    await assert.rejects(
      () => planScenes("lesson-current"),
      /characters.character-marta.imagePath/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("scene planning readiness requires approved generation status", () => {
  assert.equal(areRequiredCharactersApproved(lessonWithScenes()), true);
  assert.equal(
    areRequiredCharactersApproved(
      lessonWithScenes({
        characters: [
          {
            ...lessonWithScenes().characters[0],
            generationStatus: "generated",
            approved: true
          }
        ]
      })
    ),
    false
  );
});

test("scene coverage selectors still reflect manual edits after planning", () => {
  const lesson = lessonWithScenes();
  const added = addSceneSentenceReference(lesson, "scene-1", "sentence-2");
  const covered = getSceneSentenceRecords(added, added.scenes[0]);
  assert.deepEqual(
    covered.map((sentence) => sentence.id),
    ["sentence-1", "sentence-2"]
  );
  assert.equal(getUnassignedStorySentences(added).length, 0);

  const removed = removeSceneSentenceReference(added, "scene-1", "sentence-1");
  assert.deepEqual(removed.scenes[0].sentenceIds, ["sentence-2"]);
  assert.equal(getUnassignedStorySentences(removed)[0].id, "sentence-1");
});

test("editing generated scene details marks it stale without clearing image", () => {
  const lesson = lessonWithScenes({
    scenes: [
      {
        ...lessonWithScenes().scenes[0],
        generationStatus: "approved",
        generationCount: 2,
        imagePath: "images/scenes/scene-1.png",
        approved: true,
        stale: false
      }
    ]
  });

  const edited = patchScene(lesson, "scene-1", {
    description: "Marta waits near the clinic entrance."
  });

  assert.equal(edited.scenes[0].imagePath, "images/scenes/scene-1.png");
  assert.equal(edited.scenes[0].generationStatus, "generated");
  assert.equal(edited.scenes[0].approved, false);
  assert.equal(edited.scenes[0].stale, true);
  assert.equal(
    edited.scenes[0].staleReason,
    "Scene details changed after image generation."
  );
});

test("scene metadata survives normalize and validation", () => {
  const normalized = normalizeLessonForClient(
    lessonWithScenes({
      scenesMeta: {
        lastPlannedAt: "2026-09-09T12:00:00.000Z",
        model: "test-model",
        promptVersion: "scene-plan-v1",
        schemaVersion: "scene-plan-v1",
        sourceStoryLockedAt: "2026-09-09T11:55:00.000Z"
      }
    })
  );

  assert.equal(normalized.scenesMeta.model, "test-model");
  assert.deepEqual(validateLessonShape(normalized), []);
});

function responseJson(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}
