import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-projects-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;

const store = await import("../src/services/projectStore.js");

function validLessonPatch() {
  return {
    title: "Saved lesson",
    theme: "Everyday services",
    learnerLevel: "Literacies Plus",
    story: {
      status: "draft",
      sentences: [
        {
          id: "sentence-1",
          number: 1,
          text: "Marta asks for help.",
          stale: false
        }
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
        notes: [],
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-1"],
        location: "Reception desk",
        description: "",
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
    currentStage: "story"
  };
}

test("rejects traversal and malformed project ids", () => {
  assert.equal(store.isSafeProjectId("../x"), false);
  assert.equal(store.isSafeProjectId("lesson-%2e%2e-x"), false);
  assert.equal(store.isSafeProjectId("lesson-safe_id-123"), true);
});

test("creates, lists, reads and updates a project", async () => {
  const project = await store.createProject(validLessonPatch());
  assert.match(project.id, /^lesson-/);
  assert.equal(project.lesson.id, project.id);

  const projects = await store.listProjects();
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, project.id);
  assert.equal(projects[0].title, "Saved lesson");

  const loaded = await store.getProject(project.id);
  assert.equal(loaded.title, "Saved lesson");
  assert.equal(loaded.currentStage, "story");

  const updated = await store.updateProject(project.id, {
    ...loaded,
    title: "Updated lesson"
  });
  assert.equal(updated.id, project.id);
  assert.equal(updated.title, "Updated lesson");

  const persisted = JSON.parse(
    await fs.readFile(path.join(tempProjectsDir, project.id, "lesson.json"), "utf8")
  );
  assert.equal(persisted.title, "Updated lesson");
});

test("save and open preserve sentence array order while recalculating numbers", async () => {
  const project = await store.createProject({
    ...validLessonPatch(),
    story: {
      status: "draft",
      sentences: [
        {
          id: "sentence-3",
          number: 3,
          text: "This should stay first.",
          stale: false
        },
        {
          id: "sentence-1",
          number: 1,
          text: "This should stay second.",
          stale: false
        }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-3", "sentence-1"],
        location: "Reception desk",
        description: "",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false
      }
    ]
  });

  const loaded = await store.getProject(project.id);

  assert.deepEqual(
    loaded.story.sentences.map(({ id, number, text }) => ({
      id,
      number,
      text
    })),
    [
      { id: "sentence-3", number: 1, text: "This should stay first." },
      { id: "sentence-1", number: 2, text: "This should stay second." }
    ]
  );
  assert.deepEqual(loaded.scenes[0].sentenceIds, ["sentence-3", "sentence-1"]);
});

test("save and open preserve deleted sentences, cleaned references, and stale state", async () => {
  const project = await store.createProject({
    ...validLessonPatch(),
    sentenceCount: 6,
    story: {
      status: "draft",
      modifiedAfterLock: true,
      sentences: [
        {
          id: "sentence-2",
          number: 7,
          text: "Marta asks for help.",
          stale: false
        },
        {
          id: "sentence-3",
          number: 2,
          text: "The receptionist answers.",
          stale: false
        }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-2"],
        location: "Reception desk",
        description: "",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: "images/scenes/scene-1.png",
        approved: false,
        stale: true
      },
      {
        id: "scene-2",
        number: 2,
        label: "Scene 2",
        sentenceIds: [],
        location: "Waiting area",
        description: "",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: true
      }
    ]
  });

  const loaded = await store.getProject(project.id);

  assert.deepEqual(
    loaded.story.sentences.map(({ id, number, text }) => ({ id, number, text })),
    [
      { id: "sentence-2", number: 1, text: "Marta asks for help." },
      { id: "sentence-3", number: 2, text: "The receptionist answers." }
    ]
  );
  assert.equal(loaded.story.modifiedAfterLock, true);
  assert.deepEqual(
    loaded.scenes.map(({ id, sentenceIds, stale }) => ({ id, sentenceIds, stale })),
    [
      { id: "scene-1", sentenceIds: ["sentence-2"], stale: true },
      { id: "scene-2", sentenceIds: [], stale: true }
    ]
  );
});

test("save and open preserve added manual sentence ids, text, and order", async () => {
  const project = await store.createProject({
    ...validLessonPatch(),
    sentenceCount: 6,
    story: {
      status: "draft",
      sentences: [
        {
          id: "sentence-2",
          number: 4,
          text: "Marta asks for help.",
          stale: false,
          source: "generated",
          updatedAt: "2026-09-05T08:00:00.000Z"
        },
        {
          id: "sentence-9",
          number: 2,
          text: "The receptionist answers.",
          stale: false,
          source: "generated",
          updatedAt: "2026-09-05T08:00:00.000Z"
        },
        {
          id: "sentence-10",
          number: 3,
          text: "Marta gives her date of birth.",
          stale: false,
          source: "manual",
          updatedAt: "2026-09-05T12:00:00.000Z"
        }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-2", "sentence-9"],
        location: "Reception desk",
        description: "",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false
      }
    ]
  });

  const loaded = await store.getProject(project.id);

  assert.deepEqual(
    loaded.story.sentences.map(({ id, number, text, source, updatedAt }) => ({
      id,
      number,
      text,
      source,
      updatedAt
    })),
    [
      {
        id: "sentence-2",
        number: 1,
        text: "Marta asks for help.",
        source: "generated",
        updatedAt: "2026-09-05T08:00:00.000Z"
      },
      {
        id: "sentence-9",
        number: 2,
        text: "The receptionist answers.",
        source: "generated",
        updatedAt: "2026-09-05T08:00:00.000Z"
      },
      {
        id: "sentence-10",
        number: 3,
        text: "Marta gives her date of birth.",
        source: "manual",
        updatedAt: "2026-09-05T12:00:00.000Z"
      }
    ]
  );
  assert.deepEqual(loaded.scenes[0].sentenceIds, ["sentence-2", "sentence-9"]);
});

test("save and open preserve scene reference edits and approvals", async () => {
  const project = await store.createProject({
    ...validLessonPatch(),
    story: {
      status: "draft",
      sentences: [
        { id: "sentence-1", number: 1, text: "Marta asks for help." },
        { id: "sentence-3", number: 2, text: "She gives her details." },
        { id: "sentence-2", number: 3, text: "The receptionist answers." }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-1", "sentence-3"],
        location: "Reception desk",
        description: "",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "generated",
        generationCount: 2,
        imagePath: "images/scenes/scene-1.png",
        approved: false,
        stale: true
      },
      {
        id: "scene-2",
        number: 2,
        label: "Scene 2",
        sentenceIds: ["sentence-2"],
        location: "Waiting area",
        description: "",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "approved",
        generationCount: 1,
        imagePath: "images/scenes/scene-2.png",
        approved: true,
        stale: false
      }
    ]
  });

  const loaded = await store.getProject(project.id);

  assert.deepEqual(
    loaded.scenes.map(
      ({ id, sentenceIds, generationStatus, approved, stale }) => ({
        id,
        sentenceIds,
        generationStatus,
        approved,
        stale
      })
    ),
    [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1", "sentence-3"],
        generationStatus: "generated",
        approved: false,
        stale: true
      },
      {
        id: "scene-2",
        sentenceIds: ["sentence-2"],
        generationStatus: "approved",
        approved: true,
        stale: false
      }
    ]
  );
});

