import assert from "node:assert/strict";
import test from "node:test";

import { selectAutoReopenProject } from "../src/utils/projectAutoReopen.js";

test("selectAutoReopenProject returns null for missing or empty input", () => {
  assert.equal(selectAutoReopenProject(), null);
  assert.equal(selectAutoReopenProject(null), null);
  assert.equal(selectAutoReopenProject({}), null);
  assert.equal(selectAutoReopenProject([]), null);
});

test("selectAutoReopenProject chooses the first valid safe project id from a sorted list", () => {
  const projects = [
    project("lesson-20260912-120000-newest", "2026-09-12T12:00:00.000Z"),
    project("lesson-20260911-120000-older", "2026-09-11T12:00:00.000Z")
  ];

  assert.equal(selectAutoReopenProject(projects), projects[0]);
});

test("selectAutoReopenProject skips invalid or unsafe project ids", () => {
  const projects = [
    project("../lesson-bad", "2026-09-13T12:00:00.000Z"),
    project("project-20260912-120000-bad", "2026-09-12T12:00:00.000Z"),
    project("lesson-20260911-120000-safe", "2026-09-11T12:00:00.000Z")
  ];

  assert.equal(selectAutoReopenProject(projects), projects[2]);
});

test("selectAutoReopenProject returns null when no valid candidate exists", () => {
  const projects = [
    project("../lesson-bad", "2026-09-13T12:00:00.000Z"),
    project("project-20260912-120000-bad", "2026-09-12T12:00:00.000Z"),
    project("", "2026-09-11T12:00:00.000Z"),
    project(null, "2026-09-10T12:00:00.000Z")
  ];

  assert.equal(selectAutoReopenProject(projects), null);
});

test("selectAutoReopenProject prefers candidates without metadata errors", () => {
  const projects = [
    project("lesson-20260913-120000-unreadable", "2026-09-13T12:00:00.000Z", {
      error: "Project metadata could not be read."
    }),
    project("lesson-20260912-120000-readable", "2026-09-12T12:00:00.000Z")
  ];

  assert.equal(selectAutoReopenProject(projects), projects[1]);
});

test("selectAutoReopenProject can return an errored candidate if it is the only safe candidate", () => {
  const projects = [
    project("lesson-20260913-120000-unreadable", "2026-09-13T12:00:00.000Z", {
      error: "Project metadata could not be read."
    }),
    project("../lesson-bad", "2026-09-14T12:00:00.000Z")
  ];

  assert.equal(selectAutoReopenProject(projects), projects[0]);
});

test("selectAutoReopenProject sorts by updatedAt descending without mutating the original list", () => {
  const projects = [
    project("lesson-20260910-120000-oldest", "2026-09-10T12:00:00.000Z"),
    project("lesson-20260912-120000-newest", "2026-09-12T12:00:00.000Z"),
    project("lesson-20260911-120000-middle", "2026-09-11T12:00:00.000Z")
  ];
  const originalOrder = projects.map((candidate) => candidate.id);

  assert.equal(selectAutoReopenProject(projects), projects[1]);
  assert.deepEqual(
    projects.map((candidate) => candidate.id),
    originalOrder
  );
});

test("selectAutoReopenProject handles missing or invalid updatedAt predictably", () => {
  const projects = [
    project("lesson-20260910-120000-missing", null),
    project("lesson-20260909-120000-invalid", "not-a-date"),
    project("lesson-20260908-120000-dated", "2026-09-08T12:00:00.000Z")
  ];

  assert.equal(selectAutoReopenProject(projects), projects[2]);
});

function project(id, updatedAt, extra = {}) {
  return {
    id,
    title: id,
    updatedAt,
    ...extra
  };
}
