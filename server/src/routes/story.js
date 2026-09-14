import express from "express";
import {
  generateStoryForProject,
  lockStoryForProject,
  regenerateSentenceForProject,
  regenerateStoryForProject,
  shortenSentenceForProject,
  toStoryRouteError,
  unlockStoryForProject
} from "../services/storyGenerationService.js";

const router = express.Router();

router.post("/generate", async (request, response) => {
  try {
    const lessonId = request.body?.lessonId;
    if (typeof lessonId !== "string" || lessonId.trim() === "") {
      response.status(400).json({
        error: "Request body must include lessonId."
      });
      return;
    }

    const lesson = await generateStoryForProject(lessonId, {
      confirmedOverwrite: request.body?.confirmedOverwrite === true
    });
    response.json({ lesson });
  } catch (error) {
    const routeError = toStoryRouteError(error);
    console.error(routeError.message, routeError.details || "");
    response.status(routeError.statusCode || 500).json({
      error:
        routeError.statusCode === 500 ? "Unexpected server error." : routeError.message,
      details: routeError.details
    });
  }
});

router.post("/regenerate", async (request, response) => {
  try {
    const lessonId = request.body?.lessonId;
    if (typeof lessonId !== "string" || lessonId.trim() === "") {
      response.status(400).json({
        error: "Request body must include lessonId."
      });
      return;
    }

    const lesson = await regenerateStoryForProject(lessonId, {
      confirmedOverwrite: request.body?.confirmedOverwrite === true
    });
    response.json({ lesson });
  } catch (error) {
    sendStoryError(response, error);
  }
});

router.post("/regenerate-sentence", async (request, response) => {
  try {
    const { lessonId, sentenceId } = request.body || {};
    const lesson = await regenerateSentenceForProject(lessonId, sentenceId);
    response.json({ lesson });
  } catch (error) {
    sendStoryError(response, error);
  }
});

router.post("/shorten-sentence", async (request, response) => {
  try {
    const { lessonId, sentenceId } = request.body || {};
    const lesson = await shortenSentenceForProject(lessonId, sentenceId);
    response.json({ lesson });
  } catch (error) {
    sendStoryError(response, error);
  }
});

router.post("/lock", async (request, response) => {
  try {
    const lesson = await lockStoryForProject(request.body?.lessonId);
    response.json({ lesson });
  } catch (error) {
    sendStoryError(response, error);
  }
});

router.post("/unlock", async (request, response) => {
  try {
    const lesson = await unlockStoryForProject(request.body?.lessonId, {
      confirmedUnlock: request.body?.confirmedUnlock === true
    });
    response.json({ lesson });
  } catch (error) {
    sendStoryError(response, error);
  }
});

function sendStoryError(response, error) {
  const routeError = toStoryRouteError(error);
  console.error(routeError.message, routeError.details || "");
  response.status(routeError.statusCode || 500).json({
    error:
      routeError.statusCode === 500 ? "Unexpected server error." : routeError.message,
    details: routeError.details
  });
}

export default router;
