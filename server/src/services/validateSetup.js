const learnerLevels = [
  "Literacies Plus",
  "Complete Beginner",
  "Beginner 1",
  "Beginner 1.5",
  "Beginner 2"
];

const sentenceCounts = [6, 8, 9, 10, 12];
const sexOptions = ["Woman", "Man", "Non-binary", "Unspecified"];

const requiredSetupFields = [
  { field: "theme", message: "Enter a theme." },
  { field: "learnerLevel", message: "Choose a learner level." },
  { field: "setting", message: "Enter the setting." },
  { field: "scenario", message: "Describe the main situation." },
  { field: "setup.mainCharacter.name", message: "Enter the main character name." },
  { field: "setup.mainCharacter.age", message: "Enter an age or age range." },
  { field: "setup.mainCharacter.sex", message: "Choose sex or gender." },
  {
    field: "setup.mainCharacter.background",
    message: "Enter a background or nationality."
  },
  { field: "sentenceCount", message: "Choose the number of sentences." }
];

export function validateSetup(lesson) {
  const errors = [];

  requiredSetupFields.forEach(({ field, message }) => {
    if (isBlank(getValue(lesson, field))) {
      errors.push({ field, message });
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

function replaceFieldError(errors, nextError) {
  const existingIndex = errors.findIndex((error) => error.field === nextError.field);
  if (existingIndex === -1) {
    errors.push(nextError);
    return;
  }
  errors[existingIndex] = nextError;
}

function getValue(value, field) {
  return field.split(".").reduce((current, key) => current?.[key], value);
}

function isBlank(value) {
  return typeof value === "string"
    ? value.trim() === ""
    : value === null || value === undefined;
}
