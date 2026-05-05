# RimeCraft — 青少年 2D 游戏 Agent 对话式开发工具 开发计划

本方案深度参考 RimeCut 项目（`C:\Users\zisheng\Documents\cao\00_code\gitlab\gridflow\tool\rimecut`）的 Monorepo 工程架构、跨平台技术栈与 AI Agent 框架，面向青少年用户群体，打造以 Phaser 4 为核心引擎的 2D 游戏对话式开发工具。用户通过自然语言与 AI Agent 对话，即可完成 2D 游戏的设计、开发、调试与发布，在享受游戏创作乐趣的同时，Agent 大幅降低开发门槛，让零编程基础的青少年也能做出自己的游戏。

---

## 一、产品定位与核心理念

### 目标用户
- **核心用户**：10-18 岁青少年，对游戏充满热情，希望从"玩游戏"进阶到"做游戏"
- **次要用户**：编程教育机构、STEAM 教育从业者、独立游戏爱好者
- **边缘用户**：Game Jam 参赛者、快速原型验证的独立开发者

### 核心理念
| 理念 | 说明 | 对齐 RimeCut |
|------|------|-------------|
| **对话即开发** | 用自然语言描述想法，Agent 自动生成可运行的游戏代码 | 复用 RimeCut 已验证的 AI Agent 多轮对话框架与工具调用机制 |
| **乐趣优先** | 5 分钟内看到第一个可玩的游戏，即时反馈激发创作热情 | 借鉴 RimeCut 的实时预览架构，改造为游戏画面实时渲染 |
| **渐进式学习** | 从对话开发到查看代码、到手动修改，自然过渡到编程学习 | 利用 RimeCut 的 Command 模式支持无限撤销，鼓励大胆尝试 |
| **隐私安全** | 游戏项目完全存储在本地，支持全离线开发 | 对齐 RimeCut「Your videos stay on your device」的隐私理念 |

### 为什么基于 RimeCut 而非 OpenCut
RimeCut 相比 OpenCut 具有显著更高的完成度（约 75% vs OpenCut 早期阶段），具备以下可直接复用的成熟能力：
- **Monorepo 工程架构**：Turborepo + Bun workspace 已验证，428+ commits 持续迭代
- **跨平台框架**：Tauri 2.x 已实现 Web / Desktop / Android 三端运行
- **AI Agent 框架**：多轮对话 + 角色切换 + 19 个工具调用 + Undo 集成，已完成 70%
- **状态管理**：15+ Zustand Store 管理复杂编辑器状态的模式已验证
- **Command 模式**：50+ Command 实现的 Undo/Redo 体系可直接迁移
- **Manager 架构**：13 个 Manager 单例管理核心编辑器能力的分层设计成熟可靠

---

## 二、核心游戏引擎选型

聚焦 2D 网页游戏开发，Phaser 4 为唯一主力引擎，不做 3D 引擎支持，保持产品聚焦。

### 为什么选 Phaser 4

| 维度 | Phaser 4 优势 | 对青少年的价值 |
|------|----------------|---------------|
| **成熟度** | 基于 Phaser 3 十年积累的全新重写版，MIT 协议，GitHub 37k+ Stars | 引擎稳定可靠，全新 WebGL 渲染管线性能更强 |
| **开箱即用** | 内置场景管理、物理引擎（Arcade/Matter.js）、动画系统、粒子系统、音频管理、输入处理 | Agent 调用标准 API 即可实现丰富游戏效果，无需拼装第三方库 |
| **示例丰富** | 官方提供 1700+ 可运行示例，覆盖所有 2D 游戏类型 | 完美适配 RAG 知识库，Agent 代码生成准确率极高 |
| **TypeScript 原生** | Phaser 4 使用 TypeScript 从零重写，类型系统一等公民 | Agent 生成的代码享有完整类型推导，编译期发现错误 |
| **Web 原生** | Canvas/WebGL 渲染，浏览器直接运行 | Tauri 打包后桌面端性能无损耗，Web 端即开即用 |
| **React 兼容** | 官方支持 React 等 40+ 前端框架集成 | 与项目 React 技术栈 100% 匹配 |
| **学习价值** | 全球游戏教育领域使用最广泛的 2D 引擎 | 青少年学到的 Phaser.js 技能可直接用于后续学习和竞赛 |

### 不选的引擎及原因
- **PixiJS**：纯渲染引擎，缺少游戏逻辑支撑，需大量第三方库拼装，Agent 生成复杂度高
- **Cocos Creator**：过重，有独立 IDE，与本项目 Agent 对话式开发理念冲突
- **Hex Engine**：生态不成熟，示例少，RAG 知识库难以构建

---

## 三、整体技术栈选型

深度对齐 RimeCut 已验证的技术栈，最大化代码与架构复用，同时适配 Phaser.js 游戏开发场景。

| 技术领域 | 选型方案 | 复用自 RimeCut | 适配说明 |
|----------|----------|---------------|----------|
| 包管理 | **Bun** | ✅ 完全一致 | 高性能，Monorepo 依赖管理 |
| Monorepo | **Turborepo** | ✅ 完全一致 | 多应用多包统一构建 |
| 前端框架 | **React 19 + TypeScript 5.8** | ✅ 完全一致 | 编辑器 UI 与交互层 |
| 跨端框架 | **Tauri 2.x** | ✅ 完全一致 | Web + Desktop + Mobile |
| UI 组件 | **Radix UI + TailwindCSS 4** | ✅ 完全一致 | 青少年友好的活力 UI 风格 |
| 状态管理 | **Zustand 5** | ✅ 完全一致 | 游戏状态 + 编辑器状态 + 对话上下文 |
| 游戏引擎 | **Phaser 4.1** | 🆕 新增 | 2D 游戏开发核心引擎，全新 WebGL 渲染管线，与 GitHub 主线一致 |
| AI Agent | **LLM Tool Calling + 多角色 Agent** | ✅ 复用框架 | 复用 RimeCut 的 Agent 架构，替换为游戏开发工具集 |
| 代码编辑 | **Monaco Editor** | 🆕 新增 | 代码查看与编辑，渐进式学习 |
| 代码质量 | **Biome** | ✅ 完全一致 | 沿用 RimeCut biome.jsonc 规范 |
| 热更新 | **ESBuild + iframe 沙箱** | 🔄 改造 | 改造 RimeCut 预览架构为游戏沙箱 |
| 数据存储 | **IndexedDB + OPFS (本地优先) + PostgreSQL + S3 (云端可选)** | ✅ 复用模式 | 本地优先，RimeCut 已验证的 IndexedDB 方案；云端同步用 PostgreSQL（Drizzle ORM）+ S3 兼容对象存储（Cloudflare R2） |
| 认证 | **better-auth** | ✅ 完全一致 | Web 端用户系统，支持项目云同步与发布 |
| 项目共享 | **StorageProvider 抽象 + Fork 模型** | 🆕 新建 | 统一存储接口支撑多平台，Fork 原语支撑跨用户协作 |
| 实时协同（远期） | **Yjs (CRDT) + y-monaco** | 🆕 预留 | CRDT 天然支持离线编辑+重连合并，与 Monaco Editor 官方集成 |
| 游戏托管 | **Cloudflare Pages + R2 CDN** | 🆕 新建 | 免费层足够早期使用，全球 CDN 加速游戏访问 |

---

## 四、项目架构与目录结构

1:1 参考 RimeCut 的 Monorepo 分层设计，替换视频编辑模块为游戏开发模块。

```
rimecraft/
├── apps/                              # 应用入口层（同 RimeCut 架构）
│   ├── web/                           # Web 端应用（Next.js）
│   │   ├── src/
│   │   │   ├── app/                   # Next.js 路由与布局
│   │   │   ├── components/            # React 组件（编辑器面板、对话界面、预览窗口）
│   │   │   ├── core/                  # EditorCore 核心管理层（参考 RimeCut 13 Manager 模式）
│   │   │   │   ├── editor-core.ts     # 单例入口，统一管理所有 Manager
│   │   │   │   ├── project-manager.ts # 项目生命周期管理
│   │   │   │   ├── scene-manager.ts   # Phaser 场景管理
│   │   │   │   ├── agent-manager.ts   # AI Agent 调度与上下文管理
│   │   │   │   ├── preview-manager.ts # 游戏预览与沙箱管理
│   │   │   │   ├── asset-manager.ts   # 游戏素材管理
│   │   │   │   ├── command-manager.ts # Undo/Redo 命令管理（复用 RimeCut 模式）
│   │   │   │   ├── code-manager.ts    # 代码生成与同步管理
│   │   │   │   ├── storage-manager.ts # StorageProvider 调度（本地/云端切换）
│   │   │   │   ├── publish-manager.ts # 游戏构建与发布管理
│   │   │   │   └── template-manager.ts# 游戏模板管理
│   │   │   ├── lib/                   # 业务逻辑层
│   │   │   │   ├── commands/          # Command 实现（参考 RimeCut 50+ Commands）
│   │   │   │   ├── ai/               # AI Agent 框架（复用 RimeCut Agent 架构）
│   │   │   │   │   ├── agents/        # 多角色 Agent 定义
│   │   │   │   │   ├── tools/         # Agent 可调用的游戏开发工具
│   │   │   │   │   └── rag/           # Phaser.js 知识库与检索
│   │   │   │   ├── phaser/            # Phaser.js 引擎封装与标准化 API
│   │   │   │   ├── templates/         # 游戏模板定义与生成
│   │   │   │   ├── assets/            # 素材处理与管理逻辑
│   │   │   │   ├── storage/           # StorageProvider 接口与多平台实现
│   │   │   │   │   ├── types.ts       # StorageProvider 接口定义
│   │   │   │   │   ├── tauri.ts       # TauriStorageProvider（桌面端磁盘）
│   │   │   │   │   ├── indexeddb.ts   # IndexedDBStorageProvider（浏览器离线）
│   │   │   │   │   └── cloud.ts       # CloudStorageProvider（云端同步）
│   │   │   │   ├── publish/           # 游戏构建与发布管线
│   │   │   │   └── export/            # 游戏导出与打包
│   │   │   ├── stores/                # Zustand 状态仓库（参考 RimeCut 15+ Stores）
│   │   │   │   ├── project-store.ts   # 项目状态
│   │   │   │   ├── editor-store.ts    # 编辑器 UI 状态
│   │   │   │   ├── chat-store.ts      # 对话历史与上下文
│   │   │   │   ├── game-store.ts      # 游戏运行时状态
│   │   │   │   ├── asset-store.ts     # 素材库状态
│   │   │   │   ├── publish-store.ts   # 发布状态与历史
│   │   │   │   └── user-store.ts      # 用户登录态与云同步状态
│   │   │   └── services/              # 服务层（预览渲染、缓存、存储）
│   │   └── package.json
│   │
│   ├── tauri/                         # Tauri 桌面端应用（同 RimeCut 架构）
│   │   ├── src-tauri/                 # Rust Tauri 后端
│   │   └── src/                       # Vite 前端（共享 web 组件）
│   │
│   └── docs/                          # 用户文档与教程站点
│
├── packages/                          # 公共能力包（同 RimeCut 架构）
│   ├── core/                          # 核心类型、工具函数、全局常量
│   ├── ui/                            # 公共 UI 组件库（青少年友好风格）
│   ├── phaser-runtime/                # Phaser.js 运行时封装与标准化 API
│   ├── agent-engine/                  # Agent 对话核心（复用 RimeCut AI 框架）
│   └── code-editor/                   # Monaco Editor 封装
│
├── resources/                         # 静态资源
│   ├── templates/                     # 游戏模板项目文件
│   ├── assets/                        # 内置免费素材库
│   └── rag-knowledge/                 # Phaser.js RAG 知识库数据
│
├── .github/                           # GitHub Actions CI/CD
├── .husky/                            # Git Hooks（同 RimeCut）
├── biome.jsonc                        # Biome 配置（同 RimeCut）
├── turbo.json                         # Turborepo 配置（同 RimeCut）
├── package.json                       # Bun workspace 根配置
├── tsconfig.json
├── docker-compose.yaml                # 可选：数据库服务
├── LICENSE                            # MIT
└── README.md
```

