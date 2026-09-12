import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();
const relative = "components/room/watch/browse/watch-catalogue-sort.ts";
const mod = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(readFileSync(path.join(root, relative), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: relative,
  }).outputText,
  {
    module: mod,
    exports: mod.exports,
    require(specifier) {
      if (specifier === "../presentation")
        return {
          parseDurationSeconds(value) {
            const parts = value.split(":").map(Number);
            if (parts.some((part) => !Number.isFinite(part))) return undefined;
            return parts.reduce((seconds, part) => seconds * 60 + part, 0);
          },
        };
      throw new Error(`Unexpected dependency ${specifier}`);
    },
  },
);

const { sortWatchCatalogueItems } = mod.exports;
const item = (title, duration = "1:00", addedAt = "2026-09-01") => ({
  id: title,
  title,
  duration,
  addedAt,
});

test("natural catalogue order compares season and episode numbers", () => {
  const titles = Array.from(
    sortWatchCatalogueItems(
      [
        item("Voyagers S02E01"),
        item("Voyagers S01E14"),
        item("Voyagers S10E01"),
        item("Voyagers S01E02"),
      ],
      "natural",
    ),
    (entry) => entry.title,
  );

  assert.deepEqual(titles, [
    "Voyagers S01E02",
    "Voyagers S01E14",
    "Voyagers S02E01",
    "Voyagers S10E01",
  ]);
});

test("natural order compares ordinary title numbers numerically", () => {
  const titles = Array.from(
    sortWatchCatalogueItems(
      [item("Episode 20"), item("Episode 3"), item("Episode 11")],
      "natural",
    ),
    (entry) => entry.title,
  );
  assert.deepEqual(titles, ["Episode 3", "Episode 11", "Episode 20"]);
});

test("date and duration choices retain natural title tie-breaking", () => {
  const entries = [
    item("Episode 10", "2:00", "2026-09-02"),
    item("Episode 2", "1:00", "2026-09-01"),
    item("Episode 30", "Ready", "2026-09-03"),
  ];
  assert.deepEqual(
    Array.from(
      sortWatchCatalogueItems(entries, "shortest"),
      (entry) => entry.title,
    ),
    ["Episode 2", "Episode 10", "Episode 30"],
  );
  assert.deepEqual(
    Array.from(
      sortWatchCatalogueItems(entries, "longest"),
      (entry) => entry.title,
    ),
    ["Episode 10", "Episode 2", "Episode 30"],
  );
  assert.deepEqual(
    Array.from(
      sortWatchCatalogueItems(entries, "recent"),
      (entry) => entry.title,
    ),
    ["Episode 30", "Episode 10", "Episode 2"],
  );
});
