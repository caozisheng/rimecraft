# 模板升级设计方案

## 现状问题

当前 5 个模板都是纯 `graphics.fillRect/fillCircle` 生成的色块，没有利用已有的 136 个 CDN 素材，玩法逻辑也偏简单（~300 行），缺乏完整游戏感。

参考例程来源：`C:\Users\zisheng\Documents\cao\00_code\github\phaser-games`（98 个 Phaser 游戏示例）

---

## 现有模板升级方向

### 1. Endless Runner → 参考 `dinosaur/` + `bike/`

| 项目 | 现状 | 升级 |
|---|---|---|
| 视觉 | 色块矩形 | 用 `cdn-phaser-dude` 跑跳 + `cdn-platform` 地面 + `cdn-sky1` 背景 |
| 玩法 | 单纯跳跃躲障碍 | 加**多层视差滚动**（远景天空/中景云/近景地面）、**地面+空中双障碍**、**金币收集**（`cdn-coin-sprite`） |
| 参考亮点 | `dinosaur/` 的 gravity 800 + camera follow 体感好；`bike/` 的多 state 架构（Boot→Game→Result→Rank） |
| 预计代码量 | 300→500 行 |

### 2. Platformer → 参考 `collectstar/` + `jump/`

| 项目 | 现状 | 升级 |
|---|---|---|
| 视觉 | 色块平台+圆形金币 | `cdn-phaser-dude` spritesheet 动画 + `cdn-platform` + `cdn-star-hd`/`cdn-diamond` 收集品 + `cdn-bomb` 炸弹 |
| 玩法 | 静态平台+金币 | 加**移动平台**（tween 往返）、**敌人巡逻**（`cdn-wasp` 左右移动+碰撞死亡）、**多关卡**（Level 1/2/3 数据驱动） |
| 参考亮点 | `jump/` 的多层平台跳跃；`collectstar/` 正好是 Phaser 官方教程结构，代码清晰 |
| 预计代码量 | 400→600 行 |

### 3. Space Shooter → 参考 `shoot/` + `plane/`

| 项目 | 现状 | 升级 |
|---|---|---|
| 视觉 | 三角形飞船+色块子弹 | `cdn-shmup-ship` 玩家 + `cdn-space-invader`/`cdn-ufo` 敌人 + `cdn-shmup-bullet` 子弹 + `cdn-starfield-bg` 背景 |
| 玩法 | 单一敌人匀速下落 | 加**敌人波次**（wave 1/2/3 递增）、**Boss 战**（血量条 `cdn-healthbar`）、**道具掉落**（`cdn-firstaid` 回血 / `cdn-shinyball` 三连射）、**爆炸粒子**（`cdn-explosion-sprite`） |
| 参考亮点 | `shoot/` 的 player/enemy/bullet 分离架构 + 指针跟踪旋转；`plane/` 的波次系统 |
| 预计代码量 | 450→700 行 |

### 4. RPG → 参考 `rpgdemo/` + `magicplain/`

| 项目 | 现状 | 升级 |
|---|---|---|
| 视觉 | 色块地图+色块NPC | 用瓦片（`grass-tile`/`stone-tile`）拼地图 + `cdn-phaser-dude` 主角 + `cdn-skull`/`cdn-ghost` 敌人 |
| 玩法 | 走路+对话+开箱 | 加**回合制战斗**（遇敌进入战斗场景，选择攻击/防御/道具）、**简单背包**（钥匙、药水数量）、**多房间**（门传送） |
| 参考亮点 | `magicplain/` 的 AI 寻路 + 炸弹放置（类炸弹人）；`rpgdemo/` 的对话系统 |
| 预计代码量 | 350→800 行（最复杂模板） |

### 5. Puzzle → 参考 `40963/` (2048) 替换 Sokoban

| 项目 | 现状 | 升级 |
|---|---|---|
| 视觉 | 纯色方块推箱子 | **改为 2048 数字合成**，用渐变色块+数字 text，更有普适性 |
| 玩法 | Sokoban 推箱子（关卡有限） | **2048**: 滑动合并、随机生成、分数+最高分 localStorage、游戏结束判定 |
| 参考亮点 | `40963/` 是唯一 Phaser 3 原生例程，344 行包含完整的键盘+滑动输入、tween 动画、分数持久化，代码质量最高 |
| 为什么换 | Sokoban 需要手工设计关卡数据，AI 难以动态扩展；2048 纯算法生成，无限可玩 |
| 预计代码量 | 300→450 行 |

