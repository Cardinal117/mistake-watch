import assert from "node:assert/strict";
import test from "node:test";
import { readableWatchAccent } from "../../components/room/watch/watch-accent.ts";
const luminance = (rgb) =>
  rgb
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
test("Watch accents remain readable across dark saturated artwork hues", () => {
  for (const rgb of [
    "64 61 174",
    "180 25 30",
    "20 100 70",
    "18 18 18",
    "50 30 120",
  ]) {
    const result = readableWatchAccent(rgb).split(" ").map(Number);
    assert.ok(
      (luminance(result) + 0.05) / (luminance([53, 52, 54]) + 0.05) >= 4.5,
    );
  }
});
test("Already readable Listen accents keep their original color", () => {
  assert.equal(readableWatchAccent("255 186 32"), "255 186 32");
});
