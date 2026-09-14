export async function getMediaReadiness(lessonId) {
  const body = await request("/api/media/readiness", {
    method: "POST",
    body: JSON.stringify({ lessonId })
  });
  return body;
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
    throw new MediaApiError(readableError(body, response), response.status, body);
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
      .map((detail) => `${detail.field || detail.path || "media"}: ${detail.message}`)
      .join(" ");
  }

  return body?.error || `Media request failed with ${response.status}.`;
}

export class MediaApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "MediaApiError";
    this.status = status;
    this.body = body;
  }
}
