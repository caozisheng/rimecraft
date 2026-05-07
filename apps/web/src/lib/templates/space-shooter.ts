import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function spaceShooterTemplate(meta: ProjectMeta): TemplateFile[] {
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
		makeTexture(this, "ship", 0x06b6d4, 40, 32);
		makeTexture(this, "bullet", 0xfbbf24, 6, 14);
		makeTexture(this, "enemy", 0xef4444, 36, 28);

		this.add
			.text(400, 180, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 260, "${g.spaceShooter.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const startBtn = this.add
			.text(400, 400, "${g.spaceShooter.startBattle}", {
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
			.text(400, 480, "${g.spaceShooter.moveHint}", {
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
	private ship;
	private bullets;
	private enemies;
	private stars = [];
	private cursors;
	private fireKey;
	private score = 0;
	private lives = 3;
	private scoreText;
	private livesText;
	private lastFired = 0;

	constructor() {
		super("GameScene");
	}

	create() {
		this.score = 0;
		this.lives = 3;
		this.lastFired = 0;

		// 星空背景
		this.stars = [];
		for (let i = 0; i < 80; i++) {
			const x = Phaser.Math.Between(0, 800);
			const y = Phaser.Math.Between(0, 600);
			const size = Phaser.Math.Between(1, 3);
			const alpha = Math.random() * 0.6 + 0.2;
			const star = this.add.rectangle(x, y, size, size, 0xffffff, alpha);
			this.stars.push(star);
		}

		// 玩家飞船
		this.ship = this.physics.add.sprite(400, 520, "ship");
		this.ship.body.setCollideWorldBounds(true);

		// 子弹对象池
		this.bullets = this.physics.add.group({ maxSize: 20 });

		// 敌人对象池
		this.enemies = this.physics.add.group({ maxSize: 15 });

		// 碰撞检测
		this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
		this.physics.add.overlap(this.ship, this.enemies, this.hitShip, undefined, this);

		// 定时生成敌人
		this.time.addEvent({
			delay: 1000,
			loop: true,
			callback: this.spawnEnemy,
			callbackScope: this,
		});

		// 输入
		this.cursors = this.input.keyboard.createCursorKeys();
		this.fireKey = this.input.keyboard.addKey("SPACE");

		// UI
		this.scoreText = this.add
			.text(16, 16, "${g.common.score}: 0", {
				fontSize: "24px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setScrollFactor(0)
			.setDepth(100);

		this.livesText = this.add
			.text(784, 16, "❤️ " + this.lives, {
				fontSize: "24px",
				color: "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(1, 0)
			.setScrollFactor(0)
			.setDepth(100);
	}

	update(time) {
		// 移动飞船
		if (this.cursors.left.isDown) {
			this.ship.body.setVelocityX(-300);
		} else if (this.cursors.right.isDown) {
			this.ship.body.setVelocityX(300);
		} else {
			this.ship.body.setVelocityX(0);
		}

		if (this.cursors.up.isDown) {
			this.ship.body.setVelocityY(-300);
		} else if (this.cursors.down.isDown) {
			this.ship.body.setVelocityY(300);
		} else {
			this.ship.body.setVelocityY(0);
		}

		// 射击
		if (this.fireKey.isDown && time > this.lastFired + 200) {
			this.fireBullet();
			this.lastFired = time;
		}

		// 星空滚动
		for (const star of this.stars) {
			star.y += 1;
			if (star.y > 610) star.y = -10;
		}

		// 回收出屏子弹
		this.bullets.getChildren().forEach((b) => {
			if (b.active && b.y < -20) {
				this.bullets.killAndHide(b);
				b.body.stop();
			}
		});

		// 回收出屏敌人
		this.enemies.getChildren().forEach((e) => {
			if (e.active && e.y > 650) {
				this.enemies.killAndHide(e);
				e.body.stop();
			}
		});
	}

	private fireBullet() {
		const bullet = this.bullets.getFirst(false, true, this.ship.x, this.ship.y - 20, "bullet");

		if (bullet) {
			bullet.setActive(true).setVisible(true);
			bullet.body.setVelocityY(-500);
		}
	}

	private spawnEnemy() {
		const x = Phaser.Math.Between(50, 750);
		const enemy = this.enemies.getFirst(false, true, x, -30, "enemy");

		if (enemy) {
			enemy.setActive(true).setVisible(true);
			enemy.body.setVelocityY(Phaser.Math.Between(100, 250));
			enemy.body.setVelocityX(Phaser.Math.Between(-50, 50));
		}
	}

	private hitEnemy(bulletObj, enemyObj) {
		this.bullets.killAndHide(bulletObj);
		bulletObj.body.stop();
		this.enemies.killAndHide(enemyObj);
		enemyObj.body.stop();

		this.score += 100;
		this.scoreText.setText("${g.common.score}: " + this.score);
	}

	private hitShip(_shipObj, enemyObj) {
		this.enemies.killAndHide(enemyObj);
		enemyObj.body.stop();

		this.lives--;
		this.livesText.setText("❤️ " + this.lives);
		this.cameras.main.shake(150, 0.01);
		this.ship.setTint(0xff0000);
		this.time.delayedCall(100, () => this.ship.clearTint());

		if (this.lives <= 0) {
			this.physics.pause();
			this.time.delayedCall(500, () => {
				this.scene.start("GameOverScene", { score: this.score });
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

	create(data) {
		const score = data.score ?? 0;

		this.add
			.text(400, 180, "${g.spaceShooter.missionFailed}", {
				fontSize: "48px",
				color: "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 280, "${g.spaceShooter.enemiesDestroyed}: " + Math.floor(score / 100) + "${g.spaceShooter.enemyUnit ? " " + g.spaceShooter.enemyUnit : ""}", {
				fontSize: "28px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 330, "${g.spaceShooter.totalScore}: " + score, {
				fontSize: "24px",
				color: "#94a3b8",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const retryBtn = this.add
			.text(400, 430, "${g.spaceShooter.retryBattle}", {
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
			.text(400, 490, "${g.common.backToMenu}", {
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
