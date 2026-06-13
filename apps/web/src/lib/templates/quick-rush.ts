import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function quickRushTemplate(meta: ProjectMeta): TemplateFile[] {
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
	height: 600,
	backgroundColor: "#1a1a2e",
	physics: {
		default: "arcade",
		arcade: {
			gravity: { x: 0, y: 0 },
			debug: false,
		},
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

		gfx.fillStyle(0x2d5a27, 1);
		gfx.fillRect(0, 480, 800, 120);
		gfx.fillStyle(0x3a7d32, 1);
		for (let i = 0; i < 5; i++) {
			const tx = 80 + i * 170;
			gfx.fillTriangle(tx, 480, tx - 30, 520, tx + 30, 520);
			gfx.fillTriangle(tx, 450, tx - 22, 485, tx + 22, 485);
		}

		for (let i = 0; i < 8; i++) {
			const cx = 50 + i * 110;
			const cy = 60 + Math.sin(i * 1.3) * 30;
			gfx.fillStyle(0xffffff, 0.6);
			gfx.fillCircle(cx, cy, 20);
			gfx.fillCircle(cx + 15, cy - 5, 16);
			gfx.fillCircle(cx - 12, cy + 3, 14);
		}

		this.add.text(400, 160, "${meta.name}", { fontSize: "48px", color: "#ffffff", fontFamily: "Arial" }).setOrigin(0.5);
		this.add.text(400, 230, "${g.quickRush.subtitle}", { fontSize: "24px", color: "#a3e635", fontFamily: "Arial" }).setOrigin(0.5);

		const runner = this.add.graphics();
		runner.fillStyle(0xff6b35, 1);
		runner.fillRoundedRect(388, 310, 24, 32, 4);
		runner.fillStyle(0xffcc99, 1);
		runner.fillCircle(400, 300, 10);
		this.tweens.add({ targets: runner, y: -8, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeOut" });

		const startBtn = this.add.text(400, 400, "${g.common.startGame}", { fontSize: "28px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add.text(400, 520, "${g.quickRush.jumpHint}", { fontSize: "16px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(0.5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";

const PLAT_W = 120;
const PLAT_H = 16;
const PLAT_SPEED = 3;
const PLAYER_JUMP = -350;
const PLAYER_GRAVITY = 600;
const COIN_SIZE = 8;
const OBS_W = 16;
const OBS_H = 20;

interface Platform {
	x: number;
	y: number;
	coinActive: boolean;
	coinX: number;
	coinY: number;
	obsActive: boolean;
	obsX: number;
	obsY: number;
	next: number;
}

export class GameScene extends Phaser.Scene {
	private platforms: Platform[] = [];
	private playerX = 100;
	private playerY = 300;
	private playerVY = 0;
	private playerW = 16;
	private playerH = 24;
	private onGround = false;
	private score = 0;
	private gameOver = false;
	private deathTimer = 0;
	private speed = PLAT_SPEED;
	private distance = 0;
	private landscapeX = 0;
	private gfx!: Phaser.GameObjects.Graphics;
	private bgGfx!: Phaser.GameObjects.Graphics;
	private scoreText!: Phaser.GameObjects.Text;
	private coinText!: Phaser.GameObjects.Text;
	private coinCount = 0;
	private runFrame = 0;
	private runTimer = 0;
	private trees: any[] = [];
	private clouds: any[] = [];

	constructor() { super("GameScene"); }

	create() {
		this.score = 0;
		this.coinCount = 0;
		this.gameOver = false;
		this.deathTimer = 0;
		this.speed = PLAT_SPEED;
		this.distance = 0;
		this.landscapeX = 0;
		this.playerX = 100;
		this.playerY = 300;
		this.playerVY = 0;
		this.onGround = false;
		this.runFrame = 0;
		this.runTimer = 0;

		this.trees = [];
		for (let i = 0; i < 12; i++) {
			this.trees.push({
				x: i * 80 + Phaser.Math.Between(-20, 20),
				h: Phaser.Math.Between(40, 80),
				w: Phaser.Math.Between(20, 35),
			});
		}

		this.clouds = [];
		for (let i = 0; i < 6; i++) {
			this.clouds.push({
				x: Phaser.Math.Between(0, 850),
				y: Phaser.Math.Between(30, 150),
				r: Phaser.Math.Between(15, 30),
			});
		}

		this.platforms = [];
		let px = 50;
		let py = 400;
		for (let i = 0; i < 4; i++) {
			const hasCoin = i < 3;
			const hasObs = i > 0 && Math.random() < 0.5;
			const coinOffX = Phaser.Math.Between(20, PLAT_W - 20);
			const obsOffX = Phaser.Math.Between(30, PLAT_W - 30);
			this.platforms.push({
				x: px, y: py,
				coinActive: hasCoin, coinX: coinOffX, coinY: -18,
				obsActive: hasObs, obsX: obsOffX, obsY: -OBS_H,
				next: (i + 1) % 4,
			});
			px += PLAT_W + Phaser.Math.Between(60, 120);
			py += Phaser.Math.Between(-60, 60);
			py = Phaser.Math.Clamp(py, 250, 480);
		}

		this.bgGfx = this.add.graphics();
		this.gfx = this.add.graphics();

		this.scoreText = this.add.text(16, 16, "${g.common.score}: 0", { fontSize: "22px", color: "#ffffff", fontFamily: "Arial", stroke: "#000", strokeThickness: 2 }).setDepth(100);
		this.coinText = this.add.text(16, 46, "${g.quickRush.coins}: 0", { fontSize: "18px", color: "#fbbf24", fontFamily: "Arial", stroke: "#000", strokeThickness: 2 }).setDepth(100);

		this.input.on("pointerdown", () => this.jump());
		this.input.keyboard!.addKey("SPACE").on("down", () => this.jump());
		this.input.keyboard!.addKey("UP").on("down", () => this.jump());
	}

	private jump() {
		if (this.gameOver || !this.onGround) return;
		this.playerVY = PLAYER_JUMP;
		this.onGround = false;
	}

	update(_time: number, delta: number) {
		if (this.gameOver) {
			this.deathTimer -= delta;
			if (this.deathTimer <= 0) {
				this.scene.start("GameOverScene", { score: this.score, coins: this.coinCount });
			}
			this.drawAll();
			return;
		}

		const dt = delta / 1000;

		this.distance += this.speed;
		if (this.distance > 500) {
			this.speed = Math.min(this.speed + 0.0005 * delta, 6);
		}

		this.landscapeX -= this.speed * 0.3;
		if (this.landscapeX < -800) this.landscapeX += 800;

		for (const c of this.clouds) {
			c.x -= this.speed * 0.15;
			if (c.x < -40) c.x = 850;
		}

		for (const t of this.trees) {
			t.x -= this.speed * 0.5;
			if (t.x < -40) t.x = 850 + Phaser.Math.Between(0, 50);
		}

		for (const p of this.platforms) {
			p.x -= this.speed;
		}

		for (let i = 0; i < this.platforms.length; i++) {
			const p = this.platforms[i];
			if (p.x + PLAT_W < -20) {
				let maxX = -Infinity;
				for (const pp of this.platforms) {
					if (pp !== p && pp.x > maxX) maxX = pp.x;
				}
				p.x = maxX + PLAT_W + Phaser.Math.Between(80, 160);
				const prevY = this.platforms.find(pp => pp.x === maxX)?.y ?? 400;
				p.y = prevY + Phaser.Math.Between(-70, 70);
				p.y = Phaser.Math.Clamp(p.y, 250, 500);
				p.coinActive = Math.random() < 0.7;
				p.coinX = Phaser.Math.Between(20, PLAT_W - 20);
				p.obsActive = Math.random() < 0.4;
				p.obsX = Phaser.Math.Between(20, PLAT_W - 20);
			}
		}

		this.playerVY += PLAYER_GRAVITY * dt;
		this.playerY += this.playerVY * dt;
		this.onGround = false;

		const pLeft = this.playerX - this.playerW / 2;
		const pRight = this.playerX + this.playerW / 2;
		const pBottom = this.playerY + this.playerH / 2;
		const pTop = this.playerY - this.playerH / 2;

		for (const p of this.platforms) {
			if (pRight > p.x && pLeft < p.x + PLAT_W) {
				if (this.playerVY >= 0 && pBottom >= p.y && pBottom <= p.y + PLAT_H + this.playerVY * dt) {
					this.playerY = p.y - this.playerH / 2;
					this.playerVY = 0;
					this.onGround = true;
				}
			}
		}

		for (const p of this.platforms) {
			if (p.coinActive) {
				const cx = p.x + p.coinX;
				const cy = p.y + p.coinY;
				const dist = Math.abs(this.playerX - cx) + Math.abs(this.playerY - cy);
				if (dist < 18) {
					p.coinActive = false;
					this.coinCount++;
					this.score += 10;
				}
			}
			if (p.obsActive) {
				const ox = p.x + p.obsX;
				const oy = p.y + p.obsY;
				if (pRight > ox - OBS_W / 2 && pLeft < ox + OBS_W / 2 &&
					pBottom > oy - OBS_H / 2 && pTop < oy + OBS_H / 2) {
					this.die();
					return;
				}
			}
		}

		if (this.playerY > 650) {
			this.die();
			return;
		}

		this.score += 1;
		this.scoreText.setText("${g.common.score}: " + this.score);
		this.coinText.setText("${g.quickRush.coins}: " + this.coinCount);

		this.runTimer += delta;
		if (this.runTimer > 150) {
			this.runFrame = (this.runFrame + 1) % 4;
			this.runTimer = 0;
		}

		this.drawAll();
	}

	private die() {
		this.gameOver = true;
		this.deathTimer = 1000;
		this.cameras.main.shake(200, 0.01);
	}

	private drawAll() {
		const bg = this.bgGfx;
		bg.clear();

		bg.fillGradientStyle(0x1a1a4e, 0x1a1a4e, 0x3a7d32, 0x3a7d32, 1);
		bg.fillRect(0, 0, 800, 600);

		bg.fillStyle(0xffffff, 0.5);
		for (const c of this.clouds) {
			bg.fillCircle(c.x, c.y, c.r);
			bg.fillCircle(c.x + c.r * 0.6, c.y - c.r * 0.2, c.r * 0.7);
			bg.fillCircle(c.x - c.r * 0.5, c.y + c.r * 0.1, c.r * 0.6);
		}

		for (const t of this.trees) {
			bg.fillStyle(0x5a3a1a, 1);
			bg.fillRect(t.x + t.w / 2 - 4, 560 - t.h, 8, t.h + 40);
			bg.fillStyle(0x2d6b1e, 1);
			bg.fillTriangle(t.x + t.w / 2, 560 - t.h - 20, t.x, 560 - t.h + 10, t.x + t.w, 560 - t.h + 10);
			bg.fillStyle(0x3a8a28, 1);
			bg.fillTriangle(t.x + t.w / 2, 560 - t.h - 5, t.x + 5, 560 - t.h + 20, t.x + t.w - 5, 560 - t.h + 20);
		}

		const g = this.gfx;
		g.clear();

		for (const p of this.platforms) {
			g.fillStyle(0x8b5e3c, 1);
			g.fillRoundedRect(p.x, p.y, PLAT_W, PLAT_H, 4);
			g.fillStyle(0x6b8c3e, 1);
			g.fillRect(p.x + 2, p.y, PLAT_W - 4, 4);

			if (p.coinActive) {
				const cx = p.x + p.coinX;
				const cy = p.y + p.coinY;
				g.fillStyle(0xfbbf24, 1);
				g.fillCircle(cx, cy, COIN_SIZE);
				g.fillStyle(0xf59e0b, 1);
				g.fillCircle(cx, cy, COIN_SIZE - 3);
			}

			if (p.obsActive) {
				const ox = p.x + p.obsX;
				const oy = p.y + p.obsY;
				g.fillStyle(0xef4444, 1);
				g.fillTriangle(ox, oy - OBS_H / 2, ox - OBS_W / 2, oy + OBS_H / 2, ox + OBS_W / 2, oy + OBS_H / 2);
				g.fillStyle(0xffffff, 1);
				g.fillCircle(ox, oy - 2, 3);
			}
		}

		if (!this.gameOver) {
			const px = this.playerX;
			const py = this.playerY;
			const legOffset = this.onGround ? (this.runFrame < 2 ? 3 : -3) : 0;

			g.fillStyle(0xffcc99, 1);
			g.fillCircle(px, py - 10, 7);

			g.fillStyle(0xff6b35, 1);
			g.fillRoundedRect(px - 6, py - 4, 12, 16, 2);

			g.fillStyle(0x2563eb, 1);
			g.fillRect(px - 5, py + 4, 4, 10);
			g.fillRect(px + 1, py + 4, 4, 10);

			if (this.onGround) {
				g.fillStyle(0xffcc99, 1);
				g.fillRect(px - 8, py + 1, 4, 3);
				g.fillRect(px + 4, py + 1, 4, 3);
			}

			g.fillStyle(0x000000, 1);
			g.fillCircle(px - 2, py - 11, 1.5);
			g.fillCircle(px + 3, py - 11, 1.5);
		} else {
			g.fillStyle(0xff0000, 0.5);
			g.fillCircle(this.playerX, this.playerY, 15);
		}

		g.lineStyle(3, 0xff0000, 0.8);
		g.lineBetween(0, 598, 800, 598);
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
		const score = data.score ?? 0;
		const coins = data.coins ?? 0;

		this.add.text(400, 160, "${g.common.gameOver}", { fontSize: "48px", color: "#ef4444", fontFamily: "Arial" }).setOrigin(0.5);
		this.add.text(400, 260, "${g.common.finalScore}: " + score, { fontSize: "32px", color: "#fbbf24", fontFamily: "Arial" }).setOrigin(0.5);
		this.add.text(400, 310, "${g.quickRush.coins}: " + coins, { fontSize: "22px", color: "#fbbf24", fontFamily: "Arial" }).setOrigin(0.5);

		const retryBtn = this.add.text(400, 400, "${g.quickRush.retry}", { fontSize: "24px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add.text(400, 460, "${g.common.backToMenu}", { fontSize: "20px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
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
	height: 600,
	fps: 60,
	gravity: 600,
	debug: false,
};
`,
		},
	];
}
