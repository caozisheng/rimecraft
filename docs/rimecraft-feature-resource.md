# RimeCraft 资源库系统设计方案

## 一、Phaser 源码调研结论

### 1. 现成资源库：没有可直接复用的素材包

Phaser 源码 (`phaser/src/`) 是纯引擎代码，**不包含任何图片/音频/精灵图等现成素材**。但引擎提供了丰富的**程序化生成能力**，可以用来构建资源库：

| Phaser 能力 | 源码位置 | RimeCraft 可用方式 |
|---|---|---|
| **Graphics 绘图** — fillRect, fillCircle, fillTriangle, fillRoundedRect, lineStyle, stroke/fill 等完整 2D 绘图 API | `src/gameobjects/graphics/Graphics.js` | 已在用 (`generatorCode`)，可扩展 |
| **Shape 形状** — Arc, Ellipse, Grid, IsoBox, IsoTriangle, Line, Polygon, Rectangle, Star, Triangle | `src/gameobjects/shape/` (12种形状) | 可作为"形状素材"分类提供 |
| **Gradient 渐变** — 基于 Shader 的线性/径向渐变，支持 ColorRamp 多色带 | `src/gameobjects/gradient/Gradient.js` | 可作为背景/特效素材 |
| **Noise 噪声** — 基于 Shader 的 Simplex/Cell 噪声纹理 (2D/3D/4D) | `src/gameobjects/noise/` (Simplex2D, Cell2D 等) | 可用于地形、云雾、火焰等程序化纹理 |
| **DynamicTexture** — 运行时创建可绘制纹理，支持 draw/stamp/fill/erase | `src/textures/DynamicTexture.js` | 用户自定义纹理的底层能力 |
| **CanvasTexture** — HTML Canvas 支持 draw/getPixel/setPixel/refresh | `src/textures/CanvasTexture.js` | Canvas 预览和用户绘制 |
| **Particle 粒子** — EmitterOp, GravityWell, Zones, 颜色/大小/速度曲线 | `src/gameobjects/particles/` | 可提供预置粒子效果配置 |
| **Filters/后处理** — Blur, Glow, Pixelate, Vignette, Shadow, Barrel, Bokeh 等 16 种 | `src/filters/` | 可作为"特效滤镜"分类 |
| **Tilemap** — 支持 JSON/CSV/Impact 格式瓦片地图 | `src/tilemaps/` | 预置瓦片集模板 |
| **SpriteSheet 解析** — JSON Array/Hash, Atlas XML, Aseprite, Unity YAML | `src/textures/parsers/`, `src/loader/filetypes/` | 支持用户导入精灵图格式 |

**结论**：Phaser 没有"素材商店"，但有完整的程序化生成体系。RimeCraft 应利用这些 API 构建**可视化的程序化素材库**，同时将常用的外部素材（如 Phaser Labs 示例图片）打包到本地，确保离线可用。

### 2. 现成编辑器：无内置编辑器

Phaser 源码中**没有任何编辑器 UI 代码**（无 Scene Editor、Tilemap Editor、Particle Editor 等）。所有编辑器都是第三方生态：
- Phaser Editor 2D（独立商业产品）
- Tiled（瓦片地图编辑器，通过 TilemapJSONFile 导入）

**结论**：RimeCraft 的编辑器需要自建，但可以借鉴 Phaser 的数据格式（如 Tilemap JSON, SpriteSheet JSON Hash）实现兼容。

### 3. 资源库可视化方案

利用 Phaser 的 `generateTexture()` 和 Canvas API，**完全可以在浏览器中实时预览所有程序化素材**。

---

## 二、资源库架构设计

### 整体分层

```
┌──────────────────────────────────────────┐
│              Asset Library UI            │  React Dialog + 预览 Canvas
├──────────────────────────────────────────┤
│           Asset Registry                 │  统一索引层（内置 + 用户）
├──────────┬──────────┬────────────────────┤
│ Built-in │  User    │   LLM Generated    │  三种来源
│ (Local)  │  Assets  │   Assets           │
├──────────┴──────────┴────────────────────┤
│         Storage Layer                    │  本地文件 (public/) + IndexedDB
├──────────────────────────────────────────┤
│       Phaser Runtime (预览/渲染)          │  iframe sandbox
└──────────────────────────────────────────┘
```

