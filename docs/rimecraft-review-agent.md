# Rimecraft vs Rimecut Agent 系统对比与设计概要

## Context

对比 Rimecraft（游戏开发）和 Rimecut（视频剪辑）两个项目的 agent 系统，寻找可借鉴的设计。两者同属一个团队产出，技术栈一致（TypeScript + React + Zustand），架构模式高度相似（单 agent + 专家角色切换 + 工具注册），但在实现细节上各有特色。

---

## 一、架构对比总览

| 维度 | Rimecraft | Rimecut |
|------|-----------|---------|
| **领域** | 2D 游戏开发（Phaser 4） | 视频剪辑（Timeline） |
| **核心架构** | 单 agent + 6 角色切换 | 单 agent + 6 角色切换 |
| **Agent Engine** | 独立 package (`packages/agent-engine/`) | 内嵌 web app (`apps/web/src/lib/ai/agent/`) |
| **service.ts** | **522 行**（含内联 Phaser 知识库） | **154 行**（职责单一） |
| **专家角色** | director/design/coding/asset/gameplay/debug | general/design/audio/editing/story/director |
| **工具数量** | 20+ (游戏文件/编译/预览/资产) | 25+ (时间线/音频/特效/转场) |
| **LLM 通信** | OpenAI 兼容 API，流式 SSE | OpenAI 兼容 API，流式 SSE + **平台路由** |
| **状态管理** | `chat-store.ts` (430 行) | `agent-store.ts` (377 行) |
| **上下文注入** | RAG 系统 (Phaser 模式/API 匹配) | **每轮序列化 Timeline 状态** |
| **沙箱/运行时** | Phaser iframe + Bridge + 编译器 | 无（直接操作 EditorCore） |
| **错误处理** | 运行时错误检测 + 自动切 debug 角色 | 工具失败返回 **suggestion 字段** |
| **Undo/Redo** | CommandManager（全局栈） | **Turn-level checkpoint**（按对话轮回滚） |
| **ID 解析** | 精确路径 | **模糊匹配**（完整 ID/8 字符前缀/名称/序号） |
| **流式渲染** | 直接更新 store | **RAF debouncing** 优化 |

---

## 二、关键文件对照

### Agent 核心循环

| | Rimecraft | Rimecut |
|---|-----------|---------|
| 主循环 | `packages/agent-engine/src/service.ts` (522L) | `apps/web/src/lib/ai/agent/service.ts` (154L) |
| 类型定义 | `packages/agent-engine/src/types.ts` (65L) | `apps/web/src/lib/ai/agent/types.ts` (82L) |
| LLM 客户端 | `packages/agent-engine/src/llm-client.ts` (54L) | `llm-client.ts` (18L) + `llm-backend.ts` (185L) |
| 角色定义 | `packages/agent-engine/src/expert-roles.ts` (150L) | `expert-roles.ts` (77L) |
| 工具注册 | `packages/agent-engine/src/tool-registry.ts` (52L) | `tool-registry.ts` (47L) |
| 工具实现 | `apps/web/src/core/agent-manager.ts` (1289L) | `tools.ts` (862L) |
| 状态 store | `apps/web/src/stores/chat-store.ts` (430L) | `stores/agent-store.ts` (377L) |

### Rimecraft 独有

| 文件 | 功能 |
|------|------|
| `core/game-compiler.ts` (200+L) | TS→JS 编译 + 模块打包 |
| `core/preview-manager.ts` (105L) | Phaser iframe 生命周期 |
| `packages/phaser-runtime/src/bridge.ts` (112L) | iframe ↔ 主窗口 IPC |
| `lib/ai/rag/retrieval.ts` (111L) | Phaser 模式/API RAG 检索 |

### Rimecut 独有

| 文件 | 功能 |
|------|------|
| `lib/ai/agent/llm-backend.ts` (185L) | LLM 后端抽象 + **平台检测**(Tauri/Web/Mobile) |
| `lib/ai/agent/id-resolver.ts` (88L) | **模糊 ID 解析**（支持 4 种匹配模式） |
| `lib/ai/agent/overlap-detector.ts` (37L) | **重叠检测** + 建议替代位置 |
| `lib/ai/agent/timeline-context.ts` (111L) | **每轮**完整序列化 Timeline 上下文 |
| `lib/ai/agent/unit-convert.ts` (10L) | 秒 ↔ ticks 单位转换 |

---

## 三、Rimecut 的亮点设计（可借鉴）

### 3.1 LLM 后端平台路由 ⭐⭐⭐

**Rimecut**: `llm-backend.ts` 的 `shouldUseDirect()` 自动检测运行环境：
- Web → 走 `/api/ai/chat` 代理
- Tauri/Mobile → 直连 LLM API

**Rimecraft 现状**: `service.ts` 硬编码走代理或直连，Tauri 和 Web 的路由逻辑散落在多处。

**建议**: 抽取一个统一的 `LLMBackend` 类，封装平台检测和路由逻辑。

**涉及文件**:
- `packages/agent-engine/src/service.ts` — 提取 LLM 调用逻辑
- 新增 `packages/agent-engine/src/llm-backend.ts`

### 3.2 Turn-level Undo（按对话轮回滚）⭐⭐⭐

**Rimecut**: 每条 assistant 消息携带 `commandCheckpoint`（记录此轮开始前的 command 历史位置）。用户可以一键撤销整轮 agent 操作。

```typescript
// agent-store.ts:147
const checkpoint = EditorCore.getInstance().command.historyLength;
// 存入 assistant 消息的 commandCheckpoint 字段

// 撤销时：回退到 checkpoint 位置
undoTurn(checkpointMessageId, turnStartMessageId)
```

