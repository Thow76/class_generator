import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-characters-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;
delete process.env.OPENAI_API_KEY;

const store = await import("../src/services/projectStore.js");
const {
  applyExtractedCharacters,
  extractCharactersForProject
} = await import("../src/services/characterExtractionService.js");
const {
  validateCharacterExtraction
} = await import("../src/services/validateCharacterExtraction.js");
const { normalizeLesson } = await import("../src/services/normalizeLesson.js");
const { validateLesson } = await import("../src/services/validateLesson.js");

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
      secondaryCharacters: ["Receptionist", "Doctor"],
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
    characters: [],
    scenes: [],
    reusable: {
      backgrounds: ["Polish"],
      noteTags: ["clear face"]
    },
    currentStage: "characters",
    ...overrides
  };
}

function fakeClientWithResponse(response) {
  return {
    responses: {
      create: async () => ({
        output_text: JSON.stringify(response)
      })
    }
  };
}

async function mutatePersistedLesson(projectId, mutate) {
  const lessonPath = path.join(tempProjectsDir, projectId, "lesson.json");
  const lesson = JSON.parse(await fs.readFile(lessonPath, "utf8"));
  mutate(lesson);
  await fs.writeFile(lessonPath, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
}

function validExtractionPatch() {
  return {
    characters: [
      {
        name: "Marta",
        role: "main",
        age: "",
        sex: "Unspecified",
        background: "",
        notes: ["needs appointment"],
        storySentenceIds: ["sentence-1", "sentence-5", "sentence-6"]
      },
      {
        name: "Receptionist",
        role: "secondary",
        age: "",
        sex: "Unspecified",
        background: "",
        notes: ["clinic desk"],
        storySentenceIds: ["sentence-2", "sentence-3"]
      }
    ]
  };
}

test("character extraction requires lessonId", async () => {
  await assert.rejects(
    () => extractCharactersForProject(""),
    /Request body must include lessonId/
  );
});

test("character extraction rejects missing projects", async () => {
  await assert.rejects(
    () =>
      extractCharactersForProject("lesson-missing", {
        client: fakeClientWithResponse(validExtractionPatch())
      }),
    /Project not found/
  );
});

test("character extraction rejects draft stories", async () => {
  const project = await store.createProject(
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
      extractCharactersForProject(project.id, {
        client: fakeClientWithResponse(validExtractionPatch())
      }),
    /Lock the story before extracting characters/
  );
});

test("valid extraction creates editable character records", async () => {
  const project = await store.createProject(lockedLessonPatch());
  const lesson = await extractCharactersForProject(project.id, {
    client: fakeClientWithResponse(validExtractionPatch()),
    model: "test-model",
    now: "2026-09-09T12:00:00.000Z"
  });

  assert.equal(lesson.characters.length, 2);
  assert.equal(lesson.characters[0].id, "character-marta");
  assert.equal(lesson.characters[0].role, "main");
  assert.equal(lesson.characters[0].age, "34");
  assert.equal(lesson.characters[0].sex, "Woman");
  assert.equal(lesson.characters[0].background, "Polish");
  assert.equal(lesson.characters[0].appearanceDescription, "");
  assert.deepEqual(lesson.characters[0].notes, []);
  assert.equal(lesson.characters[0].generationStatus, "not_started");
  assert.equal(lesson.characters[1].appearanceDescription, "");
  assert.deepEqual(lesson.characters[1].notes, []);
  assert.deepEqual(lesson.reusable.noteTags, ["clear face"]);
  assert.equal(lesson.charactersMeta.model, "test-model");
});

test("extraction response may omit Setup main but saved lesson still includes it", async () => {
  const project = await store.createProject(lockedLessonPatch());
  const lesson = await extractCharactersForProject(project.id, {
    client: fakeClientWithResponse({
      characters: [validExtractionPatch().characters[1]]
    }),
    model: "test-model",
    now: "2026-09-09T12:00:00.000Z"
  });

  const marta = lesson.characters.find((character) => character.name === "Marta");
  assert(marta);
  assert.equal(marta.id, "character-marta");
  assert.equal(marta.role, "main");
  assert.equal(marta.age, "34");
  assert.equal(marta.sex, "Woman");
  assert.equal(marta.background, "Polish");
  assert.equal(marta.appearanceDescription, "");
  assert.equal(marta.generationStatus, "not_started");
});

test("conflicting Setup main values are overridden by Setup data", async () => {
  const project = await store.createProject(lockedLessonPatch());
  const lesson = await extractCharactersForProject(project.id, {
    client: fakeClientWithResponse({
      characters: [
        {
          ...validExtractionPatch().characters[0],
          age: "50",
          sex: "Man",
          background: "Spanish"
        }
      ]
    }),
    model: "test-model"
  });

  assert.equal(lesson.characters[0].name, "Marta");
  assert.equal(lesson.characters[0].age, "34");
  assert.equal(lesson.characters[0].sex, "Woman");
  assert.equal(lesson.characters[0].background, "Polish");
});

test("setup secondary names seed extracted records", async () => {
  const project = await store.createProject(lockedLessonPatch());
  const lesson = await extractCharactersForProject(project.id, {
    client: fakeClientWithResponse({
      characters: [
        validExtractionPatch().characters[0],
        {
          name: "Receptionist",
          role: "supporting",
          age: "",
          sex: "Unspecified",
          background: "",
          notes: [],
          storySentenceIds: ["sentence-2"]
        }
      ]
    }),
    model: "test-model"
  });

  assert.equal(lesson.characters[1].name, "Receptionist");
  assert.equal(lesson.characters[1].role, "secondary");
});

test("matching characters preserve edits, notes, appearance and generated state", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          id: "character-custom-marta",
          name: "Marta",
          role: "main",
          age: "mid 30s",
          sex: "Woman",
          background: "Polish community",
          appearanceDescription:
            "  Woman in her mid 30s with dark brown hair.  ",
          notes: ["clear face"],
          generationStatus: "generated",
          generationCount: 2,
          imagePath: "images/characters/marta.png",
          approved: true,
          stale: false
        }
      ]
    })
  );

  const lesson = await extractCharactersForProject(project.id, {
    client: fakeClientWithResponse(validExtractionPatch()),
    model: "test-model"
  });
  const marta = lesson.characters.find((character) => character.name === "Marta");

  assert.equal(marta.id, "character-custom-marta");
  assert.equal(marta.age, "mid 30s");
  assert.equal(marta.background, "Polish community");
  assert.equal(
    marta.appearanceDescription,
    "Woman in her mid 30s with dark brown hair."
  );
  assert.deepEqual(marta.notes, ["clear face"]);
  assert.equal(marta.generationStatus, "generated");
  assert.equal(marta.generationCount, 2);
  assert.equal(marta.imagePath, "images/characters/marta.png");
  assert.equal(marta.approved, true);
});

