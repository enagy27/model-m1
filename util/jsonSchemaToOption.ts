import * as v from "valibot";

const stringEnumSchema = v.object({
  description: v.string(),
  enum: v.array(v.string()),
  type: v.literal("string"),
});

const numberEnumSchema = v.object({
  description: v.string(),
  enum: v.array(v.number()),
  type: v.literal("number"),
});

const stringOrNumberEnumSchema = v.object({
  description: v.string(),
  enum: v.array(v.union([v.string(), v.number()])),
  type: v.array(v.union([v.literal("string"), v.literal("number")])),
});

const numberSchema = v.object({
  description: v.string(),
  maximum: v.optional(v.number()),
  minimum: v.optional(v.number()),
  type: v.literal("number"),
});

const jsonMetaSchema = v.union([
  stringEnumSchema,
  numberEnumSchema,
  stringOrNumberEnumSchema,
  numberSchema,
]);

export type JsonMetaSchema = v.InferOutput<typeof jsonMetaSchema>;

export type OptionDescriptor = {
  argParser:
    | ((value: string) => number)
    | ((value: string) => number | string)
    | undefined;
  choices: string[] | undefined;
  description: string;
  flags: string;
};

type JsonSchemaToOption = {
  name: string;
  schema: JsonMetaSchema;
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
    argParser: getArgParser(schema.type),
    choices: "enum" in schema ? getChoices(schema.enum) : undefined,
    description,
    flags: `--${name} <VALUE>`,
  };
}

export function parseAsJsonSchema(maybeJsonSchema: unknown): JsonMetaSchema {
  return v.parse(jsonMetaSchema, maybeJsonSchema);
}

function getArgParser(type: "number" | "string" | ("number" | "string")[]) {
  if (Array.isArray(type)) {
    return stringOrNumberEnumParser;
  }

  return type === "number" ? Number : undefined;
}

function getChoices(values: Array<number | string>): string[] {
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

function stringOrNumberEnumParser(value: string): number | string {
  const valueAsNumber = Number(value);

  return Number.isNaN(valueAsNumber) ? value : valueAsNumber;
}
