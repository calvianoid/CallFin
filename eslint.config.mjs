import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // This project's dev/build output uses NEXT_DIST_DIR=.next-sandbox
    // (see next.config.ts). It's generated + gitignored — never lint it.
    ".next-sandbox/**",
  ]),
]);

export default eslintConfig;
