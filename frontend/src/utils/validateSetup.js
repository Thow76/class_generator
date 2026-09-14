import { learnerLevels, sentenceCounts, sexOptions } from "../data/constants.js";

export const requiredSetupFields = [
  {
    id: "theme",
    message: "Enter a theme."
  },
  {
    id: "learnerLevel",
    message: "Choose a learner level."
  },
  {
    id: "setting",
    message: "Enter the setting."
  },
  {
    id: "scenario",
    message: "Describe the main situation."
  },
  {
    id: "setup.mainCharacter.name",
    message: "Enter the main character name."
  },
  {
    id: "setup.mainCharacter.age",
    message: "Enter an age or age range."
  },
  {
    id: "setup.mainCharacter.sex",
    message: "Choose sex or gender."
  },
  {
    id: "setup.mainCharacter.background",
    message: "Enter a background or nationality."
  },
  {
    id: "sentenceCount",
    message: "Choose the number of sentences."
  }
];

export const optionalSetupFields = [
  "title",
  "setup.secondaryCharacters",
  "setup.targetVocabulary",
  "setup.additionalNotes"
];

export function validateSetup(lesson) {
  const errors = [];

  requiredSetupFields.forEach(({ id, message }) => {
    if (isBlank(getSetupValue(lesson, id))) {
      errors.push({ field: id, message });
    }
  });

  if (!learnerLevels.includes(lesson?.learnerLevel)) {
    replaceFieldError(errors, {
      field: "learnerLevel",
      message: "Choose a learner level."
    });
  }

  if (!sentenceCounts.includes(Number(lesson?.sentenceCount))) {
    replaceFieldError(errors, {
      field: "sentenceCount",
      message: "Choose the number of sentences."
    });
  }

  if (!sexOptions.includes(lesson?.setup?.mainCharacter?.sex)) {
    replaceFieldError(errors, {
      field: "setup.mainCharacter.sex",
      message: "Choose sex or gender."
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function isSetupComplete(lesson) {
  return validateSetup(lesson).valid;
}

export function getSetupFieldError(errors, fieldId) {
  return errors.find((error) => error.field === fieldId)?.message || "";
}

export function normalizeSecondaryCharacterTags(tags) {
  const seen = new Set();

  return ensureArray(tags).reduce((nextTags, tag) => {
    const normalized = normalizeTag(String(tag || ""));
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) return nextTags;
    seen.add(key);
    return [...nextTags, normalized];
  }, []);
}

function replaceFieldError(errors, nextError) {
  const existingIndex = errors.findIndex((error) => error.field === nextError.field);
  if (existingIndex === -1) {
    errors.push(nextError);
    return;
  }
  errors[existingIndex] = nextError;
}

function getSetupValue(lesson, fieldId) {
  return fieldId.split(".").reduce((value, key) => value?.[key], lesson);
}

function isBlank(value) {
  return typeof value === "string" ? value.trim() === "" : value === null || value === undefined;
}

function normalizeTag(value) {
  return value.trim().replace(/\s+/g, " ");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
