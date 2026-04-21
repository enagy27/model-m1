import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import type { IOutput } from "./output.js";
import type { ISocket } from "./sockets.js";

import { request } from "./sockets.js";

describe("sockets", () => {
  describe("request", () => {
    it("should parse response with status code and headers", async () => {
      const emitter = new EventEmitter();

      const responseBody = "<response>OK</response>";
      const response = [
        "HTTP/1.1 200 OK",
        `Content-Length: ${Buffer.byteLength(responseBody)}`,
        "X-Response-Header: response-value",
        "",
        responseBody,
      ].join("\r\n");

      const output = {
        debug: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
        table: vi.fn(),
      } satisfies IOutput;

      const socket = {
        connect: vi.fn((onConnect) => onConnect()),
        destroy: vi.fn(),
        off: vi.fn((eventName, cb) => emitter.off(eventName, cb)),
        on: vi.fn((eventName, cb) => emitter.on(eventName, cb)),
        write: vi.fn(() => emitter.emit("data", response)),
      } satisfies ISocket;

      const result = await request({
        headers: {},
        method: "POST",
        output,
        pathname: "/test",
        socket,
      });

      expect(result).toEqual({
        body: responseBody,
        headers: {
          "CONTENT-LENGTH": `${Buffer.byteLength(responseBody)}`,
          "X-RESPONSE-HEADER": "response-value",
        },
        statusCode: 200,
      });
    });

    it("should handle response without body", async () => {
      const emitter = new EventEmitter();

      const response = ["HTTP/1.1 204 No Content", "X-Header: value", ""].join(
        "\r\n",
      );

      const output = {
        debug: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
        table: vi.fn(),
      } satisfies IOutput;

      const socket = {
        connect: vi.fn((onConnect) => onConnect()),
        destroy: vi.fn(),
        off: vi.fn((eventName, cb) => emitter.off(eventName, cb)),
        on: vi.fn((eventName, cb) => emitter.on(eventName, cb)),
        write: vi.fn(() => emitter.emit("data", response)),
      } satisfies ISocket;

      const result = await request({
        headers: {},
        method: "POST",
        output,
        pathname: "/test",
        socket,
      });

      expect(result.statusCode).toEqual(204);
      expect(result.headers["X-HEADER"]).toEqual("value");
    });

    it("should reject on socket error", async () => {
      const emitter = new EventEmitter();

      const output = {
        debug: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
        table: vi.fn(),
      } satisfies IOutput;

      const socket = {
        connect: vi.fn((onConnect) => onConnect()),
        destroy: vi.fn(),
        off: vi.fn((eventName, cb) => emitter.off(eventName, cb)),
        on: vi.fn((eventName, cb) => emitter.on(eventName, cb)),
        write: vi.fn(() =>
          emitter.emit("error", new Error("Connection refused")),
        ),
      } satisfies ISocket;

      await expect(
        request({
          headers: {},
          method: "POST",
          output,
          pathname: "/test",
          socket,
        }),
      ).rejects.toThrow("Connection refused");
    });
  });
});
