import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function rhythmTemplate(meta: ProjectMeta): TemplateFile[] {
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
	width: 480,
	height: 720,
	backgroundColor: "#0a0a1a",
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
			path: "src/audio/sound-manager.ts",
			content: `const LANE_NOTES = [261.63, 329.63, 392.0];

export class SoundManager {
	private ctx: AudioContext | null = null;
	private master!: GainNode;
	private melodyGain!: GainNode;
	private sfxGain!: GainNode;
	private bassOsc: OscillatorNode | null = null;
	private bassGainNode: GainNode | null = null;

	private ensureCtx(): AudioContext {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.4;
			this.master.connect(this.ctx.destination);

			this.melodyGain = this.ctx.createGain();
			this.melodyGain.gain.value = 0.5;
			this.melodyGain.connect(this.master);

			this.sfxGain = this.ctx.createGain();
			this.sfxGain.gain.value = 0.6;
			this.sfxGain.connect(this.master);
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
		return this.ctx;
	}

	playMelodyNote(lane: number) {
		const ctx = this.ensureCtx();
		const t = ctx.currentTime;
		const freq = LANE_NOTES[lane];

		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.value = freq;
		g.gain.setValueAtTime(0.3, t);
		g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
		osc.connect(g);
		g.connect(this.melodyGain);
		osc.start(t);
		osc.stop(t + 0.35);

		const osc2 = ctx.createOscillator();
		const g2 = ctx.createGain();
		osc2.type = "sine";
		osc2.frequency.value = freq * 2;
		g2.gain.setValueAtTime(0.08, t);
		g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
		osc2.connect(g2);
		g2.connect(this.melodyGain);
		osc2.start(t);
		osc2.stop(t + 0.25);
	}

	playHit(lane: number, perfect: boolean) {
		const ctx = this.ensureCtx();
		const t = ctx.currentTime;
		const base = LANE_NOTES[lane];
		const freq = perfect ? base * 2 : base * 1.5;
		const dur = perfect ? 0.18 : 0.12;
		const vol = perfect ? 0.35 : 0.25;

		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(freq, t);
		osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05);
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + dur);
		osc.connect(g);
		g.connect(this.sfxGain);
		osc.start(t);
		osc.stop(t + dur + 0.01);

		if (perfect) {
			const osc2 = ctx.createOscillator();
			const g2 = ctx.createGain();
			osc2.type = "sine";
			osc2.frequency.value = freq * 1.5;
			g2.gain.setValueAtTime(0.12, t);
			g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
			osc2.connect(g2);
			g2.connect(this.sfxGain);
			osc2.start(t);
			osc2.stop(t + 0.15);
		}
	}

	playMiss() {
		const ctx = this.ensureCtx();
		const t = ctx.currentTime;

		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(120, t);
		osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
		g.gain.setValueAtTime(0.12, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
		osc.connect(g);
		g.connect(this.sfxGain);
		osc.start(t);
		osc.stop(t + 0.25);
	}

	playCountdown(high: boolean) {
		const ctx = this.ensureCtx();
		const t = ctx.currentTime;

		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = high ? 880 : 660;
		g.gain.setValueAtTime(0.3, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
		osc.connect(g);
		g.connect(this.sfxGain);
		osc.start(t);
		osc.stop(t + 0.2);
	}

	playBeat() {
		const ctx = this.ensureCtx();
		const t = ctx.currentTime;

		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(150, t);
		osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
		g.gain.setValueAtTime(0.15, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
		osc.connect(g);
		g.connect(this.melodyGain);
		osc.start(t);
		osc.stop(t + 0.12);
	}

	playComboMilestone(combo: number) {
		const ctx = this.ensureCtx();
		const t = ctx.currentTime;
		const notes = [523.25, 659.25, 783.99];

		notes.forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			osc.type = "sine";
			osc.frequency.value = freq;
			const offset = i * 0.06;
			g.gain.setValueAtTime(0, t + offset);
			g.gain.linearRampToValueAtTime(0.2, t + offset + 0.02);
			g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);
			osc.connect(g);
			g.connect(this.sfxGain);
			osc.start(t + offset);
			osc.stop(t + offset + 0.18);
		});
	}

	playResultJingle(good: boolean) {
		const ctx = this.ensureCtx();
		const t = ctx.currentTime;
		const melody = good
			? [523.25, 659.25, 783.99, 1046.5]
			: [392, 349.23, 311.13, 261.63];

		melody.forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			osc.type = good ? "sine" : "triangle";
			osc.frequency.value = freq;
			const offset = i * 0.15;
			g.gain.setValueAtTime(0, t + offset);
			g.gain.linearRampToValueAtTime(0.25, t + offset + 0.03);
			g.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.3);
			osc.connect(g);
			g.connect(this.sfxGain);
			osc.start(t + offset);
			osc.stop(t + offset + 0.35);
		});
	}

	startBass() {
		const ctx = this.ensureCtx();
		this.stopBass();
		this.bassOsc = ctx.createOscillator();
		this.bassGainNode = ctx.createGain();
		this.bassOsc.type = "sine";
		this.bassOsc.frequency.value = 65.41;
		this.bassGainNode.gain.value = 0.06;
		this.bassOsc.connect(this.bassGainNode);
		this.bassGainNode.connect(this.melodyGain);
		this.bassOsc.start();
	}

	stopBass() {
		try { this.bassOsc?.stop(); } catch {}
		this.bassOsc = null;
		this.bassGainNode = null;
	}

	dispose() {
		this.stopBass();
		if (this.ctx) {
			this.ctx.close();
			this.ctx = null;
		}
	}
}
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";
import { COLORS, LANE_COLORS } from "../config/game-config";

export class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	create() {
		const W = 480;
		const H = 720;

		const bg = this.add.graphics();
		bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
		bg.fillRect(0, 0, W, H);

		for (let i = 0; i < 30; i++) {
			const x = Phaser.Math.Between(0, W);
			const y = Phaser.Math.Between(0, H);
			const r = Phaser.Math.FloatBetween(0.5, 2);
			const star = this.add.circle(x, y, r, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.6));
			this.tweens.add({
				targets: star,
				alpha: Phaser.Math.FloatBetween(0.1, 0.3),
				duration: Phaser.Math.Between(1000, 3000),
				yoyo: true,
				repeat: -1,
			});
		}

		this.add
			.text(W / 2, 180, "${meta.name}", {
				fontSize: "44px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(W / 2, 240, "${g.rhythm.subtitle}", {
				fontSize: "22px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const laneY = 340;
		const laneW = 50;
		const laneGap = 70;
		const startX = W / 2 - laneGap;
		for (let i = 0; i < 3; i++) {
			const x = startX + i * laneGap;
			const note = this.add.graphics();
			note.fillStyle(LANE_COLORS[i], 0.8);
			note.fillRoundedRect(x - laneW / 2, laneY, laneW, 16, 4);
			this.tweens.add({
				targets: note,
				y: -20,
				duration: 1500,
				repeat: -1,
				delay: i * 300,
			});
		}

		const startBtn = this.add
			.text(W / 2, 480, "${g.rhythm.startGame}", {
				fontSize: "28px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add
			.text(W / 2, 560, "${g.rhythm.moveHint}", {
				fontSize: "15px",
				color: "#94a3b8",
				fontFamily: "Arial",
				align: "center",
			})
			.setOrigin(0.5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";
import {
	COLORS,
	LANE_COLORS,
	LANE_KEYS,
	LANE_COUNT,
	NOTE_SPEED,
	HIT_Y,
	SPAWN_Y,
	LANE_WIDTH,
	PERFECT_RANGE,
	GOOD_RANGE,
	BPM,
	BEAT_PATTERN,
} from "../config/game-config";
import { SoundManager } from "../audio/sound-manager";

interface Note {
	graphics: Phaser.GameObjects.Graphics;
	lane: number;
	y: number;
	active: boolean;
}

export class GameScene extends Phaser.Scene {
	private notes: Note[] = [];
	private score = 0;
	private combo = 0;
	private maxCombo = 0;
	private perfects = 0;
	private goods = 0;
	private misses = 0;
	private scoreText!: Phaser.GameObjects.Text;
	private comboText!: Phaser.GameObjects.Text;
	private feedbackText!: Phaser.GameObjects.Text;
	private laneX: number[] = [];
	private keys: Phaser.Input.Keyboard.Key[] = [];
	private altKeys: Phaser.Input.Keyboard.Key[] = [];
	private hitGlow: Phaser.GameObjects.Graphics[] = [];
	private beatIndex = 0;
	private beatTimer = 0;
	private beatInterval = 0;
	private songTime = 0;
	private songDuration = 0;
	private gameStarted = false;
	private readyPhase = true;
	private progressBar!: Phaser.GameObjects.Graphics;
	private sound_mgr!: SoundManager;
	private prevComboMilestone = 0;

	constructor() {
		super("GameScene");
	}

	create() {
		this.notes = [];
		this.score = 0;
		this.combo = 0;
		this.maxCombo = 0;
		this.perfects = 0;
		this.goods = 0;
		this.misses = 0;
		this.beatIndex = 0;
		this.beatTimer = 0;
		this.songTime = 0;
		this.gameStarted = false;
		this.readyPhase = true;
		this.prevComboMilestone = 0;

		this.sound_mgr = new SoundManager();

		const W = 480;
		const H = 720;

		this.beatInterval = 60000 / BPM;
		this.songDuration = BEAT_PATTERN.length * this.beatInterval;

		const bg = this.add.graphics();
		bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
		bg.fillRect(0, 0, W, H);

		const totalLaneWidth = LANE_COUNT * LANE_WIDTH + (LANE_COUNT - 1) * 20;
		const startX = (W - totalLaneWidth) / 2 + LANE_WIDTH / 2;

		this.laneX = [];
		for (let i = 0; i < LANE_COUNT; i++) {
			this.laneX.push(startX + i * (LANE_WIDTH + 20));
		}

		const laneBg = this.add.graphics();
		laneBg.fillStyle(0xffffff, 0.03);
		for (let i = 0; i < LANE_COUNT; i++) {
			laneBg.fillRect(this.laneX[i] - LANE_WIDTH / 2, 0, LANE_WIDTH, H);
		}

		const hitLine = this.add.graphics();
		hitLine.lineStyle(2, 0xffffff, 0.5);
		hitLine.lineBetween(this.laneX[0] - LANE_WIDTH / 2 - 10, HIT_Y, this.laneX[2] + LANE_WIDTH / 2 + 10, HIT_Y);

		this.hitGlow = [];
		for (let i = 0; i < LANE_COUNT; i++) {
			const glow = this.add.graphics();
			glow.fillStyle(LANE_COLORS[i], 0.15);
			glow.fillRoundedRect(this.laneX[i] - LANE_WIDTH / 2, HIT_Y - 25, LANE_WIDTH, 50, 8);
			this.hitGlow.push(glow);

			this.add
				.text(this.laneX[i], HIT_Y + 45, LANE_KEYS[i], {
					fontSize: "20px",
					color: "#" + LANE_COLORS[i].toString(16).padStart(6, "0"),
					fontFamily: "Arial",
					fontStyle: "bold",
				})
				.setOrigin(0.5)
				.setAlpha(0.6);
		}

		this.progressBar = this.add.graphics();

		this.scoreText = this.add
			.text(16, 16, "${g.common.score}: 0", {
				fontSize: "22px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setDepth(100);

		this.comboText = this.add
			.text(W - 16, 16, "", {
				fontSize: "20px",
				color: "#f472b6",
				fontFamily: "Arial",
			})
			.setOrigin(1, 0)
			.setDepth(100);

		this.feedbackText = this.add
			.text(W / 2, HIT_Y - 60, "", {
				fontSize: "28px",
				color: "#ffffff",
				fontFamily: "Arial",
				fontStyle: "bold",
			})
			.setOrigin(0.5)
			.setDepth(100)
			.setAlpha(0);

		this.keys = [
			this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
			this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
			this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
		];
		this.altKeys = [
			this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
			this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
			this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
		];

		this.events.on("shutdown", () => {
			this.sound_mgr.dispose();
		});

		this.showReady();
	}

	private showReady() {
		const W = 480;
		this.sound_mgr.playCountdown(false);

		const readyText = this.add
			.text(W / 2, 300, "READY", {
				fontSize: "64px",
				color: "#06b6d4",
				fontFamily: "Arial",
				fontStyle: "bold",
			})
			.setOrigin(0.5)
			.setAlpha(0);

		this.tweens.add({
			targets: readyText,
			alpha: 1,
			scale: 1.2,
			duration: 500,
			onComplete: () => {
				this.tweens.add({
					targets: readyText,
					alpha: 0,
					scale: 0.5,
					duration: 300,
					delay: 300,
					onComplete: () => {
						readyText.destroy();
						this.sound_mgr.playCountdown(true);

						const goText = this.add
							.text(W / 2, 300, "GO!", {
								fontSize: "72px",
								color: "#22c55e",
								fontFamily: "Arial",
								fontStyle: "bold",
							})
							.setOrigin(0.5)
							.setAlpha(0);

						this.tweens.add({
							targets: goText,
							alpha: 1,
							scale: 1.3,
							duration: 300,
							onComplete: () => {
								this.tweens.add({
									targets: goText,
									alpha: 0,
									scale: 2,
									duration: 400,
									onComplete: () => {
										goText.destroy();
										this.readyPhase = false;
										this.gameStarted = true;
										this.sound_mgr.startBass();
									},
								});
							},
						});
					},
				});
			},
		});
	}

	update(_time: number, delta: number) {
		if (!this.gameStarted) return;

		this.songTime += delta;

		if (this.beatIndex < BEAT_PATTERN.length) {
			this.beatTimer += delta;
			if (this.beatTimer >= this.beatInterval) {
				this.beatTimer -= this.beatInterval;
				const lane = BEAT_PATTERN[this.beatIndex];
				if (lane >= 0 && lane < LANE_COUNT) {
					this.spawnNote(lane);
					this.sound_mgr.playMelodyNote(lane);
				} else {
					this.sound_mgr.playBeat();
				}
				this.beatIndex++;
			}
		}

		for (let i = this.notes.length - 1; i >= 0; i--) {
			const note = this.notes[i];
			if (!note.active) continue;

			note.y += NOTE_SPEED * (delta / 1000);
			note.graphics.setY(note.y);

			if (note.y > HIT_Y + GOOD_RANGE) {
				this.onMiss(note);
			}
		}

		for (let lane = 0; lane < LANE_COUNT; lane++) {
			if (
				Phaser.Input.Keyboard.JustDown(this.keys[lane]) ||
				Phaser.Input.Keyboard.JustDown(this.altKeys[lane])
			) {
				this.onLanePress(lane);
			}
		}

		const progress = Math.min(this.songTime / this.songDuration, 1);
		this.progressBar.clear();
		this.progressBar.fillStyle(0x06b6d4, 0.3);
		this.progressBar.fillRect(0, 0, 480, 4);
		this.progressBar.fillStyle(0x06b6d4, 1);
		this.progressBar.fillRect(0, 0, 480 * progress, 4);

		if (this.beatIndex >= BEAT_PATTERN.length && this.notes.every((n) => !n.active)) {
			this.gameStarted = false;
			this.sound_mgr.stopBass();
			this.time.delayedCall(1000, () => {
				this.scene.start("GameOverScene", {
					score: this.score,
					maxCombo: this.maxCombo,
					perfects: this.perfects,
					goods: this.goods,
					misses: this.misses,
				});
			});
		}
	}

	private spawnNote(lane: number) {
		const g = this.add.graphics();
		const color = LANE_COLORS[lane];

		g.fillStyle(color, 1);
		g.fillRoundedRect(-LANE_WIDTH / 2 + 4, -8, LANE_WIDTH - 8, 16, 6);
		g.lineStyle(2, 0xffffff, 0.4);
		g.strokeRoundedRect(-LANE_WIDTH / 2 + 4, -8, LANE_WIDTH - 8, 16, 6);

		g.setX(this.laneX[lane]);
		g.setY(SPAWN_Y);
		g.setDepth(10);

		this.notes.push({ graphics: g, lane, y: SPAWN_Y, active: true });
	}

	private onLanePress(lane: number) {
		this.flashLane(lane);

		let closest: Note | null = null;
		let closestDist = Infinity;

		for (const note of this.notes) {
			if (!note.active || note.lane !== lane) continue;
			const dist = Math.abs(note.y - HIT_Y);
			if (dist < closestDist) {
				closestDist = dist;
				closest = note;
			}
		}

		if (closest && closestDist <= GOOD_RANGE) {
			if (closestDist <= PERFECT_RANGE) {
				this.onHit(closest, true);
			} else {
				this.onHit(closest, false);
			}
		}
	}

	private onHit(note: Note, perfect: boolean) {
		note.active = false;
		this.combo++;
		if (this.combo > this.maxCombo) this.maxCombo = this.combo;

		const multiplier = Math.min(Math.floor(this.combo / 5) + 1, 4);

		this.sound_mgr.playHit(note.lane, perfect);

		const milestone = Math.floor(this.combo / 10);
		if (milestone > this.prevComboMilestone && this.combo >= 10) {
			this.prevComboMilestone = milestone;
			this.sound_mgr.playComboMilestone(this.combo);
		}

		if (perfect) {
			this.score += 100 * multiplier;
			this.perfects++;
			this.showFeedback("${g.rhythm.perfect}", "#22c55e");
		} else {
			this.score += 50 * multiplier;
			this.goods++;
			this.showFeedback("${g.rhythm.good}", "#fbbf24");
		}

		this.scoreText.setText("${g.common.score}: " + this.score);
		if (this.combo >= 3) {
			this.comboText.setText(this.combo + " Combo!");
		}

		this.burstParticles(note.graphics.x, HIT_Y, LANE_COLORS[note.lane]);
		this.tweens.add({
			targets: note.graphics,
			alpha: 0,
			scaleX: 1.5,
			scaleY: 0.2,
			duration: 150,
			onComplete: () => note.graphics.destroy(),
		});
	}

	private onMiss(note: Note) {
		note.active = false;
		this.combo = 0;
		this.prevComboMilestone = 0;
		this.misses++;
		this.comboText.setText("");
		this.showFeedback("MISS", "#ef4444");
		this.sound_mgr.playMiss();

		this.tweens.add({
			targets: note.graphics,
			alpha: 0,
			y: note.y + 40,
			duration: 200,
			onComplete: () => note.graphics.destroy(),
		});
	}

	private showFeedback(text: string, color: string) {
		this.feedbackText.setText(text);
		this.feedbackText.setColor(color);
		this.feedbackText.setAlpha(1);
		this.feedbackText.setScale(1);

		this.tweens.killTweensOf(this.feedbackText);
		this.tweens.add({
			targets: this.feedbackText,
			alpha: 0,
			y: HIT_Y - 90,
			duration: 500,
			onStart: () => {
				this.feedbackText.setY(HIT_Y - 60);
			},
		});
	}

	private flashLane(lane: number) {
		const glow = this.hitGlow[lane];
		glow.setAlpha(1);
		this.tweens.add({
			targets: glow,
			alpha: 0.15,
			duration: 150,
		});
	}

	private burstParticles(x: number, y: number, color: number) {
		for (let i = 0; i < 6; i++) {
			const p = this.add.circle(
				x + Phaser.Math.Between(-20, 20),
				y + Phaser.Math.Between(-10, 10),
				Phaser.Math.Between(2, 5),
				color,
				1
			);
			p.setDepth(20);
			this.tweens.add({
				targets: p,
				y: p.y - Phaser.Math.Between(20, 60),
				x: p.x + Phaser.Math.Between(-30, 30),
				alpha: 0,
				scale: 0.2,
				duration: 400,
				onComplete: () => p.destroy(),
			});
		}
	}
}
`,
		},
		{
			path: "src/scenes/game-over-scene.ts",
			content: `import Phaser from "phaser";
import { SoundManager } from "../audio/sound-manager";

export class GameOverScene extends Phaser.Scene {
	constructor() {
		super("GameOverScene");
	}

	create(data: any) {
		const W = 480;
		const score = data.score ?? 0;
		const maxCombo = data.maxCombo ?? 0;
		const perfects = data.perfects ?? 0;
		const goods = data.goods ?? 0;
		const misses = data.misses ?? 0;
		const total = perfects + goods + misses;

		const bg = this.add.graphics();
		bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
		bg.fillRect(0, 0, W, 720);

		let rank = "C";
		let rankColor = "#94a3b8";
		if (total > 0) {
			const accuracy = (perfects + goods * 0.5) / total;
			if (accuracy >= 0.95) { rank = "S"; rankColor = "#fbbf24"; }
			else if (accuracy >= 0.85) { rank = "A"; rankColor = "#22c55e"; }
			else if (accuracy >= 0.7) { rank = "B"; rankColor = "#06b6d4"; }
		}

		const sfx = new SoundManager();
		sfx.playResultJingle(rank === "S" || rank === "A");
		this.events.on("shutdown", () => sfx.dispose());

		this.add
			.text(W / 2, 120, "${g.rhythm.results}", {
				fontSize: "36px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(W / 2, 200, rank, {
				fontSize: "80px",
				color: rankColor,
				fontFamily: "Arial",
				fontStyle: "bold",
			})
			.setOrigin(0.5);

		this.add
			.text(W / 2, 290, "${g.common.finalScore}: " + score, {
				fontSize: "28px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(W / 2, 340, "${g.rhythm.maxCombo}: " + maxCombo, {
				fontSize: "20px",
				color: "#f472b6",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const statsY = 400;
		const stats = [
			{ label: "${g.rhythm.perfect}", value: perfects, color: "#22c55e" },
			{ label: "${g.rhythm.good}", value: goods, color: "#fbbf24" },
			{ label: "MISS", value: misses, color: "#ef4444" },
		];

		stats.forEach((s, i) => {
			this.add
				.text(W / 2 - 60, statsY + i * 36, s.label, {
					fontSize: "20px",
					color: s.color,
					fontFamily: "Arial",
				})
				.setOrigin(1, 0.5);

			this.add
				.text(W / 2 + 60, statsY + i * 36, "" + s.value, {
					fontSize: "20px",
					color: "#ffffff",
					fontFamily: "Arial",
				})
				.setOrigin(0, 0.5);
		});

		const retryBtn = this.add
			.text(W / 2, 560, "${g.rhythm.retry}", {
				fontSize: "24px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add
			.text(W / 2, 620, "${g.common.backToMenu}", {
				fontSize: "20px",
				color: "#94a3b8",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

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
	width: 480,
	height: 720,
	fps: 60,
	gravity: 0,
	debug: false,
};

export const COLORS = {
	bg: 0x0a0a1a,
	bgDark: 0x1a0a2e,
	primary: 0x06b6d4,
	success: 0x22c55e,
	warning: 0xfbbf24,
	error: 0xef4444,
	pink: 0xf472b6,
	purple: 0xa855f7,
	text: 0xffffff,
	muted: 0x94a3b8,
};

export const LANE_COUNT = 3;
export const LANE_WIDTH = 70;
export const LANE_COLORS = [0x06b6d4, 0xa855f7, 0xf97316];
export const LANE_KEYS = ["A", "S", "D"];

export const NOTE_SPEED = 350;
export const SPAWN_Y = -20;
export const HIT_Y = 600;

export const PERFECT_RANGE = 30;
export const GOOD_RANGE = 60;

export const BPM = 120;

export const BEAT_PATTERN: number[] = [
	0, -1, 1, -1, 2, -1, 1, -1,
	0, 0, 1, 1, 2, 2, 1, -1,
	2, -1, 0, -1, 1, -1, 2, -1,
	0, 1, 2, 1, 0, -1, -1, -1,

	0, -1, 2, -1, 1, -1, 0, -1,
	2, 2, 1, -1, 0, 0, 2, -1,
	1, -1, 0, -1, 2, -1, 1, -1,
	0, 1, 2, -1, 0, 2, 1, -1,

	0, 1, 2, 1, 0, 1, 2, 1,
	2, -1, 1, -1, 0, -1, -1, -1,
	0, 2, 1, 0, 2, 1, 0, 2,
	1, -1, 0, -1, 2, -1, -1, -1,
];
`,
		},
	];
}
