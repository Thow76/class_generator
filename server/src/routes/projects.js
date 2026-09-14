import express from "express";
import {
  createProject,
  duplicateProject,
  getProject,
  listProjects,
  ProjectStoreError,
  updateProject
} from "../services/projectStore.js";
import { ImageStorageError, resolveProjectAsset } from "../services/imageStorage.js";

const router = express.Router();

router.get("/", async (_request, response) => {
  try {
    response.json({ projects: await listProjects() });
  } catch (error) {
    sendError(response, error);
  }
});

router.post("/", async (request, response) => {
  try {
    const initialLesson = request.body?.lesson || request.body || {};
    const project = await createProject(initialLesson);
    response.status(201).json({ project });
  } catch (error) {
    sendError(response, error);
  }
});

router.get("/:id/assets/*", async (request, response) => {
  try {
    const assetPath = request.params[0];
    const asset = await resolveProjectAsset(request.params.id, assetPath);
    response.type(asset.contentType);
    response.sendFile(asset.absolutePath);
  } catch (error) {
    sendError(response, error);
  }
});

router.get("/:id", async (request, response) => {
  try {
    response.json({ lesson: await getProject(request.params.id) });
  } catch (error) {
    sendError(response, error);
  }
});

router.put("/:id", async (request, response) => {
  try {
    if (!request.body?.lesson) {
      response.status(400).json({
        error: "Request body must include a lesson object."
      });
      return;
    }

    const lesson = await updateProject(request.params.id, request.body.lesson);
    response.json({
      lesson,
      savedAt: new Date().toISOString()
    });
  } catch (error) {
    sendError(response, error);
  }
});

router.post("/:id/duplicate", async (request, response) => {
  try {
    response.status(201).json(await duplicateProject(request.params.id));
  } catch (error) {
    sendError(response, error);
  }
});

function sendError(response, error) {
  const statusCode =
    error instanceof ProjectStoreError || error instanceof ImageStorageError
      ? error.statusCode
      : 500;
  response.status(statusCode).json({
    error: statusCode === 500 ? "Unexpected server error." : error.message,
    details: error.details
  });
}

export default router;
