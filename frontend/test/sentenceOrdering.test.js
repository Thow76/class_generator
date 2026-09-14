import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyLesson } from "../src/data/createLesson.js";
import {
  addSceneSentenceReference,
  addStorySentence,
  deleteStorySentence,
  moveStorySentence,
  removeSceneSentenceReference,
  renumberSentences,
  replaceSceneSentenceReferences,
  updateStorySentence
} from "../src/utils/lessonUpdates.js";
import {
  getSceneSentenceRecords,
  getStorySentencePositionMap,
  getUnassignedStorySentences,
  normalizeSceneSentenceIds
} from "../src/utils/lessonSelectors.js";
import { normalizeLessonForClient } from "../src/utils/normalizeLesson.js";
import { validateLessonShape } from "../src/utils/validateLessonShape.js";

test("frontend normalization preserves sentence array order and recalculates numbers", () => {
  const lesson = createEmptyLesson({
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

  const normalized = normalizeLessonForClient(lesson);

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

test("frontend normalization derives locked snapshots for legacy locked lessons", () => {
  const lesson = createEmptyLesson({
    story: {
      status: "locked",
      lockedAt: "2026-09-05T12:00:00.000Z",
      sentences: [
        {
          id: "sentence-7",
          number: 3,
          text: "Legacy locked text.",
          stale: false
        }
      ]
    }
  });

  const normalized = normalizeLessonForClient(lesson);

  assert.deepEqual(normalized.story.lockedSentences, [
    {
      id: "sentence-7",
      number: 1,
      text: "Legacy locked text."
    }
  ]);
  assert.deepEqual(validateLessonShape(normalized), []);
});

test("manual sentence edits update by stable id and keep display numbers derived", () => {
  const lesson = createEmptyLesson({
    story: {
      status: "locked",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        {
          id: "sentence-9",
          number: 9,
          text: "First sentence.",
          stale: false
        },
        {
          id: "sentence-2",
          number: 2,
          text: "Second sentence.",
          stale: false
        }
      ]
    },
    characters: [
      {
        id: "character-1",
        name: "Anita",
        role: "main",
        age: "42",
        sex: "Woman",
        background: "Learner",
        appearanceDescription: "",
        notes: [],
        approved: true,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: "images/characters/anita.png",
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-9", "sentence-2"],
        generationStatus: "generated",
        approved: true,
        stale: false
      }
    ]
  });

  const updated = updateStorySentence(
    lesson,
    "sentence-2",
    "Edited second sentence.",
    true
  );

  assert.deepEqual(
    updated.story.sentences.map(({ id, number, text }) => ({
      id,
      number,
      text
    })),
    [
      { id: "sentence-9", number: 1, text: "First sentence." },
      { id: "sentence-2", number: 2, text: "Edited second sentence." }
    ]
  );
  assert.equal(updated.story.modifiedAfterLock, true);
  assert.equal(updated.characters[0].stale, true);
  assert.equal(updated.scenes[0].stale, true);
  assert.deepEqual(updated.scenes[0].sentenceIds, ["sentence-9", "sentence-2"]);
});

test("manual sentence edits leave downstream stale state unchanged when not requested", () => {
  const lesson = createEmptyLesson({
    story: {
      status: "locked",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        { id: "sentence-1", number: 1, text: "Anita phones the doctor." },
        { id: "sentence-3", number: 2, text: "The receptionist answers." }
      ]
    },
    characters: [
      {
        id: "character-anita",
        name: "Anita",
        role: "main",
        age: "42",
        sex: "Woman",
        background: "Somali",
        appearanceDescription: "",
        notes: [],
        approved: true,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: null,
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1", "sentence-3"],
        characterIds: [],
        generationStatus: "generated",
        approved: true,
        stale: false
      }
    ]
  });

  const updated = updateStorySentence(
    lesson,
    "sentence-3",
    "The receptionist answers the phone.",
    false
  );

  assert.equal(updated.story.modifiedAfterLock, true);
  assert.equal(updated.characters[0].stale, false);
  assert.equal(updated.scenes[0].stale, false);
  assert.deepEqual(
    updated.story.sentences.map(({ id, number, text }) => ({ id, number, text })),
    [
      { id: "sentence-1", number: 1, text: "Anita phones the doctor." },
      { id: "sentence-3", number: 2, text: "The receptionist answers the phone." }
    ]
  );
});

test("renumberSentences derives numbers from current array order", () => {
  const sentences = renumberSentences([
    { id: "sentence-7", number: 7, text: "First." },
    { id: "sentence-2", number: 2, text: "Second." }
  ]);

  assert.deepEqual(
    sentences.map(({ id, number }) => ({ id, number })),
    [
      { id: "sentence-7", number: 1 },
      { id: "sentence-2", number: 2 }
    ]
  );
});

test("frontend validation accepts non-sequential sentence ids", () => {
  const lesson = createEmptyLesson({
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

  assert.deepEqual(validateLessonShape(lesson), []);
});

function createReorderFixture(overrides = {}) {
  return createEmptyLesson({
    story: {
      status: "draft",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        {
          id: "sentence-1",
          number: 1,
          text: "First.",
          tone: "calm",
          stale: false
        },
        {
          id: "sentence-2",
          number: 2,
          text: "Second.",
          tone: "bright",
          stale: false
        },
        {
          id: "sentence-3",
          number: 3,
          text: "Third.",
          tone: "careful",
          stale: false
        }
      ]
    },
    characters: [
      {
        id: "character-1",
        name: "Anita",
        role: "main",
        age: "42",
        sex: "Woman",
        background: "Learner",
        appearanceDescription: "",
        notes: [],
        approved: true,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: null,
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-1", "sentence-2"],
        location: "Clinic",
        description: "",
        characterIds: [],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: null,
        approved: false,
        stale: false
      }
    ],
    ...overrides
  });
}

test("moveStorySentence moves a sentence upward and recalculates numbers", () => {
  const lesson = createReorderFixture();
  const updated = moveStorySentence(lesson, "sentence-3", 0, false);

  assert.deepEqual(
    updated.story.sentences.map(({ id, number, text }) => ({ id, number, text })),
    [
      { id: "sentence-3", number: 1, text: "Third." },
      { id: "sentence-1", number: 2, text: "First." },
      { id: "sentence-2", number: 3, text: "Second." }
    ]
  );
});

test("moveStorySentence moves a sentence downward", () => {
  const lesson = createReorderFixture();
  const updated = moveStorySentence(lesson, "sentence-1", 2, false);

  assert.deepEqual(
    updated.story.sentences.map(({ id, number }) => ({ id, number })),
    [
      { id: "sentence-2", number: 1 },
      { id: "sentence-3", number: 2 },
      { id: "sentence-1", number: 3 }
    ]
  );
});

test("moveStorySentence returns the original lesson for no-op moves", () => {
  const lesson = createReorderFixture();

  assert.equal(moveStorySentence(lesson, "sentence-2", 1, false), lesson);
  assert.equal(moveStorySentence(lesson, "missing-sentence", 1, false), lesson);
  assert.equal(moveStorySentence(lesson, "sentence-2", -1, false), lesson);
  assert.equal(moveStorySentence(lesson, "sentence-2", 3, false), lesson);
});

test("moveStorySentence preserves sentence ids, text, and metadata", () => {
  const lesson = createReorderFixture();
  const updated = moveStorySentence(lesson, "sentence-3", 0, false);

  assert.deepEqual(
    updated.story.sentences.map(({ id, text, tone, stale }) => ({
      id,
      text,
      tone,
      stale
    })),
    [
      { id: "sentence-3", text: "Third.", tone: "careful", stale: false },
      { id: "sentence-1", text: "First.", tone: "calm", stale: false },
      { id: "sentence-2", text: "Second.", tone: "bright", stale: false }
    ]
  );
});

test("moveStorySentence keeps scene references id-based and unchanged", () => {
  const lesson = createReorderFixture();
  const updated = moveStorySentence(lesson, "sentence-3", 0, false);

  assert.deepEqual(updated.scenes[0].sentenceIds, ["sentence-1", "sentence-2"]);
});

test("moveStorySentence marks downstream records stale when requested", () => {
  const lesson = createReorderFixture();
  const updated = moveStorySentence(lesson, "sentence-3", 0, true);

  assert.equal(updated.story.modifiedAfterLock, true);
  assert.equal(updated.characters[0].stale, true);
  assert.equal(updated.scenes[0].stale, true);
});

test("moveStorySentence does not mark downstream records stale when not requested", () => {
  const lesson = createReorderFixture();
  const updated = moveStorySentence(lesson, "sentence-3", 0, false);

  assert.equal(updated.story.modifiedAfterLock, true);
  assert.equal(updated.characters[0].stale, false);
  assert.equal(updated.scenes[0].stale, false);
});

test("moveStorySentence does not reorder locked stories", () => {
  const lesson = createReorderFixture({
    story: {
      status: "locked",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        { id: "sentence-1", number: 1, text: "First." },
        { id: "sentence-2", number: 2, text: "Second." }
      ]
    }
  });

  assert.equal(moveStorySentence(lesson, "sentence-2", 0, true), lesson);
});

function createDeleteFixture(overrides = {}) {
  return createEmptyLesson({
    sentenceCount: 6,
    story: {
      status: "draft",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        {
          id: "sentence-1",
          number: 1,
          text: "Anita is in her kitchen.",
          stale: false,
          readingLevel: "easy"
        },
        {
          id: "sentence-2",
          number: 2,
          text: "Anita phones the doctor.",
          stale: false,
          readingLevel: "easy"
        },
        {
          id: "sentence-3",
          number: 3,
          text: "The receptionist answers.",
          stale: false,
          readingLevel: "medium"
        }
      ]
    },
    characters: [
      {
        id: "character-1",
        name: "Anita",
        role: "main",
        age: "42",
        sex: "Woman",
        background: "Learner",
        appearanceDescription: "",
        notes: [],
        approved: true,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: null,
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-1", "sentence-2"],
        location: "Kitchen",
        description: "",
        characterIds: [],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: null,
        approved: false,
        stale: false
      },
      {
        id: "scene-2",
        number: 2,
        label: "Scene 2",
        sentenceIds: ["sentence-3"],
        location: "Phone call",
        description: "",
        characterIds: [],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false
      }
    ],
    ...overrides
  });
}

test("deleteStorySentence removes the selected sentence record and recalculates numbers", () => {
  const lesson = createDeleteFixture();
  const updated = deleteStorySentence(lesson, "sentence-1", false);

  assert.deepEqual(
    updated.story.sentences.map(({ id, number, text }) => ({ id, number, text })),
    [
      { id: "sentence-2", number: 1, text: "Anita phones the doctor." },
      { id: "sentence-3", number: 2, text: "The receptionist answers." }
    ]
  );
});

test("deleteStorySentence preserves remaining sentence ids, text, and metadata", () => {
  const lesson = createDeleteFixture();
  const updated = deleteStorySentence(lesson, "sentence-1", false);

  assert.deepEqual(
    updated.story.sentences.map(({ id, text, stale, readingLevel }) => ({
      id,
      text,
      stale,
      readingLevel
    })),
    [
      {
        id: "sentence-2",
        text: "Anita phones the doctor.",
        stale: false,
        readingLevel: "easy"
      },
      {
        id: "sentence-3",
        text: "The receptionist answers.",
        stale: false,
        readingLevel: "medium"
      }
    ]
  );
});

test("deleteStorySentence returns the original lesson for no-op deletes", () => {
  const lesson = createDeleteFixture();
  const oneSentenceLesson = createDeleteFixture({
    story: {
      status: "draft",
      sentences: [{ id: "sentence-1", number: 1, text: "Only sentence." }]
    },
    scenes: []
  });

  assert.equal(deleteStorySentence(lesson, "missing-sentence", false), lesson);
  assert.equal(deleteStorySentence(oneSentenceLesson, "sentence-1", false), oneSentenceLesson);
});

test("deleteStorySentence does not delete from locked stories", () => {
  const lesson = createDeleteFixture({
    story: {
      status: "locked",
      sentences: [
        { id: "sentence-1", number: 1, text: "First." },
        { id: "sentence-2", number: 2, text: "Second." }
      ]
    }
  });

  assert.equal(deleteStorySentence(lesson, "sentence-1", true), lesson);
});

test("deleteStorySentence removes deleted ids from scenes without rewriting unaffected scenes", () => {
  const lesson = createDeleteFixture();
  const updated = deleteStorySentence(lesson, "sentence-1", false);

  assert.deepEqual(
    updated.scenes.map(({ id, sentenceIds }) => ({ id, sentenceIds })),
    [
      { id: "scene-1", sentenceIds: ["sentence-2"] },
      { id: "scene-2", sentenceIds: ["sentence-3"] }
    ]
  );
});

test("deleteStorySentence preserves scenes that lose all sentence references", () => {
  const lesson = createDeleteFixture();
  const updated = deleteStorySentence(lesson, "sentence-3", false);

  assert.equal(updated.scenes.length, 2);
  assert.deepEqual(updated.scenes[1].sentenceIds, []);
  assert.equal(updated.scenes[1].stale, true);
});

test("deleteStorySentence marks affected generated or approved scenes stale", () => {
  const lesson = createDeleteFixture({
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "generated",
        approved: false,
        stale: false
      },
      {
        id: "scene-2",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "approved",
        approved: true,
        stale: false
      },
      {
        id: "scene-3",
        sentenceIds: ["sentence-3"],
        characterIds: [],
        generationStatus: "generated",
        approved: false,
        stale: false
      }
    ]
  });
  const updated = deleteStorySentence(lesson, "sentence-1", false);

  assert.equal(updated.scenes[0].stale, true);
  assert.equal(updated.scenes[1].stale, true);
  assert.equal(updated.scenes[2].stale, false);
});

