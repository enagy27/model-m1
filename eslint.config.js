// @ts-check
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
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
  {
    plugins: {
      "import-x": importX,
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Enforce # absolute imports over ../ relative imports
              group: ["../*"],
              message:
                "Use absolute imports (#util/example.js) instead of relative imports (../util/example.js)",
            },
          ],
        },
      ],
    },
  },
);
