import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function skeletonGuardTemplate(meta: ProjectMeta): TemplateFile[] {
	const g = getMessages().gameText;
	return [
		{
			path: "src/main.ts",
			content: `import Phaser from "phaser";
import { MenuScene } from "./scenes/menu-scene";
import { GameScene } from "./scenes/game-scene";
import { GameOverScene } from "./scenes/game-over-scene";

const config = {
	type: Phaser.AUTO,
	width: 800,
	height: 500,
	backgroundColor: "#1a1a2e",
	physics: {
		default: "arcade",
		arcade: { gravity: { x: 0, y: 0 }, debug: false },
	},
	scene: [MenuScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
	constructor() { super("MenuScene"); }

	create() {
		const gfx = this.add.graphics();
		gfx.fillGradientStyle(0x2d1b69, 0x2d1b69, 0x0f172a, 0x0f172a, 1);
		gfx.fillRect(0, 0, 800, 500);

		gfx.fillStyle(0x334155, 1);
		gfx.fillRect(0, 380, 800, 120);
		gfx.fillStyle(0x475569, 1);
		gfx.fillRect(0, 375, 800, 8);

		gfx.fillStyle(0x64748b, 1);
		gfx.fillRect(680, 280, 60, 100);
		gfx.fillRect(670, 260, 80, 25);
		gfx.fillStyle(0x94a3b8, 1);
		gfx.fillTriangle(710, 230, 660, 262, 760, 262);

		gfx.fillStyle(0x475569, 1);
		gfx.fillRect(50, 300, 50, 80);
		gfx.fillRect(40, 280, 70, 25);

		const colors = [0xef4444, 0x22c55e, 0x3b82f6];
		const labels = ["${g.skeletonGuard.cavalry}", "${g.skeletonGuard.spear}", "${g.skeletonGuard.archer}"];
		for (let i = 0; i < 3; i++) {
			const cx = 300 + i * 80;
			gfx.fillStyle(colors[i], 1);
			gfx.fillCircle(cx, 340, 12);
			gfx.fillRect(cx - 6, 340, 12, 20);
			this.add.text(cx, 370, labels[i], { fontSize: "11px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(0.5, 0);
		}

		this.add.text(400, 80, "${meta.name}", { fontSize: "44px", color: "#ffffff", fontFamily: "Arial" }).setOrigin(0.5);
		this.add.text(400, 130, "${g.skeletonGuard.subtitle}", { fontSize: "22px", color: "#a3e635", fontFamily: "Arial" }).setOrigin(0.5);
		this.add.text(400, 180, "${g.skeletonGuard.rpsHint}", { fontSize: "14px", color: "#94a3b8", fontFamily: "Arial", align: "center", wordWrap: { width: 600 } }).setOrigin(0.5);

		const startBtn = this.add.text(400, 440, "${g.common.startGame}", { fontSize: "28px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";

const LANE_Y = [200, 320];
const TOWER_X = 720;
const NEST_X = 80;
const UNIT_SPEED = 0.8;
const TOWER_MAX_HP = 5;
const NEST_MAX_HP = 8;
const MAX_UNITS = 3;
const SPAWN_MIN = 2000;
const SPAWN_MAX = 4000;

const UNIT_COLORS = [0xef4444, 0x22c55e, 0x3b82f6];
const ENEMY_COLORS = [0xfbbf24, 0xa78bfa, 0xf472b6];
const TYPE_NAMES_PLAYER = ["${g.skeletonGuard.cavalry}", "${g.skeletonGuard.spear}", "${g.skeletonGuard.archer}"];
const BEATS: any = { 0: 2, 1: 0, 2: 1 };

export class GameScene extends Phaser.Scene {
	private units: any[] = [];
	private towerHp = TOWER_MAX_HP;
	private nestHp = NEST_MAX_HP;
	private spawnTimer = 0;
	private nextSpawn = 3000;
	private gfx!: Phaser.GameObjects.Graphics;
	private bgGfx!: Phaser.GameObjects.Graphics;
	private hpText!: Phaser.GameObjects.Text;
	private nestHpText!: Phaser.GameObjects.Text;
	private waveText!: Phaser.GameObjects.Text;
	private btnTexts: Phaser.GameObjects.Text[] = [];
	private gameOver = false;
	private animTick = 0;

	constructor() { super("GameScene"); }

	create() {
		this.units = [];
		this.towerHp = TOWER_MAX_HP;
		this.nestHp = NEST_MAX_HP;
		this.spawnTimer = 0;
		this.nextSpawn = 3000;
		this.gameOver = false;
		this.animTick = 0;

		this.bgGfx = this.add.graphics();
		this.gfx = this.add.graphics();

		this.drawBackground();

		this.hpText = this.add.text(TOWER_X - 10, 100, "", { fontSize: "14px", color: "#22c55e", fontFamily: "Arial" }).setOrigin(0.5).setDepth(100);
		this.nestHpText = this.add.text(NEST_X, 100, "", { fontSize: "14px", color: "#ef4444", fontFamily: "Arial" }).setOrigin(0.5).setDepth(100);
		this.waveText = this.add.text(400, 20, "", { fontSize: "13px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(0.5).setDepth(100);

		const btnY = 460;
		const labels = ["${g.skeletonGuard.cavalry}", "${g.skeletonGuard.spear}", "${g.skeletonGuard.archer}"];
		const keys = ["1", "2", "3"];
		this.btnTexts = [];
		for (let i = 0; i < 3; i++) {
			const bx = 620 + i * 65;
			const btn = this.add.text(bx, btnY, labels[i], {
				fontSize: "16px", color: "#ffffff", fontFamily: "Arial",
				backgroundColor: "#334155", padding: { x: 8, y: 6 },
			}).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(100);
			const idx = i;
			btn.on("pointerdown", () => this.spawnPlayerUnit(idx));
			btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#475569" }));
			btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#334155" }));
			this.btnTexts.push(btn);

			this.input.keyboard!.addKey(keys[i]).on("down", () => this.spawnPlayerUnit(idx));
		}

		this.add.text(400, 460, "${g.skeletonGuard.spawnHint}", { fontSize: "12px", color: "#64748b", fontFamily: "Arial" }).setOrigin(0.5).setDepth(100);

		this.updateHud();
	}

	private spawnPlayerUnit(type: number) {
		if (this.gameOver) return;
		const count = this.units.filter(u => u.alive && !u.enemy && u.type === type).length;
		if (count >= MAX_UNITS) return;
		const lane = Phaser.Math.Between(0, 1);
		this.units.push({
			x: TOWER_X - 40, y: LANE_Y[lane] + Phaser.Math.Between(-10, 10),
			type, lane, alive: true, enemy: false, fighting: false, fightTimer: 0, hp: 1,
		});
	}

	private spawnEnemyUnit() {
		const type = Phaser.Math.Between(0, 2);
		const lane = Phaser.Math.Between(0, 1);
		this.units.push({
			x: NEST_X + 30, y: LANE_Y[lane] + Phaser.Math.Between(-10, 10),
			type, lane, alive: true, enemy: true, fighting: false, fightTimer: 0, hp: 1,
		});
	}

	update(_time: number, delta: number) {
		if (this.gameOver) return;
		this.animTick += delta;

		this.spawnTimer += delta;
		if (this.spawnTimer >= this.nextSpawn) {
			this.spawnTimer = 0;
			this.nextSpawn = Phaser.Math.Between(SPAWN_MIN, SPAWN_MAX);
			this.spawnEnemyUnit();
		}

		for (const u of this.units) {
			if (!u.alive || u.fighting) continue;
			if (u.enemy) {
				u.x += UNIT_SPEED;
				if (u.x >= TOWER_X - 20) {
					u.alive = false;
					this.towerHp--;
					if (this.towerHp <= 0) { this.endGame(false); return; }
				}
			} else {
				u.x -= UNIT_SPEED;
				if (u.x <= NEST_X + 20) {
					u.alive = false;
					this.nestHp--;
					if (this.nestHp <= 0) { this.endGame(true); return; }
				}
			}
		}

		for (let i = 0; i < this.units.length; i++) {
			const a = this.units[i];
			if (!a.alive || a.fighting || a.enemy) continue;
			for (let j = 0; j < this.units.length; j++) {
				const b = this.units[j];
				if (!b.alive || b.fighting || !b.enemy) continue;
				if (Math.abs(a.y - b.y) > 30) continue;
				if (Math.abs(a.x - b.x) < 20) {
					this.resolveCombat(a, b);
				}
			}
		}

		for (const u of this.units) {
			if (u.fighting) {
				u.fightTimer -= delta;
				if (u.fightTimer <= 0) u.alive = false;
			}
		}

		this.units = this.units.filter(u => u.alive);
		this.updateHud();
		this.drawUnits();
	}

	private resolveCombat(player: any, enemy: any) {
		player.fighting = true;
		enemy.fighting = true;

		if (player.type === enemy.type) {
			player.fightTimer = 400;
			enemy.fightTimer = 400;
		} else if (BEATS[player.type] === enemy.type) {
			enemy.fightTimer = 300;
			player.fightTimer = 600;
			this.time.delayedCall(350, () => { player.fighting = false; });
		} else {
			player.fightTimer = 300;
			enemy.fightTimer = 600;
			this.time.delayedCall(350, () => { enemy.fighting = false; });
		}
	}

	private endGame(win: boolean) {
		this.gameOver = true;
		this.time.delayedCall(800, () => {
			this.scene.start("GameOverScene", { win });
		});
	}

	private updateHud() {
		this.hpText.setText("${g.skeletonGuard.tower}: " + this.towerHp + "/" + TOWER_MAX_HP);
		this.nestHpText.setText("${g.skeletonGuard.nest}: " + this.nestHp + "/" + NEST_MAX_HP);
		const enemyCount = this.units.filter(u => u.alive && u.enemy).length;
		const playerCount = this.units.filter(u => u.alive && !u.enemy).length;
		this.waveText.setText("${g.skeletonGuard.yourUnits}: " + playerCount + "  |  ${g.skeletonGuard.enemyUnits}: " + enemyCount);
	}

	private drawBackground() {
		const bg = this.bgGfx;
		bg.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x334155, 0x334155, 1);
		bg.fillRect(0, 0, 800, 500);

		bg.fillStyle(0x475569, 1);
		bg.fillRect(0, 380, 800, 120);
		bg.fillStyle(0x64748b, 1);
		bg.fillRect(0, 375, 800, 8);

		bg.fillStyle(0x1e293b, 1);
		bg.fillRect(0, 420, 800, 80);

		bg.lineStyle(1, 0x475569, 0.3);
		for (const ly of LANE_Y) {
			bg.lineBetween(NEST_X + 40, ly + 15, TOWER_X - 30, ly + 15);
		}

		bg.fillStyle(0x64748b, 1);
		bg.fillRect(TOWER_X - 30, 140, 60, 240);
		bg.fillRect(TOWER_X - 40, 120, 80, 25);
		bg.fillStyle(0x94a3b8, 1);
		bg.fillTriangle(TOWER_X, 90, TOWER_X - 45, 122, TOWER_X + 45, 122);
		bg.fillStyle(0xfbbf24, 0.6);
		bg.fillRect(TOWER_X - 8, 160, 16, 20);
		bg.fillRect(TOWER_X - 8, 200, 16, 20);

		bg.fillStyle(0x475569, 1);
		bg.fillRect(NEST_X - 30, 160, 60, 220);
		bg.fillRect(NEST_X - 40, 140, 80, 25);
		bg.fillStyle(0x78716c, 1);
		bg.fillTriangle(NEST_X, 110, NEST_X - 45, 142, NEST_X + 45, 142);
		bg.fillStyle(0xef4444, 0.5);
		bg.fillCircle(NEST_X, 180, 8);

		bg.fillStyle(0x374151, 1);
		bg.fillRect(340, 250, 120, 130);
		bg.fillRect(330, 240, 140, 15);
	}

	private drawUnits() {
		const g = this.gfx;
		g.clear();
		const bounce = Math.sin(this.animTick * 0.008) * 2;

		for (const u of this.units) {
			if (!u.alive) continue;
			const color = u.enemy ? ENEMY_COLORS[u.type] : UNIT_COLORS[u.type];
			const bx = u.x;
			const by = u.y + (u.fighting ? 0 : bounce);

			if (u.fighting) {
				g.fillStyle(0xffffff, 0.7);
				g.fillCircle(bx, by - 5, 12);
				g.fillStyle(color, 0.5);
				g.fillCircle(bx, by - 5, 8);
			} else {
				g.fillStyle(color, 1);
				g.fillCircle(bx, by - 10, 8);
				g.fillRect(bx - 4, by - 3, 8, 14);
				g.fillRect(bx - 6, by + 8, 5, 6);
				g.fillRect(bx + 1, by + 8, 5, 6);

				if (u.type === 0) {
					g.lineStyle(2, 0xffffff, 0.6);
					const sx = u.enemy ? 6 : -6;
					g.lineBetween(bx + sx, by - 8, bx + sx * 2, by - 14);
				} else if (u.type === 1) {
					g.lineStyle(2, 0xd4d4d8, 0.8);
					const sx = u.enemy ? 1 : -1;
					g.lineBetween(bx, by - 10, bx + sx * 18, by - 10);
				} else {
					g.lineStyle(2, 0x92400e, 0.8);
					const sx = u.enemy ? 1 : -1;
					g.lineBetween(bx + sx * 4, by - 14, bx + sx * 4, by + 2);
				}
			}
		}
	}
}
`,
		},
		{
			path: "src/scenes/game-over-scene.ts",
			content: `import Phaser from "phaser";

export class GameOverScene extends Phaser.Scene {
	constructor() { super("GameOverScene"); }

	create(data: any) {
		const win = data.win ?? false;

		this.add.text(400, 150, win ? "${g.skeletonGuard.victory}" : "${g.skeletonGuard.defeat}", {
			fontSize: "44px", color: win ? "#22c55e" : "#ef4444", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(400, 220, win ? "${g.skeletonGuard.victoryMsg}" : "${g.skeletonGuard.defeatMsg}", {
			fontSize: "18px", color: "#94a3b8", fontFamily: "Arial", align: "center", wordWrap: { width: 500 },
		}).setOrigin(0.5);

		const retryBtn = this.add.text(400, 340, "${g.skeletonGuard.retry}", {
			fontSize: "24px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add.text(400, 400, "${g.common.backToMenu}", {
			fontSize: "20px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
		menuBtn.on("pointerover", () => menuBtn.setColor("#22c55e"));
		menuBtn.on("pointerout", () => menuBtn.setColor("#94a3b8"));
	}
}
`,
		},
		{
			path: "src/config/game-config.ts",
			content: `export const GAME_CONFIG = {
	title: "${meta.name}",
	width: 800,
	height: 500,
	fps: 60,
	gravity: 0,
	debug: false,
};
`,
		},
	];
}
