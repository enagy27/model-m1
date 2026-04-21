# model-m1

Command line tooling and SDK for adjusting settings on the Marantz Model M1.

## Features

This is intended to be a 1:1 swap for the HEOS app settings menu, complete with settings for:

- Sound mode (direct, stereo, virtual)
- Dialogue enhancement
- Night mode
- EQ adjustments
- Digital filters
- Dirac Live filters

Use it to create presets for gaming, home theatre, and music streaming! Or use the SDK to build your own tooling for home automation.

## Installation

Install using npm:

```bash
npm install -g model-m1
```

Or run directly with npx:

```bash
npx model-m1
```

## CLI Usage

### help

Get help for any command:

```bash
model-m1 --help
model-m1 discover --help
model-m1 get-config --help
model-m1 set-config --help
```

### discover

Find Marantz Model M1 devices on your network:

```bash
model-m1 discover
```

Filter by device name or model:

```bash
model-m1 discover --friendlyName "Living Room" --modelName "Model M1"
```

### get-config

Retrieve the current settings from your device:

```bash
# hostname comes from model-m1 discover
model-m1 get-config --hostname 192.168.1.100
```

Or pipe hostname from discover:

```bash
model-m1 discover | model-m1 get-config
```

### set-config

Set individual settings via CLI options:

```bash
model-m1 set-config --hostname 192.168.1.100 --soundMode stereo --bass 2 --treble -1
```

Apply a preset file:

```bash
model-m1 set-config preset.json --hostname 192.168.1.100
```

Pipe hostname from discover:

```bash
model-m1 discover | model-m1 set-config preset.json
```

## SDK Usage

You can also use the SDK programmatically to control your device.

### Basic Example

```ts
import net from "net";
import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";
import { createControlClient, createRenderingControlClient } from "model-m1";
import type { ISocket } from "model-m1";

const port = 60006;
const hostname = "192.168.1.100";
const host = `${hostname}:${port}`;

// Create XML parser/builder
const parser = new XMLParser({ ignoreAttributes: false });
const builder = new XMLBuilder({ ignoreAttributes: false });

// The server will disconnect with each request, so we'll wrap
// the destroy function. Internally this uses the Renewable class
// but I felt that was not worth maintaining as a package export.
// If you would prefer that pattern it may be worth copying into your
// codebase
let currentSocket = new net.Socket();
const socket = {
  connect: (onConnect) => currentSocket.connect(port, hostname, onConnect),
  off: (eventName, cb) => currentSocket.off(eventName, cb),
  on: (eventName, cb) => currentSocket.on(eventName, cb),
  write: (data) => currentSocket.write(data),
  destroy: () => {
    currentSocket.destroy();
    currentSocket = new net.Socket();
  },
} satisfies ISocket;

// Create control client
const controlClient = createControlClient({
  output: console,
  socket,
  host,
  pathname: "/ACT/control",
  build: (data) => builder.build(data),
  parse: (data) => parser.parse(data),
});

// Get audio config
const audioConfig = await controlClient("GetAudioConfig");

// Set audio config (the nesting here comes from XML serialization)
await controlClient("SetAudioConfig", {
  AudioConfig: {
    AudioConfig: {
      soundMode: "STEREO",
      highpass: 80,
      lowpass: 120,
    },
  },
});

// Create rendering control client for volume/EQ
const renderingClient = createRenderingControlClient({
  output: console,
  socket,
  host,
  pathname: "/RenderingControl/control",
  build: (data) => builder.build(data),
  parse: (data) => parser.parse(data),
});

// Get bass level
const bass = await renderingClient("X_GetBass", {
  Channel: "Master",
  InstanceID: 0,
});
```

### Available Control Client Methods

- `GetAudioConfig` / `SetAudioConfig` - Sound mode, crossover, digital filters
- `GetTvConfig` / `SetTvConfig` - TV input, dialogue enhancement, night mode
- `GetLEDConfig` / `SetLEDConfig` - Status LED brightness, touch controls
- `GetLowLatencyConfig` / `SetLowLatencyConfig` - Audio delay settings
- `SetTranscode` - Multi-room audio quality
- `SetVolumeLimit` - Maximum volume limit

### Available Rendering Control Client Methods

- `X_GetBass` / `X_SetBass` - Bass EQ level
- `X_GetTreble` / `X_SetTreble` - Treble EQ level
- `X_GetBalance` / `X_SetBalance` - Left/right balance
- `X_GetSubwoofer` / `X_SetSubwoofer` - Subwoofer level

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Run locally
npx tsx cli.ts <command>
```

## License

[GPL-3.0](LICENSE)
