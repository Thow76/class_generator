export async function generateCharacterImage(lessonId, characterId) {
  const body = await request("/api/images/character", {
    method: "POST",
    body: JSON.stringify({ lessonId, characterId })
  });
  return body;
}

export async function approveCharacterImage(lessonId, characterId) {
  const body = await request("/api/images/character/approve", {
    method: "POST",
    body: JSON.stringify({ lessonId, characterId })
  });
  return body.lesson;
}

export async function generateSceneImage(lessonId, sceneId) {
  const body = await request("/api/images/scene", {
    method: "POST",
    body: JSON.stringify({ lessonId, sceneId })
  });
  return body;
}

export async function approveSceneImage(lessonId, sceneId) {
  const body = await request("/api/images/scene/approve", {
    method: "POST",
    body: JSON.stringify({ lessonId, sceneId })
  });
  return body.lesson;
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw new ImageApiError(readableError(body, response), response.status, body);
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
      .map((detail) => `${detail.field || detail.path || "images"}: ${detail.message}`)
      .join(" ");
  }

  return body?.error || `Image request failed with ${response.status}.`;
}

export class ImageApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ImageApiError";
    this.status = status;
    this.body = body;
  }
}
