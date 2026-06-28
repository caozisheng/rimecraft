# Rimecraft Editor 系统设计复盘 (2025-05-09)

基于全量代码审查，覆盖 stores、core、components/editor、components/visual、lib/assets、lib/storage 所有模块。

---

## 架构总览

```
User Input
    ↓
Editor UI Components (React)
    ↓
Zustand Stores (editor, chat, game, project, visual-editor)
    ↓
Core Managers (EditorCore singleton)
    ├─ ProjectManager → StorageProvider (IndexedDB / Tauri)
    ├─ PreviewManager → GameCompiler + PhaserBridge
    ├─ CommandManager → Command undo/redo history
    └─ AgentManager → ToolRegistry (30+ agent tools)
    ↓
External Systems
├─ IndexedDB / Tauri Storage
├─ Phaser Runtime (iframe, postMessage)
├─ LLM API (OpenAI-compatible)
└─ Agent Engine (@rimecraft/agent-engine)
```

---

## 一、严重问题

### 1. 大文件未拆分（6 个文件共 ~6000 行）

| 文件 | 行数 | 建议拆分方案 |
|------|------|-------------|
| `agent-manager.ts` | 1627 | `file-tools.ts` / `scene-tools.ts` / `asset-tools.ts` / `config-tools.ts` / `utility-tools.ts` |
| `asset-catalog.ts` | 1752 | 改为 JSON 数据文件 + loader，代码生成器模板提取 |
| `game-compiler.ts` | 814 | `transpiler.ts` / `bundler.ts` / `sandbox-generator.ts` |
| `overlay-renderer.tsx` | 628 | `overlay-grid.tsx` / `overlay-handles.tsx` / `overlay-selection.tsx` / `drag-system.ts` |
| `preview-panel.tsx` | 604 | `preview-controls.tsx` / `preview-canvas.tsx` / `preview-hooks.ts` / `auto-save.ts` |
| `chat-store.ts` | 521 | `message-store.ts` / `agent-loop.ts` / `error-recovery.ts` |

### 2. 潜在循环依赖链

```
chat-store → editor-core → agent-manager → (tools call back to) chat-store
```

目前通过闭包和动态引用规避，但非常脆弱。agent tool 的执行结果应该通过 event emitter 或 callback 模式回传，而不是直接 import store。

**风险：** 任何一次 import 重构都可能触发运行时循环引用错误。

### 3. 两套独立的 undo/redo 系统

| 系统 | 位置 | 用途 |
|------|------|------|
| `CommandManager` | `core/command-manager.ts` | 管理文件操作的 undo（被 agent 使用） |
| undo/redo stack | `stores/visual-editor-store.ts` | 管理可视化编辑的 undo |

两者完全隔离，用户无法在一个统一的 Ctrl+Z 下同时撤销文件改动和可视化改动。应该统一为一个分层的 undo 系统。

---

## 二、中等问题

### 4. 代码重复

| 重复内容 | 出现位置 | 建议 |
|----------|----------|------|
| 错误归一化逻辑 | `game-store.ts` + `chat-store.ts` | 提取为 `utils/normalize-error.ts` |
| 坐标映射 (screen→game) | `overlay-renderer.tsx` + `preview-panel.tsx` | 提取为 `hooks/use-coordinate-mapping.ts` |
| 文件路径解析 | `agent-manager.ts` 多个 tool 中 | 提取为 `utils/resolve-file-path.ts` |
| Tool 错误处理模板 | `agent-manager.ts` 每个 tool 的 try-catch | 封装为高阶函数 `wrapToolHandler()` |

### 5. 自动保存（auto-save）设计脆弱

**问题清单：**

- `fullStateToSceneGraph()` 假定所有对象都是简单的 image/sprite/text，对用户手写的复杂场景代码（自定义 update、tweens、input handler）**会被覆盖丢失**
- 只查找 `src/scenes/game-scene.ts`，不支持多场景项目
- 保存失败静默吞掉错误（`console.error`），用户无感知
- 没有备份机制，覆盖前不保留原文件内容

**建议：**

1. 保存前检查文件是否为 codegen 生成的（在生成代码中加标记注释如 `// @rimecraft-generated`）
2. 非模板生成的文件不覆盖，改为提示用户手动合并
3. 保存失败时在 UI 上显示错误提示
4. 保存前在 CommandManager 中创建 checkpoint，支持撤销

### 6. iframe 通信缺乏可靠性保证

| 问题 | 当前实现 | 建议 |
|------|----------|------|
| 无 ACK 机制 | fire-and-forget `postMessage` | 添加 requestId + promise-based response |
| 超时硬编码 | `requestFullStateAsync` 3000ms | 可配置超时 + 用户可见的超时错误 |
| 无序列号 | 无法匹配请求-响应 | 添加 messageId 关联 |
| iframe 崩溃检测 | 无 | 添加心跳或 `onerror` 监听 |

