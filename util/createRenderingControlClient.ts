import * as v from "valibot";

import { createEndpoint } from "./createEndpoint.js";
import { upnpRenderingControlService } from "#env.js";

// NOTE: type inference breaks when trying to move these out to a shared type,
// so we accept the repetition for InstanceID and Channel
type RenderingControlRequest = {
  X_GetSubwoofer: { InstanceID: 0; Channel: "Master" };
  X_SetSubwoofer: { InstanceID: 0; Channel: "Master"; DesiredLevel: number };

  X_GetTreble: { InstanceID: 0; Channel: "Master" };
  X_SetTreble: { InstanceID: 0; Channel: "Master"; DesiredTreble: number };

  X_GetBalance: { InstanceID: 0; Channel: "Master" };
  X_SetBalance: { InstanceID: 0; Channel: "Master"; DesiredBalance: number };

  X_GetBass: { InstanceID: 0; Channel: "Master" };
  X_SetBass: { InstanceID: 0; Channel: "Master"; DesiredBass: number };
};

function responseBodySchema<T extends v.ObjectEntries>(entries: T) {
  return v.object({
    "s:Envelope": v.object({
      "s:Body": v.object(entries),
    }),
  });
}

const responseSchemas = {
  X_GetSubwoofer: responseBodySchema({
    "u:X_GetSubwooferResponse": v.object({
      CurrentLevel: v.number(),
    }),
  }),

  X_SetSubwoofer: v.unknown(),

  X_GetTreble: responseBodySchema({
    "u:X_GetTrebleResponse": v.object({
      CurrentTreble: v.number(),
    }),
  }),

  X_SetTreble: v.unknown(),

  X_GetBalance: responseBodySchema({
    "u:X_GetBalanceResponse": v.object({
      CurrentBalance: v.number(),
    }),
  }),

  X_SetBalance: v.unknown(),

  X_GetBass: responseBodySchema({
    "u:X_GetBassResponse": v.object({
      CurrentBass: v.number(),
    }),
  }),

  X_SetBass: v.unknown(),
};

const responses = {
  X_GetSubwoofer: (body: unknown) =>
    v.parse(responseSchemas.X_GetSubwoofer, body),
  X_SetSubwoofer: (body: unknown) =>
    v.parse(responseSchemas.X_SetSubwoofer, body),

  X_GetTreble: (body: unknown) => v.parse(responseSchemas.X_GetTreble, body),
  X_SetTreble: (body: unknown) => v.parse(responseSchemas.X_SetTreble, body),

  X_GetBalance: (body: unknown) => v.parse(responseSchemas.X_GetBalance, body),
  X_SetBalance: (body: unknown) => v.parse(responseSchemas.X_SetBalance, body),

  X_GetBass: (body: unknown) => v.parse(responseSchemas.X_GetBass, body),
  X_SetBass: (body: unknown) => v.parse(responseSchemas.X_SetBass, body),
};

export const createRenderingControlClient = createEndpoint<
  RenderingControlRequest,
  typeof responses
>({
  service: upnpRenderingControlService,
  responses,
});

export type RenderingControlClient = ReturnType<
  typeof createRenderingControlClient
>;
