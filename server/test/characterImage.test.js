import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-images-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;
delete process.env.OPENAI_API_KEY;

const store = await import("../src/services/projectStore.js");
const {
  approveCharacterImageForProject,
  generateCharacterImageForProject
} = await import("../src/services/characterImageService.js");
const {
  buildCharacterImagePrompt
} = await import("../src/prompts/characterImagePrompts.js");
const {
  resolveProjectAsset,
  saveCharacterImage
} = await import("../src/services/imageStorage.js");

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function lockedLessonPatch(overrides = {}) {
  const sentences = [
    "Marta walks to the clinic.",
    "She speaks to the receptionist.",
    "The receptionist asks for Marta's name.",
    "The doctor calls Marta.",
    "Marta tells the doctor about her throat.",
    "Marta books another appointment."
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
      lockedAt: "2026-09-09T11:55:00.000Z",
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
        appearanceDescription:
          "Woman in her mid 30s with shoulder-length dark brown hair, brown eyes and an average build.",
        notes: ["clear face"],
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        imageStyle: "illustration",
        approved: false,
        stale: false
      },
      {
        id: "character-receptionist",
        name: "Receptionist",
        role: "secondary",
        age: "",
        sex: "Unspecified",
        background: "",
        appearanceDescription: "",
        notes: ["clinic desk"],
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        imageStyle: "illustration",
        approved: false,
        stale: false
      }
    ],
    scenes: [],
    reusable: {
      backgrounds: ["Polish"],
      noteTags: ["clear face"]
    },
    currentStage: "characters",
    ...overrides
  };
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

async function readCharacterImageFileNames(projectId) {
  return fs.readdir(path.join(tempProjectsDir, projectId, "images", "characters"));
}

async function assertInvalidImagePayloadDoesNotMutate(response, expectedMessage) {
  const project = await store.createProject(lockedLessonPatch());
  const before = await store.getProject(project.id);

  await assert.rejects(
    () =>
      generateCharacterImageForProject(project.id, "character-marta", {
        client: fakeImageClient(response),
        model: "test-image-model"
      }),
    (error) => error.statusCode === 503 && expectedMessage.test(error.message)
  );

  const after = await store.getProject(project.id);
  assert.deepEqual(after.characters[0], before.characters[0]);
  assert.deepEqual(await readCharacterImageFileNames(project.id), []);
}

test("character image generation requires ids", async () => {
  await assert.rejects(
    () => generateCharacterImageForProject("", "character-marta"),
    /lessonId/
  );
  await assert.rejects(
    () => generateCharacterImageForProject("lesson-example", ""),
    /characterId/
  );
});

test("character image operations reject malformed character ids before lookup", async () => {
  const project = await store.createProject(lockedLessonPatch());

  await assert.rejects(
    () =>
      generateCharacterImageForProject(project.id, "../bad", {
        client: fakeImageClient()
      }),
    (error) =>
      error.statusCode === 400 && error.message === "Character id is malformed."
  );

  await assert.rejects(
    () => approveCharacterImageForProject(project.id, "../bad"),
    (error) =>
      error.statusCode === 400 && error.message === "Character id is malformed."
  );
});

test("character image operations preserve 404 for safe missing character ids", async () => {
  const project = await store.createProject(lockedLessonPatch());

  await assert.rejects(
    () =>
      generateCharacterImageForProject(project.id, "character-missing", {
        client: fakeImageClient()
      }),
    (error) => error.statusCode === 404 && error.message === "Character not found."
  );

  await assert.rejects(
    () => approveCharacterImageForProject(project.id, "character-missing"),
    (error) => error.statusCode === 404 && error.message === "Character not found."
  );
});

test("character image generation rejects missing project and character", async () => {
  await assert.rejects(
    () =>
      generateCharacterImageForProject("lesson-missing", "character-marta", {
        client: fakeImageClient()
      }),
    /Project not found/
  );

  const project = await store.createProject(lockedLessonPatch());
  await assert.rejects(
    () =>
      generateCharacterImageForProject(project.id, "character-missing", {
        client: fakeImageClient()
      }),
    /Character not found/
  );
});

