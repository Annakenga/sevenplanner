import assert from "node:assert/strict";
import test from "node:test";
import { builtInThemes, nextBuiltInTheme, storedTheme } from "../app/plannerTheme.ts";

test("Graphite is the default, including obsolete background preferences", () => {
  for (const value of [null, "lake", "balloon", "unknown", "graphite"]) {
    assert.equal(storedTheme(value, null), "graphite");
  }
});

test("exactly two built-in themes cycle without the removed forest", () => {
  assert.deepEqual(builtInThemes, ["graphite", "meadow"]);
  assert.equal(nextBuiltInTheme("graphite"), "meadow");
  assert.equal(nextBuiltInTheme("meadow"), "graphite");
  assert.equal(nextBuiltInTheme("custom"), "graphite");
});

test("explicit choices persist; missing custom images fall back safely", () => {
  assert.equal(storedTheme("meadow", null), "meadow");
  assert.equal(storedTheme("custom", "data:image/png;base64,test"), "custom");
  assert.equal(storedTheme("custom", null), "graphite");
});
