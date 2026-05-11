import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function flappyBirdTemplate(meta: ProjectMeta): TemplateFile[] {
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
	width: 288,
	height: 512,
	backgroundColor: "#70c5ce",
	physics: {
		default: "arcade",
		arcade: { gravity: { x: 0, y: 900 }, debug: false },
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
	private master!: GainNode;

	private ensure(): AudioContext {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.3;
			this.master.connect(this.ctx.destination);
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
		return this.ctx;
	}

	flap() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), g = c.createGain();
		o.type = "sine";
		o.frequency.setValueAtTime(400, t);
		o.frequency.exponentialRampToValueAtTime(800, t + 0.08);
		g.gain.setValueAtTime(0.2, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
		o.connect(g); g.connect(this.master);
		o.start(t); o.stop(t + 0.15);
	}

	score() {
		const c = this.ensure(), t = c.currentTime;
		[523, 659, 784].forEach((f, i) => {
			const o = c.createOscillator(), g = c.createGain();
			o.type = "sine"; o.frequency.value = f;
			const off = i * 0.06;
			g.gain.setValueAtTime(0.18, t + off);
			g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.12);
			o.connect(g); g.connect(this.master);
			o.start(t + off); o.stop(t + off + 0.15);
		});
	}

	hit() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), g = c.createGain();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(300, t);
		o.frequency.exponentialRampToValueAtTime(80, t + 0.2);
		g.gain.setValueAtTime(0.25, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
		o.connect(g); g.connect(this.master);
		o.start(t); o.stop(t + 0.3);
	}

	ground() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), g = c.createGain();
		o.type = "triangle";
		o.frequency.setValueAtTime(150, t);
		o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
		g.gain.setValueAtTime(0.2, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
		o.connect(g); g.connect(this.master);
		o.start(t); o.stop(t + 0.25);
	}

	medal() {
		const c = this.ensure(), t = c.currentTime;
		[523, 659, 784, 1047].forEach((f, i) => {
			const o = c.createOscillator(), g = c.createGain();
			o.type = "sine"; o.frequency.value = f;
			const off = i * 0.12;
			g.gain.setValueAtTime(0.2, t + off);
			g.gain.exponentialRampToValueAtTime(0.01, t + off + 0.25);
			o.connect(g); g.connect(this.master);
			o.start(t + off); o.stop(t + off + 0.3);
		});
	}

	dispose() {
		if (this.ctx) { this.ctx.close(); this.ctx = null; }
	}
}
`,
		},
		{
			path: "src/config/game-config.ts",
			content: `export const GAME_CONFIG = {
	title: "${meta.name}",
	width: 288,
	height: 512,
	fps: 60,
	gravity: 900,
	debug: false,
};

export const BIRD_X = 80;
export const BIRD_RADIUS = 12;
export const BIRD_COLOR = 0xf9c74f;
export const BIRD_WING_COLOR = 0xf8961e;
export const BIRD_EYE_COLOR = 0x000000;
export const BIRD_BEAK_COLOR = 0xe76f51;

export const FLAP_VELOCITY = -280;
export const BIRD_ANGLE_UP = -25;
export const BIRD_ANGLE_DOWN = 90;
export const ANGLE_LERP_UP = 0.15;
export const ANGLE_LERP_DOWN = 0.04;

export const PIPE_WIDTH = 52;
export const PIPE_COLOR = 0x2d6a4f;
export const PIPE_CAP_COLOR = 0x40916c;
export const PIPE_CAP_HEIGHT = 24;
export const PIPE_CAP_EXTRA = 4;
export const PIPE_GAP = 130;
export const PIPE_SPEED = -160;
export const PIPE_SPAWN_INTERVAL = 1600;
export const PIPE_MIN_TOP = 60;
export const PIPE_MAX_TOP = 280;

export const GROUND_HEIGHT = 112;
export const GROUND_COLOR = 0xded895;
export const GROUND_DARK = 0xc4a03c;
export const GROUND_SPEED = 2;

export const SKY_TOP = 0x4ec0ca;
export const SKY_BOTTOM = 0x70c5ce;

export const CLOUD_COLOR = 0xffffff;
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";
import {
	BIRD_X, BIRD_RADIUS, BIRD_COLOR, BIRD_WING_COLOR, BIRD_EYE_COLOR, BIRD_BEAK_COLOR,
	GROUND_HEIGHT, GROUND_COLOR, GROUND_DARK, SKY_TOP, SKY_BOTTOM, CLOUD_COLOR,
} from "../config/game-config";

