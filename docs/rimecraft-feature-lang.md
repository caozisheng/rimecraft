# Rimecraft 多语言 (i18n) 设计方案

## 1. 现状分析

| 分类 | 文件数 | 预估字符串数 | 说明 |
|------|--------|-------------|------|
| UI 组件 | 8 | ~150 | chat-panel, editor-toolbar, preview-panel, code-panel, asset-library-dialog 等 |
| 欢迎页/模板选择 | 1 | ~50 | welcome-screen.tsx |
| 游戏模板 | 5 | ~100 | endless-runner, platformer, puzzle, rpg, space-shooter |
| 素材目录 | 1 | ~150 | asset-catalog.ts（已有 `nameZh` 字段） |
| 状态管理 | 2 | ~80 | chat-store.ts, agent-manager.ts |
| Agent 系统提示词 | 2 | ~400 | service.ts, expert-roles.ts |
| API/错误/存储 | 4 | ~30 | route.ts, tauri.ts, indexeddb.ts, layout.tsx |
| **合计** | **21** | **~860+** | |

当前状态：
- 所有用户可见文本均为硬编码中文
- 无任何 i18n 库依赖
- `asset-catalog.ts` 已有 `nameZh` 字段，说明双语曾被部分考虑
- 技术栈：Next.js 16 + React 19 + Zustand + Tailwind

---

## 2. 技术选型

### 方案对比

| 维度 | next-intl | react-i18next | 自研轻量方案 |
|------|-----------|--------------|-------------|
| Next.js 集成 | 原生支持 App Router | 需手动配置 | 需完全自建 |
| 包体积 | ~14KB | ~40KB (i18next + react-i18next) | <5KB |
| 复数/日期格式化 | 内置 ICU | 内置 ICU | 需手动 |
| SSR/RSC 支持 | 原生 | 需额外插件 | 需手动 |
| 社区生态 | Next.js 官方推荐 | 最大社区 | 无 |
| 学习成本 | 低 | 中 | 低（但维护成本高） |

### 决策：采用分层方案

```
┌─────────────────────────────────────────────┐
│  Web App 层 — next-intl                     │
│  (UI 组件、欢迎页、错误提示、布局元数据)       │
├─────────────────────────────────────────────┤
│  Agent Engine 层 — 轻量 getPrompt(locale)    │
│  (系统提示词、角色定义、工具描述)              │
├─────────────────────────────────────────────┤
│  游戏运行时层 — 模板内嵌 i18n 字典            │
│  (游戏内 UI 文本、开始/结束画面)              │
└─────────────────────────────────────────────┘
```

**理由**：
- Web App 用 `next-intl`，与 Next.js App Router 无缝集成，支持 RSC
- Agent Engine 是独立 npm 包，不应依赖 React，用纯函数 `getPrompt(locale, key)` 即可
- 游戏模板生成的是运行时代码，翻译需要内嵌到生成的游戏代码中

---

## 3. 目录结构

```
apps/web/
├── messages/                          # next-intl 翻译文件
│   ├── zh.json                        # 中文（默认）
│   └── en.json                        # English
├── src/
│   ├── i18n/
│   │   ├── request.ts                 # next-intl 服务端配置
│   │   ├── routing.ts                 # 路由配置（/zh, /en）
│   │   └── navigation.ts             # 国际化导航 hooks
│   ├── app/
│   │   └── [locale]/                  # 动态 locale 路由段
│   │       ├── layout.tsx
│   │       └── page.tsx
│   └── ...

packages/agent-engine/
├── src/
│   ├── locales/
│   │   ├── zh.ts                      # 中文提示词 & 角色定义
│   │   └── en.ts                      # English prompts & roles
│   ├── locale.ts                      # getPrompt() / getRole() 函数
│   └── ...
```

---

## 4. 翻译文件结构

### 4.1 Web App — `messages/zh.json`

采用**扁平命名空间**，按功能模块分组：