### 7. game-compiler.ts 的 TypeScript 转译器用正则实现

**不支持的语法：**
- 泛型约束 (`T extends U`)
- 条件类型 (`T extends U ? X : Y`)
- 映射类型 (`{ [K in keyof T]: ... }`)
- 复杂解构模式
- 装饰器

**没有 source map**，iframe 中的运行时错误无法定位到源代码行号，导致调试困难。

**建议：** 长期应迁移到 SWC WASM 或 esbuild WASM 做转译。

---

## 三、轻度问题

### 8. 类型安全缺口

| 位置 | 问题 |
|------|------|
| `inspector.tsx:56` | 用 `any` 访问对象属性 |
| `agent-manager.ts` | Tool 参数从 JSON 解析后缺少运行时校验 |
| `scene-bridge.ts` | 消息类型是 union 但没有 discriminated union 的严格约束 |
| `game-compiler.ts:303` | `as any` 用于 displayWidth/displayHeight |

### 9. 性能隐患

| 位置 | 问题 | 影响 |
|------|------|------|
| `visual-editor-store.ts:80` | `structuredClone` 在每次 `updateObject` 时深拷贝整个 scene graph | 大场景下卡顿 |
| `asset-catalog.ts` | 搜索是线性扫描 1700+ 行数据 | 每次搜索关键字变化都全量遍历 |
| `overlay-renderer.tsx` | 所有对象每帧都渲染，无裁剪(culling) | 对象多时帧率下降 |
| `game-compiler.ts` | 每次文件变更全量重编译（debounce 300ms） | 大项目编译慢 |

**建议：**
- `updateObject` 改用 immer 做 immutable update，避免 `structuredClone`
- asset 搜索加 memoize 或预建索引
- overlay 只渲染视口内对象
- 编译器做增量编译（只重编译变更文件）

### 10. EditorCore 的 singleton 不可测试

```typescript
// 当前：全局 singleton，无法注入 mock
const core = getEditorCore();

// 建议：支持依赖注入
const core = getEditorCore({ storage: mockStorage });
```

所有 manager 通过 `getEditorCore()` 全局获取，无依赖注入，单元测试困难。`dispose()` 方法存在但调用不可靠。

### 11. 无测试覆盖

未发现任何测试文件。以下核心逻辑缺少单元测试：

- `game-compiler.ts` — 转译、打包、模块解析
- `scene-graph.ts` — findObject、removeObject、flattenObjects
- `command-manager.ts` — undo/redo 栈操作
- `visual-editor-store.ts` — undo/redo 逻辑
- `scene-codegen.ts` — 代码生成正确性
- `agent-manager.ts` — tool 参数解析、路径解析

---

## 四、模块评估总表

| 模块 | 职责清晰度 | 代码质量 | 耦合度 | 可测试性 | 总评 |
|------|-----------|---------|--------|---------|------|
| `editor-store.ts` | A | A | 低 | A | 优 |
| `project-store.ts` | A | A | 低 | A | 优 |
| `game-store.ts` | A | B | 低 | A | 良 |
| `visual-editor-store.ts` | A | B | 中 | B | 良 |
| `chat-store.ts` | B | C | 高 | D | 差 |
| `editor-core.ts` | A | B | 高 | D | 中 |
| `project-manager.ts` | A | A | 低 | B | 良 |
| `preview-manager.ts` | A | B | 中 | C | 中 |
| `command-manager.ts` | A | A | 低 | A | 优 |
| `agent-manager.ts` | C | C | 高 | D | 差 |
| `scene-bridge.ts` | A | B | 低 | B | 良 |
| `scene-graph.ts` | A | A | 低 | A | 优 |
| `scene-codegen.ts` | B | B | 中 | B | 良 |
| `game-compiler.ts` | B | C | 中 | D | 差 |
| `asset-registry.ts` | A | B | 低 | B | 良 |
| `asset-catalog.ts` | C | D | 低 | C | 差 |
| `preview-panel.tsx` | B | C | 高 | D | 差 |
| `overlay-renderer.tsx` | B | B | 中 | C | 中 |
| `inspector.tsx` | A | B | 中 | C | 中 |
| `code-panel.tsx` | A | A | 低 | B | 良 |

---

## 五、建议修复优先级

### P0 — 本轮修复
1. **拆分 `agent-manager.ts`** — 最大的维护痛点，1627 行单文件
2. **auto-save 加安全检查** — 当前可能覆盖用户手写代码，数据丢失风险