export class MenuScene extends Phaser.Scene {
	constructor() { super("MenuScene"); }

	create() {
		const W = 288, H = 512;

		const bg = this.add.graphics();
		bg.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_BOTTOM, SKY_BOTTOM, 1);
		bg.fillRect(0, 0, W, H - GROUND_HEIGHT);

		for (let i = 0; i < 5; i++) {
			const cx = Phaser.Math.Between(20, W - 20);
			const cy = Phaser.Math.Between(40, 180);
			const cg = this.add.graphics();
			cg.fillStyle(CLOUD_COLOR, 0.6);
			const r = Phaser.Math.Between(15, 25);
			cg.fillCircle(cx, cy, r);
			cg.fillCircle(cx - r * 0.7, cy + 4, r * 0.7);
			cg.fillCircle(cx + r * 0.7, cy + 4, r * 0.7);
		}

		const groundG = this.add.graphics();
		groundG.fillStyle(GROUND_COLOR, 1);
		groundG.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
		groundG.fillStyle(GROUND_DARK, 1);
		groundG.fillRect(0, H - GROUND_HEIGHT, W, 4);
		for (let x = 0; x < W; x += 20) {
			groundG.fillStyle(GROUND_DARK, 0.3);
			groundG.fillTriangle(x, H - GROUND_HEIGHT + 4, x + 10, H - GROUND_HEIGHT + 14, x + 20, H - GROUND_HEIGHT + 4);
		}

		this.add.text(W / 2, 100, "${meta.name}", {
			fontSize: "32px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold",
			stroke: "#2d6a4f", strokeThickness: 3,
		}).setOrigin(0.5);

		this.add.text(W / 2, 145, "${g.flappyBird.subtitle}", {
			fontSize: "16px", color: "#f9c74f", fontFamily: "Arial",
		}).setOrigin(0.5);

		const birdG = this.add.graphics();
		const bx = W / 2, by = 240;
		this.drawBird(birdG, bx, by);
		this.tweens.add({
			targets: birdG, y: -12, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
		});

