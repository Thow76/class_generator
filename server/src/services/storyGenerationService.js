import {
  buildRegenerateSentencePrompt,
  buildShortenSentencePrompt,
  buildStoryGenerationPrompt,
  storyPromptVersion,
  storyRegenerateSentencePromptVersion,
  storyShortenSentencePromptVersion
} from "../prompts/storyPrompts.js";
import {
  storyGenerationResponseFormat,
  storyGenerationSchemaVersion,
  storySentenceOperationResponseFormat,
  storySentenceOperationSchemaVersion
} from "../schemas/storySchemas.js";
import { getOpenAIClient, getStoryModel, OpenAIConfigurationError } from "./openaiClient.js";
import { getProject, ProjectStoreError, updateProject } from "./projectStore.js";
import { formatValidationErrors, validateLesson } from "./validateLesson.js";
import { validateSetup } from "./validateSetup.js";
import {
  parseStoryGenerationResponse,
  StoryValidationError,
  validateStoryGeneration,
  validateStorySentenceOperation
} from "./validateStoryGeneration.js";

export class StoryGenerationError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "StoryGenerationError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function generateStoryForProject(projectId, options = {}) {
  if (!projectId) {
    throw new StoryGenerationError("Request body must include lessonId.", 400);
  }

  const lesson = await getProject(projectId);
  assertReadyForGeneration(lesson);
  const hasExistingStory = hasStorySentences(lesson);
  if (hasExistingStory && options.confirmedOverwrite !== true) {
    throw new StoryGenerationError(
      "Confirm overwrite before generating a new story.",
      409
    );
  }

  const model = options.model || getStoryModel();
  const client = options.client || getOpenAIClient();
  const now = options.now || new Date().toISOString();
  const prompt = buildStoryGenerationPrompt(lesson);

  let response;
  try {
    response = await client.responses.create({
      model,
      input: prompt.input,
      text: {
        format: storyGenerationResponseFormat
      }
    });
  } catch (error) {
    if (error instanceof OpenAIConfigurationError) throw error;
    throw new StoryGenerationError("Story generation failed. Please try again.", 503);
  }

  const parsed = parseStoryGenerationResponse(readResponseText(response));
  const generatedStory = validateStoryGeneration(parsed, lesson);
  const updatedLesson = applyGeneratedStory(lesson, generatedStory.sentences, {
    model,
    now,
    resetLock: hasExistingStory,
    markStale: hasExistingStory && hasDownstreamOutput(lesson),
    staleReason: "Story regenerated after downstream work existed"
  });

  return updateProject(projectId, updatedLesson);
}

export async function regenerateStoryForProject(projectId, options = {}) {
  if (!projectId) {
    throw new StoryGenerationError("Request body must include lessonId.", 400);
  }
  if (options.confirmedOverwrite !== true) {
    throw new StoryGenerationError(
      "Confirm overwrite before regenerating the whole story.",
      409
    );
  }

  const lesson = await getProject(projectId);
  assertReadyForRegeneration(lesson);

  const model = options.model || getStoryModel();
  const client = options.client || getOpenAIClient();
  const now = options.now || new Date().toISOString();
  const prompt = buildStoryGenerationPrompt(lesson);

  const response = await callOpenAI(client, {
    model,
    input: prompt.input,
    format: storyGenerationResponseFormat,
    failureMessage: "Story regeneration failed. Please try again."
  });

  const parsed = parseStoryGenerationResponse(readResponseText(response));
  const generatedStory = validateStoryGeneration(parsed, lesson);
  const updatedLesson = applyGeneratedStory(lesson, generatedStory.sentences, {
    model,
    now,
    resetLock: true,
    markStale: hasDownstreamOutput(lesson),
    staleReason: "Story regenerated after downstream work existed"
  });

  return updateProject(projectId, updatedLesson);
}

export async function regenerateSentenceForProject(projectId, sentenceId, options = {}) {
  return applySentenceOperation(projectId, sentenceId, {
    ...options,
    source: "regenerated",
    promptVersion: storyRegenerateSentencePromptVersion,
    buildPrompt: buildRegenerateSentencePrompt,
    failureMessage: "Sentence regeneration failed. Please try again."
  });
}

