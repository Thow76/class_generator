import express from "express";
import {
  getMediaReadinessForProject,
  toMediaReadinessRouteError
} from "../services/mediaReadinessService.js";

const router = express.Router();

router.post("/readiness", async (request, response) => {
  try {
    const { lessonId } = request.body || {};
    response.json(await getMediaReadinessForProject(lessonId));
  } catch (error) {
    sendMediaError(response, error);
  }
});

function sendMediaError(response, error) {
  const routeError = toMediaReadinessRouteError(error);
  response.status(routeError.statusCode || 500).json({
    error:
      routeError.statusCode === 500 ? "Unexpected server error." : routeError.message,
    details: routeError.details
  });
}

export default router;
