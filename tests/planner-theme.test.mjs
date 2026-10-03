import assert from "node:assert/strict";
import test from "node:test";
import { builtInThemes, storedTheme } from "../app/plannerTheme.ts";

test("Graphite is the default, including obsolete background preferences", () => {
  for (const value of [null, "lake", "balloon", "unknown", "graphite"]) {
    assert.equal(storedTheme(value), "graphite");
  }
});

test("Graphite is the only available theme", () => {
  assert.deepEqual(builtInThemes, ["graphite"]);
});

test("saved meadow and custom choices fall back to Graphite", () => {
  assert.equal(storedTheme("meadow"), "graphite");
  assert.equal(storedTheme("custom"), "graphite");
});
