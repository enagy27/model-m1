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

export const heosPort = v.parse(
  v.optional(numberAsString, `${1255}`),
  process.env.HEOS_PORT,
);

export const defaultAiosControlPort = v.parse(
  v.optional(numberAsString, `${60006}`),
  process.env.DEFAULT_AIOS_CONTROL_PORT,
);

export const defaultAiosControlPathname = v.parse(
  v.optional(v.string(), "/ACT/control"),
  process.env.DEFAULT_AIOS_CONTROL_PATHNAME,
);

export const outputPiped = v.parse(
  v.boolean(),
  !process.stdout.isTTY,
)

export const inputPiped = v.parse(
  v.boolean(),
  !process.stdin.isTTY,
)
