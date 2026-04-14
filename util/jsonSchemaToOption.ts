import * as v from "valibot";

const stringEnumSchema = v.object({
  type: v.literal("string"),
  enum: v.array(v.string()),
  description: v.string(),
});

const numberEnumSchema = v.object({
  type: v.literal("number"),
  enum: v.array(v.number()),
  description: v.string(),
});

const stringOrNumberEnumSchema = v.object({
  type: v.array(v.union([v.literal("string"), v.literal("number")])),
  enum: v.array(v.union([v.string(), v.number()])),
  description: v.string(),
});

const numberSchema = v.object({
  type: v.literal("number"),
  minimum: v.optional(v.number()),
  maximum: v.optional(v.number()),
  description: v.string(),
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

function getRangeText([min, max]: [number?, number?]): string | undefined {
  if (min != null && max != null) {
    return `[${min} to ${max}]`;
  }

  if (min != null) {
    return `[down to ${min}]`;
  }

  if (max != null) {
    return `[up to ${max}]`;
  }

  return undefined;
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
  const min = "minimum" in schema ? schema.minimum : undefined;
  const max = "maximum" in schema ? schema.maximum : undefined;

  const rangeText = getRangeText([min, max]);

  const description = [
    schema.description,
    rangeText ? `Range: ${rangeText}` : undefined,
  ]
    .filter((line) => line != null)
    .join("\n\n");

  return {
    flags: `--${name} <VALUE>`,
    argParser: getArgParser(schema.type),
    choices: "enum" in schema ? getChoices(schema.enum) : undefined,
    description,
  };
}
