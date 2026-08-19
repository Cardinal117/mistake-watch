import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

export async function loadSpacetimeBindings({ generatedDir, tempRoot }) {
  await mkdir(tempRoot, { recursive: true });
  const tempDir = await mkdtemp(path.join(tempRoot, "spacetime-bindings-"));

  try {
    await transpileGeneratedBindings(generatedDir, tempDir);
    const bindings = await import(
      `${pathToFileURL(path.join(tempDir, "index.mjs")).href}?${Date.now()}`
    );

    return {
      bindings,
      cleanup: () => rm(tempDir, { force: true, recursive: true }),
    };
  } catch (error) {
    await rm(tempDir, { force: true, recursive: true });
    throw error;
  }
}

async function transpileGeneratedBindings(sourceDir, outDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  await mkdir(outDir, { recursive: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const outPath = path.join(outDir, entry.name);

    if (entry.isDirectory()) {
      await transpileGeneratedBindings(sourcePath, outPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    const source = await readFile(sourcePath, "utf8");
    const js = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: sourcePath,
    }).outputText;
    const rewritten = js.replace(
      /(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
      (_match, prefix, specifier, suffix) =>
        path.extname(specifier)
          ? `${prefix}${specifier}${suffix}`
          : `${prefix}${specifier}.mjs${suffix}`,
    );

    await writeFile(outPath.replace(/\.ts$/, ".mjs"), rewritten);
  }
}
