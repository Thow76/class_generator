import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-scene-images-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;
delete process.env.OPENAI_API_KEY;

const store = await import("../src/services/projectStore.js");
const {
  approveSceneImageForProject,
  generateSceneImageForProject
} = await import("../src/services/sceneImageService.js");
const {
  buildSceneImagePrompt,
  sceneImagePromptVersion
} = await import("../src/prompts/sceneImagePrompts.js");
const { saveSceneImage } = await import("../src/services/imageStorage.js");

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function lockedLessonPatch(overrides = {}) {
  const sentences = [
    "Marta walks to the clinic.",
    "She speaks to the receptionist.",
    "The receptionist asks for Marta's name.",
    "Marta sits in the waiting room."
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
    characters: approvedCharacters(),
    scenesMeta: {
      lastPlannedAt: "2026-09-10T11:55:00.000Z",
      model: "test-story-model",
      promptVersion: "scene-plan-v1",
      schemaVersion: "scene-plan-v1",
      sourceStoryLockedAt: "2026-09-10T11:50:00.000Z"
    },
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
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false
      },
      {
        id: "scene-2",
        number: 2,
        label: "Scene 2",
        sentenceIds: ["sentence-3", "sentence-4"],
        location: "Clinic waiting room",
        description: "Marta waits after giving her name.",
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
    reusable: {
      backgrounds: ["Clinic"],
      noteTags: ["clear face"]
    },
    currentStage: "scenes",
    ...overrides
  };
}

function approvedCharacters(overrides = {}) {
  return [
    {
      id: "character-marta",
      name: "Marta",
      role: "main",
      age: "34",
      sex: "Woman",
      background: "Polish",
      appearanceDescription:
        "Marta has shoulder-length dark hair, oval glasses and a medium build.",
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
      appearanceDescription:
        "The receptionist has short grey hair and a neat navy cardigan.",
      notes: ["clinic desk"],
      imageStyle: "illustration",
      generationStatus: "approved",
      generationCount: 1,
      imagePath: "images/characters/receptionist.png",
      approved: true,
      stale: false
    }
  ].map((character) =>
    character.id === overrides.id ? { ...character, ...overrides } : character
  );
}

function fakeImageClient(response = { data: [{ b64_json: tinyPngBase64 }] }, calls = []) {
  return {
    images: {
      generate: async (request) => {
        calls.push(request);
        if (response instanceof Error) throw response;
        return response;
      }
    }
  };
}

async function createProjectWithCharacterImages(patch = lockedLessonPatch()) {
  const project = await store.createProject(patch);
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "characters", "marta.png"),
    Buffer.from(tinyPngBase64, "base64")
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "characters", "receptionist.png"),
    Buffer.from(tinyPngBase64, "base64")
  );
  return project;
}

