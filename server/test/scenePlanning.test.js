import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-scenes-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;
delete process.env.OPENAI_API_KEY;

const store = await import("../src/services/projectStore.js");
const { normalizeLesson } = await import("../src/services/normalizeLesson.js");
const {
  applyScenePlan,
  planScenesForProject
} = await import("../src/services/scenePlanningService.js");
const { buildScenePlanningPrompt } = await import("../src/prompts/scenePrompts.js");
const {
  validateScenePlan
} = await import("../src/services/validateScenePlan.js");
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
    characters: approvedCharacters(),
    scenes: [],
    reusable: {
      backgrounds: ["Polish"],
      noteTags: ["clear face"]
    },
    currentStage: "scenes",
    ...overrides
  };
}

function approvedCharacters() {
  return [
    {
      id: "character-marta",
      name: "Marta",
      role: "main",
      age: "34",
      sex: "Woman",
      background: "Polish",
      notes: ["clear face"],
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
      generationStatus: "approved",
      generationCount: 1,
      imagePath: "images/characters/receptionist.png",
      approved: true,
      stale: false
    },
    {
      id: "character-doctor",
      name: "Doctor",
      role: "secondary",
      age: "",
      sex: "Unspecified",
      background: "",
      notes: ["clinic room"],
      generationStatus: "approved",
      generationCount: 1,
      imagePath: "images/characters/doctor.png",
      approved: true,
      stale: false
    }
  ];
}

function validPlanPatch() {
  return {
    scenes: [
      {
        label: "Scene 1",
        sentenceIds: ["sentence-1", "sentence-2", "sentence-3"],
        location: "Clinic reception desk",
        description: "Marta speaks with the receptionist at the desk.",
        characterIds: ["character-marta", "character-receptionist"],
        imageMode: "generate",
        reuseSceneId: null
      },
      {
        label: "Scene 2",
        sentenceIds: ["sentence-4", "sentence-5", "sentence-6"],
        location: "Clinic room",
        description: "Marta talks with the doctor and books another appointment.",
        characterIds: ["character-marta", "character-doctor"],
        imageMode: "generate",
        reuseSceneId: null
      }
    ]
  };
}

