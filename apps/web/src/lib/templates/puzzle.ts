import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function puzzleTemplate(meta: ProjectMeta): TemplateFile[] {
	const g = getMessages().gameText;
	return [
		{
			path: "src/main.ts",
			content: `import Phaser from "phaser";
import { MenuScene } from "./scenes/menu-scene";
import { GameScene } from "./scenes/game-scene";

const config = {
	type: Phaser.AUTO,
	width: 500,
	height: 600,
	backgroundColor: "#1e1b4b",
	scene: [MenuScene, GameScene],
};

new Phaser.Game(config);
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	create() {
		this.add
			.text(250, 140, "${meta.name}", {
				fontSize: "44px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(250, 220, "${g.puzzle.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const preview = this.add.graphics();
		const colors = [0x6366f1, 0x8b5cf6, 0xa78bfa, 0xc4b5fd];
		const nums = [2, 4, 8, 16];
		for (let i = 0; i < 4; i++) {
			const x = 130 + i * 65;
			preview.fillStyle(colors[i], 1);
			preview.fillRoundedRect(x, 280, 55, 55, 8);
			this.add.text(x + 27, 307, nums[i].toString(), { fontSize: "22px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
		}

		const startBtn = this.add
			.text(250, 400, "${g.puzzle.startChallenge}", {
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
			.text(250, 480, "${g.puzzle.moveHint}", {
				fontSize: "15px",
				color: "#94a3b8",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";

const GRID = 4;
const TILE = 100;
const GAP = 12;
const BOARD_X = 18;
const BOARD_Y = 130;
const TWEEN_MS = 100;
const STORAGE_KEY = "rimecraft_2048_best";

const TILE_COLORS: Record<number, number> = {
	2: 0x6366f1, 4: 0x8b5cf6, 8: 0xa78bfa, 16: 0xc4b5fd,
	32: 0xf472b6, 64: 0xec4899, 128: 0xfbbf24, 256: 0xf59e0b,
	512: 0xf97316, 1024: 0xef4444, 2048: 0x22c55e,
};

export class GameScene extends Phaser.Scene {
	private grid: number[][] = [];
	private tileSprites: (Phaser.GameObjects.Container | null)[][] = [];
	private score = 0;
	private bestScore = 0;
	private scoreText!: Phaser.GameObjects.Text;
	private bestText!: Phaser.GameObjects.Text;
	private canMove = true;
	private movingCount = 0;
	private hasWon = false;
	private prevGrid: number[][] = [];
	private prevScore = 0;

	constructor() {
		super("GameScene");
	}

	create() {
		this.score = 0;
		this.bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
		this.canMove = true;
		this.movingCount = 0;
		this.hasWon = false;
		this.prevGrid = [];
		this.prevScore = 0;

		this.grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
		this.tileSprites = Array.from({ length: GRID }, () => Array(GRID).fill(null));

		this.add.text(20, 20, "${meta.name}", { fontSize: "28px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold" });

		this.scoreText = this.add.text(20, 65, "${g.common.score}: 0", { fontSize: "20px", color: "#fbbf24", fontFamily: "Arial" });
		this.bestText = this.add.text(480, 65, "${g.puzzle.bestScore}: " + this.bestScore, { fontSize: "20px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(1, 0);

		const boardBg = this.add.graphics();
		boardBg.fillStyle(0x1e293b, 1);
		boardBg.fillRoundedRect(BOARD_X - GAP, BOARD_Y - GAP, GRID * TILE + (GRID + 1) * GAP, GRID * TILE + (GRID + 1) * GAP, 12);

		for (let r = 0; r < GRID; r++) {
			for (let c = 0; c < GRID; c++) {
				const { x, y } = this.tilePos(r, c);
				const g = this.add.graphics();
				g.fillStyle(0x334155, 1);
				g.fillRoundedRect(x, y, TILE, TILE, 8);
			}
		}

		this.addRandomTile();
		this.addRandomTile();

		this.input.keyboard!.on("keydown-LEFT", () => this.handleMove(0, -1));
		this.input.keyboard!.on("keydown-RIGHT", () => this.handleMove(0, 1));
		this.input.keyboard!.on("keydown-UP", () => this.handleMove(-1, 0));
		this.input.keyboard!.on("keydown-DOWN", () => this.handleMove(1, 0));
		this.input.keyboard!.on("keydown-A", () => this.handleMove(0, -1));
		this.input.keyboard!.on("keydown-D", () => this.handleMove(0, 1));
		this.input.keyboard!.on("keydown-W", () => this.handleMove(-1, 0));
		this.input.keyboard!.on("keydown-S", () => this.handleMove(1, 0));
		this.input.keyboard!.on("keydown-Z", () => this.undo());

		this.input.on("pointerup", (e: Phaser.Input.Pointer) => {
			const dx = e.upX - e.downX;
			const dy = e.upY - e.downY;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < 30) return;
			if (Math.abs(dx) > Math.abs(dy)) {
				this.handleMove(0, dx > 0 ? 1 : -1);
			} else {
				this.handleMove(dy > 0 ? 1 : -1, 0);
			}
		});

		const restartBtn = this.add.text(480, 20, "\\u21BB", { fontSize: "28px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
		restartBtn.on("pointerdown", () => this.scene.restart());

		const undoBtn = this.add.text(440, 20, "\\u21A9", { fontSize: "28px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
		undoBtn.on("pointerdown", () => this.undo());
	}

	private tilePos(r: number, c: number) {
		return {
			x: BOARD_X + c * (TILE + GAP),
			y: BOARD_Y + r * (TILE + GAP),
		};
	}

	private createTileSprite(r: number, c: number, value: number): Phaser.GameObjects.Container {
		const { x, y } = this.tilePos(r, c);
		const color = TILE_COLORS[value] || 0x22c55e;
		const bg = this.add.graphics();
		bg.fillStyle(color, 1);
		bg.fillRoundedRect(-TILE / 2, -TILE / 2, TILE, TILE, 8);

		const fontSize = value >= 1024 ? "24px" : value >= 128 ? "28px" : "34px";
		const txt = this.add.text(0, 0, value.toString(), { fontSize, color: "#ffffff", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);

		const container = this.add.container(x + TILE / 2, y + TILE / 2, [bg, txt]);
		container.setDepth(10);
		return container;
	}

	private addRandomTile() {
		const empty: { r: number; c: number }[] = [];
		for (let r = 0; r < GRID; r++) {
			for (let c = 0; c < GRID; c++) {
				if (this.grid[r][c] === 0) empty.push({ r, c });
			}
		}
		if (empty.length === 0) return;

		const cell = Phaser.Utils.Array.GetRandom(empty);
		const value = Math.random() < 0.9 ? 2 : 4;
		this.grid[cell.r][cell.c] = value;

		const sprite = this.createTileSprite(cell.r, cell.c, value);
		sprite.setScale(0);
		this.tweens.add({ targets: sprite, scale: 1, duration: TWEEN_MS, ease: "Back.easeOut" });
		this.tileSprites[cell.r][cell.c] = sprite;
	}

	private handleMove(dr: number, dc: number) {
		if (!this.canMove) return;

		this.prevGrid = this.grid.map(row => [...row]);
		this.prevScore = this.score;

		let moved = false;
		let moveScore = 0;
		this.canMove = false;
		this.movingCount = 0;

		const merged: boolean[][] = Array.from({ length: GRID }, () => Array(GRID).fill(false));

		const processCell = (r: number, c: number) => {
			if (this.grid[r][c] === 0) return;

			let nr = r + dr;
			let nc = c + dc;

			while (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && this.grid[nr][nc] === 0) {
				nr += dr;
				nc += dc;
			}

			if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && this.grid[nr][nc] === this.grid[r][c] && !merged[nr][nc]) {
				const newVal = this.grid[r][c] * 2;
				moveScore += newVal;
				this.grid[nr][nc] = newVal;
				this.grid[r][c] = 0;
				merged[nr][nc] = true;
				this.animateMove(r, c, nr, nc, true, newVal);
				moved = true;
			} else {
				nr -= dr;
				nc -= dc;
				if (nr !== r || nc !== c) {
					this.grid[nr][nc] = this.grid[r][c];
					this.grid[r][c] = 0;
					this.animateMove(r, c, nr, nc, false, 0);
					moved = true;
				}
			}
		};

		if (dr === 1) {
			for (let r = GRID - 2; r >= 0; r--) for (let c = 0; c < GRID; c++) processCell(r, c);
		} else if (dr === -1) {
			for (let r = 1; r < GRID; r++) for (let c = 0; c < GRID; c++) processCell(r, c);
		} else if (dc === 1) {
			for (let c = GRID - 2; c >= 0; c--) for (let r = 0; r < GRID; r++) processCell(r, c);
		} else if (dc === -1) {
			for (let c = 1; c < GRID; c++) for (let r = 0; r < GRID; r++) processCell(r, c);
		}

		if (!moved) {
			this.canMove = true;
			return;
		}

		this.score += moveScore;
		if (this.score > this.bestScore) {
			this.bestScore = this.score;
			localStorage.setItem(STORAGE_KEY, this.bestScore.toString());
			this.bestText.setText("${g.puzzle.bestScore}: " + this.bestScore + " ${g.puzzle.newBest}");
		}
		this.scoreText.setText("${g.common.score}: " + this.score);

		if (this.movingCount === 0) {
			this.finishMove();
		}
	}

	private animateMove(fromR: number, fromC: number, toR: number, toC: number, isMerge: boolean, newVal: number) {
		const sprite = this.tileSprites[fromR][fromC];
		if (!sprite) return;
		this.tileSprites[fromR][fromC] = null;

		const { x, y } = this.tilePos(toR, toC);
		this.movingCount++;

		this.tweens.add({
			targets: sprite,
			x: x + TILE / 2,
			y: y + TILE / 2,
			duration: TWEEN_MS,
			onComplete: () => {
				if (isMerge) {
					sprite.destroy();
					const existing = this.tileSprites[toR][toC];
					if (existing) existing.destroy();
					const merged = this.createTileSprite(toR, toC, newVal);
					this.tileSprites[toR][toC] = merged;
					this.tweens.add({ targets: merged, scale: 1.15, duration: 60, yoyo: true });
				} else {
					this.tileSprites[toR][toC] = sprite;
				}
				this.movingCount--;
				if (this.movingCount === 0) {
					this.finishMove();
				}
			},
		});
	}

	private finishMove() {
		this.addRandomTile();

		if (!this.hasWon) {
			for (let r = 0; r < GRID; r++) {
				for (let c = 0; c < GRID; c++) {
					if (this.grid[r][c] === 2048) {
						this.hasWon = true;
						this.showWin();
						return;
					}
				}
			}
		}

		if (!this.hasValidMoves()) {
			this.time.delayedCall(300, () => this.showGameOver());
		} else {
			this.canMove = true;
		}
	}

	private hasValidMoves(): boolean {
		for (let r = 0; r < GRID; r++) {
			for (let c = 0; c < GRID; c++) {
				if (this.grid[r][c] === 0) return true;
				const val = this.grid[r][c];
				if (r < GRID - 1 && this.grid[r + 1][c] === val) return true;
				if (c < GRID - 1 && this.grid[r][c + 1] === val) return true;
			}
		}
		return false;
	}

	private undo() {
		if (this.prevGrid.length === 0 || !this.canMove) return;
		this.grid = this.prevGrid.map(row => [...row]);
		this.score = this.prevScore;
		this.scoreText.setText("${g.common.score}: " + this.score);
		this.prevGrid = [];

		for (let r = 0; r < GRID; r++) {
			for (let c = 0; c < GRID; c++) {
				if (this.tileSprites[r][c]) { this.tileSprites[r][c]!.destroy(); this.tileSprites[r][c] = null; }
				if (this.grid[r][c] > 0) {
					this.tileSprites[r][c] = this.createTileSprite(r, c, this.grid[r][c]);
				}
			}
		}
	}

	private showWin() {
		this.canMove = false;
		const overlay = this.add.rectangle(250, 350, 500, 600, 0x000000, 0.6).setDepth(50);
		this.add.text(250, 250, "\\u{1F389} 2048!", { fontSize: "52px", color: "#22c55e", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5).setDepth(51);
		this.add.text(250, 310, "${g.common.score}: " + this.score, { fontSize: "24px", color: "#fbbf24", fontFamily: "Arial" }).setOrigin(0.5).setDepth(51);

		for (let i = 0; i < 20; i++) {
			const x = Phaser.Math.Between(30, 470);
			const y = Phaser.Math.Between(100, 550);
			const colors = [0xfbbf24, 0x22c55e, 0x06b6d4, 0xa78bfa];
			const dot = this.add.circle(x, y, Phaser.Math.Between(3, 6), Phaser.Utils.Array.GetRandom(colors)).setDepth(52);
			this.tweens.add({ targets: dot, y: y - 60, alpha: 0, duration: 1200, delay: i * 80, repeat: -1, repeatDelay: 500 });
		}

		const continueBtn = this.add.text(250, 380, "\\u25B6 Continue", { fontSize: "22px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(51);
		continueBtn.on("pointerdown", () => { overlay.destroy(); continueBtn.destroy(); this.canMove = true; });

		const menuBtn = this.add.text(250, 430, "${g.common.backToMenu}", { fontSize: "18px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(51);
		menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
	}

	private showGameOver() {
		const overlay = this.add.rectangle(250, 350, 500, 600, 0x000000, 0.7).setDepth(50);
		this.add.text(250, 260, "${g.common.gameOver}", { fontSize: "44px", color: "#ef4444", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5).setDepth(51);
		this.add.text(250, 320, "${g.common.finalScore}: " + this.score, { fontSize: "24px", color: "#fbbf24", fontFamily: "Arial" }).setOrigin(0.5).setDepth(51);

		const retryBtn = this.add.text(250, 400, "${g.common.restart}", { fontSize: "24px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(51);
		retryBtn.on("pointerdown", () => this.scene.restart());

		const menuBtn = this.add.text(250, 450, "${g.common.backToMenu}", { fontSize: "18px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(51);
		menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
	}
}
`,
		},
		{
			path: "src/config/game-config.ts",
			content: `export const GAME_CONFIG = {
	title: "${meta.name}",
	width: 500,
	height: 600,
	fps: 60,
	gravity: 0,
	debug: false,
};
`,
		},
	];
}
