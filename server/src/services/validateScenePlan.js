const allowedSceneFields = [
  "label",
  "sentenceIds",
  "location",
  "description",
  "characterIds",
  "imageMode",
  "reuseSceneId"
];
const allowedImageModes = ["generate", "reuse"];
const blockedExternalLabels = ["A" + "1", "A" + "2", "B" + "1", "C" + "E" + "F" + "R"];
const blockedFields = [
  "au" + "dio",
  "camera",
  "filePath",
  "image",
  "imageData",
  "imagePath",
  "imagePrompt",
  "imageUrl",
  "lens",
  "media",
  "negativePrompt",
  "prompt",
  "render",
  "rendering",
  "shot",
  "style",
  "vid" + "eo",
  "zi" + "p"
];

export class ScenePlanValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ScenePlanValidationError";
    this.statusCode = 422;
    this.details = details;
  }
}

export function parseScenePlanResponse(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    throw new ScenePlanValidationError("Scene planning response was not valid JSON.", [
      {
        field: "response",
        message: "Scene planning response was not valid JSON."
      }
    ]);
  }
}

export function validateScenePlan(response, lesson) {
  const errors = [];
  const sentencePositions = new Map(
    (lesson.story.lockedSentences || []).map((sentence, index) => [
      sentence.id,
      index
    ])
  );
  const approvedCharacterIds = new Set(
    lesson.characters
      .filter((character) => isRequiredCharacter(character) && isApprovedCharacter(character))
      .map((character) => character.id)
  );
  const existingSceneIds = new Set((lesson.scenes || []).map((scene) => scene.id));

  if (!isPlainObject(response)) {
    throw new ScenePlanValidationError("Scene planning response is invalid.", [
      { field: "response", message: "Response must be an object." }
    ]);
  }

  Object.keys(response).forEach((key) => {
    if (key !== "scenes") {
      errors.push({
        field: key,
        message: "Scene planning response includes an unsupported field."
      });
    }
  });

  if (!Array.isArray(response.scenes)) {
    errors.push({
      field: "scenes",
      message: "Response must include a scenes array."
    });
  } else if (response.scenes.length === 0 && sentencePositions.size > 0) {
    errors.push({
      field: "scenes",
      message: "Scene plan must include at least one scene."
    });
  }

  const coveredSentenceIds = new Map();
  const normalizedScenes = [];
  let previousMaxPosition = -1;

  response.scenes?.forEach((scene, index) => {
    const path = `scenes[${index}]`;
    if (!isPlainObject(scene)) {
      errors.push({ field: path, message: "Scene must be an object." });
      return;
    }

    Object.keys(scene).forEach((key) => {
      if (!allowedSceneFields.includes(key)) {
        errors.push({
          field: `${path}.${key}`,
          message: blockedFields.includes(key)
            ? "Scene plan includes a field reserved for a later media phase."
            : "Scene plan includes an unsupported field."
        });
      }
    });

    const label = cleanText(scene.label);
    const location = cleanText(scene.location);
    const description = cleanText(scene.description);
    const sentenceIds = normalizeSentenceIds(
      scene.sentenceIds,
      sentencePositions,
      `${path}.sentenceIds`,
      errors
    );
    const characterIds = normalizeCharacterIds(
      scene.characterIds,
      approvedCharacterIds,
      `${path}.characterIds`,
      errors
    );
    const imageMode = cleanText(scene.imageMode) || "generate";
    const reuseSceneId =
      scene.reuseSceneId === null || scene.reuseSceneId === undefined
        ? null
        : cleanText(scene.reuseSceneId);

    if (!label) {
      errors.push({ field: `${path}.label`, message: "Scene label is required." });
    } else if (label.length > 64) {
      errors.push({ field: `${path}.label`, message: "Scene label is too long." });
    }

    if (!location) {
      errors.push({
        field: `${path}.location`,
        message: "Scene location is required."
      });
    } else if (location.length > 96) {
      errors.push({ field: `${path}.location`, message: "Scene location is too long." });
    }

    if (!description) {
      errors.push({
        field: `${path}.description`,
        message: "Scene description is required."
      });
    } else if (description.length > 280) {
      errors.push({
        field: `${path}.description`,
        message: "Scene description is too long."
      });
    }

    if (!allowedImageModes.includes(imageMode)) {
      errors.push({
        field: `${path}.imageMode`,
        message: "Scene image mode is unsupported."
      });
    }

    if (reuseSceneId && !existingSceneIds.has(reuseSceneId)) {
      errors.push({
        field: `${path}.reuseSceneId`,
        message: "Scene reuse reference does not match an existing scene."
      });
    }

    const searchable = [label, location, description].join(" ");
    if (includesBlockedLabel(searchable)) {
      errors.push({
        field: path,
        message: "Scene plan includes an unsupported proficiency label."
      });
    }

    if (sentenceIds.length === 0) {
      errors.push({
        field: `${path}.sentenceIds`,
        message: "Scene must cover at least one locked story sentence."
      });
    } else {
      const firstPosition = sentencePositions.get(sentenceIds[0]);
      const lastPosition = sentencePositions.get(sentenceIds[sentenceIds.length - 1]);
      if (firstPosition <= previousMaxPosition) {
        errors.push({
          field: `${path}.sentenceIds`,
          message: "Scenes must follow locked story order."
        });
      }
      previousMaxPosition = lastPosition;
    }

    sentenceIds.forEach((sentenceId) => {
      const existing = coveredSentenceIds.get(sentenceId);
      if (existing) {
        errors.push({
          field: `${path}.sentenceIds`,
          message: `Sentence ${sentenceId} is covered by more than one scene.`
        });
      } else {
        coveredSentenceIds.set(sentenceId, path);
      }
    });

    normalizedScenes.push({
      label,
      sentenceIds,
      location,
      description,
      characterIds,
      imageMode,
      reuseSceneId
    });
  });

  for (const sentenceId of sentencePositions.keys()) {
    if (!coveredSentenceIds.has(sentenceId)) {
      errors.push({
        field: "scenes.sentenceIds",
        message: `Locked story sentence ${sentenceId} is not covered by the scene plan.`
      });
    }
  }

  if (errors.length > 0) {
    throw new ScenePlanValidationError("Scene planning response is invalid.", errors);
  }

  return { scenes: normalizedScenes };
}

