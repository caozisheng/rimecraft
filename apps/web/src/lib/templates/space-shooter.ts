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

export class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	preload() {
		this.load.image("ship", "/assets/sprites/shmup-ship.png");
		this.load.image("invader", "/assets/sprites/space-baddie.png");
		this.load.image("ufo", "/assets/sprites/ufo.png");
		this.load.image("bullet", "/assets/sprites/shmup-bullet.png");
		this.load.image("enemy-bullet", "/assets/sprites/bullets/bullet7.png");
		this.load.image("starfield", "/assets/skies/starfield.png");
		this.load.spritesheet("explosion", "/assets/sprites/explosion.png", { frameWidth: 64, frameHeight: 64 });
		this.load.image("firstaid", "/assets/sprites/firstaid.png");
		this.load.image("shinyball", "/assets/sprites/shinyball.png");
	}

	create() {
		this.anims.create({ key: "explode", frames: this.anims.generateFrameNumbers("explosion", { start: 0, end: 15 }), frameRate: 24, hideOnComplete: true });

		this.add.image(400, 300, "starfield");

		this.add
			.text(400, 150, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 230, "${g.spaceShooter.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const ship = this.add.image(400, 340, "ship").setScale(1.5);
		this.tweens.add({ targets: ship, y: 350, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

		const startBtn = this.add
			.text(400, 430, "${g.spaceShooter.startBattle}", {
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
			.text(400, 510, "${g.spaceShooter.moveHint}", {
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

const WAVES = [
	{ count: 6, speed: 120, hp: 1, type: "invader", interval: 800 },
	{ count: 8, speed: 150, hp: 1, type: "invader", interval: 600 },
	{ count: 5, speed: 100, hp: 2, type: "ufo", interval: 1000 },
];

export class GameScene extends Phaser.Scene {
	private ship!: Phaser.Physics.Arcade.Sprite;
	private bullets!: Phaser.Physics.Arcade.Group;
	private enemyBullets!: Phaser.Physics.Arcade.Group;
	private enemies!: Phaser.Physics.Arcade.Group;
	private powerups!: Phaser.Physics.Arcade.Group;
	private starfield!: Phaser.GameObjects.TileSprite;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private fireKey!: Phaser.Input.Keyboard.Key;
	private score = 0;
	private lives = 3;
	private wave = 0;
	private enemiesLeft = 0;
	private tripleShot = false;
	private tripleShotTimer = 0;
	private lastFired = 0;
	private scoreText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;
	private waveText!: Phaser.GameObjects.Text;
	private bossHP = 0;
	private bossMaxHP = 0;
	private bossBar!: Phaser.GameObjects.Graphics;
	private isBossWave = false;

	constructor() {
		super("GameScene");
	}

	create() {
		this.score = 0;
		this.lives = 3;
		this.wave = 0;
		this.tripleShot = false;
		this.isBossWave = false;
		this.lastFired = 0;

		this.starfield = this.add.tileSprite(400, 300, 800, 600, "starfield");

		this.ship = this.physics.add.sprite(400, 520, "ship");
		this.ship.setCollideWorldBounds(true);

		this.bullets = this.physics.add.group({ maxSize: 30 });
		this.enemyBullets = this.physics.add.group({ maxSize: 20 });
		this.enemies = this.physics.add.group();
		this.powerups = this.physics.add.group({ allowGravity: false, maxSize: 3 });

		this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
		this.physics.add.overlap(this.ship, this.enemies, this.hitShip, undefined, this);
		this.physics.add.overlap(this.ship, this.enemyBullets, this.hitByBullet, undefined, this);
		this.physics.add.overlap(this.ship, this.powerups, this.collectPowerup, undefined, this);

		this.cursors = this.input.keyboard!.createCursorKeys();
		this.fireKey = this.input.keyboard!.addKey("SPACE");

		this.scoreText = this.add.text(16, 16, "${g.common.score}: 0", { fontSize: "22px", color: "#ffffff", fontFamily: "Arial" }).setDepth(100);
		this.livesText = this.add.text(784, 16, "❤️ " + this.lives, { fontSize: "22px", color: "#ef4444", fontFamily: "Arial" }).setOrigin(1, 0).setDepth(100);
		this.waveText = this.add.text(400, 16, "Wave 1", { fontSize: "20px", color: "#a3e635", fontFamily: "Arial" }).setOrigin(0.5, 0).setDepth(100);

		this.bossBar = this.add.graphics().setDepth(100);

		this.startWave();
	}

	update(time: number) {
		this.starfield.tilePositionY -= 1;

		if (this.cursors.left.isDown) this.ship.setVelocityX(-300);
		else if (this.cursors.right.isDown) this.ship.setVelocityX(300);
		else this.ship.setVelocityX(0);

		if (this.cursors.up.isDown) this.ship.setVelocityY(-300);
		else if (this.cursors.down.isDown) this.ship.setVelocityY(300);
		else this.ship.setVelocityY(0);

		if (this.fireKey.isDown && time > this.lastFired + 180) {
			this.fireBullet();
			this.lastFired = time;
		}

		if (this.tripleShot && time > this.tripleShotTimer) {
			this.tripleShot = false;
		}

		this.bullets.getChildren().forEach((b: any) => { if (b.active && b.y < -20) { this.bullets.killAndHide(b); b.body.stop(); } });
		this.enemyBullets.getChildren().forEach((b: any) => { if (b.active && b.y > 620) { this.enemyBullets.killAndHide(b); b.body.stop(); } });
		this.enemies.getChildren().forEach((e: any) => { if (e.active && e.y > 650) { this.enemies.killAndHide(e); e.body.stop(); e.body.enable = false; if (this.enemiesLeft > 0) this.enemiesLeft--; } });
		this.powerups.getChildren().forEach((p: any) => { if (p.active && p.y > 620) { this.powerups.killAndHide(p); p.body.stop(); } });

		if (this.isBossWave) {
			this.bossBar.clear();
			if (this.bossHP > 0) {
				const w = 200 * (this.bossHP / this.bossMaxHP);
				this.bossBar.fillStyle(0xef4444, 1);
				this.bossBar.fillRect(300, 50, w, 10);
				this.bossBar.lineStyle(1, 0xffffff, 0.5);
				this.bossBar.strokeRect(300, 50, 200, 10);
			}
		}

		if (this.enemiesLeft === 0 && this.enemies.countActive() === 0 && !this.isBossWave) {
			this.enemiesLeft = -1;
			this.wave++;
			this.waveText.setText("Wave " + (this.wave + 1));
			if (this.wave < WAVES.length) {
				this.time.delayedCall(1500, () => this.startWave());
			} else if (this.wave === WAVES.length) {
				this.time.delayedCall(1500, () => this.startBoss());
			}
		}
	}

	private startWave() {
		const w = WAVES[this.wave];
		this.enemiesLeft = w.count;
		this.waveText.setText("Wave " + (this.wave + 1));

		let spawned = 0;
		const timer = this.time.addEvent({
			delay: w.interval,
			repeat: w.count - 1,
			callback: () => {
				const x = Phaser.Math.Between(60, 740);
				const enemy = this.enemies.create(x, -40, w.type) as Phaser.Physics.Arcade.Sprite;
				enemy.setActive(true).setVisible(true);
				enemy.body.enable = true;
				enemy.setData("hp", w.hp);
				(enemy.body as Phaser.Physics.Arcade.Body).setVelocityY(w.speed);
				(enemy.body as Phaser.Physics.Arcade.Body).setVelocityX(Phaser.Math.Between(-40, 40));

				if (Math.random() < 0.3) {
					this.time.delayedCall(Phaser.Math.Between(500, 1500), () => {
						if (enemy.active) this.enemyShoot(enemy);
					});
				}

				spawned++;
			},
		});
	}

	private startBoss() {
		this.isBossWave = true;
		this.waveText.setText("⚠ BOSS ⚠");

		this.bossHP = 15;
		this.bossMaxHP = 15;

		const boss = this.enemies.create(400, -60, "ufo") as Phaser.Physics.Arcade.Sprite;
		boss.setActive(true).setVisible(true);
		boss.body.enable = true;
		boss.setScale(3);
		boss.setData("hp", this.bossHP);
		boss.setData("isBoss", true);
		const body = boss.body as Phaser.Physics.Arcade.Body;
		body.setVelocityY(0);
		body.setCollideWorldBounds(true);

		this.tweens.add({ targets: boss, y: 80, duration: 1500, ease: "Sine.easeOut", onComplete: () => {
			this.tweens.add({ targets: boss, x: 650, duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
			this.time.addEvent({ delay: 800, loop: true, callback: () => { if (boss.active) this.enemyShoot(boss); } });
		}});

		this.enemiesLeft = 1;
	}

	private enemyShoot(enemy: Phaser.Physics.Arcade.Sprite) {
		const b = this.enemyBullets.getFirst(false, true, enemy.x, enemy.y + 20, "enemy-bullet");
		if (b) {
			b.setActive(true).setVisible(true);
			b.setScale(0.8);
			(b.body as Phaser.Physics.Arcade.Body).setVelocityY(250);
		}
	}

	private fireBullet() {
		if (this.tripleShot) {
			for (const offsetX of [-15, 0, 15]) {
				const b = this.bullets.getFirst(false, true, this.ship.x + offsetX, this.ship.y - 20, "bullet");
				if (b) { b.setActive(true).setVisible(true); (b.body as Phaser.Physics.Arcade.Body).setVelocityY(-500); }
			}
		} else {
			const b = this.bullets.getFirst(false, true, this.ship.x, this.ship.y - 20, "bullet");
			if (b) { b.setActive(true).setVisible(true); (b.body as Phaser.Physics.Arcade.Body).setVelocityY(-500); }
		}
	}

	private hitEnemy(bulletObj: any, enemyObj: any) {
		if (!bulletObj.active || !enemyObj.active) return;
		this.bullets.killAndHide(bulletObj);
		bulletObj.body.stop();

		let hp = enemyObj.getData("hp") - 1;
		enemyObj.setData("hp", hp);

		if (enemyObj.getData("isBoss")) {
			this.bossHP = hp;
		}

		if (hp <= 0) {
			const ex = this.add.sprite(enemyObj.x, enemyObj.y, "explosion").setDepth(20);
			ex.play("explode");
			ex.once("animationcomplete", () => ex.destroy());
			this.time.delayedCall(1000, () => { if (ex.active) ex.destroy(); });

			if (enemyObj.getData("isBoss")) {
				this.bossBar.clear();
				this.score += 500;
			} else {
				this.score += 100;
				if (this.enemiesLeft > 0) this.enemiesLeft--;
			}

			this.enemies.killAndHide(enemyObj);
			enemyObj.body.stop();
			enemyObj.body.enable = false;
			this.scoreText.setText("${g.common.score}: " + this.score);

			if (Math.random() < 0.1 && !enemyObj.getData("isBoss")) this.spawnPowerup(enemyObj.x, enemyObj.y);

			if (enemyObj.getData("isBoss")) {
				this.isBossWave = false;
				this.physics.pause();
				this.time.delayedCall(1000, () => {
					this.scene.start("GameOverScene", { score: this.score, win: true });
				});
			}
		} else {
			enemyObj.setTint(0xff6666);
			this.time.delayedCall(60, () => { if (enemyObj.active) enemyObj.clearTint(); });
		}
	}

	private spawnPowerup(x: number, y: number) {
		const type = Math.random() < 0.5 ? "firstaid" : "shinyball";
		const p = this.powerups.getFirst(false, true, x, y, type);
		if (!p) return;
		p.setActive(true).setVisible(true);
		p.setScale(0.8);
		p.setData("type", type);
		(p.body as Phaser.Physics.Arcade.Body).setVelocityY(80);
	}

	private collectPowerup(_ship: any, powerup: any) {
		const type = powerup.getData("type");
		powerup.destroy();

		if (type === "firstaid") {
			this.lives = Math.min(this.lives + 1, 5);
			this.livesText.setText("❤️ " + this.lives);
		} else {
			this.tripleShot = true;
			this.tripleShotTimer = this.time.now + 8000;
		}
	}

	private hitShip(_shipObj: any, enemyObj: any) {
		if (!enemyObj.active) return;
		this.enemies.killAndHide(enemyObj);
		enemyObj.body.stop();
		enemyObj.body.enable = false;
		if (this.enemiesLeft > 0) this.enemiesLeft--;
		this.takeDamage();
	}

	private hitByBullet(_shipObj: any, bulletObj: any) {
		if (!bulletObj.active) return;
		this.enemyBullets.killAndHide(bulletObj);
		bulletObj.body.stop();
		this.takeDamage();
	}

	private takeDamage() {
		this.lives--;
		this.livesText.setText("❤️ " + this.lives);
		this.cameras.main.shake(150, 0.01);
		this.ship.setTint(0xff0000);
		this.time.delayedCall(100, () => this.ship.clearTint());

		if (this.lives <= 0) {
			this.physics.pause();
			this.time.delayedCall(500, () => {
				this.scene.start("GameOverScene", { score: this.score, win: false });
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

		this.add.image(400, 300, "starfield");

		this.add
			.text(400, 180, win ? "🎉 Victory!" : "${g.spaceShooter.missionFailed}", {
				fontSize: "44px",
				color: win ? "#22c55e" : "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 270, "${g.spaceShooter.enemiesDestroyed}: " + Math.floor(score / 100) + (("${g.spaceShooter.enemyUnit}") ? " ${g.spaceShooter.enemyUnit}" : ""), {
				fontSize: "26px",
				color: "#fbbf24",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 320, "${g.spaceShooter.totalScore}: " + score, {
				fontSize: "22px",
				color: "#94a3b8",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const retryBtn = this.add
			.text(400, 420, "${g.spaceShooter.retryBattle}", {
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
	gravity: 0,
	debug: false,
};
`,
		},
	];
}
