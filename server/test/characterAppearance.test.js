import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-appearance-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;
delete process.env.OPENAI_API_KEY;

const store = await import("../src/services/projectStore.js");
const {
  applyCharacterAppearance,
  updateCharacterAppearanceForProject
} = await import("../src/services/characterAppearanceService.js");
const {
  buildCharacterAppearancePrompt,
  characterAppearancePromptVersion
} = await import("../src/prompts/characterAppearancePrompts.js");
const {
  characterAppearanceSchemaVersion
} = await import("../src/schemas/characterAppearanceSchemas.js");
const {
  parseCharacterAppearanceResponse,
  validateCharacterAppearanceResponse
} = await import("../src/services/validateCharacterAppearance.js");

function lockedLessonPatch(overrides = {}) {
  const sentences = [
    "Marta walks to the community centre.",
    "She speaks to the receptionist.",
    "The receptionist asks for Marta's name.",
    "The doctor calls Marta.",
    "Marta asks a question.",
    "Marta books another visit."
  ].map((text, index) => ({
    id: `sentence-${index + 1}`,
    number: index + 1,
    text,
    stale: false
  }));

  return {
    title: "Community help",
    theme: "Everyday services",
    learnerLevel: "Literacies Plus",
    setting: "A community centre",
    scenario: "Marta asks for help at reception.",
    sentenceCount: 6,
    setup: {
      mainCharacter: {
        name: "Marta",
        age: "34",
        sex: "Woman",
        background: "Polish"
      },
      secondaryCharacters: ["Receptionist"],
      targetVocabulary: "queue, prescription, symptoms",
      additionalNotes: "Use a calm adult learner context."
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
        appearanceDescription: "Woman in her mid 30s with dark brown hair.",
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

function validAppearanceText() {
  return "Woman in her mid 30s with shoulder-length dark brown hair, brown eyes, light skin and an average build.";
}

function fakeAppearanceClient(response, calls = [], imageCalls = []) {
  return {
    responses: {
      create: async (request) => {
        calls.push(request);
        if (response instanceof Error) throw response;
        return {
          output_text:
            typeof response === "string"
              ? response
              : JSON.stringify(response ?? { appearanceDescription: validAppearanceText() })
        };
      }
    },
    images: {
      generate: async (request) => {
        imageCalls.push(request);
        throw new Error("images.generate should not be called");
      }
    }
  };
}

async function mutatePersistedLesson(projectId, mutate) {
  const lessonPath = path.join(tempProjectsDir, projectId, "lesson.json");
  const lesson = JSON.parse(await fs.readFile(lessonPath, "utf8"));
  mutate(lesson);
  await fs.writeFile(lessonPath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
}

async function readCharacterImageFileNames(projectId) {
  return fs.readdir(path.join(tempProjectsDir, projectId, "images", "characters"));
}

test("character appearance update requires ids", async () => {
  await assert.rejects(
    () => updateCharacterAppearanceForProject("", "character-marta"),
    (error) =>
      error.statusCode === 400 && /lessonId/.test(error.message)
  );
  await assert.rejects(
    () => updateCharacterAppearanceForProject("lesson-example", ""),
    (error) =>
      error.statusCode === 400 && /characterId/.test(error.message)
  );
  await assert.rejects(
    () => updateCharacterAppearanceForProject("lesson-example", "../bad"),
    (error) =>
      error.statusCode === 400 && error.message === "Character id is malformed."
  );
});

test("character appearance update rejects missing project and character", async () => {
  await assert.rejects(
    () =>
      updateCharacterAppearanceForProject("lesson-missing", "character-marta", {
        client: fakeAppearanceClient()
      }),
    (error) => error.statusCode === 404 && /Project not found/.test(error.message)
  );

  const project = await store.createProject(lockedLessonPatch());
  await assert.rejects(
    () =>
      updateCharacterAppearanceForProject(project.id, "character-missing", {
        client: fakeAppearanceClient()
      }),
    (error) => error.statusCode === 404 && error.message === "Character not found."
  );
});

test("character appearance update requires locked story and character name", async () => {
  const draft = await store.createProject(
    lockedLessonPatch({
      story: {
        status: "draft",
        lockedAt: null,
        lockedSentences: [],
        modifiedAfterLock: false,
        sentences: [
          { id: "sentence-1", number: 1, text: "Marta asks a question." }
        ]
      }
    })
  );
  await assert.rejects(
    () =>
      updateCharacterAppearanceForProject(draft.id, "character-marta", {
        client: fakeAppearanceClient()
      }),
    /Lock the story before updating character appearance/
  );

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
      updateCharacterAppearanceForProject(emptyName.id, "character-marta", {
        client: fakeAppearanceClient()
      }),
    /Character name is required/
  );
});

test("character appearance update rejects invalid saved lesson shape", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await mutatePersistedLesson(project.id, (lesson) => {
    lesson.scenes = [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-1"],
        location: "",
        description: "",
        characterIds: ["character-missing"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false
      }
    ];
  });

  await assert.rejects(
    () =>
      updateCharacterAppearanceForProject(project.id, "character-marta", {
        client: fakeAppearanceClient()
      }),
    (error) => error.statusCode === 422 && /Lesson shape is invalid/.test(error.message)
  );
});

test("character appearance update rejects raw persisted invalid locked snapshot", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await mutatePersistedLesson(project.id, (lesson) => {
    lesson.story.lockedSentences[0].text = "Changed after lock.";
  });

  await assert.rejects(
    () =>
      updateCharacterAppearanceForProject(project.id, "character-marta", {
        client: fakeAppearanceClient()
      }),
    /Lock the story again before updating character appearance/
  );
});

test("valid appearance response updates only target character and preserves notes", async () => {
  const calls = [];
  const imageCalls = [];
  const project = await store.createProject(lockedLessonPatch());
  const beforeFiles = await readCharacterImageFileNames(project.id);
  const result = await updateCharacterAppearanceForProject(
    project.id,
    "character-marta",
    {
      client: fakeAppearanceClient(
        { appearanceDescription: `  ${validAppearanceText()}  ` },
        calls,
        imageCalls
      ),
      model: "test-text-model",
      now: "2026-09-11T15:00:00.000Z"
    }
  );

  const marta = result.lesson.characters[0];
  const receptionist = result.lesson.characters[1];
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "test-text-model");
  assert.equal(calls[0].text.format.name, "character_appearance");
  assert.equal(imageCalls.length, 0);
  assert.equal(marta.appearanceDescription, validAppearanceText());
  assert.deepEqual(marta.notes, ["clear face"]);
  assert.equal(receptionist.appearanceDescription, "");
  assert.deepEqual(receptionist.notes, ["clinic desk"]);
  assert.deepEqual(await readCharacterImageFileNames(project.id), beforeFiles);
  assert.deepEqual(result.appearance, {
    characterId: "character-marta",
    appearanceDescription: validAppearanceText(),
    generatedAt: "2026-09-11T15:00:00.000Z",
    model: "test-text-model",
    promptVersion: characterAppearancePromptVersion,
    schemaVersion: characterAppearanceSchemaVersion
  });
});