```jsonc
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "copy": "复制",
    "copied": "已复制",
    "loading": "加载中...",
    "error": "错误",
    "upload": "上传",
    "search": "搜索",
    "back": "返回",
    "settings": "设置"
  },

  "welcome": {
    "tagline": "用对话创造你的 2D 游戏世界",
    "inputPlaceholder": "给你的游戏起个名字...",
    "openProject": "打开项目",
    "importFile": "导入 .rimecraft 文件",
    "creating": "正在创建项目...",
    "footer": "RimeCraft v{version} — 面向青少年的 AI 对话式 2D 游戏开发工具",

    "templates": {
      "endlessRunner": "无尽跑酷",
      "platformer": "平台跳跃",
      "spaceShooter": "太空射击",
      "rpg": "RPG 冒险",
      "puzzle": "解谜益智",
      "blank": "空白项目"
    }
  },

  "toolbar": {
    "home": "首页",
    "backHome": "返回首页",
    "import": "导入",
    "code": "代码",
    "assetLib": "素材库",
    "export": "导出",
    "exporting": "导出中..."
  },

  "chat": {
    "welcomeTitle": "欢迎来到 RimeCraft!",
    "inputPlaceholder": "描述你的游戏想法...",
    "thinking": "正在思考...",
    "switchRole": "切换角色",
    "stopGenerating": "停止生成",
    "iteration": "第 {current}/{max} 轮",
    "undoSuccess": "已回滚到此检查点，Agent 的所有操作已撤销",
    "undoFailed": "回滚失败",
    "sendFailed": "发送消息失败: {message}"
  },

  "preview": {
    "play": "播放",
    "pause": "暂停",
    "restart": "重启",
    "fullscreen": "全屏",
    "errorCount": "{count} 个错误",
    "copyErrors": "复制错误信息",
    "emptyState": "创建游戏后，预览将在这里显示"
  },

  "codePanel": {
    "title": "代码编辑器",
    "saving": "保存中...",
    "noFiles": "暂无文件",
    "editorLoading": "编辑器加载中...",
    "selectFile": "在左侧选择文件来查看代码"
  },

  "assetLib": {
    "title": "素材库",
    "subtitle": "浏览内置素材或添加自定义素材，点击卡片查看详情",
    "searchPlaceholder": "搜索素材...",
    "sendToChat": "发送到对话",
    "noResults": "未找到匹配的素材",

    "categories": {
      "all": "全部",
      "character": "角色",
      "environment": "环境",
      "prop": "道具",
      "effect": "特效",
      "shape": "形状",
      "background": "背景",
      "particle": "粒子",
      "mine": "我的"
    }
  },

  "agent": {
    "runtimeErrors": "游戏预览检测到 {count} 个运行时错误",
    "stillErrors": "仍有 {count} 个运行时错误未修复",
    "maxIterations": "Agent 已达到最大迭代次数 ({max}) 但仍有 {count} 个运行时错误",
    "retryHint": "发送"修复错误"可以让 AI 重新尝试。",
    "debugHint": "请：1. 用 read_file 查看相关代码 2. 分析错误原因 3. 用 write_file/patch_file 修复",
    "switchedRole": "已切换到角色: {role}",
    "noProject": "没有打开的项目"
  },

  "api": {
    "configMissing": "请先在 LLM Settings 中配置 API Base URL 和 API Key",
    "httpError": "API 返回 {status}: {body}",
    "networkError": "无法连接到 {url}: {message}"
  }
}
```

### 4.2 Web App — `messages/en.json`

