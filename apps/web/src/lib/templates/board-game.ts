import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function boardGameTemplate(meta: ProjectMeta): TemplateFile[] {
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
	height: 800,
	backgroundColor: "#0f172a",
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
	private master!: GainNode;

	private ensure(): AudioContext {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.35;
			this.master.connect(this.ctx.destination);
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
		return this.ctx;
	}

	playDice() {
		const c = this.ensure(), t = c.currentTime;
		for (let i = 0; i < 3; i++) {
			const o = c.createOscillator(), g = c.createGain();
			o.type = "triangle";
			o.frequency.value = 600 + i * 200;
			const off = i * 0.07;
			g.gain.setValueAtTime(0.2, t + off);
			g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.08);
			o.connect(g); g.connect(this.master);
			o.start(t + off); o.stop(t + off + 0.1);
		}
	}

	playMove() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), g = c.createGain();
		o.type = "sine";
		o.frequency.setValueAtTime(400, t);
		o.frequency.exponentialRampToValueAtTime(600, t + 0.1);
		g.gain.setValueAtTime(0.2, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
		o.connect(g); g.connect(this.master);
		o.start(t); o.stop(t + 0.18);
	}

	playSpecial() {
		const c = this.ensure(), t = c.currentTime;
		[523, 659, 784].forEach((f, i) => {
			const o = c.createOscillator(), g = c.createGain();
			o.type = "sine"; o.frequency.value = f;
			const off = i * 0.1;
			g.gain.setValueAtTime(0.18, t + off);
			g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.2);
			o.connect(g); g.connect(this.master);
			o.start(t + off); o.stop(t + off + 0.25);
		});
	}

	playSkip() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), g = c.createGain();
		o.type = "sawtooth";
		o.frequency.setValueAtTime(300, t);
		o.frequency.exponentialRampToValueAtTime(100, t + 0.2);
		g.gain.setValueAtTime(0.1, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
		o.connect(g); g.connect(this.master);
		o.start(t); o.stop(t + 0.3);
	}

	playWin() {
		const c = this.ensure(), t = c.currentTime;
		[523, 659, 784, 1047].forEach((f, i) => {
			const o = c.createOscillator(), g = c.createGain();
			o.type = "sine"; o.frequency.value = f;
			const off = i * 0.15;
			g.gain.setValueAtTime(0.25, t + off);
			g.gain.exponentialRampToValueAtTime(0.01, t + off + 0.35);
			o.connect(g); g.connect(this.master);
			o.start(t + off); o.stop(t + off + 0.4);
		});
	}

	playLose() {
		const c = this.ensure(), t = c.currentTime;
		[392, 349, 311, 262].forEach((f, i) => {
			const o = c.createOscillator(), g = c.createGain();
			o.type = "triangle"; o.frequency.value = f;
			const off = i * 0.18;
			g.gain.setValueAtTime(0.2, t + off);
			g.gain.exponentialRampToValueAtTime(0.01, t + off + 0.35);
			o.connect(g); g.connect(this.master);
			o.start(t + off); o.stop(t + off + 0.4);
		});
	}

	playClick() {
		const c = this.ensure(), t = c.currentTime;
		const o = c.createOscillator(), g = c.createGain();
		o.type = "sine"; o.frequency.value = 800;
		g.gain.setValueAtTime(0.15, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
		o.connect(g); g.connect(this.master);
		o.start(t); o.stop(t + 0.08);
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
	width: 800,
	height: 800,
	fps: 60,
	gravity: 0,
	debug: false,
};

export const BOARD_COLS = 6;
export const BOARD_ROWS = 5;
export const CELL_SIZE = 90;
export const BOARD_OFFSET_X = 130;
export const BOARD_OFFSET_Y = 130;

export const CELL_COLORS = [0x1e293b, 0x1e3a5f];
export const PLAYER_COLOR = 0x06b6d4;
export const ALIEN_COLOR = 0xef4444;
export const HIGHLIGHT_COLOR = 0xfbbf24;

export interface GridCell {
	x: number;
	y: number;
}

export interface SpecialGrid {
	index: number;
	effect: "FORWARD_1" | "FORWARD_2" | "BACK_1" | "SKIP";
	label: string;
}

export function buildGridPath(): GridCell[] {
	const path: GridCell[] = [];
	for (let row = 0; row < BOARD_ROWS; row++) {
		const leftToRight = row % 2 === 0;
		for (let col = 0; col < BOARD_COLS; col++) {
			const c = leftToRight ? col : BOARD_COLS - 1 - col;
			path.push({
				x: BOARD_OFFSET_X + c * CELL_SIZE + CELL_SIZE / 2,
				y: BOARD_OFFSET_Y + (BOARD_ROWS - 1 - row) * CELL_SIZE + CELL_SIZE / 2,
			});
		}
	}
	return path;
}

export const SPECIAL_GRIDS: SpecialGrid[] = [
	{ index: 4, effect: "FORWARD_2", label: "+2" },
	{ index: 9, effect: "BACK_1", label: "-1" },
	{ index: 13, effect: "SKIP", label: "⏸" },
	{ index: 14, effect: "SKIP", label: "⏸" },
	{ index: 18, effect: "SKIP", label: "⏸" },
	{ index: 20, effect: "SKIP", label: "⏸" },
	{ index: 23, effect: "FORWARD_1", label: "+1" },
	{ index: 27, effect: "BACK_1", label: "-1" },
];
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";
import {
	BOARD_COLS, BOARD_ROWS, CELL_SIZE, BOARD_OFFSET_X, BOARD_OFFSET_Y,
	CELL_COLORS, PLAYER_COLOR, ALIEN_COLOR, buildGridPath, SPECIAL_GRIDS,
} from "../config/game-config";

export class MenuScene extends Phaser.Scene {
	constructor() { super("MenuScene"); }

	create() {
		const W = 800, H = 800;

		const bg = this.add.graphics();
		bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1);
		bg.fillRect(0, 0, W, H);

		for (let i = 0; i < 40; i++) {
			const s = this.add.circle(
				Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
				Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.4)
			);
			this.tweens.add({
				targets: s, alpha: 0.05,
				duration: Phaser.Math.Between(1500, 3000), yoyo: true, repeat: -1,
			});
		}

		this.add.text(W / 2, 160, "${meta.name}", {
			fontSize: "48px", color: "#ffffff", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(W / 2, 225, "${g.boardGame.subtitle}", {
			fontSize: "22px", color: "#a3e635", fontFamily: "Arial",
		}).setOrigin(0.5);

		const previewG = this.add.graphics();
		const miniCell = 28;
		const px = W / 2 - (BOARD_COLS * miniCell) / 2;
		const py = 280;
		for (let r = 0; r < BOARD_ROWS; r++) {
			for (let c = 0; c < BOARD_COLS; c++) {
				const ci = (r + c) % 2;
				previewG.fillStyle(CELL_COLORS[ci], 0.6);
				previewG.fillRoundedRect(px + c * miniCell, py + r * miniCell, miniCell - 2, miniCell - 2, 3);
			}
		}

		this.add.circle(px + miniCell / 2, py + (BOARD_ROWS - 1) * miniCell + miniCell / 2, 6, PLAYER_COLOR, 1);
		this.add.circle(px + (BOARD_COLS - 1) * miniCell + miniCell / 2, py + miniCell / 2, 6, ALIEN_COLOR, 1);

		const desc = this.add.text(W / 2, 450, "${g.boardGame.desc.replace(/\n/g, '\\n')}", {
			fontSize: "15px", color: "#94a3b8", fontFamily: "Arial",
			align: "center", wordWrap: { width: 400 },
		}).setOrigin(0.5);

		const startBtn = this.add.text(W / 2, 550, "${g.boardGame.startGame}", {
			fontSize: "28px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });

		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add.text(W / 2, 630, "${g.boardGame.moveHint}", {
			fontSize: "14px", color: "#64748b", fontFamily: "Arial", align: "center",
		}).setOrigin(0.5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";
import {
	BOARD_COLS, BOARD_ROWS, CELL_SIZE, BOARD_OFFSET_X, BOARD_OFFSET_Y,
	CELL_COLORS, PLAYER_COLOR, ALIEN_COLOR, HIGHLIGHT_COLOR,
	buildGridPath, SPECIAL_GRIDS, GridCell, SpecialGrid,
} from "../config/game-config";
import { Sfx } from "../audio/sfx";

export class GameScene extends Phaser.Scene {
	private path: GridCell[] = [];
	private playerPos = 0;
	private alienPos = 29;
	private playerTurn = true;
	private turnReady = false;
	private playerSkip = false;
	private alienSkip = false;
	private gameOver = false;
	private animating = false;

	private playerToken!: Phaser.GameObjects.Graphics;
	private alienToken!: Phaser.GameObjects.Graphics;
	private turnText!: Phaser.GameObjects.Text;
	private diceText!: Phaser.GameObjects.Text;
	private infoText!: Phaser.GameObjects.Text;
	private rollBtn!: Phaser.GameObjects.Text;
	private statusText!: Phaser.GameObjects.Text;
	private cellGraphics: Phaser.GameObjects.Graphics[] = [];
	private highlightGraphic!: Phaser.GameObjects.Graphics;
	private sfx!: Sfx;

	constructor() { super("GameScene"); }

	create() {
		this.playerPos = 0;
		this.alienPos = 29;
		this.playerTurn = true;
		this.turnReady = false;
		this.playerSkip = false;
		this.alienSkip = false;
		this.gameOver = false;
		this.animating = false;

		this.sfx = new Sfx();
		this.path = buildGridPath();

		const W = 800, H = 800;

		const bg = this.add.graphics();
		bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1);
		bg.fillRect(0, 0, W, H);

		this.drawBoard();
		this.drawSpecialMarkers();

		this.highlightGraphic = this.add.graphics().setDepth(5);

		this.playerToken = this.add.graphics().setDepth(10);
		this.alienToken = this.add.graphics().setDepth(10);
		this.drawToken(this.playerToken, PLAYER_COLOR, "🧑");
		this.drawToken(this.alienToken, ALIEN_COLOR, "👾");
		this.updateTokenPositions();

		const panelY = 700;
		this.add.graphics().fillStyle(0x0f172a, 0.85).fillRoundedRect(20, panelY - 15, W - 40, 100, 12).setDepth(50);

		this.turnText = this.add.text(50, panelY + 5, "", {
			fontSize: "18px", color: "#94a3b8", fontFamily: "Arial",
		}).setDepth(51);

		this.diceText = this.add.text(50, panelY + 35, "", {
			fontSize: "22px", color: "#fbbf24", fontFamily: "Arial", fontStyle: "bold",
		}).setDepth(51);

		this.rollBtn = this.add.text(W / 2, panelY + 25, "${g.boardGame.rollDice}", {
			fontSize: "26px", color: "#06b6d4", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(51);

		this.rollBtn.on("pointerdown", () => this.onRoll());
		this.rollBtn.on("pointerover", () => { if (!this.animating) this.rollBtn.setColor("#22c55e"); });
		this.rollBtn.on("pointerout", () => this.rollBtn.setColor("#06b6d4"));

		this.infoText = this.add.text(W / 2, BOARD_OFFSET_Y - 40, "", {
			fontSize: "18px", color: "#fbbf24", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5).setDepth(51).setAlpha(0);

		this.statusText = this.add.text(W - 50, panelY + 25, "", {
			fontSize: "16px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(1, 0.5).setDepth(51);

		this.events.on("shutdown", () => this.sfx.dispose());
		this.startTurn();
	}

	private drawBoard() {
		this.cellGraphics = [];
		for (let i = 0; i < this.path.length; i++) {
			const cell = this.path[i];
			const g = this.add.graphics();
			const ci = i % 2;
			g.fillStyle(CELL_COLORS[ci], 0.7);
			g.fillRoundedRect(cell.x - CELL_SIZE / 2 + 2, cell.y - CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
			g.lineStyle(1, 0x334155, 0.5);
			g.strokeRoundedRect(cell.x - CELL_SIZE / 2 + 2, cell.y - CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
			this.cellGraphics.push(g);

			this.add.text(cell.x, cell.y - CELL_SIZE / 2 + 14, "" + i, {
				fontSize: "11px", color: "#475569", fontFamily: "Arial",
			}).setOrigin(0.5);
		}

		const arrowG = this.add.graphics().setDepth(1);
		arrowG.lineStyle(1.5, 0x334155, 0.4);
		for (let i = 0; i < this.path.length - 1; i++) {
			const a = this.path[i], b = this.path[i + 1];
			arrowG.lineBetween(a.x, a.y, b.x, b.y);
		}

		this.add.text(this.path[0].x, this.path[0].y + CELL_SIZE / 2 + 10, "START", {
			fontSize: "11px", color: "#22c55e", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5);

		this.add.text(this.path[29].x, this.path[29].y - CELL_SIZE / 2 - 10, "GOAL", {
			fontSize: "11px", color: "#ef4444", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5);
	}

	private drawSpecialMarkers() {
		for (const sp of SPECIAL_GRIDS) {
			const cell = this.path[sp.index];
			let color = 0xfbbf24;
			if (sp.effect === "SKIP") color = 0xf97316;
			else if (sp.effect === "BACK_1") color = 0xef4444;
			else color = 0x22c55e;

			const g = this.add.graphics().setDepth(2);
			g.fillStyle(color, 0.15);
			g.fillRoundedRect(cell.x - CELL_SIZE / 2 + 2, cell.y - CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);
			g.lineStyle(2, color, 0.5);
			g.strokeRoundedRect(cell.x - CELL_SIZE / 2 + 2, cell.y - CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8);

			this.add.text(cell.x, cell.y + 18, sp.label, {
				fontSize: "18px", color: "#" + color.toString(16).padStart(6, "0"),
				fontFamily: "Arial", fontStyle: "bold",
			}).setOrigin(0.5).setDepth(3);
		}
	}

	private drawToken(g: Phaser.GameObjects.Graphics, color: number, _emoji: string) {
		g.clear();
		g.fillStyle(color, 1);
		g.fillCircle(0, 0, 18);
		g.lineStyle(2, 0xffffff, 0.6);
		g.strokeCircle(0, 0, 18);
		g.fillStyle(0xffffff, 0.3);
		g.fillCircle(-5, -5, 5);
	}

	private updateTokenPositions() {
		const pp = this.path[this.playerPos];
		const ap = this.path[this.alienPos];
		const same = this.playerPos === this.alienPos;
		this.playerToken.setPosition(pp.x + (same ? -14 : 0), pp.y);
		this.alienToken.setPosition(ap.x + (same ? 14 : 0), ap.y);
	}

	private highlightCell(idx: number) {
		this.highlightGraphic.clear();
		const cell = this.path[idx];
		this.highlightGraphic.lineStyle(3, HIGHLIGHT_COLOR, 0.9);
		this.highlightGraphic.strokeRoundedRect(
			cell.x - CELL_SIZE / 2, cell.y - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE, 10
		);
	}

	private startTurn() {
		if (this.gameOver) return;

		if (this.playerTurn && this.playerSkip) {
			this.playerSkip = false;
			this.showInfo("${g.boardGame.skipTurn}");
			this.sfx.playSkip();
			this.time.delayedCall(1000, () => { this.playerTurn = false; this.startTurn(); });
			return;
		}
		if (!this.playerTurn && this.alienSkip) {
			this.alienSkip = false;
			this.showInfo("${g.boardGame.alienSkip}");
			this.sfx.playSkip();
			this.time.delayedCall(1000, () => { this.playerTurn = true; this.startTurn(); });
			return;
		}

		this.turnReady = true;
		this.animating = false;
		this.diceText.setText("");
		this.highlightCell(this.playerTurn ? this.playerPos : this.alienPos);

		if (this.playerTurn) {
			this.turnText.setText("${g.boardGame.yourTurn}");
			this.rollBtn.setVisible(true).setAlpha(1);
			this.statusText.setText("🧑 " + this.playerPos + " / 29");
		} else {
			this.turnText.setText("${g.boardGame.alienTurn}");
			this.rollBtn.setVisible(false);
			this.statusText.setText("👾 " + (29 - this.alienPos));
			this.time.delayedCall(800, () => this.alienRoll());
		}
	}

	private onRoll() {
		if (!this.turnReady || this.animating || !this.playerTurn || this.gameOver) return;
		this.turnReady = false;
		this.sfx.playClick();
		const dice = this.rollDice();
		this.diceText.setText("🎲 " + dice);
		this.sfx.playDice();
		this.rollBtn.setAlpha(0.3);
		this.moveToken("player", dice);
	}

	private alienRoll() {
		if (this.gameOver) return;
		const dice = this.rollDice();
		this.diceText.setText("🎲 " + dice);
		this.sfx.playDice();
		this.moveToken("alien", dice);
	}

	private rollDice(): number {
		return Phaser.Math.Between(1, 6);
	}

	private moveToken(who: string, steps: number) {
		this.animating = true;
		const isPlayer = who === "player";
		const token = isPlayer ? this.playerToken : this.alienToken;
		const startPos = isPlayer ? this.playerPos : this.alienPos;
		const dir = isPlayer ? 1 : -1;

		let newPos = startPos + steps * dir;
		newPos = Phaser.Math.Clamp(newPos, 0, 29);

		const waypoints: { x: number; y: number }[] = [];
		const from = startPos;
		const to = newPos;
		const step = from < to ? 1 : -1;
		for (let i = from + step; step > 0 ? i <= to : i >= to; i += step) {
			const same = (isPlayer && i === this.alienPos) || (!isPlayer && i === this.playerPos);
			waypoints.push({
				x: this.path[i].x + (same ? (isPlayer ? -14 : 14) : 0),
				y: this.path[i].y,
			});
		}

		if (waypoints.length === 0) {
			this.animating = false;
			this.afterMove(who);
			return;
		}

		if (isPlayer) this.playerPos = newPos;
		else this.alienPos = newPos;

		this.sfx.playMove();

		this.tweens.chain({
			targets: token,
			tweens: waypoints.map(wp => ({
				x: wp.x, y: wp.y,
				duration: 180,
				ease: "Power1",
			})),
			onComplete: () => {
				this.updateTokenPositions();
				this.afterMove(who);
			},
		});
	}

	private afterMove(who: string) {
		const isPlayer = who === "player";
		const pos = isPlayer ? this.playerPos : this.alienPos;

		if ((isPlayer && pos >= 29) || (!isPlayer && pos <= 0)) {
			this.gameOver = true;
			this.animating = false;
			this.time.delayedCall(500, () => {
				this.scene.start("GameOverScene", { winner: isPlayer ? "player" : "alien" });
			});
			return;
		}

		const sp = SPECIAL_GRIDS.find((s) => s.index === pos);
		if (sp) {
			this.highlightCell(pos);
			this.time.delayedCall(400, () => this.applySpecial(who, sp));
			return;
		}

		this.animating = false;
		this.playerTurn = !this.playerTurn;
		this.time.delayedCall(500, () => this.startTurn());
	}

	private applySpecial(who: string, sp: SpecialGrid) {
		const isPlayer = who === "player";

		switch (sp.effect) {
			case "FORWARD_1":
				this.showInfo(isPlayer ? "${g.boardGame.forward}" : "${g.boardGame.alienForward}");
				this.sfx.playSpecial();
				this.time.delayedCall(600, () => this.moveToken(who, 1));
				return;
			case "FORWARD_2":
				this.showInfo(isPlayer ? "${g.boardGame.forward2}" : "${g.boardGame.alienForward2}");
				this.sfx.playSpecial();
				this.time.delayedCall(600, () => this.moveToken(who, 2));
				return;
			case "BACK_1": {
				this.showInfo(isPlayer ? "${g.boardGame.back}" : "${g.boardGame.alienBack}");
				this.sfx.playSkip();
				const dir = isPlayer ? -1 : 1;
				const token = isPlayer ? this.playerToken : this.alienToken;
				const curPos = isPlayer ? this.playerPos : this.alienPos;
				let np = curPos + dir;
				np = Phaser.Math.Clamp(np, 0, 29);
				if (isPlayer) this.playerPos = np; else this.alienPos = np;
				this.time.delayedCall(600, () => {
					this.tweens.add({
						targets: token,
						x: this.path[np].x, y: this.path[np].y,
						duration: 200, ease: "Power1",
						onComplete: () => {
							this.updateTokenPositions();
							this.animating = false;
							this.playerTurn = !this.playerTurn;
							this.time.delayedCall(400, () => this.startTurn());
						},
					});
				});
				return;
			}
			case "SKIP":
				if (isPlayer) {
					this.showInfo("${g.boardGame.youSkipped}");
					this.playerSkip = true;
				} else {
					this.showInfo("${g.boardGame.alienSkipped}");
					this.alienSkip = true;
				}
				this.sfx.playSkip();
				this.animating = false;
				this.playerTurn = !this.playerTurn;
				this.time.delayedCall(800, () => this.startTurn());
				return;
		}
	}

	private showInfo(text: string) {
		this.infoText.setText(text).setAlpha(1);
		this.tweens.killTweensOf(this.infoText);
		this.tweens.add({
			targets: this.infoText, alpha: 0, duration: 600, delay: 1200,
		});
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
		const W = 800, H = 800;
		const playerWon = data.winner === "player";

		const bg = this.add.graphics();
		bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1);
		bg.fillRect(0, 0, W, H);

		const sfx = new Sfx();
		if (playerWon) sfx.playWin(); else sfx.playLose();
		this.events.on("shutdown", () => sfx.dispose());

		const icon = playerWon ? "🎉" : "👾";
		this.add.text(W / 2, 250, icon, {
			fontSize: "100px", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(W / 2, 370, playerWon ? "${g.boardGame.youWin}" : "${g.boardGame.alienWins}", {
			fontSize: "44px", color: playerWon ? "#22c55e" : "#ef4444", fontFamily: "Arial", fontStyle: "bold",
		}).setOrigin(0.5);

		const retryBtn = this.add.text(W / 2, 500, "${g.boardGame.retry}", {
			fontSize: "26px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });

		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add.text(W / 2, 560, "${g.common.backToMenu}", {
			fontSize: "20px", color: "#94a3b8", fontFamily: "Arial",
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
