import * as v from "valibot";
import { XMLParser } from "fast-xml-parser";
import { ensureArray } from "./array.js";

function xmlArray<
  TInput$1 = unknown,
  TOutput$1 = TInput$1,
  TIssue extends v.BaseIssue<unknown> = v.BaseIssue<unknown>,
>(schema: v.GenericSchema<TInput$1, TOutput$1, TIssue>) {
  return v.pipe(
    v.union([schema, v.array(schema)]),
    v.transform((maybeArray) => ensureArray(maybeArray)),
  );
}

const serviceSchema = v.object({
  serviceType: v.string(),
  serviceId: v.string(),
  SCPDURL: v.string(),
  controlURL: v.string(),
  eventSubURL: v.string(),
});

export type Service = v.InferOutput<typeof serviceSchema>;

const deviceSchema = v.object({
  friendlyName: v.string(),
  modelName: v.string(),
  serviceList: v.object({ service: xmlArray(serviceSchema) }),
});

export type Device = v.InferOutput<typeof deviceSchema>;

const aiosDeviceSchema = v.object({
  root: v.object({
    device: v.object({
      friendlyName: v.string(),
      modelName: v.string(),
      deviceList: v.object({ device: xmlArray(deviceSchema) }),
    }),
  }),
});

export type AiosDevice = v.InferOutput<typeof aiosDeviceSchema>;

export async function getAiosDevice(location: string): Promise<AiosDevice> {
  const response = await fetch(location);
  const text = await response.text();

  const parser = new XMLParser();

  return v.parse(aiosDeviceSchema, parser.parse(text));
}
