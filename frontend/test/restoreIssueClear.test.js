import assert from "node:assert/strict";
import test from "node:test";

import { decideRestoreIssueClear } from "../src/utils/restoreIssueClear.js";

test("clearing a URL restore issue dismisses it without replacing the active lesson", () => {
  assert.deepEqual(
    decideRestoreIssueClear({
      restoreIssue: {
        source: "url",
        reason: "load-failed",
        projectId: "lesson-missing",
        message: "The lesson requested in the URL could not be opened."
      },
      lastProjectId: "lesson-current"
    }),
    {
      clearIssue: true,
      clearUrlProject: true,
      clearLastProjectId: false,
      replaceLesson: false
    }
  );
});

test("clearing a URL restore issue clears matching restore pointer only", () => {
  assert.deepEqual(
    decideRestoreIssueClear({
      restoreIssue: {
        source: "url",
        reason: "load-failed",
        projectId: "lesson-missing",
        message: "The lesson requested in the URL could not be opened."
      },
      lastProjectId: "lesson-missing"
    }),
    {
      clearIssue: true,
      clearUrlProject: true,
      clearLastProjectId: true,
      replaceLesson: false
    }
  );
});

test("clearing a localStorage restore issue leaves the lesson in place", () => {
  assert.deepEqual(
    decideRestoreIssueClear({
      restoreIssue: {
        source: "localStorage",
        reason: "load-failed",
        projectId: "lesson-missing",
        message: "The last lesson could not be restored."
      },
      lastProjectId: "lesson-missing"
    }),
    {
      clearIssue: true,
      clearUrlProject: false,
      clearLastProjectId: true,
      replaceLesson: false
    }
  );
});

test("missing restore issue is a no-op", () => {
  assert.deepEqual(decideRestoreIssueClear(), {
    clearIssue: false,
    clearUrlProject: false,
    clearLastProjectId: false,
    replaceLesson: false
  });
});