async function mutatePersistedLesson(projectId, mutate) {
  const lessonPath = path.join(tempProjectsDir, projectId, "lesson.json");
  const lesson = JSON.parse(await fs.readFile(lessonPath, "utf8"));
  mutate(lesson);
  await fs.writeFile(lessonPath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
}

test("scene image generation requires ids", async () => {
  await assert.rejects(
    () => generateSceneImageForProject("", "scene-1"),
    /lessonId/
  );
  await assert.rejects(
    () => generateSceneImageForProject("lesson-example", ""),
    /sceneId/
  );
  await assert.rejects(
    () => generateSceneImageForProject("lesson-example", "../bad"),
    (error) => error.statusCode === 400 && error.message === "Scene id is malformed."
  );
});

test("scene image generation requires locked story and scene plan", async () => {
  const draft = await createProjectWithCharacterImages(
    lockedLessonPatch({
      story: {
        status: "draft",
        lockedAt: null,
        lockedSentences: [],
        modifiedAfterLock: false,
        sentences: [
          { id: "sentence-1", number: 1, text: "Marta walks to the clinic." }
        ]
      },
      scenes: []
    })
  );

  await assert.rejects(
    () =>
      generateSceneImageForProject(draft.id, "scene-1", {
        client: fakeImageClient()
      }),
    /Lock the story/
  );

  const noScenes = await createProjectWithCharacterImages(lockedLessonPatch({ scenes: [] }));
  await assert.rejects(
    () =>
      generateSceneImageForProject(noScenes.id, "scene-1", {
        client: fakeImageClient()
      }),
    /Plan scenes/
  );
});

test("scene image generation rejects invalid persisted locked snapshot", async () => {
  const project = await createProjectWithCharacterImages();
  await mutatePersistedLesson(project.id, (lesson) => {
    lesson.story.lockedSentences = [];
  });

  await assert.rejects(
    () =>
      generateSceneImageForProject(project.id, "scene-1", {
        client: fakeImageClient()
      }),
    /Locked story snapshot is empty or invalid/
  );
});

test("scene image generation validates scene fields and character references", async () => {
  const staleScene = await createProjectWithCharacterImages(
    lockedLessonPatch({
      scenes: [{ ...lockedLessonPatch().scenes[0], stale: true }]
    })
  );
  await assert.rejects(
    () =>
      generateSceneImageForProject(staleScene.id, "scene-1", {
        client: fakeImageClient()
      }),
    /stale scene/
  );

  const emptyCoverage = await createProjectWithCharacterImages(
    lockedLessonPatch({
      scenes: [{ ...lockedLessonPatch().scenes[0], sentenceIds: [] }]
    })
  );
  await assert.rejects(
    () =>
      generateSceneImageForProject(emptyCoverage.id, "scene-1", {
        client: fakeImageClient()
      }),
    /sentence coverage/
  );

  const emptyLocation = await createProjectWithCharacterImages(
    lockedLessonPatch({
      scenes: [{ ...lockedLessonPatch().scenes[0], location: "" }]
    })
  );
  await assert.rejects(
    () =>
      generateSceneImageForProject(emptyLocation.id, "scene-1", {
        client: fakeImageClient()
      }),
    /location/
  );

  const unapprovedCharacter = await createProjectWithCharacterImages(
    lockedLessonPatch({
      characters: approvedCharacters({
        id: "character-marta",
        generationStatus: "generated",
        approved: false
      })
    })
  );
  await assert.rejects(
    () =>
      generateSceneImageForProject(unapprovedCharacter.id, "scene-1", {
        client: fakeImageClient()
      }),
    /Approve character references/
  );
});

test("scene image generation preserves mixed-style rejection", async () => {
  const mixedStyles = await createProjectWithCharacterImages(
    lockedLessonPatch({
      characters: approvedCharacters({
        id: "character-receptionist",
        imageStyle: "photorealistic"
      })
    })
  );

  await assert.rejects(
    () =>
      generateSceneImageForProject(mixedStyles.id, "scene-1", {
        client: fakeImageClient()
      }),
    /mixed image styles/
  );
});

test("scene image prompt uses only scene-bounded visual context", () => {
  const lesson = lockedLessonPatch();
  const prompt = buildSceneImagePrompt(lesson, lesson.scenes[0]);

  assert.match(prompt, new RegExp(`Prompt version: ${sceneImagePromptVersion}`));
  assert.match(prompt, /Scene 1/);
  assert.match(prompt, /Clinic reception desk/);
  assert.match(prompt, /Marta speaks with the receptionist/);
  assert.match(prompt, /Marta walks to the clinic/);
  assert.match(prompt, /She speaks to the receptionist/);
  assert.doesNotMatch(prompt, /receptionist asks for Marta's name/);
  assert.doesNotMatch(prompt, /Marta sits in the waiting room/);
  assert.match(prompt, /character-marta/);
  assert.match(prompt, /images\/characters\/marta.png/);
  assert.match(prompt, /Stable appearance description: Marta has shoulder-length dark hair/);
    assert.match(prompt, /Preserve each listed character's stable physical identity/);
  assert.match(prompt, /Use visual direction only for temporary scene-specific clothing/);
  assert.match(prompt, /Scene-specific visual direction: Not specified/);
  assert.match(prompt, /Use these sentences only to understand this scene's action/);
  assert.doesNotMatch(prompt, /\bA1\b|\bA2\b|\bB1\b|CEFR/);
  assert.doesNotMatch(prompt, /Learner level tone|Literacies Plus/);
  assert.doesNotMatch(prompt, /Notes tags|clear face|clinic desk/);
  assert.doesNotMatch(prompt, /appointment, today, tomorrow|Keep the story calm/);
  assert.doesNotMatch(prompt, /Scenario:|Theme:|Lesson title:/);
});

test("scene image prompt includes only the target scene visual direction", () => {
  const lesson = lockedLessonPatch({
    scenes: [
      {
        ...lockedLessonPatch().scenes[0],
        visualDirection:
          "Marta stands at the reception desk holding her phone and looking worried."
      },
      {
        ...lockedLessonPatch().scenes[1],
        visualDirection:
          "Marta sits beside the queue sign with a prescription bag visible."
      }
    ]
  });
  const prompt = buildSceneImagePrompt(lesson, lesson.scenes[0]);

  assert.match(
    prompt,
    /Scene-specific visual direction: Marta stands at the reception desk holding her phone and looking worried\./
  );
  assert.doesNotMatch(prompt, /prescription bag visible/);
  assert.match(prompt, /Stable appearance description: Marta has shoulder-length dark hair/);
  assert.doesNotMatch(prompt, /Notes tags|clear face|clinic desk/);
  assert.doesNotMatch(prompt, /Learner level tone|Literacies Plus/);
});

test("scene image prompt supports empty character appearance descriptions", () => {
  const lesson = lockedLessonPatch({
    characters: approvedCharacters({
      id: "character-marta",
      appearanceDescription: ""
    })
  });
  const prompt = buildSceneImagePrompt(lesson, lesson.scenes[0]);

  assert.match(prompt, /Stable appearance description: Not specified/);
  assert.match(prompt, /images\/characters\/marta.png/);
});

test("mocked scene image response saves file and updates only target scene", async () => {
  const calls = [];
  const project = await createProjectWithCharacterImages();
  const before = await store.getProject(project.id);
  const result = await generateSceneImageForProject(project.id, "scene-1", {
    client: fakeImageClient(undefined, calls),
    model: "test-image-model",
    now: "2026-09-10T12:00:00.000Z"
  });

  const scene = result.lesson.scenes[0];
  const untouched = result.lesson.scenes[1];
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "test-image-model");
  assert.match(calls[0].prompt, /Clinic reception desk/);
  assert.equal(scene.location, "Clinic reception desk");
  assert.equal(scene.description, "Marta speaks with the receptionist at the desk.");
  assert.equal(scene.generationStatus, "generated");
  assert.equal(scene.generationCount, 1);
  assert.equal(scene.approved, false);
  assert.equal(scene.stale, false);
  assert.match(scene.imagePath, /^images\/scenes\/lesson-.*scene-1.*\.png$/);
  assert.equal(scene.imageMeta.model, "test-image-model");
  assert.equal(scene.imageMeta.promptVersion, "scene-image-v3");
  assert.equal(scene.imageMeta.sourceStoryLockedAt, "2026-09-10T11:50:00.000Z");
  assert.equal(scene.imageMeta.sourceScenesPlannedAt, "2026-09-10T11:55:00.000Z");
  assert.deepEqual(scene.imageMeta.sourceCharacterImagePaths, [
    "images/characters/marta.png",
    "images/characters/receptionist.png"
  ]);
  assert.equal(untouched.generationStatus, "not_started");
  assert.equal(untouched.imagePath, null);
  assert.deepEqual(result.lesson.characters, before.characters);
  assert.match(result.image.imagePath, /^\/api\/projects\/lesson-.*\/assets\/images\/scenes\//);

  const filePath = path.join(tempProjectsDir, project.id, scene.imagePath);
  const stats = await fs.stat(filePath);
  assert.equal(stats.isFile(), true);
});

test("invalid scene image responses do not mutate saved project", async () => {
  const project = await createProjectWithCharacterImages();
  const before = await store.getProject(project.id);

  await assert.rejects(
    () =>
      generateSceneImageForProject(project.id, "scene-1", {
        client: fakeImageClient({ data: [] }),
        model: "test-image-model"
      }),
    /did not return usable image data/
  );

  const after = await store.getProject(project.id);
  assert.deepEqual(after, before);
});

test("scene image regeneration increments count and clears approval", async () => {
  const project = await createProjectWithCharacterImages(
    lockedLessonPatch({
      scenes: [
        {
          ...lockedLessonPatch().scenes[0],
          generationStatus: "approved",
          generationCount: 2,
          imagePath: "images/scenes/old.png",
          approved: true
        }
      ]
    })
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "scenes", "old.png"),
    Buffer.from(tinyPngBase64, "base64")
  );

  const result = await generateSceneImageForProject(project.id, "scene-1", {
    client: fakeImageClient(),
    model: "test-image-model",
    now: "2026-09-10T12:05:00.000Z"
  });

  const scene = result.lesson.scenes[0];
  assert.equal(scene.generationCount, 3);
  assert.equal(scene.generationStatus, "generated");
  assert.equal(scene.approved, false);
  assert.equal(scene.location, "Clinic reception desk");
  assert.equal(scene.imagePath.includes("old.png"), false);
});

test("reuse scene image copies source path without calling the image model", async () => {
  const calls = [];
  const project = await createProjectWithCharacterImages(
    lockedLessonPatch({
      scenes: [
        {
          ...lockedLessonPatch().scenes[0],
          generationStatus: "approved",
          generationCount: 1,
          imagePath: "images/scenes/source.png",
          imageMeta: { model: "test-image-model" },
          approved: true
        },
        {
          ...lockedLessonPatch().scenes[1],
          imageMode: "reuse",
          reuseSceneId: "scene-1"
        }
      ]
    })
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "scenes", "source.png"),
    Buffer.from(tinyPngBase64, "base64")
  );

  const result = await generateSceneImageForProject(project.id, "scene-2", {
    client: fakeImageClient(undefined, calls),
    now: "2026-09-10T12:10:00.000Z"
  });

  assert.equal(calls.length, 0);
  assert.equal(result.lesson.scenes[1].imagePath, "images/scenes/source.png");
  assert.equal(result.lesson.scenes[1].generationStatus, "generated");
  assert.equal(result.lesson.scenes[1].approved, false);
  assert.equal(result.lesson.scenes[1].imageMeta.reusedFromSceneId, "scene-1");
});

test("reuse scene image rejects stale source scenes without mutation", async () => {
  const calls = [];
  const project = await createProjectWithCharacterImages(
    lockedLessonPatch({
      scenes: [
        {
          ...lockedLessonPatch().scenes[0],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/scenes/source.png",
          approved: false,
          stale: true,
          staleReason: "Scene details changed after image generation.",
          staleAt: "2026-09-10T12:08:00.000Z"
        },
        {
          ...lockedLessonPatch().scenes[1],
          imageMode: "reuse",
          reuseSceneId: "scene-1"
        }
      ]
    })
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "scenes", "source.png"),
    Buffer.from(tinyPngBase64, "base64")
  );
  const before = await store.getProject(project.id);

  await assert.rejects(
    () =>
      generateSceneImageForProject(project.id, "scene-2", {
        client: fakeImageClient(undefined, calls)
      }),
    (error) =>
      error.statusCode === 422 &&
      /Reusable scene is stale/.test(error.message) &&
      /source scene/.test(error.details?.[0]?.message || "")
  );

  const after = await store.getProject(project.id);
  assert.equal(calls.length, 0);
  assert.deepEqual(after.scenes[0], before.scenes[0]);
  assert.deepEqual(after.scenes[1], before.scenes[1]);
});

test("approval requires an existing generated scene image", async () => {
  const project = await createProjectWithCharacterImages();
  await assert.rejects(
    () => approveSceneImageForProject(project.id, "scene-1"),
    /Generate an image/
  );

  const generated = await generateSceneImageForProject(project.id, "scene-1", {
    client: fakeImageClient(),
    model: "test-image-model"
  });
  const approved = await approveSceneImageForProject(project.id, "scene-1");

  assert.equal(approved.scenes[0].approved, true);
  assert.equal(approved.scenes[0].generationStatus, "approved");
  assert.equal(approved.scenes[0].imagePath, generated.lesson.scenes[0].imagePath);
});

test("approval rejects stale or missing generated scene files", async () => {
  const stale = await createProjectWithCharacterImages(
    lockedLessonPatch({
      scenes: [
        {
          ...lockedLessonPatch().scenes[0],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/scenes/stale.png",
          approved: false,
          stale: true
        }
      ]
    })
  );
  await fs.writeFile(
    path.join(tempProjectsDir, stale.id, "images", "scenes", "stale.png"),
    Buffer.from(tinyPngBase64, "base64")
  );
  await assert.rejects(
    () => approveSceneImageForProject(stale.id, "scene-1"),
    /stale scene/
  );

  const missing = await createProjectWithCharacterImages(
    lockedLessonPatch({
      scenes: [
        {
          ...lockedLessonPatch().scenes[0],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/scenes/missing.png",
          approved: false,
          stale: false
        }
      ]
    })
  );
  await assert.rejects(
    () => approveSceneImageForProject(missing.id, "scene-1"),
    /file was not found/
  );
});

test("scene storage rejects invalid decoded image payloads", async () => {
  const project = await createProjectWithCharacterImages();

  await assert.rejects(
    () =>
      saveSceneImage(project.id, "scene-1", Buffer.from("not a png"), {
        extension: ".png"
      }),
    (error) => error.statusCode === 503 && /usable PNG data/.test(error.message)
  );

  await assert.rejects(
    () =>
      saveSceneImage(project.id, "../bad", tinyPngBase64, {
        extension: ".png"
      }),
    (error) => error.statusCode === 400 && error.message === "Scene id is malformed."
  );
});
