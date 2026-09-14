import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProjectUrl,
  buildUrlWithoutProjectId,
  buildUrlWithProjectId,
  clearUrlProjectId,
  getCurrentUrlProjectId,
  getProjectRestoreCandidateFromUrl,
  projectQueryParam,
  readProjectIdFromLocation,
  readProjectIdFromSearch,
  replaceUrlProjectId
} from "../src/utils/projectSessionUrl.js";

const projectId = "lesson-20260911-102000-ab12cd34";
const otherProjectId = "lesson-20260911-112233-deadbeef";

test("projectQueryParam matches the URL restoration contract", () => {
  assert.equal(projectQueryParam, "project");
});

test("readProjectIdFromSearch returns no candidate when project is absent", () => {
  assert.deepEqual(readProjectIdFromSearch("?tab=media"), {
    source: "url",
    projectId: null,
    valid: false,
    malformed: false,
    rawValue: null
  });
});

test("readProjectIdFromSearch returns a valid project candidate", () => {
  assert.deepEqual(readProjectIdFromSearch(`?project=${projectId}`), {
    source: "url",
    projectId,
    valid: true,
    malformed: false,
    rawValue: projectId
  });
});

test("readProjectIdFromSearch uses the first project param", () => {
  const candidate = readProjectIdFromSearch(
    `?tab=setup&project=${projectId}&project=${otherProjectId}`
  );

  assert.equal(candidate.valid, true);
  assert.equal(candidate.projectId, projectId);
});

test("readProjectIdFromSearch detects malformed ids distinctly", () => {
  const candidate = readProjectIdFromSearch("?project=../lesson-bad");

  assert.equal(candidate.valid, false);
  assert.equal(candidate.malformed, true);
  assert.equal(candidate.projectId, null);
  assert.equal(candidate.rawValue, "../lesson-bad");
});

test("readProjectIdFromSearch treats encoded path separators as malformed", () => {
  const candidate = readProjectIdFromSearch("?project=lesson-20260911%2Fbad");

  assert.equal(candidate.valid, false);
  assert.equal(candidate.malformed, true);
  assert.equal(candidate.projectId, null);
  assert.equal(candidate.rawValue, "lesson-20260911/bad");
});

test("readProjectIdFromSearch treats encoded null bytes as malformed", () => {
  const candidate = readProjectIdFromSearch("?project=lesson-20260911%00bad");

  assert.equal(candidate.valid, false);
  assert.equal(candidate.malformed, true);
  assert.equal(candidate.projectId, null);
  assert.equal(candidate.rawValue, ["lesson-20260911", "\0", "bad"].join(""));
});

test("readProjectIdFromSearch treats empty project values as malformed intent", () => {
  const candidate = readProjectIdFromSearch("?project=");

  assert.equal(candidate.valid, false);
  assert.equal(candidate.malformed, true);
  assert.equal(candidate.projectId, null);
  assert.equal(candidate.rawValue, "");
});

test("getProjectRestoreCandidateFromUrl does not throw on location access failures", () => {
  const location = {};
  Object.defineProperty(location, "search", {
    get() {
      throw new Error("location blocked");
    }
  });

  assert.deepEqual(getProjectRestoreCandidateFromUrl(location), {
    source: "url",
    projectId: null,
    valid: false,
    malformed: false,
    rawValue: null
  });
});

test("readProjectIdFromLocation aliases URL restore candidate parsing", () => {
  const candidate = readProjectIdFromLocation({
    search: `?project=${projectId}`
  });

  assert.equal(candidate.valid, true);
  assert.equal(candidate.projectId, projectId);
});

test("getCurrentUrlProjectId returns only valid project ids", () => {
  assert.equal(
    getCurrentUrlProjectId({ search: `?project=${projectId}` }),
    projectId
  );
  assert.equal(getCurrentUrlProjectId({ search: "?project=../lesson-bad" }), null);
  assert.equal(getCurrentUrlProjectId({ search: "?tab=setup" }), null);
});

test("buildProjectUrl builds app-relative project URLs", () => {
  assert.equal(
    buildProjectUrl(projectId, {
      pathname: "/builder",
      search: "?tab=setup",
      hash: "#story"
    }),
    `/builder?tab=setup&project=${projectId}#story`
  );
});

test("buildUrlWithProjectId adds project when missing", () => {
  assert.equal(
    buildUrlWithProjectId("http://127.0.0.1:5173/?tab=setup", projectId),
    `http://127.0.0.1:5173/?tab=setup&project=${projectId}`
  );
});

test("buildUrlWithProjectId replaces an existing project", () => {
  assert.equal(
    buildUrlWithProjectId(
      `http://127.0.0.1:5173/?tab=setup&project=${otherProjectId}`,
      projectId
    ),
    `http://127.0.0.1:5173/?tab=setup&project=${projectId}`
  );
});