**关键设计决策**：
- **内置素材完全本地化** — 所有内置素材（程序化纹理 + 图片）打包在 `public/assets/`，不依赖 CDN，确保离线可用
- **用户素材存 IndexedDB** — 上传的图片转为 data URL 嵌入 preloadCode，避免 blob 路径在 iframe sandbox 中不可访问的问题
- **CSS 素材转 Canvas 代码** — 用户编写 CSS，自动转换为 Phaser Graphics API 代码，与内置程序化纹理共享预览和运行时管道

### 资源分类体系

| 分类 | 子类 | 来源 |
|---|---|---|
| **角色** (character) | 玩家、敌人、NPC、Boss、载具 | 内置 + LLM |
| **环境** (environment) | 地面、墙壁、天空、水面、树木、云朵、尖刺 | 内置 + LLM |
| **道具** (item) | 金币、爱心、星星、钥匙、宝箱 | 内置 + LLM |
| **特效** (effect) | 子弹、爆炸、粒子 | 内置 + LLM |
| **UI** | 按钮、面板 | 内置 + LLM |
| **形状** (shape) | Arc, Star, Grid, IsoBox, Polygon 等 Phaser 原生 | 内置 |
| **背景** (background) | 渐变、噪声纹理、星空、网格 | 内置 + 用户CSS |
| **粒子预设** (particle) | 火焰、烟雾、下雨、雪花、闪光 | 内置 + LLM |
| **瓦片集** (tileset) | 草地、石头、水、沙 | 内置 + LLM |

---

## 三、核心模块设计

### 模块 1：统一资源注册表 (Asset Registry)

```typescript
// src/lib/assets/asset-registry.ts

type AssetSource = "builtin" | "user" | "llm-generated";

interface AssetEntry {
  id: string;
  name: string;
  nameZh: string;
  type: "texture" | "spritesheet" | "audio" | "particle-config" | "tileset" | "css";
  category: string;
  tags: string[];
  source: AssetSource;
  
  // 程序化生成素材（内置 + CSS 转换后）
  generatorCode?: string;
  
  // 图片素材（内置本地 + 用户上传）
  url?: string;              // 本地路径，如 "/assets/sprites/dude.png"
  preloadCode?: string;      // Phaser 加载代码
  frameConfig?: { frameWidth: number; frameHeight: number };
  
  // 用户上传素材
  blobPath?: string;          // IndexedDB 中的路径（仅存储用）
  thumbnailDataUrl?: string;  // base64 缩略图 (64x64)
  
  // CSS 素材（原始 CSS 留存，generatorCode 为转换后结果）
  cssCode?: string;           // 用户输入的原始 CSS
  cssWidth?: number;
  cssHeight?: number;
  
  // 元数据
  width?: number;
  height?: number;
  createdAt?: number;
  prompt?: string;            // LLM 生成时的提示词（溯源用）
}

class AssetRegistry {
  // 合并内置目录 + 用户目录
  getAll(filter?: { category?: string; source?: AssetSource; query?: string }): AssetEntry[];
  
  // 用户素材 CRUD
  addUserAsset(entry: AssetEntry, blob?: Blob): Promise<void>;
  removeUserAsset(id: string): Promise<void>;
  updateUserAsset(id: string, patch: Partial<AssetEntry>): Promise<void>;
  
  // 生成缩略图（用 offscreen canvas 执行 generatorCode）
  generateThumbnail(entry: AssetEntry): Promise<string>;
}
```

### 模块 2：可视化预览 (Canvas Previewer)

**核心思路**：用 OffscreenCanvas（或隐藏 `<canvas>`）执行 `generatorCode`，截取为 dataURL 作为缩略图。

```typescript
// src/lib/assets/asset-previewer.ts

/**
 * 在独立 Canvas 上执行 Phaser Graphics 代码，返回预览图
 * 不需要完整 Phaser 实例 —— 用 Canvas 2D API 模拟 Graphics 子集
 * 
 * 三种预览模式：
 * 1. generatorCode — 执行 Graphics API 代码（程序化纹理 + CSS 转换后）
 * 2. url — 加载本地图片（内置素材 /assets/...）
 * 3. thumbnailDataUrl — 直接显示缩略图（用户上传素材）
 */
export async function renderAssetPreview(
  generatorCode: string,
  size: number = 64,
  url?: string
): Promise<string>;
```

