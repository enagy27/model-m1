import * as v from "valibot";

import { upnpRenderingControlService } from "#env.js";

import { createEndpoint } from "./createEndpoint.js";

// NOTE: type inference breaks when trying to move these out to a shared type,
// so we accept the repetition for InstanceID and Channel
type RenderingControlRequest = {
  X_GetBalance: { Channel: "Master"; InstanceID: 0 };
  X_GetBass: { Channel: "Master"; InstanceID: 0 };

  X_GetSubwoofer: { Channel: "Master"; InstanceID: 0 };
  X_GetTreble: { Channel: "Master"; InstanceID: 0 };

  X_SetBalance: { Channel: "Master"; DesiredBalance: number; InstanceID: 0 };
  X_SetBass: { Channel: "Master"; DesiredBass: number; InstanceID: 0 };

  X_SetSubwoofer: { Channel: "Master"; DesiredLevel: number; InstanceID: 0 };
  X_SetTreble: { Channel: "Master"; DesiredTreble: number; InstanceID: 0 };
};

function responseBodySchema<T extends v.ObjectEntries>(entries: T) {
  return v.object({
    "s:Envelope": v.object({
      "s:Body": v.object(entries),
    }),
  });
}

const responseSchemas = {
  X_GetBalance: responseBodySchema({
    "u:X_GetBalanceResponse": v.object({
      CurrentBalance: v.number(),
    }),
  }),

  X_GetBass: responseBodySchema({
    "u:X_GetBassResponse": v.object({
      CurrentBass: v.number(),
    }),
  }),

  X_GetSubwoofer: responseBodySchema({
    "u:X_GetSubwooferResponse": v.object({
      CurrentLevel: v.number(),
    }),
  }),

  X_GetTreble: responseBodySchema({
    "u:X_GetTrebleResponse": v.object({
      CurrentTreble: v.number(),
    }),
  }),

  X_SetBalance: v.unknown(),

  X_SetBass: v.unknown(),

  X_SetSubwoofer: v.unknown(),

  X_SetTreble: v.unknown(),
};

const responses = {
  X_GetBalance: (body: unknown) => v.parse(responseSchemas.X_GetBalance, body),
  X_GetBass: (body: unknown) => v.parse(responseSchemas.X_GetBass, body),

  X_GetSubwoofer: (body: unknown) =>
    v.parse(responseSchemas.X_GetSubwoofer, body),
  X_GetTreble: (body: unknown) => v.parse(responseSchemas.X_GetTreble, body),

  X_SetBalance: (body: unknown) => v.parse(responseSchemas.X_SetBalance, body),
  X_SetBass: (body: unknown) => v.parse(responseSchemas.X_SetBass, body),

  X_SetSubwoofer: (body: unknown) =>
    v.parse(responseSchemas.X_SetSubwoofer, body),
  X_SetTreble: (body: unknown) => v.parse(responseSchemas.X_SetTreble, body),
};

export const createRenderingControlClient = createEndpoint<
  RenderingControlRequest,
  typeof responses
>({
  responses,
  service: upnpRenderingControlService,
});

export type RenderingControlClient = ReturnType<
  typeof createRenderingControlClient
>;
