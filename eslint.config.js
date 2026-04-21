// @ts-check
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  perfectionist.configs["recommended-natural"],
  prettier,
  {
    ignores: ["dist/", "node_modules/"],
  },
);
