// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    ignores: ["dist/", "node_modules/"],
  },
);