test("deleteStorySentence marks downstream records stale when requested", () => {
  const lesson = createDeleteFixture();
  const updated = deleteStorySentence(lesson, "sentence-1", true);

  assert.equal(updated.story.modifiedAfterLock, true);
  assert.equal(updated.characters[0].stale, true);
  assert.equal(updated.scenes[0].stale, true);
});

test("deleteStorySentence does not mark unrelated downstream records stale when not requested", () => {
  const lesson = createDeleteFixture({
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "not_started",
        approved: false,
        stale: false
      },
      {
        id: "scene-2",
        sentenceIds: ["sentence-2"],
        characterIds: [],
        generationStatus: "generated",
        approved: false,
        stale: false
      }
    ]
  });
  const updated = deleteStorySentence(lesson, "sentence-1", false);

  assert.equal(updated.story.modifiedAfterLock, true);
  assert.equal(updated.characters[0].stale, false);
  assert.equal(updated.scenes[0].stale, true);
  assert.equal(updated.scenes[1].stale, false);
});

test("frontend validation accepts deleted story count and empty scene references", () => {
  const lesson = createDeleteFixture();
  const updated = deleteStorySentence(lesson, "sentence-3", false);

  assert.equal(updated.story.sentences.length, 2);
  assert.notEqual(updated.story.sentences.length, updated.sentenceCount);
  assert.deepEqual(validateLessonShape(updated), []);
});

