export type AssetCategory =
	| "character"
	| "environment"
	| "ui"
	| "effect"
	| "item"
	| "shape"
	| "background"
	| "particle";

export interface AssetCatalogEntry {
	id: string;
	name: string;
	nameZh: string;
	type: "texture" | "spritesheet" | "audio" | "particle-config";
	category: AssetCategory;
	tags: string[];
	generatorCode: string;
}

export const ASSET_CATALOG: AssetCatalogEntry[] = [
	{
		id: "char-player-rect",
		name: "player",
		nameZh: "玩家矩形",
		type: "texture",
		category: "character",
		tags: ["player", "character", "hero", "玩家", "角色", "主角"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x06b6d4, 1);
g.fillRect(0, 0, 32, 48);
g.generateTexture("player", 32, 48);
g.destroy();`,
	},
	{
		id: "char-enemy-rect",
		name: "enemy",
		nameZh: "敌人矩形",
		type: "texture",
		category: "character",
		tags: ["enemy", "monster", "敌人", "怪物", "敌方"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xef4444, 1);
g.fillRect(0, 0, 32, 32);
g.generateTexture("enemy", 32, 32);
g.destroy();`,
	},
	{
		id: "char-npc-rect",
		name: "npc",
		nameZh: "NPC 矩形",
		type: "texture",
		category: "character",
		tags: ["npc", "villager", "NPC", "村民", "角色"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xa78bfa, 1);
g.fillRect(0, 0, 28, 36);
g.generateTexture("npc", 28, 36);
g.destroy();`,
	},
	{
		id: "char-boss",
		name: "boss",
		nameZh: "Boss 矩形",
		type: "texture",
		category: "character",
		tags: ["boss", "大怪", "BOSS", "首领"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xdc2626, 1);
g.fillRect(0, 0, 64, 64);
g.generateTexture("boss", 64, 64);
g.destroy();`,
	},
	{
		id: "env-ground",
		name: "ground",
		nameZh: "地面",
		type: "texture",
		category: "environment",
		tags: ["ground", "floor", "platform", "地面", "平台", "地板"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x4ade80, 1);
g.fillRect(0, 0, 200, 32);
g.generateTexture("ground", 200, 32);
g.destroy();`,
	},
	{
		id: "env-wall",
		name: "wall",
		nameZh: "墙壁",
		type: "texture",
		category: "environment",
		tags: ["wall", "block", "brick", "墙壁", "砖块", "方块"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x64748b, 1);
g.fillRect(0, 0, 40, 40);
g.generateTexture("wall", 40, 40);
g.destroy();`,
	},
	{
		id: "env-sky",
		name: "sky",
		nameZh: "天空背景",
		type: "texture",
		category: "environment",
		tags: ["sky", "background", "天空", "背景"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x1e3a5f, 1);
g.fillRect(0, 0, 800, 600);
g.generateTexture("sky", 800, 600);
g.destroy();`,
	},
	{
		id: "env-water",
		name: "water",
		nameZh: "水面",
		type: "texture",
		category: "environment",
		tags: ["water", "ocean", "lake", "水", "海洋", "湖"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x0ea5e9, 0.7);
g.fillRect(0, 0, 800, 40);
g.generateTexture("water", 800, 40);
g.destroy();`,
	},
	{
		id: "env-tree",
		name: "tree",
		nameZh: "树木",
		type: "texture",
		category: "environment",
		tags: ["tree", "plant", "forest", "树", "植物", "森林"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x854d0e, 1);
g.fillRect(12, 24, 8, 24);
g.fillStyle(0x22c55e, 1);
g.fillCircle(16, 16, 16);
g.generateTexture("tree", 32, 48);
g.destroy();`,
	},
	{
		id: "item-coin",
		name: "coin",
		nameZh: "金币",
		type: "texture",
		category: "item",
		tags: ["coin", "gold", "money", "金币", "金子", "货币", "收集品"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xfbbf24, 1);
g.fillCircle(8, 8, 8);
g.generateTexture("coin", 16, 16);
g.destroy();`,
	},
	{
		id: "item-heart",
		name: "heart",
		nameZh: "爱心/血量",
		type: "texture",
		category: "item",
		tags: ["heart", "health", "life", "爱心", "血量", "生命"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xef4444, 1);
g.fillCircle(6, 6, 6);
g.fillCircle(14, 6, 6);
g.fillTriangle(0, 8, 10, 20, 20, 8);
g.generateTexture("heart", 20, 20);
g.destroy();`,
	},
	{
		id: "item-star",
		name: "star",
		nameZh: "星星",
		type: "texture",
		category: "item",
		tags: ["star", "bonus", "星星", "奖励", "加分"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xfbbf24, 1);
g.fillCircle(10, 10, 10);
g.generateTexture("star", 20, 20);
g.destroy();`,
	},
	{
		id: "item-key",
		name: "key",
		nameZh: "钥匙",
		type: "texture",
		category: "item",
		tags: ["key", "unlock", "钥匙", "解锁", "道具"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xeab308, 1);
g.fillCircle(6, 6, 6);
g.fillRect(4, 10, 4, 12);
g.fillRect(4, 18, 8, 3);
g.generateTexture("key", 16, 24);
g.destroy();`,
	},
	{
		id: "item-chest",
		name: "chest",
		nameZh: "宝箱",
		type: "texture",
		category: "item",
		tags: ["chest", "treasure", "box", "宝箱", "宝藏", "箱子"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xb45309, 1);
g.fillRect(0, 0, 24, 20);
g.fillStyle(0xfbbf24, 1);
g.fillRect(9, 6, 6, 6);
g.generateTexture("chest", 24, 20);
g.destroy();`,
	},
	{
		id: "effect-bullet",
		name: "bullet",
		nameZh: "子弹",
		type: "texture",
		category: "effect",
		tags: ["bullet", "projectile", "shot", "子弹", "弹丸", "射击"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xfbbf24, 1);
g.fillRect(0, 0, 6, 14);
g.generateTexture("bullet", 6, 14);
g.destroy();`,
	},
	{
		id: "effect-explosion",
		name: "explosion",
		nameZh: "爆炸效果",
		type: "texture",
		category: "effect",
		tags: ["explosion", "blast", "boom", "爆炸", "特效"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xf97316, 1);
g.fillCircle(16, 16, 16);
g.fillStyle(0xfbbf24, 1);
g.fillCircle(16, 16, 10);
g.generateTexture("explosion", 32, 32);
g.destroy();`,
	},
	{
		id: "effect-particle",
		name: "particle",
		nameZh: "粒子",
		type: "texture",
		category: "effect",
		tags: ["particle", "spark", "dot", "粒子", "火花"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xffffff, 1);
g.fillCircle(4, 4, 4);
g.generateTexture("particle", 8, 8);
g.destroy();`,
	},
	{
		id: "env-spike",
		name: "spike",
		nameZh: "尖刺",
		type: "texture",
		category: "environment",
		tags: ["spike", "trap", "danger", "尖刺", "陷阱", "危险"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xef4444, 1);
g.fillTriangle(0, 20, 16, 0, 32, 20);
g.generateTexture("spike", 32, 20);
g.destroy();`,
	},
	{
		id: "ui-button",
		name: "button",
		nameZh: "按钮",
		type: "texture",
		category: "ui",
		tags: ["button", "btn", "按钮", "UI"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x06b6d4, 1);
g.fillRoundedRect(0, 0, 120, 40, 8);
g.generateTexture("button", 120, 40);
g.destroy();`,
	},
	{
		id: "ui-panel",
		name: "panel",
		nameZh: "面板背景",
		type: "texture",
		category: "ui",
		tags: ["panel", "dialog", "window", "面板", "对话框", "窗口"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x1e293b, 0.9);
g.fillRoundedRect(0, 0, 300, 200, 12);
g.lineStyle(2, 0x06b6d4, 1);
g.strokeRoundedRect(0, 0, 300, 200, 12);
g.generateTexture("panel", 300, 200);
g.destroy();`,
	},
	{
		id: "env-cloud",
		name: "cloud",
		nameZh: "云朵",
		type: "texture",
		category: "environment",
		tags: ["cloud", "sky", "weather", "云", "天空"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xffffff, 0.8);
g.fillCircle(20, 20, 16);
g.fillCircle(40, 16, 20);
g.fillCircle(60, 20, 16);
g.fillCircle(30, 12, 14);
g.fillCircle(50, 12, 14);
g.generateTexture("cloud", 80, 40);
g.destroy();`,
	},
	{
		id: "char-ship",
		name: "ship",
		nameZh: "飞船",
		type: "texture",
		category: "character",
		tags: ["ship", "spaceship", "plane", "飞船", "飞机", "太空"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x06b6d4, 1);
g.fillTriangle(20, 0, 0, 40, 40, 40);
g.generateTexture("ship", 40, 40);
g.destroy();`,
	},

	// ── Shape 形状类 ──

	{
		id: "shape-star5",
		name: "star5",
		nameZh: "五角星",
		type: "texture",
		category: "shape",
		tags: ["star", "shape", "五角星", "形状", "装饰"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xfbbf24, 1);
g.beginPath();
for (let i = 0; i < 5; i++) {
  const outer = (i * 72 - 90) * Math.PI / 180;
  const inner = ((i * 72) + 36 - 90) * Math.PI / 180;
  g.lineTo(24 + 24 * Math.cos(outer), 24 + 24 * Math.sin(outer));
  g.lineTo(24 + 10 * Math.cos(inner), 24 + 10 * Math.sin(inner));
}
g.closePath();
g.fillPath();
g.generateTexture("star5", 48, 48);
g.destroy();`,
	},
	{
		id: "shape-diamond",
		name: "diamond",
		nameZh: "菱形",
		type: "texture",
		category: "shape",
		tags: ["diamond", "rhombus", "菱形", "形状", "宝石"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x06b6d4, 1);
g.fillTriangle(16, 0, 0, 20, 16, 40);
g.fillTriangle(16, 0, 32, 20, 16, 40);
g.generateTexture("diamond", 32, 40);
g.destroy();`,
	},
	{
		id: "shape-hexagon",
		name: "hexagon",
		nameZh: "六边形",
		type: "texture",
		category: "shape",
		tags: ["hexagon", "hex", "六边形", "蜂窝", "形状"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x8b5cf6, 1);
g.beginPath();
for (let i = 0; i < 6; i++) {
  const a = (i * 60 - 30) * Math.PI / 180;
  g.lineTo(20 + 20 * Math.cos(a), 20 + 20 * Math.sin(a));
}
g.closePath();
g.fillPath();
g.generateTexture("hexagon", 40, 40);
g.destroy();`,
	},
	{
		id: "shape-arrow",
		name: "arrow",
		nameZh: "箭头",
		type: "texture",
		category: "shape",
		tags: ["arrow", "direction", "箭头", "方向", "指示"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x22c55e, 1);
g.fillTriangle(20, 0, 0, 20, 40, 20);
g.fillRect(12, 20, 16, 16);
g.generateTexture("arrow", 40, 36);
g.destroy();`,
	},
	{
		id: "shape-cross",
		name: "cross",
		nameZh: "十字",
		type: "texture",
		category: "shape",
		tags: ["cross", "plus", "十字", "加号", "形状"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xef4444, 1);
g.fillRect(12, 0, 12, 36);
g.fillRect(0, 12, 36, 12);
g.generateTexture("cross", 36, 36);
g.destroy();`,
	},
	{
		id: "shape-ring",
		name: "ring",
		nameZh: "圆环",
		type: "texture",
		category: "shape",
		tags: ["ring", "circle", "donut", "圆环", "环形"],
		generatorCode: `const g = this.add.graphics();
g.lineStyle(4, 0xfbbf24, 1);
g.strokeCircle(20, 20, 16);
g.generateTexture("ring", 40, 40);
g.destroy();`,
	},
	{
		id: "shape-shield",
		name: "shield",
		nameZh: "盾牌",
		type: "texture",
		category: "shape",
		tags: ["shield", "defense", "盾牌", "防御", "护盾"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x3b82f6, 1);
g.fillRoundedRect(4, 0, 32, 28, 4);
g.fillTriangle(4, 28, 36, 28, 20, 44);
g.lineStyle(2, 0x93c5fd, 1);
g.strokeRoundedRect(4, 0, 32, 28, 4);
g.generateTexture("shield", 40, 44);
g.destroy();`,
	},

	// ── Background 背景类 ──

	{
		id: "bg-gradient-sunset",
		name: "sunset",
		nameZh: "日落渐变",
		type: "texture",
		category: "background",
		tags: ["sunset", "gradient", "background", "日落", "渐变", "背景"],
		generatorCode: `const g = this.add.graphics();
const colors = [0x1e1b4b, 0x4c1d95, 0xbe185d, 0xf97316, 0xfbbf24];
const h = 120;
for (let i = 0; i < colors.length - 1; i++) {
  g.fillStyle(colors[i], 1);
  g.fillRect(0, i * (h / (colors.length - 1)), 200, h / (colors.length - 1) + 1);
}
g.generateTexture("sunset", 200, 120);
g.destroy();`,
	},
	{
		id: "bg-gradient-ocean",
		name: "ocean-gradient",
		nameZh: "海洋渐变",
		type: "texture",
		category: "background",
		tags: ["ocean", "sea", "gradient", "海洋", "渐变", "蓝色"],
		generatorCode: `const g = this.add.graphics();
const colors = [0x0c4a6e, 0x0369a1, 0x0ea5e9, 0x7dd3fc];
const h = 120;
for (let i = 0; i < colors.length; i++) {
  g.fillStyle(colors[i], 1);
  g.fillRect(0, i * (h / colors.length), 200, h / colors.length + 1);
}
g.generateTexture("ocean-gradient", 200, 120);
g.destroy();`,
	},
	{
		id: "bg-starfield",
		name: "starfield",
		nameZh: "星空",
		type: "texture",
		category: "background",
		tags: ["starfield", "space", "night", "星空", "太空", "夜空"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x0f172a, 1);
g.fillRect(0, 0, 200, 150);
const positions = [[20,10],[50,30],[80,15],[120,45],[160,20],[30,70],[90,90],[140,80],[170,110],[45,120],[100,60],[15,45],[135,35],[180,70],[60,100],[110,130],[25,140],[155,140],[75,50],[130,100]];
for (const [x, y] of positions) {
  const s = Math.random() * 0.5 + 0.5;
  g.fillStyle(0xffffff, s);
  g.fillCircle(x, y, s > 0.8 ? 2 : 1);
}
g.generateTexture("starfield", 200, 150);
g.destroy();`,
	},
	{
		id: "bg-grid",
		name: "grid-bg",
		nameZh: "网格背景",
		type: "texture",
		category: "background",
		tags: ["grid", "tile", "pattern", "网格", "格子", "瓦片"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x1e293b, 1);
g.fillRect(0, 0, 64, 64);
g.lineStyle(1, 0x334155, 0.8);
for (let x = 0; x <= 64; x += 16) { g.moveTo(x, 0); g.lineTo(x, 64); }
for (let y = 0; y <= 64; y += 16) { g.moveTo(0, y); g.lineTo(64, y); }
g.strokePath();
g.generateTexture("grid-bg", 64, 64);
g.destroy();`,
	},
	{
		id: "bg-checkerboard",
		name: "checkerboard",
		nameZh: "棋盘格",
		type: "texture",
		category: "background",
		tags: ["checkerboard", "checker", "pattern", "棋盘", "格子"],
		generatorCode: `const g = this.add.graphics();
for (let y = 0; y < 4; y++) {
  for (let x = 0; x < 4; x++) {
    g.fillStyle((x + y) % 2 === 0 ? 0x374151 : 0x1f2937, 1);
    g.fillRect(x * 16, y * 16, 16, 16);
  }
}
g.generateTexture("checkerboard", 64, 64);
g.destroy();`,
	},

	// ── Particle 粒子预设类 ──

	{
		id: "particle-fire-dot",
		name: "fire-particle",
		nameZh: "火焰粒子",
		type: "texture",
		category: "particle",
		tags: ["fire", "flame", "particle", "火焰", "粒子", "特效"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xff4500, 1);
g.fillCircle(6, 6, 6);
g.fillStyle(0xffa500, 0.8);
g.fillCircle(6, 6, 4);
g.fillStyle(0xffff00, 0.6);
g.fillCircle(6, 6, 2);
g.generateTexture("fire-particle", 12, 12);
g.destroy();`,
	},
	{
		id: "particle-smoke-dot",
		name: "smoke-particle",
		nameZh: "烟雾粒子",
		type: "texture",
		category: "particle",
		tags: ["smoke", "fog", "particle", "烟雾", "烟", "粒子"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x9ca3af, 0.5);
g.fillCircle(8, 8, 8);
g.fillStyle(0xd1d5db, 0.3);
g.fillCircle(8, 8, 5);
g.generateTexture("smoke-particle", 16, 16);
g.destroy();`,
	},
	{
		id: "particle-rain-drop",
		name: "raindrop",
		nameZh: "雨滴",
		type: "texture",
		category: "particle",
		tags: ["rain", "drop", "water", "雨", "雨滴", "天气"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x60a5fa, 0.7);
g.fillRect(0, 0, 2, 10);
g.generateTexture("raindrop", 2, 10);
g.destroy();`,
	},
	{
		id: "particle-snow-flake",
		name: "snowflake",
		nameZh: "雪花",
		type: "texture",
		category: "particle",
		tags: ["snow", "winter", "flake", "雪", "雪花", "冬天"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xffffff, 0.9);
g.fillCircle(4, 4, 3);
g.generateTexture("snowflake", 8, 8);
g.destroy();`,
	},
	{
		id: "particle-spark",
		name: "spark",
		nameZh: "火花",
		type: "texture",
		category: "particle",
		tags: ["spark", "sparkle", "glitter", "火花", "闪光", "闪烁"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xfbbf24, 1);
g.fillRect(2, 0, 2, 6);
g.fillRect(0, 2, 6, 2);
g.generateTexture("spark", 6, 6);
g.destroy();`,
	},

	// ── Tileset 瓦片类 ──

	{
		id: "tile-grass",
		name: "grass-tile",
		nameZh: "草地瓦片",
		type: "texture",
		category: "environment",
		tags: ["grass", "tile", "terrain", "草地", "瓦片", "地形"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x22c55e, 1);
g.fillRect(0, 0, 32, 32);
g.fillStyle(0x16a34a, 1);
g.fillRect(4, 8, 3, 5);
g.fillRect(14, 4, 3, 6);
g.fillRect(24, 12, 3, 4);
g.fillRect(10, 20, 3, 5);
g.fillRect(20, 24, 3, 4);
g.generateTexture("grass-tile", 32, 32);
g.destroy();`,
	},
	{
		id: "tile-stone",
		name: "stone-tile",
		nameZh: "石头瓦片",
		type: "texture",
		category: "environment",
		tags: ["stone", "rock", "tile", "石头", "岩石", "瓦片"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0x78716c, 1);
g.fillRect(0, 0, 32, 32);
g.lineStyle(1, 0x57534e, 0.6);
g.strokeRect(1, 1, 14, 10);
g.strokeRect(17, 1, 14, 10);
g.strokeRect(1, 13, 10, 10);
g.strokeRect(13, 13, 18, 10);
g.strokeRect(1, 25, 18, 6);
g.strokeRect(21, 25, 10, 6);
g.generateTexture("stone-tile", 32, 32);
g.destroy();`,
	},
	{
		id: "tile-sand",
		name: "sand-tile",
		nameZh: "沙地瓦片",
		type: "texture",
		category: "environment",
		tags: ["sand", "desert", "beach", "沙地", "沙漠", "海滩"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xd4a574, 1);
g.fillRect(0, 0, 32, 32);
g.fillStyle(0xc4956a, 0.5);
g.fillCircle(8, 12, 2);
g.fillCircle(22, 6, 1);
g.fillCircle(16, 24, 2);
g.fillCircle(28, 20, 1);
g.generateTexture("sand-tile", 32, 32);
g.destroy();`,
	},
	{
		id: "tile-lava",
		name: "lava-tile",
		nameZh: "岩浆瓦片",
		type: "texture",
		category: "environment",
		tags: ["lava", "magma", "fire", "岩浆", "火山", "熔岩"],
		generatorCode: `const g = this.add.graphics();
g.fillStyle(0xdc2626, 1);
g.fillRect(0, 0, 32, 32);
g.fillStyle(0xf97316, 0.8);
g.fillCircle(8, 16, 6);
g.fillCircle(24, 10, 5);
g.fillStyle(0xfbbf24, 0.6);
g.fillCircle(16, 20, 4);
g.generateTexture("lava-tile", 32, 32);
g.destroy();`,
	},
];

export function searchCatalog(query: string, type?: string): AssetCatalogEntry[] {
	const q = query.toLowerCase();
	return ASSET_CATALOG.filter((entry) => {
		if (type && entry.category !== type && entry.type !== type) return false;
		return (
			entry.name.toLowerCase().includes(q) ||
			entry.nameZh.includes(q) ||
			entry.tags.some((t) => t.toLowerCase().includes(q))
		);
	});
}
