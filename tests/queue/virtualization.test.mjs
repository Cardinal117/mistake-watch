import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-queue-window-"),
);
const sourcePath = path.join(rootDir, "lib/queue/virtualization.ts");
const source = await readFile(sourcePath, "utf8");
const listenDrawerSource = await readFile(
  path.join(rootDir, "components/room/listen/queue/queue-drawer.tsx"),
  "utf8",
);
const listenHooksSource = await readFile(
  path.join(rootDir, "components/room/listen/hooks/listen-hooks.ts"),
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const modulePath = path.join(tempDir, "virtualization.mjs");

await mkdir(path.dirname(modulePath), { recursive: true });
await writeFile(modulePath, output);

const {
  MAX_VIRTUAL_QUEUE_ROWS,
  getQueueScrollTopForIndex,
  getQueueVirtualWindow,
} = await import(pathToFileURL(modulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("empty queues produce an empty virtual window", () => {
  assert.deepEqual(
    getQueueVirtualWindow({
      itemCount: 0,
      rowHeight: 80,
      scrollTop: 0,
      viewportHeight: 480,
    }),
    {
      endIndex: 0,
      firstVisibleIndex: 0,
      mountedItemCount: 0,
      offsetTop: 0,
      startIndex: 0,
      totalHeight: 0,
      visibleEndIndex: 0,
    },
  );
});

for (const itemCount of [250, 332, 1000]) {
  test(`${itemCount}-item queues never exceed the mounted-row budget`, () => {
    const rowHeight = 80;
    const viewportHeight = 560;
    const maxScrollTop = itemCount * rowHeight - viewportHeight;

    for (const scrollTop of [0, maxScrollTop / 2, maxScrollTop]) {
      const window = getQueueVirtualWindow({
        itemCount,
        rowHeight,
        scrollTop,
        viewportHeight,
      });

      assert.ok(window.mountedItemCount <= MAX_VIRTUAL_QUEUE_ROWS);
      assert.ok(window.firstVisibleIndex >= window.startIndex);
      assert.ok(window.firstVisibleIndex < window.endIndex);
      assert.equal(window.offsetTop, window.startIndex * rowHeight);
      assert.equal(window.totalHeight, itemCount * rowHeight);
    }
  });
}

test("top, middle, and bottom windows retain bounded overscan", () => {
  const top = getQueueVirtualWindow({
    itemCount: 332,
    rowHeight: 80,
    scrollTop: 0,
    viewportHeight: 480,
  });
  const middle = getQueueVirtualWindow({
    itemCount: 332,
    rowHeight: 80,
    scrollTop: 160 * 80,
    viewportHeight: 480,
  });
  const bottom = getQueueVirtualWindow({
    itemCount: 332,
    rowHeight: 80,
    scrollTop: 999999,
    viewportHeight: 480,
  });

  assert.equal(top.startIndex, 0);
  assert.ok(middle.startIndex < middle.firstVisibleIndex);
  assert.equal(bottom.endIndex, 332);
});

test("invalid scroll and size inputs are clamped safely", () => {
  const window = getQueueVirtualWindow({
    itemCount: 10.9,
    maxMountedItems: 0,
    overscan: -3,
    rowHeight: 0,
    scrollTop: -500,
    viewportHeight: 0,
  });

  assert.equal(window.startIndex, 0);
  assert.equal(window.endIndex, 1);
  assert.equal(window.mountedItemCount, 1);
  assert.equal(window.totalHeight, 10);
});

test("scroll-to-current centers a target while respecting list boundaries", () => {
  assert.equal(
    getQueueScrollTopForIndex({
      index: 0,
      itemCount: 250,
      rowHeight: 80,
      viewportHeight: 480,
    }),
    0,
  );
  assert.equal(
    getQueueScrollTopForIndex({
      index: 125,
      itemCount: 250,
      rowHeight: 80,
      viewportHeight: 480,
    }),
    9800,
  );
  assert.equal(
    getQueueScrollTopForIndex({
      index: 999,
      itemCount: 250,
      rowHeight: 80,
      viewportHeight: 480,
    }),
    19520,
  );
});

test("a scroll-to-current position renders the target row", () => {
  const itemCount = 250;
  const rowHeight = 80;
  const viewportHeight = 480;
  const targetIndex = 125;
  const scrollTop = getQueueScrollTopForIndex({
    index: targetIndex,
    itemCount,
    rowHeight,
    viewportHeight,
  });
  const window = getQueueVirtualWindow({
    itemCount,
    rowHeight,
    scrollTop,
    viewportHeight,
  });

  assert.ok(window.startIndex <= targetIndex);
  assert.ok(window.endIndex > targetIndex);
});

test("listen drawer renders only the virtual queue slice with stable keys", () => {
  assert.match(listenDrawerSource, /getQueueVirtualWindow\(\{/);
  assert.match(
    listenDrawerSource,
    /visibleItems\.slice\(virtualWindow\.startIndex, virtualWindow\.endIndex\)/,
  );
  assert.match(listenDrawerSource, /key=\{item\.id\}/);
  assert.match(listenDrawerSource, /aria-posinset=\{index \+ 1\}/);
  assert.match(listenDrawerSource, /aria-setsize=\{visibleItems\.length\}/);
  assert.doesNotMatch(listenDrawerSource, /visibleItems\.map\(/);
});

test("listen drawer keeps its intended default height without a stored preference", () => {
  assert.match(
    listenHooksSource,
    /if \(stored === null\) \{\s*return DEFAULT_LISTEN_DRAWER_HEIGHT;/,
  );
});