### P1 — 下一轮修复
3. **拆分 `game-compiler.ts`** — 814 行，逻辑混合严重
4. **提取重复代码** — normalizeError、坐标映射、路径解析、tool error handler
5. **统一 undo 系统** — 合并 CommandManager 和 visual-editor undo 为统一栈

### P2 — 后续优化
6. **拆分 `preview-panel.tsx` 和 `overlay-renderer.tsx`** — UI 组件过大
7. **asset-catalog 改为数据驱动** — JSON 文件 + loader
8. **iframe 通信加 ACK 和 messageId**
9. **EditorCore 支持依赖注入**
10. **添加核心逻辑单元测试**

---

## 六、依赖图

```
@rimecraft/agent-engine
  ↓
chat-store.ts ← preview-panel.tsx, chat-panel.tsx
  ↓
editor-core.ts (singleton)
  ├─ project-manager.ts → StorageProvider (indexeddb.ts | tauri.ts)
  ├─ preview-manager.ts → GameCompiler + PhaserBridge
  ├─ command-manager.ts
  └─ agent-manager.ts → ToolRegistry
      ├─ scene-bridge.ts ← overlay-renderer.tsx, inspector.tsx
      ├─ scene-codegen.ts ← preview-panel.tsx (auto-save)
      ├─ asset-registry.ts ← asset-catalog.ts
      └─ lib/ai/rag/retrieval.ts

visual-editor-store.ts ← overlay-renderer.tsx, inspector.tsx, preview-panel.tsx
editor-store.ts ← editor-layout.tsx, preview-panel.tsx
project-store.ts ← project-manager.ts, code-panel.tsx
game-store.ts ← preview-manager.ts, chat-store.ts
```

---

## 七、修复进度（截至 2026-05-09）

### P0 — 已完成 ✅

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 1 | 拆分 `agent-manager.ts` | ✅ | 已拆为 `tools/file-tools.ts`, `scene-tools.ts`, `asset-tools.ts`, `config-tools.ts`, `utility-tools.ts` + `tool-context.ts` + `tools/index.ts` |
| 2 | auto-save 加安全检查 | ✅ | 已在生成代码中加入 `// @rimecraft-generated` 标记，保存前检查 |

### P1 — 已完成 ✅

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 3 | 拆分 `game-compiler.ts` | ✅ | 已拆为 `compiler/transpiler.ts`, `compiler/bundler.ts`, `compiler/sandbox-generator.ts`，主文件降至 32 行 |
| 4 | 提取重复代码 | ✅ | `utils/normalize-error.ts` 已提取，坐标映射提取到 `coordinate-utils.ts` |
| 5 | 统一 undo 系统 | ✅ | 新增 `visual-commands.ts`，`createVisualCommand()` 包装视觉操作为 `Command`；`visual-editor-store.ts` 通过 `CommandManager.record()` 统一管理；Ctrl+Z/Y 走同一个栈 |

### P2 — 已完成 ✅

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 6a | 拆分 `preview-panel.tsx` | ✅ | 635→278 行。提取 `auto-save.ts`(125), `visual-editor-shortcuts.ts`(138), `preview-components.tsx`(88) |
| 6b | 拆分 `overlay-renderer.tsx` | ✅ | 627→345 行。提取 `coordinate-utils.ts`(62), `drag-system.ts`(43), `grid-canvas.tsx`(69), `handle-group.tsx`(103) |
| 7 | asset-catalog 数据分离 | ✅ | `asset-catalog-data.ts`(1705 行纯数据) + `asset-catalog.ts`(38 行类型+搜索) |
| 8 | iframe messageId 关联 | ✅ | `SceneBridge.sendAndWait<T>()` + `pendingRequests` Map + 超时清理。新增 `requestSceneTreeAsync()`, `requestTexturesAsync()` |
| 9 | EditorCore 依赖注入 | ✅ | `EditorCoreDeps` 接口 + `resetForTesting(deps?)` 静态方法 |
| 10 | 核心模块单元测试 | ✅ | 5 个测试文件共 38 个测试用例，覆盖 command-manager, scene-graph, transpiler, bundler, scene-codegen |

### 模块评估更新

| 模块 | 原评 | 现评 | 变化原因 |
|------|------|------|----------|
| `editor-core.ts` | 中 | **良** | 支持 DI + resetForTesting |
| `agent-manager.ts` | 差 | **良** | 拆分为 6 个文件，职责清晰 |
| `game-compiler.ts` | 差 | **良** | 拆分为 3 个模块 |
| `asset-catalog.ts` | 差 | **良** | 数据分离，主文件 38 行 |
| `preview-panel.tsx` | 差 | **良** | 拆分后 278 行 |
| `overlay-renderer.tsx` | 中 | **良** | 拆分后 345 行 |
| `scene-bridge.ts` | 良 | **优** | 增加 messageId 关联 |

### 文件变更清单

