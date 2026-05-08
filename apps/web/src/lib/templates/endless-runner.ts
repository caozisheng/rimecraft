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
	backgroundColor: "#87ceeb",
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

export class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	preload() {
		this.load.spritesheet("dude", "https://labs.phaser.io/assets/sprites/dude.png", { frameWidth: 32, frameHeight: 48 });
		this.load.image("platform", "https://labs.phaser.io/assets/sprites/platform.png");
		this.load.image("sky", "https://labs.phaser.io/assets/skies/sky1.png");
		this.load.image("star", "https://labs.phaser.io/assets/demoscene/star.png");
		this.load.image("bomb", "https://labs.phaser.io/assets/sprites/bomb.png");
		this.load.image("saw", "https://labs.phaser.io/assets/sprites/saw.png");
	}

	create() {
		this.anims.create({ key: "run", frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
		this.anims.create({ key: "turn", frames: [{ key: "dude", frame: 4 }], frameRate: 20 });

		this.add.rectangle(400, 300, 800, 600, 0x0f172a);

		this.add
			.text(400, 150, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 230, "${g.endlessRunner.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const dude = this.add.sprite(400, 340, "dude").setScale(2);
		dude.play("run");

		const startBtn = this.add
			.text(400, 420, "${g.common.startGame}", {
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
			.text(400, 500, "${g.endlessRunner.jumpHint}", {
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
	private player!: Phaser.Physics.Arcade.Sprite;
	private ground!: Phaser.Physics.Arcade.StaticGroup;
	private obstacles!: Phaser.Physics.Arcade.Group;
	private coins!: Phaser.Physics.Arcade.Group;
	private clouds: Phaser.GameObjects.Image[] = [];
	private mountains: Phaser.GameObjects.Rectangle[] = [];
	private score = 0;
	private coinCount = 0;
	private speed = 300;
	private scoreText!: Phaser.GameObjects.Text;
	private coinText!: Phaser.GameObjects.Text;
	private spawnTimer!: Phaser.Time.TimerEvent;
	private coinTimer!: Phaser.Time.TimerEvent;
	private isGameOver = false;

	constructor() {
		super("GameScene");
	}

	create() {
		this.score = 0;
		this.coinCount = 0;
		this.speed = 300;
		this.isGameOver = false;

		this.add.image(400, 300, "sky");

		this.mountains = [];
		for (let i = 0; i < 6; i++) {
			const h = Phaser.Math.Between(80, 160);
			const m = this.add.rectangle(i * 180, 560 - h / 2, Phaser.Math.Between(120, 200), h, 0x475569, 0.4);
			this.mountains.push(m);
		}

		this.clouds = [];
		for (let i = 0; i < 5; i++) {
			const cloud = this.add.image(Phaser.Math.Between(0, 900), Phaser.Math.Between(50, 200), "platform");
			cloud.setScale(0.3, 0.15).setAlpha(0.5).setTint(0xffffff);
			this.clouds.push(cloud);
		}

		this.ground = this.physics.add.staticGroup();
		const g1 = this.ground.create(400, 584, "platform") as Phaser.Physics.Arcade.Sprite;
		g1.setScale(2, 0.5).refreshBody();

		this.player = this.physics.add.sprite(150, 500, "dude");
		this.player.setBounce(0.1);
		this.player.setCollideWorldBounds(true);
		this.player.play("run");
		this.physics.add.collider(this.player, this.ground);

		this.obstacles = this.physics.add.group({ maxSize: 20 });
		this.coins = this.physics.add.group({ maxSize: 15, allowGravity: false });

		this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, undefined, this);
		this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this);

		this.spawnTimer = this.time.addEvent({ delay: 1800, loop: true, callback: this.spawnObstacle, callbackScope: this });
		this.coinTimer = this.time.addEvent({ delay: 2500, loop: true, callback: this.spawnCoin, callbackScope: this });
		this.time.addEvent({ delay: 5000, loop: true, callback: () => { this.speed = Math.min(this.speed + 25, 550); } });

		this.input.keyboard!.addKey("SPACE").on("down", () => this.jump());
		this.input.on("pointerdown", () => this.jump());

		this.scoreText = this.add.text(16, 16, "${g.common.score}: 0", { fontSize: "26px", color: "#ffffff", fontFamily: "Arial", stroke: "#000", strokeThickness: 3 }).setScrollFactor(0).setDepth(100);
		this.coinText = this.add.text(16, 50, "⭐ 0", { fontSize: "22px", color: "#fbbf24", fontFamily: "Arial", stroke: "#000", strokeThickness: 2 }).setScrollFactor(0).setDepth(100);
	}

	update() {
		if (this.isGameOver) return;

		this.score += 1;
		this.scoreText.setText("${g.common.score}: " + this.score);

		for (const cloud of this.clouds) {
			cloud.x -= 0.5;
			if (cloud.x < -100) cloud.x = 900;
		}
		for (const m of this.mountains) {
			m.x -= 1;
			if (m.x < -120) m.x = 900;
		}

		this.obstacles.getChildren().forEach((obj: any) => {
			if (obj.active && obj.x < -60) {
				this.obstacles.killAndHide(obj);
				(obj.body as Phaser.Physics.Arcade.Body).stop();
			}
		});

		this.coins.getChildren().forEach((obj: any) => {
			if (obj.active && obj.x < -30) {
				this.coins.killAndHide(obj);
				(obj.body as Phaser.Physics.Arcade.Body).stop();
			}
		});
	}

	private jump() {
		if (this.isGameOver) return;
		const body = this.player.body as Phaser.Physics.Arcade.Body;
		if (body.blocked.down) {
			body.setVelocityY(-460);
		}
	}

	private spawnObstacle() {
		if (this.isGameOver) return;

		const isAir = Math.random() < 0.3;
		const y = isAir ? Phaser.Math.Between(380, 440) : 552;
		const key = isAir ? "saw" : "bomb";
		const obs = this.obstacles.getFirst(false, true, 860, y, key);

		if (obs) {
			obs.setActive(true).setVisible(true);
			const body = obs.body as Phaser.Physics.Arcade.Body;
			body.setVelocityX(-this.speed);
			body.setAllowGravity(false);
			body.setImmovable(true);
			if (isAir) {
				obs.setScale(0.7);
				this.tweens.add({ targets: obs, angle: 360, duration: 1000, repeat: -1 });
			} else {
				obs.setScale(1.5);
			}
		}
	}

	private spawnCoin() {
		if (this.isGameOver) return;

		const y = Phaser.Math.Between(350, 520);
		const coin = this.coins.getFirst(false, true, 860, y, "star");
		if (coin) {
			coin.setActive(true).setVisible(true);
			coin.setScale(0.4);
			const body = coin.body as Phaser.Physics.Arcade.Body;
			body.setVelocityX(-this.speed * 0.9);
			body.setAllowGravity(false);
		}
	}

	private collectCoin(_player: any, coin: any) {
		this.coins.killAndHide(coin);
		(coin.body as Phaser.Physics.Arcade.Body).stop();
		this.coinCount++;
		this.coinText.setText("⭐ " + this.coinCount);
		this.score += 50;
	}

	private hitObstacle() {
		if (this.isGameOver) return;
		this.isGameOver = true;

		this.physics.pause();
		this.player.setTint(0xff0000);
		this.player.anims.play("turn");
		this.spawnTimer.remove();
		this.coinTimer.remove();
		this.cameras.main.shake(200, 0.01);

		this.time.delayedCall(800, () => {
			this.scene.start("GameOverScene", { score: this.score, coins: this.coinCount });
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

	create(data: any) {
		const score = data.score ?? 0;
		const coins = data.coins ?? 0;

		this.add
			.text(400, 180, "${g.common.gameOver}", {
				fontSize: "48px",
				color: "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 270, "${g.common.finalScore}: " + score, {
				fontSize: "32px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 320, "⭐ " + coins, {
				fontSize: "24px",
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
