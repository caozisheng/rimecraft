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

export class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	preload() {
		this.load.spritesheet("dude", "/assets/sprites/dude.png", { frameWidth: 32, frameHeight: 48 });
		this.load.image("platform", "/assets/sprites/platform.png");
		this.load.image("sky", "/assets/skies/sky1.png");
		this.load.image("star", "/assets/demoscene/star.png");
		this.load.image("bomb", "/assets/sprites/bomb.png");
		this.load.image("wasp", "/assets/sprites/wasp.png");
		this.load.image("firstaid", "/assets/sprites/firstaid.png");
		this.load.image("shinyball", "/assets/sprites/shinyball.png");
	}

	create() {
		this.anims.create({ key: "left", frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
		this.anims.create({ key: "turn", frames: [{ key: "dude", frame: 4 }], frameRate: 20 });
		this.anims.create({ key: "right", frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

		this.add.rectangle(400, 300, 800, 600, 0x0f172a);

		this.add
			.text(400, 160, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 240, "${g.platformer.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const dude = this.add.sprite(400, 350, "dude").setScale(2);
		dude.play("right");
		this.tweens.add({ targets: dude, x: 500, duration: 1200, yoyo: true, repeat: -1, onYoyo: () => dude.play("left"), onRepeat: () => dude.play("right") });

		const startBtn = this.add
			.text(400, 440, "${g.common.startGame}", {
				fontSize: "28px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		startBtn.on("pointerdown", () => this.scene.start("GameScene", { level: 1 }));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add
			.text(400, 520, "${g.platformer.moveHint}", {
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

const LEVELS = [
	{
		platforms: [
			{ x: 400, y: 584, scaleX: 2 },
			{ x: 100, y: 460, scaleX: 0.5 },
			{ x: 400, y: 380, scaleX: 0.7 },
			{ x: 700, y: 300, scaleX: 0.5 },
			{ x: 250, y: 220, scaleX: 0.6 },
			{ x: 550, y: 140, scaleX: 0.5 },
		],
		movingPlatforms: [
			{ x: 550, y: 460, scaleX: 0.5, moveX: 150, speed: 2000 },
		],
		stars: [
			{ x: 100, y: 420 }, { x: 400, y: 340 }, { x: 700, y: 260 },
			{ x: 250, y: 180 }, { x: 550, y: 100 }, { x: 300, y: 540 }, { x: 600, y: 540 },
		],
		enemies: [
			{ x: 350, y: 354, minX: 310, maxX: 490 },
		],
		bombs: [{ x: 500, y: 360 }, { x: 150, y: 200 }],
		playerStart: { x: 100, y: 520 },
	},
	{
		platforms: [
			{ x: 400, y: 584, scaleX: 2 },
			{ x: 700, y: 480, scaleX: 0.5 },
			{ x: 300, y: 400, scaleX: 0.6 },
			{ x: 100, y: 300, scaleX: 0.5 },
			{ x: 500, y: 240, scaleX: 0.7 },
			{ x: 700, y: 160, scaleX: 0.5 },
			{ x: 300, y: 100, scaleX: 0.5 },
		],
		movingPlatforms: [
			{ x: 200, y: 480, scaleX: 0.5, moveX: 200, speed: 2500 },
			{ x: 400, y: 160, scaleX: 0.4, moveX: 100, speed: 1800 },
		],
		stars: [
			{ x: 700, y: 440 }, { x: 300, y: 360 }, { x: 100, y: 260 },
			{ x: 500, y: 200 }, { x: 700, y: 120 }, { x: 300, y: 60 },
			{ x: 200, y: 540 }, { x: 500, y: 540 },
		],
		enemies: [
			{ x: 250, y: 374, minX: 200, maxX: 400 },
			{ x: 500, y: 214, minX: 400, maxX: 600 },
		],
		bombs: [{ x: 650, y: 140 }],
		playerStart: { x: 100, y: 520 },
	},
	{
		platforms: [
			{ x: 400, y: 584, scaleX: 2 },
			{ x: 150, y: 490, scaleX: 0.4 },
			{ x: 650, y: 450, scaleX: 0.4 },
			{ x: 400, y: 380, scaleX: 0.5 },
			{ x: 150, y: 300, scaleX: 0.4 },
			{ x: 650, y: 240, scaleX: 0.4 },
			{ x: 400, y: 160, scaleX: 0.5 },
			{ x: 200, y: 90, scaleX: 0.4 },
		],
		movingPlatforms: [
			{ x: 350, y: 490, scaleX: 0.4, moveX: 200, speed: 1800 },
			{ x: 400, y: 240, scaleX: 0.4, moveX: 150, speed: 1500 },
			{ x: 550, y: 90, scaleX: 0.3, moveX: 120, speed: 1400 },
		],
		stars: [
			{ x: 150, y: 450 }, { x: 650, y: 410 }, { x: 400, y: 340 },
			{ x: 150, y: 260 }, { x: 650, y: 200 }, { x: 400, y: 120 },
			{ x: 200, y: 50 }, { x: 500, y: 540 }, { x: 700, y: 540 },
		],
		enemies: [
			{ x: 350, y: 354, minX: 300, maxX: 500 },
			{ x: 600, y: 214, minX: 550, maxX: 700 },
			{ x: 180, y: 274, minX: 100, maxX: 250 },
		],
		bombs: [{ x: 400, y: 140 }, { x: 200, y: 270 }],
		playerStart: { x: 100, y: 520 },
	},
];

export class GameScene extends Phaser.Scene {
	private player!: Phaser.Physics.Arcade.Sprite;
	private platforms!: Phaser.Physics.Arcade.StaticGroup;
	private movingPlatforms!: Phaser.Physics.Arcade.Group;
	private stars!: Phaser.Physics.Arcade.Group;
	private enemies!: Phaser.Physics.Arcade.Group;
	private bombs!: Phaser.Physics.Arcade.StaticGroup;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private score = 0;
	private level = 1;
	private lives = 1;
	private jumpCount = 0;
	private scoreText!: Phaser.GameObjects.Text;
	private levelText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;

	constructor() {
		super("GameScene");
	}

	init(data: any) {
		this.level = data.level || 1;
		this.score = data.score || 0;
		this.lives = data.lives ?? 1;
	}

	create() {
		this.score = this.score || 0;
		this.jumpCount = 0;

		this.add.image(400, 300, "sky");

		const lvl = LEVELS[(this.level - 1) % LEVELS.length];

		this.platforms = this.physics.add.staticGroup();
		for (const p of lvl.platforms) {
			this.platforms.create(p.x, p.y, "platform").setScale(p.scaleX, 0.5).refreshBody();
		}

		this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true });
		for (const mp of lvl.movingPlatforms) {
			const plat = this.movingPlatforms.create(mp.x, mp.y, "platform") as Phaser.Physics.Arcade.Sprite;
			plat.setScale(mp.scaleX, 0.5).refreshBody();
			(plat.body as Phaser.Physics.Arcade.Body).setImmovable(true);
			this.tweens.add({ targets: plat, x: mp.x + mp.moveX, duration: mp.speed, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
		}

		this.stars = this.physics.add.group({ allowGravity: false });
		for (const s of lvl.stars) {
			const star = this.stars.create(s.x, s.y, "star") as Phaser.Physics.Arcade.Sprite;
			star.setScale(0.5);
			this.tweens.add({ targets: star, y: s.y - 10, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
		}

		this.enemies = this.physics.add.group({ allowGravity: false });
		for (const e of lvl.enemies) {
			const wasp = this.enemies.create(e.x, e.y, "wasp") as Phaser.Physics.Arcade.Sprite;
			wasp.setScale(0.8);
			this.tweens.add({ targets: wasp, x: e.maxX, duration: 2000, yoyo: true, repeat: -1, ease: "Linear" });
		}

		this.bombs = this.physics.add.staticGroup();
		for (const b of lvl.bombs) {
			this.bombs.create(b.x, b.y, "bomb").refreshBody();
		}

		this.player = this.physics.add.sprite(lvl.playerStart.x, lvl.playerStart.y, "dude");
		this.player.setBounce(0.1);
		this.player.setCollideWorldBounds(true);

		this.physics.add.collider(this.player, this.platforms);
		this.physics.add.collider(this.player, this.movingPlatforms);
		this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);
		this.physics.add.overlap(this.player, this.enemies, this.hitDanger, undefined, this);
		this.physics.add.overlap(this.player, this.bombs, this.hitDanger, undefined, this);

		this.cursors = this.input.keyboard!.createCursorKeys();
		this.input.keyboard!.addKey("SPACE").on("down", () => this.jump());
		this.input.keyboard!.addKey("UP").on("down", () => this.jump());

		this.scoreText = this.add.text(16, 16, "${g.platformer.coins}: " + this.score, { fontSize: "24px", color: "#fbbf24", fontFamily: "Arial" }).setScrollFactor(0).setDepth(100);
		this.levelText = this.add.text(784, 16, "${g.platformer.level}" + this.level, { fontSize: "22px", color: "#a3e635", fontFamily: "Arial" }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
		this.livesText = this.add.text(400, 16, "\\u2764\\uFE0F " + this.lives, { fontSize: "22px", color: "#ef4444", fontFamily: "Arial" }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
	}

	update() {
		const body = this.player.body as Phaser.Physics.Arcade.Body;

		if (body.blocked.down) {
			this.jumpCount = 0;
		}

		if (this.cursors.left.isDown) {
			body.setVelocityX(-200);
			this.player.anims.play("left", true);
		} else if (this.cursors.right.isDown) {
			body.setVelocityX(200);
			this.player.anims.play("right", true);
		} else {
			body.setVelocityX(0);
			this.player.anims.play("turn");
		}

		if (this.player.y > 620) {
			this.loseLife();
		}

		this.movingPlatforms.getChildren().forEach((p: any) => {
			(p.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
		});
	}

	private jump() {
		const body = this.player.body as Phaser.Physics.Arcade.Body;
		if (body.blocked.down) {
			body.setVelocityY(-420);
			this.jumpCount = 1;
		} else if (this.jumpCount === 1) {
			body.setVelocityY(-380);
			this.jumpCount = 2;
			for (let i = 0; i < 6; i++) {
				const p = this.add.circle(
					this.player.x + Phaser.Math.Between(-10, 10),
					this.player.y + 20,
					Phaser.Math.Between(2, 5), 0x06b6d4, 0.8
				);
				this.tweens.add({
					targets: p,
					y: p.y + Phaser.Math.Between(10, 30),
					x: p.x + Phaser.Math.Between(-20, 20),
					alpha: 0, scale: 0, duration: 400,
					onComplete: () => p.destroy(),
				});
			}
		}
	}

	private collectStar(_player: any, star: any) {
		star.disableBody(true, true);
		this.score += 10;
		this.scoreText.setText("${g.platformer.coins}: " + this.score);

		for (let i = 0; i < 5; i++) {
			const spark = this.add.circle(
				star.x + Phaser.Math.Between(-8, 8),
				star.y + Phaser.Math.Between(-8, 8),
				Phaser.Math.Between(2, 4), 0xfbbf24, 1
			);
			this.tweens.add({
				targets: spark,
				y: spark.y - Phaser.Math.Between(15, 35),
				x: spark.x + Phaser.Math.Between(-20, 20),
				alpha: 0, duration: 350,
				onComplete: () => spark.destroy(),
			});
		}

		if (this.stars.countActive(true) === 0) {
			if (this.level < LEVELS.length) {
				this.time.delayedCall(500, () => {
					this.scene.start("GameScene", { level: this.level + 1, score: this.score, lives: this.lives });
				});
			} else {
				this.time.delayedCall(500, () => {
					this.scene.start("GameOverScene", { score: this.score, level: this.level, win: true });
				});
			}
		}
	}

	private hitDanger() {
		this.loseLife();
	}

	private loseLife() {
		this.lives--;
		if (this.lives <= 0) {
			this.physics.pause();
			this.player.setTint(0xff0000);
			this.player.anims.play("turn");
			this.cameras.main.shake(200, 0.01);
			this.time.delayedCall(600, () => {
				this.scene.start("GameOverScene", { score: this.score, level: this.level });
			});
		} else {
			this.cameras.main.shake(200, 0.01);
			this.player.setTint(0xff0000);
			this.livesText.setText("\\u2764\\uFE0F " + this.lives);
			this.time.delayedCall(200, () => {
				this.player.clearTint();
				const lvl = LEVELS[(this.level - 1) % LEVELS.length];
				this.player.setPosition(lvl.playerStart.x, lvl.playerStart.y);
				(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
			});
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
			.text(400, 180, win ? "${g.platformer.congratulations}" : "${g.common.gameOver}", {
				fontSize: "48px",
				color: win ? "#22c55e" : "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 260, "${g.platformer.coins}: " + score, {
				fontSize: "32px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		if (!win) {
			this.add
				.text(400, 310, "${g.platformer.level}" + (data.level ?? 1), {
					fontSize: "22px",
					color: "#94a3b8",
					fontFamily: "Arial",
				})
				.setOrigin(0.5);
		}

		if (win) {
			for (let i = 0; i < 25; i++) {
				const x = Phaser.Math.Between(50, 750);
				const y = Phaser.Math.Between(50, 550);
				const colors = [0xfbbf24, 0x22c55e, 0x06b6d4, 0xa78bfa, 0xf472b6];
				const dot = this.add.circle(x, y, Phaser.Math.Between(3, 6), Phaser.Utils.Array.GetRandom(colors));
				this.tweens.add({
					targets: dot,
					y: y - Phaser.Math.Between(40, 100),
					alpha: 0, duration: Phaser.Math.Between(800, 1500),
					delay: Phaser.Math.Between(0, 600),
					repeat: -1, repeatDelay: Phaser.Math.Between(200, 800),
				});
			}
		}

		const retryBtn = this.add
			.text(400, 400, "${g.platformer.tryAgain}", {
				fontSize: "24px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		retryBtn.on("pointerdown", () => this.scene.start("GameScene", { level: 1 }));
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