test("character image generation requires locked story and locked snapshot", async () => {
  const draft = await store.createProject(
    lockedLessonPatch({
      story: {
        status: "draft",
        lockedAt: null,
        lockedSentences: [],
        modifiedAfterLock: false,
        sentences: [
          { id: "sentence-1", number: 1, text: "Marta walks to the clinic." }
        ]
      }
    })
  );

  await assert.rejects(
    () =>
      generateCharacterImageForProject(draft.id, "character-marta", {
        client: fakeImageClient()
      }),
    /Lock the story/
  );

  const malformed = await store.createProject(lockedLessonPatch());
  const lessonPath = path.join(tempProjectsDir, malformed.id, "lesson.json");
  const lesson = JSON.parse(await fs.readFile(lessonPath, "utf8"));
  lesson.story.lockedSentences = [];
  await fs.writeFile(lessonPath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");

  await assert.rejects(
    () =>
      generateCharacterImageForProject(malformed.id, "character-marta", {
        client: fakeImageClient()
      }),
    /Locked story snapshot/
  );
});

test("character image generation rejects empty names, stale records and empty character lists", async () => {
  const emptyName = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          ...lockedLessonPatch().characters[0],
          name: ""
        }
      ]
    })
  );
  await assert.rejects(
    () =>
      generateCharacterImageForProject(emptyName.id, "character-marta", {
        client: fakeImageClient()
      }),
    /Character name/
  );

  const stale = await store.createProject(
    lockedLessonPatch({
      characters: [{ ...lockedLessonPatch().characters[0], stale: true }]
    })
  );
  await assert.rejects(
    () =>
      generateCharacterImageForProject(stale.id, "character-marta", {
        client: fakeImageClient()
      }),
    /stale character/
  );

  const noCharacters = await store.createProject(lockedLessonPatch({ characters: [] }));
  await assert.rejects(
    () =>
      generateCharacterImageForProject(noCharacters.id, "character-marta", {
        client: fakeImageClient()
      }),
    /Extract characters/
  );
});

test("character image prompt uses stable identity fields and excludes lesson story context", () => {
  const lesson = lockedLessonPatch();
  const prompt = buildCharacterImagePrompt(lesson, lesson.characters[0]);

  assert.match(prompt, /Marta/);
  assert.match(prompt, /34/);
  assert.match(prompt, /Woman/);
  assert.match(prompt, /Polish/);
  assert.match(
    prompt,
    /Stable appearance description: Woman in her mid 30s with shoulder-length dark brown hair/
  );
  assert.match(prompt, /stable recurring human character reference portrait/);
  assert.match(prompt, /Requested image style: Illustration/);
  assert.doesNotMatch(prompt, /Notes tags/);
  assert.doesNotMatch(prompt, /clear face/);
  assert.doesNotMatch(prompt, /Learner level tone|Literacies Plus/);
  assert.doesNotMatch(prompt, /Locked master story context/);
  assert.doesNotMatch(prompt, /Marta walks to the clinic/);
  assert.doesNotMatch(prompt, /appointment, today, tomorrow/);
  assert.doesNotMatch(prompt, /Keep the story calm/);
  assert.doesNotMatch(prompt, /Lesson title|Theme:|Setting:|Scenario:/);
  assert.doesNotMatch(prompt, /\bA1\b|\bA2\b|\bB1\b|CEFR/);
});

test("character image prompt allows empty appearance descriptions", () => {
  const lesson = lockedLessonPatch({
    characters: [
      {
        ...lockedLessonPatch().characters[0],
        appearanceDescription: ""
      }
    ]
  });
  const prompt = buildCharacterImagePrompt(lesson, lesson.characters[0]);

  assert.match(prompt, /Stable appearance description: Not specified/);
  assert.match(prompt, /Name: Marta/);
  assert.match(prompt, /Age or age range: 34/);
  assert.doesNotMatch(prompt, /Notes tags|clear face/);
});