```jsonc
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "copy": "Copy",
    "copied": "Copied",
    "loading": "Loading...",
    "error": "Error",
    "upload": "Upload",
    "search": "Search",
    "back": "Back",
    "settings": "Settings"
  },

  "welcome": {
    "tagline": "Create your 2D game world through conversation",
    "inputPlaceholder": "Name your game...",
    "openProject": "Open Project",
    "importFile": "Import .rimecraft file",
    "creating": "Creating project...",
    "footer": "RimeCraft v{version} — AI-powered 2D game creation tool for young creators",

    "templates": {
      "endlessRunner": "Endless Runner",
      "platformer": "Platformer",
      "spaceShooter": "Space Shooter",
      "rpg": "RPG Adventure",
      "puzzle": "Puzzle",
      "blank": "Blank Project"
    }
  },

  "toolbar": {
    "home": "Home",
    "backHome": "Back to Home",
    "import": "Import",
    "code": "Code",
    "assetLib": "Assets",
    "export": "Export",
    "exporting": "Exporting..."
  },

  "chat": {
    "welcomeTitle": "Welcome to RimeCraft!",
    "inputPlaceholder": "Describe your game idea...",
    "thinking": "Thinking...",
    "switchRole": "Switch Role",
    "stopGenerating": "Stop",
    "iteration": "Round {current}/{max}",
    "undoSuccess": "Rolled back to checkpoint. All agent changes have been reverted.",
    "undoFailed": "Rollback failed",
    "sendFailed": "Failed to send: {message}"
  },

  "preview": {
    "play": "Play",
    "pause": "Pause",
    "restart": "Restart",
    "fullscreen": "Fullscreen",
    "errorCount": "{count} error(s)",
    "copyErrors": "Copy Errors",
    "emptyState": "Game preview will appear here after creation"
  },

  "codePanel": {
    "title": "Code Editor",
    "saving": "Saving...",
    "noFiles": "No files yet",
    "editorLoading": "Loading editor...",
    "selectFile": "Select a file on the left to view code"
  },

  "assetLib": {
    "title": "Asset Library",
    "subtitle": "Browse built-in assets or add custom ones. Click a card for details.",
    "searchPlaceholder": "Search assets...",
    "sendToChat": "Send to Chat",
    "noResults": "No matching assets found",

    "categories": {
      "all": "All",
      "character": "Characters",
      "environment": "Environment",
      "prop": "Props",
      "effect": "Effects",
      "shape": "Shapes",
      "background": "Backgrounds",
      "particle": "Particles",
      "mine": "My Assets"
    }
  },

  "agent": {
    "runtimeErrors": "Game preview detected {count} runtime error(s)",
    "stillErrors": "{count} runtime error(s) remain unfixed",
    "maxIterations": "Agent reached max iterations ({max}) with {count} error(s) remaining",
    "retryHint": "Send \"fix errors\" to let AI retry.",
    "debugHint": "Please: 1. Read related code with read_file 2. Analyze the error 3. Fix with write_file/patch_file",
    "switchedRole": "Switched to role: {role}",
    "noProject": "No project is open"
  },

  "api": {
    "configMissing": "Please configure API Base URL and API Key in LLM Settings first",
    "httpError": "API returned {status}: {body}",
    "networkError": "Cannot connect to {url}: {message}"
  }
}
```

### 4.3 Agent Engine — `packages/agent-engine/src/locales/zh.ts`

```typescript
export default {
  systemPrompt: {
    header: "你是 RimeCraft AI 游戏开发助手...",
    codeRules: "## Phaser 4 代码生成规则\n...",
    errorHandling: "## ⚠️ 运行时错误处理规则（最高优先级）\n...",
    workRules: [
      "使用中文回复，语言通俗易懂，避免过于专业的术语",
      "生成代码时自动附带简洁的中文注释，帮助用户理解关键逻辑",
      "如果用户描述模糊，主动提问引导",
      "出错时不要慌，分析原因后修复",
    ],
  },

  roles: {
    director: {
      name: "游戏导师",
      description: "对话入口，解析需求，协调其他角色，用青少年友好语言交流",
      prompt: "...",
    },
    design:   { name: "关卡设计师", /* ... */ },
    coding:   { name: "代码工程师", /* ... */ },
    asset:    { name: "素材管家",   /* ... */ },
    gameplay: { name: "玩法策划",   /* ... */ },
    debug:    { name: "调试医生",   /* ... */ },
  },

  tools: {
    list_files:   { description: "列出项目中所有源代码文件" },
    read_file:    { description: "读取指定文件内容" },
    write_file:   { description: "写入或覆盖指定文件" },
    // ...其余工具
  },
} as const;
```

