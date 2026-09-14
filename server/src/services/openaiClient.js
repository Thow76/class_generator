import OpenAI from "openai";

export const defaultStoryModel = "gpt-5-mini";
export const defaultImageModel = "gpt-image-1";

let cachedClient = null;

export class OpenAIConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "OpenAIConfigurationError";
    this.statusCode = 503;
  }
}

export function getStoryModel() {
  return cleanText(process.env.OPENAI_STORY_MODEL) || defaultStoryModel;
}

export function getImageModel() {
  return cleanText(process.env.OPENAI_IMAGE_MODEL) || defaultImageModel;
}

export function getOpenAIClient(configurationLabel = "Story generation") {
  const apiKey = cleanText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new OpenAIConfigurationError(
      `${configurationLabel} is not configured. Set OPENAI_API_KEY on the backend.`
    );
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }

  return cachedClient;
}

export function resetOpenAIClientForTests() {
  cachedClient = null;
}

function cleanText(value) {
  return String(value || "").trim();
}
