import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sleep, awaitAtMost } from "./async";

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should resolve after specified duration", async () => {
    let resolved = false;
    const promise = sleep(100).then(() => {
      resolved = true;
    });

    // Promise should not resolve before time advances
    expect(resolved).toBe(false);

    // Advance time partially - still shouldn't resolve
    vi.advanceTimersByTime(50);
    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);

    // Advance remaining time - now should resolve
    vi.advanceTimersByTime(50);
    await promise;
    expect(resolved).toBe(true);
  });
});

describe("awaitAtMost", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should return promise value before timeout", async () => {
    const promise = Promise.resolve("success");
    const result = await awaitAtMost(promise, 1000);
    expect(result).toBe("success");
  });

  it("should throw TIMEOUT error when promise exceeds duration", async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve("slow"), 5000);
    });

    const resultPromise = awaitAtMost(slowPromise, 100);

    // Attach the rejection handler before advancing timers
    const expectation = expect(resultPromise).rejects.toThrow("TIMEOUT");

    // Advance time past the timeout
    await vi.advanceTimersByTimeAsync(100);

    await expectation;
  });

  it("should throw original error if promise rejects before timeout", async () => {
    const promise = Promise.reject(new Error("original error"));
    await expect(awaitAtMost(promise, 1000)).rejects.toThrow("original error");
  });

  it("should resolve when promise completes within timeout", async () => {
    let resolved = false;
    const promise = sleep(50).then(() => {
      resolved = true;
      return "completed";
    });

    const resultPromise = awaitAtMost(promise, 500);

    expect(resolved).toBe(false);

    // Advance time enough for the inner sleep to resolve
    await vi.advanceTimersByTimeAsync(50);

    const result = await resultPromise;
    expect(result).toBe("completed");
    expect(resolved).toBe(true);
  });
});
