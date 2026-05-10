import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function dodgeTemplate(meta: ProjectMeta): TemplateFile[] {
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
	width: 580,
	height: 530,
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
	tick() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), gn = c.createGain();
		o.type = "sine"; o.frequency.value = 440;
		gn.gain.setValueAtTime(0.08, t);
		gn.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
		o.connect(gn); gn.connect(this.g); o.start(t); o.stop(t + 0.05);
	}
	die() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), gn = c.createGain();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(400, t);
		o.frequency.exponentialRampToValueAtTime(50, t + 0.4);
		gn.gain.setValueAtTime(0.25, t);
		gn.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
		o.connect(gn); gn.connect(this.g); o.start(t); o.stop(t + 0.5);
	}
	milestone() {
		const c = this.ensure(), t = c.currentTime;
		[523, 659, 784].forEach((f, i) => {
			const o = c.createOscillator(), gn = c.createGain();
			o.type = "sine"; o.frequency.value = f;
			const off = i * 0.08;
			gn.gain.setValueAtTime(0.15, t + off);
			gn.gain.exponentialRampToValueAtTime(0.001, t + off + 0.15);
			o.connect(gn); gn.connect(this.g); o.start(t + off); o.stop(t + off + 0.2);
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
	width: 580,
	height: 530,
	fps: 60,
	gravity: 0,
	debug: false,
};

export const BORDER = 30;
export const PLAYER_SIZE = 20;
export const PLAYER_COLOR = 0x06b6d4;
export const ENEMY_COLORS = [0xef4444, 0xf97316, 0xa855f7, 0x22c55e];

export interface EnemyDef {
	x: number; y: number;
	w: number; h: number;
	vx: number; vy: number;
	color: number;
}

export const ENEMIES: EnemyDef[] = [
	{ x: 75, y: 60, w: 28, h: 28, vx: 120, vy: 100, color: 0xef4444 },
	{ x: 480, y: 80, w: 50, h: 25, vx: -100, vy: 130, color: 0xf97316 },
	{ x: 100, y: 350, w: 25, h: 50, vx: 140, vy: -90, color: 0xa855f7 },
	{ x: 400, y: 300, w: 36, h: 36, vx: -110, vy: -120, color: 0x22c55e },
];
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";
import { PLAYER_COLOR, ENEMY_COLORS, BORDER } from "../config/game-config";

export class MenuScene extends Phaser.Scene {
	constructor() { super("MenuScene"); }

	create() {
		const W = 580, H = 530;
		const bg = this.add.graphics();
		bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
		bg.fillRect(0, 0, W, H);

		this.add.text(W / 2, 130, "${meta.name}", {
			fontSize: "44px", color: "#ffffff", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(W / 2, 195, "${g.dodge.subtitle}", {
			fontSize: "20px", color: "#a3e635", fontFamily: "Arial",
		}).setOrigin(0.5);

		const pg = this.add.graphics();
		pg.fillStyle(PLAYER_COLOR, 1);
		pg.fillCircle(W / 2, 280, 10);
		ENEMY_COLORS.forEach((c, i) => {
			const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
			const ex = W / 2 + Math.cos(angle) * 50;
			const ey = 280 + Math.sin(angle) * 40;
			pg.fillStyle(c, 0.8);
			pg.fillRect(ex - 8, ey - 8, 16, 16);
		});

		this.add.text(W / 2, 350, "${g.dodge.desc.replace(/\n/g, '\\n')}", {
			fontSize: "15px", color: "#94a3b8", fontFamily: "Arial",
			align: "center", wordWrap: { width: 380 },
		}).setOrigin(0.5);

		const startBtn = this.add.text(W / 2, 430, "${g.dodge.startGame}", {
			fontSize: "28px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add.text(W / 2, 490, "${g.dodge.moveHint}", {
			fontSize: "13px", color: "#64748b", fontFamily: "Arial",
		}).setOrigin(0.5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";
import { BORDER, PLAYER_SIZE, PLAYER_COLOR, ENEMIES, EnemyDef } from "../config/game-config";
import { Sfx } from "../audio/sfx";

interface Enemy {
	rect: Phaser.GameObjects.Rectangle;
	vx: number; vy: number;
}

export class GameScene extends Phaser.Scene {
	private player!: Phaser.GameObjects.Arc;
	private enemies: Enemy[] = [];
	private borders: Phaser.GameObjects.Rectangle[] = [];
	private elapsed = 0;
	private timerText!: Phaser.GameObjects.Text;
	private bestText!: Phaser.GameObjects.Text;
	private dragging = false;
	private alive = true;
	private sfx!: Sfx;
	private tickTimer = 0;
	private lastMilestone = 0;

	constructor() { super("GameScene"); }

	create() {
		this.elapsed = 0; this.alive = true; this.dragging = false;
		this.tickTimer = 0; this.lastMilestone = 0;
		this.enemies = []; this.borders = [];
		this.sfx = new Sfx();

		const W = 580, H = 530;

		const bg = this.add.graphics();
		bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
		bg.fillRect(0, 0, W, H);

		const borderColor = 0x334155;
		this.borders.push(this.add.rectangle(W / 2, BORDER / 2, W, BORDER, borderColor));
		this.borders.push(this.add.rectangle(W / 2, H - BORDER / 2, W, BORDER, borderColor));
		this.borders.push(this.add.rectangle(BORDER / 2, H / 2, BORDER, H, borderColor));
		this.borders.push(this.add.rectangle(W - BORDER / 2, H / 2, BORDER, H, borderColor));

		this.player = this.add.circle(W / 2, H / 2, PLAYER_SIZE / 2, PLAYER_COLOR).setDepth(10);
		this.player.setInteractive({ draggable: true, useHandCursor: true });

		this.input.on("drag", (_p: any, go: any, dragX: number, dragY: number) => {
			if (go !== this.player || !this.alive) return;
			const r = PLAYER_SIZE / 2;
			go.x = Phaser.Math.Clamp(dragX, BORDER + r, W - BORDER - r);
			go.y = Phaser.Math.Clamp(dragY, BORDER + r, H - BORDER - r);
		});

		for (const def of ENEMIES) {
			const rect = this.add.rectangle(def.x, def.y, def.w, def.h, def.color, 0.85).setDepth(5);
			this.enemies.push({ rect, vx: def.vx, vy: def.vy });
		}

		this.timerText = this.add.text(W / 2, BORDER + 10, "0.000s", {
			fontSize: "22px", color: "#fbbf24", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5, 0).setDepth(20);

		this.bestText = this.add.text(W / 2, H - BORDER - 12, "", {
			fontSize: "13px", color: "#64748b", fontFamily: "Arial",
		}).setOrigin(0.5, 1).setDepth(20);

		this.events.on("shutdown", () => this.sfx.dispose());
	}

	update(_t: number, delta: number) {
		if (!this.alive) return;
		const dt = delta / 1000;
		this.elapsed += dt;

		const W = 580, H = 530;

		for (const e of this.enemies) {
			e.rect.x += e.vx * dt;
			e.rect.y += e.vy * dt;
			const hw = e.rect.width / 2, hh = e.rect.height / 2;
			if (e.rect.x - hw <= BORDER) { e.rect.x = BORDER + hw; e.vx = Math.abs(e.vx); }
			if (e.rect.x + hw >= W - BORDER) { e.rect.x = W - BORDER - hw; e.vx = -Math.abs(e.vx); }
			if (e.rect.y - hh <= BORDER) { e.rect.y = BORDER + hh; e.vy = Math.abs(e.vy); }
			if (e.rect.y + hh >= H - BORDER) { e.rect.y = H - BORDER - hh; e.vy = -Math.abs(e.vy); }
		}

		const pr = PLAYER_SIZE / 2;
		for (const e of this.enemies) {
			const dx = Math.abs(this.player.x - e.rect.x);
			const dy = Math.abs(this.player.y - e.rect.y);
			if (dx < pr + e.rect.width / 2 && dy < pr + e.rect.height / 2) {
				this.die(); return;
			}
		}

		if (this.player.x - pr <= BORDER || this.player.x + pr >= W - BORDER ||
			this.player.y - pr <= BORDER || this.player.y + pr >= H - BORDER) {
			this.die(); return;
		}

		this.timerText.setText(this.elapsed.toFixed(3) + "s");

		this.tickTimer += delta;
		if (this.tickTimer >= 1000) { this.tickTimer -= 1000; this.sfx.tick(); }

		const ms = Math.floor(this.elapsed / 10);
		if (ms > this.lastMilestone && this.elapsed >= 10) {
			this.lastMilestone = ms;
			this.sfx.milestone();
		}
	}

	private die() {
		this.alive = false;
		this.sfx.die();
		this.player.setFillStyle(0xef4444);

		for (let i = 0; i < 8; i++) {
			const p = this.add.circle(
				this.player.x + Phaser.Math.Between(-10, 10),
				this.player.y + Phaser.Math.Between(-10, 10),
				Phaser.Math.Between(2, 5), PLAYER_COLOR, 1
			).setDepth(20);
			this.tweens.add({
				targets: p, alpha: 0, scale: 0.1,
				x: p.x + Phaser.Math.Between(-30, 30),
				y: p.y + Phaser.Math.Between(-30, 30),
				duration: 400, onComplete: () => p.destroy(),
			});
		}

		this.time.delayedCall(1200, () => {
			this.scene.start("GameOverScene", { time: this.elapsed });
		});
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
		const W = 580, H = 530;
		const time = data.time ?? 0;

		const bg = this.add.graphics();
		bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
		bg.fillRect(0, 0, W, H);

		this.add.text(W / 2, 150, "${g.common.gameOver}", {
			fontSize: "40px", color: "#ef4444", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5);

		this.add.text(W / 2, 230, "${g.dodge.survived}", {
			fontSize: "20px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(W / 2, 280, time.toFixed(3) + "s", {
			fontSize: "48px", color: "#fbbf24", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5);

		let rank = "C", rankColor = "#94a3b8";
		if (time >= 50) { rank = "S"; rankColor = "#fbbf24"; }
		else if (time >= 30) { rank = "A"; rankColor = "#22c55e"; }
		else if (time >= 15) { rank = "B"; rankColor = "#06b6d4"; }

		this.add.text(W / 2, 340, rank, {
			fontSize: "60px", color: rankColor, fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5);

		const retryBtn = this.add.text(W / 2, 420, "${g.dodge.retry}", {
			fontSize: "24px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add.text(W / 2, 475, "${g.common.backToMenu}", {
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