---

## 五、核心功能模块设计

围绕青少年用户「想到 → 说出来 → 看到 → 玩到 → 分享」的创作闭环设计。

### 1. 对话式 Agent 交互模块（核心入口）

这是 RimeCraft 与传统游戏引擎的根本区别——用户的主要交互方式是对话，而非编程。

- **沉浸式对话界面**：左侧全屏对话栏，类似 ChatGPT 的友好体验，支持文字、图片（角色草图、参考截图）输入
- **智能引导对话**：面对新用户，Agent 主动引导「你想做什么类型的游戏？」→「主角是什么？」→「有什么特殊玩法？」，降低描述需求的门槛
- **实时代码预览**：Agent 每次生成/修改代码后，右侧游戏预览窗口自动刷新，用户即时看到效果
- **对话历史与分支**：支持回到之前的对话节点重新修改需求，类似 RimeCut 的 Undo/Redo 但作用于整个对话流
- **双向代码同步**：复用 RimeCut 的 Agent-Editor 同步机制，对话生成的代码同步到编辑器，手动修改也反馈到 Agent 上下文
- **自动错误修复**：游戏运行报错自动捕获，Agent 分析并修复，用户无感知（复用 RimeCut Agent 的 Undo 检查点机制）
- **青少年友好语言**：Agent 回复使用通俗易懂的语言，避免专业术语，必要时用类比解释

### 2. 游戏预览与运行时模块

- **Phaser.js 标准化封装**：对 Phaser.js 进行二次封装，提供 Agent 友好的标准化 API，统一场景管理、资源加载、物理碰撞、动画播放等规范
- **iframe 安全沙箱**：游戏在独立 iframe 中运行，ESBuild 实时编译，代码修改后毫秒级热更新（参考 RimeCut 预览架构改造）
- **游戏控制面板**：预览窗口上方提供播放/暂停/重启/全屏按钮，FPS 显示，以及简单的游戏调试工具
- **多场景切换**：支持游戏内多场景（菜单 → 关卡 → 结算）的快速切换预览
- **触控模拟**：桌面端可模拟手机触控操作，方便预览移动端游戏体验

### 3. 项目与素材管理模块

- **一键创建**：从内置模板一键创建游戏项目，5 分钟内开始创作
- **可视化文件树**：类 VS Code 文件浏览（简化版），帮助青少年理解项目结构
- **素材库**：内置分类齐全的免费可商用素材（角色、场景、UI、音效、背景音乐），支持搜索和一键引用
- **素材上传**：支持上传自己绘制的角色、拍摄的照片等自定义素材
- **项目版本**：基于 Command 模式的本地版本管理（比 Git 更简单），支持回到任何历史状态

### 4. 代码编辑器模块（渐进式学习）

- **默认隐藏**：初始界面不显示代码编辑器，纯对话模式，不吓到初学者
- **渐进展开**：用户好奇时可展开代码面板，查看 Agent 生成的代码，理解「我的话变成了什么」
- **只读→可编辑**：初学者模式下代码只读+高亮标注，进阶后切换为可编辑模式
- **代码注释**：Agent 生成代码时自动添加中文注释，帮助理解代码逻辑
- **基于 Monaco Editor**：全量 TypeScript 支持，语法高亮、智能补全、错误提示

### 5. 游戏模板库

内置丰富的 2D 游戏模板，覆盖青少年最感兴趣的游戏类型：

| 模板类型 | 内置游戏 | 学习价值 |
|----------|---------|----------|
| 平台跳跃 | 超级马里奥风格横版跳跃 | 物理引擎、碰撞检测、关卡设计 |
| 射击闪避 | 太空射击、弹幕游戏 | 对象池、粒子系统、难度曲线 |
| RPG 冒险 | 像素风 RPG、地图探索 | 瓦片地图、NPC 对话、任务系统 |
| 解谜益智 | 推箱子、消除、连连看 | 算法逻辑、状态管理 |
| 休闲跑酷 | 无尽跑酷、障碍闪避 | 程序化生成、分数系统 |
| 格斗对战 | 简单格斗、回合制对战 | 状态机、动画系统 |
| 创意实验 | 空白画布 + 物理沙盒 | 自由探索、物理模拟 |

### 6. 导出与分享模块

- **Web 一键发布**：导出静态 HTML 包，可直接通过链接分享给朋友
- **桌面端打包**：通过 Tauri 打包为 .exe / .app 桌面游戏
- **二维码分享**：生成游戏链接二维码，手机扫码即玩
- **社区展示**：上传到 RimeCraft 社区，展示作品、获得点赞（后期功能）
- **itch.io 发布**：一键发布到全球最大的独立游戏平台

---

## 六、项目存储与协作架构

本章定义游戏项目在不同平台上的存储方式、跨用户共享的核心数据模型，以及面向未来多用户共创的扩展路径。架构设计原则：**本地优先、文件即项目、天然可共享**。

### 1. 项目文件格式：`.rimecraft` 工程包

所有平台统一使用相同的项目数据模型，一个 RimeCraft 项目本质上是一个标准目录结构：

```
my-dino-runner/                        # 项目根目录
├── rimecraft.json                     # 项目清单（唯一标识、元信息、版本）
├── src/                               # 游戏源代码
│   ├── main.ts                        # Phaser 入口文件
│   ├── scenes/                        # 场景文件（每个场景一个 .ts）
│   │   ├── menu-scene.ts
│   │   ├── game-scene.ts
│   │   └── gameover-scene.ts
│   ├── objects/                       # 游戏对象（角色、道具、敌人等）
│   │   ├── player.ts
│   │   └── obstacle.ts
│   └── config/                        # 游戏配置（数值、关卡、难度等）
│       └── game-config.ts
├── assets/                            # 素材资源
│   ├── images/                        # 图片、精灵图
│   ├── audio/                         # 音效、背景音乐
│   ├── tilemaps/                      # 瓦片地图
│   └── fonts/                         # 字体
├── .chat/                             # Agent 对话历史（可选同步）
│   └── history.json                   # 对话记录，支持恢复上下文
└── dist/                              # 构建产物（不纳入版本管理）
```

**`rimecraft.json` 核心字段：**

```jsonc
{
  "id": "proj_a1b2c3d4",               // 全局唯一 ID（UUID v7，含时间戳）
  "name": "我的恐龙跑酷",
  "version": "0.1.0",
  "engine": "phaser@4.1",
  "template": "endless-runner",         // 来源模板（可选）
  "author": {
    "uid": "user_x1y2z3",              // 创作者 ID
    "name": "小明"
  },
  "forkedFrom": null,                  // Fork 来源项目 ID（协作追溯链）
  "createdAt": "2026-05-05T10:00:00Z",
  "updatedAt": "2026-05-05T12:30:00Z",
  "thumbnail": "assets/images/thumbnail.png",
  "tags": ["跑酷", "恐龙", "休闲"],
  "visibility": "private",             // private | unlisted | public
  "collaborators": []                  // 协作者列表（预留字段）
}
```

**关键设计决策**：
- `id` 使用 UUID v7（时间有序），天然支持分布式生成，不依赖中心服务器分配
- `forkedFrom` 建立项目间的血缘关系，为后续的 Fork/Merge 协作奠定基础
- `collaborators` 预留多用户协作字段，MVP 阶段为空数组
- `.chat/` 目录存储对话上下文，项目转移时 Agent 可恢复历史对话继续创作

### 2. 分平台存储策略

