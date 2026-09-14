import assert from "node:assert/strict";
import test from "node:test";

import {
  decideMediaReadinessRequest,
  saveBeforeMediaReadinessMessage,
  saveProjectBeforeMediaReadinessMessage,
  unsavedMediaReadinessDetail
} from "../src/utils/mediaReadinessRequest.js";

test("dirty Media navigation blocks readiness without requesting a save", () => {
  assert.deepEqual(
    decideMediaReadinessRequest({
      activeProjectId: "lesson-current",
      hasUnsavedChanges: true
    }),
    {
      type: "blocked",
      reason: "unsaved",
      message: `${saveBeforeMediaReadinessMessage} ${unsavedMediaReadinessDetail}`,
      projectId: "lesson-current"
    }
  );
});

test("dirty Export navigation blocks readiness without requesting a save", () => {
  const decision = decideMediaReadinessRequest({
    activeProjectId: "lesson-current",
    hasUnsavedChanges: true
  });

  assert.equal(decision.type, "blocked");
  assert.equal(decision.reason, "unsaved");
  assert.match(decision.message, /Save before checking media readiness/);
});

test("manual readiness refresh on a dirty lesson records save-first state", () => {
  const decision = decideMediaReadinessRequest({
    activeProjectId: "lesson-current",
    hasUnsavedChanges: true
  });

  assert.equal(decision.type, "blocked");
  assert.equal(
    decision.message,
    "Save before checking media readiness. Unsaved changes are not included until you save this project."
  );
});

test("readiness requires an active saved project", () => {
  assert.deepEqual(
    decideMediaReadinessRequest({
      activeProjectId: null,
      hasUnsavedChanges: false
    }),
    {
      type: "blocked",
      reason: "no-project",
      message: saveProjectBeforeMediaReadinessMessage,
      projectId: null
    }
  );
});

test("clean saved lessons can check backend readiness without saving", () => {
  assert.deepEqual(
    decideMediaReadinessRequest({
      activeProjectId: "lesson-current",
      hasUnsavedChanges: false
    }),
    {
      type: "check",
      projectId: "lesson-current"
    }
  );
});
