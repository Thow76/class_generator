import assert from "node:assert/strict";
import test from "node:test";

import { getSidebarStageState } from "../src/utils/sidebarProjectDisplay.js";

test("getSidebarStageState masks active stage state while a project is loading", () => {
  assert.equal(
    getSidebarStageState({
      currentStage: "story",
      completedStages: [],
      isProjectLoading: true,
      stageId: "story"
    }),
    "incomplete"
  );
});

test("getSidebarStageState masks completed stage state while a project is loading", () => {
  assert.equal(
    getSidebarStageState({
      currentStage: "setup",
      completedStages: ["setup", "story"],
      isProjectLoading: true,
      stageId: "story"
    }),
    "incomplete"
  );
});

test("getSidebarStageState preserves normal active and completed states after loading", () => {
  assert.equal(
    getSidebarStageState({
      currentStage: "story",
      completedStages: ["setup"],
      stageId: "story"
    }),
    "active"
  );
  assert.equal(
    getSidebarStageState({
      currentStage: "story",
      completedStages: ["setup"],
      stageId: "setup"
    }),
    "completed"
  );
  assert.equal(
    getSidebarStageState({
      currentStage: "story",
      completedStages: ["setup"],
      stageId: "media"
    }),
    "incomplete"
  );
});
