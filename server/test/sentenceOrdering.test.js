import assert from "node:assert/strict";
import test from "node:test";

import { normalizeLesson } from "../src/services/normalizeLesson.js";
import { validateLesson } from "../src/services/validateLesson.js";

test("backend normalization preserves sentence array order and recalculates numbers", () => {
  const normalized = normalizeLesson({
    id: "lesson-safe",
    story: {
      sentences: [
        {
          id: "sentence-3",
          number: 3,
          text: "Now first.",
          stale: false
        },
        {
          id: "sentence-1",
          number: 1,
          text: "Now second.",
          stale: false
        }
      ]
    }
  });

  assert.deepEqual(
    normalized.story.sentences.map(({ id, number, text }) => ({
      id,
      number,
      text
    })),
    [
      { id: "sentence-3", number: 1, text: "Now first." },
      { id: "sentence-1", number: 2, text: "Now second." }
    ]
  );
});

test("backend validation accepts non-sequential sentence ids", () => {
  const lesson = normalizeLesson({
    id: "lesson-safe",
    story: {
      sentences: [
        { id: "sentence-9", number: 1, text: "First displayed sentence." },
        { id: "sentence-2", number: 2, text: "Second displayed sentence." }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-9", "sentence-2"],
        characterIds: [],
        generationStatus: "not_started"
      }
    ]
  });

  assert.deepEqual(validateLesson(lesson), { valid: true, errors: [] });
});

test("backend validation rejects scene references to missing sentence ids", () => {
  const lesson = normalizeLesson({
    id: "lesson-safe",
    story: {
      sentences: [
        { id: "sentence-9", number: 1, text: "First displayed sentence." }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-2"],
        characterIds: [],
        generationStatus: "not_started"
      }
    ]
  });

  const result = validateLesson(lesson);

  assert.equal(result.valid, false);
  assert(
    result.errors.some(
      (error) =>
        error.path === "scenes[0].sentenceIds" &&
        error.message === "scene-1 references missing sentence sentence-2."
    )
  );
});

test("backend validation accepts edited stories below the setup sentence target", () => {
  const lesson = normalizeLesson({
    id: "lesson-safe",
    sentenceCount: 6,
    story: {
      sentences: [
        { id: "sentence-2", number: 1, text: "Anita phones the doctor." },
        { id: "sentence-3", number: 2, text: "The receptionist answers." }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-2"],
        characterIds: [],
        generationStatus: "not_started"
      },
      {
        id: "scene-2",
        sentenceIds: [],
        characterIds: [],
        generationStatus: "not_started"
      }
    ]
  });

  assert.deepEqual(validateLesson(lesson), { valid: true, errors: [] });
});

test("backend validation accepts edited stories above the setup sentence target", () => {
  const lesson = normalizeLesson({
    id: "lesson-safe",
    sentenceCount: 6,
    story: {
      sentences: Array.from({ length: 7 }, (_item, index) => ({
        id: `sentence-${index + 1}`,
        number: index + 1,
        text: `Sentence ${index + 1}.`
      }))
    },
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1", "sentence-7"],
        characterIds: [],
        generationStatus: "not_started"
      }
    ]
  });

  assert.deepEqual(validateLesson(lesson), { valid: true, errors: [] });
});

test("backend validation rejects story sentences without required text", () => {
  const lesson = normalizeLesson({
    id: "lesson-safe",
    story: {
      sentences: [{ id: "sentence-9", number: 1, text: "" }]
    }
  });

  const result = validateLesson(lesson);

  assert.equal(result.valid, false);
  assert(
    result.errors.some(
      (error) =>
        error.path === "story.sentences[0].text" &&
        error.message === "sentence-9 is missing text."
    )
  );
});
