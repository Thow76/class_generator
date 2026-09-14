export async function planScenes(lessonId) {
  const response = await fetch("/api/scenes/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ lessonId })
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw new SceneApiError(readableError(body, response), response.status, body);
  }

  return body.lesson;
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
      .map((detail) => `${detail.field || detail.path || "scenes"}: ${detail.message}`)
      .join(" ");
  }

  return body?.error || `Scene planning failed with ${response.status}.`;
}

export class SceneApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "SceneApiError";
    this.status = status;
    this.body = body;
  }
}
