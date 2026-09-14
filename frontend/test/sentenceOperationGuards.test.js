import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldApplySentenceOperationResponse,
  shouldShowSentenceOperationError
} from "../src/utils/sentenceOperationGuards.js";

test("sentence operation response applies only for the current token and project", () => {
  const operationToken = Symbol("operation");

  assert.equal(
    shouldApplySentenceOperationResponse({
      activeProjectId: "lesson-current",
      currentOperationToken: operationToken,
      operationProjectId: "lesson-current",
      operationToken
    }),
    true
  );
});

test("sentence operation response is ignored after project switch", () => {
  const operationToken = Symbol("operation");

  assert.equal(
    shouldApplySentenceOperationResponse({
      activeProjectId: "lesson-next",
      currentOperationToken: operationToken,
      operationProjectId: "lesson-previous",
      operationToken
    }),
    false
  );
});

test("sentence operation response is ignored for stale operation token", () => {
  assert.equal(
    shouldApplySentenceOperationResponse({
      activeProjectId: "lesson-current",
      currentOperationToken: Symbol("newer-operation"),
      operationProjectId: "lesson-current",
      operationToken: Symbol("older-operation")
    }),
    false
  );
});

test("sentence operation save errors stay visible before a project id is captured", () => {
  const operationToken = Symbol("operation");

  assert.equal(
    shouldShowSentenceOperationError({
      activeProjectId: "lesson-current",
      currentOperationToken: operationToken,
      operationProjectId: null,
      operationToken
    }),
    true
  );
});

test("sentence operation backend errors are hidden after project switch", () => {
  const operationToken = Symbol("operation");

  assert.equal(
    shouldShowSentenceOperationError({
      activeProjectId: "lesson-next",
      currentOperationToken: operationToken,
      operationProjectId: "lesson-previous",
      operationToken
    }),
    false
  );
});
