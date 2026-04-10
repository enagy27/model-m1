import * as v from "valibot";

import { createEndpoint } from "./createEndpoint";
import { upnpRenderingControlService } from "../env";

type RenderControlRequest = {
  X_GetSubwoofer: never;
  X_SetSubwoofer: { InstanceID: 0; Channel: "Master"; DesiredLevel: number };

  X_GetBalance: never;
  X_SetBalance: { InstanceID: 0; Channel: "Master"; DesiredBalance: number };
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
    "u:X_GetSubwooferResponse": v.looseObject({
      CurrentLevel: v.number(),
    }),
  }),

  X_SetSubwoofer: v.unknown(),

  X_GetBalance: responseBodySchema({
    "u:X_GetBalanceResponse": v.object({
      CurrentBalance: v.number(),
    }),
  }),

  X_SetBalance: v.unknown(),
};

const responses = {
  X_GetSubwoofer: (body: unknown) =>
    v.parse(responseSchemas.X_GetSubwoofer, body),
  X_SetSubwoofer: (body: unknown) =>
    v.parse(responseSchemas.X_SetSubwoofer, body),

  X_GetBalance: (body: unknown) => v.parse(responseSchemas.X_GetBalance, body),
  X_SetBalance: (body: unknown) => v.parse(responseSchemas.X_SetBalance, body),
};

export const createRenderControlClient = createEndpoint<
  RenderControlRequest,
  typeof responses
>({
  service: upnpRenderingControlService,
  responses,
});