| 平台 | 存储位置 | 特点 |
|------|---------|------|
| **Desktop（Tauri）** | 本地磁盘文件系统 | 用户首次启动选择工作空间目录（默认 `~/RimeCraft/projects/`），后续项目自动创建在此目录下。Tauri fs API 直接读写，无大小限制，支持任意数量的素材文件 |
| **Web 端（浏览器）** | IndexedDB + OPFS | 项目元信息和代码文件存 IndexedDB，大型素材文件存 Origin Private File System（OPFS，现代浏览器支持），单项目上限约 1GB，足够 2D 游戏需求 |
| **Web 端（云同步）** | PostgreSQL + S3 对象存储 | 可选功能。代码文件存 PostgreSQL（Drizzle ORM），素材存 S3 兼容对象存储（Cloudflare R2 / MinIO）。登录后自动云同步，支持跨设备、跨浏览器访问 |

**Desktop ↔ Web 互通**：
- Desktop 端可将项目打包为 `.rimecraft.zip`，通过文件导入到 Web 端
- Web 端可将项目下载为 `.rimecraft.zip`，在 Desktop 端解压打开
- 云同步开启后，两端通过用户账户自动同步（后期功能）

### 3. 跨用户共享机制

这是多用户协作的核心基础。不同阶段提供递进式的共享能力：

#### 阶段一：离线共享（MVP）

最简单直接的共享方式，不依赖任何服务端：

```
用户 A 创作完成
    │
    ├─→ 「导出项目」→ 生成 .rimecraft.zip（含代码 + 素材 + 对话历史）
    │
    ├─→ 通过微信 / QQ / 邮件 / U盘 发送给用户 B
    │
    └─→ 用户 B 「导入项目」→ 本地打开，继续编辑
        （自动生成新的 project id，forkedFrom 指向原项目）
```

#### 阶段二：云端项目仓库（V1）

引入轻量级项目托管服务，类似 GitHub 但极度简化，面向青少年零门槛使用：

```
┌─────────────────────────────────────────────────────┐
│                  RimeCraft Cloud                     │
│                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌───────────┐ │
│  │ 项目仓库     │   │ 用户系统     │   │ 素材 CDN  │ │
│  │ (PostgreSQL) │   │ (better-auth)│   │ (R2/S3)   │ │
│  └──────┬──────┘   └──────┬──────┘   └─────┬─────┘ │
│         │                 │                 │       │
└─────────┼─────────────────┼─────────────────┼───────┘
          │                 │                 │
    ┌─────▼─────────────────▼─────────────────▼─────┐
    │              REST API / tRPC                    │
    └─────┬──────────────────────────────────┬──────┘
          │                                  │
    ┌─────▼─────┐                      ┌─────▼─────┐
    │ Desktop   │                      │   Web     │
    │ (Tauri)   │                      │ (Next.js) │
    └───────────┘                      └───────────┘
```

**核心 API：**

| 操作 | 端点 | 说明 |
|------|------|------|
| 发布项目 | `POST /api/projects/publish` | 将本地项目上传到云端，生成唯一链接 |
| 浏览项目 | `GET /api/projects?tag=跑酷` | 按标签、热度、最新浏览公开项目 |
| Fork 项目 | `POST /api/projects/:id/fork` | 复制一份到自己账户下，建立 forkedFrom 关联 |
| 查看项目 | `GET /api/projects/:id` | 获取项目元信息与文件列表 |
| 下载项目 | `GET /api/projects/:id/download` | 下载 .rimecraft.zip |

**Fork 模型（核心协作原语）**：

```
原始项目 (author: 小明)
    │
    ├─→ Fork by 小红 → 独立副本，可自由修改
    │       │
    │       └─→ Fork by 小刚 → 二次 Fork，血缘链完整保留
    │
    └─→ Fork by 小李 → 独立副本
```

- 每次 Fork 生成新的 project id，`forkedFrom` 记录来源
- Fork 后完全独立，修改不影响原项目
- 项目详情页显示「Fork 自 xxx」，建立社区归属感
- 后续可扩展：「合并请求」——向原作者提交修改建议（类似 PR，但极度简化）

#### 阶段三：课堂协作模式（V2）

面向编程教育场景，在 Fork 模型上构建教学工作流：

```
老师视角：
┌──────────────────────────────────────────────────┐
│  课堂管理面板                                      │
│                                                    │
│  课程：「第一课：制作跑酷游戏」                       │
│  模板项目：my-first-runner (by 张老师)               │
│                                                    │
│  学生进度：                                         │
│  ┌────────┬──────────┬──────────┬───────┐          │
│  │ 学生    │ 状态      │ 最后修改  │ 操作  │          │
│  ├────────┼──────────┼──────────┼───────┤          │
│  │ 小明    │ 🟢 完成   │ 10:35    │ 查看  │          │
│  │ 小红    │ 🟡 进行中 │ 10:42    │ 查看  │          │
│  │ 小李    │ 🔴 未开始 │ -        │ 提醒  │          │
│  └────────┴──────────┴──────────┴───────┘          │
│                                                    │
│  [查看全部作品]  [导出成绩]  [点评打分]              │
└──────────────────────────────────────────────────┘
```

**工作流**：
1. 老师创建课堂 → 分享课堂邀请码
2. 学生加入课堂 → 自动 Fork 老师的模板项目
3. 学生独立创作 → 老师实时查看每个学生的项目快照
4. 老师点评打分 → 评语同步到学生项目页面
5. 优秀作品展示 → 课堂内作品墙

**数据模型扩展**：

```jsonc
// classroom 表
{
  "id": "class_abc",
  "name": "五年级编程课 - 第一课",
  "teacherUid": "user_teacher",
  "templateProjectId": "proj_template",
  "inviteCode": "ABC123",            // 6 位邀请码
  "students": [
    { "uid": "user_xiaoming", "projectId": "proj_fork1", "status": "completed" },
    { "uid": "user_xiaohong", "projectId": "proj_fork2", "status": "in_progress" }
  ]
}
```

#### 阶段四：实时共创（V3，远期方向）

多人同时编辑同一个游戏项目，适合小组合作和 Game Jam 场景。

**技术方案：Yjs（CRDT）+ WebSocket**

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ 用户 A    │    │ 用户 B    │    │ 用户 C    │
│ (编辑代码) │    │ (对话Agent)│    │ (调整素材) │
└─────┬────┘    └─────┬────┘    └─────┬────┘
      │               │               │
      └───────────────┼───────────────┘
                      │
              ┌───────▼───────┐
              │  Yjs CRDT      │
              │  同步服务器     │
              │  (WebSocket)   │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │  共享文档状态   │
              │  - 代码文件     │
              │  - 场景配置     │
              │  - 素材引用     │
              └───────────────┘
```

**为什么选 Yjs/CRDT 而非 OT**：
- CRDT 天然支持离线编辑 + 重连合并，与「本地优先」理念一致
- Yjs 是前端领域最成熟的 CRDT 库，与 Monaco Editor 有官方集成（y-monaco）
- 不依赖中心服务器做冲突仲裁，P2P 模式下也能工作

**需要解决的关键问题**：
- **文件级冲突**：Yjs 管理代码文件的文本协同（字符级 CRDT），避免覆盖
- **Agent 操作冲突**：多人同时使用 Agent 修改同一文件时，需要操作队列或文件级锁
- **实时预览同步**：多人看到的游戏预览应为同一份最新代码的渲染结果
- **权限划分**：项目 Owner 可设置协作者的权限（编辑 / 只读 / 仅对话）

**MVP 阶段不实现实时共创**，但架构设计需要预留：
- 代码文件以纯文本存储（而非二进制格式），Yjs 可直接接管
- 所有状态修改通过 Command 模式执行，Command 天然可序列化为操作日志，便于同步
- `rimecraft.json` 中的 `collaborators` 字段已预留

### 4. 存储层抽象（支撑多平台 + 多用户）

为了让上层业务逻辑不关心具体存储实现，抽象统一的 `StorageProvider` 接口：

```typescript
interface StorageProvider {
  // 项目 CRUD
  createProject(meta: ProjectMeta): Promise<Project>
  openProject(id: string): Promise<Project>
  saveProject(project: Project): Promise<void>
  deleteProject(id: string): Promise<void>
  listProjects(): Promise<ProjectMeta[]>

  // 文件操作
  readFile(projectId: string, path: string): Promise<string>
  writeFile(projectId: string, path: string, content: string): Promise<void>
  deleteFile(projectId: string, path: string): Promise<void>
  listFiles(projectId: string): Promise<FileEntry[]>

  // 素材操作
  readAsset(projectId: string, path: string): Promise<Blob>
  writeAsset(projectId: string, path: string, blob: Blob): Promise<void>

  // 导入导出
  exportProject(id: string): Promise<Blob>          // → .rimecraft.zip
  importProject(blob: Blob): Promise<Project>        // ← .rimecraft.zip
}
```

**平台实现**：

| Provider | 平台 | 底层实现 |
|----------|------|---------|
| `TauriStorageProvider` | Desktop | Tauri fs API → 磁盘文件系统 |
| `IndexedDBStorageProvider` | Web (离线) | IndexedDB + OPFS |
| `CloudStorageProvider` | Web (在线) | REST API → PostgreSQL + S3 |

上层的 `ProjectManager`、`AssetManager`、Agent 工具等统一通过 `StorageProvider` 接口操作，切换平台或存储后端时无需修改业务逻辑。

---

## 七、发布流程详细设计

用户完成游戏创作后，「让别人玩到」是最强的正反馈。发布流程必须做到：**一键触达、零配置、即刻可玩**。

### 1. 发布入口与流程

```
用户点击顶部工具栏「发布」按钮
        │
        ▼
