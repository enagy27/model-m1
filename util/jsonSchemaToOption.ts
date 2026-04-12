import * as v from "valibot";
import { Option } from "commander";

const stringEnumSchema = v.object({
  type: v.literal("string"),
  enum: v.array(v.string()),
});

const numberEnumSchema = v.object({
  type: v.literal("number"),
  enum: v.array(v.number()),
});

const stringOrNumberEnumSchema = v.object({
  type: v.array(v.union([v.literal("string"), v.literal("number")])),
  enum: v.array(v.union([v.string(), v.number()])),
});

const numberSchema = v.object({
  type: v.literal("number"),
  minimum: v.optional(v.number()),
  maximum: v.optional(v.number()),
});

const jsonMetaSchema = v.union([
  stringEnumSchema,
  numberEnumSchema,
  stringOrNumberEnumSchema,
  numberSchema,
]);

export type JsonMetaSchema = v.InferOutput<typeof jsonMetaSchema>;

export function parseAsJsonSchema(maybeJsonSchema: unknown): JsonMetaSchema {
  return v.parse(jsonMetaSchema, maybeJsonSchema);
}

type JsonSchemaToOption = {
  name: string;
  schema: JsonMetaSchema;
};

function stringOrNumberEnumParser(value: string): string | number {
  const valueAsNumber = Number(value);

  return Number.isNaN(valueAsNumber) ? value : valueAsNumber;
}

function getArgParser(type: "string" | "number" | ("string" | "number")[]) {
  if (Array.isArray(type)) {
    return stringOrNumberEnumParser;
  }

  return type === "number" ? Number : undefined;
}

function getChoices(values: Array<string | number>): string[] {
  return values.map((value) => value.toString());
}

function getRangeMessage([min, max]: [number | undefined, number | undefined]):
  | string
  | undefined {
  if (min == null && max == null) {
    return undefined;
  }

  if (min == null) {
    return `maximum value: ${max}`;
  }

  if (max == null) {
    return `minimum value: ${min}`;
  }

  return `${min} to ${max}`;
}

export type OptionDescriptor = {
  flags: string;
  description: string;
  choices: string[] | undefined;
  argParser:
    | ((value: string) => number)
    | ((value: string) => string | number)
    | undefined;
};

export function jsonSchemaToOption({
  name,
  schema,
}: JsonSchemaToOption): OptionDescriptor {
  const rangeMessage = getRangeMessage([
    "minimum" in schema ? schema.minimum : undefined,
    "maximum" in schema ? schema.maximum : undefined,
  ]);

  return {
    flags: `--${name} <VALUE>`,
    description: `Sets ${name}${rangeMessage ? ` (${rangeMessage})` : ""}`,
    argParser: getArgParser(schema.type),
    choices: "enum" in schema ? getChoices(schema.enum) : undefined,
  };
}