模拟的 Graphics API 子集：
- `fillStyle(color, alpha)` → `ctx.fillStyle`
- `fillRect(x, y, w, h)` → `ctx.fillRect`
- `fillCircle(x, y, r)` → `ctx.arc` + `ctx.fill`
- `fillTriangle(x1,y1,x2,y2,x3,y3)` → `ctx.moveTo/lineTo` + `ctx.fill`
- `fillRoundedRect(x, y, w, h, r)` → `ctx.roundRect` + `ctx.fill`
- `lineStyle(width, color, alpha)` → `ctx.strokeStyle` + `ctx.lineWidth`
- `strokeRect`, `strokeRoundedRect`
- `generateTexture(key, w, h)` → 记录尺寸，忽略（预览不需要注册到 TextureManager）

### 模块 3：素材来源管道

#### 3.1 内置素材（本地化）

所有内置素材完全本地化，不依赖外部 CDN：

```
apps/web/public/assets/          ← ~90 个 Phaser Labs 图片素材
  sprites/        (~60 files)
  sprites/bullets/ (4 files)
  skies/           (~15 files)
  particles/       (~8 files)
  demoscene/       (1 file)
  games/asteroids/ (3 files)
  games/breakout/  (1 file)
```

- **图片素材**：`url` 字段使用本地路径 `/assets/sprites/dude.png`
- **程序化纹理**：`generatorCode` 字段包含 Phaser Graphics API 代码，运行时生成
- **游戏 iframe 中的路径解析**：通过 `<base href="${origin}/">` 标签确保 blob: iframe 中的相对路径正确解析到宿主页面

#### 3.2 用户上传素材

```
用户选择图片文件
  → 生成 64x64 缩略图 (thumbnailDataUrl)
  → 将完整图片转为 data URL
  → 生成 preloadCode: this.load.image("name", "data:image/png;base64,...")
  → 注册到 AssetRegistry (IndexedDB user_assets 表)
  → 用户可选择分类 (category)
```

**关键决策**：preloadCode 中嵌入 data URL 而非 blob 路径。原因：游戏运行在 blob: iframe sandbox 中，无法通过文件路径访问 IndexedDB 中的 blob。data URL 自包含，无需路径解析。

#### 3.3 LLM 生成素材

```
用户: "帮我生成一个像素风格的剑"
  ↓
AI: 调用 generate_asset tool → 生成 generatorCode
  ↓
前端: 自动预览 + 保存到 AssetRegistry
  ↓
资源库: 出现在"我的"标签页，可随时复用
```

#### 3.4 CSS 素材（转 Canvas 代码）

```
用户输入 CSS 代码（如 "background: linear-gradient(45deg, red, blue); border-radius: 12px;"）
  → css-to-canvas.ts 解析 CSS 属性
  → 转换为 Phaser Graphics API generatorCode
  → 实时预览（复用 renderAssetPreview）
  → 保存到 AssetRegistry，source: "user", type: "css"
```

CSS → Canvas 转换对照表：

| CSS 属性 | Phaser Graphics API |
|---|---|
| `background-color` | `g.fillStyle(color); g.fillRect(...)` |
| `background: linear-gradient(...)` | 多条 `fillRect` 模拟渐变 |
| `border-radius` | `g.fillRoundedRect(...)` |
| `border` | `g.lineStyle(...); g.strokeRect(...)` |
| `box-shadow` | 多层 `fillRect` 模拟 |
| `width/height` | `generateTexture` 尺寸 |

CSS 素材保存后 `generatorCode` 已是标准 Graphics API 代码，与内置程序化纹理共享预览和运行时管道，`asset-previewer.ts` 无需特殊处理。

### 模块 4：增强版素材库 UI