export async function shortenSentenceForProject(projectId, sentenceId, options = {}) {
  const updatedLesson = await applySentenceOperation(projectId, sentenceId, {
    ...options,
    source: "shortened",
    promptVersion: storyShortenSentencePromptVersion,
    buildPrompt: buildShortenSentencePrompt,
    failureMessage: "Sentence shortening failed. Please try again.",
    validateReplacement: (originalText, nextText) => {
      if (nextText.length > originalText.trim().length) {
        throw new StoryValidationError("Story sentence response is invalid.", [
          {
            field: "sentence.text",
            message: "Shortened sentence must not be longer than the original."
          }
        ]);
      }
    }
  });

  return updatedLesson;
}

export async function lockStoryForProject(projectId, options = {}) {
  if (!projectId) {
    throw new StoryGenerationError("Request body must include lessonId.", 400);
  }

  const lesson = await getProject(projectId);
  assertValidLessonShape(lesson);

  if (!Array.isArray(lesson.story.sentences) || lesson.story.sentences.length === 0) {
    throw new StoryGenerationError("Add or generate a story before locking it.", 422, [
      {
        field: "story.sentences",
        message: "Add or generate a story before locking it."
      }
    ]);
  }

  const now = options.now || new Date().toISOString();
  const updatedLesson = {
    ...lesson,
    story: {
      ...lesson.story,
      status: "locked",
      lockedAt: now,
      lockedSentences: lesson.story.sentences.map((sentence, index) => ({
        id: sentence.id,
        number: index + 1,
        text: sentence.text
      }))
    }
  };

  return updateProject(projectId, updatedLesson);
}

export async function unlockStoryForProject(projectId, options = {}) {
  if (!projectId) {
    throw new StoryGenerationError("Request body must include lessonId.", 400);
  }
  if (options.confirmedUnlock !== true) {
    throw new StoryGenerationError("Confirm unlock before editing the story.", 409);
  }

  const lesson = await getProject(projectId);
  assertValidLessonShape(lesson);

  const updatedLesson = {
    ...lesson,
    story: {
      ...lesson.story,
      status: "draft"
    }
  };

  return updateProject(projectId, updatedLesson);
}

export function applyGeneratedStory(lesson, sentences, metadata) {
  const nextLesson = {
    ...lesson,
    story: {
      ...lesson.story,
      status: "draft",
      lockedAt: metadata.resetLock ? null : lesson.story.lockedAt,
      lockedSentences: metadata.resetLock ? [] : lesson.story.lockedSentences || [],
      modifiedAfterLock: false,
      lastGeneratedAt: metadata.now,
      generationMeta: {
        model: metadata.model,
        promptVersion: storyPromptVersion,
        schemaVersion: storyGenerationSchemaVersion,
        level: lesson.learnerLevel,
        sentenceCount: lesson.sentenceCount
      },
      sentences: sentences.map((sentence, index) => ({
        id: `sentence-${index + 1}`,
        number: index + 1,
        text: sentence.text,
        stale: false,
        source: "generated",
        updatedAt: metadata.now
      }))
    },
    currentStage: "story"
  };

  if (!metadata.markStale) return nextLesson;

  return {
    ...markDownstreamStale(nextLesson, metadata.staleReason, metadata.now),
    story: {
      ...nextLesson.story,
      modifiedAfterLock: true
    }
  };
}

function assertReadyForGeneration(lesson) {
  assertValidLessonShape(lesson);

  const setupValidation = validateSetup(lesson);
  if (!setupValidation.valid) {
    throw new StoryGenerationError(
      "Setup is incomplete.",
      422,
      setupValidation.errors
    );
  }

  if (lesson.story.status === "locked") {
    throw new StoryGenerationError("Unlock the story before generating a new draft.", 422, [
      {
        field: "story.status",
        message: "Unlock the story before generating a new draft."
      }
    ]);
  }
}

function assertReadyForRegeneration(lesson) {
  assertValidLessonShape(lesson);

  const setupValidation = validateSetup(lesson);
  if (!setupValidation.valid) {
    throw new StoryGenerationError(
      "Setup is incomplete.",
      422,
      setupValidation.errors
    );
  }
}

function assertValidLessonShape(lesson) {
  const shapeValidation = validateLesson(lesson);
  if (!shapeValidation.valid) {
    throw new StoryGenerationError(
      `Lesson shape is invalid. ${formatValidationErrors(shapeValidation.errors)}`,
      422,
      shapeValidation.errors
    );
  }
}

