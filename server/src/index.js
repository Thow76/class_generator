import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import charactersRouter from "./routes/characters.js";
import healthRouter from "./routes/health.js";
import imagesRouter from "./routes/images.js";
import mediaRouter from "./routes/media.js";
import projectsRouter from "./routes/projects.js";
import scenesRouter from "./routes/scenes.js";
import storyRouter from "./routes/story.js";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "../..");

dotenv.config({ path: path.join(repositoryRoot, ".env") });

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || "127.0.0.1";

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/story", storyRouter);
app.use("/api/characters", charactersRouter);
app.use("/api/images", imagesRouter);
app.use("/api/scenes", scenesRouter);
app.use("/api/media", mediaRouter);

app.use((error, _request, response, _next) => {
  response.status(error.status || 500).json({
    error: error.type === "entity.parse.failed" ? "Malformed JSON body." : "Unexpected server error."
  });
});

app.listen(port, host, () => {
  console.log(`Lesson Source Builder API listening on http://${host}:${port}`);
});
