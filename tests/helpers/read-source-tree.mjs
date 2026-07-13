import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

async function readSourcePath(sourcePath) {
  const sourceStat = await stat(sourcePath);
  if (sourceStat.isFile()) {
    return readFile(sourcePath, "utf8");
  }

  const entries = await readdir(sourcePath, { withFileTypes: true });
  const sourceEntries = entries
    .filter(
      (entry) =>
        entry.isDirectory() || /\.(?:ts|tsx|js|mjs)$/.test(entry.name),
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    await Promise.all(
      sourceEntries.map((entry) =>
        readSourcePath(path.join(sourcePath, entry.name)),
      ),
    )
  ).join("\n");
}

export async function readSourceTree(rootDir, ...relativePaths) {
  return (
    await Promise.all(
      relativePaths.map((relativePath) =>
        readSourcePath(path.join(rootDir, relativePath)),
      ),
    )
  ).join("\n");
}