function fakeClientWithResponse(response, calls = []) {
  return {
    responses: {
      create: async (request) => {
        calls.push(request);
        return {
          output_text: JSON.stringify(response)
        };
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

test("scene planning requires lessonId", async () => {
  await assert.rejects(
    () => planScenesForProject(""),
    /Request body must include lessonId/
  );
});

test("scene planning rejects missing projects", async () => {
  await assert.rejects(
    () =>
      planScenesForProject("lesson-missing", {
        client: fakeClientWithResponse(validPlanPatch())
      }),
    /Project not found/
  );
});

test("scene planning rejects draft stories", async () => {
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
      planScenesForProject(project.id, {
        client: fakeClientWithResponse(validPlanPatch())
      }),
    /Lock the story before planning scenes/
  );
});

test("scene planning rejects invalid locked snapshots", async () => {
  const project = await store.createProject(lockedLessonPatch());
  await mutatePersistedLesson(project.id, (lesson) => {
    lesson.story.lockedSentences = [];
  });

  await assert.rejects(
    () =>
      planScenesForProject(project.id, {
        client: fakeClientWithResponse(validPlanPatch())
      }),
    /Locked story snapshot is empty or invalid/
  );
});

test("scene planning requires approved character references", async () => {
  const noCharacters = await store.createProject(lockedLessonPatch({ characters: [] }));
  await assert.rejects(
    () =>
      planScenesForProject(noCharacters.id, {
        client: fakeClientWithResponse(validPlanPatch())
      }),
    /Extract characters/
  );

  const unapproved = await store.createProject(
    lockedLessonPatch({
      characters: [
        {
          ...approvedCharacters()[0],
          generationStatus: "generated",
          approved: false
        }
      ]
    })
  );
  await assert.rejects(
    () =>
      planScenesForProject(unapproved.id, {
        client: fakeClientWithResponse(validPlanPatch())
      }),
    /Approve character references/
  );

  const stale = await store.createProject(
    lockedLessonPatch({
      characters: [{ ...approvedCharacters()[0], stale: true }]
    })
  );
  await assert.rejects(
    () =>
      planScenesForProject(stale.id, {
        client: fakeClientWithResponse(validPlanPatch())
      }),
    /Review stale characters/
  );

  const noImage = await store.createProject(
    lockedLessonPatch({
      characters: [{ ...approvedCharacters()[0], imagePath: null }]
    })
  );
  await assert.rejects(
    () =>
      planScenesForProject(noImage.id, {
        client: fakeClientWithResponse(validPlanPatch())
      }),
    /Approve character references/
  );
});

test("valid scene plan creates records and saves metadata", async () => {
  const calls = [];
  const project = await store.createProject(lockedLessonPatch());
  const lesson = await planScenesForProject(project.id, {
    client: fakeClientWithResponse(validPlanPatch(), calls),
    model: "test-model",
    now: "2026-09-09T12:00:00.000Z"
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "test-model");
  assert.equal(lesson.scenes.length, 2);
  assert.equal(lesson.scenes[0].id, "scene-1");
  assert.deepEqual(lesson.scenes[0].sentenceIds, [
    "sentence-1",
    "sentence-2",
    "sentence-3"
  ]);
  assert.equal(lesson.scenes[0].generationStatus, "not_started");
  assert.equal(lesson.scenes[0].visualDirection, "");
  assert.equal(lesson.scenesMeta.model, "test-model");
  assert.equal(lesson.scenesMeta.promptVersion, "scene-plan-v1");

  const persisted = await store.getProject(project.id);
  assert.equal(persisted.scenes.length, 2);
});

test("backend normalization adds and bounds scene visual direction", () => {
  const normalized = normalizeLesson({
    id: "lesson-safe",
    story: {
      sentences: [{ id: "sentence-1", number: 1, text: "Marta waits." }]
    },
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "not_started"
      },
      {
        id: "scene-2",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "not_started",
        visualDirection: "  Marta   looks  at  the  appointment  sheet.  "
      },
      {
        id: "scene-3",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "not_started",
        visualDirection: "x".repeat(900)
      }
    ]
  });

  assert.equal(normalized.scenes[0].visualDirection, "");
  assert.equal(
    normalized.scenes[1].visualDirection,
    "Marta looks at the appointment sheet."
  );
  assert.equal(normalized.scenes[2].visualDirection.length, 800);
  assert.deepEqual(validateLesson(normalized), { valid: true, errors: [] });
});

test("backend validation rejects invalid scene visual direction values", () => {
  const invalidType = validateLesson({
    ...normalizeLesson({
      id: "lesson-safe",
      story: {
        sentences: [{ id: "sentence-1", number: 1, text: "Marta waits." }]
      }
    }),
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "not_started",
        visualDirection: ["hold phone"]
      }
    ]
  });
  const tooLong = validateLesson({
    ...normalizeLesson({
      id: "lesson-safe",
      story: {
        sentences: [{ id: "sentence-1", number: 1, text: "Marta waits." }]
      }
    }),
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "not_started",
        visualDirection: "x".repeat(801)
      }
    ]
  });

  assert(
    invalidType.errors.some(
      (error) =>
        error.path === "scenes[0].visualDirection" &&
        error.message === "scene-1 visualDirection must be a string."
    )
  );
  assert(
    tooLong.errors.some(
      (error) =>
        error.path === "scenes[0].visualDirection" &&
        error.message === "scene-1 visualDirection is too long."
    )
  );
});

test("scene planning prompt includes locked story and approved characters", () => {
  const prompt = buildScenePlanningPrompt(lockedLessonPatch());
  const serialized = JSON.stringify(prompt);

  assert.match(serialized, /sentence-1/);
  assert.match(serialized, /Marta walks to the clinic/);
  assert.match(serialized, /character-marta/);
  assert.match(serialized, /Receptionist/);
  assert.doesNotMatch(serialized, /\bA1\b|\bA2\b|\bB1\b|CEFR/);
});

test("scene plan validation rejects interleaved sentence coverage", () => {
  const lesson = lockedLessonPatch();

  assert.throws(
    () =>
      validateScenePlan(
        {
          scenes: [
            {
              label: "Scene 1",
              sentenceIds: ["sentence-1", "sentence-3"],
              location: "Clinic reception desk",
              description:
                "The first and third story beats are incorrectly grouped around another scene.",
              characterIds: ["character-marta", "character-receptionist"],
              imageMode: "generate",
              reuseSceneId: null
            },
            {
              label: "Scene 2",
              sentenceIds: ["sentence-2"],
              location: "Clinic reception desk",
              description: "The second story beat is interleaved after a later beat.",
              characterIds: ["character-marta", "character-receptionist"],
              imageMode: "generate",
              reuseSceneId: null
            },
            {
              label: "Scene 3",
              sentenceIds: ["sentence-4", "sentence-5", "sentence-6"],
              location: "Clinic room",
              description: "The remaining story beats continue in order.",
              characterIds: ["character-marta", "character-doctor"],
              imageMode: "generate",
              reuseSceneId: null
            }
          ]
        },
        lesson
      ),
    /Scene planning response is invalid/
  );
});

