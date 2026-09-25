// Flat ESLint config for the Smart Plants panel package.
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["dist", "node_modules", "playwright-report", "test-results"],
  },
  {
    files: [
      "src/**/*.ts",
      "e2e/**/*.ts",
      "vite.config.ts",
      "vitest.config.ts",
      "playwright.config.ts",
      "scripts/**/*.mjs",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
    },
  },
];
