import fs from "node:fs/promises";
import path from "node:path";
import { getProjectPath, isSafeProjectId, ProjectStoreError } from "./projectStore.js";

const allowedAssetRoots = new Set(["images/characters", "images/scenes"]);
const imageMimeTypes = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);
const safeRecordIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

export class ImageStorageError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = "ImageStorageError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function saveCharacterImage(projectId, characterId, imageData, options = {}) {
  return saveGeneratedImage(projectId, characterId, imageData, {
    ...options,
    root: "characters",
    recordLabel: "Character"
  });
}

export async function saveSceneImage(projectId, sceneId, imageData, options = {}) {
  return saveGeneratedImage(projectId, sceneId, imageData, {
    ...options,
    root: "scenes",
    recordLabel: "Scene"
  });
}

export async function resolveProjectAsset(projectId, requestedPath) {
  if (!isSafeProjectId(projectId)) {
    throw new ImageStorageError("Project id is malformed.", 400);
  }

  const relativePath = normalizeAssetPath(requestedPath);
  const root = allowedAssetRoot(relativePath);
  if (!root) {
    throw new ImageStorageError("Asset path is not allowed.", 400);
  }

  const extension = path.extname(relativePath).toLocaleLowerCase();
  const contentType = imageMimeTypes.get(extension);
  if (!contentType) {
    throw new ImageStorageError("Asset type is not supported.", 400);
  }

  const projectPath = getProjectPath(projectId);
  const absolutePath = path.join(projectPath, ...relativePath.split("/"));
  const projectRelative = path.relative(projectPath, absolutePath);
  if (projectRelative.startsWith("..") || path.isAbsolute(projectRelative)) {
    throw new ImageStorageError("Asset path is not allowed.", 400);
  }

  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) throw new Error("Asset is not a file.");
  } catch {
    throw new ImageStorageError("Asset not found.", 404);
  }

  return {
    absolutePath,
    relativePath,
    contentType
  };
}

export async function projectAssetExists(projectId, imagePath) {
  try {
    await resolveProjectAsset(projectId, imagePath);
    return true;
  } catch (error) {
    if (error instanceof ProjectStoreError) throw error;
    return false;
  }
}

export function toProjectAssetUrl(projectId, imagePath) {
  const relativePath = normalizeAssetPath(imagePath);
  return `/api/projects/${encodeURIComponent(projectId)}/assets/${relativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function isSafeProjectAssetPath(value) {
  try {
    normalizeAssetPath(value);
    return Boolean(allowedAssetRoot(value));
  } catch {
    return false;
  }
}

export function isSafeRecordId(value) {
  return typeof value === "string" && safeRecordIdPattern.test(value);
}

function normalizeAssetPath(value) {
  const rawPath = String(value || "").trim();
  if (!rawPath || rawPath.length > 240) {
    throw new ImageStorageError("Asset path is malformed.", 400);
  }
  if (rawPath.includes("\0") || rawPath.includes("\\") || rawPath.startsWith("/")) {
    throw new ImageStorageError("Asset path is malformed.", 400);
  }

  const decoded = safelyDecode(rawPath);
  if (decoded !== rawPath || decoded.includes("..")) {
    throw new ImageStorageError("Asset path is malformed.", 400);
  }

  const normalized = path.posix.normalize(rawPath);
  if (normalized !== rawPath || normalized.startsWith("../") || normalized === "..") {
    throw new ImageStorageError("Asset path is malformed.", 400);
  }

  const extension = path.extname(normalized).toLocaleLowerCase();
  if (!imageMimeTypes.has(extension)) {
    throw new ImageStorageError("Asset type is not supported.", 400);
  }

  return normalized;
}

function allowedAssetRoot(relativePath) {
  const normalized = path.posix.normalize(String(relativePath || ""));
  return [...allowedAssetRoots].find((root) => normalized.startsWith(`${root}/`));
}

async function saveGeneratedImage(projectId, recordId, imageData, options = {}) {
  assertSafeProjectAndRecordIds(projectId, recordId, options.recordLabel);
  const extension = normalizeExtension(options.extension || ".png");
  const buffer = decodeImageData(imageData, extension);
  const timestamp = toFileTimestamp(options.now || new Date().toISOString());
  const fileName = `${projectId}-${recordId}-${timestamp}${extension}`;
  const relativePath = path.posix.join("images", options.root, fileName);
  const projectPath = getProjectPath(projectId);
  const targetDirectory = path.join(projectPath, "images", options.root);
  const targetPath = path.join(targetDirectory, fileName);

  await fs.mkdir(targetDirectory, { recursive: true });
  await writeFileAtomically(targetPath, buffer);

  return {
    fileName,
    relativePath,
    assetUrl: toProjectAssetUrl(projectId, relativePath),
    contentType: imageMimeTypes.get(extension)
  };
}

function assertSafeProjectAndRecordIds(projectId, recordId, label = "Character") {
  if (!isSafeProjectId(projectId)) {
    throw new ImageStorageError("Project id is malformed.", 400);
  }
  if (!isSafeRecordId(recordId)) {
    throw new ImageStorageError(`${label} id is malformed.`, 400);
  }
}

function decodeImageData(imageData, extension) {
  if (Buffer.isBuffer(imageData)) return validateImageBuffer(imageData, extension);
  if (imageData instanceof Uint8Array) {
    return validateImageBuffer(Buffer.from(imageData), extension);
  }
  if (typeof imageData !== "string" || imageData.trim() === "") {
    throw new ImageStorageError("Image response did not include usable image data.", 503);
  }

  const normalized = imageData.replace(/\s+/g, "");
  if (!isValidBase64(normalized)) {
    throw new ImageStorageError("Image response did not include usable image data.", 503);
  }

  return validateImageBuffer(Buffer.from(normalized, "base64"), extension);
}

function isValidBase64(value) {
  if (!value || value.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return false;
  return Buffer.from(value, "base64").toString("base64") === value;
}

function validateImageBuffer(buffer, extension) {
  if (extension === ".png") assertPngBuffer(buffer);
  return buffer;
}

function assertPngBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length <= pngSignature.length) {
    throw new ImageStorageError("Image response did not include usable PNG data.", 503);
  }

  if (!buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new ImageStorageError("Image response did not include usable PNG data.", 503);
  }
}

function normalizeExtension(extension) {
  const value = String(extension || "").trim().toLocaleLowerCase();
  if (!imageMimeTypes.has(value)) {
    throw new ImageStorageError("Image content type is not supported.", 503);
  }
  return value;
}

async function writeFileAtomically(filePath, buffer) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, filePath);
}

function toFileTimestamp(value) {
  return String(value || new Date().toISOString())
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z")
    .replace(/[^0-9TZ]/g, "");
}

function safelyDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
