import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyLesson } from "../src/data/createLesson.js";
import { createPlaceholderStory } from "../src/utils/createPlaceholderStory.js";
import {
  getSetupFieldError,
  isSetupComplete,
  validateSetup
} from "../src/utils/validateSetup.js";

function completeMinimumSetup(overrides = {}) {
  return createEmptyLesson({
    theme: "Everyday services",
    learnerLevel: "Literacies Plus",
    setting: "A council office",
    scenario: "The main character asks for help with a form.",
    sentenceCount: 9,
    setup: {
      mainCharacter: {
        name: "Marta",
        age: "34",
        sex: "Woman",
        background: "Polish"
      }
    },
    ...overrides
  });
}

test("empty lesson is not setup complete", () => {
  const result = validateSetup(createEmptyLesson());

  assert.equal(result.valid, false);
  assert.equal(getSetupFieldError(result.errors, "theme"), "Enter a theme.");
  assert.equal(
    getSetupFieldError(result.errors, "setup.mainCharacter.name"),
    "Enter the main character name."
  );
});

test("whitespace-only required text fields are invalid", () => {
  const result = validateSetup(
    completeMinimumSetup({
      theme: "  ",
      setup: {
        mainCharacter: {
          name: "Marta",
          age: " ",
          sex: "Woman",
          background: "Polish"
        }
      }
    })
  );

  assert.equal(result.valid, false);
  assert.equal(getSetupFieldError(result.errors, "theme"), "Enter a theme.");
  assert.equal(
    getSetupFieldError(result.errors, "setup.mainCharacter.age"),
    "Enter an age or age range."
  );
});

test("complete minimum setup is valid and optional fields may stay blank", () => {
  const lesson = completeMinimumSetup({
    title: "",
    setup: {
      mainCharacter: {
        name: "Marta",
        age: "34",
        sex: "Unspecified",
        background: "Polish"
      },
      secondaryCharacters: [],
      targetVocabulary: "",
      additionalNotes: ""
    }
  });

  assert.equal(isSetupComplete(lesson), true);
});

test("invalid learner level and sentence count are invalid", () => {
  const result = validateSetup(
    completeMinimumSetup({
      learnerLevel: "Level 3",
      sentenceCount: 7
    })
  );

  assert.equal(result.valid, false);
  assert.equal(getSetupFieldError(result.errors, "learnerLevel"), "Choose a learner level.");
  assert.equal(
    getSetupFieldError(result.errors, "sentenceCount"),
    "Choose the number of sentences."
  );
});

test("invalid sex or gender value is invalid", () => {
  const result = validateSetup(
    completeMinimumSetup({
      setup: {
        mainCharacter: {
          name: "Marta",
          age: "34",
          sex: "Unknown option",
          background: "Polish"
        }
      }
    })
  );

  assert.equal(result.valid, false);
  assert.equal(
    getSetupFieldError(result.errors, "setup.mainCharacter.sex"),
    "Choose sex or gender."
  );
});

test("placeholder story respects sentence count", () => {
  const lesson = completeMinimumSetup({ sentenceCount: 6 });
  const result = createPlaceholderStory(lesson);

  assert.equal(result.story.status, "draft");
  assert.equal(result.story.lockedAt, null);
  assert.equal(result.story.modifiedAfterLock, false);
  assert.equal(result.story.sentences.length, 6);
  assert.deepEqual(
    result.story.sentences.map((sentence) => sentence.id),
    ["sentence-1", "sentence-2", "sentence-3", "sentence-4", "sentence-5", "sentence-6"]
  );
});
