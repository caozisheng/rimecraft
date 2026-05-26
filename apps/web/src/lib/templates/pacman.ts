import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function pacmanTemplate(meta: ProjectMeta): TemplateFile[] {
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
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
	constructor() { super("MenuScene"); }

	create() {
		this.add.text(400, 120, "${meta.name}", { fontSize: "48px", color: "#ffff00", fontFamily: "Arial" }).setOrigin(0.5);
		this.add.text(400, 190, "${g.pacman.subtitle}", { fontSize: "28px", color: "#ffffff", fontFamily: "Arial" }).setOrigin(0.5);

		const gfx = this.add.graphics();
		const cx = 400, cy = 310;
		const mouth = 0.25;
		gfx.fillStyle(0xffff00);
		gfx.beginPath();
		gfx.moveTo(cx, cy);
		gfx.arc(cx, cy, 30, mouth, Math.PI * 2 - mouth);
		gfx.closePath();
		gfx.fillPath();

		const colors = [0xff0000, 0xffb8ff, 0x00ffff, 0xffb852];
		for (let i = 0; i < 4; i++) {
			const gx = 300 + i * 70, gy = 390;
			gfx.fillStyle(colors[i]);
			gfx.fillCircle(gx, gy - 3, 14);
			gfx.fillRect(gx - 14, gy - 3, 28, 16);
			for (let j = 0; j < 3; j++) gfx.fillCircle(gx - 9 + j * 9, gy + 13, 4.5);
			gfx.fillStyle(0xffffff);
			gfx.fillCircle(gx - 5, gy - 5, 5);
			gfx.fillCircle(gx + 5, gy - 5, 5);
			gfx.fillStyle(0x0000ff);
			gfx.fillCircle(gx - 4, gy - 5, 2.5);
			gfx.fillCircle(gx + 6, gy - 5, 2.5);
		}

		const startBtn = this.add.text(400, 470, "${g.common.startGame}", { fontSize: "28px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add.text(400, 540, "${g.pacman.moveHint}", { fontSize: "16px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(0.5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";

const TILE = 16;
const COLS = 28;
const ROWS = 31;
const OX = (800 - COLS * TILE) / 2;
const OY = 20;

const LEFT = 0, RIGHT = 1, UP = 2, DOWN = 3, NONE = -1;
const DXS = [-1, 1, 0, 0];
const DYS = [0, 0, -1, 1];
const OPP = [1, 0, 3, 2];

const MAZE_STR = [
	"0000000000000000000000000000",
	"0111111111111001111111111110",
	"0100001000001001000001000010",
	"0302201022201001022201022030",
	"0100001000001001000001000010",
	"0111111111111111111111111110",
	"0100001001000000001001000010",
	"0100001001000000001001000010",
	"0111111001111001111001111110",
	"0000001000002002000010000000",
	"2222201000002002000010222222",
	"2222201002222222222001022222",
	"2222201002000550002001022222",
	"0000001002044444402001000000",
	"1111111222044444402221111111",
	"0000001002044444402001000000",
	"2222201002000000020010222222",
	"2222201002222222222001022222",
	"2222201002000000020010222222",
	"0000001002000000020010000000",
	"0111111111111001111111111110",
	"0100001000001001000001000010",
	"0100001000001001000001000010",
	"0311001111111111111111001130",
	"0001001001000000001001001000",
	"0001001001000000001001001000",
	"0111111001111001111001111110",
	"0100000000001001000000000010",
	"0100000000001001000000000010",
	"0111111111111111111111111110",
	"0000000000000000000000000000",
];

const NO_UP_TILES = [
	{ x: 12, y: 11 }, { x: 15, y: 11 },
	{ x: 12, y: 23 }, { x: 15, y: 23 },
];

const SCATTER_TARGETS = [
	{ x: 25, y: 0 }, { x: 2, y: 0 },
	{ x: 27, y: 30 }, { x: 0, y: 30 },
];

const GHOST_COLORS = [0xff0000, 0xffb8ff, 0x00ffff, 0xffb852];

const MODE_TIMES = [
	{ mode: "scatter", time: 7000 },
	{ mode: "chase", time: 20000 },
	{ mode: "scatter", time: 7000 },
	{ mode: "chase", time: 20000 },
	{ mode: "scatter", time: 5000 },
	{ mode: "chase", time: 20000 },
	{ mode: "scatter", time: 5000 },
	{ mode: "chase", time: -1 },
];

interface Ghost {
	gx: number; gy: number;
	px: number; py: number;
	dir: number;
	color: number;
	mode: string;
	speed: number;
	scatterTarget: { x: number; y: number };
	name: string;
	exitDots: number;
	turnTimer: number;
}

function parseMaze(): number[][] {
	return MAZE_STR.map(r => r.split("").map(Number));
}

function isNoUp(x: number, y: number): boolean {
	return NO_UP_TILES.some(t => t.x === x && t.y === y);
}

export class GameScene extends Phaser.Scene {
	private maze: number[][] = [];
	private dots: boolean[][] = [];
	private pills: boolean[][] = [];
	private totalDots = 0;
	private eatenDots = 0;
	private score = 0;
	private lives = 3;
	private pacGx = 14;
	private pacGy = 23;
	private pacPx = 0;
	private pacPy = 0;
	private pacDir = LEFT;
	private pacNextDir = NONE;
	private pacSpeed = 120;
	private pacDead = false;
	private deathTimer = 0;
	private ghosts: Ghost[] = [];
	private modeIndex = 0;
	private modeTimer = 0;
	private frightened = false;
	private frightTimer = 0;
	private frightRemaining = 0;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private mazeGfx!: Phaser.GameObjects.Graphics;
	private dotGfx!: Phaser.GameObjects.Graphics;
	private entityGfx!: Phaser.GameObjects.Graphics;
	private scoreText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;
	private readyText!: Phaser.GameObjects.Text;
	private readyTimer = 0;
	private started = false;

	constructor() { super("GameScene"); }

	create() {
		this.maze = parseMaze();
		this.dots = [];
		this.pills = [];
		this.totalDots = 0;
		this.eatenDots = 0;
		this.score = 0;
		this.lives = 3;
		this.pacDead = false;
		this.modeIndex = 0;
		this.frightened = false;
		this.started = false;

		for (let y = 0; y < ROWS; y++) {
			this.dots[y] = [];
			this.pills[y] = [];
			for (let x = 0; x < COLS; x++) {
				if (this.maze[y][x] === 1) {
					this.dots[y][x] = true;
					this.totalDots++;
				} else {
					this.dots[y][x] = false;
				}
				this.pills[y][x] = this.maze[y][x] === 3;
			}
		}

		this.resetPositions();

		this.mazeGfx = this.add.graphics();
		this.dotGfx = this.add.graphics();
		this.entityGfx = this.add.graphics();

		this.drawWalls();

		this.cursors = this.input.keyboard!.createCursorKeys();

		const sy = OY + ROWS * TILE + 8;
		this.scoreText = this.add.text(OX, sy, "${g.common.score}: 0", { fontSize: "18px", color: "#ffffff", fontFamily: "Arial" });
		this.livesText = this.add.text(OX + COLS * TILE, sy, "${g.pacman.lives}: 3", { fontSize: "18px", color: "#ffff00", fontFamily: "Arial" }).setOrigin(1, 0);

		this.readyText = this.add.text(400, OY + 17 * TILE, "${g.pacman.getReady}", { fontSize: "20px", color: "#ffff00", fontFamily: "Arial" }).setOrigin(0.5);
		this.readyTimer = 2000;

		this.modeTimer = MODE_TIMES[0].time;
	}

	private resetPositions() {
		this.pacGx = 14; this.pacGy = 23;
		this.pacPx = this.tileX(14); this.pacPy = this.tileY(23);
		this.pacDir = LEFT; this.pacNextDir = NONE;
		this.pacDead = false;

		this.ghosts = [];
		this.ghosts.push(this.createGhost(13, 11, RIGHT, 0, "blinky", 0, "scatter"));
		this.ghosts.push(this.createGhost(14, 14, LEFT, 1, "pinky", 0, "home"));
		this.ghosts.push(this.createGhost(13, 14, RIGHT, 2, "inky", 30, "home"));
		this.ghosts.push(this.createGhost(15, 14, LEFT, 3, "clyde", 80, "home"));
	}

	private createGhost(gx: number, gy: number, dir: number, idx: number, name: string, exitDots: number, mode: string): Ghost {
		return {
			gx, gy, px: this.tileX(gx), py: this.tileY(gy),
			dir, color: GHOST_COLORS[idx], mode,
			speed: 110, scatterTarget: SCATTER_TARGETS[idx],
			name, exitDots, turnTimer: 0,
		};
	}

	private tileX(gx: number) { return OX + gx * TILE + TILE / 2; }
	private tileY(gy: number) { return OY + gy * TILE + TILE / 2; }

	private canWalk(x: number, y: number, forGhost = false, isHome = false): boolean {
		if (y < 0 || y >= ROWS) return false;
		const wx = ((x % COLS) + COLS) % COLS;
		const t = this.maze[y][wx];
		if (forGhost && isHome) return t > 0;
		if (forGhost) return t > 0 && t < 4;
		return t > 0 && t < 4;
	}

	update(time: number, delta: number) {
		if (!this.started) {
			this.readyTimer -= delta;
			if (this.readyTimer <= 0) {
				this.started = true;
				this.readyText.setVisible(false);
			}
			this.drawDots();
			this.drawEntities(time);
			return;
		}

		if (this.pacDead) {
			this.deathTimer -= delta;
			if (this.deathTimer <= 0) {
				this.lives--;
				this.livesText.setText("${g.pacman.lives}: " + this.lives);
				if (this.lives <= 0) {
					this.scene.start("GameOverScene", { score: this.score, win: false });
					return;
				}
				this.resetPositions();
				this.readyText.setVisible(true).setText("${g.pacman.getReady}");
				this.readyTimer = 1500;
				this.started = false;
			}
			this.drawDots();
			this.drawEntities(time);
			return;
		}

		this.handleInput();
		this.movePacman(delta);
		this.updateModes(delta);

		for (const g of this.ghosts) {
			if (g.mode === "home") {
				if (this.eatenDots >= g.exitDots) g.mode = "exit";
				else this.bounceHome(g, delta);
			} else if (g.mode === "exit") {
				this.exitHome(g, delta);
			} else if (g.mode === "eaten") {
				this.moveEaten(g, delta);
			} else {
				this.moveGhost(g, delta);
			}
		}

		this.checkCollisions();
		this.drawDots();
		this.drawEntities(time);
		this.scoreText.setText("${g.common.score}: " + this.score);
	}

	private handleInput() {
		if (this.cursors.left.isDown) this.pacNextDir = LEFT;
		else if (this.cursors.right.isDown) this.pacNextDir = RIGHT;
		else if (this.cursors.up.isDown) this.pacNextDir = UP;
		else if (this.cursors.down.isDown) this.pacNextDir = DOWN;
	}

	private movePacman(delta: number) {
		const step = this.pacSpeed * delta / 1000;
		const cx = this.tileX(this.pacGx);
		const cy = this.tileY(this.pacGy);
		const atCenter = Math.abs(this.pacPx - cx) < 2 && Math.abs(this.pacPy - cy) < 2;

		if (atCenter) {
			this.pacPx = cx; this.pacPy = cy;

			const dx = this.dots[this.pacGy]?.[this.pacGx];
			if (dx) {
				this.dots[this.pacGy][this.pacGx] = false;
				this.score += 10;
				this.eatenDots++;
				if (this.eatenDots >= this.totalDots) {
					this.scene.start("GameOverScene", { score: this.score, win: true });
					return;
				}
			}
			if (this.pills[this.pacGy]?.[this.pacGx]) {
				this.pills[this.pacGy][this.pacGx] = false;
				this.score += 50;
				this.enterFrightened();
			}

			if (this.pacNextDir !== NONE) {
				const nx = this.pacGx + DXS[this.pacNextDir];
				const ny = this.pacGy + DYS[this.pacNextDir];
				if (this.canWalk(nx, ny)) {
					this.pacDir = this.pacNextDir;
					this.pacNextDir = NONE;
				}
			}

			const nx2 = this.pacGx + DXS[this.pacDir];
			const ny2 = this.pacGy + DYS[this.pacDir];
			if (!this.canWalk(nx2, ny2)) return;

			this.pacGx = ((nx2 % COLS) + COLS) % COLS;
			this.pacGy = ny2;
		}

		this.pacPx += DXS[this.pacDir] * step;
		this.pacPy += DYS[this.pacDir] * step;

		if (this.pacPx < OX - TILE) this.pacPx = OX + COLS * TILE;
		if (this.pacPx > OX + COLS * TILE) this.pacPx = OX - TILE;
	}

	private updateModes(delta: number) {
		if (this.frightened) {
			this.frightTimer -= delta;
			if (this.frightTimer <= 0) {
				this.frightened = false;
				for (const g of this.ghosts) {
					if (g.mode === "fright") {
						g.mode = MODE_TIMES[this.modeIndex].mode;
						g.speed = 110;
					}
				}
				this.modeTimer = this.frightRemaining;
			}
			return;
		}

		if (MODE_TIMES[this.modeIndex].time === -1) return;
		this.modeTimer -= delta;
		if (this.modeTimer <= 0) {
			this.modeIndex = Math.min(this.modeIndex + 1, MODE_TIMES.length - 1);
			const m = MODE_TIMES[this.modeIndex];
			this.modeTimer = m.time;
			for (const g of this.ghosts) {
				if (g.mode === "scatter" || g.mode === "chase") {
					g.dir = OPP[g.dir];
					g.mode = m.mode;
				}
			}
		}
	}

	private enterFrightened() {
		if (!this.frightened) {
			this.frightRemaining = this.modeTimer;
		}
		this.frightened = true;
		this.frightTimer = 7000;
		for (const g of this.ghosts) {
			if (g.mode === "scatter" || g.mode === "chase" || g.mode === "fright") {
				if (g.mode !== "fright") g.dir = OPP[g.dir];
				g.mode = "fright";
				g.speed = 60;
			}
		}
	}

	private moveGhost(g: Ghost, delta: number) {
		const step = g.speed * delta / 1000;
		const cx = this.tileX(g.gx);
		const cy = this.tileY(g.gy);
		const atCenter = Math.abs(g.px - cx) < 2 && Math.abs(g.py - cy) < 2;

		if (atCenter && g.turnTimer <= 0) {
			g.px = cx; g.py = cy;

			const target = this.getTarget(g);
			const exits: number[] = [];
			const isHome = g.mode === "home" || g.mode === "exit";

			for (let d = 0; d < 4; d++) {
				if (d === OPP[g.dir]) continue;
				const nx = g.gx + DXS[d];
				const ny = g.gy + DYS[d];
				if (this.canWalk(nx, ny, true, isHome)) {
					if (d === UP && isNoUp(g.gx, g.gy) && g.mode !== "fright") continue;
					exits.push(d);
				}
			}

			if (exits.length === 0) {
				const backNx = g.gx + DXS[OPP[g.dir]];
				const backNy = g.gy + DYS[OPP[g.dir]];
				if (this.canWalk(backNx, backNy, true, isHome)) exits.push(OPP[g.dir]);
			}

			if (exits.length > 0) {
				let bestDir = exits[0];
				if (g.mode === "fright") {
					bestDir = exits[Math.floor(Math.random() * exits.length)];
				} else {
					let bestDist = Infinity;
					for (const d of exits) {
						const nx = g.gx + DXS[d];
						const ny = g.gy + DYS[d];
						const dist = (nx - target.x) ** 2 + (ny - target.y) ** 2;
						if (dist < bestDist) { bestDist = dist; bestDir = d; }
					}
				}
				g.dir = bestDir;
			}

			const ngx = g.gx + DXS[g.dir];
			const ngy = g.gy + DYS[g.dir];
			if (this.canWalk(ngx, ngy, true, isHome)) {
				g.gx = ((ngx % COLS) + COLS) % COLS;
				g.gy = ngy;
			}
			g.turnTimer = 100;
		}

		g.turnTimer = Math.max(0, g.turnTimer - delta);
		g.px += DXS[g.dir] * step;
		g.py += DYS[g.dir] * step;

		if (g.px < OX - TILE) g.px = OX + COLS * TILE;
		if (g.px > OX + COLS * TILE) g.px = OX - TILE;
	}

	private getTarget(g: Ghost): { x: number; y: number } {
		if (g.mode === "scatter") return g.scatterTarget;
		if (g.mode === "fright") return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };

		switch (g.name) {
			case "blinky": return { x: this.pacGx, y: this.pacGy };
			case "pinky": {
				let tx = this.pacGx + DXS[this.pacDir] * 4;
				let ty = this.pacGy + DYS[this.pacDir] * 4;
				if (this.pacDir === UP) tx -= 4;
				return { x: tx, y: ty };
			}
			case "inky": {
				const blinky = this.ghosts[0];
				const ax = this.pacGx + DXS[this.pacDir] * 2;
				const ay = this.pacGy + DYS[this.pacDir] * 2;
				return { x: ax * 2 - blinky.gx, y: ay * 2 - blinky.gy };
			}
			case "clyde": {
				const dist = Math.abs(g.gx - this.pacGx) + Math.abs(g.gy - this.pacGy);
				if (dist > 8) return { x: this.pacGx, y: this.pacGy };
				return g.scatterTarget;
			}
			default: return g.scatterTarget;
		}
	}

	private bounceHome(g: Ghost, delta: number) {
		const step = 50 * delta / 1000;
		g.py += (g.dir === UP ? -1 : 1) * step;
		const minY = this.tileY(13);
		const maxY = this.tileY(15);
		if (g.py <= minY) { g.py = minY; g.dir = DOWN; }
		if (g.py >= maxY) { g.py = maxY; g.dir = UP; }
	}

	private exitHome(g: Ghost, delta: number) {
		const step = 80 * delta / 1000;
		const doorX = this.tileX(13);
		const doorY = this.tileY(11);

		if (Math.abs(g.px - doorX) > 2) {
			g.px += (g.px < doorX ? 1 : -1) * step;
		} else if (Math.abs(g.py - doorY) > 2) {
			g.px = doorX;
			g.py -= step;
		} else {
			g.px = doorX; g.py = doorY;
			g.gx = 13; g.gy = 11;
			g.mode = MODE_TIMES[this.modeIndex].mode;
			if (this.frightened) { g.mode = "fright"; g.speed = 60; }
			else g.speed = 110;
			g.dir = LEFT;
		}
	}

	private moveEaten(g: Ghost, delta: number) {
		const step = 200 * delta / 1000;
		const homeX = this.tileX(14);
		const homeY = this.tileY(14);

		if (Math.abs(g.px - homeX) > 3) {
			g.px += (g.px < homeX ? 1 : -1) * step;
		} else if (Math.abs(g.py - homeY) > 3) {
			g.py += (g.py < homeY ? 1 : -1) * step;
		} else {
			g.px = homeX; g.py = homeY;
			g.gx = 14; g.gy = 14;
			g.mode = "exit";
			g.exitDots = 0;
		}
	}

	private checkCollisions() {
		for (const g of this.ghosts) {
			if (g.mode === "eaten" || g.mode === "home" || g.mode === "exit") continue;
			const dist = Math.abs(g.px - this.pacPx) + Math.abs(g.py - this.pacPy);
			if (dist < TILE * 0.8) {
				if (g.mode === "fright") {
					g.mode = "eaten";
					g.speed = 200;
					this.score += 200;
				} else {
					this.pacDead = true;
					this.deathTimer = 1500;
					for (const gh of this.ghosts) gh.mode = "stop";
				}
			}
		}
	}

	private drawWalls() {
		const g = this.mazeGfx;
		g.clear();
		g.fillStyle(0x0000ff);
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				if (this.maze[y][x] === 0) {
					let hasAdj = false;
					for (let d = 0; d < 4; d++) {
						const nx = x + DXS[d], ny = y + DYS[d];
						if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && this.maze[ny][nx] !== 0) {
							hasAdj = true; break;
						}
					}
					if (hasAdj) {
						g.fillRect(OX + x * TILE + 1, OY + y * TILE + 1, TILE - 2, TILE - 2);
					}
				}
			}
		}
		g.lineStyle(1, 0x2121de);
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				if (this.maze[y][x] === 0) {
					const px = OX + x * TILE, py = OY + y * TILE;
					if (x + 1 < COLS && this.maze[y][x + 1] !== 0) g.lineBetween(px + TILE, py, px + TILE, py + TILE);
					if (x - 1 >= 0 && this.maze[y][x - 1] !== 0) g.lineBetween(px, py, px, py + TILE);
					if (y + 1 < ROWS && this.maze[y + 1]?.[x] !== 0) g.lineBetween(px, py + TILE, px + TILE, py + TILE);
					if (y - 1 >= 0 && this.maze[y - 1]?.[x] !== 0) g.lineBetween(px, py, px + TILE, py);
				}
			}
		}
	}

	private drawDots() {
		const g = this.dotGfx;
		g.clear();
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				if (this.dots[y][x]) {
					g.fillStyle(0xffffff);
					g.fillCircle(OX + x * TILE + TILE / 2, OY + y * TILE + TILE / 2, 2);
				}
				if (this.pills[y][x]) {
					g.fillStyle(0xffffff);
					g.fillCircle(OX + x * TILE + TILE / 2, OY + y * TILE + TILE / 2, 5);
				}
			}
		}
	}

	private drawEntities(time: number) {
		const g = this.entityGfx;
		g.clear();

		if (!this.pacDead) {
			const mouthAngle = Math.abs(Math.sin(time * 0.008)) * 0.35;
			const baseAngle = this.pacDir === LEFT ? Math.PI : this.pacDir === RIGHT ? 0 : this.pacDir === UP ? -Math.PI / 2 : Math.PI / 2;
			g.fillStyle(0xffff00);
			g.beginPath();
			g.moveTo(this.pacPx, this.pacPy);
			g.arc(this.pacPx, this.pacPy, 7, baseAngle + mouthAngle, baseAngle + Math.PI * 2 - mouthAngle);
			g.closePath();
			g.fillPath();
		} else {
			const progress = 1 - this.deathTimer / 1500;
			const angle = Math.PI * 2 * progress;
			g.fillStyle(0xffff00);
			g.beginPath();
			g.moveTo(this.pacPx, this.pacPy);
			g.arc(this.pacPx, this.pacPy, 7, angle / 2, Math.PI * 2 - angle / 2);
			g.closePath();
			g.fillPath();
		}

		for (const gh of this.ghosts) {
			if (gh.mode === "stop") continue;

			if (gh.mode === "eaten") {
				g.fillStyle(0xffffff);
				g.fillCircle(gh.px - 3, gh.py - 3, 3);
				g.fillCircle(gh.px + 3, gh.py - 3, 3);
				g.fillStyle(0x0000ff);
				const eox = gh.dir === LEFT ? -1 : gh.dir === RIGHT ? 1 : 0;
				const eoy = gh.dir === UP ? -1 : gh.dir === DOWN ? 1 : 0;
				g.fillCircle(gh.px - 3 + eox, gh.py - 3 + eoy, 1.5);
				g.fillCircle(gh.px + 3 + eox, gh.py - 3 + eoy, 1.5);
				continue;
			}

			const isFright = gh.mode === "fright";
			const bodyColor = isFright ? 0x2121de : gh.color;
			g.fillStyle(bodyColor);
			g.fillCircle(gh.px, gh.py - 2, 7);
			g.fillRect(gh.px - 7, gh.py - 2, 14, 8);
			for (let i = 0; i < 3; i++) g.fillCircle(gh.px - 5 + i * 5, gh.py + 6, 2.5);

			if (isFright) {
				g.fillStyle(0xffffff);
				g.fillCircle(gh.px - 3, gh.py - 3, 2);
				g.fillCircle(gh.px + 3, gh.py - 3, 2);
			} else {
				g.fillStyle(0xffffff);
				g.fillCircle(gh.px - 3, gh.py - 3, 3);
				g.fillCircle(gh.px + 3, gh.py - 3, 3);
				g.fillStyle(0x0000ff);
				const eox = gh.dir === LEFT ? -1 : gh.dir === RIGHT ? 1 : 0;
				const eoy = gh.dir === UP ? -1 : gh.dir === DOWN ? 1 : 0;
				g.fillCircle(gh.px - 3 + eox, gh.py - 3 + eoy, 1.5);
				g.fillCircle(gh.px + 3 + eox, gh.py - 3 + eoy, 1.5);
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
		const score = data.score ?? 0;
		const win = data.win ?? false;

		this.add.text(400, 180, win ? "${g.pacman.youWin}" : "${g.pacman.gameOver}", {
			fontSize: "44px", color: win ? "#22c55e" : "#ef4444", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(400, 270, "${g.pacman.finalScore}: " + score, {
			fontSize: "26px", color: "#fbbf24", fontFamily: "Arial",
		}).setOrigin(0.5);

		const retryBtn = this.add.text(400, 380, "${g.pacman.retry}", {
			fontSize: "24px", color: "#06b6d4", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });

		retryBtn.on("pointerdown", () => this.scene.start("GameScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));

		const menuBtn = this.add.text(400, 440, "${g.common.backToMenu}", {
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
	height: 600,
	fps: 60,
	gravity: 0,
	debug: false,
};
`,
		},
	];
}
