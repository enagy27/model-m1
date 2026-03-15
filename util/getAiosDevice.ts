import * as v from "valibot";
import { XMLParser } from "fast-xml-parser";

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
  serviceList: v.object({
    service: v.union([serviceSchema, v.array(serviceSchema)]),
  }),
});

export type Device = v.InferOutput<typeof deviceSchema>;

const aiosDeviceSchema = v.object({
  root: v.object({
    device: v.object({
      friendlyName: v.string(),
      modelName: v.string(),
      deviceList: v.object({
        device: v.union([deviceSchema, v.array(deviceSchema)]),
      }),
    }),
  }),
});

export type AiosDevice = v.InferOutput<typeof aiosDeviceSchema>;

export async function getAiosDevice(location: string) {
  const response = await fetch(location);
  const text = await response.text();

  const parser = new XMLParser();

  return v.parse(aiosDeviceSchema, parser.parse(text));
}
