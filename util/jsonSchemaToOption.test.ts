import { describe, it, expect } from "vitest";
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
      flags: "--soundMode <VALUE>",
      description: "Sets soundMode",
      choices: ["direct", "stereo", "virtual"],
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
        description: "Sets highPassFilter",
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
        description: "Sets bass",
        type: "number",
        minimum: -5,
        maximum: 5,
      },
    });

    expect(option).toEqual({
      flags: "--bass <VALUE>",
      description: "Sets bass\n\nRange: [-5 to 5]",
      argParser: expect.anything(),
    });

    expect(option.argParser?.("40")).toEqual(40);
  });

  it("number with minimum only", () => {
    const option = jsonSchemaToOption({
      name: "bass",
      schema: {
        description: "Sets bass",
        type: "number",
        minimum: -5,
      },
    });

    expect(option).toEqual({
      flags: "--bass <VALUE>",
      description: "Sets bass\n\nRange: [down to -5]",
      argParser: expect.anything(),
    });

    expect(option.argParser?.("40")).toEqual(40);
  });

  it("number with maximum only", () => {
    const option = jsonSchemaToOption({
      name: "bass",
      schema: {
        description: "Sets bass",
        type: "number",
        maximum: 5,
      },
    });

    expect(option).toEqual({
      flags: "--bass <VALUE>",
      description: "Sets bass\n\nRange: [up to 5]",
      argParser: expect.anything(),
    });

    expect(option.argParser?.("40")).toEqual(40);
  });
});