test("extracted character notes do not expand visible notes or reusable tags", () => {
  const lesson = applyExtractedCharacters(
    lockedLessonPatch({
      reusable: {
        backgrounds: ["Polish"],
        noteTags: ["tutor note"]
      }
    }),
    validExtractionPatch().characters,
    { model: "test-model", now: "2026-09-09T12:00:00.000Z" }
  );

  assert.deepEqual(
    lesson.characters.map((character) => character.notes),
    [[], []]
  );
  assert.deepEqual(lesson.reusable.noteTags, ["tutor note"]);
});

test("omitted Setup main preserves an existing generated main record", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          id: "character-existing-main",
          name: "Marta",
          role: "main",
          age: "mid 30s",
          sex: "Woman",
          background: "Polish community",
          notes: ["clear face"],
          generationStatus: "approved",
          generationCount: 3,
          imagePath: "images/characters/marta-approved.png",
          approved: true,
          stale: false
        }
      ]
    })
  );

  const lesson = await extractCharactersForProject(project.id, {
    client: fakeClientWithResponse({
      characters: [validExtractionPatch().characters[1]]
    }),
    model: "test-model"
  });
  const marta = lesson.characters.find((character) => character.name === "Marta");

  assert.equal(marta.id, "character-existing-main");
  assert.equal(marta.age, "mid 30s");
  assert.equal(marta.background, "Polish community");
  assert.equal(marta.appearanceDescription, "");
  assert.deepEqual(marta.notes, ["clear face"]);
  assert.equal(marta.generationStatus, "approved");
  assert.equal(marta.generationCount, 3);
  assert.equal(marta.imagePath, "images/characters/marta-approved.png");
  assert.equal(marta.approved, true);
});