---

## 建议新增 3 个模板类型

| 新模板 | 参考例程 | 理由 |
|---|---|---|
| **Breakout 打砖块** | `breakout3/`（130 行，Phaser 3 原生） | 经典物理游戏，用 `cdn-breakout-ball` + `cdn-block`，代码极简适合入门 |
| **Fruit Ninja 切水果** | `fruit/`（1001 行但可精简到 400） | 触屏友好，用 `cdn-apple`/`cdn-melon`/`cdn-pineapple` + `cdn-bomb`，粒子特效教学好素材 |
| **Memory 翻牌配对** | `memory/`（258 行） | 非物理类游戏补充，用各种 CDN 素材做牌面，适合低龄/休闲用户 |

---

## 参考例程详细分析

### `40963/` — 2048 变体 (Phaser 3) ⭐⭐⭐⭐⭐

- **344 行**，单文件，Phaser 3 scene-based
- 键盘 WASD/方向键 + 触屏滑动双输入
- tween 动画（移动+合并缩放）
- localStorage 最高分持久化
- `canMove` 标志防止动画期间输入
- **最适合直接移植为 puzzle 模板**

### `shoot/` — 俯视射击 (Phaser 2) ⭐⭐⭐

- **256 行**，9 个文件，关注点分离好
- player.js / enemy.js / bullet.js 独立模块
- 鼠标指针跟踪旋转 + 三连射武器
- 敌人从屏幕边缘随机生成，朝玩家移动
- 血条 + 击杀计数 + Game Over

### `breakout3/` — 打砖块 (Phaser 3) ⭐⭐⭐⭐

- **130 行**，单文件，极简
- Arcade physics: `setCollideWorldBounds(true)` + `setBounce(1)`
- 碰撞位置决定反弹角度
- 砖块清空自动 resetLevel
- **最小可用模板，适合入门**

### `fruit/` — 切水果 (Phaser 2) ⭐⭐⭐⭐

- **1001 行**，11 个文件
- fruitObj: 物理+粒子发射器+切割动画
- bladeObj: 鼠标轨迹多边形碰撞检测
- bombObj: 爆炸动画+游戏结束触发
- Combo 系统 (x, xx, xxx)
- **精简后可作为触屏游戏模板**

### `memory/` — 翻牌配对 (Phaser 2) ⭐⭐⭐

- **258 行**，单文件
- 4×4 网格，8 对卡片
- BitmapData 自绘卡面
- 计时评级 (S/A/B/C)
- 完整 state 流: boot→loader→welcome→game→gameover

### `dinosaur/` — 恐龙跑酷 (Phaser 2) ⭐⭐⭐

- **154 行**，2 个文件
- gravity 800 + camera follow
- 碰撞层不可见但实体
- idle/walk/jump 动画状态切换
- **适合作为 endless runner 的物理参考**

### `bike/` — 单车跑酷 (Phaser 2) ⭐⭐⭐

- **8 个文件**，多 state 架构
- Boot→Game→Result→Rank 完整流程
- 双跳 + 障碍 + 滚动背景 + 计分
- **适合作为 endless runner 的架构参考**

---

## 实施优先级

1. **P0** — 升级现有 5 模板，把 CDN 素材替换色块（视觉提升最大、改动最小）
2. **P1** — 用 `40963/` 替换 puzzle 模板为 2048（玩法质变）
3. **P2** — 新增 Breakout 模板（代码量最少，130→250 行）
4. **P3** — 新增 Fruit Ninja + Memory 模板

## 通用升级原则

- 所有模板使用 CDN 素材（`preloadCode`）替代 `graphics.generateTexture` 色块
- 保持模板代码 **≤800 行**，让 AI agent 能理解和修改
- 每个模板包含完整游戏循环：菜单→游戏→结束→重来
- 模板代码要有清晰的可扩展点（如关卡数据、敌人配置、道具表），方便 AI 按用户需求扩展
