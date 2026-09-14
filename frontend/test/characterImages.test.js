import assert from "node:assert/strict";
import test from "node:test";

import { updateCharacterAppearance } from "../src/api/characters.js";
import { approveCharacterImage, generateCharacterImage } from "../src/api/images.js";
import { createEmptyLesson } from "../src/data/createLesson.js";
import {
  addCharacterNote,
  markCharacterApproved,
  patchCharacter,
  removeCharacterNote
} from "../src/utils/lessonUpdates.js";
import {
  areRequiredCharactersApproved,
  getProjectAssetUrl
} from "../src/utils/lessonSelectors.js";
import { normalizeLessonForClient } from "../src/utils/normalizeLesson.js";
import { validateLessonShape } from "../src/utils/validateLessonShape.js";

function lessonWithCharacter(overrides = {}) {
  return createEmptyLesson({
    id: "lesson-current",
    story: {
      status: "locked",
      lockedAt: "2026-09-09T11:55:00.000Z",
      sentences: [{ id: "sentence-1", number: 1, text: "Marta goes to class." }],
      lockedSentences: [{ id: "sentence-1", number: 1, text: "Marta goes to class." }]
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
          "Woman in her mid 30s with shoulder-length dark brown hair.",
        notes: ["clear face"],
        generationStatus: "not_started",
        generationCount: 0,
        imagePath: null,
        approved: false,
        stale: false,
        ...overrides
      }
    ]
  });
}