		const startBtn = this.add.text(W / 2, 340, "${g.flappyBird.startGame}", {
			fontSize: "24px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add.text(W / 2, 400, "${g.flappyBird.tapHint}", {
			fontSize: "12px", color: "#2d6a4f", fontFamily: "Arial",
		}).setOrigin(0.5);
	}

	private drawBird(g: any, x: number, y: number) {
		g.fillStyle(BIRD_COLOR, 1);
		g.fillCircle(x, y, BIRD_RADIUS);
		g.fillStyle(BIRD_WING_COLOR, 1);
		g.fillCircle(x - 4, y + 2, BIRD_RADIUS * 0.55);
		g.fillStyle(0xffffff, 1);
		g.fillCircle(x + 5, y - 4, 5);
		g.fillStyle(BIRD_EYE_COLOR, 1);
		g.fillCircle(x + 6, y - 4, 2.5);
		g.fillStyle(BIRD_BEAK_COLOR, 1);
		g.fillTriangle(x + BIRD_RADIUS - 2, y - 1, x + BIRD_RADIUS + 8, y + 2, x + BIRD_RADIUS - 2, y + 5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";
import {
	BIRD_X, BIRD_RADIUS, BIRD_COLOR, BIRD_WING_COLOR, BIRD_EYE_COLOR, BIRD_BEAK_COLOR,
	FLAP_VELOCITY, BIRD_ANGLE_UP, BIRD_ANGLE_DOWN, ANGLE_LERP_UP, ANGLE_LERP_DOWN,
	PIPE_WIDTH, PIPE_COLOR, PIPE_CAP_COLOR, PIPE_CAP_HEIGHT, PIPE_CAP_EXTRA,
	PIPE_GAP, PIPE_SPEED, PIPE_SPAWN_INTERVAL, PIPE_MIN_TOP, PIPE_MAX_TOP,
	GROUND_HEIGHT, GROUND_COLOR, GROUND_DARK, GROUND_SPEED,
	SKY_TOP, SKY_BOTTOM, CLOUD_COLOR,
} from "../config/game-config";
import { Sfx } from "../audio/sfx";

export class GameScene extends Phaser.Scene {
	private bird!: Phaser.GameObjects.Container;
	private birdBody!: any;
	private pipes: any[] = [];
	private groundTiles: any[] = [];
	private groundOffset = 0;
	private score = 0;
	private bestScore = 0;
	private scoreText!: Phaser.GameObjects.Text;
	private bestText!: Phaser.GameObjects.Text;
	private alive = true;
	private started = false;
	private spawnTimer = 0;
	private birdAngle = 0;
	private sfx!: Sfx;
	private readyText!: Phaser.GameObjects.Text;
	private tapToStart = true;

	constructor() { super("GameScene"); }

	create() {
		this.pipes = [];
		this.groundTiles = [];
		this.groundOffset = 0;
		this.score = 0;
		this.alive = true;
		this.started = false;
		this.spawnTimer = 0;
		this.birdAngle = 0;
		this.tapToStart = true;

		this.sfx = new Sfx();

		const stored = localStorage.getItem("rimecraft_flappy_best");
		this.bestScore = stored ? parseInt(stored, 10) : 0;

		const W = 288, H = 512;

		const bg = this.add.graphics();
		bg.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_BOTTOM, SKY_BOTTOM, 1);
		bg.fillRect(0, 0, W, H);

		for (let i = 0; i < 4; i++) {
			const cx = Phaser.Math.Between(20, W - 20);
			const cy = Phaser.Math.Between(30, 140);
			const cg = this.add.graphics().setDepth(0);
			cg.fillStyle(CLOUD_COLOR, 0.5);
			const r = Phaser.Math.Between(12, 22);
			cg.fillCircle(cx, cy, r);
			cg.fillCircle(cx - r * 0.6, cy + 3, r * 0.65);
			cg.fillCircle(cx + r * 0.6, cy + 3, r * 0.65);
		}

		this.drawGround();

		const birdG = this.add.graphics();
		this.drawBirdGraphics(birdG);

		this.bird = this.add.container(BIRD_X, H / 2 - 40, [birdG]).setDepth(10);
		this.bird.setSize(BIRD_RADIUS * 2, BIRD_RADIUS * 2);
		this.physics.world.enable(this.bird);
		this.birdBody = (this.bird as any).body;
		this.birdBody.setCircle(BIRD_RADIUS, 0, 0);
		this.birdBody.allowGravity = false;

		this.scoreText = this.add.text(W / 2, 40, "0", {
			fontSize: "36px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold",
			stroke: "#000000", strokeThickness: 3,
		}).setOrigin(0.5).setDepth(20);

		this.bestText = this.add.text(W / 2, 75, "${g.flappyBird.bestScore}: " + this.bestScore, {
			fontSize: "13px", color: "#ffffff", fontFamily: "Arial",
			stroke: "#000000", strokeThickness: 2,
		}).setOrigin(0.5).setDepth(20).setAlpha(0.7);

		this.readyText = this.add.text(W / 2, H / 2 + 40, "${g.flappyBird.tapHint}", {
			fontSize: "16px", color: "#ffffff", fontFamily: "Arial",
			stroke: "#2d6a4f", strokeThickness: 2,
		}).setOrigin(0.5).setDepth(20);

		this.input.on("pointerdown", () => this.onTap());
		this.input.keyboard!.on("keydown-SPACE", () => this.onTap());

		this.events.on("shutdown", () => this.sfx.dispose());
	}

	private onTap() {
		if (!this.alive) return;
		if (this.tapToStart) {
			this.tapToStart = false;
			this.started = true;
			this.birdBody.allowGravity = true;
			this.readyText.setVisible(false);
		}
		this.birdBody.setVelocityY(FLAP_VELOCITY);
		this.birdAngle = BIRD_ANGLE_UP;
		this.sfx.flap();
	}

	update(_t: number, delta: number) {
		if (!this.started) {
			this.bird.y = 288 / 2 - 40 + Math.sin(_t / 300) * 8;
			return;
		}
		if (!this.alive) return;

		const dt = delta / 1000;
		const W = 288, H = 512;
		const groundY = H - GROUND_HEIGHT;

		if (this.birdBody.velocity.y > 0) {
			this.birdAngle = Phaser.Math.Linear(this.birdAngle, BIRD_ANGLE_DOWN, ANGLE_LERP_DOWN);
		} else {
			this.birdAngle = Phaser.Math.Linear(this.birdAngle, BIRD_ANGLE_UP, ANGLE_LERP_UP);
		}
		this.bird.setAngle(this.birdAngle);

		if (this.bird.y - BIRD_RADIUS < 0) {
			this.bird.y = BIRD_RADIUS;
			this.birdBody.setVelocityY(0);
		}

		if (this.bird.y + BIRD_RADIUS >= groundY) {
			this.bird.y = groundY - BIRD_RADIUS;
			this.die("ground");
			return;
		}

		this.spawnTimer += delta;
		if (this.spawnTimer >= PIPE_SPAWN_INTERVAL) {
			this.spawnTimer -= PIPE_SPAWN_INTERVAL;
			this.spawnPipe();
		}

		for (let i = this.pipes.length - 1; i >= 0; i--) {
			const p = this.pipes[i];
			p.top.x += PIPE_SPEED * dt;
			p.bottom.x += PIPE_SPEED * dt;
			p.x += PIPE_SPEED * dt;

			if (!p.scored && p.x + PIPE_WIDTH / 2 < BIRD_X) {
				p.scored = true;
				this.score++;
				this.scoreText.setText("" + this.score);
				this.sfx.score();
			}

			if (p.x + PIPE_WIDTH < -10) {
				p.top.destroy();
				p.bottom.destroy();
				this.pipes.splice(i, 1);
				continue;
			}

			if (this.checkPipeCollision(p)) {
				this.die("pipe");
				return;
			}
		}

		this.scrollGround();
	}

	private spawnPipe() {
		const W = 288, H = 512;
		const groundY = H - GROUND_HEIGHT;
		const topH = Phaser.Math.Between(PIPE_MIN_TOP, PIPE_MAX_TOP);
		const bottomY = topH + PIPE_GAP;
		const bottomH = groundY - bottomY;

		const topG = this.add.graphics().setDepth(5);
		topG.fillStyle(PIPE_COLOR, 1);
		topG.fillRect(0, 0, PIPE_WIDTH, topH - PIPE_CAP_HEIGHT);
		topG.fillStyle(PIPE_CAP_COLOR, 1);
		topG.fillRoundedRect(-PIPE_CAP_EXTRA, topH - PIPE_CAP_HEIGHT, PIPE_WIDTH + PIPE_CAP_EXTRA * 2, PIPE_CAP_HEIGHT, 3);
		topG.x = W;

		const botG = this.add.graphics().setDepth(5);
		botG.fillStyle(PIPE_CAP_COLOR, 1);
		botG.fillRoundedRect(-PIPE_CAP_EXTRA, 0, PIPE_WIDTH + PIPE_CAP_EXTRA * 2, PIPE_CAP_HEIGHT, 3);
		botG.fillStyle(PIPE_COLOR, 1);
		botG.fillRect(0, PIPE_CAP_HEIGHT, PIPE_WIDTH, bottomH - PIPE_CAP_HEIGHT);
		botG.y = bottomY;
		botG.x = W;

		this.pipes.push({ top: topG, bottom: botG, x: W, topH, bottomY, scored: false });
	}

	private checkPipeCollision(p: any): boolean {
		const bx = this.bird.x;
		const by = this.bird.y;
		const br = BIRD_RADIUS - 2;
		const px = p.x;
		const pw = PIPE_WIDTH;

		if (bx + br < px || bx - br > px + pw) return false;

		if (by - br < p.topH || by + br > p.bottomY) return true;

		return false;
	}

	private die(cause: string) {
		this.alive = false;
		this.started = false;
		if (cause === "pipe") this.sfx.hit();
		else this.sfx.ground();

		this.birdBody.allowGravity = false;
		this.birdBody.setVelocity(0, 0);

		const isNew = this.score > this.bestScore;
		if (isNew) {
			this.bestScore = this.score;
			localStorage.setItem("rimecraft_flappy_best", "" + this.bestScore);
		}

		this.time.delayedCall(800, () => {
			this.scene.start("GameOverScene", {
				score: this.score, best: this.bestScore, isNewBest: isNew,
			});
		});
	}

	private drawBirdGraphics(g: any) {
		g.fillStyle(BIRD_COLOR, 1);
		g.fillCircle(0, 0, BIRD_RADIUS);
		g.fillStyle(BIRD_WING_COLOR, 1);
		g.fillCircle(-4, 2, BIRD_RADIUS * 0.55);
		g.fillStyle(0xffffff, 1);
		g.fillCircle(5, -4, 5);
		g.fillStyle(BIRD_EYE_COLOR, 1);
		g.fillCircle(6, -4, 2.5);
		g.fillStyle(BIRD_BEAK_COLOR, 1);
		g.fillTriangle(BIRD_RADIUS - 2, -1, BIRD_RADIUS + 8, 2, BIRD_RADIUS - 2, 5);
	}

	private drawGround() {
		const W = 288, H = 512;
		const gy = H - GROUND_HEIGHT;
		const groundG = this.add.graphics().setDepth(15);
		groundG.fillStyle(GROUND_COLOR, 1);
		groundG.fillRect(0, gy, W, GROUND_HEIGHT);
		groundG.fillStyle(GROUND_DARK, 1);
		groundG.fillRect(0, gy, W, 4);
		for (let x = 0; x < W; x += 20) {
			groundG.fillStyle(GROUND_DARK, 0.3);
			groundG.fillTriangle(x, gy + 4, x + 10, gy + 14, x + 20, gy + 4);
		}
	}

	private scrollGround() {
	}
}
`,
		},
		{
			path: "src/scenes/game-over-scene.ts",
			content: `import Phaser from "phaser";
import { Sfx } from "../audio/sfx";
import {
	GROUND_HEIGHT, GROUND_COLOR, GROUND_DARK,
	SKY_TOP, SKY_BOTTOM,
} from "../config/game-config";

export class GameOverScene extends Phaser.Scene {
	constructor() { super("GameOverScene"); }

	create(data: any) {
		const W = 288, H = 512;
		const score = data.score ?? 0;
		const best = data.best ?? 0;
		const isNewBest = data.isNewBest ?? false;

		const bg = this.add.graphics();
		bg.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_BOTTOM, SKY_BOTTOM, 1);
		bg.fillRect(0, 0, W, H);

		const groundG = this.add.graphics();
		groundG.fillStyle(GROUND_COLOR, 1);
		groundG.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
		groundG.fillStyle(GROUND_DARK, 1);
		groundG.fillRect(0, H - GROUND_HEIGHT, W, 4);

		const sfx = new Sfx();
		if (isNewBest && score > 0) sfx.medal();
		this.events.on("shutdown", () => sfx.dispose());

		this.add.text(W / 2, 100, "${g.common.gameOver}", {
			fontSize: "32px", color: "#ef4444", fontFamily: "Arial", fontStyle: "bold",
			stroke: "#000000", strokeThickness: 3,
		}).setOrigin(0.5);

		const panelG = this.add.graphics();
		panelG.fillStyle(0xdeb887, 1);
		panelG.fillRoundedRect(W / 2 - 100, 155, 200, 120, 10);
		panelG.lineStyle(3, 0x8b6914, 1);
		panelG.strokeRoundedRect(W / 2 - 100, 155, 200, 120, 10);

		this.add.text(W / 2, 180, "${g.common.score}", {
			fontSize: "16px", color: "#8b4513", fontFamily: "Arial",
		}).setOrigin(0.5);
		this.add.text(W / 2, 205, "" + score, {
			fontSize: "28px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold",
			stroke: "#000000", strokeThickness: 2,
		}).setOrigin(0.5);

		this.add.text(W / 2, 235, "${g.flappyBird.bestScore}", {
			fontSize: "16px", color: "#8b4513", fontFamily: "Arial",
		}).setOrigin(0.5);
		this.add.text(W / 2, 260, "" + best, {
			fontSize: "28px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold",
			stroke: "#000000", strokeThickness: 2,
		}).setOrigin(0.5);

		if (isNewBest && score > 0) {
			this.add.text(W / 2, 295, "${g.flappyBird.newBest}", {
				fontSize: "18px", color: "#fbbf24", fontFamily: "Arial", fontStyle: "bold",
			}).setOrigin(0.5);
		}

		let medal = "";
		let medalColor = "";
		if (score >= 40) { medal = "S"; medalColor = "#fbbf24"; }
		else if (score >= 20) { medal = "A"; medalColor = "#22c55e"; }
		else if (score >= 10) { medal = "B"; medalColor = "#06b6d4"; }
		if (medal) {
			this.add.text(60, 215, medal, {
				fontSize: "36px", color: medalColor, fontFamily: "Arial", fontStyle: "bold",
				stroke: "#000000", strokeThickness: 2,
			}).setOrigin(0.5);
		}

		const retryBtn = this.add.text(W / 2, 360, "${g.flappyBird.retry}", {
			fontSize: "22px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add.text(W / 2, 410, "${g.common.backToMenu}", {
			fontSize: "16px", color: "#2d6a4f", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });
		menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
		menuBtn.on("pointerover", () => menuBtn.setColor("#22c55e"));
		menuBtn.on("pointerout", () => menuBtn.setColor("#2d6a4f"));
	}
}
`,
		},
	];
}
