import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`;
const parser = moduleUrl(
  await readFile(
    new URL("../../lib/player/source.ts", import.meta.url),
    "utf8",
  ),
);
const source = (
  await readFile(
    new URL("../../lib/queue/source-identity.ts", import.meta.url),
    "utf8",
  )
).replace('"../player/source"', JSON.stringify(parser));
const { queueSourceKey, activeQueueSourceCounts } = await import(
  moduleUrl(source)
);

test("YouTube aliases share media identity while titles and different uploads do not", () => {
  assert.equal(
    queueSourceKey({
      sourceType: "youtube",
      sourceUrl: "https://youtu.be/vlrN8Mso-6Y?t=20",
    }),
    queueSourceKey({
      sourceType: "youtube",
      videoId: "vlrN8Mso-6Y",
      title: "Other label",
    }),
  );
  assert.notEqual(
    queueSourceKey({ sourceType: "youtube", videoId: "vlrN8Mso-6Y" }),
    queueSourceKey({ sourceType: "youtube", videoId: "FqvZVGL1_Vk" }),
  );
  assert.equal(queueSourceKey({ title: "Matching title only" }), null);
});
test("Active copy counts include now and queued, exclude played and repeated occurrence IDs", () => {
  const item = {
    sourceType: "direct",
    sourceUrl: "https://example.com/song.mp3",
    title: "Song",
  };
  const rows = [
    { ...item, id: "now", status: "now" },
    { ...item, id: "q", status: "queued" },
    { ...item, id: "q", status: "queued" },
    { ...item, id: "old", status: "played" },
    {
      ...item,
      id: "other",
      status: "queued",
      sourceUrl: "https://example.com/other.mp3",
    },
  ];
  assert.equal(activeQueueSourceCounts(rows).get(queueSourceKey(item)), 2);
  assert.equal(
    activeQueueSourceCounts(rows.filter((row) => row.id !== "q")).get(
      queueSourceKey(item),
    ),
    1,
  );
});
test("Direct source query strings remain part of identity and empty references do not count", () => {
  assert.notEqual(
    queueSourceKey({
      sourceType: "direct",
      sourceUrl: "https://example.com/play?id=1",
    }),
    queueSourceKey({
      sourceType: "direct",
      sourceUrl: "https://example.com/play?id=2",
    }),
  );
  assert.equal(
    activeQueueSourceCounts([{ id: "empty", status: "queued" }]).size,
    0,
  );
});
