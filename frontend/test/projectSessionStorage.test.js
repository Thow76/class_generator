import assert from "node:assert/strict";
import test from "node:test";

import {
  clearLastProjectId,
  isLikelySafeProjectId,
  lastProjectStorageKey,
  readLastProjectId,
  writeLastProjectId
} from "../src/utils/projectSessionStorage.js";

test("lastProjectStorageKey matches the session restoration contract", () => {
  assert.equal(lastProjectStorageKey, "lessonSourceBuilder:lastProjectId");
});

test("isLikelySafeProjectId accepts backend-shaped lesson project ids", () => {
  assert.equal(isLikelySafeProjectId("lesson-20260911-102000-ab12cd34"), true);
});

test("isLikelySafeProjectId rejects malformed or unsafe values", () => {
  const longId = `lesson-${"a".repeat(91)}`;
  const unsafeValues = [
    null,
    undefined,
    123,
    {},
    "",
    "   ",
    " lesson-20260911-102000-ab12cd34",
    "lesson-20260911-102000-ab12cd34 ",
    "project-20260911-102000-ab12cd34",
    "lesson-",
    longId,
    "lesson-20260911/102000-ab12cd34",
    "lesson-20260911\\102000-ab12cd34",
    "lesson-20260911..102000-ab12cd34",
    ["lesson-20260911", "\0", "102000-ab12cd34"].join(""),
    "lesson-20260911 102000-ab12cd34",
    "lesson-20260911.102000-ab12cd34",
    "lesson-20260911%2F102000-ab12cd34",
    "lesson-20260911?102000-ab12cd34"
  ];

  unsafeValues.forEach((value) => {
    assert.equal(isLikelySafeProjectId(value), false, String(value));
  });
});

test("readLastProjectId returns a stored valid project id", () => {
  const storage = createFakeStorage({
    [lastProjectStorageKey]: "lesson-20260911-102000-ab12cd34"
  });

  assert.equal(
    readLastProjectId(storage),
    "lesson-20260911-102000-ab12cd34"
  );
});

test("readLastProjectId returns null for missing values", () => {
  const storage = createFakeStorage();

  assert.equal(readLastProjectId(storage), null);
  assert.equal(storage.removeCalls, 0);
});

test("readLastProjectId clears and returns null for malformed stored values", () => {
  const storage = createFakeStorage({
    [lastProjectStorageKey]: "../lesson-bad"
  });

  assert.equal(readLastProjectId(storage), null);
  assert.equal(storage.getItem(lastProjectStorageKey), null);
  assert.equal(storage.removeCalls, 1);
});

test("readLastProjectId returns null if storage read throws", () => {
  const storage = createThrowingStorage({ get: true });

  assert.equal(readLastProjectId(storage), null);
});

test("default storage access failures are non-fatal", () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window"
  );

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {}
  });
  Object.defineProperty(globalThis.window, "localStorage", {
    configurable: true,
    get() {
      throw new Error("localStorage blocked");
    }
  });

  try {
    assert.equal(readLastProjectId(), null);
    assert.doesNotThrow(() =>
      writeLastProjectId("lesson-20260911-102000-ab12cd34")
    );
    assert.doesNotThrow(() => clearLastProjectId());
  } finally {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete globalThis.window;
    }
  }
});

test("writeLastProjectId writes only valid-looking project ids", () => {
  const storage = createFakeStorage();

  writeLastProjectId("lesson-20260911-102000-ab12cd34", storage);
  assert.equal(
    storage.getItem(lastProjectStorageKey),
    "lesson-20260911-102000-ab12cd34"
  );

  writeLastProjectId("project-20260911-102000-ab12cd34", storage);
  assert.equal(
    storage.getItem(lastProjectStorageKey),
    "lesson-20260911-102000-ab12cd34"
  );
});

test("writeLastProjectId does not throw if storage write throws", () => {
  const storage = createThrowingStorage({ set: true });

  assert.doesNotThrow(() =>
    writeLastProjectId("lesson-20260911-102000-ab12cd34", storage)
  );
});

test("clearLastProjectId removes the stored pointer and ignores remove errors", () => {
  const storage = createFakeStorage({
    [lastProjectStorageKey]: "lesson-20260911-102000-ab12cd34"
  });

  clearLastProjectId(storage);
  assert.equal(storage.getItem(lastProjectStorageKey), null);

  assert.doesNotThrow(() => clearLastProjectId(createThrowingStorage({ remove: true })));
});

function createFakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));

  return {
    removeCalls: 0,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      this.removeCalls += 1;
      values.delete(key);
    }
  };
}

function createThrowingStorage(throws = {}) {
  return {
    getItem() {
      if (throws.get) throw new Error("get failed");
      return null;
    },
    setItem() {
      if (throws.set) throw new Error("set failed");
    },
    removeItem() {
      if (throws.remove) throw new Error("remove failed");
    }
  };
}