test("character image prompt supports photorealistic style", () => {
  const lesson = lockedLessonPatch({
    characters: [
      {
        ...lockedLessonPatch().characters[0],
        imageStyle: "photorealistic"
      }
    ]
  });
  const prompt = buildCharacterImagePrompt(lesson, lesson.characters[0]);

  assert.match(prompt, /Requested image style: Photorealistic/);
  assert.match(prompt, /natural photorealistic reference portrait style/);
  assert.doesNotMatch(prompt, /illustrated project style/);
});

test("mocked image response saves file and updates only target character", async () => {
  const calls = [];
  const project = await store.createProject(lockedLessonPatch());
  const result = await generateCharacterImageForProject(project.id, "character-marta", {
    client: fakeImageClient(undefined, calls),
    model: "test-image-model",
    now: "2026-09-09T12:00:00.000Z"
  });

  const marta = result.lesson.characters[0];
  const receptionist = result.lesson.characters[1];
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "test-image-model");
  assert.equal(marta.name, "Marta");
  assert.equal(marta.age, "34");
  assert.deepEqual(marta.notes, ["clear face"]);
  assert.equal(marta.generationStatus, "generated");
  assert.equal(marta.generationCount, 1);
  assert.equal(marta.approved, false);
  assert.equal(marta.stale, false);
  assert.match(marta.imagePath, /^images\/characters\/lesson-.*character-marta.*\.png$/);
  assert.equal(marta.imageMeta.model, "test-image-model");
  assert.equal(marta.imageMeta.promptVersion, "character-image-v3");
  assert.equal(marta.imageMeta.imageStyle, "illustration");
  assert.equal(marta.imageMeta.sourceStoryLockedAt, "2026-09-09T11:55:00.000Z");
  assert.equal(receptionist.generationStatus, "not_started");
  assert.equal(receptionist.imagePath, null);
  assert.match(result.image.imagePath, /^\/api\/projects\/lesson-.*\/assets\/images\/characters\//);

  const filePath = path.join(tempProjectsDir, project.id, marta.imagePath);
  const stats = await fs.stat(filePath);
  assert.equal(stats.isFile(), true);
});

test("regeneration increments count and clears approval without losing fields", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          ...lockedLessonPatch().characters[0],
          generationStatus: "approved",
          generationCount: 3,
          imagePath: "images/characters/old.png",
          approved: true
        }
      ]
    })
  );

  const oldPath = path.join(tempProjectsDir, project.id, "images", "characters", "old.png");
  await fs.writeFile(oldPath, Buffer.from(tinyPngBase64, "base64"));

  const result = await generateCharacterImageForProject(project.id, "character-marta", {
    client: fakeImageClient(),
    model: "test-image-model",
    now: "2026-09-09T12:05:00.000Z"
  });

  const character = result.lesson.characters[0];
  assert.equal(character.generationCount, 4);
  assert.equal(character.generationStatus, "generated");
  assert.equal(character.approved, false);
  assert.equal(character.name, "Marta");
  assert.equal(character.imagePath.includes("old.png"), false);
});

test("stale details changed records can regenerate with audit metadata", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          ...lockedLessonPatch().characters[0],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/characters/old.png",
          approved: false,
          stale: true,
          staleReason: "Character details changed after image generation.",
          staleAt: "2026-09-09T12:03:00.000Z"
        }
      ]
    })
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "characters", "old.png"),
    Buffer.from(tinyPngBase64, "base64")
  );

  const result = await generateCharacterImageForProject(project.id, "character-marta", {
    client: fakeImageClient(),
    model: "test-image-model",
    now: "2026-09-09T12:06:00.000Z"
  });

  const character = result.lesson.characters[0];
  assert.equal(character.stale, false);
  assert.equal(character.generationStatus, "generated");
  assert.equal(character.generationCount, 2);
  assert.equal(
    character.imageMeta.reviewedStaleReason,
    "Character details changed after image generation."
  );
});

