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
	width: 800,
	height: 600,
	backgroundColor: "#1e1b4b",
	physics: {
		default: "arcade",
		arcade: {
			gravity: { x: 0, y: 0 },
			debug: false,
		},
	},
	scene: [MenuScene, GameScene],
};

new Phaser.Game(config);
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";

function makeTexture(scene, key, color, w, h) {
	const g = scene.add.graphics();
	g.fillStyle(color, 1);
	g.fillRect(0, 0, w, h);
	g.generateTexture(key, w, h);
	g.destroy();
}

export class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	create() {
		makeTexture(this, "block", 0x06b6d4, 48, 48);
		makeTexture(this, "wall", 0x64748b, 48, 48);
		makeTexture(this, "target", 0x22c55e, 48, 48);
		makeTexture(this, "player", 0xfbbf24, 40, 40);
		makeTexture(this, "floor", 0x1e293b, 48, 48);

		this.add
			.text(400, 180, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 260, "${g.puzzle.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const startBtn = this.add
			.text(400, 400, "${g.puzzle.startChallenge}", {
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
			.text(400, 480, "${g.puzzle.moveHint}", {
				fontSize: "16px",
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

const TILE = 48;
const OFFSET_X = 160;
const OFFSET_Y = 84;

// 0=地面 1=墙壁 2=玩家 3=箱子 4=目标 5=箱子在目标上 6=玩家在目标上
const LEVELS = [
	[
		[1,1,1,1,1,1,1,1,1,1],
		[1,0,0,1,0,0,0,0,0,1],
		[1,0,3,0,0,0,4,0,0,1],
		[1,0,0,1,0,1,1,0,0,1],
		[1,1,0,1,4,0,1,0,0,1],
		[1,0,0,0,3,0,0,0,0,1],
		[1,0,0,0,0,1,0,0,0,1],
		[1,0,2,0,0,0,0,0,0,1],
		[1,1,1,1,1,1,1,1,1,1],
	],
];

export class GameScene extends Phaser.Scene {
	private grid = [];
	private playerPos = { r: 0, c: 0 };
	private tiles = new Map();
	private blocks = new Map();
	private playerSprite;
	private moves = 0;
	private movesText;
	private isMoving = false;
	private level = 0;

	constructor() {
		super("GameScene");
	}

	create() {
		this.moves = 0;
		this.level = 0;
		this.tiles.clear();
		this.blocks.clear();
		this.loadLevel(this.level);

		this.movesText = this.add
			.text(16, 16, "${g.puzzle.steps}: 0", {
				fontSize: "22px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setDepth(100);

		const resetBtn = this.add
			.text(784, 16, "${g.puzzle.reset}", {
				fontSize: "18px",
				color: "#94a3b8",
				fontFamily: "Arial",
			})
			.setOrigin(1, 0)
			.setInteractive({ useHandCursor: true })
			.setDepth(100);

		resetBtn.on("pointerdown", () => {
			this.moves = 0;
			this.loadLevel(this.level);
			this.movesText.setText("${g.puzzle.steps}: 0");
		});

		this.input.keyboard.on("keydown-LEFT", () => this.tryMove(0, -1));
		this.input.keyboard.on("keydown-RIGHT", () => this.tryMove(0, 1));
		this.input.keyboard.on("keydown-UP", () => this.tryMove(-1, 0));
		this.input.keyboard.on("keydown-DOWN", () => this.tryMove(1, 0));
	}

	private loadLevel(idx) {
		this.isMoving = false;

		this.tiles.forEach((s) => s.destroy());
		this.blocks.forEach((s) => s.destroy());
		this.tiles.clear();
		this.blocks.clear();
		if (this.playerSprite) this.playerSprite.destroy();

		const src = LEVELS[idx % LEVELS.length];
		this.grid = src.map((row) => [...row]);

		for (let r = 0; r < this.grid.length; r++) {
			for (let c = 0; c < this.grid[r].length; c++) {
				const x = OFFSET_X + c * TILE + TILE / 2;
				const y = OFFSET_Y + r * TILE + TILE / 2;
				const cell = this.grid[r][c];

				if (cell === 1) {
					this.tiles.set(r + "," + c, this.add.image(x, y, "wall"));
				} else {
					this.tiles.set(r + "," + c, this.add.image(x, y, "floor"));
				}

				if (cell === 4 || cell === 5 || cell === 6) {
					this.add.image(x, y, "target").setAlpha(0.5).setDepth(1);
				}
				if (cell === 3 || cell === 5) {
					this.blocks.set(r + "," + c, this.add.image(x, y, "block").setDepth(2));
				}
				if (cell === 2 || cell === 6) {
					this.playerPos = { r: r, c: c };
					this.playerSprite = this.add.image(x, y, "player").setDepth(3);
				}
			}
		}
	}

	private tryMove(dr, dc) {
		if (this.isMoving) return;

		const nr = this.playerPos.r + dr;
		const nc = this.playerPos.c + dc;

		if (!this.inBounds(nr, nc)) return;
		const next = this.grid[nr][nc];

		if (next === 1) return;

		if (next === 3 || next === 5) {
			const br = nr + dr;
			const bc = nc + dc;
			if (!this.inBounds(br, bc)) return;
			const behind = this.grid[br][bc];
			if (behind === 1 || behind === 3 || behind === 5) return;

			this.moveBlock(nr, nc, br, bc);
		}

		this.movePlayer(nr, nc);
		this.moves++;
		this.movesText.setText("${g.puzzle.steps}: " + this.moves);

		this.time.delayedCall(120, () => this.checkWin());
	}

	private movePlayer(nr, nc) {
		this.isMoving = true;
		const cur = this.grid[this.playerPos.r][this.playerPos.c];
		this.grid[this.playerPos.r][this.playerPos.c] = cur === 6 ? 4 : 0;

		const dest = this.grid[nr][nc];
		this.grid[nr][nc] = dest === 4 ? 6 : 2;
		this.playerPos = { r: nr, c: nc };

		const x = OFFSET_X + nc * TILE + TILE / 2;
		const y = OFFSET_Y + nr * TILE + TILE / 2;
		this.tweens.add({
			targets: this.playerSprite,
			x: x, y: y,
			duration: 100,
			onComplete: () => { this.isMoving = false; },
		});
	}

	private moveBlock(fr, fc, tr, tc) {
		const key = fr + "," + fc;
		const block = this.blocks.get(key);
		if (!block) return;

		const curCell = this.grid[fr][fc];
		this.grid[fr][fc] = curCell === 5 ? 4 : 0;

		const destCell = this.grid[tr][tc];
		this.grid[tr][tc] = destCell === 4 ? 5 : 3;

		this.blocks.delete(key);
		this.blocks.set(tr + "," + tc, block);

		const x = OFFSET_X + tc * TILE + TILE / 2;
		const y = OFFSET_Y + tr * TILE + TILE / 2;
		this.tweens.add({ targets: block, x: x, y: y, duration: 100 });
	}

	private inBounds(r, c) {
		return r >= 0 && r < this.grid.length && c >= 0 && c < this.grid[0].length;
	}

	private checkWin() {
		for (let r = 0; r < this.grid.length; r++) {
			for (let c = 0; c < this.grid[r].length; c++) {
				if (this.grid[r][c] === 4 || this.grid[r][c] === 6) return;
			}
		}

		this.time.delayedCall(200, () => {
			this.add.rectangle(400, 300, 400, 200, 0x000000, 0.8).setDepth(200);
			this.add.text(400, 270, "${g.puzzle.levelComplete}", {
				fontSize: "36px",
				color: "#22c55e",
				fontFamily: "Arial",
			}).setOrigin(0.5).setDepth(201);

			this.add.text(400, 320, "${g.puzzle.steps}: " + this.moves, {
				fontSize: "22px",
				color: "#fbbf24",
				fontFamily: "Arial",
			}).setOrigin(0.5).setDepth(201);

			const menuBtn = this.add
				.text(400, 380, "${g.puzzle.backToMenu}", {
					fontSize: "18px",
					color: "#06b6d4",
					fontFamily: "Arial",
				})
				.setOrigin(0.5)
				.setInteractive({ useHandCursor: true })
				.setDepth(201);

			menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
		});
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
	gravity: 0,
	debug: false,
};
`,
		},
	];
}
