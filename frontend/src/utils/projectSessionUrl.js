import { isLikelySafeProjectId } from "./projectSessionStorage.js";

export const projectQueryParam = "project";

const emptyUrlCandidate = {
  source: "url",
  projectId: null,
  valid: false,
  malformed: false,
  rawValue: null
};

const fallbackOrigin = "http://localhost";

export function readProjectIdFromSearch(search) {
  let params;
  try {
    params = new URLSearchParams(normalizeSearch(search));
  } catch {
    return { ...emptyUrlCandidate };
  }

  if (!params.has(projectQueryParam)) {
    return { ...emptyUrlCandidate };
  }

  const rawValue = params.get(projectQueryParam);
  if (isLikelySafeProjectId(rawValue)) {
    return {
      ...emptyUrlCandidate,
      projectId: rawValue,
      valid: true,
      rawValue
    };
  }

  return {
    ...emptyUrlCandidate,
    malformed: true,
    rawValue
  };
}

export function getProjectRestoreCandidateFromUrl(location = getDefaultLocation()) {
  try {
    return readProjectIdFromSearch(location?.search || "");
  } catch {
    return { ...emptyUrlCandidate };
  }
}

export function readProjectIdFromLocation(location = getDefaultLocation()) {
  return getProjectRestoreCandidateFromUrl(location);
}

export function getCurrentUrlProjectId(location = getDefaultLocation()) {
  const candidate = getProjectRestoreCandidateFromUrl(location);
  return candidate.valid ? candidate.projectId : null;
}

export function buildProjectUrl(
  projectId,
  currentHrefOrLocation = getDefaultLocation()
) {
  return buildUrlWithProjectId(currentHrefOrLocation, projectId);
}

export function buildUrlWithProjectId(currentHrefOrLocation, projectId) {
  const originalUrl = stringifyUrlInput(currentHrefOrLocation);
  if (!isLikelySafeProjectId(projectId)) return originalUrl;

  let url;
  try {
    url = createUrl(currentHrefOrLocation);
  } catch {
    return originalUrl;
  }

  url.searchParams.set(projectQueryParam, projectId);
  return serializeUrl(url, currentHrefOrLocation);
}

export function buildUrlWithoutProjectId(currentHrefOrLocation) {
  const originalUrl = stringifyUrlInput(currentHrefOrLocation);

  let url;
  try {
    url = createUrl(currentHrefOrLocation);
  } catch {
    return originalUrl;
  }

  if (!url.searchParams.has(projectQueryParam)) return originalUrl;

  url.searchParams.delete(projectQueryParam);
  return serializeUrl(url, currentHrefOrLocation);
}

export function replaceUrlProjectId(projectId, windowLike = getDefaultWindow()) {
  if (!isLikelySafeProjectId(projectId)) return;

  let currentLocation;
  let history;
  try {
    currentLocation = windowLike?.location;
    history = windowLike?.history;
  } catch {
    return;
  }

  if (!history?.replaceState) return;

  try {
    const currentCandidate = getProjectRestoreCandidateFromUrl(currentLocation);
    if (currentCandidate.valid && currentCandidate.projectId === projectId) {
      return;
    }

    const nextUrl = buildUrlWithProjectId(currentLocation, projectId);
    history.replaceState(history.state ?? null, "", nextUrl);
  } catch {
    // URL state is a convenience pointer; sync failures are non-fatal.
  }
}

export function clearUrlProjectId(windowLike = getDefaultWindow()) {
  let currentLocation;
  let history;
  try {
    currentLocation = windowLike?.location;
    history = windowLike?.history;
  } catch {
    return;
  }

  if (!history?.replaceState) return;

  try {
    const currentUrl = stringifyUrlInput(currentLocation);
    const nextUrl = buildUrlWithoutProjectId(currentLocation);
    if (nextUrl === currentUrl) return;

    history.replaceState(history.state ?? null, "", nextUrl);
  } catch {
    // URL state is a convenience pointer; cleanup failures are non-fatal.
  }
}

function normalizeSearch(search) {
  if (typeof search !== "string") return "";
  if (search === "" || search.startsWith("?")) return search;
  return `?${search}`;
}

function createUrl(input) {
  if (typeof input === "string") {
    return new URL(input || "/", fallbackOrigin);
  }

  const href = readStringProperty(input, "href");
  if (href) return new URL(href, fallbackOrigin);

  const pathname = readStringProperty(input, "pathname") || "/";
  const search = readStringProperty(input, "search") || "";
  const hash = readStringProperty(input, "hash") || "";
  return new URL(`${pathname}${search}${hash}`, fallbackOrigin);
}

function serializeUrl(url, originalInput) {
  if (typeof originalInput === "string" && hasExplicitOrigin(originalInput)) {
    return url.href;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function stringifyUrlInput(input) {
  if (typeof input === "string") return input;

  const href = readStringProperty(input, "href");
  if (href) return href;

  const pathname = readStringProperty(input, "pathname") || "/";
  const search = readStringProperty(input, "search") || "";
  const hash = readStringProperty(input, "hash") || "";
  return `${pathname}${search}${hash}`;
}

function hasExplicitOrigin(value) {
  try {
    return new URL(value).origin !== "null";
  } catch {
    return false;
  }
}

function readStringProperty(object, property) {
  try {
    const value = object?.[property];
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

function getDefaultLocation() {
  if (typeof window === "undefined") return null;
  try {
    return window.location;
  } catch {
    return null;
  }
}

function getDefaultWindow() {
  if (typeof window === "undefined") return null;
  return window;
}
