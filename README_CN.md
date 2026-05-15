<p align="center">
  <img src="./rimecraft.svg" width="128" height="128" alt="RimeCraft Logo">
</p>

<h1 align="center">RimeCraft</h1>

<p align="center">
  基于 <a href="https://github.com/phaserjs/phaser">Phaser.js</a> 的 AI 对话式游戏创作工具。<br>
  用自然语言描述你的游戏创意，AI 智能体将协作编写、调试并实时预览 Phaser 游戏。
</p>

<img width="2008" height="1256" alt="image" src="https://github.com/user-attachments/assets/c668846f-2af2-45c3-b2a6-a1a3d2ce0c81" />

<img width="955" height="748" alt="image" src="https://github.com/user-attachments/assets/9c642f34-af2c-447b-821f-2c889381bbaa" />

<img width="960" height="750" alt="image" src="https://github.com/user-attachments/assets/c0a6ffb1-1bd8-49ea-b767-00b7dba646a7" />

<img width="957" height="745" alt="image" src="https://github.com/user-attachments/assets/1b5fd326-75fc-4fee-8778-f0d9ce342631" />

<img width="955" height="746" alt="image" src="https://github.com/user-attachments/assets/5ca00f53-c433-48dc-854b-201c0be2440c" />


## 功能特性

- **对话驱动的游戏创作** — 用自然语言描述你的游戏；多智能体引擎编写并迭代代码
- **实时预览** — Phaser 游戏在沙箱 iframe 中编译运行，聊天即见效
- **6 个内置模板** — 无尽跑酷、平台跳跃、太空射击、RPG、解谜益智（2048）、打砖块，另有空白项目模板，素材来自 <a href="https://github.com/channingbreeze/games">channingbreeze/games</a>
- **资源库** — 40+ 内置资源，支持预览、搜索、上传和 AI 生成资源
- **可视化场景编辑器** — 拖拽式场景图编辑器，带属性检查器和自动保存
- **回合级撤销** — 可回滚任意 AI 回合，不丢失上下文
- **可点击选项** — AI 回复中包含可交互的建议选项，点击即可继续
- **自动错误检测** — 运行时错误自动捕获并反馈给 AI 进行自修复
- **RAG 增强 AI** — Phaser 4 官方技能知识库（34 个领域）、API 索引、架构模式、错误修复库和文档指南，提升代码生成质量
- **多供应商 LLM 路由** — 可配置的 LLM 供应商，统一配置管理
- **国际化** — 完整的中文 / 英文 / 日文 UI 和游戏模板本地化
- **聊天记录持久化** — 对话按项目自动保存到 IndexedDB，重新打开时恢复
- **桌面应用** — 基于 Tauri 的原生桌面构建，支持导出
- **OpenAI 兼容 API** — 支持 OpenAI、Claude、DeepSeek、Ollama 及任何兼容供应商

## 项目结构

```
rimecraft/
├── apps/
│   ├── web/          # Next.js Web 应用（主入口）
│   ├── tauri/        # Tauri 桌面应用
│   └── docs/         # 文档
├── packages/
│   ├── core/         # 核心类型、工具和游戏编译器
│   ├── agent-engine/ # AI 多智能体聊天引擎
│   ├── phaser-runtime/ # Phaser.js 运行时桥接
│   ├── ui/           # 共享 UI 组件（Radix UI）
│   └── code-editor/  # Monaco 代码编辑器
```

## 前置要求

- **Node.js** >= 20
- **Bun** >= 1.2
- **Rust 工具链**（仅桌面版需要）

```bash
# Linux & MacOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
winget install Rustlang.Rustup
```

## 快速开始

### Web

```bash
# 安装依赖
bun install

# 启动开发服务器
bun dev:web

# 打开 http://localhost:3000
```

### 桌面版（Tauri）

```bash
# 开发
bun run dev:tauri

# 正式构建
bun run build:tauri
```

## 命令

| 命令              | 说明                     |
| ----------------- | ------------------------ |
| `bun dev`         | 启动所有开发服务器       |
| `bun dev:web`     | 启动 Web 开发服务器      |
| `bun dev:tauri`   | 启动 Tauri 桌面开发      |
| `bun build`       | 构建所有包和应用         |
| `bun build:web`   | 构建 Web 应用            |
| `bun lint`        | 使用 Biome 进行代码检查  |
| `bun lint:fix`    | 自动修复代码检查问题     |
| `bun format`      | 格式化代码               |
| `bun test`        | 运行测试                 |
| `bun clean`       | 清理构建产物             |

## 技术栈

- **Monorepo**: Turborepo + Bun workspaces
- **前端**: React 19 + Next.js 16 + TypeScript 5.8
- **样式**: TailwindCSS 4 + Radix UI
- **状态管理**: Zustand 5
- **游戏引擎**: Phaser 4
- **桌面**: Tauri 2
- **代码检查**: Biome

## AI 智能体配置

通过应用内设置对话框配置 BaseURL / API Key / 模型名称。

支持任何 OpenAI 兼容 API（OpenAI、Claude、DeepSeek、Ollama 等）

<img width="2635" height="1767" alt="image" src="https://github.com/user-attachments/assets/1c9262de-3d1f-42c6-ac4c-ab5af0eb7ee0" />

## 文件存储

RimeCraft 根据运行环境使用不同的存储后端。

### Web（浏览器）

所有数据存储在 **IndexedDB** 中，数据库名称 `rimecraft`（版本 3）。

| 存储区           | 内容                               |
| ---------------- | ---------------------------------- |
| `projects`       | 项目元数据和清单                   |
| `files`          | 源文件（键名格式 `projectId:path`）|
| `assets`         | 二进制资源（图片、音频）           |
| `user_assets`    | 用户上传和 AI 生成的资源           |
| `chat_messages`  | 按项目存储的聊天记录（自动保存）   |

数据按浏览器源隔离，由浏览器自动管理。无需文件系统访问权限。

### Tauri（桌面版）

项目存储在本地文件系统的 OS **应用数据目录**（`appDataDir`）下，标识符 `com.rimecraft.desktop`。

| 平台     | 路径                                                                |
| -------- | ------------------------------------------------------------------- |
| Windows  | `%APPDATA%\com.rimecraft.desktop\projects\`                         |
| macOS    | `~/Library/Application Support/com.rimecraft.desktop/projects/`     |
| Linux    | `~/.config/com.rimecraft.desktop/projects/`（或 `$XDG_CONFIG_HOME`）|

每个项目是一个目录，包含：

```
<project-id>/
├── rimecraft.json       # 元数据 + 清单
├── src/                 # 源文件
└── assets/              # 二进制资源（图片、音频）
```

导出的 `.zip` 文件通过系统文件对话框保存，默认保存到 OS **下载** 目录。

## 许可证

MIT
