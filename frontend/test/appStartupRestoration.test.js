import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("initial App render shows the loading state without demo lesson content", async () => {
  const vite = await createServer({
    root: new URL("..", import.meta.url).pathname,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
  });

  try {
    const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
    const markup = renderToStaticMarkup(React.createElement(App));

    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, /Loading lesson\.\.\./);
    assert.match(markup, /Restoring the saved lesson/);
    assert.doesNotMatch(markup, /At the Doctor&#x27;s Surgery/);
    assert.doesNotMatch(markup, /Unsaved changes/);
  } finally {
    await vite.close();
  }
});