### 4.4 素材目录 — 利用已有 `nameZh` 扩展

```typescript
// asset-catalog.ts — 改造前
{ id: "player-rect", nameZh: "玩家矩形", category: "character", ... }

// 改造后：添加 nameEn，保留 nameZh
{ id: "player-rect", nameZh: "玩家矩形", nameEn: "Player Rectangle", category: "character", ... }

// 运行时根据 locale 选择
function getAssetName(asset: Asset, locale: Locale): string {
  return locale === "en" ? asset.nameEn : asset.nameZh;
}
```

### 4.5 游戏模板 — 运行时 i18n 字典

游戏模板生成的是可运行的 Phaser 代码，翻译需要内嵌到生成代码中：

```typescript
// 模板生成时注入 i18n 字典
const GAME_TEXT: Record<string, Record<string, string>> = {
  zh: {
    "start": "点击开始游戏",
    "score": "分数",
    "gameOver": "游戏结束",
    "restart": "重新开始",
    "mainMenu": "返回主菜单",
  },
  en: {
    "start": "Click to Start",
    "score": "Score",
    "gameOver": "Game Over",
    "restart": "Restart",
    "mainMenu": "Main Menu",
  },
};

// 在游戏代码中使用
const lang = window.__RIMECRAFT_LOCALE__ || "zh";
const t = (key: string) => GAME_TEXT[lang]?.[key] ?? GAME_TEXT["zh"][key] ?? key;
this.add.text(400, 300, t("start"), { fontSize: "32px" });
```

---

## 5. 语言切换机制

### 5.1 用户侧切换流程

```
                ┌──────────────────────────────┐
                │       Settings 面板           │
                │  ┌────────────────────────┐  │
                │  │  Language / 语言        │  │
                │  │  ○ 中文  ● English     │  │
                │  └────────────────────────┘  │
                └───────────────┬──────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    localStorage          URL 路由切换        Agent Engine
  rimecraft_locale        /zh → /en           locale 参数
                                              传入 runAgentLoop
```

### 5.2 Locale 存储与传播

```typescript
// 1. localStorage 持久化
const LOCALE_KEY = "rimecraft_locale";
type Locale = "zh" | "en";

// 2. Zustand store 提供响应式访问
interface AppState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// 3. 传递给 agent-engine
runAgentLoop({
  messages,
  llmConfig,
  expertRole,
  locale: appStore.locale,  // 新增参数
  // ...
});
```

### 5.3 next-intl 集成要点

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || "zh";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

// 组件中使用
import { useTranslations } from "next-intl";

function ChatPanel() {
  const t = useTranslations("chat");
  return <p>{t("welcomeTitle")}</p>;
  // zh: "欢迎来到 RimeCraft!"
  // en: "Welcome to RimeCraft!"
}

// 带插值
<p>{t("iteration", { current: 3, max: 20 })}</p>
// zh: "第 3/20 轮"
// en: "Round 3/20"
```

---

## 6. Agent 提示词的语言策略

Agent 系统提示词是最特殊的翻译场景——它不是给用户看的 UI 文本，而是发送给 LLM 的指令。

### 策略

| 提示词类型 | 中文 locale | 英文 locale |
|-----------|------------|------------|
| 系统角色设定 | 中文提示词 | 英文提示词 |
| Phaser API 参考 | **保持英文**（API 本身是英文） | 英文 |
| 工具名/参数名 | **保持英文**（function calling 规范） | 英文 |
| 工具描述 | 中文 | 英文 |
| 代码注释指令 | "生成中文注释" | "Generate English comments" |
| 回复语言指令 | "使用中文回复" | "Reply in English" |

```typescript
// packages/agent-engine/src/locale.ts
import zh from "./locales/zh";
import en from "./locales/en";

const locales = { zh, en } as const;

export function getSystemPrompt(locale: Locale): string {
  const l = locales[locale];
  return [
    l.systemPrompt.header,
    l.systemPrompt.codeRules,       // Phaser API 部分中英文混用
    l.systemPrompt.errorHandling,
    l.systemPrompt.workRules.join("\n"),
  ].join("\n\n");
}

