import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function tankTemplate(meta: ProjectMeta): TemplateFile[] {
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
	width: 512,
	height: 512,
	backgroundColor: "#000000",
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
			path: "src/audio/sfx.ts",
			content: `export class Sfx {
	private ctx: AudioContext | null = null;
	private g!: GainNode;
	private ensure(): AudioContext {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.g = this.ctx.createGain();
			this.g.gain.value = 0.3;
			this.g.connect(this.ctx.destination);
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
		return this.ctx;
	}
	fire() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), gn = c.createGain();
		o.type = "square"; o.frequency.setValueAtTime(800, t);
		o.frequency.exponentialRampToValueAtTime(200, t + 0.08);
		gn.gain.setValueAtTime(0.2, t);
		gn.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
		o.connect(gn); gn.connect(this.g); o.start(t); o.stop(t + 0.12);
	}
	explode() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), gn = c.createGain();
		o.type = "sawtooth"; o.frequency.setValueAtTime(200, t);
		o.frequency.exponentialRampToValueAtTime(30, t + 0.25);
		gn.gain.setValueAtTime(0.25, t);
		gn.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
		o.connect(gn); gn.connect(this.g); o.start(t); o.stop(t + 0.35);
	}
	hitWall() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), gn = c.createGain();
		o.type = "triangle"; o.frequency.value = 300;
		gn.gain.setValueAtTime(0.1, t);
		gn.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
		o.connect(gn); gn.connect(this.g); o.start(t); o.stop(t + 0.07);
	}
	win() {
		const c = this.ensure(), t = c.currentTime;
		[523, 659, 784, 1047].forEach((f, i) => {
			const o = c.createOscillator(), gn = c.createGain();
			o.type = "sine"; o.frequency.value = f;
			const off = i * 0.12;
			gn.gain.setValueAtTime(0.2, t + off);
			gn.gain.exponentialRampToValueAtTime(0.01, t + off + 0.25);
			o.connect(gn); gn.connect(this.g); o.start(t + off); o.stop(t + off + 0.3);
		});
	}
	lose() {
		const c = this.ensure(), t = c.currentTime;
		[392, 349, 311, 262].forEach((f, i) => {
			const o = c.createOscillator(), gn = c.createGain();
			o.type = "triangle"; o.frequency.value = f;
			const off = i * 0.15;
			gn.gain.setValueAtTime(0.18, t + off);
			gn.gain.exponentialRampToValueAtTime(0.01, t + off + 0.3);
			o.connect(gn); gn.connect(this.g); o.start(t + off); o.stop(t + off + 0.35);
		});
	}
	dispose() { if (this.ctx) { this.ctx.close(); this.ctx = null; } }
}
`,
		},
		{
			path: "src/config/game-config.ts",
			content: `export const GAME_CONFIG = {
	title: "${meta.name}",
	width: 512,
	height: 512,
	fps: 60,
	gravity: 0,
	debug: false,
};

export const TILE = 32;
export const COLS = 16;
export const ROWS = 16;
export const PLAYER_SPEED = 150;
export const BULLET_SPEED = 250;
export const ENEMY_SPEED = 80;
export const ENEMY_BULLET_SPEED = 180;
export const MAX_ENEMIES = 3;
export const TOTAL_ENEMIES = 8;
export const ENEMY_FIRE_INTERVAL = 2500;
export const ENEMY_TURN_INTERVAL = 2000;
export const PLAYER_COLOR = 0x22c55e;
export const ENEMY_COLOR = 0xef4444;
export const BRICK_COLOR = 0x92400e;
export const IRON_COLOR = 0x94a3b8;
export const NEST_COLOR = 0xfbbf24;

export const LEVEL_MAP: number[][] = [
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	[0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0],
	[0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0],
	[0,0,1,0,0,1,0,1,1,0,1,0,0,1,0,0],
	[0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0],
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	[0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
	[0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
	[0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
	[0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0],
	[0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0],
	[0,0,1,0,0,1,0,2,2,0,1,0,0,1,0,0],
	[0,0,1,0,0,1,0,0,0,0,1,0,0,1,0,0],
	[0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
	[0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";
import { TILE, COLS, ROWS, PLAYER_COLOR, ENEMY_COLOR, BRICK_COLOR } from "../config/game-config";

export class MenuScene extends Phaser.Scene {
	constructor() { super("MenuScene"); }

	create() {
		const W = 512, H = 512;
		this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

		this.add.text(W / 2, 120, "${meta.name}", {
			fontSize: "44px", color: "#ffffff", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(W / 2, 185, "${g.tank.subtitle}", {
			fontSize: "20px", color: "#a3e635", fontFamily: "Arial",
		}).setOrigin(0.5);

		const previewG = this.add.graphics();
		const s = 12;
		const ox = W / 2 - (8 * s) / 2, oy = 220;
		for (let r = 0; r < 5; r++) {
			for (let c = 0; c < 8; c++) {
				if ((r + c) % 3 === 0) {
					previewG.fillStyle(BRICK_COLOR, 0.7);
					previewG.fillRect(ox + c * s, oy + r * s, s - 1, s - 1);
				}
			}
		}
		previewG.fillStyle(PLAYER_COLOR, 1);
		previewG.fillRect(ox + 3 * s, oy + 4 * s, s, s);
		previewG.fillStyle(ENEMY_COLOR, 1);
		previewG.fillRect(ox + 1 * s, oy, s, s);
		previewG.fillRect(ox + 6 * s, oy, s, s);

		const startBtn = this.add.text(W / 2, 350, "${g.tank.startGame}", {
			fontSize: "28px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add.text(W / 2, 430, "${g.tank.moveHint}", {
			fontSize: "14px", color: "#94a3b8", fontFamily: "Arial", align: "center",
		}).setOrigin(0.5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";
import {
	TILE, COLS, ROWS, PLAYER_SPEED, BULLET_SPEED, ENEMY_SPEED,
	ENEMY_BULLET_SPEED, MAX_ENEMIES, TOTAL_ENEMIES, ENEMY_FIRE_INTERVAL,
	ENEMY_TURN_INTERVAL, PLAYER_COLOR, ENEMY_COLOR, BRICK_COLOR,
	IRON_COLOR, NEST_COLOR, LEVEL_MAP,
} from "../config/game-config";
import { Sfx } from "../audio/sfx";

interface Tank {
	body: Phaser.GameObjects.Rectangle;
	turret: Phaser.GameObjects.Rectangle;
	dir: number;
	alive: boolean;
	hp: number;
	fireTimer: number;
	turnTimer: number;
}

export class GameScene extends Phaser.Scene {
	private player!: any;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private fireKey!: Phaser.Input.Keyboard.Key;
	private bricks: Phaser.GameObjects.Rectangle[] = [];
	private irons: Phaser.GameObjects.Rectangle[] = [];
	private nest!: Phaser.GameObjects.Rectangle;
	private nestAlive = true;
	private playerBullets: any[] = [];
	private enemyBullets: any[] = [];
	private enemies: Tank[] = [];
	private enemiesSpawned = 0;
	private enemiesKilled = 0;
	private spawnTimer = 0;
	private score = 0;
	private lives = 3;
	private scoreText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;
	private enemyCountText!: Phaser.GameObjects.Text;
	private playerAlive = true;
	private respawnTimer = 0;
	private canFire = true;
	private fireCooldown = 0;
	private sfx!: Sfx;
	private gameOver = false;

	constructor() { super("GameScene"); }

	create() {
		this.bricks = []; this.irons = []; this.playerBullets = []; this.enemyBullets = [];
		this.enemies = []; this.enemiesSpawned = 0; this.enemiesKilled = 0;
		this.spawnTimer = 0; this.score = 0; this.lives = 3;
		this.playerAlive = true; this.respawnTimer = 0;
		this.nestAlive = true; this.canFire = true; this.fireCooldown = 0;
		this.gameOver = false;
		this.sfx = new Sfx();

		this.add.rectangle(256, 256, 512, 512, 0x000000);

		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const t = LEVEL_MAP[r][c];
				if (t === 1) {
					const b = this.add.rectangle(c * TILE + TILE / 2, r * TILE + TILE / 2, TILE - 2, TILE - 2, BRICK_COLOR);
					this.bricks.push(b);
				} else if (t === 2) {
					const b = this.add.rectangle(c * TILE + TILE / 2, r * TILE + TILE / 2, TILE - 2, TILE - 2, IRON_COLOR);
					this.irons.push(b);
				}
			}
		}

		this.nest = this.add.rectangle(7 * TILE + TILE, 14 * TILE + TILE, TILE * 2 - 4, TILE * 2 - 4, NEST_COLOR);
		this.add.text(7 * TILE + TILE, 14 * TILE + TILE, "⚑", {
			fontSize: "22px", fontFamily: "Arial",
		}).setOrigin(0.5);

		const pb = this.add.rectangle(4 * TILE + TILE / 2, 15 * TILE + TILE / 2, TILE - 4, TILE - 4, PLAYER_COLOR).setDepth(5);
		const pt = this.add.rectangle(4 * TILE + TILE / 2, 15 * TILE - 2, 6, 14, PLAYER_COLOR).setDepth(5);
		this.player = { body: pb, turret: pt, dir: 0 };

		this.cursors = this.input.keyboard!.createCursorKeys();
		this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

		this.scoreText = this.add.text(8, 4, "${g.common.score}: 0", {
			fontSize: "14px", color: "#fbbf24", fontFamily: "Arial",
		}).setDepth(50);
		this.livesText = this.add.text(504, 4, "♥ 3", {
			fontSize: "14px", color: "#ef4444", fontFamily: "Arial",
		}).setOrigin(1, 0).setDepth(50);
		this.enemyCountText = this.add.text(256, 4, "", {
			fontSize: "14px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(0.5, 0).setDepth(50);
		this.updateEnemyCount();

		this.events.on("shutdown", () => this.sfx.dispose());
	}

	update(_t: number, delta: number) {
		if (this.gameOver) return;
		const dt = delta / 1000;

		if (this.playerAlive) this.handlePlayerInput(dt);
		else {
			this.respawnTimer -= delta;
			if (this.respawnTimer <= 0) this.respawnPlayer();
		}

		if (this.fireCooldown > 0) { this.fireCooldown -= delta; }
		else { this.canFire = true; }

		this.spawnTimer -= delta;
		if (this.spawnTimer <= 0 && this.enemies.filter(e => e.alive).length < MAX_ENEMIES && this.enemiesSpawned < TOTAL_ENEMIES) {
			this.spawnEnemy();
			this.spawnTimer = 2000;
		}

		for (const e of this.enemies) {
			if (!e.alive) continue;
			e.turnTimer -= delta;
			if (e.turnTimer <= 0) { e.dir = Phaser.Math.Between(0, 3); e.turnTimer = ENEMY_TURN_INTERVAL; }
			this.moveEntity(e.body, e.turret, e.dir, ENEMY_SPEED * dt);
			e.fireTimer -= delta;
			if (e.fireTimer <= 0) { this.enemyFire(e); e.fireTimer = ENEMY_FIRE_INTERVAL; }
		}

		this.updateBullets(this.playerBullets, dt, true);
		this.updateBullets(this.enemyBullets, dt, false);
	}

	private handlePlayerInput(dt: number) {
		let dir = -1;
		if (this.cursors.up.isDown) dir = 0;
		else if (this.cursors.right.isDown) dir = 1;
		else if (this.cursors.down.isDown) dir = 2;
		else if (this.cursors.left.isDown) dir = 3;

		if (dir >= 0) {
			this.player.dir = dir;
			this.moveEntity(this.player.body, this.player.turret, dir, PLAYER_SPEED * dt);
		}

		if (Phaser.Input.Keyboard.JustDown(this.fireKey) && this.canFire) {
			this.playerFire();
		}
	}

	private moveEntity(body: any, turret: any, dir: number, speed: number) {
		const dx = [0, 1, 0, -1][dir] * speed;
		const dy = [-1, 0, 1, 0][dir] * speed;
		const nx = body.x + dx;
		const ny = body.y + dy;
		const hs = (TILE - 4) / 2;

		if (nx - hs < 0 || nx + hs > 512 || ny - hs < 0 || ny + hs > 512) return;

		for (const b of this.bricks) {
			if (this.rectsOverlap(nx, ny, hs, b.x, b.y, (TILE - 2) / 2)) return;
		}
		for (const b of this.irons) {
			if (this.rectsOverlap(nx, ny, hs, b.x, b.y, (TILE - 2) / 2)) return;
		}
		if (this.nestAlive && this.rectsOverlap(nx, ny, hs, this.nest.x, this.nest.y, (TILE * 2 - 4) / 2)) return;

		body.setPosition(nx, ny);
		const offsets = [[0, -10], [10, 0], [0, 10], [-10, 0]];
		turret.setPosition(nx + offsets[dir][0], ny + offsets[dir][1]);
		if (dir === 0 || dir === 2) { turret.setSize(6, 14); }
		else { turret.setSize(14, 6); }
	}

	private playerFire() {
		this.canFire = false;
		this.fireCooldown = 300;
		const d = this.player.dir;
		const dx = [0, 1, 0, -1][d] * BULLET_SPEED;
		const dy = [-1, 0, 1, 0][d] * BULLET_SPEED;
		const bx = this.player.body.x + [0, 16, 0, -16][d];
		const by = this.player.body.y + [-16, 0, 16, 0][d];
		const r = this.add.rectangle(bx, by, 6, 6, 0xffffff).setDepth(8);
		this.playerBullets.push({ rect: r, dx, dy });
		this.sfx.fire();
	}

	private enemyFire(e: Tank) {
		const d = e.dir;
		const dx = [0, 1, 0, -1][d] * ENEMY_BULLET_SPEED;
		const dy = [-1, 0, 1, 0][d] * ENEMY_BULLET_SPEED;
		const bx = e.body.x + [0, 16, 0, -16][d];
		const by = e.body.y + [-16, 0, 16, 0][d];
		const r = this.add.rectangle(bx, by, 5, 5, 0xfbbf24).setDepth(8);
		this.enemyBullets.push({ rect: r, dx, dy });
	}

	private updateBullets(bullets: any[], dt: number, isPlayer: boolean) {
		for (let i = bullets.length - 1; i >= 0; i--) {
			const b = bullets[i];
			b.rect.x += b.dx * dt;
			b.rect.y += b.dy * dt;

			if (b.rect.x < 0 || b.rect.x > 512 || b.rect.y < 0 || b.rect.y > 512) {
				b.rect.destroy(); bullets.splice(i, 1); continue;
			}

			let hit = false;
			for (let j = this.bricks.length - 1; j >= 0; j--) {
				if (this.pointInRect(b.rect.x, b.rect.y, this.bricks[j])) {
					this.explodeAt(this.bricks[j].x, this.bricks[j].y, BRICK_COLOR);
					this.bricks[j].destroy(); this.bricks.splice(j, 1);
					this.sfx.hitWall(); hit = true; break;
				}
			}
			if (hit) { b.rect.destroy(); bullets.splice(i, 1); continue; }

			for (const ir of this.irons) {
				if (this.pointInRect(b.rect.x, b.rect.y, ir)) {
					this.sfx.hitWall(); hit = true; break;
				}
			}
			if (hit) { b.rect.destroy(); bullets.splice(i, 1); continue; }

			if (this.nestAlive && this.pointInRect(b.rect.x, b.rect.y, this.nest)) {
				this.nestAlive = false;
				this.nest.setFillStyle(0x7f1d1d);
				this.explodeAt(this.nest.x, this.nest.y, NEST_COLOR);
				this.sfx.explode();
				b.rect.destroy(); bullets.splice(i, 1);
				this.endGame(false); continue;
			}

			if (isPlayer) {
				for (const e of this.enemies) {
					if (!e.alive) continue;
					if (this.pointInRect(b.rect.x, b.rect.y, e.body)) {
						e.hp--;
						if (e.hp <= 0) {
							e.alive = false; e.body.destroy(); e.turret.destroy();
							this.explodeAt(e.body.x, e.body.y, ENEMY_COLOR);
							this.sfx.explode();
							this.enemiesKilled++; this.score += 100;
							this.scoreText.setText("${g.common.score}: " + this.score);
							this.updateEnemyCount();
							if (this.enemiesKilled >= TOTAL_ENEMIES) this.endGame(true);
						} else {
							e.body.setAlpha(0.5);
							this.time.delayedCall(100, () => { if (e.alive) e.body.setAlpha(1); });
						}
						hit = true; break;
					}
				}
				if (hit) { b.rect.destroy(); bullets.splice(i, 1); continue; }
			} else {
				if (this.playerAlive && this.pointInRect(b.rect.x, b.rect.y, this.player.body)) {
					this.playerHit();
					b.rect.destroy(); bullets.splice(i, 1); continue;
				}
			}
		}
	}

	private spawnEnemy() {
		const spawnPoints = [[TILE, TILE], [8 * TILE, TILE], [15 * TILE, TILE]];
		const sp = spawnPoints[this.enemiesSpawned % 3];
		const body = this.add.rectangle(sp[0], sp[1], TILE - 4, TILE - 4, ENEMY_COLOR).setDepth(5);
		const turret = this.add.rectangle(sp[0], sp[1] + 10, 6, 14, ENEMY_COLOR).setDepth(5);
		const e: Tank = {
			body, turret, dir: 2, alive: true,
			hp: this.enemiesSpawned > 5 ? 2 : 1,
			fireTimer: ENEMY_FIRE_INTERVAL, turnTimer: ENEMY_TURN_INTERVAL,
		};
		this.enemies.push(e);
		this.enemiesSpawned++;
	}

	private playerHit() {
		this.playerAlive = false;
		this.lives--;
		this.livesText.setText("♥ " + this.lives);
		this.explodeAt(this.player.body.x, this.player.body.y, PLAYER_COLOR);
		this.sfx.explode();
		this.player.body.setVisible(false);
		this.player.turret.setVisible(false);
		if (this.lives <= 0) { this.endGame(false); }
		else { this.respawnTimer = 1500; }
	}

	private respawnPlayer() {
		this.playerAlive = true;
		this.player.body.setPosition(4 * TILE + TILE / 2, 15 * TILE + TILE / 2).setVisible(true);
		this.player.turret.setPosition(4 * TILE + TILE / 2, 15 * TILE - 2).setVisible(true);
		this.player.dir = 0;
		this.player.body.setAlpha(0.5);
		this.time.delayedCall(1500, () => { if (this.playerAlive) this.player.body.setAlpha(1); });
	}

	private endGame(win: boolean) {
		if (this.gameOver) return;
		this.gameOver = true;
		if (win) this.sfx.win(); else this.sfx.lose();
		this.time.delayedCall(1200, () => {
			this.scene.start("GameOverScene", { score: this.score, win, killed: this.enemiesKilled });
		});
	}

	private updateEnemyCount() {
		const rem = TOTAL_ENEMIES - this.enemiesKilled;
		this.enemyCountText.setText("${g.tank.remaining}: " + rem);
	}

	private explodeAt(x: number, y: number, color: number) {
		for (let i = 0; i < 6; i++) {
			const p = this.add.circle(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8),
				Phaser.Math.Between(2, 5), color, 1).setDepth(20);
			this.tweens.add({
				targets: p, alpha: 0, scale: 0.1,
				x: p.x + Phaser.Math.Between(-20, 20), y: p.y + Phaser.Math.Between(-20, 20),
				duration: 350, onComplete: () => p.destroy(),
			});
		}
	}

	private rectsOverlap(ax: number, ay: number, ahs: number, bx: number, by: number, bhs: number): boolean {
		return Math.abs(ax - bx) < ahs + bhs && Math.abs(ay - by) < ahs + bhs;
	}

	private pointInRect(px: number, py: number, r: any): boolean {
		const hs = r.width / 2;
		return Math.abs(px - r.x) < hs && Math.abs(py - r.y) < r.height / 2;
	}
}
`,
		},
		{
			path: "src/scenes/game-over-scene.ts",
			content: `import Phaser from "phaser";
import { Sfx } from "../audio/sfx";

export class GameOverScene extends Phaser.Scene {
	constructor() { super("GameOverScene"); }

	create(data: any) {
		const W = 512, H = 512;
		const win = data.win ?? false;
		const score = data.score ?? 0;
		const killed = data.killed ?? 0;

		this.add.rectangle(W / 2, H / 2, W, H, 0x000000);

		this.add.text(W / 2, 130, win ? "${g.tank.victory}" : "${g.common.gameOver}", {
			fontSize: "40px", color: win ? "#22c55e" : "#ef4444", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5);

		this.add.text(W / 2, 210, "${g.common.finalScore}: " + score, {
			fontSize: "24px", color: "#fbbf24", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(W / 2, 260, "${g.tank.enemiesKilled}: " + killed, {
			fontSize: "18px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(0.5);

		const retryBtn = this.add.text(W / 2, 350, "${g.tank.retry}", {
			fontSize: "24px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add.text(W / 2, 410, "${g.common.backToMenu}", {
			fontSize: "18px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
		menuBtn.on("pointerover", () => menuBtn.setColor("#22c55e"));
		menuBtn.on("pointerout", () => menuBtn.setColor("#94a3b8"));
	}
}
`,
		},
	];
}
