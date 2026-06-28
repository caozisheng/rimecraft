# RimeCraft Agent 增强设计方案（v3）

## 设计理念升级：引入 Phaser Skills 知识体系

### v2 → v3 核心变化

v2 方案的核心理念「结构化约束 > 知识灌输」保持不变。v3 在此基础上引入 Phaser 官方 skills 知识库（33 个 SKILL.md 文件），**将 RAG 从手工编写的 JSON 片段升级为基于官方文档的结构化知识检索系统**。

| 维度 | v2 方案 | v3 方案 |
|------|---------|---------|
| RAG 数据源 | 手工编写 JSON（22 模式 + 少量 API） | Phaser 官方 skills（33 个领域 × 完整文档）+ 手工 JSON |
| 知识覆盖 | 基础物理/精灵/输入 | 全覆盖：physics/tweens/particles/cameras/audio/tilemap/... |
| 检索粒度 | 关键词 → 代码片段 | 关键词 → skill 领域 → 精准段落（Quick Start/Patterns/Gotchas） |
| 错误修复 | 手工编写错误表 | 错误表 + skill Gotchas 自动匹配 |
| prompt 膨胀控制 | 全量注入 ~500 行 | 按需检索，动态注入相关 skill 段落（token budget 4000） |

### Phaser Skills 概览

源码位置：`C:\Users\zisheng\Documents\cao\00_code\github\phaser\skills\`

33 个 skills 覆盖 Phaser 4 的全部子系统：

| 分类 | Skills | 说明 |
|------|--------|------|
| **渲染** (9) | sprites-and-images, graphics-and-shapes, cameras, filters-and-postfx, render-textures, masks, lighting, display-list-and-depth, text-and-fonts | 全部视觉渲染能力 |
| **物理** (4) | physics-arcade, physics-matter, curves-and-paths, particles | 两套物理引擎 + 路径 + 粒子 |
| **输入** (4) | input-keyboard-mouse-touch, input-gamepad, input-pointer, input-keyboard | 全平台输入处理 |
| **动画** (3) | animations, tweens, time-and-timers | 动画 + 缓动 + 定时器 |
| **数据** (3) | loading-assets, data-manager, tilemap-and-tiles | 资源加载 + 数据 + 地图 |
| **组织** (3) | scenes, groups-and-containers, actions-and-utilities | 场景管理 + 对象组织 |
| **基础设施** (5) | game-setup-and-config, scale-and-responsive, events-system, game-object-components, audio-and-sound | 引擎配置 + 事件 + 音频 |
| **其他** (2) | geometry-and-math, web-audio-api | 数学工具 + 高级音频 |

每个 SKILL.md 结构统一：
```
---
name: skill-name
description: "... triggers on: keyword1, keyword2 ..."
---
# Title
> Scope description

Key source paths / Related skills

