import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function breakoutTemplate(meta: ProjectMeta): TemplateFile[] {
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
	backgroundColor: "#0c1445",
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
	constructor() {
		super("MenuScene");
	}

	preload() {
		this.load.image("ball", "https://labs.phaser.io/assets/games/breakout/ball1.png");
		this.load.image("block", "https://labs.phaser.io/assets/sprites/block.png");
	}

	create() {
		this.add
			.text(400, 150, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 230, "${g.breakout.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const preview = this.add.graphics();
		const colors = [0xef4444, 0xf97316, 0xfbbf24, 0x22c55e, 0x06b6d4, 0x8b5cf6];
		for (let row = 0; row < 3; row++) {
			for (let col = 0; col < 6; col++) {
				preview.fillStyle(colors[row % colors.length], 1);
				preview.fillRoundedRect(240 + col * 55, 280 + row * 22, 50, 18, 4);
			}
		}

		const startBtn = this.add
			.text(400, 410, "${g.breakout.startGame}", {
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
			.text(400, 490, "${g.breakout.moveHint}", {
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

const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_W = 64;
const BRICK_H = 24;
const BRICK_GAP = 4;
const BRICK_OFFSET_X = 68;
const BRICK_OFFSET_Y = 80;
const ROW_COLORS = [0xef4444, 0xf97316, 0xfbbf24, 0x22c55e, 0x06b6d4, 0x8b5cf6];

export class GameScene extends Phaser.Scene {
	private paddle!: Phaser.GameObjects.Rectangle;
	private ball!: Phaser.Physics.Arcade.Image;
	private bricks!: Phaser.Physics.Arcade.StaticGroup;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private score = 0;
	private lives = 3;
	private level = 1;
	private scoreText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;
	private levelText!: Phaser.GameObjects.Text;
	private onPaddle = true;

	constructor() {
		super("GameScene");
	}

	create() {
		this.score = 0;
		this.lives = 3;
		this.level = 1;

		this.physics.world.setBoundsCollision(true, true, true, false);

		this.createBricks();

		this.paddle = this.add.rectangle(400, 560, 120, 16, 0x06b6d4);
		this.physics.add.existing(this.paddle, true);

		this.ball = this.physics.add.image(400, 540, "ball");
		this.ball.setCollideWorldBounds(true);
		this.ball.setBounce(1);
		this.ball.setScale(0.8);
		this.onPaddle = true;

		this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, undefined, this);
		this.physics.add.collider(this.ball, this.bricks, this.hitBrick, undefined, this);

		this.cursors = this.input.keyboard!.createCursorKeys();

		this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
			this.paddle.x = Phaser.Math.Clamp(pointer.x, 60, 740);
			(this.paddle.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
			if (this.onPaddle) {
				this.ball.x = this.paddle.x;
			}
		});

		this.input.on("pointerdown", () => this.launchBall());
		this.input.keyboard!.addKey("SPACE").on("down", () => this.launchBall());

		this.scoreText = this.add.text(16, 16, "${g.common.score}: 0", { fontSize: "22px", color: "#fbbf24", fontFamily: "Arial" }).setDepth(100);
		this.livesText = this.add.text(784, 16, "${g.breakout.lives}: 3", { fontSize: "22px", color: "#ef4444", fontFamily: "Arial" }).setOrigin(1, 0).setDepth(100);
		this.levelText = this.add.text(400, 16, "${g.breakout.level}: 1", { fontSize: "22px", color: "#a3e635", fontFamily: "Arial" }).setOrigin(0.5, 0).setDepth(100);
	}

	update() {
		if (this.cursors.left.isDown) {
			this.paddle.x = Phaser.Math.Clamp(this.paddle.x - 8, 60, 740);
			(this.paddle.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
			if (this.onPaddle) this.ball.x = this.paddle.x;
		} else if (this.cursors.right.isDown) {
			this.paddle.x = Phaser.Math.Clamp(this.paddle.x + 8, 60, 740);
			(this.paddle.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
			if (this.onPaddle) this.ball.x = this.paddle.x;
		}

		if (this.ball.y > 620) {
			this.lives--;
			this.livesText.setText("${g.breakout.lives}: " + this.lives);
			if (this.lives <= 0) {
				this.scene.start("GameOverScene", { score: this.score, level: this.level, win: false });
			} else {
				this.resetBall();
			}
		}
	}

	private createBricks() {
		if (this.bricks) this.bricks.clear(true, true);
		this.bricks = this.physics.add.staticGroup();

		for (let row = 0; row < BRICK_ROWS; row++) {
			for (let col = 0; col < BRICK_COLS; col++) {
				const x = BRICK_OFFSET_X + col * (BRICK_W + BRICK_GAP);
				const y = BRICK_OFFSET_Y + row * (BRICK_H + BRICK_GAP);
				const brick = this.add.rectangle(x, y, BRICK_W, BRICK_H, ROW_COLORS[row % ROW_COLORS.length]);
				this.physics.add.existing(brick, true);
				this.bricks.add(brick);
			}
		}
	}

	private launchBall() {
		if (!this.onPaddle) return;
		this.onPaddle = false;
		const angle = Phaser.Math.Between(-60, 60);
		const speed = 350 + this.level * 30;
		this.physics.velocityFromAngle(angle - 90, speed, (this.ball.body as Phaser.Physics.Arcade.Body).velocity);
	}

	private resetBall() {
		this.ball.setVelocity(0);
		this.ball.setPosition(this.paddle.x, 540);
		this.onPaddle = true;
	}

	private hitPaddle(_ball: any, _paddle: any) {
		const diff = this.ball.x - this.paddle.x;
		const body = this.ball.body as Phaser.Physics.Arcade.Body;
		body.setVelocityX(diff * 5);
	}

	private hitBrick(_ball: any, brick: any) {
		(brick.body as Phaser.Physics.Arcade.StaticBody).enable = false;
		brick.setVisible(false);
		brick.setActive(false);
		this.score += 10 * this.level;
		this.scoreText.setText("${g.common.score}: " + this.score);

		if (this.bricks.countActive() === 0) {
			if (this.level >= 3) {
				this.scene.start("GameOverScene", { score: this.score, level: this.level, win: true });
			} else {
				this.level++;
				this.levelText.setText("${g.breakout.level}: " + this.level);
				this.createBricks();
				this.physics.add.collider(this.ball, this.bricks, this.hitBrick, undefined, this);
				this.resetBall();
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
	constructor() {
		super("GameOverScene");
	}

	create(data: any) {
		const score = data.score ?? 0;
		const win = data.win ?? false;

		this.add
			.text(400, 180, win ? "${g.breakout.cleared}" : "${g.common.gameOver}", {
				fontSize: "44px",
				color: win ? "#22c55e" : "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 260, "${g.common.finalScore}: " + score, {
				fontSize: "28px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 310, "${g.breakout.level}: " + (data.level ?? 1), {
				fontSize: "22px",
				color: "#94a3b8",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const retryBtn = this.add
			.text(400, 400, "${g.breakout.tryAgain}", {
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
			.text(400, 460, "${g.common.backToMenu}", {
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