test("duplicates without mutating the source project", async () => {
  const project = await store.createProject(validLessonPatch());
  const duplicate = await store.duplicateProject(project.id);

  assert.notEqual(duplicate.lesson.id, project.id);
  assert.equal(duplicate.sourceProjectId, project.id);
  assert.equal(duplicate.lesson.title, "Saved lesson");

  const source = await store.getProject(project.id);
  assert.equal(source.id, project.id);
  assert.equal(source.title, "Saved lesson");
});

test("missing and invalid projects return typed errors", async () => {
  await assert.rejects(() => store.getProject("lesson-missing"), {
    statusCode: 404
  });
  await assert.rejects(() => store.getProject("../x"), {
    statusCode: 400
  });
});

test("invalid lesson shape is rejected", async () => {
  await assert.rejects(
    () =>
      store.createProject({
        ...validLessonPatch(),
        currentStage: "bad-stage"
      }),
    { statusCode: 422 }
  );

  await assert.rejects(
    () =>
      store.createProject({
        ...validLessonPatch(),
        story: {
          status: "locked",
          lockedAt: "2026-09-05T12:00:00.000Z",
          modifiedAfterLock: false,
          sentences: [
            {
              id: "sentence-1",
              number: 1,
              text: "Marta asks for help.",
              stale: false
            }
          ],
          lockedSentences: [
            {
              id: "sentence-1",
              number: 2,
              text: "Marta asks for help."
            }
          ]
        }
      }),
    { statusCode: 422 }
  );
});

test("legacy locked stories missing lockedSentences receive a derived snapshot", async () => {
  const project = await store.createProject({
    ...validLessonPatch(),
    story: {
      status: "locked",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        {
          id: "sentence-1",
          number: 9,
          text: "Marta asks for help.",
          stale: false
        }
      ]
    }
  });

  const loaded = await store.getProject(project.id);

  assert.deepEqual(loaded.story.lockedSentences, [
    {
      id: "sentence-1",
      number: 1,
      text: "Marta asks for help."
    }
  ]);
});

test("legacy locked stories with empty lockedSentences receive a derived snapshot", async () => {
  const project = await store.createProject({
    ...validLessonPatch(),
    story: {
      status: "locked",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        {
          id: "sentence-1",
          number: 1,
          text: "Marta asks for help.",
          stale: false
        }
      ],
      lockedSentences: []
    }
  });

  const loaded = await store.getProject(project.id);

  assert.deepEqual(loaded.story.lockedSentences, [
    {
      id: "sentence-1",
      number: 1,
      text: "Marta asks for help."
    }
  ]);
});

test("duplicate works for a migrated legacy locked story", async () => {
  const project = await store.createProject({
    ...validLessonPatch(),
    story: {
      status: "locked",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        {
          id: "sentence-1",
          number: 1,
          text: "Marta asks for help.",
          stale: false
        }
      ]
    }
  });

  const duplicate = await store.duplicateProject(project.id);

  assert.deepEqual(duplicate.lesson.story.lockedSentences, [
    {
      id: "sentence-1",
      number: 1,
      text: "Marta asks for help."
    }
  ]);
});

test("locked stories reject mismatched non-empty locked sentence snapshots", async () => {
  await assert.rejects(
    () =>
      store.createProject({
        ...validLessonPatch(),
        story: {
          status: "locked",
          lockedAt: "2026-09-05T12:00:00.000Z",
          modifiedAfterLock: false,
          sentences: [
            {
              id: "sentence-1",
              number: 1,
              text: "Marta asks for help.",
              stale: false
            }
          ],
          lockedSentences: [
            {
              id: "sentence-1",
              number: 1,
              text: "Different locked text."
            }
          ]
        }
      }),
    { statusCode: 422 }
  );
});