```
┌─────────────────────────────────────────────────────┐
│  素材库                                        [×]  │
├─────────────────────────────────────────────────────┤
│ [🔍 搜索素材...]           [+ 上传] [CSS] [+ AI]   │
├─────────────────────────────────────────────────────┤
│ 全部 | 角色 | 环境 | 道具 | 特效 | 形状 | 背景 | 我的 │
├────────┬────────┬────────┬────────┬─────────────────┤
│ ┌────┐ │ ┌────┐ │ ┌────┐ │ ┌────┐ │                 │
│ │预览│ │ │预览│ │ │预览│ │ │预览│ │                 │
│ │图片│ │ │图片│ │ │图片│ │ │图片│ │                 │
│ └────┘ │ └────┘ │ └────┘ │ └────┘ │                 │
│ 玩家   │ 敌人   │ 地面   │ 金币   │   ...           │
│ player │ enemy  │ ground │ coin   │                 │
├────────┴────────┴────────┴────────┴─────────────────┤
│  [点击素材] → 显示详情面板:                          │
│  ┌─────────────────────────────────────────────┐    │
│  │  金币 (coin)        [复制代码] [插入] [删除] │    │
│  │  分类: 道具  来源: 内置                      │    │
│  │  ┌────────────────────────────────────────┐  │    │
│  │  │ const g = this.add.graphics();         │  │    │
│  │  │ g.fillStyle(0xfbbf24, 1);             │  │    │
│  │  │ g.fillCircle(8, 8, 8);               │  │    │
│  │  │ ...                                   │  │    │
│  │  └────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**UI 功能清单**：
1. **网格卡片视图** — 每个素材显示 64x64 Canvas 预览缩略图
2. **"我的"标签页** — 用户上传 + LLM 生成 + CSS 素材统一展示
3. **"+ AI 生成"按钮** — 输入描述，AI 生成后直接入库
4. **"+ 上传"按钮** — 选择本地图片文件，可选分类，自动入库
5. **"CSS"按钮** — 展开 CSS 编辑器面板（textarea + 尺寸 + 实时预览 + 保存）
6. **"插入"按钮** — 将代码插入当前编辑器
7. **"删除"按钮** — 仅对非 builtin 素材显示，调用 `removeUserAsset()`

---

## 四、新增内置素材（利用 Phaser 能力）

基于 Phaser 源码中发现的 Shape/Gradient/Noise 能力，扩展内置素材：

### Shape 形状类（12 项新增）

```typescript
// 利用 Phaser Shape API，不需要 Graphics
{ id: "shape-star", name: "star-shape", nameZh: "五角星",
  generatorCode: `this.add.star(400, 300, 5, 20, 40, 0xfbbf24);` }

{ id: "shape-grid", name: "grid", nameZh: "网格",
  generatorCode: `this.add.grid(400, 300, 200, 200, 32, 32, 0x1e293b, 1, 0x334155, 1);` }

{ id: "shape-isobox", name: "isobox", nameZh: "等距方块",
  generatorCode: `this.add.isobox(400, 300, 60, 100, 0x06b6d4, 0x0891b2, 0x0e7490);` }
```

### Background 背景类（利用 Gradient/Noise）

```typescript
{ id: "bg-gradient-sunset", name: "sunset-gradient", nameZh: "日落渐变",
  generatorCode: `const g = this.add.graphics();
const gradient = g.createLinearGradient(0, 0, 0, 600);
// ... 渐变代码` }

{ id: "bg-starfield", name: "starfield", nameZh: "星空",
  generatorCode: `// 随机星点` }
```

### Particle 粒子预设类

```typescript
{ id: "particle-fire", name: "fire", nameZh: "火焰效果", type: "particle-config",
  generatorCode: `const particles = this.add.particles(400, 500, 'particle', {
    speed: { min: 50, max: 100 },
    angle: { min: -110, max: -70 },
    scale: { start: 1, end: 0 },
    lifespan: 800,
    tint: [ 0xff4500, 0xff6347, 0xffa500 ]
  });` }
```

---

## 五、实施路线

### Phase A：本地化 + 可视化预览 + UI 升级（优先级最高）

1. 创建 `scripts/download-cdn-assets.mjs` 下载 ~90 个 CDN 素材到 `apps/web/public/assets/`
2. `game-compiler.ts` 添加 `<base href="${origin}/">` 标签，确保 iframe 中本地路径可解析
3. 全局替换 `https://labs.phaser.io/assets/` → `/assets/`（asset-catalog.ts + 5 个 template 文件）
4. 修改根 `package.json` postinstall 同步素材到 `apps/tauri/public/assets/`
5. 实现 `asset-previewer.ts` — Canvas 模拟 Graphics API 子集，渲染缩略图
6. 改造 `asset-library-dialog.tsx` — 网格卡片布局，每张卡片带缩略图预览
7. 添加"插入到编辑器"功能

