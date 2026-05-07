# RimeCraft

RimeCraft is an agentic chat-style game craft based on [Phaser.js](https://github.com/phaserjs/phaser). Describe your game idea in natural language, and AI agents will collaboratively write, debug, and preview Phaser games in real time.

<img width="951" height="825" alt="image" src="https://github.com/user-attachments/assets/5a15f58d-28a4-4f40-9ef3-1a6c4e862a94" />
<img width="1279" height="915" alt="image" src="https://github.com/user-attachments/assets/c795e614-78d8-4b34-9531-4224e071f540" />

## Features

- **Chat-driven game creation** — Describe your game in natural language; multi-agent engine writes and iterates on the code
- **Live preview** — Phaser games compile and run in a sandboxed iframe as you chat
- **5 built-in templates** — Endless Runner, Platformer, Space Shooter, RPG, Puzzle (Sokoban), plus a blank starter
- **Asset library** — 40+ built-in assets with preview, search, upload, and AI-generated asset support
- **Turn-level undo** — Roll back any agent turn without losing context
- **Clickable options** — Agent replies include interactive suggestions you can click to continue
- **Auto error detection** — Runtime errors are caught and fed back to the agent for self-repair
- **i18n** — Full Chinese / English UI and game template localization
- **Desktop app** — Tauri-based native desktop build with export support
- **OpenAI-compatible API** — Works with OpenAI, Claude, DeepSeek, Ollama, and any compatible provider

## Project Structure

```
rimecraft/
├── apps/
│   ├── web/          # Next.js Web App (main entrance)
│   ├── tauri/        # Tauri desktop app
│   └── docs/         # Documentation
├── packages/
│   ├── core/         # Core types, tools, and game compiler
│   ├── agent-engine/ # AI multi-agent chat engine
│   ├── phaser-runtime/ # Phaser.js runtime bridge
│   ├── ui/           # Shared UI components (Radix UI)
│   └── code-editor/  # Monaco code editor
```

## Prerequisites

- **Node.js** >= 20
- **Bun** >= 1.2
- **Rust toolchain** (for Tauri desktop only)

## Getting Started

### Web

```bash
# Install dependencies
bun install

# Start dev server
bun dev:web

# Open http://localhost:3000
```

### Desktop (Tauri)

```bash
# Dev
bun run dev:tauri

# Release build
bun run build:tauri
```

## Commands

| Command         | Description                 |
| --------------- | --------------------------- |
| `bun dev`       | Start all dev servers       |
| `bun dev:web`   | Start web dev server        |
| `bun dev:tauri` | Start Tauri desktop dev     |
| `bun build`     | Build all packages and apps |
| `bun build:web` | Build web app               |
| `bun lint`      | Lint with Biome             |
| `bun lint:fix`  | Auto-fix lint issues        |
| `bun format`    | Format code                 |
| `bun test`      | Run tests                   |
| `bun clean`     | Clean build artifacts       |

## Tech Stack

- **Monorepo**: Turborepo + Bun workspaces
- **Frontend**: React 19 + Next.js 16 + TypeScript 5.8
- **Styling**: TailwindCSS 4 + Radix UI
- **State**: Zustand 5
- **Game Engine**: Phaser 4
- **Desktop**: Tauri 2
- **Linting**: Biome

## AI Agent Configuration

Set BaseURL / API Key / Model Name via the in-app Settings dialog.

Supports any OpenAI-compatible API (OpenAI, Claude, DeepSeek, Ollama, etc.)

## License

MIT
