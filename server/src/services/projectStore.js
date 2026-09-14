import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeLesson } from "./normalizeLesson.js";
import { validateLesson } from "./validateLesson.js";

const currentFile = fileURLToPath(import.meta.url);
const serverRoot = path.resolve(path.dirname(currentFile), "../..");
const projectsDir =
  process.env.PROJECT_DATA_DIR || path.join(serverRoot, "data", "projects");

export class ProjectStoreError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "ProjectStoreError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function listProjects() {
  await ensureProjectsDir();
  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !isSafeProjectId(entry.name)) continue;

    try {
      projects.push(await readProjectMetadata(entry.name));
    } catch {
      projects.push({
        id: entry.name,
        title: "Unreadable lesson",
        theme: "",
        learnerLevel: "",
        currentStage: "setup",
        updatedAt: null,
        error: "Project metadata could not be read."
      });
    }
  }

  return projects.sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
}

export async function createProject(initialLesson = {}) {
  await ensureProjectsDir();
  const projectId = await generateProjectId();
  const projectPath = getProjectPath(projectId);

  await fs.mkdir(path.join(projectPath, "images", "characters"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "images", "scenes"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "exports"), { recursive: true });

  const lesson = normalizeLesson(initialLesson, projectId);
  assertValidLesson(lesson);
  const now = new Date().toISOString();
  await writeProjectFiles(projectId, lesson, { createdAt: now, updatedAt: now });

  return {
    id: projectId,
    lesson
  };
}

export async function getProject(projectId) {
  assertSafeProjectId(projectId);
  await assertProjectExists(projectId);

  try {
    const lesson = JSON.parse(await fs.readFile(getLessonPath(projectId), "utf8"));
    const normalized = normalizeLesson(lesson, projectId);
    assertValidLesson(normalized);
    return normalized;
  } catch (error) {
    if (error instanceof ProjectStoreError) throw error;
    throw new ProjectStoreError("Project lesson file is malformed.", 500);
  }
}

export async function getRawProject(projectId) {
  assertSafeProjectId(projectId);
  await assertProjectExists(projectId);

  try {
    return JSON.parse(await fs.readFile(getLessonPath(projectId), "utf8"));
  } catch (error) {
    if (error instanceof ProjectStoreError) throw error;
    throw new ProjectStoreError("Project lesson file is malformed.", 500);
  }
}

export async function updateProject(projectId, lesson) {
  assertSafeProjectId(projectId);
  await assertProjectExists(projectId);

  const normalized = normalizeLesson(lesson, projectId);
  assertValidLesson(normalized);
  await writeProjectFiles(projectId, normalized);

  return normalized;
}

export async function duplicateProject(projectId) {
  assertSafeProjectId(projectId);
  const sourceLesson = await getProject(projectId);
  const duplicate = await createProject(sourceLesson);
  await copyProjectAssets(projectId, duplicate.id);

  await writeProjectFiles(duplicate.id, duplicate.lesson, {
    ...(await readExistingMeta(duplicate.id)),
    sourceProjectId: projectId
  });

  return {
    sourceProjectId: projectId,
    lesson: duplicate.lesson
  };
}

export function isSafeProjectId(projectId) {
  if (typeof projectId !== "string" || projectId.length > 96) return false;
  if (!/^lesson-[A-Za-z0-9_-]+$/.test(projectId)) return false;

  const decoded = safelyDecode(projectId);
  if (
    decoded.includes("/") ||
    decoded.includes("\\") ||
    decoded.includes("..") ||
    decoded.includes("\0")
  ) {
    return false;
  }

  return decoded === projectId;
}

export function getProjectDataDirectory() {
  return projectsDir;
}

export function getProjectPath(projectId) {
  const projectPath = path.join(projectsDir, projectId);
  const relative = path.relative(projectsDir, projectPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ProjectStoreError("Project path is outside the data directory.", 400);
  }
  return projectPath;
}

async function ensureProjectsDir() {
  await fs.mkdir(projectsDir, { recursive: true });
}

async function generateProjectId() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "")
    .replace("T", "-");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
    const projectId = `lesson-${timestamp}-${suffix}`;
    try {
      await fs.access(getProjectPath(projectId), fsConstants.F_OK);
    } catch {
      return projectId;
    }
  }

  throw new ProjectStoreError("Could not generate a unique project id.", 500);
}

async function readProjectMetadata(projectId) {
  const existingMeta = await readExistingMeta(projectId);
  const lesson = await getProject(projectId);
  const stats = await fs.stat(getLessonPath(projectId));

  return {
    id: projectId,
    title: lesson.title || "Untitled lesson",
    theme: lesson.theme || "",
    learnerLevel: lesson.learnerLevel,
    currentStage: lesson.currentStage,
    createdAt: existingMeta.createdAt || stats.birthtime.toISOString(),
    updatedAt: existingMeta.updatedAt || stats.mtime.toISOString()
  };
}

async function writeProjectFiles(projectId, lesson, metaPatch = {}) {
  const existingMeta = await readExistingMeta(projectId);
  const now = new Date().toISOString();
  const meta = {
    id: projectId,
    title: lesson.title || "Untitled lesson",
    theme: lesson.theme || "",
    learnerLevel: lesson.learnerLevel,
    currentStage: lesson.currentStage,
    createdAt: existingMeta.createdAt || metaPatch.createdAt || now,
    updatedAt: metaPatch.updatedAt || now,
    ...metaPatch
  };

  await writeJsonAtomically(getLessonPath(projectId), lesson);
  await writeJsonAtomically(getMetaPath(projectId), meta);
}

async function readExistingMeta(projectId) {
  try {
    return JSON.parse(await fs.readFile(getMetaPath(projectId), "utf8"));
  } catch {
    return {};
  }
}

async function writeJsonAtomically(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, filePath);
}

async function assertProjectExists(projectId) {
  try {
    const stats = await fs.stat(getProjectPath(projectId));
    if (!stats.isDirectory()) throw new Error("Project path is not a directory.");
  } catch {
    throw new ProjectStoreError("Project not found.", 404);
  }
}

function assertSafeProjectId(projectId) {
  if (!isSafeProjectId(projectId)) {
    throw new ProjectStoreError("Project id is malformed.", 400);
  }
}

function assertValidLesson(lesson) {
  const validation = validateLesson(lesson);
  if (!validation.valid) {
    throw new ProjectStoreError("Lesson shape is invalid.", 422, validation.errors);
  }
}

function getLessonPath(projectId) {
  return path.join(getProjectPath(projectId), "lesson.json");
}

function getMetaPath(projectId) {
  return path.join(getProjectPath(projectId), "meta.json");
}

function safelyDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

async function copyProjectAssets(sourceProjectId, targetProjectId) {
  const sourcePath = getProjectPath(sourceProjectId);
  const targetPath = getProjectPath(targetProjectId);
  for (const directory of ["images", "exports"]) {
    try {
      await fs.cp(path.join(sourcePath, directory), path.join(targetPath, directory), {
        recursive: true,
        force: true,
        errorOnExist: false
      });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}
