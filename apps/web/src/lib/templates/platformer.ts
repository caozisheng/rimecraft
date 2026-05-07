import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function platformerTemplate(meta: ProjectMeta): TemplateFile[] {
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
	backgroundColor: "#0f172a",
	physics: {
		default: "arcade",
		arcade: {
			gravity: { x: 0, y: 600 },
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
		makeTexture(this, "player", 0x06b6d4, 32, 48);
		makeTexture(this, "ground", 0x4ade80, 200, 32);
		makeTexture(this, "coin", 0xfbbf24, 16, 16);
		makeTexture(this, "spike", 0xef4444, 32, 20);

		this.add
			.text(400, 180, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 260, "${g.platformer.subtitle}", {
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
			.text(400, 480, "${g.platformer.moveHint}", {
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
	private platforms;
	private coins;
	private spikes;
	private cursors;
	private score = 0;
	private scoreText;

	constructor() {
		super("GameScene");
	}

	create() {
		this.score = 0;

		// 平台布局
		this.platforms = this.physics.add.staticGroup();
		this.createPlatform(400, 580, 4);
		this.createPlatform(100, 460, 1);
		this.createPlatform(400, 380, 1.5);
		this.createPlatform(700, 300, 1);
		this.createPlatform(200, 220, 1.2);
		this.createPlatform(550, 150, 1);

		// 金币
		this.coins = this.physics.add.group({ allowGravity: false });
		this.addCoin(100, 420);
		this.addCoin(400, 340);
		this.addCoin(700, 260);
		this.addCoin(200, 180);
		this.addCoin(550, 110);
		this.addCoin(300, 540);
		this.addCoin(600, 540);

		// 尖刺障碍
		this.spikes = this.physics.add.staticGroup();
		this.addSpike(500, 368);
		this.addSpike(150, 208);

		// 玩家
		this.player = this.physics.add.sprite(100, 520, "player");
		this.player.body.setCollideWorldBounds(true);
		this.player.body.setBounce(0.1);

		// 碰撞
		this.physics.add.collider(this.player, this.platforms);
		this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this);
		this.physics.add.overlap(this.player, this.spikes, this.hitSpike, undefined, this);

		// 输入
		this.cursors = this.input.keyboard.createCursorKeys();
		this.input.keyboard.addKey("SPACE").on("down", () => this.jump());

		// 分数
		this.scoreText = this.add
			.text(16, 16, "${g.platformer.coins}: 0", {
				fontSize: "24px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setScrollFactor(0)
			.setDepth(100);
	}

	update() {
		if (this.cursors.left.isDown) {
			this.player.body.setVelocityX(-200);
		} else if (this.cursors.right.isDown) {
			this.player.body.setVelocityX(200);
		} else {
			this.player.body.setVelocityX(0);
		}

		if (this.cursors.up.isDown && this.player.body.blocked.down) {
			this.jump();
		}

		if (this.player.y > 620) {
			this.scene.start("GameOverScene", { score: this.score });
		}
	}

	private jump() {
		if (this.player.body.blocked.down) {
			this.player.body.setVelocityY(-400);
		}
	}

	private createPlatform(x, y, scaleX) {
		const p = this.platforms.create(x, y, "ground");
		p.setScale(scaleX, 1).refreshBody();
	}

	private addCoin(x, y) {
		const coin = this.coins.create(x, y, "coin");
		coin.body.setAllowGravity(false);
		this.tweens.add({
			targets: coin,
			y: y - 10,
			duration: 800,
			yoyo: true,
			repeat: -1,
			ease: "Sine.easeInOut",
		});
	}

	private addSpike(x, y) {
		this.spikes.create(x, y, "spike").refreshBody();
	}

	private collectCoin(_player, coin) {
		coin.disableBody(true, true);
		this.score += 10;
		this.scoreText.setText("${g.platformer.coins}: " + this.score);

		if (this.coins.countActive(true) === 0) {
			this.time.delayedCall(500, () => {
				this.scene.start("GameOverScene", { score: this.score, win: true });
			});
		}
	}

	private hitSpike() {
		this.physics.pause();
		this.player.setTint(0xff0000);
		this.cameras.main.shake(200, 0.01);
		this.time.delayedCall(600, () => {
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
		const win = data.win ?? false;

		this.add
			.text(400, 180, win ? "${g.platformer.congratulations}" : "${g.common.gameOver}", {
				fontSize: "48px",
				color: win ? "#22c55e" : "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 280, "${g.platformer.coins}: " + score, {
				fontSize: "32px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const retryBtn = this.add
			.text(400, 400, "${g.platformer.tryAgain}", {
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
	gravity: 600,
	debug: false,
};
`,
		},
	];
}
