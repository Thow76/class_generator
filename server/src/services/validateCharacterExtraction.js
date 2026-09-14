const allowedRoles = ["main", "secondary", "supporting"];
const allowedSexValues = ["Woman", "Man", "Non-binary", "Unspecified"];
const blockedExternalLabels = ["A" + "1", "A" + "2", "B" + "1", "C" + "E" + "F" + "R"];
const disallowedFields = [
  "hair",
  "clothing",
  "build",
  "bodyType",
  "personality",
  "expression",
  "pose",
  "visualStyle",
  "style",
  "appearance"
];
const nonHumanRoles = [
  "animal",
  "dog",
  "cat",
  "object",
  "location",
  "place",
  "organization",
  "crowd",
  "group"
];

export class CharacterValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "CharacterValidationError";
    this.statusCode = 422;
    this.details = details;
  }
}

export function parseCharacterExtractionResponse(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    throw new CharacterValidationError(
      "Character extraction response was not valid JSON.",
      [
        {
          field: "response",
          message: "Character extraction response was not valid JSON."
        }
      ]
    );
  }
}

export function validateCharacterExtraction(response, lesson) {
  const errors = [];
  const sentenceIds = new Set(
    (lesson.story.lockedSentences || []).map((sentence) => sentence.id)
  );

  if (!isPlainObject(response)) {
    throw new CharacterValidationError("Character extraction response is invalid.", [
      { field: "response", message: "Response must be an object." }
    ]);
  }

  Object.keys(response).forEach((key) => {
    if (key !== "characters") {
      errors.push({
        field: key,
        message: "Character extraction response includes an unsupported field."
      });
    }
  });

  if (!Array.isArray(response.characters)) {
    errors.push({
      field: "characters",
      message: "Response must include a characters array."
    });
  } else if (response.characters.length === 0 && storyLikelyHasHumanCharacter(lesson)) {
    errors.push({
      field: "characters",
      message: "At least the Setup main character should be present."
    });
  }

  const seenNames = new Set();
  const characters = [];

  response.characters?.forEach((character, index) => {
    const path = `characters[${index}]`;
    if (!isPlainObject(character)) {
      errors.push({ field: path, message: "Character must be an object." });
      return;
    }

    Object.keys(character).forEach((key) => {
      if (
        ![
          "name",
          "role",
          "age",
          "sex",
          "gender",
          "background",
          "nationality",
          "notes",
          "storySentenceIds"
        ].includes(key)
      ) {
        errors.push({
          field: `${path}.${key}`,
          message: disallowedFields.includes(key)
            ? "Character extraction includes a disallowed dedicated field."
            : "Character extraction includes an unsupported field."
        });
      }
    });

    const name = cleanText(character.name);
    if (!name) {
      errors.push({ field: `${path}.name`, message: "Character name is required." });
    }

    const nameKey = normalizeName(name);
    if (nameKey && seenNames.has(nameKey)) {
      errors.push({
        field: `${path}.name`,
        message: "Duplicate character names are not allowed."
      });
    }
    seenNames.add(nameKey);

    const role = cleanText(character.role).toLocaleLowerCase();
    if (!allowedRoles.includes(role)) {
      errors.push({
        field: `${path}.role`,
        message: "Character role is unsupported."
      });
    }

    const setupMainNameKey = normalizeName(lesson.setup?.mainCharacter?.name);
    if (
      setupMainNameKey &&
      role === "main" &&
      normalizeName(name) !== setupMainNameKey
    ) {
      errors.push({
        field: `${path}.role`,
        message: "Extracted main character must match the Setup main character."
      });
    }

    const sex = normalizeSex(character.sex ?? character.gender);
    if (!allowedSexValues.includes(sex)) {
      errors.push({
        field: `${path}.sex`,
        message: "Character sex or gender is unsupported."
      });
    }

    const background = cleanText(character.background ?? character.nationality);
    const age = cleanText(character.age);
    const notes = normalizeNotes(character.notes, `${path}.notes`, errors);
    const storySentenceIds = normalizeStorySentenceIds(
      character.storySentenceIds,
      sentenceIds,
      `${path}.storySentenceIds`,
      errors
    );

    const searchable = [name, role, sex, background, age, ...notes].join(" ");
    if (includesBlockedLabel(searchable)) {
      errors.push({
        field: path,
        message: "Character extraction includes an unsupported proficiency label."
      });
    }

    if (isNonHumanEntity(name, role, character)) {
      errors.push({
        field: `${path}.name`,
        message: "Only recurring human characters may be extracted."
      });
    }

    characters.push({
      name,
      role,
      age,
      sex,
      background,
      notes,
      storySentenceIds
    });
  });

  if (errors.length > 0) {
    throw new CharacterValidationError("Character extraction response is invalid.", errors);
  }

  return { characters };
}

function normalizeNotes(value, field, errors) {
  if (!Array.isArray(value)) {
    errors.push({ field, message: "Character notes must be an array." });
    return [];
  }

  const seen = new Set();
  return value.reduce((notes, note, index) => {
    const normalized = cleanText(note);
    if (!normalized) return notes;
    if (normalized.length > 48) {
      errors.push({
        field: `${field}[${index}]`,
        message: "Character notes must be short reusable tags."
      });
      return notes;
    }
    if (includesBlockedLabel(normalized)) {
      errors.push({
        field: `${field}[${index}]`,
        message: "Character note includes an unsupported proficiency label."
      });
    }
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) return notes;
    seen.add(key);
    return [...notes, normalized];
  }, []);
}

function normalizeStorySentenceIds(value, allowedIds, field, errors) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push({ field, message: "Story sentence ids must be an array." });
    return [];
  }

  const seen = new Set();
  return value.reduce((ids, id, index) => {
    const normalized = cleanText(id);
    if (!normalized) return ids;
    if (!allowedIds.has(normalized)) {
      errors.push({
        field: `${field}[${index}]`,
        message: `Story sentence id ${normalized} is not in the locked story.`
      });
      return ids;
    }
    if (seen.has(normalized)) return ids;
    seen.add(normalized);
    return [...ids, normalized];
  }, []);
}

function normalizeSex(value) {
  const normalized = cleanText(value);
  const match = allowedSexValues.find(
    (option) => option.toLocaleLowerCase() === normalized.toLocaleLowerCase()
  );
  return match || normalized;
}

function isNonHumanEntity(name, role, character) {
  const value = [name, role, character.type, character.kind, character.category]
    .map(cleanText)
    .join(" ")
    .toLocaleLowerCase();

  return nonHumanRoles.some((label) =>
    new RegExp(`(^|[^a-z])${escapeRegExp(label)}([^a-z]|$)`, "i").test(value)
  );
}

function storyLikelyHasHumanCharacter(lesson) {
  return Boolean(cleanText(lesson.setup?.mainCharacter?.name));
}

function includesBlockedLabel(value) {
  return blockedExternalLabels.some((label) =>
    new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(label)}([^A-Za-z0-9]|$)`, "i").test(value)
  );
}

function normalizeName(value) {
  return cleanText(value)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
