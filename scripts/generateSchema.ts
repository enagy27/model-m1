import { writeFileSync } from "node:fs";
import { toJsonSchema } from "@valibot/to-json-schema";

import { receiverSettingsSchema } from "../util/receiverSettings.js";

const jsonSchema = toJsonSchema(receiverSettingsSchema);

const output = {
  _comment:
    "AUTO-GENERATED: This schema was generated from the receiverSettingsSchema valibot schema in util/receiverSettings.ts. Do not edit manually.",
  ...jsonSchema,
};

writeFileSync("receiverSettings.schema.json", JSON.stringify(output, null, 2));

console.log("✓ Generated receiverSettings.schema.json");
