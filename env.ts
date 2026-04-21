import * as v from "valibot";
import "dotenv/config";

const numberAsString = v.pipe(v.string(), v.transform(Number));

export const upnpAddress = v.parse(
  v.optional(v.string(), "239.255.255.250"),
  process.env.UPNP_ADDRESS,
);

export const upnpPort = v.parse(
  v.optional(numberAsString, `${1900}`),
  process.env.UPNP_PORT,
);

export const upnpService = v.parse(
  v.optional(v.string(), "urn:schemas-denon-com:service:ACT:1"),
  process.env.UPNP_SERVICE,
);

export const upnpRenderingControlService = v.parse(
  v.optional(v.string(), "urn:schemas-upnp-org:service:RenderingControl:1"),
  process.env.UPNP_RENDERING_CONTROL_SERVICE,
);

export const heosPort = v.parse(
  v.optional(numberAsString, `${1255}`),
  process.env.HEOS_PORT,
);

export const defaultActControlPort = v.parse(
  v.optional(numberAsString, `${60006}`),
  process.env.DEFAULT_ACT_CONTROL_PORT,
);

export const defaultActControlUrl = v.parse(
  v.optional(v.string(), "/ACT/control"),
  process.env.DEFAULT_ACT_CONTROL_URL,
);

export const defaultRenderingControlUrl = v.parse(
  v.optional(v.string(), "/upnp/control/renderer_dvc/RenderingControl"),
  process.env.DEFAULT_RENDERING_CONTROL_URL,
);

export const outputPiped = v.parse(v.boolean(), !process.stdout.isTTY);

export const inputPiped = v.parse(v.boolean(), !process.stdin.isTTY);