test("scene plan validation rejects invalid model output", () => {
  const lesson = lockedLessonPatch();

  assert.throws(
    () =>
      validateScenePlan(
        {
          scenes: [
            {
              ...validPlanPatch().scenes[0],
              sentenceIds: ["sentence-missing"]
            }
          ]
        },
        lesson
      ),
    /Scene planning response is invalid/
  );
  assert.throws(
    () =>
      validateScenePlan(
        {
          scenes: [{ ...validPlanPatch().scenes[0] }]
        },
        lesson
      ),
    /Scene planning response is invalid/
  );
  assert.throws(
    () =>
      validateScenePlan(
        {
          scenes: [
            validPlanPatch().scenes[0],
            {
              ...validPlanPatch().scenes[1],
              sentenceIds: ["sentence-3", "sentence-4", "sentence-5", "sentence-6"]
            }
          ]
        },
        lesson
      ),
    /Scene planning response is invalid/
  );
  assert.throws(
    () =>
      validateScenePlan(
        {
          scenes: [
            {
              ...validPlanPatch().scenes[0],
              characterIds: ["character-unknown"]
            },
            validPlanPatch().scenes[1]
          ]
        },
        lesson
      ),
    /Scene planning response is invalid/
  );
  assert.throws(
    () =>
      validateScenePlan(
        {
          scenes: [
            {
              ...validPlanPatch().scenes[0],
              imagePrompt: "Make a finished illustration."
            },
            validPlanPatch().scenes[1]
          ]
        },
        lesson
      ),
    /Scene planning response is invalid/
  );
});

test("invalid model output does not mutate the saved project", async () => {
  const project = await store.createProject(lockedLessonPatch());
  const before = await store.getProject(project.id);

  await assert.rejects(
    () =>
      planScenesForProject(project.id, {
        client: fakeClientWithResponse({
          scenes: [
            {
              ...validPlanPatch().scenes[0],
              sentenceIds: ["sentence-1"]
            }
          ]
        })
      }),
    /Scene planning response is invalid/
  );

  const after = await store.getProject(project.id);
  assert.deepEqual(after, before);
});

test("scene planning merge preserves matching generated scene state", () => {
  const lesson = lockedLessonPatch({
    scenes: [
      {
        id: "scene-custom",
        number: 1,
        label: "Reception",
        sentenceIds: ["sentence-1", "sentence-2", "sentence-3"],
        location: "Clinic reception desk",
        description: "Marta speaks with the receptionist at the desk.",
        visualDirection: "Marta holds her phone beside the appointment sheet.",
        characterIds: ["character-marta", "character-receptionist"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "approved",
        generationCount: 2,
        imagePath: "images/scenes/reception.png",
        approved: true,
        stale: false
      }
    ]
  });

  const updated = applyScenePlan(lesson, validPlanPatch().scenes, {
    model: "test-model",
    now: "2026-09-09T12:00:00.000Z"
  });

  assert.equal(updated.scenes[0].id, "scene-custom");
  assert.equal(updated.scenes[0].generationStatus, "approved");
  assert.equal(updated.scenes[0].generationCount, 2);
  assert.equal(updated.scenes[0].imagePath, "images/scenes/reception.png");
  assert.equal(
    updated.scenes[0].visualDirection,
    "Marta holds her phone beside the appointment sheet."
  );
  assert.equal(updated.scenes[0].approved, true);
  assert.equal(updated.scenes[0].stale, false);
});

test("scene planning merge marks changed and unmatched generated scenes stale", () => {
  const lesson = lockedLessonPatch({
    scenes: [
      {
        id: "scene-existing",
        number: 1,
        label: "Old first scene",
        sentenceIds: ["sentence-1", "sentence-2"],
        location: "Old location",
        description: "Old description.",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: "images/scenes/old-first.png",
        approved: false,
        stale: false
      },
      {
        id: "scene-unmatched",
        number: 2,
        label: "Old last scene",
        sentenceIds: ["sentence-6"],
        location: "Old room",
        description: "Old ending.",
        characterIds: ["character-marta"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "approved",
        generationCount: 1,
        imagePath: "images/scenes/old-last.png",
        approved: true,
        stale: false
      }
    ]
  });

  const updated = applyScenePlan(lesson, validPlanPatch().scenes, {
    model: "test-model",
    now: "2026-09-09T12:00:00.000Z"
  });

  assert.equal(updated.scenes[0].id, "scene-existing");
  assert.equal(updated.scenes[0].imagePath, "images/scenes/old-first.png");
  assert.equal(updated.scenes[0].stale, true);
  assert.equal(
    updated.scenes[0].staleReason,
    "Scene plan changed after image generation."
  );

  const unmatched = updated.scenes.find((scene) => scene.id === "scene-unmatched");
  assert(unmatched);
  assert.equal(unmatched.stale, true);
  assert.equal(
    unmatched.staleReason,
    "Scene was not found in the latest scene plan."
  );
});