**Rimecraft 现状**: 有 `CommandManager` 的 undo/redo，但粒度是单步操作，没有"撤销一整轮 agent 对话"的概念。

**建议**: 在 `chat-store.ts` 的 agent 循环开始时记录 checkpoint，assistant 消息中存储，UI 上加"撤销本轮"按钮。

**涉及文件**:
- `apps/web/src/stores/chat-store.ts` — 记录/使用 checkpoint
- `apps/web/src/core/command-manager.ts` — 暴露 historyLength

### 3.3 每轮状态上下文序列化 ⭐⭐

**Rimecut**: 每次 agent 迭代前，调用 `buildTimelineContext()` 序列化完整 Timeline 状态（画布、播放头、所有轨道/元素），注入 system prompt。

**Rimecraft 现状**: 通过 `list_files` 工具列出文件，通过 `get_game_state` 工具获取运行时状态。但 agent 不会主动调用，需要 prompt 提醒。

**建议**: 每轮迭代前自动构建游戏上下文摘要（当前场景列表、最近编译状态、最近运行时错误），作为 system prompt 的一部分注入，而不是依赖 agent 主动调用工具。

**涉及文件**:
- 新增 `packages/agent-engine/src/game-context.ts` 或在 `agent-manager.ts` 中添加
- `packages/agent-engine/src/service.ts` — system prompt 构建时注入

### 3.4 工具失败 Suggestion 机制 ⭐⭐

**Rimecut**: 工具执行失败时返回具体建议：

```typescript
return {
  success: false,
  message: "Element overlaps with existing element",
  data: { suggestedStartTime: 5.2 }  // 建议替代值
};
```

**Rimecraft 现状**: 工具失败只返回错误消息文本。

**建议**: 在 `compile_game`、`preview_game` 等工具失败时，附带结构化修复建议。

**涉及文件**:
- `apps/web/src/core/agent-manager.ts` — 工具返回值增加 suggestion

### 3.5 模糊 ID 解析 ⭐

**Rimecut**: `id-resolver.ts` 支持 4 种 ID 匹配模式（完整 ID、8 字符前缀、名称、序号）。

**Rimecraft 适用场景**: 当 agent 需要引用特定 Scene 或 Game Object 时，模糊匹配可以减少精确 ID 查找的工具调用次数。

**建议**: 在 `search_files` 或未来的 `find_scene` 工具中加入模糊匹配。

### 3.6 流式渲染 RAF Debouncing ⭐

**Rimecut**: 用 `requestAnimationFrame` 对流式文本更新做节流，避免频繁 re-render。

**Rimecraft 现状**: 每个 text_delta 事件直接更新 Zustand store。

**建议**: 在 `chat-store.ts` 的流式处理中加 RAF debouncing。

**涉及文件**:
- `apps/web/src/stores/chat-store.ts` — 流式更新逻辑

---

## 四、Rimecraft 的独有优势（不需要从 Rimecut 借鉴）

| 能力 | 说明 |
|------|------|
| **RAG 系统** | Phaser 4 模式/API 检索注入，Rimecut 没有 |
| **运行时错误检测循环** | 编译→预览→检测错误→自动切 debug 角色→迭代修复 |
| **错误签名去重** | 避免同一错误无限循环 |
| **游戏编译管线** | 完整的 TS→JS 打包 + 模块系统 |
| **Phaser 沙箱** | iframe 隔离运行 + Bridge IPC |
| **独立 Agent Engine 包** | 与 UI 解耦，可复用 |

---

## 五、关于核心痛点（Agent 交付带错误代码）

对比两个系统后发现，**Rimecut 不存在类似痛点**——因为视频剪辑工具操作立即生效，没有"编译→运行→可能出错"的环节。

因此，这个痛点的解决方案应从 **Rimecraft 自身的错误检测循环入手强化**，而非从 Rimecut 借鉴：

### 强化方向（不在本次对比范围，但值得后续单独实现）
1. **硬性验证 Gate**: engine 层面——有 `write_file` 就必须 `compile_game` + `preview_game` 通过才能结束
2. **结构化 Debug Prompt**: 切 debug 角色时注入错误上下文 + 修改历史 + 调试步骤模板
3. **已知错误模式库**: Phaser 4 常见错误 → 预置修复建议，加速调试循环
4. **反思提示注入**: 每轮工具执行后注入"请评估目标是否达成"的 system 消息

---

## 六、推荐实施优先级

```
P0（高价值，低成本）
  ├─ 3.2 Turn-level Undo — 用户体验显著提升
  ├─ 3.3 每轮状态上下文注入 — 减少 agent 盲目操作
  └─ 3.6 RAF 流式节流 — 性能优化

P1（中等价值）
  ├─ 3.1 LLM 后端平台路由 — 代码整洁度
  ├─ 3.4 工具 Suggestion 机制 — 辅助 agent 自纠
  └─ 3.5 模糊 ID 解析 — 减少工具调用次数

单独立项（核心痛点，需独立设计）
  └─ 强化错误检测+调试循环（验证 Gate + Debug Prompt + 错误模式库 + 反思协议）
```

---

## 七、验证方式

- Turn-level Undo: 让 agent 做一轮修改 → 点击"撤销本轮" → 确认文件恢复
- 状态注入: 观察 system prompt 是否包含游戏状态摘要
- RAF 节流: Chrome DevTools Performance 面板对比流式渲染帧率
- Suggestion: 构造一个编译失败场景，确认工具返回建议字段
