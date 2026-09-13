import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getApertureFrame,
  getIrisBladeAngle,
} from "../../components/brand/signal-aperture-motion.ts";

test("a mode transition closes, swaps once, then reopens", () => {
  assert.deepEqual(getApertureFrame(0, true), {
    icon: "previous",
    rotation: 0,
    travel: 1,
  });
  assert.equal(getApertureFrame(250, true).travel, 0);
  assert.equal(getApertureFrame(269, true).icon, "previous");
  assert.equal(getApertureFrame(270, true).icon, "current");
  assert.deepEqual(getApertureFrame(650, true), {
    icon: "current",
    rotation: 60,
    travel: 1,
  });
});

test("loading animation retains its requested destination icon", () => {
  for (const elapsed of [0, 650, 900, 1800, 3600, 7200]) {
    assert.equal(getApertureFrame(elapsed, false).icon, "current");
  }
});

test("verified iris geometry stays finite across its full travel", () => {
  const open = getIrisBladeAngle(1);
  const closed = getIrisBladeAngle(0);

  assert.ok(Number.isFinite(open));
  assert.ok(Number.isFinite(closed));
  assert.notEqual(open, closed);
});

test("the closing rotor paints over the core and mode symbol", () => {
  const component = readFileSync(
    "components/brand/signal-aperture-brand.tsx",
    "utf8",
  );
  const core = component.indexOf('<circle className={styles.core}');
  const symbol = component.indexOf('<g className={styles.symbol}>');
  const rotor = component.indexOf(
    '<g clipPath={`url(#${id}-disc)`} data-aperture-rotor>',
  );

  assert.ok(core >= 0 && symbol > core && rotor > symbol);
});
