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
	type: "texture" | "spritesheet" | "audio" | "particle-config" | "css";
	category: AssetCategory;
	tags: string[];
	generatorCode: string;
	url?: string;
	preloadCode?: string;
	frameConfig?: { frameWidth: number; frameHeight: number };
}

export const ASSET_CATALOG: AssetCatalogEntry[] = [
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

	// ── Phaser Labs CDN 图片素材 ──

	{
		id: "cdn-phaser-dude",
		name: "phaser-dude",
		nameZh: "Phaser 小人",
		type: "spritesheet",
		category: "character",
		tags: ["phaser", "dude", "player", "character", "run", "jump", "角色", "小人", "玩家", "跑跳"],
		generatorCode: "",
		url: "/assets/sprites/dude.png",
		preloadCode: `this.load.spritesheet("phaser-dude", "/assets/sprites/dude.png", { frameWidth: 32, frameHeight: 48 });`,
		frameConfig: { frameWidth: 32, frameHeight: 48 },
	},
	{
		id: "cdn-mushroom",
		name: "mushroom",
		nameZh: "蘑菇",
		type: "texture",
		category: "item",
		tags: ["mushroom", "item", "powerup", "蘑菇", "道具", "增益"],
		generatorCode: "",
		url: "/assets/sprites/mushroom2.png",
		preloadCode: `this.load.image("mushroom", "/assets/sprites/mushroom2.png");`,
	},
	{
		id: "cdn-diamond",
		name: "diamond-gem",
		nameZh: "钻石宝石",
		type: "texture",
		category: "item",
		tags: ["diamond", "gem", "crystal", "collect", "钻石", "宝石", "水晶", "收集"],
		generatorCode: "",
		url: "/assets/sprites/diamond.png",
		preloadCode: `this.load.image("diamond-gem", "/assets/sprites/diamond.png");`,
	},
	{
		id: "cdn-coin-sprite",
		name: "coin-sprite",
		nameZh: "金币精灵",
		type: "spritesheet",
		category: "item",
		tags: ["coin", "gold", "money", "collect", "animated", "金币", "货币", "收集", "动画"],
		generatorCode: "",
		url: "/assets/sprites/coin.png",
		preloadCode: `this.load.spritesheet("coin-sprite", "/assets/sprites/coin.png", { frameWidth: 32, frameHeight: 32 });`,
		frameConfig: { frameWidth: 32, frameHeight: 32 },
	},
	{
		id: "cdn-bomb",
		name: "bomb",
		nameZh: "炸弹",
		type: "texture",
		category: "item",
		tags: ["bomb", "danger", "explosive", "trap", "炸弹", "危险", "爆炸物", "陷阱"],
		generatorCode: "",
		url: "/assets/sprites/bomb.png",
		preloadCode: `this.load.image("bomb", "/assets/sprites/bomb.png");`,
	},
	{
		id: "cdn-star-hd",
		name: "star-hd",
		nameZh: "高清星星",
		type: "texture",
		category: "item",
		tags: ["star", "collect", "bonus", "reward", "星星", "收集", "奖励", "加分"],
		generatorCode: "",
		url: "/assets/demoscene/star.png",
		preloadCode: `this.load.image("star-hd", "/assets/demoscene/star.png");`,
	},
	{
		id: "cdn-sky",
		name: "sky-bg",
		nameZh: "天空背景(高清)",
		type: "texture",
		category: "background",
		tags: ["sky", "background", "blue", "gradient", "天空", "背景", "蓝色"],
		generatorCode: "",
		url: "/assets/skies/sky4.png",
		preloadCode: `this.load.image("sky-bg", "/assets/skies/sky4.png");`,
	},
	{
		id: "cdn-space-bg",
		name: "space-bg",
		nameZh: "太空背景",
		type: "texture",
		category: "background",
		tags: ["space", "background", "dark", "stars", "太空", "背景", "星空", "深空"],
		generatorCode: "",
		url: "/assets/skies/space3.png",
		preloadCode: `this.load.image("space-bg", "/assets/skies/space3.png");`,
	},
	{
		id: "cdn-underwater-bg",
		name: "underwater-bg",
		nameZh: "水下背景",
		type: "texture",
		category: "background",
		tags: ["underwater", "ocean", "sea", "background", "水下", "海洋", "背景"],
		generatorCode: "",
		url: "/assets/skies/underwater1.png",
		preloadCode: `this.load.image("underwater-bg", "/assets/skies/underwater1.png");`,
	},
	{
		id: "cdn-platform",
		name: "platform",
		nameZh: "平台(高清)",
		type: "texture",
		category: "environment",
		tags: ["platform", "ground", "grass", "terrain", "平台", "地面", "草地"],
		generatorCode: "",
		url: "/assets/sprites/platform.png",
		preloadCode: `this.load.image("platform", "/assets/sprites/platform.png");`,
	},
	{
		id: "cdn-red-particle",
		name: "red-particle",
		nameZh: "红色粒子",
		type: "texture",
		category: "particle",
		tags: ["particle", "red", "fire", "effect", "粒子", "红色", "火焰", "特效"],
		generatorCode: "",
		url: "/assets/particles/red.png",
		preloadCode: `this.load.image("red-particle", "/assets/particles/red.png");`,
	},
	{
		id: "cdn-blue-particle",
		name: "blue-particle",
		nameZh: "蓝色粒子",
		type: "texture",
		category: "particle",
		tags: ["particle", "blue", "water", "ice", "effect", "粒子", "蓝色", "水", "冰"],
		generatorCode: "",
		url: "/assets/particles/blue.png",
		preloadCode: `this.load.image("blue-particle", "/assets/particles/blue.png");`,
	},
	{
		id: "cdn-yellow-particle",
		name: "yellow-particle",
		nameZh: "黄色粒子",
		type: "texture",
		category: "particle",
		tags: ["particle", "yellow", "spark", "effect", "粒子", "黄色", "火花"],
		generatorCode: "",
		url: "/assets/particles/yellow.png",
		preloadCode: `this.load.image("yellow-particle", "/assets/particles/yellow.png");`,
	},
	{
		id: "cdn-flares",
		name: "flares",
		nameZh: "光晕粒子图集",
		type: "spritesheet",
		category: "effect",
		tags: ["flare", "glow", "particle", "effect", "light", "光晕", "发光", "粒子", "特效"],
		generatorCode: "",
		url: "/assets/particles/flares.png",
		preloadCode: `this.load.spritesheet("flares", "/assets/particles/flares.png", { frameWidth: 128, frameHeight: 128 });`,
		frameConfig: { frameWidth: 128, frameHeight: 128 },
	},
	{
		id: "cdn-block",
		name: "block",
		nameZh: "方块砖块",
		type: "texture",
		category: "environment",
		tags: ["block", "brick", "tile", "wall", "方块", "砖块", "墙"],
		generatorCode: "",
		url: "/assets/sprites/block.png",
		preloadCode: `this.load.image("block", "/assets/sprites/block.png");`,
	},
	{
		id: "cdn-crate",
		name: "crate",
		nameZh: "木箱",
		type: "texture",
		category: "environment",
		tags: ["crate", "box", "wood", "pushable", "木箱", "箱子", "可推动"],
		generatorCode: "",
		url: "/assets/sprites/crate.png",
		preloadCode: `this.load.image("crate", "/assets/sprites/crate.png");`,
	},
	{
		id: "cdn-phaser-ship",
		name: "phaser-ship",
		nameZh: "太空飞船(高清)",
		type: "texture",
		category: "character",
		tags: ["ship", "spaceship", "player", "飞船", "太空船", "玩家"],
		generatorCode: "",
		url: "/assets/sprites/thrust_ship2.png",
		preloadCode: `this.load.image("phaser-ship", "/assets/sprites/thrust_ship2.png");`,
	},
	{
		id: "cdn-invader",
		name: "space-invader",
		nameZh: "太空入侵者",
		type: "texture",
		category: "character",
		tags: ["invader", "alien", "enemy", "space", "入侵者", "外星人", "敌人"],
		generatorCode: "",
		url: "/assets/sprites/space-baddie.png",
		preloadCode: `this.load.image("space-invader", "/assets/sprites/space-baddie.png");`,
	},
	{
		id: "cdn-bullet-sprite",
		name: "bullet-sprite",
		nameZh: "子弹精灵",
		type: "texture",
		category: "effect",
		tags: ["bullet", "projectile", "laser", "shot", "子弹", "弹丸", "激光"],
		generatorCode: "",
		url: "/assets/sprites/bullets/bullet7.png",
		preloadCode: `this.load.image("bullet-sprite", "/assets/sprites/bullets/bullet7.png");`,
	},
	{
		id: "cdn-explosion-sprite",
		name: "explosion-sprite",
		nameZh: "爆炸精灵表",
		type: "spritesheet",
		category: "effect",
		tags: ["explosion", "boom", "blast", "animated", "爆炸", "动画", "特效"],
		generatorCode: "",
		url: "/assets/sprites/explosion.png",
		preloadCode: `this.load.spritesheet("explosion-sprite", "/assets/sprites/explosion.png", { frameWidth: 64, frameHeight: 64 });`,
		frameConfig: { frameWidth: 64, frameHeight: 64 },
	},

	// ── Phaser Labs CDN 第二批 ──

	// Characters / Sprites
	{
		id: "cdn-clown",
		name: "clown",
		nameZh: "小丑",
		type: "texture",
		category: "character",
		tags: ["clown", "character", "circus", "小丑", "角色", "马戏团"],
		generatorCode: "",
		url: "/assets/sprites/clown.png",
		preloadCode: `this.load.image("clown", "/assets/sprites/clown.png");`,
	},
	{
		id: "cdn-wabbit",
		name: "wabbit",
		nameZh: "兔子",
		type: "texture",
		category: "character",
		tags: ["rabbit", "bunny", "character", "兔子", "角色", "兔"],
		generatorCode: "",
		url: "/assets/sprites/wabbit.png",
		preloadCode: `this.load.image("wabbit", "/assets/sprites/wabbit.png");`,
	},
	{
		id: "cdn-metalface",
		name: "metalface",
		nameZh: "机器人脸",
		type: "texture",
		category: "character",
		tags: ["robot", "metal", "face", "character", "机器人", "金属", "角色"],
		generatorCode: "",
		url: "/assets/sprites/metalface78x92.png",
		preloadCode: `this.load.image("metalface", "/assets/sprites/metalface78x92.png");`,
	},
	{
		id: "cdn-ship-classic",
		name: "ship-classic",
		nameZh: "经典飞船",
		type: "texture",
		category: "character",
		tags: ["ship", "spaceship", "classic", "飞船", "经典", "太空"],
		generatorCode: "",
		url: "/assets/sprites/ship.png",
		preloadCode: `this.load.image("ship-classic", "/assets/sprites/ship.png");`,
	},
	{
		id: "cdn-thrust-ship",
		name: "thrust-ship",
		nameZh: "推进飞船",
		type: "texture",
		category: "character",
		tags: ["ship", "thrust", "spaceship", "飞船", "推进", "太空船"],
		generatorCode: "",
		url: "/assets/sprites/thrust_ship.png",
		preloadCode: `this.load.image("thrust-ship", "/assets/sprites/thrust_ship.png");`,
	},

	// Items / Collectibles
	{
		id: "cdn-gem",
		name: "gem",
		nameZh: "宝石",
		type: "texture",
		category: "item",
		tags: ["gem", "jewel", "collect", "宝石", "珠宝", "收集"],
		generatorCode: "",
		url: "/assets/sprites/gem.png",
		preloadCode: `this.load.image("gem", "/assets/sprites/gem.png");`,
	},
	{
		id: "cdn-carrot",
		name: "carrot",
		nameZh: "胡萝卜",
		type: "texture",
		category: "item",
		tags: ["carrot", "food", "vegetable", "collect", "胡萝卜", "食物", "蔬菜", "收集"],
		generatorCode: "",
		url: "/assets/sprites/carrot.png",
		preloadCode: `this.load.image("carrot", "/assets/sprites/carrot.png");`,
	},
	{
		id: "cdn-mushroom2",
		name: "mushroom-alt",
		nameZh: "蘑菇(另一款)",
		type: "texture",
		category: "item",
		tags: ["mushroom", "item", "fungus", "蘑菇", "道具", "菌类"],
		generatorCode: "",
		url: "/assets/sprites/mushroom.png",
		preloadCode: `this.load.image("mushroom-alt", "/assets/sprites/mushroom.png");`,
	},
	{
		id: "cdn-arrow",
		name: "arrow-sprite",
		nameZh: "箭矢",
		type: "texture",
		category: "item",
		tags: ["arrow", "projectile", "weapon", "箭矢", "弹射物", "武器"],
		generatorCode: "",
		url: "/assets/sprites/arrow.png",
		preloadCode: `this.load.image("arrow-sprite", "/assets/sprites/arrow.png");`,
	},

	// Balls / Projectiles
	{
		id: "cdn-aqua-ball",
		name: "aqua-ball",
		nameZh: "水蓝球",
		type: "texture",
		category: "effect",
		tags: ["ball", "aqua", "sphere", "projectile", "球", "水蓝", "弹球"],
		generatorCode: "",
		url: "/assets/sprites/aqua_ball.png",
		preloadCode: `this.load.image("aqua-ball", "/assets/sprites/aqua_ball.png");`,
	},
	{
		id: "cdn-orb-red",
		name: "orb-red",
		nameZh: "红色宝珠",
		type: "texture",
		category: "effect",
		tags: ["orb", "red", "sphere", "magic", "宝珠", "红色", "魔法球"],
		generatorCode: "",
		url: "/assets/sprites/orb-red.png",
		preloadCode: `this.load.image("orb-red", "/assets/sprites/orb-red.png");`,
	},
	{
		id: "cdn-orb-blue",
		name: "orb-blue",
		nameZh: "蓝色宝珠",
		type: "texture",
		category: "effect",
		tags: ["orb", "blue", "sphere", "magic", "宝珠", "蓝色", "魔法球"],
		generatorCode: "",
		url: "/assets/sprites/orb-blue.png",
		preloadCode: `this.load.image("orb-blue", "/assets/sprites/orb-blue.png");`,
	},
	{
		id: "cdn-orb-green",
		name: "orb-green",
		nameZh: "绿色宝珠",
		type: "texture",
		category: "effect",
		tags: ["orb", "green", "sphere", "magic", "宝珠", "绿色", "魔法球"],
		generatorCode: "",
		url: "/assets/sprites/orb-green.png",
		preloadCode: `this.load.image("orb-green", "/assets/sprites/orb-green.png");`,
	},
	{
		id: "cdn-pangball",
		name: "pangball",
		nameZh: "弹球",
		type: "texture",
		category: "effect",
		tags: ["ball", "pang", "bounce", "弹球", "弹跳", "球"],
		generatorCode: "",
		url: "/assets/sprites/pangball.png",
		preloadCode: `this.load.image("pangball", "/assets/sprites/pangball.png");`,
	},
	{
		id: "cdn-blue-ball",
		name: "blue-ball",
		nameZh: "蓝球",
		type: "texture",
		category: "effect",
		tags: ["ball", "blue", "sphere", "球", "蓝色", "蓝球"],
		generatorCode: "",
		url: "/assets/sprites/blue_ball.png",
		preloadCode: `this.load.image("blue-ball", "/assets/sprites/blue_ball.png");`,
	},
	{
		id: "cdn-red-ball",
		name: "red-ball",
		nameZh: "红球",
		type: "texture",
		category: "effect",
		tags: ["ball", "red", "sphere", "球", "红色", "红球"],
		generatorCode: "",
		url: "/assets/sprites/red_ball.png",
		preloadCode: `this.load.image("red-ball", "/assets/sprites/red_ball.png");`,
	},
	{
		id: "cdn-green-ball",
		name: "green-ball",
		nameZh: "绿球",
		type: "texture",
		category: "effect",
		tags: ["ball", "green", "sphere", "球", "绿色", "绿球"],
		generatorCode: "",
		url: "/assets/sprites/green_ball.png",
		preloadCode: `this.load.image("green-ball", "/assets/sprites/green_ball.png");`,
	},
	{
		id: "cdn-yellow-ball",
		name: "yellow-ball",
		nameZh: "黄球",
		type: "texture",
		category: "effect",
		tags: ["ball", "yellow", "sphere", "球", "黄色", "黄球"],
		generatorCode: "",
		url: "/assets/sprites/yellow_ball.png",
		preloadCode: `this.load.image("yellow-ball", "/assets/sprites/yellow_ball.png");`,
	},
	{
		id: "cdn-beball",
		name: "beball",
		nameZh: "彩球",
		type: "texture",
		category: "effect",
		tags: ["ball", "colorful", "bounce", "彩球", "彩色", "弹球"],
		generatorCode: "",
		url: "/assets/sprites/beball1.png",
		preloadCode: `this.load.image("beball", "/assets/sprites/beball1.png");`,
	},

	// Effects / Weapons
	{
		id: "cdn-shmup-bullet",
		name: "shmup-bullet",
		nameZh: "射击子弹",
		type: "texture",
		category: "effect",
		tags: ["bullet", "shmup", "shoot", "projectile", "子弹", "射击", "弹幕"],
		generatorCode: "",
		url: "/assets/sprites/shmup-bullet.png",
		preloadCode: `this.load.image("shmup-bullet", "/assets/sprites/shmup-bullet.png");`,
	},
	{
		id: "cdn-longarrow",
		name: "longarrow",
		nameZh: "长箭",
		type: "texture",
		category: "effect",
		tags: ["arrow", "long", "projectile", "weapon", "长箭", "弹射物", "武器"],
		generatorCode: "",
		url: "/assets/sprites/longarrow.png",
		preloadCode: `this.load.image("longarrow", "/assets/sprites/longarrow.png");`,
	},
	{
		id: "cdn-flectrum",
		name: "flectrum",
		nameZh: "飞镖",
		type: "texture",
		category: "effect",
		tags: ["flectrum", "dart", "shuriken", "projectile", "飞镖", "弹射物", "暗器"],
		generatorCode: "",
		url: "/assets/sprites/flectrum.png",
		preloadCode: `this.load.image("flectrum", "/assets/sprites/flectrum.png");`,
	},

	// UI
	{
		id: "cdn-healthbar",
		name: "healthbar",
		nameZh: "血条",
		type: "texture",
		category: "ui",
		tags: ["health", "bar", "hp", "ui", "血条", "生命值", "界面"],
		generatorCode: "",
		url: "/assets/sprites/healthbar.png",
		preloadCode: `this.load.image("healthbar", "/assets/sprites/healthbar.png");`,
	},

	// Backgrounds (skies)
	{
		id: "cdn-sky1",
		name: "sky1",
		nameZh: "天空1",
		type: "texture",
		category: "background",
		tags: ["sky", "background", "blue", "天空", "背景", "蓝天"],
		generatorCode: "",
		url: "/assets/skies/sky1.png",
		preloadCode: `this.load.image("sky1", "/assets/skies/sky1.png");`,
	},
	{
		id: "cdn-sky2",
		name: "sky2",
		nameZh: "天空2",
		type: "texture",
		category: "background",
		tags: ["sky", "background", "cloud", "天空", "背景", "云"],
		generatorCode: "",
		url: "/assets/skies/sky2.png",
		preloadCode: `this.load.image("sky2", "/assets/skies/sky2.png");`,
	},
	{
		id: "cdn-deepblue",
		name: "deepblue",
		nameZh: "深蓝天空",
		type: "texture",
		category: "background",
		tags: ["sky", "deep", "blue", "dark", "background", "天空", "深蓝", "背景"],
		generatorCode: "",
		url: "/assets/skies/deepblue.png",
		preloadCode: `this.load.image("deepblue", "/assets/skies/deepblue.png");`,
	},
	{
		id: "cdn-gradient13",
		name: "gradient-sky",
		nameZh: "渐变天空",
		type: "texture",
		category: "background",
		tags: ["sky", "gradient", "background", "天空", "渐变", "背景"],
		generatorCode: "",
		url: "/assets/skies/gradient13.png",
		preloadCode: `this.load.image("gradient-sky", "/assets/skies/gradient13.png");`,
	},
	{
		id: "cdn-sunset",
		name: "sunset-sky",
		nameZh: "日落天空",
		type: "texture",
		category: "background",
		tags: ["sunset", "sky", "dusk", "background", "日落", "天空", "黄昏", "背景"],
		generatorCode: "",
		url: "/assets/skies/sunset.png",
		preloadCode: `this.load.image("sunset-sky", "/assets/skies/sunset.png");`,
	},

	// Particles
	{
		id: "cdn-green-particle",
		name: "green-particle",
		nameZh: "绿色粒子",
		type: "texture",
		category: "particle",
		tags: ["particle", "green", "effect", "粒子", "绿色", "特效"],
		generatorCode: "",
		url: "/assets/particles/green.png",
		preloadCode: `this.load.image("green-particle", "/assets/particles/green.png");`,
	},
	{
		id: "cdn-white-particle",
		name: "white-particle",
		nameZh: "白色粒子",
		type: "texture",
		category: "particle",
		tags: ["particle", "white", "effect", "snow", "粒子", "白色", "特效", "雪"],
		generatorCode: "",
		url: "/assets/particles/white.png",
		preloadCode: `this.load.image("white-particle", "/assets/particles/white.png");`,
	},

	// ── Phaser Labs CDN 第三批：角色 ──

	{
		id: "cdn-lemming",
		name: "lemming",
		nameZh: "旅鼠",
		type: "texture",
		category: "character",
		tags: ["lemming", "character", "creature", "旅鼠", "角色", "生物"],
		generatorCode: "",
		url: "/assets/sprites/lemming.png",
		preloadCode: `this.load.image("lemming", "/assets/sprites/lemming.png");`,
	},
	{
		id: "cdn-skull",
		name: "skull",
		nameZh: "骷髅",
		type: "texture",
		category: "character",
		tags: ["skull", "skeleton", "enemy", "undead", "骷髅", "敌人", "亡灵"],
		generatorCode: "",
		url: "/assets/sprites/skull.png",
		preloadCode: `this.load.image("skull", "/assets/sprites/skull.png");`,
	},
	{
		id: "cdn-ufo",
		name: "ufo",
		nameZh: "UFO飞碟",
		type: "texture",
		category: "character",
		tags: ["ufo", "alien", "spaceship", "enemy", "UFO", "飞碟", "外星"],
		generatorCode: "",
		url: "/assets/sprites/ufo.png",
		preloadCode: `this.load.image("ufo", "/assets/sprites/ufo.png");`,
	},
	{
		id: "cdn-ghost",
		name: "ghost",
		nameZh: "幽灵",
		type: "texture",
		category: "character",
		tags: ["ghost", "spirit", "enemy", "undead", "幽灵", "鬼", "敌人"],
		generatorCode: "",
		url: "/assets/sprites/ghost.png",
		preloadCode: `this.load.image("ghost", "/assets/sprites/ghost.png");`,
	},
	{
		id: "cdn-snake",
		name: "snake",
		nameZh: "蛇",
		type: "texture",
		category: "character",
		tags: ["snake", "reptile", "enemy", "蛇", "爬行动物", "敌人"],
		generatorCode: "",
		url: "/assets/sprites/snake.png",
		preloadCode: `this.load.image("snake", "/assets/sprites/snake.png");`,
	},
	{
		id: "cdn-wasp",
		name: "wasp",
		nameZh: "黄蜂",
		type: "texture",
		category: "character",
		tags: ["wasp", "bee", "insect", "enemy", "黄蜂", "蜜蜂", "昆虫"],
		generatorCode: "",
		url: "/assets/sprites/wasp.png",
		preloadCode: `this.load.image("wasp", "/assets/sprites/wasp.png");`,
	},
	{
		id: "cdn-chick",
		name: "chick",
		nameZh: "小鸡",
		type: "texture",
		category: "character",
		tags: ["chick", "bird", "chicken", "cute", "小鸡", "鸟", "可爱"],
		generatorCode: "",
		url: "/assets/sprites/chick.png",
		preloadCode: `this.load.image("chick", "/assets/sprites/chick.png");`,
	},
	{
		id: "cdn-bunny",
		name: "bunny",
		nameZh: "兔子(另一款)",
		type: "texture",
		category: "character",
		tags: ["bunny", "rabbit", "cute", "character", "兔子", "兔", "可爱"],
		generatorCode: "",
		url: "/assets/sprites/bunny.png",
		preloadCode: `this.load.image("bunny", "/assets/sprites/bunny.png");`,
	},
	{
		id: "cdn-spaceman",
		name: "spaceman",
		nameZh: "宇航员",
		type: "texture",
		category: "character",
		tags: ["spaceman", "astronaut", "player", "character", "宇航员", "太空人", "角色"],
		generatorCode: "",
		url: "/assets/sprites/spaceman.png",
		preloadCode: `this.load.image("spaceman", "/assets/sprites/spaceman.png");`,
	},
	{
		id: "cdn-shmup-ship",
		name: "shmup-ship",
		nameZh: "弹幕飞船",
		type: "texture",
		category: "character",
		tags: ["ship", "shmup", "shooter", "player", "飞船", "弹幕", "射击"],
		generatorCode: "",
		url: "/assets/sprites/shmup-ship.png",
		preloadCode: `this.load.image("shmup-ship", "/assets/sprites/shmup-ship.png");`,
	},
	{
		id: "cdn-shmup-ship2",
		name: "shmup-ship2",
		nameZh: "弹幕飞船2号",
		type: "texture",
		category: "character",
		tags: ["ship", "shmup", "shooter", "player", "飞船", "弹幕", "射击"],
		generatorCode: "",
		url: "/assets/sprites/shmup-ship2.png",
		preloadCode: `this.load.image("shmup-ship2", "/assets/sprites/shmup-ship2.png");`,
	},
	{
		id: "cdn-car",
		name: "car",
		nameZh: "汽车",
		type: "texture",
		category: "character",
		tags: ["car", "vehicle", "racing", "player", "汽车", "车辆", "赛车"],
		generatorCode: "",
		url: "/assets/sprites/car.png",
		preloadCode: `this.load.image("car", "/assets/sprites/car.png");`,
	},
	{
		id: "cdn-car90",
		name: "car-topdown",
		nameZh: "汽车(俯视)",
		type: "texture",
		category: "character",
		tags: ["car", "vehicle", "topdown", "racing", "汽车", "俯视", "赛车"],
		generatorCode: "",
		url: "/assets/sprites/car90.png",
		preloadCode: `this.load.image("car-topdown", "/assets/sprites/car90.png");`,
	},
	{
		id: "cdn-asteroids-ship",
		name: "asteroids-ship",
		nameZh: "小行星游戏飞船",
		type: "texture",
		category: "character",
		tags: ["ship", "asteroids", "retro", "player", "飞船", "小行星", "复古"],
		generatorCode: "",
		url: "/assets/sprites/asteroids_ship.png",
		preloadCode: `this.load.image("asteroids-ship", "/assets/sprites/asteroids_ship.png");`,
	},

	// ── 第三批：食物 & 收集品 ──

	{
		id: "cdn-apple",
		name: "apple",
		nameZh: "苹果",
		type: "texture",
		category: "item",
		tags: ["apple", "fruit", "food", "collect", "苹果", "水果", "食物", "收集"],
		generatorCode: "",
		url: "/assets/sprites/apple.png",
		preloadCode: `this.load.image("apple", "/assets/sprites/apple.png");`,
	},
	{
		id: "cdn-hotdog",
		name: "hotdog",
		nameZh: "热狗",
		type: "texture",
		category: "item",
		tags: ["hotdog", "food", "collect", "热狗", "食物", "收集"],
		generatorCode: "",
		url: "/assets/sprites/hotdog.png",
		preloadCode: `this.load.image("hotdog", "/assets/sprites/hotdog.png");`,
	},
	{
		id: "cdn-cake",
		name: "cake",
		nameZh: "蛋糕",
		type: "texture",
		category: "item",
		tags: ["cake", "food", "dessert", "collect", "蛋糕", "甜点", "食物", "收集"],
		generatorCode: "",
		url: "/assets/sprites/cake.png",
		preloadCode: `this.load.image("cake", "/assets/sprites/cake.png");`,
	},
	{
		id: "cdn-donut",
		name: "donut",
		nameZh: "甜甜圈",
		type: "texture",
		category: "item",
		tags: ["donut", "food", "dessert", "collect", "甜甜圈", "甜点", "食物", "收集"],
		generatorCode: "",
		url: "/assets/sprites/donut.png",
		preloadCode: `this.load.image("donut", "/assets/sprites/donut.png");`,
	},
	{
		id: "cdn-melon",
		name: "melon",
		nameZh: "西瓜",
		type: "texture",
		category: "item",
		tags: ["melon", "watermelon", "fruit", "food", "西瓜", "水果", "食物", "收集"],
		generatorCode: "",
		url: "/assets/sprites/melon.png",
		preloadCode: `this.load.image("melon", "/assets/sprites/melon.png");`,
	},
	{
		id: "cdn-pineapple",
		name: "pineapple",
		nameZh: "菠萝",
		type: "texture",
		category: "item",
		tags: ["pineapple", "fruit", "food", "collect", "菠萝", "水果", "食物", "收集"],
		generatorCode: "",
		url: "/assets/sprites/pineapple.png",
		preloadCode: `this.load.image("pineapple", "/assets/sprites/pineapple.png");`,
	},
	{
		id: "cdn-tomato",
		name: "tomato",
		nameZh: "番茄",
		type: "texture",
		category: "item",
		tags: ["tomato", "fruit", "food", "collect", "番茄", "水果", "食物", "收集"],
		generatorCode: "",
		url: "/assets/sprites/tomato.png",
		preloadCode: `this.load.image("tomato", "/assets/sprites/tomato.png");`,
	},
	{
		id: "cdn-lollipop",
		name: "lollipop",
		nameZh: "棒棒糖",
		type: "texture",
		category: "item",
		tags: ["lollipop", "candy", "sweet", "collect", "棒棒糖", "糖果", "甜品", "收集"],
		generatorCode: "",
		url: "/assets/sprites/lollipop.png",
		preloadCode: `this.load.image("lollipop", "/assets/sprites/lollipop.png");`,
	},
	{
		id: "cdn-cokecan",
		name: "cokecan",
		nameZh: "可乐罐",
		type: "texture",
		category: "item",
		tags: ["coke", "can", "drink", "collect", "可乐", "饮料", "罐子", "收集"],
		generatorCode: "",
		url: "/assets/sprites/cokecan.png",
		preloadCode: `this.load.image("cokecan", "/assets/sprites/cokecan.png");`,
	},
	{
		id: "cdn-firstaid",
		name: "firstaid",
		nameZh: "急救包",
		type: "texture",
		category: "item",
		tags: ["firstaid", "health", "medkit", "heal", "急救包", "医疗", "治疗", "回血"],
		generatorCode: "",
		url: "/assets/sprites/firstaid.png",
		preloadCode: `this.load.image("firstaid", "/assets/sprites/firstaid.png");`,
	},
	{
		id: "cdn-eyes",
		name: "eyes",
		nameZh: "眼睛",
		type: "texture",
		category: "item",
		tags: ["eyes", "powerup", "collect", "眼睛", "道具", "收集"],
		generatorCode: "",
		url: "/assets/sprites/eyes.png",
		preloadCode: `this.load.image("eyes", "/assets/sprites/eyes.png");`,
	},

	// ── 第三批：环境 & 障碍 ──

	{
		id: "cdn-mine",
		name: "mine",
		nameZh: "地雷",
		type: "texture",
		category: "environment",
		tags: ["mine", "trap", "danger", "explosive", "地雷", "陷阱", "危险", "爆炸"],
		generatorCode: "",
		url: "/assets/sprites/mine.png",
		preloadCode: `this.load.image("mine", "/assets/sprites/mine.png");`,
	},
	{
		id: "cdn-saw",
		name: "saw",
		nameZh: "锯片",
		type: "texture",
		category: "environment",
		tags: ["saw", "blade", "trap", "danger", "锯片", "刀片", "陷阱", "危险"],
		generatorCode: "",
		url: "/assets/sprites/saw.png",
		preloadCode: `this.load.image("saw", "/assets/sprites/saw.png");`,
	},
	{
		id: "cdn-asteroid1",
		name: "asteroid1",
		nameZh: "小行星1",
		type: "texture",
		category: "environment",
		tags: ["asteroid", "rock", "space", "obstacle", "小行星", "岩石", "太空", "障碍"],
		generatorCode: "",
		url: "/assets/games/asteroids/asteroid1.png",
		preloadCode: `this.load.image("asteroid1", "/assets/games/asteroids/asteroid1.png");`,
	},
	{
		id: "cdn-asteroid2",
		name: "asteroid2",
		nameZh: "小行星2",
		type: "texture",
		category: "environment",
		tags: ["asteroid", "rock", "space", "obstacle", "小行星", "岩石", "太空", "障碍"],
		generatorCode: "",
		url: "/assets/games/asteroids/asteroid2.png",
		preloadCode: `this.load.image("asteroid2", "/assets/games/asteroids/asteroid2.png");`,
	},
	{
		id: "cdn-asteroid3",
		name: "asteroid3",
		nameZh: "小行星3",
		type: "texture",
		category: "environment",
		tags: ["asteroid", "rock", "space", "obstacle", "小行星", "岩石", "太空", "障碍"],
		generatorCode: "",
		url: "/assets/games/asteroids/asteroid3.png",
		preloadCode: `this.load.image("asteroid3", "/assets/games/asteroids/asteroid3.png");`,
	},

	// ── 第三批：特效 & 弹丸 ──

	{
		id: "cdn-wizball",
		name: "wizball",
		nameZh: "魔法球",
		type: "texture",
		category: "effect",
		tags: ["wizball", "magic", "ball", "projectile", "魔法球", "魔法", "弹丸"],
		generatorCode: "",
		url: "/assets/sprites/wizball.png",
		preloadCode: `this.load.image("wizball", "/assets/sprites/wizball.png");`,
	},
	{
		id: "cdn-shinyball",
		name: "shinyball",
		nameZh: "闪亮球",
		type: "texture",
		category: "effect",
		tags: ["shiny", "ball", "glow", "projectile", "闪亮", "发光球", "弹丸"],
		generatorCode: "",
		url: "/assets/sprites/shinyball.png",
		preloadCode: `this.load.image("shinyball", "/assets/sprites/shinyball.png");`,
	},
	{
		id: "cdn-purple-ball",
		name: "purple-ball",
		nameZh: "紫色球",
		type: "texture",
		category: "effect",
		tags: ["ball", "purple", "sphere", "球", "紫色", "紫球"],
		generatorCode: "",
		url: "/assets/sprites/purple_ball.png",
		preloadCode: `this.load.image("purple-ball", "/assets/sprites/purple_ball.png");`,
	},
	{
		id: "cdn-splat",
		name: "splat",
		nameZh: "溅射效果",
		type: "texture",
		category: "effect",
		tags: ["splat", "splash", "impact", "effect", "溅射", "撞击", "特效"],
		generatorCode: "",
		url: "/assets/sprites/splat.png",
		preloadCode: `this.load.image("splat", "/assets/sprites/splat.png");`,
	},
	{
		id: "cdn-bullet1",
		name: "bullet1",
		nameZh: "子弹1号",
		type: "texture",
		category: "effect",
		tags: ["bullet", "projectile", "shot", "子弹", "弹丸", "射击"],
		generatorCode: "",
		url: "/assets/sprites/bullets/bullet1.png",
		preloadCode: `this.load.image("bullet1", "/assets/sprites/bullets/bullet1.png");`,
	},
	{
		id: "cdn-bullet2",
		name: "bullet2",
		nameZh: "子弹2号",
		type: "texture",
		category: "effect",
		tags: ["bullet", "projectile", "shot", "子弹", "弹丸", "射击"],
		generatorCode: "",
		url: "/assets/sprites/bullets/bullet2.png",
		preloadCode: `this.load.image("bullet2", "/assets/sprites/bullets/bullet2.png");`,
	},
	{
		id: "cdn-bullet5",
		name: "bullet5",
		nameZh: "子弹5号",
		type: "texture",
		category: "effect",
		tags: ["bullet", "projectile", "energy", "子弹", "弹丸", "能量"],
		generatorCode: "",
		url: "/assets/sprites/bullets/bullet5.png",
		preloadCode: `this.load.image("bullet5", "/assets/sprites/bullets/bullet5.png");`,
	},
	{
		id: "cdn-bullet11",
		name: "bullet11",
		nameZh: "子弹11号",
		type: "texture",
		category: "effect",
		tags: ["bullet", "projectile", "laser", "子弹", "弹丸", "激光"],
		generatorCode: "",
		url: "/assets/sprites/bullets/bullet11.png",
		preloadCode: `this.load.image("bullet11", "/assets/sprites/bullets/bullet11.png");`,
	},
	{
		id: "cdn-breakout-ball",
		name: "breakout-ball",
		nameZh: "打砖块弹球",
		type: "texture",
		category: "effect",
		tags: ["ball", "breakout", "bounce", "弹球", "打砖块", "弹跳"],
		generatorCode: "",
		url: "/assets/games/breakout/ball1.png",
		preloadCode: `this.load.image("breakout-ball", "/assets/games/breakout/ball1.png");`,
	},

	// ── 第三批：更多天空背景 ──

	{
		id: "cdn-sky3",
		name: "sky3",
		nameZh: "天空3",
		type: "texture",
		category: "background",
		tags: ["sky", "background", "天空", "背景"],
		generatorCode: "",
		url: "/assets/skies/sky3.png",
		preloadCode: `this.load.image("sky3", "/assets/skies/sky3.png");`,
	},
	{
		id: "cdn-sky5",
		name: "sky5",
		nameZh: "天空5",
		type: "texture",
		category: "background",
		tags: ["sky", "background", "天空", "背景"],
		generatorCode: "",
		url: "/assets/skies/sky5.png",
		preloadCode: `this.load.image("sky5", "/assets/skies/sky5.png");`,
	},
	{
		id: "cdn-clouds",
		name: "clouds-bg",
		nameZh: "云层背景",
		type: "texture",
		category: "background",
		tags: ["clouds", "sky", "background", "云层", "天空", "背景"],
		generatorCode: "",
		url: "/assets/skies/clouds.png",
		preloadCode: `this.load.image("clouds-bg", "/assets/skies/clouds.png");`,
	},
	{
		id: "cdn-starfield-bg",
		name: "starfield-bg",
		nameZh: "星空背景(CDN)",
		type: "texture",
		category: "background",
		tags: ["starfield", "space", "stars", "background", "星空", "太空", "背景"],
		generatorCode: "",
		url: "/assets/skies/starfield.png",
		preloadCode: `this.load.image("starfield-bg", "/assets/skies/starfield.png");`,
	},
	{
		id: "cdn-space1",
		name: "space1-bg",
		nameZh: "太空背景1",
		type: "texture",
		category: "background",
		tags: ["space", "stars", "dark", "background", "太空", "星空", "背景"],
		generatorCode: "",
		url: "/assets/skies/space1.png",
		preloadCode: `this.load.image("space1-bg", "/assets/skies/space1.png");`,
	},
	{
		id: "cdn-space2",
		name: "space2-bg",
		nameZh: "太空背景2",
		type: "texture",
		category: "background",
		tags: ["space", "nebula", "background", "太空", "星云", "背景"],
		generatorCode: "",
		url: "/assets/skies/space2.png",
		preloadCode: `this.load.image("space2-bg", "/assets/skies/space2.png");`,
	},
	{
		id: "cdn-space4",
		name: "space4-bg",
		nameZh: "太空背景4",
		type: "texture",
		category: "background",
		tags: ["space", "stars", "galaxy", "background", "太空", "银河", "背景"],
		generatorCode: "",
		url: "/assets/skies/space4.png",
		preloadCode: `this.load.image("space4-bg", "/assets/skies/space4.png");`,
	},
	{
		id: "cdn-underwater2",
		name: "underwater2-bg",
		nameZh: "水下背景2",
		type: "texture",
		category: "background",
		tags: ["underwater", "ocean", "sea", "background", "水下", "海洋", "背景"],
		generatorCode: "",
		url: "/assets/skies/underwater2.png",
		preloadCode: `this.load.image("underwater2-bg", "/assets/skies/underwater2.png");`,
	},

	// ── 第三批：粒子 ──

	{
		id: "cdn-bubble-particle",
		name: "bubble-particle",
		nameZh: "气泡粒子",
		type: "texture",
		category: "particle",
		tags: ["bubble", "particle", "water", "effect", "气泡", "粒子", "水", "特效"],
		generatorCode: "",
		url: "/assets/particles/bubble.png",
		preloadCode: `this.load.image("bubble-particle", "/assets/particles/bubble.png");`,
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