test("appearance changes mark generated or approved character images stale", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          ...lockedLessonPatch().characters[0],
          generationStatus: "approved",
          generationCount: 2,
          imagePath: "images/characters/marta.png",
          approved: true,
          stale: false
        },
        lockedLessonPatch().characters[1]
      ]
    })
  );

  const result = await updateCharacterAppearanceForProject(
    project.id,
    "character-marta",
    {
      client: fakeAppearanceClient({ appearanceDescription: validAppearanceText() }),
      model: "test-text-model",
      now: "2026-09-11T15:05:00.000Z"
    }
  );

  const character = result.lesson.characters[0];
  assert.equal(character.imagePath, "images/characters/marta.png");
  assert.equal(character.generationCount, 2);
  assert.equal(character.generationStatus, "generated");
  assert.equal(character.approved, false);
  assert.equal(character.stale, true);
  assert.equal(
    character.staleReason,
    "Character appearance changed after image generation."
  );
  assert.equal(character.staleAt, "2026-09-11T15:05:00.000Z");
});

test("appearance update does not mark stale without generated image work", async () => {
  const project = await store.createProject(lockedLessonPatch());
  const result = await updateCharacterAppearanceForProject(
    project.id,
    "character-marta",
    {
      client: fakeAppearanceClient({ appearanceDescription: validAppearanceText() }),
      model: "test-text-model"
    }
  );

  assert.equal(result.lesson.characters[0].stale, false);
  assert.equal(result.lesson.characters[0].approved, false);
  assert.equal(result.lesson.characters[0].generationStatus, "not_started");
});