### Phase B：用户素材管理

8. 实现 `asset-registry.ts` — 统一注册表，合并内置 + 用户素材
9. 修复用户上传：图片转 data URL 嵌入 preloadCode（解决 blob iframe 不可访问问题）
10. 上传时可选分类（当前固定为 "item"）
11. 添加"我的"标签页 — 展示用户上传和 AI 生成的素材
12. 实现删除用户素材（UI 入口，调用已有 `removeUserAsset`）

### Phase C：CSS 素材 + LLM 生成素材

13. 新建 `css-to-canvas.ts` — CSS 属性到 Phaser Graphics API 代码转换器
14. 扩展 `AssetEntry` 类型添加 `"css"` type 和 `cssCode/cssWidth/cssHeight` 字段
15. `asset-library-dialog.tsx` 添加 CSS 编辑器面板（textarea + 尺寸 + 实时预览 + 保存）
16. i18n 添加 CSS 素材相关文案
17. 新增 `generate_asset` agent tool
18. 添加"AI 生成"按钮 — 输入描述 → 调 LLM → 预览 → 入库
19. 生成素材记录 prompt 来源，支持"再次生成类似素材"

### Phase D：扩展内置素材

20. 新增 Shape 形状类素材（利用 Phaser Shape API）
21. 新增 Background 背景类（渐变、噪声、星空）
22. 新增 Particle 粒子预设（火焰、烟雾、雨雪）
23. 新增 Tileset 瓦片集素材

---

## 六、技术要点

### Canvas 预览不依赖 Phaser 实例

素材库的缩略图预览用纯 Canvas 2D API 模拟 Phaser Graphics 的常用子集，无需启动 Phaser Game 实例。这保证了：
- 打开素材库时不占用 Phaser 运行时资源
- 预览加载快（每个缩略图 < 5ms）
- 可以在 Web Worker 中批量生成

### 内置素材完全本地化

所有内置图片素材（~90 个 PNG）从 `https://labs.phaser.io` 打包到 `apps/web/public/assets/`，并通过 postinstall 同步到 `apps/tauri/public/assets/`。游戏 iframe 通过 `<base>` 标签解析本地路径。**无网络环境下所有内置素材可正常使用。**

### 用户素材存储与 iframe 访问

用户上传的图片转为 data URL 嵌入 `preloadCode`，而非存储 blob 路径。原因：游戏运行在 `blob:` origin 的 iframe sandbox 中，无法通过文件系统路径或 IndexedDB 键访问用户 blob。data URL 是自包含的，跨 origin 可用。对于 < 1MB 的游戏素材图片（base64 约增大 33%），这个方案完全可行。

### CSS 素材与程序化纹理统一管道

CSS 素材在保存时即转换为 Phaser Graphics API `generatorCode`，之后与内置程序化纹理完全共享：
- **预览**：`asset-previewer.ts` 用 Canvas 2D 模拟执行 `generatorCode`
- **运行时**：游戏 iframe 中直接执行 `generatorCode` 生成纹理
- **存储**：`AssetEntry` 中保留原始 `cssCode` 供用户编辑，`generatorCode` 供执行

### LLM 生成的代码安全

LLM 生成的 `generatorCode` 已经在 Phaser iframe sandbox 中执行，与现有代码执行管道一致，无额外安全风险。预览时使用模拟 Canvas 环境，同样安全。

---

## 七、关键文件清单

| 文件 | 职责 | 改动内容 |
|---|---|---|
| `apps/web/public/assets/` | 本地化内置图片素材 | 新增 ~90 个 PNG |
| `apps/web/src/lib/assets/asset-catalog.ts` | 素材目录 | CDN URL → 本地路径 |
| `apps/web/src/lib/assets/asset-registry.ts` | 统一注册表 | 扩展 AssetEntry 类型 |
| `apps/web/src/lib/assets/asset-previewer.ts` | 预览渲染 | 已实现，无需改动 |
| `apps/web/src/lib/assets/css-to-canvas.ts` | CSS→Canvas 转换 | 新建 |
| `apps/web/src/components/editor/asset-library-dialog.tsx` | 素材库 UI | CSS 编辑器、上传改进、删除按钮 |
| `apps/web/src/core/game-compiler.ts` | 游戏编译 | 添加 `<base>` 标签 |
| `apps/web/src/lib/templates/*.ts` | 游戏模板 | CDN URL → 本地路径 |
| `apps/web/src/i18n/zh.ts` / `en.ts` | 国际化 | CSS 素材相关文案 |
| `scripts/download-cdn-assets.mjs` | 构建工具 | 新建，下载 CDN 素材 |
| `package.json` | 构建配置 | postinstall 同步 Tauri 素材 |

