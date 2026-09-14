import express from "express";
import {
  approveCharacterImageForProject,
  generateCharacterImageForProject,
  toCharacterImageRouteError
} from "../services/characterImageService.js";
import {
  approveSceneImageForProject,
  generateSceneImageForProject,
  toSceneImageRouteError
} from "../services/sceneImageService.js";

const router = express.Router();

router.post("/character", async (request, response) => {
  try {
    const { lessonId, characterId } = request.body || {};
    const result = await generateCharacterImageForProject(lessonId, characterId);
    response.json(result);
  } catch (error) {
    sendImageError(response, error);
  }
});

router.post("/character/approve", async (request, response) => {
  try {
    const { lessonId, characterId } = request.body || {};
    const lesson = await approveCharacterImageForProject(lessonId, characterId);
    response.json({ lesson });
  } catch (error) {
    sendImageError(response, error);
  }
});

router.post("/scene", async (request, response) => {
  try {
    const { lessonId, sceneId } = request.body || {};
    const result = await generateSceneImageForProject(lessonId, sceneId);
    response.json(result);
  } catch (error) {
    sendImageError(response, error);
  }
});

router.post("/scene/approve", async (request, response) => {
  try {
    const { lessonId, sceneId } = request.body || {};
    const lesson = await approveSceneImageForProject(lessonId, sceneId);
    response.json({ lesson });
  } catch (error) {
    sendImageError(response, error);
  }
});

function sendImageError(response, error) {
  const routeError =
    error?.name === "SceneImageError"
      ? toSceneImageRouteError(error)
      : toCharacterImageRouteError(error);
  console.error(routeError.message, routeError.details || "");
  response.status(routeError.statusCode || 500).json({
    error:
      routeError.statusCode === 500 ? "Unexpected server error." : routeError.message,
    details: routeError.details
  });
}

export default router;
