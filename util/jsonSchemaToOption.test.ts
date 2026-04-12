import { describe, it, expect, vi } from "vitest";
import { jsonSchemaToOption } from "./jsonSchemaToOption";

describe("jsonSchemaToOption", () => {
  it("string enum", () => {
    const option = jsonSchemaToOption({
      name: "soundMode",
      schema: {
        enum: ["direct", "stereo", "virtual"],
        type: "string",
      },
    });

    expect(option).toEqual({
      flags: "--soundMode <VALUE>",
      description: "Sets soundMode",
      choices: ["direct", "stereo", "virtual"],
    });
  });

  it("number enum", () => {
    const option = jsonSchemaToOption({
      name: "lowPassFilter",
      schema: {
        enum: [40, 60, 80, 90, 100, 110, 120],
        type: "number",
      },
    });

    expect(option).toEqual({
      flags: "--lowPassFilter <VALUE>",
      description: "Sets lowPassFilter",
      choices: ["40", "60", "80", "90", "100", "110", "120"],
      argParser: expect.anything(),
    });

    expect(option.argParser?.("40")).toEqual(40);
  });

  it("mixed enum", () => {
    const option = jsonSchemaToOption({
      name: "highPassFilter",
      schema: {
        enum: ["off", 40, 80, 100, 110, 120],
        type: ["string", "number"],
      },
    });

    expect(option).toEqual({
      flags: "--highPassFilter <VALUE>",
      description: "Sets highPassFilter",
      choices: ["off", "40", "80", "100", "110", "120"],
      argParser: expect.anything(),
    });

    expect(option.argParser?.("off")).toEqual("off");
    expect(option.argParser?.("40")).toEqual(40);
  });

  it("number with range", () => {
    const option = jsonSchemaToOption({
      name: "bass",
      schema: {
        type: "number",
        minimum: -5,
        maximum: 5,
      },
    });

    expect(option).toEqual({
      flags: "--bass <VALUE>",
      description: "Sets bass (-5 to 5)",
      argParser: expect.anything(),
    });

    expect(option.argParser?.("40")).toEqual(40);
  });

  it("number with minimum only", () => {
    const option = jsonSchemaToOption({
      name: "bass",
      schema: {
        type: "number",
        minimum: -5,
      },
    });

    expect(option).toEqual({
      flags: "--bass <VALUE>",
      description: "Sets bass (minimum value: -5)",
      argParser: expect.anything(),
    });

    expect(option.argParser?.("40")).toEqual(40);
  });

  it("number with maximum only", () => {
    const option = jsonSchemaToOption({
      name: "bass",
      schema: {
        type: "number",
        maximum: 5,
      },
    });

    expect(option).toEqual({
      flags: "--bass <VALUE>",
      description: "Sets bass (maximum value: 5)",
      argParser: expect.anything(),
    });

    expect(option.argParser?.("40")).toEqual(40);
  });
});