## Quick Start        ← 最常用的代码示例
## Core Concepts      ← 基础概念和对象模型
## Common Patterns    ← 实战使用模式
## API Quick Reference ← 方法/属性速查表
## Configuration      ← 配置项参考
## Events             ← 事件文档
## Gotchas            ← 常见陷阱和边界情况
```

---

## 一、Skill 知识索引构建

### 1.1 预处理管线

将 33 个 SKILL.md 解析为结构化 JSON 索引，供 RAG 检索引擎使用：

```
phaser/skills/*/SKILL.md
  ↓ 解析脚本 (scripts/extract-skills.ts)
  ↓
apps/web/src/lib/ai/rag/phaser4-skills-index.json
```

**输出格式：**

```jsonc
{
  "skills": [
    {
      "id": "physics-arcade",
      "name": "Arcade Physics",
      "triggers": ["physics", "arcade", "velocity", "gravity", "collide", "overlap", "bounce", "碰撞", "物理", "重力", "弹跳"],
      "sections": {
        "quickStart": "// 完整 Quick Start 代码...",
        "coreConceptKeys": ["World", "Bodies", "Static Bodies", "Collision Categories"],
        "patterns": [
          { "title": "Enable physics on sprite", "code": "..." },
          { "title": "Velocity & gravity", "code": "..." },
          { "title": "Collide & overlap", "code": "..." }
        ],
        "gotchas": [
          "staticGroup members need refreshBody() after setScale()",
          "body is null if sprite created with this.add instead of this.physics.add",
          "collider callback needs 5th arg for `this` binding"
        ],
        "apiQuickRef": [
          "this.physics.add.sprite(x, y, key) → Arcade.Sprite",
          "this.physics.add.collider(a, b, cb?, process?, ctx?) → Collider",
          "body.setVelocity(x, y)", "body.setBounce(x, y)"
        ]
      },
      "relatedSkills": ["physics-matter", "groups-and-containers", "game-object-components"]
    }
    // ... 32 more skills
  ]
}
```

### 1.2 索引设计原则

1. **触发词双语**：每个 skill 的 triggers 同时包含英文关键词和中文关键词（如 `"碰撞"`, `"物理"`），确保中文用户的查询也能命中
2. **段落级粒度**：不注入整个 SKILL.md（太长），而是按 section 拆分，检索时只注入相关段落
3. **Gotchas 优先**：debug 模式下，gotchas 段落的权重最高——这些是 Phaser 官方总结的常见陷阱
4. **代码优先**：quickStart 和 patterns 中的代码是最有价值的部分，直接作为 RAG 上下文注入

---

## 二、检索引擎升级

### 2.1 新增 Skill 检索层

在现有 `retrieval.ts` 的多级检索架构中，新增 **Level 0.2: Skill 领域检索**：

```typescript
// retrieval.ts 新增

import skillsData from "./phaser4-skills-index.json";

interface SkillEntry {
  id: string;
  name: string;
  triggers: string[];
  sections: {
    quickStart: string;
    patterns: { title: string; code: string }[];
    gotchas: string[];
    apiQuickRef: string[];
  };
  relatedSkills: string[];
}

const skills: SkillEntry[] = skillsData.skills;

/**
 * Level 0.2: Skill 领域检索
 * 根据用户消息匹配相关 Phaser skill，返回最相关的段落
 */
