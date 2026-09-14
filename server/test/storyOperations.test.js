import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-story-ops-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;
delete process.env.OPENAI_API_KEY;

const store = await import("../src/services/projectStore.js");
const {
  lockStoryForProject,
  regenerateSentenceForProject,
  regenerateStoryForProject,
  shortenSentenceForProject,
  unlockStoryForProject
} = await import("../src/services/storyGenerationService.js");
const { validateStorySentenceOperation } = await import(
  "../src/services/validateStoryGeneration.js"
);

function completeLessonPatch(overrides = {}) {
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
      status: "draft",
      lockedAt: null,
      lockedSentences: [],
      modifiedAfterLock: false,
      sentences: [
        { id: "sentence-1", number: 1, text: "Marta walks to the clinic." },
        { id: "sentence-2", number: 2, text: "She asks for help." },
        { id: "sentence-3", number: 3, text: "The receptionist smiles." },
        { id: "sentence-4", number: 4, text: "Marta gives her name." },
        { id: "sentence-5", number: 5, text: "She waits near the desk." },
        { id: "sentence-6", number: 6, text: "Marta gets an appointment." }
      ]
    },
    characters: [],
    scenes: [],
    currentStage: "story",
    ...overrides
  };
}

function generatedSentences(count) {
  return Array.from({ length: count }, (_item, index) => ({
    text: `Marta has new story sentence ${index + 1}.`
  }));
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

test("one-sentence validation accepts a trimmed sentence object", () => {
  const result = validateStorySentenceOperation({
    sentence: { text: " Marta asks for help. " }
  });

  assert.equal(result.sentence.text, "Marta asks for help.");
});

test("one-sentence validation rejects numbering", () => {
  assert.throws(
    () => validateStorySentenceOperation({ sentence: { text: "1. Marta waits." } }),
    /Story sentence response is invalid/
  );
});

test("regenerate one sentence updates only the selected sentence", async () => {
  const project = await store.createProject(completeLessonPatch());

  const lesson = await regenerateSentenceForProject(project.id, "sentence-2", {
    client: fakeClientWithResponse({
      sentence: { text: "Marta asks the receptionist for help." }
    }),
    model: "test-model",
    now: "2026-09-05T12:00:00.000Z"
  });

  assert.deepEqual(
    lesson.story.sentences.map(({ id, number, text }) => ({ id, number, text })),
    [
      { id: "sentence-1", number: 1, text: "Marta walks to the clinic." },
      {
        id: "sentence-2",
        number: 2,
        text: "Marta asks the receptionist for help."
      },
      { id: "sentence-3", number: 3, text: "The receptionist smiles." },
      { id: "sentence-4", number: 4, text: "Marta gives her name." },
      { id: "sentence-5", number: 5, text: "She waits near the desk." },
      { id: "sentence-6", number: 6, text: "Marta gets an appointment." }
    ]
  );
  assert.equal(lesson.story.sentences[1].source, "regenerated");
});

test("regenerate one sentence rejects locked story without changing it", async () => {
  const project = await store.createProject(
    completeLessonPatch({
      story: {
        status: "locked",
        lockedAt: "2026-09-05T11:00:00.000Z",
        lockedSentences: [
          { id: "sentence-1", number: 1, text: "Marta walks to the clinic." }
        ],
        modifiedAfterLock: false,
        sentences: [
          { id: "sentence-1", number: 1, text: "Marta walks to the clinic." }
        ]
      }
    })
  );

  await assert.rejects(
    () =>
      regenerateSentenceForProject(project.id, "sentence-1", {
        client: fakeClientWithResponse({ sentence: { text: "Marta goes in." } }),
        model: "test-model"
      }),
    /Unlock the story before editing it/
  );

  const loaded = await store.getProject(project.id);
  assert.equal(loaded.story.sentences[0].text, "Marta walks to the clinic.");
});

test("regenerate one sentence rejects missing sentence id", async () => {
  const project = await store.createProject(completeLessonPatch());

  await assert.rejects(
    () =>
      regenerateSentenceForProject(project.id, "sentence-99", {
        client: fakeClientWithResponse({ sentence: { text: "Marta waits." } }),
        model: "test-model"
      }),
    /Story sentence not found/
  );
});

test("shorten one sentence updates only selected sentence", async () => {
  const project = await store.createProject(completeLessonPatch());

  const lesson = await shortenSentenceForProject(project.id, "sentence-2", {
    client: fakeClientWithResponse({ sentence: { text: "She asks for help." } }),
    model: "test-model",
    now: "2026-09-05T12:00:00.000Z"
  });

  assert.equal(lesson.story.sentences[1].id, "sentence-2");
  assert.equal(lesson.story.sentences[1].number, 2);
  assert.equal(lesson.story.sentences[1].text, "She asks for help.");
  assert.equal(lesson.story.sentences[1].source, "shortened");
  assert.equal(lesson.story.sentences[0].text, "Marta walks to the clinic.");
});

test("shorten one sentence preserves existing story on invalid model output", async () => {
  const project = await store.createProject(completeLessonPatch());

  await assert.rejects(
    () =>
      shortenSentenceForProject(project.id, "sentence-2", {
        client: fakeClientWithResponse({
          sentence: {
            text: "Marta asks the kind receptionist for help with an appointment today."
          }
        }),
        model: "test-model"
      }),
    /Story sentence response is invalid/
  );

  const loaded = await store.getProject(project.id);
  assert.equal(loaded.story.sentences[1].text, "She asks for help.");
});

test("whole-story regenerate requires overwrite confirmation", async () => {
  const project = await store.createProject(completeLessonPatch());

  await assert.rejects(
    () =>
      regenerateStoryForProject(project.id, {
        client: fakeClientWithResponse({ sentences: generatedSentences(6) }),
        model: "test-model"
      }),
    /Confirm overwrite/
  );
});

test("whole-story regenerate preserves existing story on invalid output", async () => {
  const project = await store.createProject(completeLessonPatch());

  await assert.rejects(
    () =>
      regenerateStoryForProject(project.id, {
        confirmedOverwrite: true,
        client: fakeClientWithResponse({ sentences: generatedSentences(5) }),
        model: "test-model"
      }),
    /Generated story response is invalid/
  );

  const loaded = await store.getProject(project.id);
  assert.equal(loaded.story.sentences[0].text, "Marta walks to the clinic.");
});

test("whole-story regenerate marks downstream records stale without deleting them", async () => {
  const project = await store.createProject(
    completeLessonPatch({
      characters: [
        {
          id: "character-marta",
          name: "Marta",
          role: "main",
          age: "34",
          sex: "Woman",
          background: "Polish",
          notes: [],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/characters/marta.png",
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
          location: "Clinic",
          description: "",
          characterIds: ["character-marta"],
          imageMode: "generate",
          reuseSceneId: null,
          generationStatus: "approved",
          generationCount: 1,
          imagePath: "images/scenes/scene-1.png",
          approved: true,
          stale: false
        }
      ]
    })
  );

  const lesson = await regenerateStoryForProject(project.id, {
    confirmedOverwrite: true,
    client: fakeClientWithResponse({ sentences: generatedSentences(6) }),
    model: "test-model",
    now: "2026-09-05T12:00:00.000Z"
  });

  assert.equal(lesson.characters.length, 1);
  assert.equal(lesson.scenes.length, 1);
  assert.equal(lesson.characters[0].stale, true);
  assert.equal(lesson.scenes[0].stale, true);
  assert.equal(lesson.media.stale, true);
  assert.equal(lesson.export.stale, true);
});

test("lock story creates an exact locked sentence snapshot", async () => {
  const project = await store.createProject(completeLessonPatch());

  const lesson = await lockStoryForProject(project.id, {
    now: "2026-09-05T12:00:00.000Z"
  });

  assert.equal(lesson.story.status, "locked");
  assert.equal(lesson.story.lockedAt, "2026-09-05T12:00:00.000Z");
  assert.deepEqual(
    lesson.story.lockedSentences,
    lesson.story.sentences.map((sentence) => ({
      id: sentence.id,
      number: sentence.number,
      text: sentence.text
    }))
  );
});

test("unlock story preserves sentences, locked snapshot and downstream records", async () => {
  const project = await store.createProject(
    completeLessonPatch({
      characters: [
        {
          id: "character-marta",
          name: "Marta",
          role: "main",
          age: "34",
          sex: "Woman",
          background: "Polish",
          notes: [],
          generationStatus: "generated",
          generationCount: 1,
          imagePath: "images/characters/marta.png",
          approved: false,
          stale: false
        }
      ]
    })
  );
  const locked = await lockStoryForProject(project.id, {
    now: "2026-09-05T12:00:00.000Z"
  });

  const lesson = await unlockStoryForProject(project.id, {
    confirmedUnlock: true
  });

  assert.equal(lesson.story.status, "draft");
  assert.deepEqual(lesson.story.sentences, locked.story.sentences);
  assert.deepEqual(lesson.story.lockedSentences, locked.story.lockedSentences);
  assert.equal(lesson.characters.length, 1);
});
