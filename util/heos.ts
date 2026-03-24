import * as v from "valibot";
import qs from "qs";

type HeosArgs = {
  write(address: string): void;
};

type VolumeStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type HeosCommand = {
    "player/get_players": []
    "player/volume_up": [{
        pid: number;
        step?: VolumeStep;
    }]
    "player/volume_down": [{
        pid: number;
        step?: VolumeStep;
    }]
};

function command({ write }: Pick<HeosArgs, "write">) {
  return function<C extends keyof HeosCommand>(pathname: C, ...args: HeosCommand[C]) {
    const search = args ? qs.stringify(args, { addQueryPrefix: true }) : "";

    write(`heos://${pathname}${search}\r\n`);
  }
}

const responseSchema = v.union([
  v.object({
    heos: v.object({
      command: v.literal("player/get_players"),
      result: v.literal("success"),
      message: v.string(),
    }),
    payload: v.array(
      v.object({
        name: v.string(),
        pid: v.number(),
        model: v.string(),
        version: v.string(),
        ip: v.string(),
        network: v.picklist(["wifi"]),
        lineout: v.number(),
        serial: v.string(),
      }),
    ),
  }),

  v.object({
    heos: v.object({
      command: v.literal("player/volume_up"),
      result: v.literal("success"),
      message: v.string(),
    }),
    payload: v.unknown(),
  }),
]);

type HeosResponse = v.InferOutput<typeof responseSchema>;

function response(data: string): HeosResponse {
  const json = JSON.parse(data);

  return v.parse(responseSchema, json);
}

export function heos(args: HeosArgs) {
  return {
    command: command(args),
    response,
  };
}

export type HeosInstance = ReturnType<typeof heos>;