┌───────────────────────────────────────┐
│  发布向导（弹窗）                       │
│                                       │
│  游戏名称：[我的恐龙跑酷]              │
│  封面图：  [自动截取 / 手动上传]        │
│  简介：    [Agent 自动生成 / 手动填写]  │
│  标签：    [跑酷] [恐龙] [休闲]         │
│                                       │
│  ─── 发布方式 ──────────────────────   │
│                                       │
│  🌐 在线发布（推荐）                    │
│     → 生成游戏链接 + 二维码             │
│     → 任何人通过浏览器即可游玩           │
│                                       │
│  📦 下载游戏包                          │
│     → Web 包（.zip）                   │
│     → 桌面安装包（.exe / .dmg）         │
│                                       │
│  🏪 发布到平台                          │
│     → itch.io                          │
│     → 更多平台（即将支持）              │
│                                       │
│         [取消]    [发布]               │
└───────────────────────────────────────┘
```

### 2. 在线发布（核心路径）

这是青少年用户最常用的发布方式——生成一个链接，发给朋友就能玩。

**构建流程**：

```
用户项目源码                    构建管线                      部署目标
┌──────────┐    ┌─────────────────────────────┐    ┌───────────────────┐
│ src/*.ts  │───→│ 1. TypeScript 编译检查       │    │  静态文件托管       │
│ assets/*  │    │ 2. ESBuild 打包（tree-shake）│───→│  (Cloudflare Pages │
│ config/*  │    │ 3. 素材压缩（tinypng/ffmpeg）│    │   / Vercel Edge)   │
└──────────┘    │ 4. 生成 index.html 入口      │    └────────┬──────────┘
                │ 5. 内联 Phaser.js runtime    │             │
                └─────────────────────────────┘             │
                                                            ▼
                                                  play.rimecraft.com/g/{id}
                                                  ┌──────────────────────┐
                                                  │ 纯静态页面，零后端    │
                                                  │ 全球 CDN 加速         │
                                                  │ 手机浏览器直接打开     │
                                                  └──────────────────────┘
```

**产物结构**（用户无感知，自动构建）：

```
dist/
├── index.html              # 单页入口，内联所有依赖
├── game.bundle.js          # ESBuild 打包后的游戏逻辑（含 Phaser.js）
├── assets/                 # 压缩后的素材资源
│   ├── images/
│   └── audio/
└── manifest.json           # 游戏元信息（标题、描述、图标）
```

**发布后返回**：
- 游戏链接：`play.rimecraft.com/g/abc123`
- 二维码图片（PNG，可保存到相册分享）
- 嵌入代码（iframe，可嵌入博客/论坛）

**访问控制**：

| 可见性 | 说明 |
|--------|------|
| `public` | 出现在社区广场，任何人可浏览和游玩 |
| `unlisted` | 默认值。有链接即可访问，不出现在广场（适合分享给朋友） |
| `private` | 仅自己和指定协作者可访问 |

### 3. 本地导出

不依赖任何在线服务，完全离线可用。

**Web 包导出（.zip）**：
- 产物同在线发布的 `dist/` 目录
- 打包为 `.zip` 下载到本地
- 用户可自行用任意 HTTP 服务器部署（`npx serve dist`、GitHub Pages、学校服务器等）
- 包内附带 `README.txt`，用最简单的语言说明如何运行

**桌面安装包导出**：
- 调用 Tauri 构建管线，将游戏包装为原生桌面应用
- 生成 `.exe`（Windows）/ `.dmg`（macOS）/ `.AppImage`（Linux）
- 双击即运行，无需安装浏览器或任何依赖
- 适合课堂成果展示、线下分享

### 4. 平台发布

**itch.io 集成**（V1）：
1. 用户在设置中绑定 itch.io API Key（一次性操作）
2. 点击「发布到 itch.io」→ 自动构建 Web 包 → 通过 itch.io Butler CLI 上传
3. 首次发布自动创建 itch.io 游戏页面，后续发布自动更新版本
4. 发布完成后返回 itch.io 游戏页面链接

**微信小游戏（V2，远期）**：
- 需要适配微信小游戏的运行时环境（wx API 替换浏览器 API）
- Phaser.js 官方支持微信小游戏适配器
- 构建为微信小游戏包，通过微信开发者工具上传

### 5. 发布后管理

用户发布的游戏不是一次性的，需要支持持续迭代：

| 功能 | 说明 |
|------|------|
| **版本更新** | 修改游戏后重新发布，链接不变，自动更新到最新版本 |
| **访问统计** | 显示游玩次数、访问来源、设备类型（简单版 Analytics） |
| **评论反馈** | 玩家可在游戏页面留言（需登录，防止不良内容） |
| **下架/删除** | 随时可将游戏设为私密或完全删除 |
| **版本回滚** | 保留最近 5 个发布版本，可一键回滚到历史版本 |

### 6. 发布服务架构

```
┌───────────────────────────────────────────────────────────┐
│                    RimeCraft Publish Service               │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Build Worker  │  │ Asset CDN    │  │ Game Hosting │    │
│  │ (构建队列)    │  │ (素材分发)    │  │ (游戏托管)   │    │
│  │              │  │              │  │              │    │
│  │ - TS 编译    │  │ Cloudflare   │  │ Cloudflare   │    │
│  │ - ESBuild    │  │ R2 + CDN     │  │ Pages        │    │
│  │ - 素材压缩   │  │              │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │            │
│         └─────────────────┼─────────────────┘            │
│                           │                              │
│                   ┌───────▼───────┐                      │
│                   │ Publish API    │                      │
│                   │ (REST / tRPC)  │                      │
│                   └───────┬───────┘                      │
│                           │                              │
└───────────────────────────┼──────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │ play.rimecraft │
                    │ .com/g/{id}   │
                    └───────────────┘
```

**成本控制**：
- Cloudflare Pages 免费层支持每月 500 次构建、无限带宽，足够早期使用
- Cloudflare R2 免费层 10GB 存储 + 每月 1000 万次读取，覆盖大量 2D 游戏素材
- 单个 2D 游戏包通常 1-10MB，千级用户量下存储成本极低
- 超出免费层后按需扩展，Cloudflare 计费远低于 AWS/GCP

---

## 八、AI Agent 系统设计（RimeCut Agent × Phaser.js 融合方案）

本章是 RimeCraft 的核心竞争力所在。方案完整复用 RimeCut 已验证的 Agent 基础设施（工具注册、流式对话、角色切换、Director 编排、Undo 检查点、模糊 ID 解析、LLM 后端抽象），同时深度对接 Phaser 4 的全量子系统（Scene、GameObjects、Physics、Animation、Tweens、Audio、Input、Camera、Tilemap、Particles、Loader、Time、Data），形成一套**面向 2D 游戏开发**的完整 Agent 工具集。

---

### 1. 架构移植总览：RimeCut → RimeCraft

```
RimeCut Agent 基础设施（直接复用）          RimeCraft 游戏领域层（新建/改造）
┌──────────────────────────────┐      ┌──────────────────────────────┐
│  tool-registry.ts            │      │  expert-roles.ts (重写)      │
│  ├─ registerTool()           │      │  ├─ director  → 游戏导师      │
│  ├─ executeToolCallV2()      │      │  ├─ design    → 关卡设计师    │
│  └─ getAllTools()             │      │  ├─ coding    → 代码工程师    │
│                              │      │  ├─ debug     → 调试医生      │
│  service.ts (runAgentLoop)   │      │  ├─ asset     → 素材管家      │
│  ├─ 流式响应处理              │      │  └─ gameplay  → 玩法策划      │
│  ├─ tool call 累积与执行      │      │                              │
│  ├─ Director 编排（max 20轮） │      │  tools.ts (完全重写)          │
│  └─ 普通模式（max 10轮）     │      │  ├─ 项目与文件 (7)            │
│                              │      │  ├─ 场景管理 (4)              │
│  llm-backend.ts              │      │  ├─ 游戏对象 (8)              │
│  ├─ CloudLLMBackend          │      │  ├─ 物理系统 (6)              │
│  ├─ Tauri 直连 / Web 代理    │      │  ├─ 动画与补间 (5)            │
│  └─ SSE 流式解析             │      │  ├─ 音频 (4)                  │
│                              │      │  ├─ 相机与输入 (4)            │
│  id-resolver.ts              │      │  ├─ 瓦片地图 (3)              │
│  ├─ 精确/前缀/名称模糊匹配   │      │  ├─ 粒子系统 (3)              │
│  └─ 索引号匹配               │      │  ├─ 代码操作 (5)              │
│                              │      │  ├─ 素材管理 (4)              │
│  agent-store.ts (Zustand)    │      │  ├─ 预览控制 (4)              │
│  ├─ 消息历史管理              │      │  └─ 导出发布 (2)              │
│  ├─ 流式内容渲染              │      │                              │
│  ├─ Undo 检查点              │      │  game-context.ts (新建)       │
│  └─ 取消/中断               │      │  ├─ 游戏场景树序列化           │
│                              │      │  ├─ 对象属性快照               │
│  timeline-context.ts         │      │  └─ 运行时状态注入             │
│  → 改造为 game-context.ts    │      │                              │
│                              │      │  phaser-bridge.ts (新建)      │
│  overlap-detector.ts         │      │  ├─ iframe ↔ 主进程通信        │
│  → 改造为碰撞/重叠检测       │      │  └─ Phaser API 远程调用        │
│                              │      │                              │
│  unit-convert.ts             │      │  rag/ (新建)                  │
│  → 改造为游戏单位转换         │      │  ├─ Phaser 文档 + 1700 示例   │
│                              │      │  └─ 向量检索 + 代码片段匹配    │
└──────────────────────────────┘      └──────────────────────────────┘
```

**复用清单**（直接从 RimeCut 移植，改动 < 10%）：

| RimeCut 文件 | RimeCraft 对应 | 改动点 |
|-------------|---------------|--------|
| `tool-registry.ts` | 原样复用 | 无需改动，纯基础设施 |
| `tool-types.ts` | 原样复用 | 无需改动 |
| `service.ts` (runAgentLoop) | 原样复用 | 将 `buildTimelineContext` 替换为 `buildGameContext` |
| `llm-backend.ts` | 原样复用 | 无需改动 |
| `llm-client.ts` | 原样复用 | 无需改动 |
| `agent-store.ts` | 改造 | `sendMessage` 中的 timeline 引用替换为 game 引用 |
| `ai-settings-store.ts` | 原样复用 | 无需改动 |
| `id-resolver.ts` | 改造 | 解析目标从 timeline element → Phaser GameObject |
| `unit-convert.ts` | 改造 | ticks/seconds → pixels/tiles/degrees 等游戏单位 |
| Agent UI 组件 (5个) | 改造 | 换皮为青少年风格，逻辑不变 |
| `/api/ai/chat/route.ts` | 原样复用 | Next.js 代理层无需改动 |

---

### 2. 多角色 Expert 系统（重新定义）

RimeCut 有 6 个角色（general/design/audio/editing/story/director），RimeCraft 重新定义为游戏开发领域的 6 角色，但保留相同的**角色切换机制**和 **Director 编排模式**：

| 角色 ID | 名称 | 职责 | Director 编排阶段 | 对应 RimeCut |
|---------|------|------|-------------------|-------------|
| `director` | 游戏导师 | 对话入口，解析需求，协调其他角色，用青少年友好语言交流。拥有 `switch_expert_role` 工具 | 全局编排 | director |
| `design` | 关卡设计师 | 游戏世界观、关卡布局、难度曲线、数值平衡、场景规划、UI/UX 布局 | 1. 概念设计 → 2. 关卡规划 | design |
| `coding` | 代码工程师 | 生成/修改 Phaser.js TypeScript 代码，场景搭建、对象创建、物理配置、动画编排 | 3. 场景搭建 → 4. 逻辑实现 | editing |
| `asset` | 素材管家 | 检索/匹配/导入素材，精灵图配置，瓦片地图处理，音效匹配 | 5. 素材填充 | audio |
| `gameplay` | 玩法策划 | 交互逻辑、碰撞规则、得分系统、状态机、游戏循环、胜负条件 | 6. 玩法调优 | story |
| `debug` | 调试医生 | 捕获运行时错误，分析 Phaser 报错日志，定位问题并修复代码，性能优化建议 | 7. 测试修复 | general |

**Director 编排流程**（复用 RimeCut 的多阶段 pipeline，替换为游戏开发流水线）：

```
用户需求 → Director 接收
    │
    ├─ 1. 概念设计 (design)   → 确定游戏类型、世界观、核心玩法
    ├─ 2. 关卡规划 (design)   → 场景数量、关卡结构、难度梯度
    ├─ 3. 场景搭建 (coding)   → 创建场景、放置对象、设置相机
    ├─ 4. 逻辑实现 (coding)   → 物理碰撞、输入处理、状态管理
    ├─ 5. 素材填充 (asset)    → 匹配精灵图、音效、背景、瓦片
    ├─ 6. 玩法调优 (gameplay) → 手感调整、数值平衡、特效粒子
    ├─ 7. 测试修复 (debug)    → 运行测试、修复 Bug、性能优化
    └─ Director 汇总 → 输出成果
```

---

### 3. 完整工具集（59 个工具，覆盖 Phaser 全量子系统）

以下工具按领域分组。每个工具严格遵循 RimeCut 的 `AgentTool` 接口，通过 `tool-registry.ts` 注册，返回 `AgentToolResult`（含 `undoable` 标记）。

#### 3.1 项目与文件工具（7 个）

通过 `StorageProvider` 操作，Agent 对项目文件的所有操作都经过统一抽象层。

| 工具名 | 参数 | 说明 | undoable |
|--------|------|------|----------|
| `create_project` | template?, name? | 从模板创建项目，初始化标准目录结构 | ✅ |
| `list_files` | path? | 列出项目文件树（简化视图） | ❌ |
| `read_file` | path | 读取指定文件内容 | ❌ |
| `write_file` | path, content | 写入/覆盖文件（全量写入） | ✅ |
| `patch_file` | path, patches[] | 增量修改文件（行级 diff），适合小范围代码修改 | ✅ |
| `delete_file` | path | 删除文件 | ✅ |
| `rename_file` | oldPath, newPath | 重命名/移动文件 | ✅ |

#### 3.2 场景管理工具（4 个）

对应 Phaser 的 `Phaser.Scene` + `Phaser.Scenes.SceneManager` 子系统。

| 工具名 | 参数 | 说明 | undoable |
|--------|------|------|----------|
| `create_scene` | name, type?(menu/game/ui/gameover) | 创建新场景文件，自动生成 `init/preload/create/update` 骨架代码 | ✅ |
| `list_scenes` | — | 列出项目中所有场景及其类型、资源依赖 | ❌ |
| `set_scene_config` | sceneId, config{width,height,backgroundColor,physics} | 修改场景的画布尺寸、背景色、物理引擎配置 | ✅ |
| `set_scene_transition` | fromScene, toScene, trigger, transition? | 配置场景切换规则（如「碰到终点旗帜 → 切换到下一关」） | ✅ |

#### 3.3 游戏对象工具（8 个）

覆盖 Phaser 的 `Phaser.GameObjects` 全部核心类型：Sprite、Image、Text、TileSprite、Graphics、Container、Group、Zone。

| 工具名 | 参数 | 说明 | Phaser 对应 | undoable |
|--------|------|------|------------|----------|
| `add_sprite` | sceneId, key, x, y, frame?, name? | 添加精灵对象（支持动画） | `this.add.sprite()` | ✅ |
| `add_image` | sceneId, key, x, y, name? | 添加静态图片对象 | `this.add.image()` | ✅ |
| `add_text` | sceneId, x, y, content, style? | 添加文本对象（字体、大小、颜色） | `this.add.text()` | ✅ |
| `add_tilesprite` | sceneId, x, y, width, height, key | 添加平铺精灵（滚动背景） | `this.add.tileSprite()` | ✅ |
| `add_graphics` | sceneId, shapes[] | 添加图形对象（矩形、圆形、线条、多边形） | `this.add.graphics()` | ✅ |
| `add_group` | sceneId, objectIds[], config? | 创建对象组（对象池/批量管理） | `this.add.group()` | ✅ |
| `add_container` | sceneId, x, y, childIds[] | 创建容器（父子层级关系） | `this.add.container()` | ✅ |
| `update_object` | objectId, props{x?,y?,scale?,rotation?,alpha?,visible?,depth?,origin?,tint?} | 更新对象属性（位置、缩放、旋转、透明度等） | `gameObject.setPosition()` 等 | ✅ |

#### 3.4 物理系统工具（6 个）

覆盖 Phaser 的 `Phaser.Physics.Arcade` 和 `Phaser.Physics.Matter` 子系统。

| 工具名 | 参数 | 说明 | Phaser 对应 | undoable |
|--------|------|------|------------|----------|
| `enable_physics` | objectId, engine?(arcade/matter) | 为对象启用物理体 | `this.physics.add.existing()` | ✅ |
| `set_body` | objectId, props{velocity?,gravity?,bounce?,drag?,friction?,mass?,immovable?,collideWorldBounds?} | 配置物理体属性 | `body.setVelocity()` 等 | ✅ |
| `add_collider` | objectA, objectB, callback?, options? | 添加碰撞检测（碰撞/重叠） | `this.physics.add.collider()` | ✅ |
| `set_world_gravity` | sceneId, x?, y? | 设置世界重力 | `this.physics.world.gravity` | ✅ |
| `set_world_bounds` | sceneId, x, y, width, height | 设置世界边界 | `this.physics.world.setBounds()` | ✅ |
| `add_static_body` | sceneId, x, y, width, height, name? | 添加静态物理体（地面、平台、墙壁） | `this.physics.add.staticBody()` | ✅ |

#### 3.5 动画与补间工具（5 个）

覆盖 Phaser 的 `Phaser.Animations` + `Phaser.Tweens` 子系统。

| 工具名 | 参数 | 说明 | Phaser 对应 | undoable |
|--------|------|------|------------|----------|
| `create_animation` | key, frames{texture,start,end}, frameRate?, repeat?, yoyo? | 创建精灵动画序列 | `this.anims.create()` | ✅ |
| `play_animation` | objectId, animKey, ignoreIfPlaying? | 播放动画 | `sprite.play()` | ✅ |
| `add_tween` | sceneId, target, props{x?,y?,alpha?,scale?,rotation?,duration,ease?,yoyo?,repeat?,delay?} | 添加属性补间动画 | `this.tweens.add()` | ✅ |
| `add_tween_chain` | sceneId, tweens[] | 添加补间动画链（顺序执行） | `this.tweens.chain()` | ✅ |
| `list_animations` | texture? | 列出已创建的动画序列 | `this.anims.getAll()` | ❌ |

#### 3.6 音频工具（4 个）

覆盖 Phaser 的 `Phaser.Sound` 子系统。

| 工具名 | 参数 | 说明 | Phaser 对应 | undoable |
|--------|------|------|------------|----------|
| `play_audio` | key, config?{loop?,volume?,rate?,detune?} | 播放音频 | `this.sound.play()` | ✅ |
| `stop_audio` | key? | 停止音频（不传则停止全部） | `this.sound.stop()` | ✅ |
| `set_audio_config` | key, config{volume?,loop?,rate?} | 修改音频属性 | `sound.setVolume()` 等 | ✅ |
| `add_audio_marker` | key, name, start, duration | 添加音频标记（片段播放） | `sound.addMarker()` | ✅ |

#### 3.7 相机与输入工具（4 个）

覆盖 `Phaser.Cameras.Scene2D` + `Phaser.Input` 子系统。

| 工具名 | 参数 | 说明 | Phaser 对应 | undoable |
|--------|------|------|------------|----------|
| `set_camera` | sceneId, config{follow?,zoom?,bounds?,scrollX?,scrollY?,backgroundColor?} | 配置主相机（跟随、缩放、边界） | `this.cameras.main` 方法 | ✅ |
| `camera_effect` | sceneId, effect(shake/fade/flash/pan/zoom), config | 触发相机特效 | `camera.shake()` 等 | ✅ |
| `add_keyboard_input` | sceneId, key, event(down/up), action | 添加键盘输入绑定 | `this.input.keyboard.on()` | ✅ |
| `add_pointer_input` | sceneId, objectId?, event(down/up/move/drag), action | 添加鼠标/触控输入绑定 | `this.input.on()` | ✅ |

#### 3.8 瓦片地图工具（3 个）

覆盖 `Phaser.Tilemaps` 子系统，青少年 RPG 和平台跳跃关卡设计的核心能力。

| 工具名 | 参数 | 说明 | Phaser 对应 | undoable |
|--------|------|------|------------|----------|
| `create_tilemap` | sceneId, key, tilesetKey, tileWidth, tileHeight, layerConfigs[] | 创建瓦片地图（从 JSON 或数组） | `this.make.tilemap()` | ✅ |
| `set_tile_collision` | sceneId, tilemapId, tileIds[], collides | 设置瓦片碰撞属性 | `layer.setCollision()` | ✅ |
| `place_tiles` | sceneId, tilemapId, layerId, tiles[{x,y,tileId}] | 批量放置/修改瓦片 | `layer.putTileAt()` | ✅ |

#### 3.9 粒子系统工具（3 个）

覆盖 `Phaser.GameObjects.Particles` 子系统，用于视觉特效（爆炸、火焰、烟雾、星星等）。

| 工具名 | 参数 | 说明 | Phaser 对应 | undoable |
|--------|------|------|------------|----------|
| `add_particle_emitter` | sceneId, key, config{speed?,scale?,alpha?,lifespan?,frequency?,quantity?,tint?,blendMode?} | 创建粒子发射器 | `this.add.particles()` | ✅ |
| `set_particle_zone` | emitterId, zone{type(rect/circle/edge),source} | 设置粒子发射区域 | `emitter.setEmitZone()` | ✅ |
| `particle_follow` | emitterId, targetObjectId, offset? | 粒子跟随目标对象 | `emitter.startFollow()` | ✅ |

#### 3.10 代码操作工具（5 个）

Agent 的核心能力——直接操作 TypeScript 代码文件，需要与 RAG 知识库深度集成。

| 工具名 | 参数 | 说明 | undoable |
|--------|------|------|----------|
| `generate_code` | sceneId, description, scope(full/method/snippet) | 基于自然语言描述 + RAG 检索生成 Phaser 代码 | ✅ |
| `modify_code` | path, description, context? | 基于描述增量修改代码（LLM 理解上下文后输出 diff） | ✅ |
| `fix_error` | errorLog, path? | 分析运行时报错，定位原因，生成修复 patch | ✅ |
| `format_code` | path? | 用 Biome 格式化代码 | ✅ |
| `explain_code` | path, lineStart?, lineEnd? | 用青少年友好语言解释代码含义（教学功能） | ❌ |

#### 3.11 素材管理工具（4 个）

通过 `StorageProvider` + 内置素材库，为 Phaser 的 `Phaser.Loader` 提供素材接入。

| 工具名 | 参数 | 说明 | undoable |
|--------|------|------|----------|
| `search_assets` | query, type?(image/audio/spritesheet/tilemap/font) | 搜索内置素材库 + 用户上传素材 | ❌ |
| `import_asset` | assetId, projectPath? | 将素材导入项目 assets/ 目录并生成 preload 代码 | ✅ |
| `generate_spritesheet_config` | imagePath, frameWidth, frameHeight, frameCount? | 为精灵图生成 JSON 配置（帧尺寸、序列） | ✅ |
| `list_project_assets` | type? | 列出项目中已有的素材资源 | ❌ |

#### 3.12 预览控制工具（4 个）

通过 `phaser-bridge.ts` 与 iframe 中运行的 Phaser 游戏实例通信。

| 工具名 | 参数 | 说明 | undoable |
|--------|------|------|----------|
| `restart_preview` | sceneId? | 重新编译并重启游戏预览 | ❌ |
| `switch_scene` | sceneId | 切换预览到指定场景 | ❌ |
| `capture_screenshot` | — | 截取当前游戏画面（用于对话中展示） | ❌ |
| `get_game_state` | — | 获取当前游戏运行时状态（FPS、对象数、内存、报错日志） | ❌ |

#### 3.13 导出与发布工具（2 个）

| 工具名 | 参数 | 说明 | undoable |
|--------|------|------|----------|
| `export_game` | format(web-zip/desktop/online) | 构建并导出游戏 | ❌ |
| `publish_game` | visibility?(public/unlisted/private), description? | 发布到 play.rimecraft.com | ❌ |

#### 3.14 通用控制工具（3 个，直接复用 RimeCut）

| 工具名 | 参数 | 说明 | undoable |
|--------|------|------|----------|
| `undo` | — | 撤销上一步操作 | ❌ |
| `redo` | — | 重做上一步操作 | ❌ |
| `switch_expert_role` | role(design/coding/asset/gameplay/debug) | 切换 Expert 角色（仅 Director 模式可用） | ❌ |

**工具总计：59 个**（RimeCut 24 个 → RimeCraft 59 个，覆盖面扩展 2.5 倍）

---

### 4. 游戏上下文注入（替代 RimeCut 的 timeline-context）

RimeCut 的 `buildTimelineContext()` 将时间线状态序列化为 LLM 可读文本。RimeCraft 需要用 `buildGameContext()` 将 Phaser 游戏状态序列化为 LLM 可读文本。

**`game-context.ts` 输出格式**：

```
=== Game Context ===
Project: 我的恐龙跑酷
Engine: Phaser 4.1
Canvas: 800x600 @ 60fps

=== Scenes (3) ===
[active] GameScene (game-scene.ts)
  Objects (12):
    #1 "player" Sprite x=120 y=400 physics=arcade velocity=(200,0)
    #2 "ground" StaticBody x=400 y=580 w=800 h=40
    #3 "cactus_group" Group count=5 physics=arcade
    #4 "score_text" Text x=16 y=16 content="Score: 0" fontSize=24
    #5 "bg_sky" TileSprite x=400 y=300 w=800 h=600 scrollFactorX=0.5
    ...
  Colliders:
    player ↔ ground (collide)
    player ↔ cactus_group (overlap → gameOver)
  Camera: following "player", bounds=(0,0,4800,600)
  Input: LEFT/RIGHT → player.velocity.x, SPACE → player.velocity.y=-400

MenuScene (menu-scene.ts) [inactive]
GameOverScene (gameover-scene.ts) [inactive]

=== Assets (8 loaded) ===
  images: player.png, ground.png, cactus.png, bg_sky.png
  spritesheets: player_run(32x32, 6 frames), player_jump(32x32, 4 frames)
  audio: jump.mp3, bgm.mp3

=== Animations (3) ===
  "player_run": player_run frames 0-5 @ 10fps repeat=-1
  "player_jump": player_jump frames 0-3 @ 8fps repeat=0
  "player_idle": player_run frame 0 @ 1fps repeat=-1

=== Recent Errors ===
  (none)
```

**与 RimeCut 的关键区别**：
- RimeCut 序列化的是 **timeline + tracks + elements**（一维时间线）
- RimeCraft 序列化的是 **scenes + game objects + physics + animations**（二维空间场景）
- 模糊 ID 解析从 element 改为 game object（名称、ID 前缀、索引号匹配逻辑不变）

---

### 5. Phaser Bridge：iframe 通信协议

Phaser 运行在 iframe 沙箱中，Agent 工具需要通过 `postMessage` 与游戏实例交互。

```
主进程 (React)                    iframe (Phaser 游戏)
┌──────────────┐                  ┌──────────────────┐
│ Agent Tool   │  postMessage →   │ PhaserBridge     │
│ (add_sprite) │  ──────────────→ │ (消息路由)        │
│              │                  │   ↓               │
│              │                  │ scene.add.sprite() │
│              │  ← postMessage   │   ↓               │
│ AgentResult  │  ←────────────── │ { ok, objectId }  │
└──────────────┘                  └──────────────────┘
```

**消息协议**：

```typescript
// 主进程 → iframe
interface BridgeCommand {
  type: 'execute'
  id: string                    // 请求 ID，用于回调匹配
  method: string                // Phaser API 方法路径（如 'scene.add.sprite'）
  args: any[]                   // 方法参数
}

// iframe → 主进程
interface BridgeResponse {
  type: 'result'
  id: string                    // 对应请求 ID
  ok: boolean
  data?: any                    // 返回值（如创建的对象 ID）
  error?: string                // 错误信息
}

// iframe → 主进程（主动上报）
interface BridgeEvent {
  type: 'event'
  event: 'error' | 'fps' | 'state_change' | 'scene_change'
  data: any
}
```

**两种工具执行模式**：

| 模式 | 适用场景 | 实现方式 |
|------|---------|---------|
| **代码生成模式** | `generate_code`, `modify_code`, `write_file` 等 | 直接写入代码文件 → ESBuild 重编译 → iframe 热更新 |
| **运行时操控模式** | `add_sprite`, `set_body`, `play_audio` 等 | 通过 Bridge 实时调用 Phaser API → 同时生成对应代码写入文件（保持代码与运行时同步） |

运行时操控模式的关键：**每次 Bridge 调用都同步生成代码**，确保代码文件始终是游戏的"源码真相"，而非仅在运行时临时生效。这也是 Undo 可行的前提——撤销时回退代码文件即可。

---

### 6. RAG 知识库构建

| 知识源 | 数据量 | 索引方式 | 用途 |
|--------|--------|---------|------|
| Phaser 4 API 文档 | ~2000 个 API 条目 | 按命名空间分类 + 向量嵌入 | Agent 生成代码时检索准确 API 签名与参数 |
| Phaser 官方示例 | 1700+ 可运行示例 | 按游戏类型/功能标签 + 代码向量嵌入 | 匹配用户需求，找到最相关的参考实现 |
| 游戏设计模式 | ~50 个常见模式 | 按游戏类型/玩法分类 | 关卡设计师和玩法策划的决策参考 |
| 常见错误 + 修复 | ~200 条 | 按错误信息关键词索引 | 调试医生的快速定位 |
| 模板完整代码 | 7+ 个模板 | 按模板类型精确匹配 | 增量修改的基准代码 |
| Phaser 社区 FAQ | ~500 条 | 向量嵌入 | 补充文档中未覆盖的实战技巧 |

**RAG 检索时机**：
- `generate_code` / `modify_code` 调用前，自动检索相关 API 和示例
- `fix_error` 调用时，检索错误库匹配已知问题
- Designer/Gameplay 角色思考时，检索游戏设计模式
- 在系统提示词中注入检索结果，限制在 2000 token 以内避免上下文膨胀

---

### 7. Undo 检查点机制（直接复用 RimeCut）

RimeCut 的 Undo 机制已在 50+ Command 上验证，直接移植到 RimeCraft：

```
用户说：「给恐龙加一个跳跃动画」
    │
    ├─ Agent 记录 commandCheckpoint = editor.command.historyLength (= 15)
    │
    ├─ Tool 1: add_sprite("jump_effect", ...) → Command #16 (undoable: true)
    ├─ Tool 2: create_animation("dino_jump", ...) → Command #17 (undoable: true)
    ├─ Tool 3: play_animation("player", "dino_jump") → Command #18 (undoable: true)
    │
    └─ 用户点击「撤销这轮操作」
        → 连续执行 undo() 3 次（18→17→16→15）
        → 回到 checkpoint = 15 的状态
        → 删除本轮所有对话消息
```

**与 RimeCut 的唯一区别**：RimeCut 的 Command 操作 timeline elements，RimeCraft 的 Command 操作代码文件（write_file/patch_file 生成反向 patch 作为 undo）。

---

### 8. LLM 后端配置（直接复用 RimeCut）

```typescript
// 默认配置（与 RimeCut 完全一致的存储结构）
interface AgentLLMConfig {
  baseUrl: string     // 默认 "https://api.openai.com/v1"
  apiKey: string      // 用户填入
  model: string       // 默认 "gpt-4.1"
}
```

**支持的后端**：
- 云端：OpenAI / Claude / DeepSeek（任何 OpenAI 兼容 API）
- 本地：Ollama / LM Studio / vLLM（填入本地地址如 `http://localhost:11434/v1`）
- 路由：Tauri/Mobile 直连 LLM API；Web 浏览器通过 Next.js `/api/ai/chat` 代理（复用 RimeCut route.ts）

---

### 9. 文件结构（最终）

```
/packages/agent-engine/                    # 从 RimeCut 移植的 Agent 核心
├── types.ts                               # ✅ 直接复用
├── tool-types.ts                          # ✅ 直接复用
├── tool-registry.ts                       # ✅ 直接复用
├── service.ts                             # ✅ 直接复用 (buildTimelineContext → buildGameContext)
├── llm-backend.ts                         # ✅ 直接复用
├── llm-client.ts                          # ✅ 直接复用
├── id-resolver.ts                         # 🔄 改造 (timeline element → game object)
└── unit-convert.ts                        # 🔄 改造 (ticks → pixels/tiles/degrees)

/apps/web/src/lib/ai/
├── expert-roles.ts                        # 🆕 完全重写 6 个游戏开发角色
├── tools/                                 # 🆕 完全重写 59 个游戏开发工具
│   ├── project-tools.ts                   # 项目与文件 (7)
│   ├── scene-tools.ts                     # 场景管理 (4)
│   ├── gameobject-tools.ts                # 游戏对象 (8)
│   ├── physics-tools.ts                   # 物理系统 (6)
│   ├── animation-tools.ts                 # 动画与补间 (5)
│   ├── audio-tools.ts                     # 音频 (4)
│   ├── camera-input-tools.ts              # 相机与输入 (4)
│   ├── tilemap-tools.ts                   # 瓦片地图 (3)
│   ├── particle-tools.ts                  # 粒子系统 (3)
│   ├── code-tools.ts                      # 代码操作 (5)
│   ├── asset-tools.ts                     # 素材管理 (4)
│   ├── preview-tools.ts                   # 预览控制 (4)
│   ├── publish-tools.ts                   # 导出发布 (2)
│   └── control-tools.ts                   # 通用控制 — undo/redo/switch_role (3)
├── game-context.ts                        # 🆕 游戏状态序列化（替代 timeline-context）
├── phaser-bridge.ts                       # 🆕 iframe 通信协议
└── rag/                                   # 🆕 Phaser 知识库
    ├── index.ts                           # 检索入口
    ├── phaser-docs.json                   # API 文档索引
    ├── phaser-examples.json               # 示例代码索引
    └── embeddings/                        # 向量嵌入文件

/apps/web/src/stores/
├── agent-store.ts                         # 🔄 改造 (timeline → game 引用)
└── ai-settings-store.ts                   # ✅ 直接复用

/apps/web/src/components/editor/panels/agent/
├── agent-chat.tsx                         # 🔄 换皮（青少年风格）
├── agent-header.tsx                       # 🔄 换皮 + 角色名替换
├── agent-input.tsx                        # 🔄 换皮
├── agent-message.tsx                      # 🔄 换皮
└── agent-settings.tsx                     # ✅ 直接复用

/apps/web/src/app/api/ai/
└── chat/route.ts                          # ✅ 直接复用
```

---

## 九、UI 设计方向

面向青少年用户，UI 设计需要在专业工具与趣味体验之间找到平衡。

### 界面布局

```
┌──────────────────────────────────────────────────────────┐
│  顶部工具栏：项目名 | 模板库 | 素材库 | 导出 | 设置     │
├──────────────────┬───────────────────────────────────────┤
│                  │                                       │
│   对话面板       │        游戏预览窗口                    │
│   (左侧 40%)    │        (右侧 60%)                     │
│                  │                                       │
│  ┌────────────┐  │  ┌─────────────────────────────────┐  │
│  │ Agent 对话  │  │  │                                 │  │
│  │ 历史记录   │  │  │    Phaser.js 游戏画面渲染        │  │
│  │            │  │  │                                 │  │
│  │            │  │  │                                 │  │
│  │            │  │  │                                 │  │
│  └────────────┘  │  └─────────────────────────────────┘  │
│                  │  ▶ 播放 ⏸ 暂停 🔄 重启 | FPS: 60    │
│  ┌────────────┐  ├───────────────────────────────────────┤
│  │ 输入框     │  │  代码编辑器（可折叠，默认隐藏）       │
│  │ [发送]     │  │  Monaco Editor + 文件树               │
│  └────────────┘  │                                       │
└──────────────────┴───────────────────────────────────────┘
```

### 设计风格
- **配色**：明亮活力的渐变色系（蓝紫 → 青色），暗色模式可选
- **字体**：大字号、高对比度，适配青少年视觉习惯
- **交互**：大按钮、明确的操作反馈、适度的动画效果
- **图标**：圆润风格的图标系统，游戏化的视觉元素
- **引导**：首次使用的新手引导流程，分步教学

---

## 十、开发环境与部署方案

### 1. 开发环境搭建

#### 前置依赖（同 RimeCut 对齐）
- Node.js 20+、Bun 1.0+
- Rust 工具链（Tauri 桌面端开发需要）
- Docker + Docker Compose（可选，Web 端数据库服务）
- VS Code / Cursor 编辑器

#### 快速启动
```bash
# 1. 克隆仓库
git clone https://github.com/xxx/rimecraft.git
cd rimecraft

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 LLM API Key（可选，支持离线模式）

# 4. 启动开发服务
bun dev
# Web 端：http://localhost:3000
# Tauri 桌面端：自动启动应用窗口
```

### 2. 构建与部署

| 平台 | 方案 | 说明 |
|------|------|------|
| **Web 端** | Next.js → Vercel / Netlify | 零配置部署，CDN 全球加速 |
| **桌面端** | Tauri 2.x → .exe / .dmg / .AppImage | 三平台安装包，完全离线运行 |
| **移动端** | Tauri 2.x → Android APK | 平板端游戏开发体验（后期） |
| **私有化** | Docker 一键部署 | 教育机构 / 编程培训班私有化部署 |

### 3. 开源协作规范
- **开源协议**：MIT，与 RimeCut 完全一致
- **欢迎贡献**：Agent 能力优化、游戏模板扩充、素材库丰富、UI/UX 改进、Bug 修复、国际化翻译
- **暂不接受**：Phaser.js 引擎内核修改、渲染管线重构（保持引擎升级兼容性）

---

## 十一、MVP 迭代路径

### 阶段一：基础架构与核心预览（3 周）

**目标**：搭建 Monorepo 框架，实现项目存储体系与 Phaser.js 游戏实时预览。

| 任务 | 详情 | 复用 RimeCut |
|------|------|-------------|
| 项目初始化 | Monorepo 搭建（Turborepo + Bun），CI/CD 配置 | ✅ 完全复用工程配置 |
| 基础 UI 框架 | React + TailwindCSS + Radix UI，三栏布局搭建 | ✅ 复用 UI 组件库 |
| Tauri 集成 | Desktop 端基础窗口与文件系统访问 | ✅ 复用 Tauri 配置 |
| StorageProvider 抽象层 | 实现 `TauriStorageProvider` + `IndexedDBStorageProvider`，统一文件/素材读写接口 | 🔄 改造 RimeCut 存储层 |
| 项目数据模型 | 定义 `rimecraft.json` 清单格式、标准项目目录结构、UUID v7 ID 生成 | 🆕 新建 |
| Phaser.js 运行时 | 封装 Phaser.js 标准化 API，iframe 沙箱预览 | 🆕 新建 |
| 热更新管线 | ESBuild 编译 + iframe 消息通信 + 毫秒级刷新 | 🔄 改造 RimeCut 预览架构 |
| 项目管理 | 项目创建/打开/保存/删除，文件树展示，工作空间选择 | ✅ 复用 Manager 模式 |
| 项目导入导出 | `.rimecraft.zip` 打包与解压，离线共享基础能力 | 🆕 新建 |

**里程碑验收**：创建游戏项目 → 编写 Phaser.js 代码 → 保存到本地 → 实时预览 → 导出为 `.rimecraft.zip` → 在另一台设备导入打开。

### 阶段二：Agent 对话核心能力（4 周）

**目标**：实现自然语言对话生成可运行的 Phaser.js 游戏代码。

| 任务 | 详情 | 复用 RimeCut |
|------|------|-------------|
| Agent 框架搭建 | 多轮对话 + 上下文管理 + 角色切换 | ✅ 直接复用 AI 框架 |
| 工具调用系统 | 实现 20+ 游戏开发工具的 Agent 调用（通过 StorageProvider 操作文件） | ✅ 复用工具调用机制 |
| RAG 知识库 | 导入 Phaser.js 文档 + 1700 示例 + 最佳实践 | 🆕 新建 |
| 代码生成 Agent | 基于 RAG 检索生成符合规范的 Phaser.js 代码 | 🔄 改造 RimeCut Editing Expert |
| 调试修复 Agent | 捕获运行时错误，自动分析修复 | 🔄 改造 RimeCut General Expert |
| Undo 检查点集成 | Agent 每次操作创建检查点，支持一键回滚 | ✅ 直接复用 Undo 机制 |
| 对话 UI | 沉浸式对话界面，消息气泡 + 代码块渲染 | 🆕 新建 |

**里程碑验收**：用户输入「做一个小恐龙跑酷游戏」→ Agent 自动生成完整游戏代码 → 右侧实时预览可玩。

### 阶段三：模板库与素材系统（3 周）

**目标**：内置丰富模板和素材，让创作起点更高、更快。

| 任务 | 详情 |
|------|------|
| 游戏模板开发 | 7+ 类型游戏模板（平台跳跃、射击、RPG、解谜、跑酷、格斗、沙盒） |
| 素材库系统 | 内置免费素材分类管理（角色、场景、UI、音效），搜索 + 预览 + 一键引用 |
| 素材匹配 Agent | 根据游戏需求自动匹配和引用素材 |
| Monaco Editor 集成 | 代码查看/编辑面板，语法高亮 + TypeScript 补全 |
| 代码注释系统 | Agent 生成代码自动附带中文注释，辅助学习 |

**里程碑验收**：用户选择「RPG 冒险」模板 → 一键创建 → 对话修改角色和关卡 → 自定义素材 → 完整游戏。

### 阶段四：发布闭环与在线共享（4 周）

**目标**：完成从创意到发布的全链路，实现游戏在线发布与项目云端共享。

| 任务 | 详情 |
|------|------|
| 游戏构建管线 | ESBuild 生产构建 + 素材压缩 + index.html 打包，生成可独立运行的静态包 |
| 在线发布服务 | Cloudflare Pages/R2 部署，生成 `play.rimecraft.com/g/{id}` 链接 + 二维码 |
| 本地导出 | Web 包（.zip）+ Tauri 桌面安装包（.exe / .dmg） |
| 用户系统 | better-auth 集成，注册/登录/个人主页（复用 RimeCut） |
| 云端项目仓库 | `CloudStorageProvider` 实现，PostgreSQL + S3 存储，项目云同步 |
| Fork 模型 | 项目 Fork / 浏览 / 下载 API，`forkedFrom` 血缘追溯 |
| 发布管理 | 版本更新、访问控制（public/unlisted/private）、下架/回滚 |
| 多 Agent 协作 | 设计、代码、调试、素材、测试 Agent 全流程协同 |
| 新手引导 | 首次使用互动教程，5 分钟完成第一个游戏 |

**里程碑验收**：用户对话完成游戏 → 一键在线发布 → 朋友通过链接/二维码直接玩 → 朋友 Fork 项目二次创作。

### 阶段五：课堂协作与社区（4 周）

**目标**：面向编程教育场景的课堂模式，以及作品展示社区。

| 任务 | 详情 |
|------|------|
| 课堂管理后端 | Classroom 数据模型、邀请码加入、模板自动 Fork |
| 老师管理面板 | 查看学生进度、实时项目快照、点评打分、导出成绩 |
| 学生视角 | 加入课堂 → 自动 Fork 模板 → 独立创作 → 提交作品 |
| 社区广场 | 公开作品浏览、按热度/标签/最新排序、游玩 + 点赞 |
| 评论系统 | 作品评论与反馈，内容安全过滤 |
| itch.io 集成 | Butler CLI 自动上传，一键发布到 itch.io |
| 离线模型支持 | 适配 DeepSeek-R1、Qwen 等本地开源模型 |
| 性能监控 | FPS、内存、Draw Call 实时显示 |

**里程碑验收**：老师创建课堂 → 分享邀请码 → 20 名学生加入并独立完成游戏 → 老师查看全部进度并点评 → 优秀作品展示到社区。

### 阶段六：实时共创与生态扩展（长期）

| 方向 | 内容 |
|------|------|
| 实时共创 | 基于 Yjs（CRDT）的多人实时编辑，y-monaco 集成，WebSocket 同步服务 |
| Agent 协作冲突 | 多人 Agent 操作队列 / 文件级锁 / 冲突提示机制 |
| 权限体系 | 项目级权限管理（Owner / Editor / Viewer / Chat-only） |
| 竞赛模式 | Game Jam 创作挑战赛，限时主题，小组协作 |
| 更多模板 | 持续扩充游戏类型模板，跟进流行游戏趋势 |
| 微信小游戏 | Phaser.js 微信适配器，构建 + 上传微信小游戏包 |
| 多语言 | 英语、日语等多语言支持，面向全球青少年 |
| 移动端优化 | iPad 端游戏创作体验优化 |
| 插件系统 | 开放 API，支持社区开发自定义工具和素材包 |

---

## 十二、技术风险与应对策略

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| LLM 代码生成幻觉 | 生成不可运行的代码，挫败用户信心 | RAG 知识库 + TypeScript 编译预校验 + 标准化 API 封装，三重保障 |
| Phaser.js 版本升级 | API 变更导致知识库失效 | 知识库版本化管理，CI 自动检测 API 兼容性 |
| iframe 沙箱性能 | 复杂游戏在沙箱中帧率不足 | ESBuild 优化 + Web Worker 分离计算 + 性能预算警告 |
| 青少年内容安全 | AI 生成不当内容 | 输出内容过滤 + 素材库审核 + 代码安全沙箱 |
| 离线模型质量 | 本地模型代码生成能力弱于云端 | 提供质量分级提示，离线模式配合更强的 RAG 增强 |
| Tauri 跨平台兼容 | 各平台表现不一致 | 复用 RimeCut 已验证的 Tauri 跨平台方案，减少踩坑 |
| IndexedDB / OPFS 浏览器兼容 | 旧浏览器不支持 OPFS，存储容量有限 | 渐进降级策略：优先 OPFS → 回退 IndexedDB → 提示升级浏览器；大素材提前压缩 |
| 云端存储成本膨胀 | 用户增长后 S3/CDN 费用上升 | 单项目存储配额（免费 50MB），超出引导压缩素材或付费扩容；Cloudflare R2 零出站费用 |
| 多用户 Fork 冲突 | Fork 后上游项目更新，下游无法感知 | MVP 阶段 Fork 后完全独立；后期可选「同步上游更新」功能，但不自动合并 |
| 实时协同 CRDT 复杂性 | Agent 操作与多人编辑产生语义冲突 | 阶段六才引入实时共创；初期用 Fork 模型隔离用户；Agent 操作加文件级锁防止并发 |
| 发布服务可用性 | play.rimecraft.com 宕机导致游戏不可访问 | 静态托管天然高可用（Cloudflare Pages 99.99% SLA）；用户可随时导出本地包自行部署 |

---

## 十三、成功指标

| 指标 | 目标值 | 衡量方式 |
|------|--------|---------|
| 首个游戏完成时间 | ≤ 5 分钟（使用模板） | 新用户测试 |
| 对话生成成功率 | ≥ 85% 首次可运行 | Agent 日志统计 |
| 青少年满意度 | NPS ≥ 60 | 用户调研 |
| 热更新延迟 | ≤ 500ms | 性能监控 |
| 模板覆盖率 | ≥ 7 种主流 2D 游戏类型 | 模板列表 |
| 离线可用性 | 100% 核心功能离线可用 | 功能测试 |
| 项目导入导出成功率 | 100%（.rimecraft.zip 跨平台互通） | 自动化测试 |
| 在线发布到可玩 | ≤ 30 秒（点击发布 → 链接可访问） | 端到端计时 |
| Fork 项目可用性 | Fork 后 100% 可独立运行和编辑 | 自动化测试 |
| 课堂模式并发 | 单课堂 ≥ 40 名学生同时使用 | 压力测试 |

---

## 附录：RimeCut 可复用资产清单

以下 RimeCut（`C:\Users\zisheng\Documents\cao\00_code\gitlab\gridflow\tool\rimecut`）资产可直接复用或改造：

| 资产 | 路径参考 | 复用方式 |
|------|---------|---------|
| Monorepo 配置 | `turbo.json`, `package.json`, `biome.jsonc` | 直接复用 |
| Tauri 桌面端 | `apps/tauri/` | 直接复用框架，替换 UI |
| Web 端架构 | `apps/web/src/app/` | 复用路由与布局模式 |
| EditorCore 模式 | `apps/web/src/core/` | 改造为游戏编辑器 Manager |
| Command 模式 | `apps/web/src/lib/commands/` | 直接复用 Undo/Redo 框架 |
| Zustand Stores | `apps/web/src/stores/` | 复用 Store 模式，替换数据结构 |
| AI Agent 框架 | `apps/web/src/lib/ai/` | 复用框架，替换角色与工具 |
| UI 组件 | `apps/web/src/components/` | 复用基础组件，调整风格 |
| 认证系统 | better-auth 集成 | 直接复用（Web 端可选） |
| 存储方案 | IndexedDB + PostgreSQL | 直接复用 |
| CI/CD | `.github/` | 直接复用 |
| 代码规范 | Biome + Husky 配置 | 直接复用 |