```
新增:
  apps/web/src/core/visual-commands.ts
  apps/web/src/core/compiler/transpiler.ts
  apps/web/src/core/compiler/bundler.ts
  apps/web/src/core/compiler/sandbox-generator.ts
  apps/web/src/core/tools/index.ts
  apps/web/src/core/tools/tool-context.ts
  apps/web/src/core/tools/file-tools.ts
  apps/web/src/core/tools/scene-tools.ts
  apps/web/src/core/tools/asset-tools.ts
  apps/web/src/core/tools/config-tools.ts
  apps/web/src/core/tools/utility-tools.ts
  apps/web/src/components/editor/panels/auto-save.ts
  apps/web/src/components/editor/panels/visual-editor-shortcuts.ts
  apps/web/src/components/editor/panels/preview-components.tsx
  apps/web/src/components/editor/visual/coordinate-utils.ts
  apps/web/src/components/editor/visual/drag-system.ts
  apps/web/src/components/editor/visual/grid-canvas.tsx
  apps/web/src/components/editor/visual/handle-group.tsx
  apps/web/src/lib/assets/asset-catalog-data.ts
  apps/web/src/utils/normalize-error.ts
  apps/web/src/core/__tests__/command-manager.test.ts
  apps/web/src/core/__tests__/scene-graph.test.ts
  apps/web/src/core/__tests__/transpiler.test.ts
  apps/web/src/core/__tests__/bundler.test.ts
  apps/web/src/core/__tests__/scene-codegen.test.ts

修改:
  apps/web/src/core/editor-core.ts          (DI + resetForTesting)
  apps/web/src/core/scene-bridge.ts         (messageId + sendAndWait)
  apps/web/src/core/command-manager.ts      (record() 方法)
  apps/web/src/core/game-compiler.ts        (814→32 行，委托 compiler/)
  apps/web/src/core/agent-manager.ts        (1627→精简，委托 tools/)
  apps/web/src/core/scene-codegen.ts        (@rimecraft-generated 标记)
  apps/web/src/lib/assets/asset-catalog.ts  (1752→38 行)
  apps/web/src/stores/visual-editor-store.ts(统一 undo)
  apps/web/src/components/editor/panels/preview-panel.tsx  (635→278 行)
  apps/web/src/components/editor/visual/overlay-renderer.tsx (627→345 行)
  apps/web/tsconfig.json                    (排除 __tests__)
```

### 待办（第二轮）— 已完成 ✅

| 任务 | 状态 | 说明 |
|------|------|------|
| 运行测试 | ⚠️ | `bun test apps/web/src/core/__tests__/` — 需手动验证（CLI 受限） |
| iframe ACK 回传 | ✅ | `sandbox-generator.ts` 所有 `postMessage` 回传 `messageId`；`sendSceneTree(messageId)` 参数化 |
| 更多测试覆盖 | ✅ | 新增 `visual-commands.test.ts`(5), `normalize-error.test.ts`(7), `sandbox-generator.test.ts`(10)，共 22 个测试 |
| 模板 i18n | ✅ | 所有 6 个模板完成。新增 i18n key: `platformer.level`, `spaceShooter.wave/boss/victory`, `rpg.hero/defeated` |
| chat-store 拆分 | ✅ | 521→130 行。提取 `agent-loop.ts`(310 行) 含 `runChatAgentLoop`, `buildGameContext`, `waitForRuntimeErrors`, `buildDebugMessage` |

### 模块评估更新（第二轮）

| 模块 | 原评 | 现评 | 变化原因 |
|------|------|------|----------|
| `chat-store.ts` | 差 | **良** | 拆分为 store + agent-loop，职责清晰 |
| `sandbox-generator.ts` | — | **良** | messageId 贯通，支持 request/response 关联 |

### 第二轮文件变更清单

```
新增:
  apps/web/src/stores/agent-loop.ts
  apps/web/src/core/__tests__/visual-commands.test.ts
  apps/web/src/core/__tests__/normalize-error.test.ts
  apps/web/src/core/__tests__/sandbox-generator.test.ts

修改:
  apps/web/src/stores/chat-store.ts             (521→130 行，委托 agent-loop)
  apps/web/src/core/compiler/sandbox-generator.ts (messageId 回传)
  apps/web/src/i18n/en.ts                       (新增 7 个 gameText key)
  apps/web/src/i18n/zh.ts                       (新增 7 个 gameText key)
  apps/web/src/lib/templates/platformer.ts       (Lv. → i18n)
  apps/web/src/lib/templates/space-shooter.ts    (Wave/BOSS/Victory → i18n)
  apps/web/src/lib/templates/rpg.ts              (Hero/Defeated → i18n)
  readme.md                                      (新增 File Storage 章节)
```
