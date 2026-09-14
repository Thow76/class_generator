import assert from "node:assert/strict";
import test from "node:test";

import { getMediaReadiness } from "../src/api/media.js";
import { createEmptyLesson } from "../src/data/createLesson.js";
import { patchScene, updateMediaFilter } from "../src/utils/lessonUpdates.js";
import {
  getCompletedStages,
  getMediaSummaryFromItems,
  getRequiredMediaItems,
  isMediaReady
} from "../src/utils/lessonSelectors.js";
import { normalizeLessonForClient } from "../src/utils/normalizeLesson.js";

function readyLesson(overrides = {}) {
  return createEmptyLesson({
    id: "lesson-current",
    title: "Appointment help",
    theme: "Everyday services",
    learnerLevel: "Literacies Plus",
    setting: "Clinic",
    scenario: "Marta asks for an appointment.",
    sentenceCount: 6,
    setup: {
      mainCharacter: {
        name: "Marta",
        age: "34",
        sex: "Woman",
        background: "Polish"
      },
      secondaryCharacters: [],
      targetVocabulary: "appointment",
      additionalNotes: ""
    },
    story: {
      status: "locked",
      lockedAt: "2026-09-10T11:50:00.000Z",
      sentences: [{ id: "sentence-1", number: 1, text: "Marta waits." }],
      lockedSentences: [{ id: "sentence-1", number: 1, text: "Marta waits." }],
      modifiedAfterLock: false
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
        location: "Clinic waiting room",
        description: "Marta sits in the waiting room.",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "approved",
        generationCount: 1,
        imagePath: "images/scenes/scene-1.png",
        approved: true,
        stale: false
      }
    ],
    currentStage: "media",
    ...overrides
  });
}

test("getMediaReadiness calls backend readiness API", async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    requests.push({ path, options });
    return responseJson({
      ready: true,
      summary: {
        total: 0,
        approved: 0,
        generated: 0,
        missing: 0,
        stale: 0,
        fileMissing: 0
      },
      items: [],
      blockers: []
    });
  };

  try {
    await getMediaReadiness("lesson-current");
    assert.equal(requests[0].path, "/api/media/readiness");
    assert.equal(requests[0].options.method, "POST");
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      lessonId: "lesson-current"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getMediaReadiness parses backend errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    responseJson(
      {
        error: "Lesson shape is invalid.",
        details: [
          { path: "story.status", message: "Story status must be draft or locked." }
        ]
      },
      422
    );

  try {
    await assert.rejects(
      () => getMediaReadiness("lesson-current"),
      /story.status: Story status must be draft or locked./
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("derived media items include characters and scenes with image paths", () => {
  const items = getRequiredMediaItems(readyLesson());

  assert.equal(items.length, 2);
  assert.equal(
    items.find((item) => item.id === "character-marta").imagePath,
    "images/characters/marta.png"
  );
  assert.equal(
    items.find((item) => item.id === "scene-1").imagePath,
    "images/scenes/scene-1.png"
  );
});

test("media summary counts approved, generated, missing, stale and file-missing items", () => {
  assert.deepEqual(
    getMediaSummaryFromItems([
      { status: "approved" },
      { status: "generated" },
      { status: "missing" },
      { status: "stale" },
      { status: "file_missing" }
    ]),
    {
      total: 5,
      approved: 1,
      generated: 1,
      missing: 1,
      stale: 1,
      fileMissing: 1
    }
  );
});

test("isMediaReady requires verified backend readiness", () => {
  assert.equal(isMediaReady(readyLesson()), false);
  assert.equal(isMediaReady(readyLesson(), null), false);
  assert.equal(isMediaReady(readyLesson(), { ready: false }), false);
  assert.equal(isMediaReady(readyLesson(), { ready: true }), true);
});

test("isMediaReady respects backend file-missing readiness", () => {
  assert.equal(
    isMediaReady(readyLesson(), {
      ready: false,
      summary: {
        total: 2,
        approved: 1,
        generated: 0,
        missing: 0,
        stale: 0,
        fileMissing: 1
      },
      items: [
        { id: "character-marta", status: "approved", blocking: false },
        { id: "scene-1", status: "file_missing", blocking: true }
      ],
      blockers: [
        {
          id: "scene-1",
          kind: "Scenes",
          message: "The approved scene image file is missing."
        }
      ]
    }),
    false
  );
});

test("isMediaReady ignores frontend-only media completeness", () => {
  const clientCompleteLesson = readyLesson();

  assert.equal(clientCompleteLesson.characters[0].approved, true);
  assert.equal(clientCompleteLesson.scenes[0].approved, true);
  assert.equal(isMediaReady(clientCompleteLesson), false);
});

test("completed stages require successful backend media readiness", () => {
  const generatedOnly = readyLesson({
    characters: [
      {
        ...readyLesson().characters[0],
        generationStatus: "generated",
        approved: false
      }
    ],
    scenes: []
  });
  assert.equal(getCompletedStages(generatedOnly).includes("media"), false);
  assert.equal(getCompletedStages(generatedOnly).includes("export"), false);

  const frontendOnly = getCompletedStages(readyLesson());
  assert.equal(frontendOnly.includes("media"), false);
  assert.equal(frontendOnly.includes("export"), false);

  const backendBlocked = getCompletedStages(readyLesson(), { ready: false });
  assert.equal(backendBlocked.includes("media"), false);
  assert.equal(backendBlocked.includes("export"), false);

  const fileMissing = getCompletedStages(readyLesson(), {
    ready: false,
    summary: {
      total: 2,
      approved: 1,
      generated: 0,
      missing: 0,
      stale: 0,
      fileMissing: 1
    },
    items: [
      { id: "character-marta", status: "approved", blocking: false },
      { id: "scene-1", status: "file_missing", blocking: true }
    ],
    blockers: [
      {
        id: "scene-1",
        kind: "Scenes",
        message: "The approved scene image file is missing."
      }
    ]
  });
  assert.equal(fileMissing.includes("media"), false);
  assert.equal(fileMissing.includes("export"), false);

  const backendReady = getCompletedStages(readyLesson(), { ready: true });
  assert.equal(backendReady.includes("media"), true);
  assert.equal(backendReady.includes("export"), true);
});

test("media filter updates persist through updateMediaFilter", () => {
  const updated = updateMediaFilter(readyLesson(), "Needs attention");
  assert.equal(updated.media.filter, "Needs attention");
});

test("visual direction edits block media readiness through stale scene state", () => {
  const edited = patchScene(readyLesson(), "scene-1", {
    visualDirection: "Marta holds her appointment card while waiting."
  });
  const item = getRequiredMediaItems(edited).find((mediaItem) => mediaItem.id === "scene-1");

  assert.equal(edited.scenes[0].stale, true);
  assert.equal(item.status, "stale");
  assert.equal(item.blocking, true);
  assert.deepEqual(item.messages, [
    "Regenerate and approve this stale scene image."
  ]);
});

test("normalization preserves optional media readiness metadata", () => {
  const normalized = normalizeLessonForClient(
    readyLesson({
      media: {
        filter: "Approved",
        items: [],
        stale: false,
        staleReason: null,
        staleAt: null,
        lastCheckedAt: "2026-09-10T12:00:00.000Z"
      }
    })
  );

  assert.equal(normalized.media.filter, "Approved");
  assert.equal(normalized.media.lastCheckedAt, "2026-09-10T12:00:00.000Z");
});

function responseJson(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}
