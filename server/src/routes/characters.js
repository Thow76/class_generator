import express from "express";
import {
  extractCharactersForProject,
  toCharacterRouteError
} from "../services/characterExtractionService.js";
import {
  toCharacterAppearanceRouteError,
  updateCharacterAppearanceForProject
} from "../services/characterAppearanceService.js";

const router = express.Router();

router.post("/extract", async (request, response) => {
  try {
    const lessonId = request.body?.lessonId;
    if (typeof lessonId !== "string" || lessonId.trim() === "") {
      response.status(400).json({
        error: "Request body must include lessonId."
      });
      return;
    }

    const lesson = await extractCharactersForProject(lessonId);
    response.json({ lesson });
  } catch (error) {
    const routeError = toCharacterRouteError(error);
    console.error(routeError.message, routeError.details || "");
    response.status(routeError.statusCode || 500).json({
      error:
        routeError.statusCode === 500 ? "Unexpected server error." : routeError.message,
      details: routeError.details
    });
  }
});

router.post("/appearance", async (request, response) => {
  try {
    const lessonId = request.body?.lessonId;
    const characterId = request.body?.characterId;
    const result = await updateCharacterAppearanceForProject(lessonId, characterId);
    response.json(result);
  } catch (error) {
    const routeError = toCharacterAppearanceRouteError(error);
    console.error(routeError.message, routeError.details || "");
    response.status(routeError.statusCode || 500).json({
      error:
        routeError.statusCode === 500 ? "Unexpected server error." : routeError.message,
      details: routeError.details
    });
  }
});

export default router;