test("omitted Setup main does not merge into unrelated existing main role", async () => {
  const project = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          id: "character-alex",
          name: "Alex",
          role: "main",
          age: "40",
          sex: "Man",
          background: "Irish",
          notes: ["existing"],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/characters/alex.png",
          approved: true,
          stale: false
        }
      ]
    })
  );

  const lesson = await extractCharactersForProject(project.id, {
    client: fakeClientWithResponse({
      characters: [validExtractionPatch().characters[1]]
    }),
    model: "test-model",
    now: "2026-09-09T12:00:00.000Z"
  });
  const marta = lesson.characters.find((character) => character.name === "Marta");
  const alex = lesson.characters.find((character) => character.name === "Alex");

  assert(marta);
  assert.equal(marta.id, "character-marta");
  assert.equal(marta.role, "main");
  assert.equal(marta.age, "34");
  assert.equal(marta.sex, "Woman");
  assert.equal(marta.background, "Polish");
  assert.equal(marta.appearanceDescription, "");

  assert(alex);
  assert.equal(alex.id, "character-alex");
  assert.equal(alex.role, "main");
  assert.equal(alex.generationStatus, "generated");
  assert.equal(alex.generationCount, 1);
  assert.equal(alex.imagePath, "images/characters/alex.png");
  assert.equal(alex.approved, true);
  assert.equal(alex.stale, true);
});

test("normalization adds and cleans character appearance descriptions", () => {
  const legacy = normalizeLesson(
    lockedLessonPatch({
      id: "lesson-existing",
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
      ]
    }),
    "lesson-existing"
  );
  assert.equal(legacy.characters[0].appearanceDescription, "");

  const messy = normalizeLesson(
    lockedLessonPatch({
      id: "lesson-existing",
      characters: [
        {
          id: "character-marta",
          name: "Marta",
          role: "main",
          age: "34",
          sex: "Woman",
          background: "Polish",
          appearanceDescription:
            "\n Woman   in her mid 30s with dark brown hair. \t ",
          notes: [],
          generationStatus: "not_started",
          generationCount: 0,
          imagePath: null,
          approved: false,
          stale: false
        }
      ]
    }),
    "lesson-existing"
  );
  assert.equal(
    messy.characters[0].appearanceDescription,
    "Woman in her mid 30s with dark brown hair."
  );
});

test("lesson validation rejects raw non-string appearance descriptions", () => {
  const lesson = normalizeLesson(lockedLessonPatch(), "lesson-existing");
  lesson.characters = [
    {
      id: "character-marta",
      name: "Marta",
      role: "main",
      age: "34",
      sex: "Woman",
      background: "Polish",
      appearanceDescription: ["brown hair"],
      notes: [],
      generationStatus: "not_started",
      generationCount: 0,
      imagePath: null,
      approved: false,
      stale: false
    }
  ];

  const result = validateLesson(lesson);
  assert.equal(result.valid, false);
  assert.deepEqual(
    result.errors.find(
      (error) => error.path === "characters[0].appearanceDescription"
    ),
    {
      path: "characters[0].appearanceDescription",
      message: "character-marta appearanceDescription must be a string."
    }
  );
});

test("different extracted main character is rejected clearly", () => {
  assert.throws(
    () =>
      validateCharacterExtraction(
        {
          characters: [
            {
              name: "Alex",
              role: "main",
              age: "",
              sex: "Unspecified",
              background: "",
              notes: [],
              storySentenceIds: ["sentence-1"]
            }
          ]
        },
        lockedLessonPatch()
      ),
    /Character extraction response is invalid/
  );
});

test("legacy locked project without lockedSentences still opens normally", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await mutatePersistedLesson(project.id, (lesson) => {
    delete lesson.story.lockedSentences;
  });

  const loaded = await store.getProject(project.id);
  assert.equal(loaded.story.status, "locked");
  assert.equal(loaded.story.lockedSentences.length, 6);
});

test("extraction rejects raw persisted missing lockedSentences", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await mutatePersistedLesson(project.id, (lesson) => {
    delete lesson.story.lockedSentences;
  });

  await assert.rejects(
    () =>
      extractCharactersForProject(project.id, {
        client: fakeClientWithResponse(validExtractionPatch()),
        model: "test-model"
      }),
    /Lock the story again before extracting characters/
  );
});

