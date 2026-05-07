# RimeCraft

RimeCraft is an agentic chat-style game craft based on [Phaser.js](https://github.com/phaserjs/phaser)

<img width="951" height="825" alt="image" src="https://github.com/user-attachments/assets/5a15f58d-28a4-4f40-9ef3-1a6c4e862a94" />
<img width="1279" height="915" alt="image" src="https://github.com/user-attachments/assets/c795e614-78d8-4b34-9531-4224e071f540" />





## Project Structure

```
rimecraft/
├── apps/
│   ├── web/          # Next.js Web App（main entrance）
│   ├── tauri/        # Tauri desktop
│   └── docs/         # documents
├── packages/
│   ├── core/         # core and tools
│   ├── agent-engine/ # AI Agent multi-agent chat engine
│   ├── phaser-runtime/ # Phaser.js runtime bridge
│   ├── ui/           # Common UI（Radix UI）
│   └── code-editor/  # Monaco code editor
```

## Environment

- **Node.js** >= 20
- **Bun** >= 1.2（Package Manager）
- **Rust tool-chain**（for Tauri desktop dev only）

## Get-started

### Web

```bash
# 1. Install requirements
bun install

# 2. Start Web Dev server
bun dev:web

# Access http://localhost:3000
```

### Desktop

```bash
# Debug
bun run dev:tauri

# Release
bun run build:tauri
```

## Commands

| Commands        | Explain                     |
| --------------- | --------------------------- |
| `bun dev`       | Start Dev server            |
| `bun dev:web`   | Start Web                   |
| `bun dev:tauri` | Start Tauri desktop         |
| `bun build`     | Build all packages and Apps |
| `bun build:web` | Build Web                   |
| `bun lint`      | Code lints（Biome）           |
| `bun lint:fix`  | Auto-fix                    |
| `bun format`    | Code format                 |
| `bun test`      | Test                        |
| `bun clean`     | Clean builds                |

## Contributors

### Technical Stack

- **Build**：Turborepo + Bun workspaces
- **Front-end**：React 19 + Next.js 16 + TypeScript 5.8
- **Style**：TailwindCSS 4 + Radix UI
- **State Manager**：Zustand 5
- **Game Engine**：Phaser 4
- **Code Style**：Biome

### Package Dependants

```
apps/web ──→ @rimecraft/core
         ──→ @rimecraft/agent-engine
         ──→ @rimecraft/phaser-runtime
         ──→ @rimecraft/ui
         ──→ @rimecraft/code-editor
```

### Add New Packages

```bash
mkdir packages/my-package
cd packages/my-package
bun init
```

In `package.json` appends, 

```json
"@rimecraft/my-package": "workspace:*"
```

### AI Agent Config

Set BaseUrl/Key/ModelName via Settings dialog.

Support OpenAI Compatible API（OpenAI / Claude / DeepSeek / Ollama ...）

## License

MIT
