import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-media-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;
delete process.env.OPENAI_API_KEY;

const store = await import("../src/services/projectStore.js");
const {
  buildMediaReadiness,
  getMediaReadinessForProject
} = await import("../src/services/mediaReadinessService.js");

function lockedLessonPatch(overrides = {}) {
  const sentences = [
    "Marta walks to the clinic.",
    "She speaks to the receptionist."
  ].map((text, index) => ({
    id: `sentence-${index + 1}`,
    number: index + 1,
    text,
    stale: false
  }));

  return {
    title: "Appointment help",
    theme: "Everyday services",
    learnerLevel: "Literacies Plus",
    setting: "A local clinic",
    scenario: "Marta asks for an appointment at reception.",
    sentenceCount: 6,
    setup: {
      mainCharacter: {
        name: "Marta",
        age: "34",
        sex: "Woman",
        background: "Polish"
      },
      secondaryCharacters: ["Receptionist"],
      targetVocabulary: "appointment, today, tomorrow",
      additionalNotes: "Keep the story calm."
    },
    story: {
      status: "locked",
      lockedAt: "2026-09-10T11:50:00.000Z",
      lockedSentences: sentences.map(({ id, number, text }) => ({
        id,
        number,
        text
      })),
      modifiedAfterLock: false,
      sentences
    },
    characters: [
      {
        id: "character-marta",
        name: "Marta",
        role: "main",
        age: "34",
        sex: "Woman",
        background: "Polish",
        notes: ["clear face"],
        imageStyle: "illustration",
        generationStatus: "approved",
        generationCount: 1,
        imagePath: "images/characters/marta.png",
        approved: true,
        stale: false
      },
      {
        id: "character-receptionist",
        name: "Receptionist",
        role: "secondary",
        age: "",
        sex: "Unspecified",
        background: "",
        notes: ["clinic desk"],
        imageStyle: "illustration",
        generationStatus: "approved",
        generationCount: 1,
        imagePath: "images/characters/receptionist.png",
        approved: true,
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-1", "sentence-2"],
        location: "Clinic reception desk",
        description: "Marta speaks with the receptionist at the desk.",
        characterIds: ["character-marta", "character-receptionist"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "approved",
        generationCount: 1,
        imagePath: "images/scenes/scene-1.png",
        approved: true,
        stale: false
      }
    ],
    reusable: {
      backgrounds: ["Clinic"],
      noteTags: ["clear face"]
    },
    currentStage: "media",
    ...overrides
  };
}

async function createProjectWithAssets(patch = lockedLessonPatch()) {
  const project = await store.createProject(patch);
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "characters", "marta.png"),
    "image"
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "characters", "receptionist.png"),
    "image"
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "scenes", "scene-1.png"),
    "image"
  );
  return project;
}

