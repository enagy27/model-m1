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
