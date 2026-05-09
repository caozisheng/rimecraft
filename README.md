<p align="center">
  <img src="./rimecraft.svg" width="128" height="128" alt="RimeCraft Logo">
</p>

<h1 align="center">RimeCraft</h1>

<p align="center">
  An agentic chat-style game craft based on <a href="https://github.com/phaserjs/phaser">Phaser.js</a>.<br>
  Describe your game idea in natural language, and AI agents will collaboratively write, debug, and preview Phaser games in real time.
</p>

<img width="957" height="632" alt="image" src="https://github.com/user-attachments/assets/59615cd3-bedf-4dab-8b25-19c55ecb12a8" />
<img width="1062" height="628" alt="image" src="https://github.com/user-attachments/assets/9396a45a-a977-4679-90f0-0472695b5b51" />


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
