import { describe, it, expect } from "vitest";
import { ensureArray } from "./array";

describe("ensureArray", () => {
  it("should return an array when given a single item", () => {
    expect(ensureArray(42)).toEqual([42]);
  });

  it("should return the same array when given an array", () => {
    const arr = [1, 2, 3];
    expect(ensureArray(arr)).toEqual(arr);
  });

  it("should wrap a string in an array", () => {
    expect(ensureArray("hello")).toEqual(["hello"]);
  });

  it("should handle null values", () => {
    expect(ensureArray(null)).toEqual([null]);
  });

  it("should handle undefined values", () => {
    expect(ensureArray(undefined)).toEqual([undefined]);
  });

  it("should handle empty arrays", () => {
    expect(ensureArray([])).toEqual([]);
  });

  it("should handle arrays with mixed types", () => {
    const arr = [1, "two", null, undefined];
    expect(ensureArray(arr)).toEqual(arr);
  });

  it("should handle objects", () => {
    const obj = { key: "value" };
    expect(ensureArray(obj)).toEqual([obj]);
  });
});