test("stale appearance changed records can regenerate with audit metadata", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          ...lockedLessonPatch().characters[0],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/characters/old-appearance.png",
          approved: false,
          stale: true,
          staleReason: "Character appearance changed after image generation.",
          staleAt: "2026-09-09T12:03:00.000Z"
        }
      ]
    })
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "characters", "old-appearance.png"),
    Buffer.from(tinyPngBase64, "base64")
  );

  const result = await generateCharacterImageForProject(project.id, "character-marta", {
    client: fakeImageClient(),
    model: "test-image-model",
    now: "2026-09-09T12:06:00.000Z"
  });

  const character = result.lesson.characters[0];
  assert.equal(character.stale, false);
  assert.equal(character.generationStatus, "generated");
  assert.equal(character.generationCount, 2);
  assert.equal(
    character.imageMeta.reviewedStaleReason,
    "Character appearance changed after image generation."
  );
  assert.equal(character.imageMeta.promptVersion, "character-image-v3");
});

test("invalid image response and provider failure do not mutate saved project", async () => {
  const invalid = await store.createProject(lockedLessonPatch());
  await assert.rejects(
    () =>
      generateCharacterImageForProject(invalid.id, "character-marta", {
        client: fakeImageClient({ data: [] })
      }),
    /usable image data/
  );
  assert.equal((await store.getProject(invalid.id)).characters[0].imagePath, null);

  const failure = await store.createProject(lockedLessonPatch());
  await assert.rejects(
    () =>
      generateCharacterImageForProject(failure.id, "character-marta", {
        client: fakeImageClient(new Error("provider internals"))
      }),
    /Character image generation failed/
  );
  assert.equal((await store.getProject(failure.id)).characters[0].imagePath, null);
});

test("invalid generated image payloads do not mutate lesson or write files", async () => {
  await assertInvalidImagePayloadDoesNotMutate(
    { data: [{ b64_json: "not valid base64 ***" }] },
    /usable image data/
  );
  await assertInvalidImagePayloadDoesNotMutate(
    { data: [{ b64_json: Buffer.from("not a png").toString("base64") }] },
    /usable PNG data/
  );
});

test("image storage rejects empty decoded image bytes", async () => {
  const project = await store.createProject(lockedLessonPatch());

  await assert.rejects(
    () =>
      saveCharacterImage(project.id, "character-marta", Buffer.alloc(0), {
        extension: ".png"
      }),
    (error) => error.statusCode === 503 && /usable PNG data/.test(error.message)
  );

  assert.deepEqual(await readCharacterImageFileNames(project.id), []);
});

test("approval requires an existing project image", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await assert.rejects(
    () => approveCharacterImageForProject(project.id, "character-marta"),
    /Generate an image/
  );

  const generated = await generateCharacterImageForProject(project.id, "character-marta", {
    client: fakeImageClient(),
    model: "test-image-model"
  });
  const approved = await approveCharacterImageForProject(project.id, "character-marta");
  assert.equal(approved.characters[0].approved, true);
  assert.equal(approved.characters[0].generationStatus, "approved");
  assert.equal(approved.characters[0].imagePath, generated.lesson.characters[0].imagePath);
});

test("approval rejects stale generated character images", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          ...lockedLessonPatch().characters[0],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/characters/stale.png",
          approved: false,
          stale: true,
          staleReason: "Character details changed after image generation."
        }
      ]
    })
  );
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "characters", "stale.png"),
    Buffer.from(tinyPngBase64, "base64")
  );

  await assert.rejects(
    () => approveCharacterImageForProject(project.id, "character-marta"),
    /Regenerate this stale character/
  );
});

test("asset resolution rejects traversal and arbitrary files", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await fs.writeFile(
    path.join(tempProjectsDir, project.id, "images", "characters", "safe.png"),
    Buffer.from(tinyPngBase64, "base64")
  );

  const asset = await resolveProjectAsset(project.id, "images/characters/safe.png");
  assert.equal(asset.contentType, "image/png");

  await assert.rejects(
    () => resolveProjectAsset(project.id, "../lesson.json"),
    /malformed|not allowed/
  );
  await assert.rejects(
    () => resolveProjectAsset(project.id, "lesson.json"),
    /not allowed|not supported/
  );
  await assert.rejects(
    () => resolveProjectAsset(project.id, "meta.json"),
    /not allowed|not supported/
  );
  await assert.rejects(
    () => resolveProjectAsset(project.id, ".env"),
    /not allowed|not supported/
  );
});