## 八、验证检查项

- [ ] 断网后创建项目、选择任意模板，预览中所有素材正常加载
- [ ] 素材库打开后，所有内置图片素材缩略图正常显示（不出现 🌐 占位符）
- [ ] 上传图片后，在游戏代码中使用 `this.load.image(...)` 并在预览中正常显示
- [ ] 创建 CSS 素材，转换后的 generatorCode 在预览和游戏中正确渲染
- [ ] "我的"标签页显示所有用户上传、LLM 生成、CSS 素材
- [ ] 删除用户素材后从列表中消失
- [ ] Tauri 桌面版构建后同样可离线使用所有素材

---

## 九、Desktop / Web 双平台兼容性说明

### 平台差异对照

| | Web (Next.js) | Desktop (Tauri/Vite) |
|---|---|---|
| **Origin** | `http://localhost:3000` | `http://127.0.0.1:1420` (dev) / `tauri://localhost` (prod) |
| **静态文件服务** | `apps/web/public/` → served at `/` | `apps/tauri/public/` → Vite dev 直接 serve；prod 打包到 `dist/` |
| **iframe 加载方式** | blob: URL | blob: URL（相同） |
| **CSP 策略** | 默认 | `"csp": null`（已禁用，无额外限制） |
| **代码共享** | 源码目录 | `@/*` alias 指向 `../web/src/*`，共享全部业务代码 |

### 关键风险：`<base>` 标签方案在 Tauri prod 中不可靠

游戏预览运行在 blob: iframe 中。原方案通过 `<base href="${origin}/">` 让 iframe 中的相对路径 `/assets/...` 解析到宿主页面 origin。

**问题**：Tauri 生产构建中 `window.location.origin` 返回 `tauri://localhost` 或 `https://tauri.localhost`。这个自定义协议下 `<base>` 标签在 blob: iframe 中的行为不确定，可能导致素材加载失败。

### 推荐方案：沿用现有的绝对 URL 拼接模式

`game-compiler.ts` 第 307 行已有先例：
```ts
const origin = typeof window !== "undefined" ? window.location.origin : "";
// ...
<script src="${origin}${PHASER_CDN_URL}"></script>
```

Phaser.js 的加载用的是 `${origin}/phaser.min.js` 这种完整绝对 URL，而非依赖 `<base>` 标签。**素材本地化应遵循同样模式**：

1. **asset-catalog.ts** — `url` 和 `preloadCode` 使用相对路径 `/assets/sprites/dude.png`（不含 origin）
2. **game-compiler.ts** — 在 `generateSandboxHtml` 中注入一个全局常量供游戏代码使用：
   ```js
   window.__ASSET_BASE__ = "${origin}";
   ```
3. **模板文件** — preload 代码改为：
   ```ts
   this.load.setBaseURL(window.__ASSET_BASE__ || "");
   this.load.image("dude", "/assets/sprites/dude.png");
   ```
   Phaser 的 `setBaseURL` 会自动为所有相对路径加上前缀，一次设置即可。

这样 Web 端 `origin = "http://localhost:3000"`，Tauri 端 `origin = "tauri://localhost"`，都能正确拼接出完整的本地资源 URL，不依赖 `<base>` 标签。

### 静态文件同步

- `apps/web/public/assets/` 是主目录，下载脚本写入此处
- `apps/tauri/public/assets/` 通过 postinstall 脚本从 web 复制
- Tauri 构建时 Vite 会自动将 `public/` 内容打包到 `dist/`，无需额外配置

### 第七节文件清单修订

| 文件 | 改动 |
|---|---|
| `apps/web/src/core/game-compiler.ts` | 注入 `window.__ASSET_BASE__`（**替代原 `<base>` 标签方案**） |
