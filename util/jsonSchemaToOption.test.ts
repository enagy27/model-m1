import { describe, expect, it } from "vitest";

import { jsonSchemaToOption } from "./jsonSchemaToOption.js";

describe("jsonSchemaToOption", () => {
  it("string enum", () => {
    const option = jsonSchemaToOption({
      name: "soundMode",
      schema: {
        description: "Sets soundMode",
        enum: ["direct", "stereo", "virtual"],
        type: "string",
      },
    });

    expect(option).toEqual({
      choices: ["direct", "stereo", "virtual"],
      description: "Sets soundMode",
      flags: "--soundMode <VALUE>",
    });
  });

  it("number enum", () => {
    const option = jsonSchemaToOption({
      name: "lowPassFilter",
      schema: {
        description: "Sets lowPassFilter",
        enum: [40, 60, 80, 90, 100, 110, 120],
        type: "number",
      },
    });

    expect(option).toEqual({
      argParser: expect.anything(),
      choices: ["40", "60", "80", "90", "100", "110", "120"],
      description: "Sets lowPassFilter",
      flags: "--lowPassFilter <VALUE>",
    });

    expect(option.argParser?.("40")).toEqual(40);
  });

  it("mixed enum", () => {
    const option = jsonSchemaToOption({
      name: "highPassFilter",
      schema: {
        description: "Sets highPassFilter",
        enum: ["off", 40, 80, 100, 110, 120],
        type: ["string", "number"],
      },
    });

    expect(option).toEqual({
      argParser: expect.anything(),
      choices: ["off", "40", "80", "100", "110", "120"],
      description: "Sets highPassFilter",
      flags: "--highPassFilter <VALUE>",
    });

    expect(option.argParser?.("off")).toEqual("off");
    expect(option.argParser?.("40")).toEqual(40);
  });

  it("number with range", () => {
    const option = jsonSchemaToOption({
      name: "bass",
      schema: {
        description: "Sets bass",
        maximum: 5,
        minimum: -5,
        type: "number",
      },
    });

    expect(option).toEqual({
      argParser: expect.anything(),
      description: "Sets bass\n\nRange: [-5 to 5]",
      flags: "--bass <VALUE>",
    });

    expect(option.argParser?.("40")).toEqual(40);
  });

  it("number with minimum only", () => {
    const option = jsonSchemaToOption({
      name: "bass",
      schema: {
        description: "Sets bass",
        minimum: -5,
        type: "number",
      },
    });

    expect(option).toEqual({
      argParser: expect.anything(),
      description: "Sets bass\n\nRange: [down to -5]",
      flags: "--bass <VALUE>",
    });

    expect(option.argParser?.("40")).toEqual(40);
  });

  it("number with maximum only", () => {
    const option = jsonSchemaToOption({
      name: "bass",
      schema: {
        description: "Sets bass",
        maximum: 5,
        type: "number",
      },
    });

    expect(option).toEqual({
      argParser: expect.anything(),
      description: "Sets bass\n\nRange: [up to 5]",
      flags: "--bass <VALUE>",
    });

    expect(option.argParser?.("40")).toEqual(40);
  });
});
