import qs from "qs";
import * as v from "valibot";

type HeosArgs = {
  write(address: string): void;
};

type HeosCommand = {
  "player/get_players": [];
  "player/volume_down": [
    {
      pid: number;
      step?: VolumeStep;
    },
  ];
  "player/volume_up": [
    {
      pid: number;
      step?: VolumeStep;
    },
  ];
};

type VolumeStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

function command({ write }: Pick<HeosArgs, "write">) {
  return function <C extends keyof HeosCommand>(
    pathname: C,
    ...args: HeosCommand[C]
  ) {
    const search = args ? qs.stringify(args, { addQueryPrefix: true }) : "";

    write(`heos://${pathname}${search}\r\n`);
  };
}

const responseSchema = v.union([
  v.object({
    heos: v.object({
      command: v.literal("player/get_players"),
      message: v.string(),
      result: v.literal("success"),
    }),
    payload: v.array(
      v.object({
        ip: v.string(),
        lineout: v.number(),
        model: v.string(),
        name: v.string(),
        network: v.picklist(["wifi"]),
        pid: v.number(),
        serial: v.string(),
        version: v.string(),
      }),
    ),
  }),

  v.object({
    heos: v.object({
      command: v.literal("player/volume_up"),
      message: v.string(),
      result: v.literal("success"),
    }),
    payload: v.unknown(),
  }),
]);

export type HeosInstance = ReturnType<typeof heos>;

type HeosResponse = v.InferOutput<typeof responseSchema>;

export function heos(args: HeosArgs) {
  return {
    command: command(args),
    response,
  };
}

function response(data: string): HeosResponse {
  const json = JSON.parse(data);

  return v.parse(responseSchema, json);
}
