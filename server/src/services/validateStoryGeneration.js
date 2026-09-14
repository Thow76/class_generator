const blockedExternalLabels = ["A" + "1", "A" + "2", "B" + "1", "C" + "E" + "F" + "R"];

export class StoryValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "StoryValidationError";
    this.statusCode = 422;
    this.details = details;
  }
}

export function parseStoryGenerationResponse(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    throw new StoryValidationError("Generated story response was not valid JSON.", [
      {
        field: "response",
        message: "Generated story response was not valid JSON."
      }
    ]);
  }
}

export function validateStoryGeneration(response, lesson) {
  const errors = [];
  const expectedCount = Number(lesson.sentenceCount);

  if (!isPlainObject(response)) {
    throw new StoryValidationError("Generated story response is invalid.", [
      { field: "response", message: "Response must be an object." }
    ]);
  }

  if (!Array.isArray(response.sentences)) {
    errors.push({
      field: "sentences",
      message: "Response must include a sentences array."
    });
  } else if (response.sentences.length !== expectedCount) {
    errors.push({
      field: "sentences",
      message: `Generated story must include exactly ${expectedCount} sentences.`
    });
  }

  Object.keys(response).forEach((key) => {
    if (key !== "sentences") {
      errors.push({
        field: key,
        message: "Generated story response includes an unsupported field."
      });
    }
  });

  const seen = new Set();
  response.sentences?.forEach((sentence, index) => {
    const field = `sentences[${index}].text`;
    if (!isPlainObject(sentence)) {
      errors.push({ field: `sentences[${index}]`, message: "Sentence must be an object." });
      return;
    }

    Object.keys(sentence).forEach((key) => {
      if (key !== "text") {
        errors.push({
          field: `sentences[${index}].${key}`,
          message: "Generated sentence includes an unsupported field."
        });
      }
    });

    const text = typeof sentence.text === "string" ? sentence.text.trim() : "";
    if (!text) {
      errors.push({ field, message: "Sentence text is required." });
      return;
    }

    if (sentence.text !== text) {
      sentence.text = text;
    }

    if (/^\s*(?:[-*•]\s*|\d+[.)]\s*)/.test(text)) {
      errors.push({
        field,
        message: "Sentence text must not include bullets or numbering."
      });
    }

    if (/\r|\n/.test(text)) {
      errors.push({
        field,
        message: "Sentence text must not contain blank lines."
      });
    }

    if (includesBlockedLabel(text)) {
      errors.push({
        field,
        message: "Sentence text includes an unsupported proficiency label."
      });
    }

    const key = text.toLocaleLowerCase();
    if (seen.has(key)) {
      errors.push({
        field,
        message: "Generated sentences must not be duplicates."
      });
    }
    seen.add(key);
  });

  if (errors.length > 0) {
    throw new StoryValidationError("Generated story response is invalid.", errors);
  }

  return {
    sentences: response.sentences.map((sentence) => ({
      text: sentence.text.trim()
    }))
  };
}

export function validateStorySentenceOperation(response) {
  const errors = [];

  if (!isPlainObject(response)) {
    throw new StoryValidationError("Story sentence response is invalid.", [
      { field: "response", message: "Response must be an object." }
    ]);
  }

  Object.keys(response).forEach((key) => {
    if (key !== "sentence") {
      errors.push({
        field: key,
        message: "Story sentence response includes an unsupported field."
      });
    }
  });

  if (!isPlainObject(response.sentence)) {
    errors.push({
      field: "sentence",
      message: "Response must include a sentence object."
    });
  } else {
    Object.keys(response.sentence).forEach((key) => {
      if (key !== "text") {
        errors.push({
          field: `sentence.${key}`,
          message: "Story sentence response includes an unsupported field."
        });
      }
    });

    const text =
      typeof response.sentence.text === "string" ? response.sentence.text.trim() : "";
    if (!text) {
      errors.push({
        field: "sentence.text",
        message: "Sentence text is required."
      });
    } else {
      if (response.sentence.text !== text) {
        response.sentence.text = text;
      }

      if (/^\s*(?:[-*•]\s*|\d+[.)]\s*)/.test(text)) {
        errors.push({
          field: "sentence.text",
          message: "Sentence text must not include bullets or numbering."
        });
      }

      if (/\r|\n/.test(text)) {
        errors.push({
          field: "sentence.text",
          message: "Sentence text must not contain blank lines."
        });
      }

      if (includesBlockedLabel(text)) {
        errors.push({
          field: "sentence.text",
          message: "Sentence text includes an unsupported proficiency label."
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new StoryValidationError("Story sentence response is invalid.", errors);
  }

  return {
    sentence: {
      text: response.sentence.text.trim()
    }
  };
}

function includesBlockedLabel(value) {
  return blockedExternalLabels.some((label) =>
    new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(label)}([^A-Za-z0-9]|$)`, "i").test(value)
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