function retrieveSkillContext(
  query: string,
  contextType: "coding" | "debug" | "design" | "general",
  maxSkills = 2,
): string[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored = skills.map((s) => ({
    skill: s,
    score: scoreMatch(s.triggers, tokens),
  }));

  const topSkills = scored
    .filter((s) => s.score > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSkills);

  const parts: string[] = [];
  for (const { skill } of topSkills) {
    parts.push(`\n### [Skill: ${skill.name}]`);

    if (contextType === "debug") {
      // Debug 模式：优先 gotchas + API 速查
      if (skill.sections.gotchas.length > 0) {
        parts.push("**Gotchas (常见陷阱):**");
        for (const g of skill.sections.gotchas.slice(0, 5)) {
          parts.push(`- ⚠️ ${g}`);
        }
      }
      if (skill.sections.apiQuickRef.length > 0) {
        parts.push("**API Quick Reference:**");
        for (const a of skill.sections.apiQuickRef.slice(0, 8)) {
          parts.push(`- ${a}`);
        }
      }
    } else {
      // Coding/General 模式：优先 patterns + quickStart
      if (skill.sections.patterns.length > 0) {
        const relevant = skill.sections.patterns.slice(0, 3);
        for (const p of relevant) {
          parts.push(`**${p.title}:**`);
          parts.push("```typescript");
          parts.push(p.code);
          parts.push("```");
        }
      }
      if (skill.sections.gotchas.length > 0) {
        parts.push("**Gotchas:**");
        for (const g of skill.sections.gotchas.slice(0, 3)) {
          parts.push(`- ⚠️ ${g}`);
        }
      }
    }
  }
  return parts;
}
```

### 2.2 集成到 buildRagContext

```typescript
export function buildRagContext(userMessage: string, config?: RetrievalConfig): string {
  const contextType = config?.contextType ?? "general";
  const parts: string[] = [];

  // === Level 0: 结构模式检索（已有）===
  // ...

  // === Level 0.2: Skill 领域检索（新增）===
  const skillParts = retrieveSkillContext(userMessage, contextType);
  if (skillParts.length > 0) {
    parts.push(...skillParts);
  }

  // === Level 0.5: 游戏目录（已有）===
  // === Level 1: 错误驱动检索（已有）===
  // === Level 2: 代码上下文检索（已有）===
  // === Level 3: 意图匹配检索（已有）===
  // === Level 4: API 速查（已有）===

  // Token budget: 4000 tokens
  return truncateToTokenBudget(fullContext, 4000);
}
```

### 2.3 错误-Skill 交叉检索

当 debug 模式检测到运行时错误时，除了匹配 `phaser4-error-fixes.json`，还自动匹配相关 skill 的 gotchas：

```typescript
function retrieveSkillGotchasForError(error: string): string[] {
  // 从错误信息推断相关 skill
  const errorSkillMap: Record<string, string[]> = {
    "body": ["physics-arcade", "physics-matter"],
    "velocity|gravity|collide|overlap|bounce": ["physics-arcade"],
    "tween|ease|yoyo": ["tweens"],
    "animation|anim|frame|play": ["animations"],
    "camera|zoom|follow|shake": ["cameras"],
    "particle|emitter": ["particles"],
    "tilemap|tile|layer": ["tilemap-and-tiles"],
    "sound|audio|music": ["audio-and-sound"],
    "keyboard|cursor|key|input": ["input-keyboard-mouse-touch"],
    "group|container|children": ["groups-and-containers"],
    "text|font|bitmap": ["text-and-fonts"],
    "texture|load|preload|spritesheet": ["loading-assets", "sprites-and-images"],
    "scene|start|launch|sleep": ["scenes"],
    "timer|delay|time": ["time-and-timers"],
    "scale|resize|fullscreen": ["scale-and-responsive"],
  };

  const matchedSkillIds = new Set<string>();
  for (const [pattern, skillIds] of Object.entries(errorSkillMap)) {
    if (new RegExp(pattern, "i").test(error)) {
      for (const id of skillIds) matchedSkillIds.add(id);
    }
  }

  const gotchas: string[] = [];
  for (const skill of skills) {
    if (matchedSkillIds.has(skill.id)) {
      for (const g of skill.sections.gotchas) {
        gotchas.push(`[${skill.name}] ${g}`);
      }
    }
  }
  return gotchas;
}
```

---

## 三、Skill → System Prompt 注入策略

### 3.1 Token 预算分配

当前 system prompt 6 层结构保持不变，skill 内容通过 Layer 5（动态上下文）的 RAG 通道注入：

| 层 | 内容 | Token 预算 | 来源 |
|----|------|-----------|------|
| Layer 1 | 身份 + 宪法规则 | ~400 | 常驻 |
| Layer 2 | 角色专精 | ~600 | 按角色切换 |
| Layer 3 | 代码结构模板 | ~400 | 常驻 |
| Layer 4 | Phaser 核心规则 | ~800 | 常驻 |
| **Layer 5** | **动态上下文（RAG + Skills + 游戏状态）** | **~4000** | **按需检索** |
| Layer 6 | 工作流 + 错误处理 | ~400 | 常驻 |

Layer 5 内部的 token 分配：

| 子层 | 内容 | 最大 Token |
|------|------|-----------|
| 游戏文件快照 | 当前项目所有 .ts 文件内容 | 不限（已有截断） |
| **Skill 段落** | **匹配到的 skill patterns/gotchas** | **~1500** |
| 错误修复参考 | error-fixes.json 匹配结果 | ~800 |
| 代码模式参考 | patterns.json 匹配结果 | ~800 |
| API 速查 | api-index.json 匹配结果 | ~500 |
| 架构指南 | architecture.json 匹配结果 | ~400 |

### 3.2 按角色差异化注入

| 角色 | Skill 注入策略 |
|------|---------------|
| **coding** | patterns + quickStart 为主，gotchas 辅助 |
| **debug** | gotchas + apiQuickRef 为主，patterns 辅助 |
| **design** | 不注入 skill（设计角色不需要 API 细节） |
| **gameplay** | patterns 为主（关注玩法实现模式） |
| **asset** | loading-assets skill 的 patterns 优先 |
| **director** | 只注入匹配到的 skill 名称列表（概览级别） |

---

## 四、Skill 数据提取脚本

### 4.1 提取脚本设计

```
scripts/extract-skills.ts
  输入: phaser/skills/*/SKILL.md (33 files)
  输出: apps/web/src/lib/ai/rag/phaser4-skills-index.json
```

**提取逻辑：**

```typescript
// scripts/extract-skills.ts (伪代码)

for (const skillDir of glob("phaser/skills/*/SKILL.md")) {
  const md = readFileSync(skillDir, "utf-8");

  // 1. 解析 YAML frontmatter → name, description
  const { name, description } = parseFrontmatter(md);

  // 2. 从 description 提取 trigger 关键词
  const triggers = extractTriggers(description);
  // 补充中文关键词
  triggers.push(...CHINESE_KEYWORD_MAP[name] ?? []);

  // 3. 按 ## 标题拆分段落
  const sections = splitByHeading(md);

  // 4. 提取 Quick Start 代码块
  const quickStart = extractCodeBlocks(sections["Quick Start"]);

  // 5. 提取 Common Patterns 的子段落
  const patterns = extractPatterns(sections["Common Patterns"]);

  // 6. 提取 Gotchas 列表项
  const gotchas = extractBulletList(sections["Gotchas"]);

  // 7. 提取 API Quick Reference 表格
  const apiQuickRef = extractTable(sections["API Quick Reference"]);

  // 8. 提取 Related skills
  const relatedSkills = extractRelatedSkills(md);

  output.skills.push({ id: name, name: title, triggers, sections: { quickStart, patterns, gotchas, apiQuickRef }, relatedSkills });
}
```

### 4.2 中文关键词映射表

```typescript
const CHINESE_KEYWORD_MAP: Record<string, string[]> = {
  "physics-arcade": ["物理", "碰撞", "重力", "速度", "弹跳", "加速"],
  "animations": ["动画", "帧动画", "精灵动画", "播放动画"],
  "tweens": ["缓动", "动画", "渐变", "过渡", "弹性"],
  "cameras": ["相机", "镜头", "跟随", "震动", "缩放", "视角"],
  "particles": ["粒子", "特效", "爆炸", "火焰", "烟雾"],
  "input-keyboard-mouse-touch": ["键盘", "鼠标", "触摸", "输入", "按键", "手柄"],
  "loading-assets": ["加载", "资源", "图片", "音频", "预加载"],
  "scenes": ["场景", "切换", "过渡", "暂停", "恢复"],
  "tilemap-and-tiles": ["瓦片", "地图", "关卡", "图块"],
  "audio-and-sound": ["音频", "音效", "音乐", "声音", "背景音乐"],
  "groups-and-containers": ["组", "容器", "对象池", "分组"],
  "text-and-fonts": ["文字", "字体", "文本", "标签"],
  "tweens": ["缓动", "补间", "动画效果"],
  "time-and-timers": ["定时器", "延迟", "计时", "倒计时"],
  "sprites-and-images": ["精灵", "图像", "纹理"],
  "graphics-and-shapes": ["图形", "形状", "绘制", "画线", "矩形"],
  "scale-and-responsive": ["缩放", "适配", "响应式", "全屏"],
  "geometry-and-math": ["数学", "几何", "距离", "角度", "随机"],
  "data-manager": ["数据", "存储", "变量", "注册表"],
  "events-system": ["事件", "监听", "触发", "回调"],
  "game-setup-and-config": ["配置", "初始化", "启动", "设置"],
  "physics-matter": ["刚体", "约束", "关节", "传感器"],
  "curves-and-paths": ["曲线", "路径", "贝塞尔", "跟随路径"],
  "render-textures": ["渲染纹理", "动态纹理", "截图"],
  "filters-and-postfx": ["滤镜", "后处理", "模糊", "发光"],
  "masks": ["遮罩", "裁剪"],
  "lighting": ["光照", "灯光", "阴影"],
  "display-list-and-depth": ["深度", "层级", "排序", "显示列表"],
  "actions-and-utilities": ["批量操作", "排列", "网格"],
  "game-object-components": ["组件", "混入", "透明度", "翻转"],
};
```

---

## 五、与 v2 方案的融合

### 5.1 保留的 v2 设计（全部保留）

| v2 设计 | 状态 | 说明 |
|---------|------|------|
| 分层 Prompt 架构（6 层） | ✅ 保留 | skill 内容通过 Layer 5 RAG 通道注入 |
| 宪法规则 | ✅ 保留 | Layer 1 不变 |
| 代码结构模板 | ✅ 保留 | Layer 3 不变 |
| Phaser 核心规则 | ✅ 保留 | Layer 4 不变，skill 作为补充而非替代 |
| 角色专精 | ✅ 保留 | 各角色按策略差异化注入 skill |
| 工作流规范 | ✅ 保留 | Layer 6 不变 |
| 反模式规则 | ✅ 保留 | skill gotchas 作为补充 |
| 错误诊断库 | ✅ 保留 | skill gotchas 交叉检索增强 |
| 代码模式库 | ✅ 保留 | skill patterns 作为高质量补充 |

### 5.2 v3 新增/增强项

| 项目 | 描述 |
|------|------|
| **phaser4-skills-index.json** | 33 个 skill 的结构化索引（~200KB） |
| **Skill 检索层** | retrieval.ts 新增 Level 0.2 skill 领域检索 |
| **错误-Skill 交叉检索** | debug 模式用错误关键词匹配 skill gotchas |
| **按角色差异化注入** | coding→patterns, debug→gotchas, design→skip |
| **中文触发词映射** | 确保中文查询也能命中正确 skill |
| **提取脚本** | scripts/extract-skills.ts 自动化构建索引 |

---

## 六、实现计划

### Phase A: Skill 索引构建（1 天）

| 任务 | 描述 | 工时 |
|------|------|------|
| 编写 extract-skills.ts | 解析 33 个 SKILL.md → JSON | 0.5d |
| 中文关键词映射 | 为每个 skill 补充中文触发词 | 0.25d |
| 生成 phaser4-skills-index.json | 运行脚本 + 人工校验 | 0.25d |

### Phase B: 检索引擎集成（0.5 天）

| 任务 | 描述 | 工时 |
|------|------|------|
| 新增 skill 检索函数 | retrieveSkillContext() | 0.25d |
| 集成到 buildRagContext | Level 0.2 插入 + token budget 调整 | 0.15d |
| 错误-Skill 交叉检索 | retrieveSkillGotchasForError() | 0.1d |

### Phase C: 验证与调优（0.5 天）

| 任务 | 描述 | 工时 |
|------|------|------|
| 检索准确率测试 | 30 条查询 × top-2 skill 命中率 | 0.25d |
| Token budget 调优 | 确保不超 4000 token 限制 | 0.15d |
| Debug gotchas 效果测试 | 10 种常见错误 × 是否命中正确 gotcha | 0.1d |

**v3 增量工时：2 天**（在 v2 基础上叠加）

---

## 七、涉及文件变更清单

### 新增文件

| 文件 | 描述 |
|------|------|
| `scripts/extract-skills.ts` | SKILL.md → JSON 提取脚本 |
| `apps/web/src/lib/ai/rag/phaser4-skills-index.json` | 33 个 skill 的结构化索引 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `apps/web/src/lib/ai/rag/retrieval.ts` | 新增 skill 检索层 + 错误交叉检索 |

### 不变的文件（v2 已实现）

| 文件 | 说明 |
|------|------|
| `packages/agent-engine/src/service.ts` | 6 层 prompt 架构已实现 |
| `packages/agent-engine/src/expert-roles.ts` | 角色增强已实现 |
| `apps/web/src/stores/agent-loop.ts` | 错误循环 + 最大重试已实现 |
| `apps/web/src/core/compiler/transpiler.ts` | enum/as 转译已实现 |

---

## 八、成功指标（v3 增量）

| 指标 | v2 目标 | v3 目标 | 验证方式 |
|------|---------|---------|---------|
| Skill 检索命中率 | — | ≥85% top-2 命中 | 30 条查询测试 |
| Debug gotcha 命中率 | — | ≥70% 错误匹配到相关 gotcha | 20 种错误测试 |
| RAG 知识覆盖率 | ~40% Phaser API | ≥90% 常用子系统 | 33 skill vs 用户常用功能 |
| 首次代码可运行率 | ≥90% | ≥93% | 10 种游戏 × 3 次测试 |
| Debug 1-轮修复率 | ≥70% | ≥80% | 注入 20 种错误 |

---

## 九、后续扩展

### 9.1 Skill 动态加载（远期）

当 skill 索引过大时，可改为按需从文件系统加载，避免 bundle 体积膨胀：
- 首次只加载 triggers 索引（~5KB）
- 命中后动态 fetch 对应 skill 的完整内容

### 9.2 Skill 版本同步

当 Phaser 源码更新时，重新运行 `extract-skills.ts` 即可同步。可加入 CI 自动化。

### 9.3 自定义 Skill

允许高级用户编写自己的 SKILL.md（如自定义插件文档），通过相同格式注入 RAG。
