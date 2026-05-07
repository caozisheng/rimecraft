import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function endlessRunnerTemplate(meta: ProjectMeta): TemplateFile[] {
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
			gravity: { x: 0, y: 800 },
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
		makeTexture(this, "ground", 0x4ade80, 800, 40);
		makeTexture(this, "player", 0x06b6d4, 40, 40);
		makeTexture(this, "obstacle", 0xef4444, 30, 50);

		this.add
			.text(400, 180, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 260, "${g.endlessRunner.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const startBtn = this.add
			.text(400, 400, "${g.common.startGame}", {
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
			.text(400, 480, "${g.endlessRunner.jumpHint}", {
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

export class GameScene extends Phaser.Scene {
	private player;
	private ground;
	private obstacles;
	private score = 0;
	private scoreText;
	private speed = 300;
	private spawnTimer;
	private speedTimer;
	private isGameOver = false;

	constructor() {
		super("GameScene");
	}

	create() {
		this.score = 0;
		this.speed = 300;
		this.isGameOver = false;

		// 地面
		this.ground = this.physics.add.staticGroup();
		this.ground.create(400, 590, "ground").refreshBody();

		// 玩家
		this.player = this.physics.add.sprite(150, 500, "player");
		this.player.body.setCollideWorldBounds(true);
		this.physics.add.collider(this.player, this.ground);

		// 障碍物对象池
		this.obstacles = this.physics.add.group({
			maxSize: 15,
			runChildUpdate: false,
		});

		this.physics.add.overlap(
			this.player,
			this.obstacles,
			this.hitObstacle,
			undefined,
			this,
		);

		// 定时生成障碍物
		this.spawnTimer = this.time.addEvent({
			delay: 1500,
			loop: true,
			callback: this.spawnObstacle,
			callbackScope: this,
		});

		// 逐渐加速
		this.speedTimer = this.time.addEvent({
			delay: 5000,
			loop: true,
			callback: () => {
				this.speed = Math.min(this.speed + 30, 600);
			},
		});

		// 分数
		this.scoreText = this.add
			.text(16, 16, "${g.common.score}: 0", {
				fontSize: "28px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setScrollFactor(0)
			.setDepth(100);

		// 输入：空格 / 点击 / 触摸
		this.input.keyboard.addKey("SPACE").on("down", () => this.jump());
		this.input.on("pointerdown", () => this.jump());
	}

	update() {
		if (this.isGameOver) return;

		// 加分
		this.score += 1;
		this.scoreText.setText("${g.common.score}: " + this.score);

		// 回收出屏障碍物
		this.obstacles.getChildren().forEach((obj) => {
			const o = obj;
			if (o.active && o.x < -60) {
				this.obstacles.killAndHide(o);
				o.body.stop();
			}
		});
	}

	private jump() {
		if (this.isGameOver) return;
		const onGround = this.player.body.blocked.down;
		if (onGround) {
			this.player.body.setVelocityY(-450);
		}
	}

	private spawnObstacle() {
		if (this.isGameOver) return;

		const x = 850;
		const y = 560;
		const obs = this.obstacles.getFirst(false, true, x, y, "obstacle");

		if (obs) {
			obs.setActive(true).setVisible(true);
			obs.body.setVelocityX(-this.speed);
			obs.body.setAllowGravity(false);
			obs.body.setImmovable(true);
		}
	}

	private hitObstacle() {
		if (this.isGameOver) return;
		this.isGameOver = true;

		this.physics.pause();
		this.player.setTint(0xff0000);
		this.spawnTimer.remove();
		this.speedTimer.remove();

		this.cameras.main.shake(200, 0.01);

		this.time.delayedCall(800, () => {
			this.scene.start("GameOverScene", { score: this.score });
		});
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

	create(data) {
		const score = data.score ?? 0;

		this.add
			.text(400, 200, "${g.common.gameOver}", {
				fontSize: "48px",
				color: "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 300, "${g.common.finalScore}: " + score, {
				fontSize: "32px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const retryBtn = this.add
			.text(400, 420, "${g.common.restart}", {
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
			.text(400, 480, "${g.common.backToMenu}", {
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
	gravity: 800,
	debug: false,
};
`,
		},
	];
}
