import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tempProjectsDir = await fs.mkdtemp(path.join(os.tmpdir(), "lsb-story-"));
process.env.PROJECT_DATA_DIR = tempProjectsDir;
delete process.env.OPENAI_API_KEY;

const { getOpenAIClient, OpenAIConfigurationError } = await import(
  "../src/services/openaiClient.js"
);
const store = await import("../src/services/projectStore.js");
const { generateStoryForProject } = await import(
  "../src/services/storyGenerationService.js"
);
const { validateSetup } = await import("../src/services/validateSetup.js");
const { validateStoryGeneration } = await import(
  "../src/services/validateStoryGeneration.js"
);

function completeLessonPatch() {
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
      modifiedAfterLock: false,
      sentences: [
        {
          id: "sentence-1",
          number: 1,
          text: "Existing story stays here.",
          stale: false
        }
      ]
    },
    currentStage: "setup"
  };
}

function lessonPatchWithoutStory() {
  return {
    ...completeLessonPatch(),
    story: {
      status: "draft",
      lockedAt: null,
      lockedSentences: [],
      modifiedAfterLock: false,
      sentences: []
    }
  };
}

function generatedSentences(count) {
  return Array.from({ length: count }, (_item, index) => ({
    text: `Marta says sentence ${index + 1}.`
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

test("backend setup validation rejects missing required fields", () => {
  const validation = validateSetup({
    learnerLevel: "Literacies Plus",
    sentenceCount: 6,
    setup: { mainCharacter: {}, secondaryCharacters: [] }
  });

  assert.equal(validation.valid, false);
  assert(validation.errors.some((error) => error.field === "theme"));
  assert(validation.errors.some((error) => error.field === "scenario"));
});

test("backend setup validation accepts minimum complete setup", () => {
  const validation = validateSetup(completeLessonPatch());
  assert.deepEqual(validation, { valid: true, errors: [] });
});

test("story response validation accepts valid structured output", () => {
  const result = validateStoryGeneration(
    { sentences: generatedSentences(6) },
    completeLessonPatch()
  );

  assert.equal(result.sentences.length, 6);
  assert.equal(result.sentences[0].text, "Marta says sentence 1.");
});

test("story response validation rejects wrong sentence count", () => {
  assert.throws(
    () =>
      validateStoryGeneration(
        { sentences: generatedSentences(5) },
        completeLessonPatch()
      ),
    /Generated story response is invalid/
  );
});

test("story response validation rejects empty sentence text", () => {
  assert.throws(
    () =>
      validateStoryGeneration(
        { sentences: [{ text: "" }, ...generatedSentences(5)] },
        completeLessonPatch()
      ),
    /Generated story response is invalid/
  );
});

test("story response validation rejects numbered sentence text", () => {
  assert.throws(
    () =>
      validateStoryGeneration(
        { sentences: [{ text: "1. Marta waits." }, ...generatedSentences(5)] },
        completeLessonPatch()
      ),
    /Generated story response is invalid/
  );
});

test("story response validation rejects unsupported external level labels", () => {
  assert.throws(
    () =>
      validateStoryGeneration(
        { sentences: [{ text: `This is ${"A" + "1"} practice.` }, ...generatedSentences(5)] },
        completeLessonPatch()
      ),
    /Generated story response is invalid/
  );
});

test("missing API key returns a typed configuration error", () => {
  assert.throws(() => getOpenAIClient(), OpenAIConfigurationError);
});

test("generation service preserves existing story on invalid model output", async () => {
  const project = await store.createProject(completeLessonPatch());
  await assert.rejects(
    () =>
      generateStoryForProject(project.id, {
        client: fakeClientWithResponse({ sentences: generatedSentences(5) }),
        model: "test-model",
        now: "2026-09-05T12:00:00.000Z",
        confirmedOverwrite: true
      }),
    /Generated story response is invalid/
  );

  const loaded = await store.getProject(project.id);
  assert.equal(loaded.story.sentences.length, 1);
  assert.equal(loaded.story.sentences[0].text, "Existing story stays here.");
});

test("generation service requires confirmation before replacing an existing story", async () => {
  const project = await store.createProject(completeLessonPatch());

  await assert.rejects(
    () =>
      generateStoryForProject(project.id, {
        client: fakeClientWithResponse({ sentences: generatedSentences(6) }),
        model: "test-model",
        now: "2026-09-05T12:00:00.000Z"
      }),
    /Confirm overwrite before generating a new story/
  );

  const loaded = await store.getProject(project.id);
  assert.equal(loaded.story.sentences.length, 1);
  assert.equal(loaded.story.sentences[0].text, "Existing story stays here.");
});

test("generation service saves a validated generated draft", async () => {
  const project = await store.createProject(lessonPatchWithoutStory());
  const lesson = await generateStoryForProject(project.id, {
    client: fakeClientWithResponse({ sentences: generatedSentences(6) }),
    model: "test-model",
    now: "2026-09-05T12:00:00.000Z"
  });

  assert.equal(lesson.currentStage, "story");
  assert.equal(lesson.story.status, "draft");
  assert.equal(lesson.story.sentences.length, 6);
  assert.equal(lesson.story.sentences[0].source, "generated");
  assert.equal(lesson.story.generationMeta.model, "test-model");

  const persisted = JSON.parse(
    await fs.readFile(path.join(tempProjectsDir, project.id, "lesson.json"), "utf8")
  );
  assert.equal(persisted.story.sentences.length, 6);
});