function normalizeSentenceIds(value, sentencePositions, field, errors) {
  if (!Array.isArray(value)) {
    errors.push({ field, message: "Scene sentence ids must be an array." });
    return [];
  }

  const seen = new Set();
  const ids = [];
  value.forEach((id, index) => {
    const normalized = cleanText(id);
    if (!normalized) return;
    if (!sentencePositions.has(normalized)) {
      errors.push({
        field: `${field}[${index}]`,
        message: `Scene references unknown sentence ${normalized}.`
      });
      return;
    }
    if (seen.has(normalized)) {
      errors.push({
        field: `${field}[${index}]`,
        message: `Scene repeats sentence ${normalized}.`
      });
      return;
    }
    seen.add(normalized);
    ids.push(normalized);
  });

  return ids.sort((leftId, rightId) => sentencePositions.get(leftId) - sentencePositions.get(rightId));
}

function normalizeCharacterIds(value, approvedCharacterIds, field, errors) {
  if (!Array.isArray(value)) {
    errors.push({ field, message: "Scene character ids must be an array." });
    return [];
  }

  const seen = new Set();
  return value.reduce((ids, id, index) => {
    const normalized = cleanText(id);
    if (!normalized) return ids;
    if (!approvedCharacterIds.has(normalized)) {
      errors.push({
        field: `${field}[${index}]`,
        message: `Scene references unknown or unapproved character ${normalized}.`
      });
      return ids;
    }
    if (seen.has(normalized)) return ids;
    seen.add(normalized);
    return [...ids, normalized];
  }, []);
}

function isRequiredCharacter(character) {
  return ["main", "secondary", "supporting"].includes(character?.role);
}

function isApprovedCharacter(character) {
  return (
    character?.approved === true &&
    character?.generationStatus === "approved" &&
    Boolean(character?.imagePath) &&
    character?.stale !== true
  );
}

function includesBlockedLabel(value) {
  return blockedExternalLabels.some((label) => {
    const expression = new RegExp(`(^|[^A-Za-z0-9])${label}([^A-Za-z0-9]|$)`, "i");
    return expression.test(value);
  });
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
