// Offline evaluation only. Never fetches, reads environment secrets or writes matches.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const inputPath = process.argv[2];
if (!inputPath)
  throw Error(
    "Usage: node scripts/evaluate-recording-matches.mjs <private-evaluation.json>",
  );
let inputText;
try {
  inputText = await readFile(inputPath, "utf8");
} catch {
  throw Error("Unable to read evaluation input");
}
if (Buffer.byteLength(inputText) > 2097152)
  throw Error("Evaluation exceeds 2 MiB");
let input;
try {
  input = JSON.parse(inputText);
} catch {
  throw Error("Invalid evaluation JSON");
}
if (
  !input ||
  !Number.isFinite(input.now) ||
  !Array.isArray(input.cases) ||
  input.cases.length > 1000
)
  throw Error("Invalid evaluation");
const temp = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-identity-evaluation-"),
);
try {
  for (const name of [
    "identity-evaluation",
    "automatic-identity",
    "musicbrainz-core",
    "bounded-json",
  ]) {
    const source = await readFile(
      path.join(process.cwd(), "lib/recommendations", name + ".ts"),
      "utf8",
    );
    const output = ts
      .transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      })
      .outputText.replace(/(from\s+["'])(\.[^"']+)(["'])/g, "$1$2.mjs$3");
    await writeFile(path.join(temp, name + ".mjs"), output);
  }
  const { evaluateIdentity } = await import(
    pathToFileURL(path.join(temp, "identity-evaluation.mjs"))
  );
  console.log(JSON.stringify(evaluateIdentity(input), null, 2));
} finally {
  await rm(temp, { recursive: true, force: true });
}
