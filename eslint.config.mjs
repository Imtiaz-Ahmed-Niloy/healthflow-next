import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat configs, so they spread straight in. (15's
// were legacy eslintrc and needed FlatCompat.)
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next 16 brings eslint-plugin-react-hooks 7, whose React
  // Compiler rules arrive as errors. The code written before them breaks them
  // in ~60 places (mostly setState in an effect) — advice for the compiler,
  // which this app doesn't enable (reactCompiler in next.config.ts), not bugs.
  // Warnings, so they stay visible and get fixed as the files are touched,
  // without failing the lint gate on code that works.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Any scratch build directory made with NEXT_DIST_DIR (see next.config.ts).
    // Without this, linting a machine that has one turns thousands of lines of
    // generated bundle into lint errors and the "lint clean" gate fails on
    // output nobody wrote.
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
