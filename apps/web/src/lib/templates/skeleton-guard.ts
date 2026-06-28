import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function skeletonGuardTemplate(meta: ProjectMeta): TemplateFile[] {
	const g = getMessages().gameText;
	return [
		{
			path: "src/main.ts",
			content: `import Phaser from "phaser";
import { BootScene } from "./scenes/boot-scene";
import { MenuScene } from "./scenes/menu-scene";
import { GameScene } from "./scenes/game-scene";
import { GameOverScene } from "./scenes/game-over-scene";

const config: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: 512,
	height: 256,
	backgroundColor: "#1a1a2e",
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	physics: {
		default: "arcade",
		arcade: { gravity: { x: 0, y: 0 }, debug: false },
	},
	scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
`,
		},
		{
			path: "src/scenes/boot-scene.ts",
			content: `import Phaser from "phaser";

const ASSET = "/assets/games/skeleton-guard";

export class BootScene extends Phaser.Scene {
	constructor() { super("BootScene"); }

	preload() {
		const cx = 256;
		const cy = 128;
		const box = this.add.graphics();
		box.fillStyle(0x222222, 0.8);
		box.fillRect(cx - 130, cy - 10, 260, 20);
		const bar = this.add.graphics();
		const pct = this.add.text(cx, cy + 20, "0%", {
			fontSize: "14px", color: "#ffffff", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.load.on("progress", (v: number) => {
			pct.setText(Math.round(v * 100) + "%");
			bar.clear();
			bar.fillStyle(0x22c55e, 1);
			bar.fillRect(cx - 125, cy - 6, 250 * v, 12);
		});

		this.load.image("back", ASSET + "/backgrounds/back.png");
		this.load.image("sky", ASSET + "/backgrounds/sky.png");
		this.load.image("rock", ASSET + "/backgrounds/rock.png");
		this.load.spritesheet("tower", ASSET + "/backgrounds/tower.png", {
			frameWidth: 139, frameHeight: 262,
		});
		this.load.spritesheet("stones", ASSET + "/backgrounds/stones.png", {
			frameWidth: 170, frameHeight: 128,
		});

		for (let i = 1; i <= 18; i++) {
			this.load.image("m1_" + i, ASSET + "/sprites/m1/" + i + ".png");
			this.load.image("m2_" + i, ASSET + "/sprites/m2/" + i + ".png");
			this.load.image("m3_" + i, ASSET + "/sprites/m3/" + i + ".png");
			this.load.image("s1_" + i, ASSET + "/sprites/s1/" + i + ".png");
			this.load.image("s2_" + i, ASSET + "/sprites/s2/" + i + ".png");
			this.load.image("s3_" + i, ASSET + "/sprites/s3/" + i + ".png");
		}

		this.load.spritesheet("buttons", ASSET + "/buttons/buttons.png", {
			frameWidth: 50, frameHeight: 50,
		});
		this.load.spritesheet("buttons2", ASSET + "/buttons/buttons2.png", {
			frameWidth: 300, frameHeight: 113,
		});
	}

	create() {
		this.scene.start("MenuScene");
	}
}
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
	constructor() { super("MenuScene"); }

	create() {
		this.add.image(0, 0, "back").setOrigin(0, 0).setDisplaySize(512, 256);

		this.add.text(256, 60, "${meta.name}", {
			fontSize: "28px", color: "#ffffff", fontFamily: "Arial",
			stroke: "#000000", strokeThickness: 3,
		}).setOrigin(0.5);

		this.add.text(256, 90, "${g.skeletonGuard.subtitle}", {
			fontSize: "16px", color: "#a3e635", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(256, 120, "${g.skeletonGuard.rpsHint}", {
			fontSize: "9px", color: "#d4d4d8", fontFamily: "Arial",
			align: "center", wordWrap: { width: 400 },
		}).setOrigin(0.5);

		const startBtn = this.add.text(256, 190, "${g.common.startGame}", {
			fontSize: "20px", color: "#06b6d4", fontFamily: "Arial",
			stroke: "#000000", strokeThickness: 2,
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });

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

interface UnitData {
	sprite: Phaser.GameObjects.Image;
	unitType: number;
	enemy: boolean;
	status: "walk" | "attack" | "die" | "dead";
	animFrame: number;
	animTick: number;
	walkFrame: number;
	floorIdx: number;
	passCount: number;
}

const FLOOR_Y = [50, 170];
const ROCK_X = 260;
const TOWER_HIT_X = 405;
const MAX_PER_TYPE = 2;
const TOWER_MAX_HP = 5;
const NEST_MAX_HP = 10;
const BEATS: Record<number, number> = { 0: 2, 1: 0, 2: 1 };
const ENEMY_Y_OFFSET: Record<number, number> = { 0: -15, 1: 0, 2: 0 };

export class GameScene extends Phaser.Scene {
	private sky!: Phaser.GameObjects.TileSprite;
	private towerSprite!: Phaser.GameObjects.Sprite;
	private nestSprite!: Phaser.GameObjects.Sprite;
	private towerHpText!: Phaser.GameObjects.Text;
	private nestHpText!: Phaser.GameObjects.Text;
	private units: UnitData[] = [];
	private towerHp = TOWER_MAX_HP;
	private nestHp = NEST_MAX_HP;
	private tick = 0;
	private playerCounts = [0, 0, 0];
	private ended = false;

	constructor() { super("GameScene"); }

	private spriteKey(enemy: boolean, unitType: number, frame: number): string {
		return (enemy ? "s" : "m") + (unitType + 1) + "_" + frame;
	}

	create() {
		this.units = [];
		this.towerHp = TOWER_MAX_HP;
		this.nestHp = NEST_MAX_HP;
		this.tick = 0;
		this.playerCounts = [0, 0, 0];
		this.ended = false;

		this.sky = this.add.tileSprite(0, 0, 335, 87, "sky").setOrigin(0, 0);
		this.add.image(0, 0, "back").setOrigin(0, 0).setDisplaySize(512, 256);

		this.towerSprite = this.add.sprite(330, 0, "tower", 0)
			.setOrigin(0, 0).setScale(0.9);
		this.add.image(260, -10, "rock").setOrigin(0, 0).setScale(0.9);
		this.nestSprite = this.add.sprite(150, -15, "stones", 0)
			.setOrigin(0, 0).setScale(0.9);

		this.towerHpText = this.add.text(380, 6, "", {
			fontSize: "10px", color: "#22c55e", fontFamily: "Arial",
			stroke: "#000", strokeThickness: 2,
		}).setDepth(10);
		this.nestHpText = this.add.text(10, 6, "", {
			fontSize: "10px", color: "#ef4444", fontFamily: "Arial",
			stroke: "#000", strokeThickness: 2,
		}).setDepth(10);
		this.updateHpDisplay();

		for (let i = 0; i < 3; i++) {
			const btn = this.add.sprite(0, 0, "buttons", i)
				.setScale(0.8).setOrigin(0, 0).setDepth(10);
			btn.x = 512 - btn.displayWidth * (3 - i);
			btn.y = 256 - btn.displayHeight;
			btn.setInteractive({ useHandCursor: true });
			const idx = i;
			btn.on("pointerdown", () => this.spawnPlayer(idx));
		}

		this.input.keyboard!.addKey("1").on("down", () => this.spawnPlayer(0));
		this.input.keyboard!.addKey("2").on("down", () => this.spawnPlayer(1));
		this.input.keyboard!.addKey("3").on("down", () => this.spawnPlayer(2));

		this.add.text(400, 230, "${g.skeletonGuard.spawnHint}", {
			fontSize: "7px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(0.5, 0).setDepth(10);

		const spawnDelay = Phaser.Math.Between(2000, 4000);
		this.time.addEvent({
			delay: spawnDelay,
			repeat: 99,
			callback: () => this.spawnEnemy(),
		});
	}

	private spawnPlayer(unitType: number) {
		if (this.ended) return;
		if (this.playerCounts[unitType] >= MAX_PER_TYPE) return;
		this.playerCounts[unitType]++;

		const sprite = this.add.image(400, 0, this.spriteKey(false, unitType, 1));
		sprite.y = 256 - 40 - sprite.height;
		sprite.setFlipX(true);

		this.units.push({
			sprite, unitType, enemy: false,
			status: "walk", animFrame: 0, animTick: 0, walkFrame: 0,
			floorIdx: 0, passCount: 0,
		});
	}

	private spawnEnemy() {
		if (this.ended) return;
		const unitType = Phaser.Math.Between(0, 2);
		const yOff = ENEMY_Y_OFFSET[unitType] ?? 0;

		const sprite = this.add.image(30, FLOOR_Y[0] + yOff,
			this.spriteKey(true, unitType, 1));
		sprite.setFlipX(true);

		this.units.push({
			sprite, unitType, enemy: true,
			status: "walk", animFrame: 0, animTick: 0, walkFrame: 0,
			floorIdx: 0, passCount: 0,
		});
	}

	update() {
		if (this.ended) return;
		this.tick++;
		this.sky.tilePositionX += 0.15;

		for (const u of this.units) {
			if (u.status !== "walk") continue;
			if (u.enemy) {
				u.sprite.x++;
				const yOff = ENEMY_Y_OFFSET[u.unitType] ?? 0;
				if (u.passCount === 0 && u.floorIdx === 0
					&& u.sprite.x >= ROCK_X) {
					u.passCount = 1;
					u.floorIdx = 1;
					u.sprite.x = 25;
					u.sprite.y = FLOOR_Y[1] + yOff;
				}
				if (u.sprite.x > TOWER_HIT_X) {
					this.towerHp--;
					if (this.towerHp >= 0) {
						this.towerSprite.setFrame(TOWER_MAX_HP - this.towerHp);
					}
					u.status = "dead";
					u.sprite.destroy();
					this.updateHpDisplay();
					if (this.towerHp <= 0) { this.endGame(false); return; }
				}
			} else {
				u.sprite.x--;
				if (u.sprite.x < 0) {
					this.nestHp--;
					if (this.nestHp >= 0) {
						this.nestSprite.setFrame(NEST_MAX_HP - this.nestHp);
					}
					this.playerCounts[u.unitType]--;
					u.status = "dead";
					u.sprite.destroy();
					this.updateHpDisplay();
					if (this.nestHp <= 0) { this.endGame(true); return; }
				}
			}
		}

		for (const p of this.units) {
			if (p.enemy || p.status !== "walk") continue;
			for (const e of this.units) {
				if (!e.enemy || e.status !== "walk") continue;
				if (Math.abs(p.sprite.x - e.sprite.x) < 20
					&& Math.abs(p.sprite.y - e.sprite.y) < 30) {
					this.resolveCombat(p, e);
					break;
				}
			}
		}

		for (const u of this.units) {
			if (u.status === "attack") {
				u.animTick++;
				if (u.animTick % 2 === 0) {
					const frame = 5 + u.animFrame;
					if (frame <= 9) {
						u.sprite.setTexture(
							this.spriteKey(u.enemy, u.unitType, frame));
						u.animFrame++;
					} else {
						u.status = "walk";
						u.animFrame = 0;
						u.animTick = 0;
						u.walkFrame = 0;
					}
				}
			} else if (u.status === "die") {
				u.animTick++;
				if (u.animTick % 2 === 0) {
					const frame = 14 + u.animFrame;
					if (frame <= 17) {
						u.sprite.setTexture(
							this.spriteKey(u.enemy, u.unitType, frame));
						u.animFrame++;
					} else {
						if (!u.enemy) this.playerCounts[u.unitType]--;
						u.status = "dead";
						u.sprite.destroy();
					}
				}
			}
		}

		if (this.tick % 10 === 0) {
			for (const u of this.units) {
				if (u.status !== "walk") continue;
				u.walkFrame = (u.walkFrame + 1) % 4;
				u.sprite.setTexture(
					this.spriteKey(u.enemy, u.unitType, u.walkFrame + 1));
				if (!u.enemy) {
					u.sprite.y = 256 - 40 - u.sprite.height;
				}
			}
		}

		this.units = this.units.filter(u => u.status !== "dead");
	}

	private resolveCombat(player, enemy) {
		if (player.unitType === enemy.unitType) {
			player.status = "die";
			enemy.status = "die";
		} else if (BEATS[player.unitType] === enemy.unitType) {
			player.status = "attack";
			enemy.status = "die";
		} else {
			enemy.status = "attack";
			player.status = "die";
		}
		player.animFrame = 0;
		player.animTick = 0;
		enemy.animFrame = 0;
		enemy.animTick = 0;
	}

	private endGame(win: boolean) {
		this.ended = true;
		this.time.delayedCall(800, () => {
			this.scene.start("GameOverScene", { win });
		});
	}

	private updateHpDisplay() {
		this.towerHpText.setText(
			"${g.skeletonGuard.tower}: " + this.towerHp + "/" + TOWER_MAX_HP);
		this.nestHpText.setText(
			"${g.skeletonGuard.nest}: " + this.nestHp + "/" + NEST_MAX_HP);
	}
}
`,
		},
		{
			path: "src/scenes/game-over-scene.ts",
			content: `import Phaser from "phaser";

export class GameOverScene extends Phaser.Scene {
	constructor() { super("GameOverScene"); }

	create(data = {}) {
		const win = "win" in data && (data).win === true;

		this.add.image(0, 0, "back").setOrigin(0, 0).setDisplaySize(512, 256);

		this.add.sprite(256, 100, "buttons2", win ? 1 : 0).setOrigin(0.5);

		this.add.text(256, 170, win
			? "${g.skeletonGuard.victoryMsg}"
			: "${g.skeletonGuard.defeatMsg}", {
			fontSize: "10px", color: "#d4d4d8", fontFamily: "Arial",
			align: "center", wordWrap: { width: 400 },
		}).setOrigin(0.5);

		const retryBtn = this.add.text(200, 210, "${g.skeletonGuard.retry}", {
			fontSize: "16px", color: "#06b6d4", fontFamily: "Arial",
			stroke: "#000000", strokeThickness: 2,
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add.text(312, 210, "${g.common.backToMenu}", {
			fontSize: "14px", color: "#94a3b8", fontFamily: "Arial",
			stroke: "#000000", strokeThickness: 2,
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
	width: 512,
	height: 256,
	fps: 60,
	gravity: 0,
	debug: false,
};
`,
		},
	];
}
