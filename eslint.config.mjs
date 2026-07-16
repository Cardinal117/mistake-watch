import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".agents/**",
    ".next/**",
    ".open-next/**",
    "node_modules/**",
    "out/**",
    "next-env.d.ts",
    "spacetime/dist/**",
    "lib/spacetime/generated/**",
  ]),
]);
