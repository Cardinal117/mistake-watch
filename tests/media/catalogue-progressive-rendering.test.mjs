import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const librarySource = await readFile(
  path.join(
    rootDir,
    "components/room/watch/library/uploaded-media-library.tsx",
  ),
  "utf8",
);
const posterSource = await readFile(
  path.join(rootDir, "components/room/watch/library/lazy-media-poster.tsx"),
  "utf8",
);
const cardSource = await readFile(
  path.join(rootDir, "components/room/watch/library/watch-media-hub-card.tsx"),
  "utf8",
);
const viewSource = await readFile(
  path.join(
    rootDir,
    "components/room/watch/media-hub/watch-media-hub-view.tsx",
  ),
  "utf8",
);

test("uploaded catalogue maps only the approved progressive slice", () => {
  assert.match(librarySource, /assets\.slice\(0, visibleCount\)/);
  assert.match(librarySource, /renderedAssets\.map\(\(item, index\)/);
  assert.doesNotMatch(librarySource, /\{assets\.map\(\(item/);
  assert.match(librarySource, /data-mounted-count=\{visibleCount\}/);
  assert.match(librarySource, /data-total-count=\{assets\.length\}/);
  assert.match(librarySource, /getResultRevision\(assets\)/);
});

test("progressive rendering uses the Media Hub scroll owner", () => {
  assert.match(viewSource, /const scrollRootRef = useRef<HTMLDivElement/);
  assert.match(viewSource, /ref=\{scrollRootRef\}/);
  assert.match(viewSource, /scrollRootRef=\{scrollRootRef\}/);
  assert.match(librarySource, /ref=\{sentinelRef\}/);
});

test("posters assign their route only after eager or near-viewport approval", () => {
  assert.match(posterSource, /shouldLoad \? \(/);
  assert.match(posterSource, /new IntersectionObserver/);
  assert.match(posterSource, /root: scrollRootRef\?\.current \?\? null/);
  assert.match(posterSource, /loading=\{eager \? "eager" : "lazy"\}/);
  assert.match(posterSource, /fetchPriority=\{eager \? "auto" : "low"\}/);
  assert.match(cardSource, /<LazyMediaPoster/);
  assert.doesNotMatch(posterSource, /cloudflarestorage|r2\.mistakestudios/);
});

test("card identity remains canonical across progressive boundaries", () => {
  assert.match(librarySource, /key=\{item\.id\}/);
  assert.match(cardSource, /data-media-asset-id=\{item\.id\}/);
  assert.match(librarySource, /posterEager=\{index < eagerPosterCount\}/);
});