test("unchanged normalized appearance does not mark generated image stale", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          ...lockedLessonPatch().characters[0],
          appearanceDescription: validAppearanceText(),
          generationStatus: "approved",
          generationCount: 2,
          imagePath: "images/characters/marta.png",
          approved: true,
          stale: false
        }
      ]
    })
  );

  const result = await updateCharacterAppearanceForProject(
    project.id,
    "character-marta",
    {
      client: fakeAppearanceClient({
        appearanceDescription: `\n ${validAppearanceText().replaceAll(" ", "  ")} \t`
      }),
      model: "test-text-model"
    }
  );

  const character = result.lesson.characters[0];
  assert.equal(character.approved, true);
  assert.equal(character.generationStatus, "approved");
  assert.equal(character.stale, false);
});

test("invalid model response and provider failure do not mutate saved project", async () => {
  const invalid = await store.createProject(lockedLessonPatch());
  const beforeInvalid = await store.getProject(invalid.id);
  await assert.rejects(
    () =>
      updateCharacterAppearanceForProject(invalid.id, "character-marta", {
        client: fakeAppearanceClient({ appearanceDescription: "- friendly" }),
        model: "test-text-model"
      }),
    /Character appearance response is invalid/
  );
  assert.deepEqual(await store.getProject(invalid.id), beforeInvalid);

  const failure = await store.createProject(lockedLessonPatch());
  const beforeFailure = await store.getProject(failure.id);
  await assert.rejects(
    () =>
      updateCharacterAppearanceForProject(failure.id, "character-marta", {
        client: fakeAppearanceClient(new Error("provider details")),
        model: "test-text-model"
      }),
    /Character appearance generation failed/
  );
  assert.deepEqual(await store.getProject(failure.id), beforeFailure);
});

test("appearance response parser and validator reject noisy boilerplate", () => {
  assert.deepEqual(
    validateCharacterAppearanceResponse(
      parseCharacterAppearanceResponse(
        JSON.stringify({ appearanceDescription: validAppearanceText() })
      )
    ),
    { appearanceDescription: validAppearanceText() }
  );

  for (const value of [
    "",
    "Appearance description: medium height and brown hair.",
    "{\"appearanceDescription\":\"brown hair\"}",
    "clear face",
    "adult learner context",
    "same outfit each image",
    "Woman in her mid 30s for learner level use."
  ]) {
    assert.throws(
      () => validateCharacterAppearanceResponse({ appearanceDescription: value }),
      /Character appearance response is invalid/
    );
  }
});

test("appearance prompt uses character basics and excludes noisy setup fields", () => {
  const lesson = lockedLessonPatch();
  const prompt = buildCharacterAppearancePrompt(lesson, lesson.characters[0]);
  const serialized = JSON.stringify(prompt);

  assert.match(serialized, /Marta/);
  assert.match(serialized, /Woman/);
  assert.match(serialized, /Polish/);
  assert.match(serialized, /community centre/);
  assert.match(serialized, /Marta asks a question/);
  assert.doesNotMatch(serialized, /queue|prescription|symptoms|clear face/i);
  assert.doesNotMatch(serialized, /adult learner context/i);
});

test("applyCharacterAppearance updates only the requested character", () => {
  const lesson = lockedLessonPatch();
  const updated = applyCharacterAppearance(lesson, "character-receptionist", {
    appearanceDescription: "Tall adult with short grey hair and an average build.",
    now: "2026-09-11T15:10:00.000Z"
  });

  assert.equal(
    updated.characters[0].appearanceDescription,
    lesson.characters[0].appearanceDescription
  );
  assert.equal(
    updated.characters[1].appearanceDescription,
    "Tall adult with short grey hair and an average build."
  );
});