test("frontend validation accepts edited stories above and below the setup target count", () => {
  const shortLesson = createEmptyLesson({
    sentenceCount: 6,
    story: {
      sentences: [
        { id: "sentence-9", number: 1, text: "Anita phones the doctor." },
        { id: "sentence-2", number: 2, text: "The receptionist answers." }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        sentenceIds: [],
        characterIds: [],
        generationStatus: "not_started"
      }
    ]
  });
  const longLesson = createEmptyLesson({
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

  assert.deepEqual(validateLessonShape(shortLesson), []);
  assert.deepEqual(validateLessonShape(longLesson), []);
});

test("frontend validation rejects scene references when delete cleanup is missing", () => {
  const lesson = createDeleteFixture({
    story: {
      sentences: [
        { id: "sentence-2", number: 1, text: "Anita phones the doctor." },
        { id: "sentence-3", number: 2, text: "The receptionist answers." }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1", "sentence-2"],
        characterIds: [],
        generationStatus: "not_started"
      }
    ]
  });

  assert.deepEqual(validateLessonShape(lesson), [
    "scene-1 references missing sentence sentence-1."
  ]);
});

function createAddFixture(overrides = {}) {
  return createEmptyLesson({
    sentenceCount: 6,
    story: {
      status: "draft",
      lockedAt: "2026-09-05T12:00:00.000Z",
      modifiedAfterLock: false,
      sentences: [
        {
          id: "sentence-2",
          number: 1,
          text: "Anita phones the doctor.",
          stale: false,
          readingLevel: "easy"
        },
        {
          id: "sentence-9",
          number: 2,
          text: "The receptionist answers.",
          stale: false,
          readingLevel: "medium"
        }
      ]
    },
    characters: [
      {
        id: "character-1",
        name: "Anita",
        role: "main",
        age: "42",
        sex: "Woman",
        background: "Learner",
        appearanceDescription: "",
        notes: [],
        approved: true,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: null,
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-2"],
        location: "Phone call",
        description: "",
        characterIds: [],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: null,
        approved: false,
        stale: false
      }
    ],
    ...overrides
  });
}

test("addStorySentence appends one manual sentence record and recalculates numbers", () => {
  const lesson = createAddFixture();
  const updated = addStorySentence(
    lesson,
    "  She asks for an urgent appointment.  ",
    undefined,
    false
  );

  assert.deepEqual(
    updated.story.sentences.map(({ id, number, text, source, stale }) => ({
      id,
      number,
      text,
      source,
      stale
    })),
    [
      {
        id: "sentence-2",
        number: 1,
        text: "Anita phones the doctor.",
        source: undefined,
        stale: false
      },
      {
        id: "sentence-9",
        number: 2,
        text: "The receptionist answers.",
        source: undefined,
        stale: false
      },
      {
        id: "sentence-10",
        number: 3,
        text: "She asks for an urgent appointment.",
        source: "manual",
        stale: false
      }
    ]
  );
  assert.match(updated.story.sentences[2].updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(updated.characters[0].stale, false);
  assert.equal(updated.scenes[0].stale, false);
});

test("addStorySentence preserves existing sentence text and metadata", () => {
  const lesson = createAddFixture({
    story: {
      status: "draft",
      sentences: [
        {
          id: "sentence-2",
          number: 8,
          text: "Anita phones the doctor.",
          stale: true,
          source: "generated",
          updatedAt: "2026-09-05T08:00:00.000Z",
          readingLevel: "easy"
        },
        {
          id: "sentence-9",
          number: 4,
          text: "The receptionist answers.",
          stale: false,
          source: "manual",
          updatedAt: "2026-09-05T09:00:00.000Z",
          readingLevel: "medium"
        }
      ]
    }
  });

  const updated = addStorySentence(lesson, "She asks for an appointment.", {}, false);

  assert.deepEqual(updated.story.sentences.slice(0, 2), [
    {
      id: "sentence-2",
      number: 1,
      text: "Anita phones the doctor.",
      stale: true,
      source: "generated",
      updatedAt: "2026-09-05T08:00:00.000Z",
      readingLevel: "easy"
    },
    {
      id: "sentence-9",
      number: 2,
      text: "The receptionist answers.",
      stale: false,
      source: "manual",
      updatedAt: "2026-09-05T09:00:00.000Z",
      readingLevel: "medium"
    }
  ]);
});

test("addStorySentence ignores empty sentence text", () => {
  const lesson = createAddFixture();

  assert.equal(addStorySentence(lesson, "   \n\t  ", undefined, true), lesson);
});

test("addStorySentence does not add to locked stories", () => {
  const lesson = createAddFixture({
    story: {
      status: "locked",
      sentences: [{ id: "sentence-1", number: 1, text: "Locked." }]
    }
  });

  assert.equal(addStorySentence(lesson, "New sentence.", undefined, true), lesson);
});

test("addStorySentence inserts at a bounded position without disturbing existing ids", () => {
  const lesson = createAddFixture();
  const updated = addStorySentence(lesson, "Inserted sentence.", { index: 1 }, false);

  assert.deepEqual(
    updated.story.sentences.map(({ id, number, text }) => ({ id, number, text })),
    [
      { id: "sentence-2", number: 1, text: "Anita phones the doctor." },
      { id: "sentence-10", number: 2, text: "Inserted sentence." },
      { id: "sentence-9", number: 3, text: "The receptionist answers." }
    ]
  );
});

test("addStorySentence clamps low positioned insertion indexes to the start", () => {
  const lesson = createAddFixture();
  const updated = addStorySentence(lesson, "Inserted first.", { index: -10 }, false);
  const ids = updated.story.sentences.map((sentence) => sentence.id);

  assert.deepEqual(
    updated.story.sentences.map(({ id, number, text }) => ({ id, number, text })),
    [
      { id: "sentence-10", number: 1, text: "Inserted first." },
      { id: "sentence-2", number: 2, text: "Anita phones the doctor." },
      { id: "sentence-9", number: 3, text: "The receptionist answers." }
    ]
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(validateLessonShape(updated), []);
});

test("addStorySentence clamps high positioned insertion indexes to the end", () => {
  const lesson = createAddFixture();
  const updated = addStorySentence(lesson, "Inserted last.", { index: 999 }, false);
  const ids = updated.story.sentences.map((sentence) => sentence.id);

  assert.deepEqual(
    updated.story.sentences.map(({ id, number, text }) => ({ id, number, text })),
    [
      { id: "sentence-2", number: 1, text: "Anita phones the doctor." },
      { id: "sentence-9", number: 2, text: "The receptionist answers." },
      { id: "sentence-10", number: 3, text: "Inserted last." }
    ]
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(validateLessonShape(updated), []);
});

test("addStorySentence creates a safe unique id when lower candidate ids exist", () => {
  const lesson = createAddFixture({
    story: {
      status: "draft",
      sentences: [
        { id: "sentence-1", number: 1, text: "First." },
        { id: "sentence-3", number: 2, text: "Second." },
        { id: "sentence-manual-a1b2c3d4", number: 3, text: "Third." }
      ]
    },
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "not_started"
      }
    ]
  });
  const updated = addStorySentence(lesson, "Fourth.", undefined, false);
  const ids = updated.story.sentences.map((sentence) => sentence.id);

  assert.equal(updated.story.sentences.at(-1).id, "sentence-4");
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(validateLessonShape(updated), []);
});

test("addStorySentence marks downstream records stale when requested", () => {
  const lesson = createAddFixture();
  const updated = addStorySentence(lesson, "She asks for an appointment.", {}, true);

  assert.equal(updated.story.modifiedAfterLock, true);
  assert.equal(updated.characters[0].stale, true);
  assert.equal(updated.scenes[0].stale, true);
});

test("addStorySentence preserves existing scene sentence ids and allows count mismatch", () => {
  const lesson = createAddFixture();
  const updated = addStorySentence(
    lesson,
    "She asks for an urgent appointment.",
    undefined,
    false
  );
  const reopened = normalizeLessonForClient(updated);

  assert.deepEqual(reopened.scenes[0].sentenceIds, ["sentence-2"]);
  assert.equal(reopened.story.sentences.length, 3);
  assert.notEqual(reopened.story.sentences.length, reopened.sentenceCount);
  assert.deepEqual(validateLessonShape(reopened), []);
});

function createSceneReferenceFixture(overrides = {}) {
  return createEmptyLesson({
    story: {
      status: "draft",
      sentences: [
        {
          id: "sentence-1",
          number: 1,
          text: "Anita phones the doctor.",
          stale: false
        },
        {
          id: "sentence-3",
          number: 2,
          text: "She asks for an appointment.",
          stale: false
        },
        {
          id: "sentence-2",
          number: 3,
          text: "The receptionist answers.",
          stale: false
        }
      ]
    },
    characters: [
      {
        id: "character-anita",
        name: "Anita",
        role: "main",
        age: "45",
        sex: "Woman",
        background: "Somali",
        appearanceDescription: "",
        notes: [],
        generationStatus: "generated",
        generationCount: 1,
        imagePath: "images/characters/anita.png",
        approved: false,
        stale: false
      }
    ],
    scenes: [
      {
        id: "scene-1",
        number: 1,
        label: "Scene 1",
        sentenceIds: ["sentence-2", "sentence-1"],
        location: "Phone call",
        description: "",
        characterIds: ["character-anita"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "generated",
        generationCount: 1,
        imagePath: null,
        approved: false,
        stale: false
      },
      {
        id: "scene-2",
        number: 2,
        label: "Scene 2",
        sentenceIds: [],
        location: "Reception",
        description: "",
        characterIds: ["character-anita"],
        imageMode: "generate",
        reuseSceneId: null,
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false
      }
    ],
    ...overrides
  });
}

test("scene selectors return covered sentences in current story order with display numbers", () => {
  const lesson = createSceneReferenceFixture();
  const positions = getStorySentencePositionMap(lesson);
  const covered = getSceneSentenceRecords(lesson, lesson.scenes[0]);

  assert.equal(positions.get("sentence-1"), 0);
  assert.equal(positions.get("sentence-2"), 2);
  assert.deepEqual(
    covered.map(({ id, displayNumber, text }) => ({ id, displayNumber, text })),
    [
      {
        id: "sentence-1",
        displayNumber: 1,
        text: "Anita phones the doctor."
      },
      {
        id: "sentence-2",
        displayNumber: 3,
        text: "The receptionist answers."
      }
    ]
  );
});

test("scene selectors detect unassigned story sentences by id", () => {
  const lesson = createSceneReferenceFixture();

  assert.deepEqual(
    getUnassignedStorySentences(lesson).map(({ id, displayNumber, text }) => ({
      id,
      displayNumber,
      text
    })),
    [
      {
        id: "sentence-3",
        displayNumber: 2,
        text: "She asks for an appointment."
      }
    ]
  );
});

test("scene selectors update unassigned sentences after assignment", () => {
  const lesson = createSceneReferenceFixture();
  const updated = addSceneSentenceReference(lesson, "scene-2", "sentence-3");

  assert.deepEqual(getUnassignedStorySentences(updated), []);
});

test("scene selectors update unassigned sentences after removal", () => {
  const lesson = createSceneReferenceFixture();

  assert.deepEqual(
    getUnassignedStorySentences(lesson).map((sentence) => sentence.id),
    ["sentence-3"]
  );

  const assigned = addSceneSentenceReference(lesson, "scene-2", "sentence-3");
  assert.deepEqual(
    getUnassignedStorySentences(assigned).map((sentence) => sentence.id),
    []
  );

  const removed = removeSceneSentenceReference(
    assigned,
    "scene-2",
    "sentence-3"
  );

  assert.deepEqual(
    getUnassignedStorySentences(removed).map((sentence) => sentence.id),
    ["sentence-3"]
  );
});

test("scene selector normalization de-dupes, filters missing ids, and sorts by story order", () => {
  const lesson = createSceneReferenceFixture();

  assert.deepEqual(
    normalizeSceneSentenceIds(lesson, [
      "sentence-missing",
      "sentence-2",
      "sentence-2",
      "sentence-1",
      "sentence-3"
    ]),
    ["sentence-1", "sentence-3", "sentence-2"]
  );
  assert.deepEqual(
    getSceneSentenceRecords(lesson, {
      id: "scene-corrupt",
      sentenceIds: ["sentence-missing", "sentence-2"]
    }).map((sentence) => sentence.id),
    ["sentence-2"]
  );
});

test("addSceneSentenceReference adds, sorts, de-dupes, and preserves scene fields", () => {
  const lesson = createSceneReferenceFixture();
  const updated = addSceneSentenceReference(lesson, "scene-1", "sentence-3");
  const scene = updated.scenes[0];

  assert.deepEqual(scene.sentenceIds, ["sentence-1", "sentence-3", "sentence-2"]);
  assert.equal(scene.location, "Phone call");
  assert.deepEqual(scene.characterIds, ["character-anita"]);
  assert.equal(scene.generationCount, 1);
});

test("addSceneSentenceReference updates only the selected scene and preserves story records", () => {
  const lesson = createSceneReferenceFixture();
  const updated = addSceneSentenceReference(lesson, "scene-2", "sentence-3");

  assert.deepEqual(updated.scenes[0], lesson.scenes[0]);
  assert.deepEqual(updated.scenes[1].sentenceIds, ["sentence-3"]);
  assert.deepEqual(updated.story.sentences, lesson.story.sentences);
});

test("addSceneSentenceReference returns the original lesson for missing scene, missing sentence, and duplicates", () => {
  const lesson = createSceneReferenceFixture();

  assert.equal(
    addSceneSentenceReference(lesson, "scene-missing", "sentence-3"),
    lesson
  );
  assert.equal(
    addSceneSentenceReference(lesson, "scene-1", "sentence-missing"),
    lesson
  );
  assert.equal(addSceneSentenceReference(lesson, "scene-1", "sentence-1"), lesson);
});

test("removeSceneSentenceReference removes only the selected id and allows empty scenes", () => {
  const lesson = createSceneReferenceFixture();
  const updated = removeSceneSentenceReference(lesson, "scene-1", "sentence-1");
  const emptied = removeSceneSentenceReference(updated, "scene-1", "sentence-2");

  assert.deepEqual(updated.scenes[0].sentenceIds, ["sentence-2"]);
  assert.deepEqual(emptied.scenes[0].sentenceIds, []);
  assert.equal(emptied.scenes.length, 2);
  assert.deepEqual(
    emptied.story.sentences.map((sentence) => sentence.id),
    ["sentence-1", "sentence-3", "sentence-2"]
  );
});

test("removeSceneSentenceReference returns the original lesson for missing scene or missing reference", () => {
  const lesson = createSceneReferenceFixture();

  assert.equal(
    removeSceneSentenceReference(lesson, "scene-missing", "sentence-1"),
    lesson
  );
  assert.equal(
    removeSceneSentenceReference(lesson, "scene-1", "sentence-3"),
    lesson
  );
});

test("replaceSceneSentenceReferences preserves unrelated scenes and normalizes the affected scene", () => {
  const lesson = createSceneReferenceFixture();
  const updated = replaceSceneSentenceReferences(lesson, "scene-2", [
    "sentence-2",
    "sentence-1",
    "sentence-2",
    "sentence-missing"
  ]);

  assert.deepEqual(updated.scenes[0], lesson.scenes[0]);
  assert.deepEqual(updated.scenes[1].sentenceIds, ["sentence-1", "sentence-2"]);
});

test("scene reference edits mark generated or approved scenes stale only when references change", () => {
  const lesson = createSceneReferenceFixture({
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-1"],
        characterIds: [],
        generationStatus: "generated",
        approved: false,
        stale: false
      },
      {
        id: "scene-2",
        sentenceIds: ["sentence-2"],
        characterIds: [],
        generationStatus: "approved",
        approved: true,
        stale: false
      },
      {
        id: "scene-3",
        sentenceIds: ["sentence-3"],
        characterIds: [],
        generationStatus: "not_started",
        approved: false,
        stale: false
      }
    ]
  });

  const generatedUpdated = addSceneSentenceReference(
    lesson,
    "scene-1",
    "sentence-3"
  );
  const approvedUpdated = removeSceneSentenceReference(
    lesson,
    "scene-2",
    "sentence-2"
  );
  const ungeneratedUpdated = addSceneSentenceReference(
    lesson,
    "scene-3",
    "sentence-1"
  );

  assert.equal(generatedUpdated.scenes[0].stale, true);
  assert.equal(generatedUpdated.scenes[1].stale, false);
  assert.equal(approvedUpdated.scenes[1].stale, true);
  assert.equal(ungeneratedUpdated.scenes[2].stale, false);
});

test("scene reference edits preserve character stale state and validate cleanly", () => {
  const lesson = createSceneReferenceFixture();
  const assigned = addSceneSentenceReference(lesson, "scene-2", "sentence-3");
  const reopened = normalizeLessonForClient(assigned);

  assert.deepEqual(reopened.scenes[1].sentenceIds, ["sentence-3"]);
  assert.equal(reopened.characters[0].stale, false);
  assert.deepEqual(validateLessonShape(reopened), []);
});

test("frontend validation keeps missing scene sentence ids invalid and unassigned sentences valid", () => {
  const lesson = createSceneReferenceFixture();
  const corrupted = createSceneReferenceFixture({
    scenes: [
      {
        id: "scene-1",
        sentenceIds: ["sentence-missing"],
        characterIds: [],
        generationStatus: "not_started"
      }
    ]
  });

  assert.deepEqual(validateLessonShape(lesson), []);
  assert.deepEqual(validateLessonShape(corrupted), [
    "scene-1 references missing sentence sentence-missing."
  ]);
});