async function mutatePersistedLesson(projectId, mutate) {
  const lessonPath = path.join(tempProjectsDir, projectId, "lesson.json");
  const lesson = JSON.parse(await fs.readFile(lessonPath, "utf8"));
  mutate(lesson);
  await fs.writeFile(lessonPath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
}

test("media readiness validates lessonId", async () => {
  await assert.rejects(
    () => getMediaReadinessForProject(),
    (error) =>
      error.statusCode === 400 &&
      error.message === "Request body must include lessonId."
  );
  await assert.rejects(
    () => getMediaReadinessForProject("../bad"),
    (error) =>
      error.statusCode === 400 && error.message === "Project id is malformed."
  );
});

test("media readiness reports missing project and invalid lesson shape", async () => {
  const project = await createProjectWithAssets();
  await mutatePersistedLesson(project.id, (lesson) => {
    lesson.currentStage = "bad-stage";
  });

  await assert.rejects(
    () => getMediaReadinessForProject("lesson-missing"),
    (error) => error.statusCode === 404
  );
  await assert.rejects(
    () => getMediaReadinessForProject(project.id),
    (error) =>
      error.statusCode === 422 && /Lesson shape is invalid/.test(error.message)
  );
});

test("empty and draft lessons are not media ready", async () => {
  const emptyProject = await store.createProject();
  const emptyReadiness = await getMediaReadinessForProject(emptyProject.id);

  assert.equal(emptyReadiness.ready, false);
  assert.equal(emptyReadiness.summary.total, 0);
  assert.ok(emptyReadiness.blockers.some((blocker) => blocker.kind === "Story"));
  assert.ok(emptyReadiness.blockers.some((blocker) => blocker.kind === "Characters"));
  assert.ok(emptyReadiness.blockers.some((blocker) => blocker.kind === "Scenes"));

  const draftProject = await store.createProject(
    lockedLessonPatch({
      story: {
        status: "draft",
        sentences: [{ id: "sentence-1", number: 1, text: "Marta waits." }],
        lockedAt: null,
        lockedSentences: [],
        modifiedAfterLock: false
      },
      scenes: []
    })
  );
  const draftReadiness = await getMediaReadinessForProject(draftProject.id);
  assert.equal(draftReadiness.ready, false);
  assert.ok(draftReadiness.blockers.some((blocker) => blocker.id === "story"));
});

test("character image states become readiness blockers", async () => {
  const generated = await buildMediaReadiness(
    lockedLessonPatch({
      characters: [
        {
          ...lockedLessonPatch().characters[0],
          generationStatus: "generated",
          approved: false
        }
      ],
      scenes: []
    }),
    { assetExists: async () => true }
  );

  assert.equal(findItem(generated, "character-marta").status, "generated");
  assert.equal(generated.summary.generated, 1);

  const stale = await buildMediaReadiness(
    lockedLessonPatch({
      characters: [{ ...lockedLessonPatch().characters[0], stale: true }],
      scenes: []
    }),
    { assetExists: async () => true }
  );
  assert.equal(findItem(stale, "character-marta").status, "stale");

  const missingPath = await buildMediaReadiness(
    lockedLessonPatch({
      characters: [{ ...lockedLessonPatch().characters[0], imagePath: null }],
      scenes: []
    }),
    { assetExists: async () => true }
  );
  assert.equal(findItem(missingPath, "character-marta").status, "missing");
});

test("missing character image files are reported without absolute paths", async () => {
  const project = await createProjectWithAssets();
  await fs.unlink(
    path.join(tempProjectsDir, project.id, "images", "characters", "marta.png")
  );

  const readiness = await getMediaReadinessForProject(project.id);
  const item = findItem(readiness, "character-marta");

  assert.equal(readiness.ready, false);
  assert.equal(item.status, "file_missing");
  assert.equal(item.fileExists, false);
  assert.doesNotMatch(JSON.stringify(readiness), new RegExp(tempProjectsDir));
});

test("scene planning and image states become readiness blockers", async () => {
  const noCoverage = await buildMediaReadiness(
    lockedLessonPatch({
      scenes: [{ ...lockedLessonPatch().scenes[0], sentenceIds: [] }]
    }),
    { assetExists: async () => true }
  );
  assert.equal(findItem(noCoverage, "scene-1").status, "invalid");
  assert.ok(
    findItem(noCoverage, "scene-1").messages.includes(
      "Add sentence coverage to this scene."
    )
  );

  const missingDetails = await buildMediaReadiness(
    lockedLessonPatch({
      scenes: [{ ...lockedLessonPatch().scenes[0], location: "", description: "" }]
    }),
    { assetExists: async () => true }
  );
  assert.ok(
    findItem(missingDetails, "scene-1").messages.includes(
      "Add a location to this scene."
    )
  );
  assert.ok(
    findItem(missingDetails, "scene-1").messages.includes(
      "Add a description to this scene."
    )
  );

  const generated = await buildMediaReadiness(
    lockedLessonPatch({
      scenes: [
        {
          ...lockedLessonPatch().scenes[0],
          generationStatus: "generated",
          approved: false
        }
      ]
    }),
    { assetExists: async () => true }
  );
  assert.equal(findItem(generated, "scene-1").status, "generated");

  const stale = await buildMediaReadiness(
    lockedLessonPatch({
      scenes: [{ ...lockedLessonPatch().scenes[0], stale: true }]
    }),
    { assetExists: async () => true }
  );
  assert.equal(findItem(stale, "scene-1").status, "stale");
});

test("missing scene files block readiness", async () => {
  const project = await createProjectWithAssets();
  await fs.unlink(
    path.join(tempProjectsDir, project.id, "images", "scenes", "scene-1.png")
  );

  const readiness = await getMediaReadinessForProject(project.id);
  assert.equal(readiness.ready, false);
  assert.equal(findItem(readiness, "scene-1").status, "file_missing");
  assert.equal(readiness.summary.fileMissing, 1);
});

test("fully approved file-backed media is ready", async () => {
  const project = await createProjectWithAssets();
  const readiness = await getMediaReadinessForProject(project.id);

  assert.equal(readiness.ready, true);
  assert.equal(readiness.summary.total, 3);
  assert.equal(readiness.summary.approved, 3);
  assert.deepEqual(readiness.blockers, []);
});

function findItem(readiness, id) {
  return readiness.items.find((item) => item.id === id);
}