test("extraction rejects raw persisted empty lockedSentences", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await mutatePersistedLesson(project.id, (lesson) => {
    lesson.story.lockedSentences = [];
  });

  await assert.rejects(
    () =>
      extractCharactersForProject(project.id, {
        client: fakeClientWithResponse(validExtractionPatch()),
        model: "test-model"
      }),
    /Lock the story again before extracting characters/
  );
});

test("extraction rejects raw persisted mismatched lockedSentences", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await mutatePersistedLesson(project.id, (lesson) => {
    lesson.story.lockedSentences[0].text = "This is not the saved story.";
  });

  await assert.rejects(
    () =>
      extractCharactersForProject(project.id, {
        client: fakeClientWithResponse(validExtractionPatch()),
        model: "test-model"
      }),
    /Lock the story again before extracting characters/
  );
});

test("extraction accepts raw persisted valid lockedSentences", async () => {
  const project = await store.createProject(lockedLessonPatch());
  const lesson = await extractCharactersForProject(project.id, {
    client: fakeClientWithResponse(validExtractionPatch()),
    model: "test-model"
  });

  assert.equal(lesson.characters[0].name, "Marta");
});

test("unmatched generated characters are not deleted and are marked stale", () => {
  const lesson = applyExtractedCharacters(
    lockedLessonPatch({
      characters: [
        {
          id: "character-neighbour",
          name: "Neighbour",
          role: "supporting",
          age: "",
          sex: "Unspecified",
          background: "",
          notes: [],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: null,
          approved: false,
          stale: false
        }
      ]
    }),
    validExtractionPatch().characters,
    { model: "test-model", now: "2026-09-09T12:00:00.000Z" }
  );

  const neighbour = lesson.characters.find(
    (character) => character.id === "character-neighbour"
  );
  assert(neighbour);
  assert.equal(neighbour.stale, true);
  assert.match(neighbour.staleReason, /not found/);
});

test("duplicate extracted names are rejected", () => {
  assert.throws(
    () =>
      validateCharacterExtraction(
        {
          characters: [
            validExtractionPatch().characters[0],
            { ...validExtractionPatch().characters[0], name: " marta " }
          ]
        },
        lockedLessonPatch()
      ),
    /Character extraction response is invalid/
  );
});

test("non-human entities are rejected", () => {
  assert.throws(
    () =>
      validateCharacterExtraction(
        {
          characters: [
            {
              name: "Clinic dog",
              role: "supporting",
              age: "",
              sex: "Unspecified",
              background: "",
              notes: [],
              storySentenceIds: ["sentence-1"]
            }
          ]
        },
        lockedLessonPatch()
      ),
    /Character extraction response is invalid/
  );
});

test("disallowed dedicated fields are rejected", () => {
  assert.throws(
    () =>
      validateCharacterExtraction(
        {
          characters: [
            {
              ...validExtractionPatch().characters[0],
              hair: "brown"
            }
          ]
        },
        lockedLessonPatch()
      ),
    /Character extraction response is invalid/
  );
});

test("unsupported role and sex values are rejected", () => {
  assert.throws(
    () =>
      validateCharacterExtraction(
        {
          characters: [
            {
              ...validExtractionPatch().characters[0],
              role: "teacher",
              sex: "Unknown"
            }
          ]
        },
        lockedLessonPatch()
      ),
    /Character extraction response is invalid/
  );
});

test("invalid story sentence references are rejected", () => {
  assert.throws(
    () =>
      validateCharacterExtraction(
        {
          characters: [
            {
              ...validExtractionPatch().characters[0],
              storySentenceIds: ["sentence-99"]
            }
          ]
        },
        lockedLessonPatch()
      ),
    /Character extraction response is invalid/
  );
});

test("invalid model output does not mutate the saved project", async () => {
  const project = await store.createProject(lockedLessonPatch());

  await assert.rejects(
    () =>
      extractCharactersForProject(project.id, {
        client: fakeClientWithResponse({ characters: [] }),
        model: "test-model"
      }),
    /Character extraction response is invalid/
  );

  const loaded = await store.getProject(project.id);
  assert.equal(loaded.characters.length, 0);
});

test("missing API key remains a backend configuration error", async () => {
  const project = await store.createProject(lockedLessonPatch());

  await assert.rejects(
    () => extractCharactersForProject(project.id),
    /Story generation is not configured/
  );
});