async function applySentenceOperation(projectId, sentenceId, options) {
  if (!projectId) {
    throw new StoryGenerationError("Request body must include lessonId.", 400);
  }
  if (typeof sentenceId !== "string" || sentenceId.trim() === "") {
    throw new StoryGenerationError("Request body must include sentenceId.", 400);
  }

  const lesson = await getProject(projectId);
  assertEditableStory(lesson);

  const sentence = lesson.story.sentences.find((item) => item.id === sentenceId);
  if (!sentence) {
    throw new StoryGenerationError("Story sentence not found.", 404, [
      {
        field: "sentenceId",
        message: "Story sentence not found."
      }
    ]);
  }

  const model = options.model || getStoryModel();
  const client = options.client || getOpenAIClient();
  const now = options.now || new Date().toISOString();
  const prompt = options.buildPrompt(lesson, sentence);

  const response = await callOpenAI(client, {
    model,
    input: prompt.input,
    format: storySentenceOperationResponseFormat,
    failureMessage: options.failureMessage
  });

  const parsed = parseStoryGenerationResponse(readResponseText(response));
  const result = validateStorySentenceOperation(parsed, lesson);
  options.validateReplacement?.(sentence.text, result.sentence.text);

  const shouldMarkStale = Boolean(lesson.story.lockedAt) || hasDownstreamOutput(lesson);
  const updatedLesson = {
    ...lesson,
    story: {
      ...lesson.story,
      modifiedAfterLock: lesson.story.modifiedAfterLock || shouldMarkStale,
      sentences: renumberSentences(
        lesson.story.sentences.map((item) =>
          item.id === sentenceId
            ? {
                ...item,
                text: result.sentence.text,
                stale: false,
                source: options.source,
                updatedAt: now,
                operationMeta: {
                  model,
                  promptVersion: options.promptVersion,
                  schemaVersion: storySentenceOperationSchemaVersion,
                  updatedAt: now
                }
              }
            : item
        )
      )
    },
    currentStage: "story"
  };

  return updateProject(
    projectId,
    shouldMarkStale
      ? markDownstreamStale(updatedLesson, "Story sentence changed", now)
      : updatedLesson
  );
}

function assertEditableStory(lesson) {
  assertValidLessonShape(lesson);

  if (lesson.story.status === "locked") {
    throw new StoryGenerationError("Unlock the story before editing it.", 422, [
      {
        field: "story.status",
        message: "Unlock the story before editing it."
      }
    ]);
  }
}

async function callOpenAI(client, { model, input, format, failureMessage }) {
  try {
    return await client.responses.create({
      model,
      input,
      text: {
        format
      }
    });
  } catch (error) {
    if (error instanceof OpenAIConfigurationError) throw error;
    throw new StoryGenerationError(failureMessage, 503);
  }
}

function readResponseText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new StoryValidationError("Generated story response was empty.", [
    {
      field: "response",
      message: "Generated story response was empty."
    }
  ]);
}

function renumberSentences(sentences) {
  return sentences.map((sentence, index) => ({
    ...sentence,
    number: index + 1
  }));
}

function hasDownstreamOutput(lesson) {
  return (
    lesson.characters.some(hasGeneratedOutput) ||
    lesson.scenes.some(hasGeneratedOutput)
  );
}

function hasStorySentences(lesson) {
  return Array.isArray(lesson.story?.sentences) && lesson.story.sentences.length > 0;
}

function hasGeneratedOutput(record) {
  return record.approved || record.generationStatus === "generated";
}

function markDownstreamStale(lesson, staleReason, staleAt) {
  return {
    ...lesson,
    characters: markGeneratedRecordsStale(lesson.characters, staleReason, staleAt),
    scenes: markGeneratedRecordsStale(lesson.scenes, staleReason, staleAt),
    media: {
      ...lesson.media,
      stale: true,
      staleReason,
      staleAt
    },
    export: {
      ...lesson.export,
      stale: true,
      staleReason,
      staleAt
    }
  };
}

function markGeneratedRecordsStale(records, staleReason, staleAt) {
  return records.map((record) =>
    hasGeneratedOutput(record)
      ? {
          ...record,
          stale: true,
          staleReason,
          staleAt
        }
      : record
  );
}

export function toStoryRouteError(error) {
  if (
    error instanceof StoryGenerationError ||
    error instanceof StoryValidationError ||
    error instanceof ProjectStoreError ||
    error instanceof OpenAIConfigurationError
  ) {
    return error;
  }

  return new StoryGenerationError("Unexpected server error.", 500);
}
