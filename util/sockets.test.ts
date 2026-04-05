import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";

import { request } from "./sockets";
import type { ISocket } from "./sockets";
import type { IOutput } from "./output";

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
        log: vi.fn(),
        table: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      } satisfies IOutput;

      const socket = {
        on: vi.fn((eventName, cb) => emitter.on(eventName, cb)),
        off: vi.fn((eventName, cb) => emitter.off(eventName, cb)),
        connect: vi.fn((onConnect) => onConnect()),
        destroy: vi.fn(),
        write: vi.fn(() => emitter.emit("data", response)),
      } satisfies ISocket;

      const result = await request({
        socket,
        output,
        method: "POST",
        pathname: "/test",
        headers: {},
      });

      expect(result).toEqual({
        statusCode: 200,
        headers: {
          "CONTENT-LENGTH": `${Buffer.byteLength(responseBody)}`,
          "X-RESPONSE-HEADER": "response-value",
        },
        body: responseBody,
      });
    });

    it("should handle response without body", async () => {
      const emitter = new EventEmitter();

      const response = ["HTTP/1.1 204 No Content", "X-Header: value", ""].join(
        "\r\n",
      );

      const output = {
        log: vi.fn(),
        table: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      } satisfies IOutput;

      const socket = {
        on: vi.fn((eventName, cb) => emitter.on(eventName, cb)),
        off: vi.fn((eventName, cb) => emitter.off(eventName, cb)),
        connect: vi.fn((onConnect) => onConnect()),
        destroy: vi.fn(),
        write: vi.fn(() => emitter.emit("data", response)),
      } satisfies ISocket;

      const result = await request({
        socket,
        output,
        method: "POST",
        pathname: "/test",
        headers: {},
      });

      expect(result.statusCode).toEqual(204);
      expect(result.headers["X-HEADER"]).toEqual("value");
    });

    it("should reject on socket error", async () => {
      const emitter = new EventEmitter();

      const output = {
        log: vi.fn(),
        table: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      } satisfies IOutput;

      const socket = {
        on: vi.fn((eventName, cb) => emitter.on(eventName, cb)),
        off: vi.fn((eventName, cb) => emitter.off(eventName, cb)),
        connect: vi.fn((onConnect) => onConnect()),
        destroy: vi.fn(),
        write: vi.fn(() =>
          emitter.emit("error", new Error("Connection refused")),
        ),
      } satisfies ISocket;

      await expect(
        request({
          socket,
          output,
          method: "POST",
          pathname: "/test",
          headers: {},
        }),
      ).rejects.toThrow("Connection refused");
    });
  });
});
