import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const handwrittenFileCeiling = 700;
export const architectureReviewThreshold = 500;

export const legacyFileCeilings = new Map([
  ["components/account/account-command-panel.tsx", 806],
  ["components/room/transport-controls.tsx", 899],
  ["components/room/youtube-media-player.tsx", 891],
  ["lib/spacetime/use-live-room.ts", 918],
  ["spacetime/src/index.ts", 2_205],
]);

const scannedRoots = [
  "app",
  "components",
  "lib",
  "scripts",
  "spacetime/src",
  "tests",
];
const handwrittenExtensions = new Set([".mjs", ".ts", ".tsx"]);

export function evaluateFileLengths(files) {
  const violations = [];
  const warnings = [];

  for (const file of files) {
    const legacyCeiling = legacyFileCeilings.get(file.path);

    if (legacyCeiling !== undefined) {
      if (file.lines > legacyCeiling) {
        violations.push({
          ...file,
          reason: `legacy ceiling ${legacyCeiling} exceeded`,
        });
      } else {
        warnings.push({
          ...file,
          reason: `legacy exception <= ${legacyCeiling}`,
        });
      }
      continue;
    }

    if (file.lines > handwrittenFileCeiling) {
      violations.push({
        ...file,
        reason: `new handwritten file ceiling ${handwrittenFileCeiling} exceeded`,
      });
    } else if (file.lines > architectureReviewThreshold) {
      warnings.push({
        ...file,
        reason: `architecture review threshold ${architectureReviewThreshold} exceeded`,
      });
    }
  }

  return { violations, warnings };
}

export async function collectHandwrittenSourceFiles(rootDirectory) {
  const files = [];

  for (const root of scannedRoots) {
    await collectDirectory(
      path.join(rootDirectory, root),
      rootDirectory,
      files,
    );
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function collectDirectory(directory, rootDirectory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "generated") {
        await collectDirectory(absolutePath, rootDirectory, files);
      }
      continue;
    }

    if (
      !handwrittenExtensions.has(path.extname(entry.name)) ||
      entry.name === "database.types.ts"
    ) {
      continue;
    }

    const source = await readFile(absolutePath, "utf8");
    files.push({
      lines: countPhysicalLines(source),
      path: path.relative(rootDirectory, absolutePath).replaceAll("\\", "/"),
    });
  }
}

function countPhysicalLines(source) {
  if (!source) {
    return 0;
  }

  const lines = source.split(/\r?\n/).length;
  return source.endsWith("\n") ? lines - 1 : lines;
}

async function main() {
  const rootDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const result = evaluateFileLengths(
    await collectHandwrittenSourceFiles(rootDirectory),
  );

  for (const warning of result.warnings) {
    console.warn(
      `WARN ${warning.path}: ${warning.lines} lines (${warning.reason})`,
    );
  }

  for (const violation of result.violations) {
    console.error(
      `ERROR ${violation.path}: ${violation.lines} lines (${violation.reason})`,
    );
  }

  console.log(
    `File-length check: ${result.violations.length} violation(s), ${result.warnings.length} warning(s).`,
  );

  if (result.violations.length > 0) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
