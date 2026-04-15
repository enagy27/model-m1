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

## Usage

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