export function getRolePrompt(locale: Locale, role: string): string {
  return locales[locale].roles[role]?.prompt ?? "";
}

export function getToolDefinitions(locale: Locale): ToolDefinition[] {
  const l = locales[locale];
  return Object.entries(l.tools).map(([name, def]) => ({
    type: "function",
    function: {
      name,                          // 工具名始终英文
      description: def.description,  // 描述跟随 locale
      parameters: TOOL_SCHEMAS[name],
    },
  }));
}
```

---

## 7. 实施计划

### Phase 1 — 基础设施 (1-2 天)

- [ ] 安装 `next-intl`
- [ ] 创建 `messages/zh.json` 和 `messages/en.json`
- [ ] 配置 `src/i18n/request.ts` 和 App Router `[locale]` 路由
- [ ] 在 Zustand 或 localStorage 中存储 locale 偏好
- [ ] 在 Settings 面板添加语言切换 UI

### Phase 2 — Web App UI 翻译 (2-3 天)

- [ ] 提取所有 UI 组件中的硬编码字符串到 `messages/*.json`
- [ ] 逐文件替换：
  - `chat-panel.tsx` — `useTranslations("chat")`
  - `editor-toolbar.tsx` — `useTranslations("toolbar")`
  - `preview-panel.tsx` — `useTranslations("preview")`
  - `code-panel.tsx` — `useTranslations("codePanel")`
  - `asset-library-dialog.tsx` — `useTranslations("assetLib")`
  - `welcome-screen.tsx` — `useTranslations("welcome")`
  - `layout.tsx` — `useTranslations("meta")`
- [ ] 替换 `chat-store.ts` 和 `agent-manager.ts` 中的系统消息

### Phase 3 — Agent Engine 翻译 (2-3 天)

- [ ] 创建 `packages/agent-engine/src/locales/{zh,en}.ts`
- [ ] 实现 `getSystemPrompt(locale)` / `getRolePrompt(locale, role)`
- [ ] 在 `runAgentLoop` 接口中添加 `locale` 参数
- [ ] 翻译 6 个角色定义的英文版本
- [ ] 翻译系统提示词英文版本（Phaser API 参考部分保持英文）
- [ ] 翻译工具描述的英文版本

### Phase 4 — 素材 & 模板 (1-2 天)

- [ ] 为 `asset-catalog.ts` 的每个素材添加 `nameEn` 字段
- [ ] 素材搜索支持当前 locale 的名称匹配
- [ ] 游戏模板注入 `GAME_TEXT` i18n 字典
- [ ] 游戏预览 iframe 传入 locale 参数

### Phase 5 — 验证 & 完善 (1 天)

- [ ] 中英文切换全流程手动测试
- [ ] 检查所有 locale 切换后的布局是否正常（英文通常比中文宽 30-50%）
- [ ] Agent 对话在英文 locale 下发送英文提示词并以英文回复
- [ ] 遗漏硬编码字符串扫描：`grep -rn '[一-鿿]' apps/web/src/`

---

## 8. 注意事项

### 布局适配

英文文本通常比中文长 30-50%，需注意：
- 按钮宽度用 `min-w` 或 `px` 而非固定 `w`
- 导航栏在英文下可能换行，需测试
- Tooltip 文本可能溢出

### 后续扩展

添加新语言只需：
1. 新增 `messages/<locale>.json`
2. 新增 `packages/agent-engine/src/locales/<locale>.ts`
3. 在 `asset-catalog.ts` 添加 `name<Locale>` 字段
4. 更新 `Locale` 类型定义

### Agent 提示词质量

英文系统提示词直接影响 AI 代码生成质量。翻译时需要：
- 保持技术精确性，不要意译 API 名称
- 英文提示词让 LLM 输出英文注释和英文变量名
- 分别测试中英文提示词下的代码生成效果

### SEO & 元数据

`layout.tsx` 中的 `<title>` 和 `<meta description>` 也需要翻译，影响搜索引擎索引。
