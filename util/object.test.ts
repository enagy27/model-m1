import { describe, it, expect } from "vitest";
import {
  entries,
  fromEntries,
  removeNullishValueEntries,
  isEmptyObject,
} from "./object.js";

describe("entries", () => {
  it("should return entries with correct key-value pairs", () => {
    const obj = { a: 1, b: "hello", c: true };
    const result = entries(obj);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual(["a", 1]);
    expect(result).toContainEqual(["b", "hello"]);
    expect(result).toContainEqual(["c", true]);
  });

  it("should return empty array for empty object", () => {
    const obj = {};
    const result = entries(obj);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should handle objects with various value types", () => {
    const obj = {
      num: 42,
      str: "test",
      bool: false,
      arr: [1, 2, 3],
      nested: { inner: "value" },
    };
    const result = entries(obj);

    expect(result).toHaveLength(5);
    expect(result).toContainEqual(["num", 42]);
    expect(result).toContainEqual(["str", "test"]);
    expect(result).toContainEqual(["bool", false]);
    expect(result).toContainEqual(["arr", [1, 2, 3]]);
    expect(result).toContainEqual(["nested", { inner: "value" }]);
  });
});

describe("fromEntries", () => {
  it("should create object from entries", () => {
    const input = [
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ] satisfies Array<[string, number]>;
    const result = fromEntries(input);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should return empty object for empty entries array", () => {
    const input: Array<[string, number]> = [];
    const result = fromEntries(input);

    expect(result).toEqual({});
  });

  it("should handle entries with various value types", () => {
    const input: Array<[string, string | number | boolean]> = [
      ["str", "hello"],
      ["num", 42],
      ["bool", true],
    ];
    const result = fromEntries(input);

    expect(result).toEqual({ str: "hello", num: 42, bool: true });
  });

  it("should be inverse of entries", () => {
    const original = { x: 10, y: 20, z: 30 };
    const result = fromEntries(entries(original));

    expect(result).toEqual(original);
  });
});

describe("removeNullishValueEntries", () => {
  it("should remove null values", () => {
    const obj = { a: 1, b: null, c: 3 };
    const result = removeNullishValueEntries(obj);

    expect(result).toEqual({ a: 1, c: 3 });
    expect("b" in result).toBe(false);
  });

  it("should remove undefined values", () => {
    const obj = { a: 1, b: undefined, c: 3 };
    const result = removeNullishValueEntries(obj);

    expect(result).toEqual({ a: 1, c: 3 });
    expect("b" in result).toBe(false);
  });

  it("should remove both null and undefined values", () => {
    const obj = { a: 1, b: null, c: undefined, d: 4 };
    const result = removeNullishValueEntries(obj);

    expect(result).toEqual({ a: 1, d: 4 });
  });

  it("should keep falsy non-nullish values", () => {
    const obj = { a: 0, b: "", c: false, d: null };
    const result = removeNullishValueEntries(obj);

    expect(result).toEqual({ a: 0, b: "", c: false });
    expect("d" in result).toBe(false);
  });

  it("should return empty object when all values are nullish", () => {
    const obj = { a: null, b: undefined };
    const result = removeNullishValueEntries(obj);

    expect(result).toEqual({});
  });

  it("should return same values when no nullish values exist", () => {
    const obj = { a: 1, b: "hello", c: true };
    const result = removeNullishValueEntries(obj);

    expect(result).toEqual({ a: 1, b: "hello", c: true });
  });
});

describe("isEmptyObject", () => {
  it("should return true for empty object", () => {
    expect(isEmptyObject({})).toBe(true);
  });

  it("should return false for object with one property", () => {
    expect(isEmptyObject({ a: 1 })).toBe(false);
  });

  it("should return false for object with multiple properties", () => {
    expect(isEmptyObject({ a: 1, b: 2, c: 3 })).toBe(false);
  });

  it("should return false for object with nullish values", () => {
    // Object still has keys even if values are null/undefined
    expect(isEmptyObject({ a: null })).toBe(false);
    expect(isEmptyObject({ a: undefined })).toBe(false);
  });

  it("should return false for object with falsy values", () => {
    expect(isEmptyObject({ a: 0 })).toBe(false);
    expect(isEmptyObject({ a: "" })).toBe(false);
    expect(isEmptyObject({ a: false })).toBe(false);
  });
});
