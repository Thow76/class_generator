import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUrlForCancelledProjectNavigation,
  decideProjectUrlNavigation,
  invalidUrlProjectMessage
} from "../src/utils/projectUrlNavigation.js";

const activeProjectId = "lesson-20260911-102000-ab12cd34";
const nextProjectId = "lesson-20260911-112233-deadbeef";

test("decideProjectUrlNavigation ignores URLs without a project", () => {
  assert.deepEqual(
    decideProjectUrlNavigation({
      location: { search: "?tab=setup" },
      activeProjectId
    }),
    {
      type: "none",
      reason: "absent"
    }
  );
});

test("decideProjectUrlNavigation reports malformed project ids without opening", () => {
  assert.deepEqual(
    decideProjectUrlNavigation({
      location: { search: "?project=../lesson-bad" },
      activeProjectId
    }),
    {
      type: "invalid-url",
      source: "url",
      reason: "malformed",
      projectId: null,
      rawValue: "../lesson-bad",
      message: invalidUrlProjectMessage
    }
  );
});

test("decideProjectUrlNavigation ignores the active project id", () => {
  assert.deepEqual(
    decideProjectUrlNavigation({
      location: { search: `?project=${activeProjectId}` },
      activeProjectId
    }),
    {
      type: "none",
      reason: "current",
      projectId: activeProjectId
    }
  );
});

test("decideProjectUrlNavigation opens a different project when changes are saved", () => {
  assert.deepEqual(
    decideProjectUrlNavigation({
      location: { search: `?project=${nextProjectId}` },
      activeProjectId,
      hasUnsavedChanges: false
    }),
    {
      type: "open",
      source: "url",
      projectId: nextProjectId,
      previousProjectId: activeProjectId
    }
  );
});

test("decideProjectUrlNavigation asks for confirmation when changes are unsaved", () => {
  const decision = decideProjectUrlNavigation({
    location: { search: `?project=${nextProjectId}` },
    activeProjectId,
    hasUnsavedChanges: true
  });

  assert.equal(decision.type, "confirm-open");
  assert.equal(decision.source, "url");
  assert.equal(decision.projectId, nextProjectId);
  assert.equal(decision.previousProjectId, activeProjectId);
  assert.match(decision.message, /unsaved changes/i);
});

test("buildUrlForCancelledProjectNavigation restores the active project when possible", () => {
  assert.equal(
    buildUrlForCancelledProjectNavigation(
      {
        pathname: "/builder",
        search: `?tab=setup&project=${nextProjectId}`,
        hash: "#story"
      },
      activeProjectId
    ),
    `/builder?tab=setup&project=${activeProjectId}#story`
  );
});

test("buildUrlForCancelledProjectNavigation clears project when no active id exists", () => {
  assert.equal(
    buildUrlForCancelledProjectNavigation(
      {
        pathname: "/builder",
        search: `?tab=setup&project=${nextProjectId}`,
        hash: "#story"
      },
      null
    ),
    "/builder?tab=setup#story"
  );
});