test("generateCharacterImage calls backend image API", async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    requests.push({ path, options });
    return responseJson({
      lesson: lessonWithCharacter({
        generationStatus: "generated",
        generationCount: 1,
        imagePath: "images/characters/character-marta.png"
      })
    });
  };

  try {
    const result = await generateCharacterImage("lesson-current", "character-marta");
    assert.equal(requests[0].path, "/api/images/character");
    assert.equal(requests[0].options.method, "POST");
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      lessonId: "lesson-current",
      characterId: "character-marta"
    });
    assert.equal(result.lesson.characters[0].imagePath, "images/characters/character-marta.png");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("approveCharacterImage parses backend errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    responseJson(
      {
        error: "Generate an image before approving this character.",
        details: [
          {
            field: "characters.imagePath",
            message: "Generate an image before approving this character."
          }
        ]
      },
      422
    );

  try {
    await assert.rejects(
      () => approveCharacterImage("lesson-current", "character-marta"),
      /characters.imagePath/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateCharacterAppearance calls backend character appearance API", async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    requests.push({ path, options });
    return responseJson({
      lesson: lessonWithCharacter({
        appearanceDescription:
          "Woman in her mid 30s with shoulder-length dark brown hair."
      }),
      appearance: {
        characterId: "character-marta",
        appearanceDescription:
          "Woman in her mid 30s with shoulder-length dark brown hair.",
        generatedAt: "2026-09-11T15:00:00.000Z",
        model: "test-text-model",
        promptVersion: "character-appearance-v1"
      }
    });
  };

  try {
    const result = await updateCharacterAppearance(
      "lesson-current",
      "character-marta"
    );
    assert.equal(requests[0].path, "/api/characters/appearance");
    assert.equal(requests[0].options.method, "POST");
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      lessonId: "lesson-current",
      characterId: "character-marta"
    });
    assert.equal(
      result.lesson.characters[0].appearanceDescription,
      "Woman in her mid 30s with shoulder-length dark brown hair."
    );
    assert.equal(result.appearance.characterId, "character-marta");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateCharacterAppearance parses backend errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    responseJson(
      {
        error: "Character not found.",
        details: [
          {
            field: "characterId",
            message: "Character not found."
          }
        ]
      },
      404
    );

  try {
    await assert.rejects(
      () => updateCharacterAppearance("lesson-current", "character-missing"),
      /characterId: Character not found/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("project-relative image paths become renderable asset URLs", () => {
  assert.equal(
    getProjectAssetUrl("lesson-current", "images/characters/character-marta.png"),
    "/api/projects/lesson-current/assets/images/characters/character-marta.png"
  );
});

test("approval requires image path and unstale character", () => {
  const noImage = markCharacterApproved(lessonWithCharacter(), "character-marta");
  assert.equal(noImage.characters[0].approved, false);

  const withImage = markCharacterApproved(
    lessonWithCharacter({
      generationStatus: "generated",
      imagePath: "images/characters/character-marta.png"
    }),
    "character-marta"
  );
  assert.equal(withImage.characters[0].approved, true);
});

test("patchCharacter updates appearanceDescription without requiring an image", () => {
  const edited = patchCharacter(lessonWithCharacter(), "character-marta", {
    appearanceDescription: "Short dark hair, brown eyes and an average build."
  });

  assert.equal(
    edited.characters[0].appearanceDescription,
    "Short dark hair, brown eyes and an average build."
  );
  assert.equal(edited.characters[0].generationStatus, "not_started");
  assert.equal(edited.characters[0].approved, false);
  assert.equal(edited.characters[0].stale, false);

  const cleared = patchCharacter(edited, "character-marta", {
    appearanceDescription: ""
  });
  assert.equal(cleared.characters[0].appearanceDescription, "");
  assert.equal(cleared.characters[0].stale, false);
});

test("editing generated character details marks reference stale without clearing image", () => {
  const lesson = lessonWithCharacter({
    generationStatus: "approved",
    generationCount: 2,
    imagePath: "images/characters/character-marta.png",
    approved: true,
    stale: false
  });

  const edited = patchCharacter(lesson, "character-marta", { age: "mid 30s" });
  assert.equal(edited.characters[0].imagePath, "images/characters/character-marta.png");
  assert.equal(edited.characters[0].approved, false);
  assert.equal(edited.characters[0].generationStatus, "generated");
  assert.equal(edited.characters[0].stale, true);
  assert.equal(
    edited.characters[0].staleReason,
    "Character details changed after image generation."
  );

  const noted = addCharacterNote(lesson, "character-marta", "friendly");
  assert.equal(noted.characters[0].stale, true);
  assert.equal(noted.characters[0].imagePath, "images/characters/character-marta.png");

  const restyled = patchCharacter(lesson, "character-marta", {
    imageStyle: "photorealistic"
  });
  assert.equal(restyled.characters[0].imageStyle, "photorealistic");
  assert.equal(restyled.characters[0].imagePath, "images/characters/character-marta.png");
  assert.equal(restyled.characters[0].approved, false);
  assert.equal(restyled.characters[0].generationStatus, "generated");
  assert.equal(restyled.characters[0].stale, true);

  const appearanceEdited = patchCharacter(lesson, "character-marta", {
    appearanceDescription: "Woman in her mid 30s with short dark hair."
  });
  assert.equal(
    appearanceEdited.characters[0].appearanceDescription,
    "Woman in her mid 30s with short dark hair."
  );
  assert.equal(
    appearanceEdited.characters[0].imagePath,
    "images/characters/character-marta.png"
  );
  assert.equal(appearanceEdited.characters[0].approved, false);
  assert.equal(appearanceEdited.characters[0].generationStatus, "generated");
  assert.equal(appearanceEdited.characters[0].stale, true);
});

test("replacing generated character appearance marks reference stale", () => {
  const lesson = lessonWithCharacter({
    generationStatus: "approved",
    generationCount: 2,
    imagePath: "images/characters/character-marta.png",
    approved: true,
    stale: false
  });

  const edited = patchCharacter(lesson, "character-marta", {
    appearanceDescription:
      "Woman in her mid 30s with shoulder-length dark brown hair and brown eyes."
  });

  assert.equal(
    edited.characters[0].appearanceDescription,
    "Woman in her mid 30s with shoulder-length dark brown hair and brown eyes."
  );
  assert.equal(edited.characters[0].imagePath, "images/characters/character-marta.png");
  assert.equal(edited.characters[0].approved, false);
  assert.equal(edited.characters[0].generationStatus, "generated");
  assert.equal(edited.characters[0].stale, true);
});

test("legacy character notes can still be added and removed", () => {
  const added = addCharacterNote(lessonWithCharacter({ notes: [] }), "character-marta", "kind");

  assert.deepEqual(added.characters[0].notes, ["kind"]);
  assert.deepEqual(added.reusable.noteTags, ["kind"]);

  const removed = removeCharacterNote(added, "character-marta", "kind");
  assert.deepEqual(removed.characters[0].notes, []);
  assert.deepEqual(removed.reusable.noteTags, ["kind"]);
});

test("required character readiness requires approved image paths and no stale records", () => {
  assert.equal(areRequiredCharactersApproved(lessonWithCharacter()), false);
  assert.equal(
    areRequiredCharactersApproved(
      lessonWithCharacter({
        generationStatus: "approved",
        imagePath: "images/characters/character-marta.png",
        approved: true,
        stale: false
      })
    ),
    true
  );
  assert.equal(
    areRequiredCharactersApproved(
      lessonWithCharacter({
        generationStatus: "approved",
        imagePath: "images/characters/character-marta.png",
        approved: true,
        stale: true
      })
    ),
    false
  );
});

test("legacy generated placeholders normalize back to needing generation", () => {
  const normalized = normalizeLessonForClient(
    lessonWithCharacter({
      generationStatus: "generated",
      approved: true,
      imagePath: null
    })
  );

  assert.equal(normalized.characters[0].generationStatus, "not_started");
  assert.equal(normalized.characters[0].approved, false);
  assert.equal(normalized.characters[0].stale, true);
  assert.deepEqual(validateLessonShape(normalized), []);
});

test("legacy character appearance descriptions normalize for client validation", () => {
  const legacy = lessonWithCharacter();
  delete legacy.characters[0].appearanceDescription;

  const normalizedLegacy = normalizeLessonForClient(legacy);
  assert.equal(normalizedLegacy.characters[0].appearanceDescription, "");
  assert.deepEqual(validateLessonShape(normalizedLegacy), []);

  const normalizedMessy = normalizeLessonForClient(
    lessonWithCharacter({
      appearanceDescription: "\n Woman   in her mid 30s. \t "
    })
  );
  assert.equal(
    normalizedMessy.characters[0].appearanceDescription,
    "Woman in her mid 30s."
  );
  assert.deepEqual(validateLessonShape(normalizedMessy), []);
});

function responseJson(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}
