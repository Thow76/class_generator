export async function generateStory(lessonId, options = {}) {
  return requestStory("/api/story/generate", {
    lessonId,
    confirmedOverwrite: options.confirmedOverwrite === true
  });
}

export async function regenerateStory(lessonId, options = {}) {
  return requestStory("/api/story/regenerate", {
    lessonId,
    confirmedOverwrite: options.confirmedOverwrite === true
  });
}

export async function regenerateSentence(lessonId, sentenceId) {
  return requestStory("/api/story/regenerate-sentence", { lessonId, sentenceId });
}

export async function shortenSentence(lessonId, sentenceId) {
  return requestStory("/api/story/shorten-sentence", { lessonId, sentenceId });
}

export async function lockStory(lessonId) {
  return requestStory("/api/story/lock", { lessonId });
}

export async function unlockStory(lessonId, options = {}) {
  return requestStory("/api/story/unlock", {
    lessonId,
    confirmedUnlock: options.confirmedUnlock === true
  });
}

async function requestStory(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw new StoryApiError(readableError(body, response), response.status, body);
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
      .map((detail) => `${detail.field || detail.path || "story"}: ${detail.message}`)
      .join(" ");
  }

  return body?.error || `Story generation failed with ${response.status}.`;
}

export class StoryApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "StoryApiError";
    this.status = status;
    this.body = body;
  }
}
