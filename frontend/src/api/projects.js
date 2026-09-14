export async function listProjects() {
  const body = await request("/api/projects");
  return body.projects || [];
}

export async function createProject(initialLesson) {
  const body = await request("/api/projects", {
    method: "POST",
    body: JSON.stringify(initialLesson ? { lesson: initialLesson } : {})
  });
  return body.project;
}

export async function getProject(projectId) {
  const body = await request(`/api/projects/${encodeURIComponent(projectId)}`);
  return body.lesson;
}

export async function saveProject(projectId, lesson) {
  const body = await request(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "PUT",
    body: JSON.stringify({ lesson })
  });
  return body.lesson;
}

export async function duplicateProject(projectId) {
  return request(`/api/projects/${encodeURIComponent(projectId)}/duplicate`, {
    method: "POST"
  });
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
    throw new ProjectApiError(readableError(body, response), response.status, body);
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
      .map((detail) => `${detail.path}: ${detail.message}`)
      .join(" ");
  }

  return body?.error || `Project request failed with ${response.status}.`;
}

export class ProjectApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ProjectApiError";
    this.status = status;
    this.body = body;
  }
}
