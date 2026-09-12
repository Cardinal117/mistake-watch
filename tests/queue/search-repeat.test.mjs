import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual nested command handlers, with only the component's sender
// replaced. This catches payload omissions without loading the React app.
const source = await readFile(new URL("../../components/room/listen/header/header-tools.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("header.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["youtubeSearchItemToQueueInput", "addSearchResult", "playSearchResultNext"]);
const functions = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) functions.push(node.getText(tree));
  ts.forEachChild(node, visit);
}

test("manual Add Media admission allows a repeat arriving after the local check", async () => {
  const source = await readFile(new URL("../../components/room/shared/add-media/use-add-media-controller.ts", import.meta.url), "utf8");
  const tree = ts.createSourceFile("controller.ts", source, ts.ScriptTarget.Latest, true);
  let handler;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "addQueueItemWithFeedback") handler = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const received = [];
  const context = vm.createContext({ onAddQueueItem: input => received.push(input), notify() {} });
  vm.runInContext(ts.transpileModule(handler, {}).outputText, context);
  context.addQueueItemWithFeedback({ sourceTitle: "Repeat", sourceUrl: "same", allowDuplicate: false });
  assert.equal(received[0].allowDuplicate, true);
});

for (const [file, name] of [
  ["components/room/watch/library/watch-media-hub-card.tsx", "addQueueItem"],
  ["components/room/watch/media-hub/media-hub-helpers.ts", "mediaHubItemToQueueInput"],
]) {
  test(`${name} allows explicit library repeats`, async () => {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), "utf8");
    const tree = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler;
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) handler = node.getText(tree).replace(/^export /, "");
      ts.forEachChild(node, visit);
    }
    visit(tree);
    const item = { sourceType: "youtube", sourceUrl: "same", title: "Repeat", duration: "2:50" };
    const received = [];
    const context = vm.createContext({ canUseQueueSource: true, item, parseDurationSeconds: () => 170, onAddQueueItem: input => received.push(input) });
    vm.runInContext(ts.transpileModule(handler, {}).outputText, context);
    const result = name === "addQueueItem" ? (context[name](true), received[0]) : context[name](item, { isPlayNext: true });
    assert.equal(result.allowDuplicate, true);
    assert.equal(result.isPlayNext, true);
    assert.equal(result.sourceUrl, "same");
  });
}
visit(tree);
const js = ts.transpileModule(functions.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const action of ["addSearchResult", "playSearchResultNext"]) {
  test(`${action} admits two intentional occurrences of an already queued source`, () => {
    const rows = [{ sourceUrl: "https://www.youtube.com/watch?v=example0001" }];
    const context = vm.createContext({ onAddQueueItem(input) {
      if (!input.allowDuplicate && rows.some(row => row.sourceUrl === input.sourceUrl)) return;
      rows.push(input);
    }});
    vm.runInContext(js, context);
    const item = { url: rows[0].sourceUrl, title: "Repeat", channelTitle: "Artist", availability: { playable: true }, durationSeconds: 170 };
    context[action](item);
    context[action](item);
    assert.equal(rows.length, 3, "both additions must reach the canonical queue");
    assert.equal(rows[1].isPlayNext === true, action === "playSearchResultNext");
    assert.equal(rows[1].durationSeconds, 170);
  });
}