test("buildUrlWithProjectId preserves unrelated params and hash fragments", () => {
  assert.equal(
    buildUrlWithProjectId(
      "http://127.0.0.1:5173/builder?tab=media&view=compact#scenes",
      projectId
    ),
    `http://127.0.0.1:5173/builder?tab=media&view=compact&project=${projectId}#scenes`
  );
});

test("buildUrlWithProjectId returns the original URL for invalid ids", () => {
  const currentUrl = "http://127.0.0.1:5173/?tab=setup#lesson";

  assert.equal(buildUrlWithProjectId(currentUrl, "../lesson-bad"), currentUrl);
});

test("buildUrlWithProjectId supports location-like objects", () => {
  assert.equal(
    buildUrlWithProjectId(
      {
        pathname: "/builder",
        search: "?tab=setup",
        hash: "#story"
      },
      projectId
    ),
    `/builder?tab=setup&project=${projectId}#story`
  );
});

test("buildUrlWithoutProjectId removes all project params", () => {
  assert.equal(
    buildUrlWithoutProjectId(
      `http://127.0.0.1:5173/builder?project=${projectId}&tab=media&project=${otherProjectId}#scenes`
    ),
    "http://127.0.0.1:5173/builder?tab=media#scenes"
  );
});

test("buildUrlWithoutProjectId preserves app-relative URLs", () => {
  assert.equal(
    buildUrlWithoutProjectId({
      pathname: "/builder",
      search: `?tab=setup&project=${projectId}`,
      hash: "#story"
    }),
    "/builder?tab=setup#story"
  );
});

test("buildUrlWithoutProjectId returns the original URL when project is absent", () => {
  const currentUrl = "/builder?tab=setup#story";

  assert.equal(buildUrlWithoutProjectId(currentUrl), currentUrl);
});

test("replaceUrlProjectId uses replaceState and not pushState", () => {
  const calls = [];
  const windowLike = {
    location: {
      pathname: "/",
      search: "?tab=setup",
      hash: "#lesson"
    },
    history: {
      state: { previous: true },
      replaceState(state, title, url) {
        calls.push({ state, title, url });
      },
      pushState() {
        throw new Error("pushState should not be used");
      }
    }
  };

  replaceUrlProjectId(projectId, windowLike);

  assert.deepEqual(calls, [
    {
      state: { previous: true },
      title: "",
      url: `/?tab=setup&project=${projectId}#lesson`
    }
  ]);
});

test("replaceUrlProjectId skips writes when the URL already matches", () => {
  let replaceCalls = 0;
  const windowLike = {
    location: {
      pathname: "/",
      search: `?project=${projectId}&tab=setup`,
      hash: ""
    },
    history: {
      replaceState() {
        replaceCalls += 1;
      }
    }
  };

  replaceUrlProjectId(projectId, windowLike);

  assert.equal(replaceCalls, 0);
});

test("replaceUrlProjectId ignores invalid ids and missing or throwing browser APIs", () => {
  assert.doesNotThrow(() => replaceUrlProjectId("../lesson-bad", {}));
  assert.doesNotThrow(() => replaceUrlProjectId(projectId, {}));
  assert.doesNotThrow(() =>
    replaceUrlProjectId(projectId, {
      location: {
        pathname: "/",
        search: "",
        hash: ""
      },
      history: {
        replaceState() {
          throw new Error("replace blocked");
        }
      }
    })
  );
});

test("clearUrlProjectId uses replaceState and preserves unrelated URL state", () => {
  const calls = [];
  const windowLike = {
    location: {
      pathname: "/builder",
      search: `?tab=setup&project=${projectId}&view=compact`,
      hash: "#lesson"
    },
    history: {
      state: { previous: true },
      replaceState(state, title, url) {
        calls.push({ state, title, url });
      },
      pushState() {
        throw new Error("pushState should not be used");
      }
    }
  };

  clearUrlProjectId(windowLike);

  assert.deepEqual(calls, [
    {
      state: { previous: true },
      title: "",
      url: "/builder?tab=setup&view=compact#lesson"
    }
  ]);
});

test("clearUrlProjectId skips writes when the URL has no project param", () => {
  let replaceCalls = 0;
  const windowLike = {
    location: {
      pathname: "/builder",
      search: "?tab=setup",
      hash: ""
    },
    history: {
      replaceState() {
        replaceCalls += 1;
      }
    }
  };

  clearUrlProjectId(windowLike);

  assert.equal(replaceCalls, 0);
});

test("clearUrlProjectId ignores missing or throwing browser APIs", () => {
  assert.doesNotThrow(() => clearUrlProjectId({}));
  assert.doesNotThrow(() =>
    clearUrlProjectId({
      location: {
        pathname: "/",
        search: `?project=${projectId}`,
        hash: ""
      },
      history: {
        replaceState() {
          throw new Error("replace blocked");
        }
      }
    })
  );
});
