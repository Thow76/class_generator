export async function extractCharacters(lessonId) {
  const response = await fetch("/api/characters/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ lessonId })
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw new CharacterApiError(readableError(body, response), response.status, body);
  }

  return body.lesson;
}

export async function updateCharacterAppearance(lessonId, characterId) {
  const response = await fetch("/api/characters/appearance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ lessonId, characterId })
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw new CharacterApiError(readableError(body, response), response.status, body);
  }

  return body;
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function readableError(body, response) {
  if (Array.isArray(body?.details) && body.details.length > 0) {
    return body.details
      .map((detail) => `${detail.field || detail.path || "characters"}: ${detail.message}`)
      .join(" ");
  }

  return body?.error || `Character extraction failed with ${response.status}.`;
}

export class CharacterApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "CharacterApiError";
    this.status = status;
    this.body = body;
  }
}
