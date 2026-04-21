import { JsonSchema, toJsonSchema } from "@valibot/to-json-schema";
import { writeFileSync } from "node:fs";
import { Project, SyntaxKind } from "ts-morph";

import { receiverSettingsSchema } from "#util/receiverSettings.js";

type ReformatJSDocLineArgs = {
  first: boolean;
  last: boolean;
  line: string;
};

/**
 * Adds description fields to JSON schema properties based on JSDoc comments.
 */
function addDescriptionsToSchema(
  schema: JsonSchema,
  descriptions: Record<string, string>,
): JsonSchema {
  if (!schema.properties) {
    return schema;
  }

  const propertiesEntries = Object.entries(schema.properties).map(
    ([propName, propSchema]) => {
      if (typeof propSchema !== "object") {
        return [propName, propSchema] as const;
      }

      const description = descriptions[propName];
      const updatedPropSchema = { ...propSchema, description };

      return [propName, updatedPropSchema];
    },
  );

  const properties = Object.fromEntries(propertiesEntries);

  return { ...schema, properties };
}

/**
 * Extracts JSDoc comments for each property from the receiverSettings.ts source file.
 * Returns a map of property name -> JSDoc description text.
 */
function extractJsDocComments(): Record<string, string> {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath("util/receiverSettings.ts");

  const propertyCommentEntries = sourceFile
    .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
    .map((prop) => {
      const [jsDocComment] = prop
        .getLeadingCommentRanges()
        .map((comment) => comment.getText())
        .filter((comment) => comment.startsWith("/**"))
        .map((comment) => getDescriptionFromJSDocComment(comment))
        .map((comment) => removeLineLengthLimits(comment))
        .filter(Boolean);

      if (!jsDocComment) {
        return undefined;
      }

      return [prop.getName(), jsDocComment] as const;
    })
    .filter((entry) => entry != null);

  return Object.fromEntries(propertyCommentEntries);
}

function getDescriptionFromJSDocComment(comment: string): string {
  return comment
    .split("\n")
    .map((line, i, lines) => {
      const first = i < 1;
      const last = i >= lines.length - 1;

      return reformatJSDocLine({ first, last, line });
    })
    .join("\n")
    .trim();
}

function reformatJSDocLine({
  first,
  last,
  line,
}: ReformatJSDocLineArgs): string {
  if (first && last) {
    return removeJSDocOpening(removeJSDocClosing(line));
  }

  if (first) {
    return removeJSDocOpening(line);
  }

  if (last) {
    return removeJSDocClosing(line);
  }

  return removeJSDocBodyAsterisk(line);
}

function removeJSDocBodyAsterisk(line: string): string {
  return line.trim().replace(/^\*/, "").trim();
}

function removeJSDocClosing(line: string): string {
  return line.trim().replace(/\*\//, "").trim();
}

function removeJSDocOpening(line: string): string {
  return line
    .trim()
    .replace(/^\/\*\*/, "")
    .trim();
}

/**
 * Replaces single newlines with space characters in order to
 * remove early line termination for line length limits in JSDoc.
 * In the terminal we instead want to use the terminal width to
 * wrap text.
 */
function removeLineLengthLimits(text: string): string {
  return text
    .split("\n\n")
    .map((paragraph) => paragraph.replaceAll("\n", " "))
    .join("\n\n");
}

// Add descriptions from JSDoc comments
const schemaWithDescriptions = addDescriptionsToSchema(
  toJsonSchema(receiverSettingsSchema),
  extractJsDocComments(),
);

const output = {
  _comment:
    "AUTO-GENERATED: This schema was generated from the receiverSettingsSchema valibot schema in util/receiverSettings.ts. Do not edit manually.",
  ...schemaWithDescriptions,
};

writeFileSync("receiverSettings.schema.json", JSON.stringify(output, null, 2));

console.log("✓ Generated receiverSettings.schema.json");
