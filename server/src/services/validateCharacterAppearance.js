const maxAppearanceDescriptionLength = 600;
const blockedStandalonePhrases = [
  "clear face",
  "adult learner context",
  "same outfit each image"
];
const blockedTextFragments = ["learner level"];

export class CharacterAppearanceValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "CharacterAppearanceValidationError";
    this.statusCode = 422;
    this.details = details;
  }
}

export function parseCharacterAppearanceResponse(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    throw new CharacterAppearanceValidationError(
      "Character appearance response was not valid JSON.",
      [
        {
          field: "response",
          message: "Character appearance response was not valid JSON."
        }
      ]
    );
  }
}

export function validateCharacterAppearanceResponse(response) {
  const errors = [];

  if (!isPlainObject(response)) {
    throw new CharacterAppearanceValidationError(
      "Character appearance response is invalid.",
      [{ field: "response", message: "Response must be an object." }]
    );
  }

  Object.keys(response).forEach((key) => {
    if (key !== "appearanceDescription") {
      errors.push({
        field: key,
        message: "Character appearance response includes an unsupported field."
      });
    }
  });

  if (typeof response.appearanceDescription !== "string") {
    errors.push({
      field: "appearanceDescription",
      message: "appearanceDescription must be a string."
    });
  }

  const appearanceDescription = cleanLongText(response.appearanceDescription);
  if (!appearanceDescription) {
    errors.push({
      field: "appearanceDescription",
      message: "appearanceDescription is required."
    });
  }

  if (appearanceDescription.length > maxAppearanceDescriptionLength) {
    errors.push({
      field: "appearanceDescription",
      message: "appearanceDescription is too long."
    });
  }

  if (looksLikeBoilerplate(appearanceDescription)) {
    errors.push({
      field: "appearanceDescription",
      message: "appearanceDescription must be plain text, not labels or markup."
    });
  }

  const lowerDescription = appearanceDescription.toLocaleLowerCase();
  blockedTextFragments.forEach((fragment) => {
    if (lowerDescription.includes(fragment)) {
      errors.push({
        field: "appearanceDescription",
        message: "appearanceDescription includes non-appearance lesson metadata."
      });
    }
  });

  blockedStandalonePhrases.forEach((phrase) => {
    if (includesStandalonePhrase(lowerDescription, phrase)) {
      errors.push({
        field: "appearanceDescription",
        message: "appearanceDescription includes vague image-control wording."
      });
    }
  });

  if (errors.length > 0) {
    throw new CharacterAppearanceValidationError(
      "Character appearance response is invalid.",
      errors
    );
  }

  return {
    appearanceDescription
  };
}

function cleanLongText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

function looksLikeBoilerplate(value) {
  return (
    /^[-*]\s+/.test(value) ||
    /\n\s*[-*]\s+/.test(value) ||
    /^appearance\s+description\s*:/i.test(value) ||
    /^[A-Za-z ]{1,32}:\s+/.test(value) ||
    /[{}[\]]/.test(value) ||
    /```/.test(value)
  );
}

function includesStandalonePhrase(value, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(value);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
