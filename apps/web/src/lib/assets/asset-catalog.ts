export interface AssetCatalogEntry {
	id: string;
	name: string;
	nameZh: string;
	type: "texture" | "spritesheet" | "audio";
	category: "character" | "environment" | "ui" | "effect" | "item";
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
