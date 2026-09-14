import assert from "node:assert/strict";
import test from "node:test";

import {
  createBeforeUnloadHandler,
  discardUnsavedChangesMessage
} from "../src/utils/unsavedChangesGuard.js";

test("discardUnsavedChangesMessage matches the manual-save warning copy", () => {
  assert.equal(
    discardUnsavedChangesMessage,
    "You have unsaved changes. Continue without saving?"
  );
});

test("beforeunload handler activates native warning when dirty", () => {
  const event = createBeforeUnloadEvent();
  const result = createBeforeUnloadHandler(true)(event);

  assert.equal(event.defaultPrevented, true);
  assert.equal(event.returnValue, "");
  assert.equal(result, "");
});

test("beforeunload handler leaves clean lessons alone", () => {
  const event = createBeforeUnloadEvent();
  const result = createBeforeUnloadHandler(false)(event);

  assert.equal(event.defaultPrevented, false);
  assert.equal(event.returnValue, undefined);
  assert.equal(result, undefined);
});

function createBeforeUnloadEvent() {
  return {
    defaultPrevented: false,
    returnValue: undefined,
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
}
