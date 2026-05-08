import type { ProjectMeta } from "@rimecraft/core";
import type { TemplateFile } from "./index";
import { getMessages } from "@/i18n";

export function rpgTemplate(meta: ProjectMeta): TemplateFile[] {
	const g = getMessages().gameText;
	return [
		{
			path: "src/main.ts",
			content: `import Phaser from "phaser";
import { MenuScene } from "./scenes/menu-scene";
import { GameScene } from "./scenes/game-scene";
import { CombatScene } from "./scenes/combat-scene";

const config = {
	type: Phaser.AUTO,
	width: 800,
	height: 600,
	backgroundColor: "#1a2e1a",
	physics: {
		default: "arcade",
		arcade: {
			gravity: { x: 0, y: 0 },
			debug: false,
		},
	},
	scene: [MenuScene, GameScene, CombatScene],
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
		this.load.image("skull", "/assets/sprites/skull.png");
		this.load.image("ghost", "/assets/sprites/ghost.png");
		this.load.image("gem", "/assets/sprites/gem.png");
		this.load.image("firstaid", "/assets/sprites/firstaid.png");
	}

	create() {
		this.anims.create({ key: "walk-down", frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
		this.anims.create({ key: "walk-up", frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
		this.anims.create({ key: "idle", frames: [{ key: "dude", frame: 4 }], frameRate: 20 });

		this.add.rectangle(400, 300, 800, 600, 0x1a2e1a);

		this.add
			.text(400, 150, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 230, "${g.rpg.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const hero = this.add.sprite(370, 340, "dude").setScale(1.5);
		hero.play("walk-down");
		const skull = this.add.image(430, 340, "skull").setScale(0.8);
		this.tweens.add({ targets: skull, y: 335, duration: 800, yoyo: true, repeat: -1 });

		const startBtn = this.add
			.text(400, 430, "${g.rpg.startAdventure}", {
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
			.text(400, 510, "${g.rpg.moveHint}", {
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

const TILE = 40;

const ROOMS = [
	{
		name: "Village",
		map: [
			[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
			[1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
			[1,1,1,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,1,1,1,1,1,1,1,1,5,5,1,1,1,1,1,1,1,1,1],
		],
		npcs: [{ r: 2, c: 14, dialog: ["${g.rpg.npcDialog1a}", "${g.rpg.npcDialog1b}"] }],
		enemies: [],
		gems: [{ r: 4, c: 17 }, { r: 8, c: 2 }],
		potions: [{ r: 11, c: 15 }],
		playerStart: { r: 12, c: 10 },
		doors: [{ r: 14, c: 9, toRoom: 1, toR: 1, toC: 10 }, { r: 14, c: 10, toRoom: 1, toR: 1, toC: 10 }],
	},
	{
		name: "Forest",
		map: [
			[1,1,1,1,1,1,1,1,1,5,5,1,1,1,1,1,1,1,1,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
			[1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
			[1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
			[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
		],
		npcs: [{ r: 5, c: 3, dialog: ["${g.rpg.npcDialog2a}", "${g.rpg.npcDialog2b}"] }],
		enemies: [{ r: 8, c: 10, type: "skull" }, { r: 3, c: 16, type: "ghost" }],
		gems: [{ r: 1, c: 17 }, { r: 12, c: 2 }, { r: 9, c: 9 }],
		potions: [{ r: 6, c: 9 }],
		playerStart: { r: 1, c: 10 },
		doors: [{ r: 0, c: 9, toRoom: 0, toR: 13, toC: 10 }, { r: 0, c: 10, toRoom: 0, toR: 13, toC: 10 }],
	},
];

export class GameScene extends Phaser.Scene {
	private hero!: Phaser.Physics.Arcade.Sprite;
	private walls!: Phaser.Physics.Arcade.StaticGroup;
	private npcSprites!: Phaser.Physics.Arcade.StaticGroup;
	private gemSprites!: Phaser.Physics.Arcade.Group;
	private potionSprites!: Phaser.Physics.Arcade.Group;
	private enemySprites!: Phaser.Physics.Arcade.Group;
	private doorZones!: Phaser.Physics.Arcade.StaticGroup;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private dialogBox: Phaser.GameObjects.Container | null = null;
	private dialogTexts: string[] = [];
	private dialogIndex = 0;
	private currentRoom = 0;
	private inventory = { gems: 0, potions: 2 };
	private hp = 100;
	private statusText!: Phaser.GameObjects.Text;
	private floorTiles: Phaser.GameObjects.Rectangle[] = [];

	constructor() {
		super("GameScene");
	}

	init(data: any) {
		if (data.room !== undefined) this.currentRoom = data.room;
		if (data.inventory) this.inventory = data.inventory;
		if (data.hp !== undefined) this.hp = data.hp;
		if (data.playerR !== undefined) this.registry.set("startR", data.playerR);
		if (data.playerC !== undefined) this.registry.set("startC", data.playerC);
	}

	create() {
		this.dialogBox = null;
		this.floorTiles = [];
		this.loadRoom(this.currentRoom);

		this.cursors = this.input.keyboard!.createCursorKeys();

		this.statusText = this.add
			.text(16, 16, this.getStatus(), {
				fontSize: "16px",
				color: "#fbbf24",
				fontFamily: "Arial",
				backgroundColor: "#00000088",
				padding: { x: 8, y: 4 },
			})
			.setScrollFactor(0)
			.setDepth(100);

		this.cameras.main.setBounds(0, 0, 20 * TILE, 15 * TILE);
		this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);
		this.physics.world.setBounds(0, 0, 20 * TILE, 15 * TILE);
	}

	private loadRoom(idx: number) {
		const room = ROOMS[idx];

		this.walls = this.physics.add.staticGroup();
		this.npcSprites = this.physics.add.staticGroup();
		this.gemSprites = this.physics.add.group({ allowGravity: false });
		this.potionSprites = this.physics.add.group({ allowGravity: false });
		this.enemySprites = this.physics.add.group({ allowGravity: false });
		this.doorZones = this.physics.add.staticGroup();

		for (let r = 0; r < room.map.length; r++) {
			for (let c = 0; c < room.map[r].length; c++) {
				const x = c * TILE + TILE / 2;
				const y = r * TILE + TILE / 2;
				const cell = room.map[r][c];

				const floor = this.add.rectangle(x, y, TILE, TILE, 0x365314);
				this.floorTiles.push(floor);

				if (cell === 1) {
					const wall = this.add.rectangle(x, y, TILE, TILE, 0x64748b);
					this.physics.add.existing(wall, true);
					this.walls.add(wall);
				} else if (cell === 5) {
					const door = this.add.rectangle(x, y, TILE, TILE, 0x854d0e);
					this.physics.add.existing(door, true);
					this.doorZones.add(door);
					const doorData = room.doors.find(d => d.r === r && d.c === c);
					if (doorData) {
						door.setData("toRoom", doorData.toRoom);
						door.setData("toR", doorData.toR);
						door.setData("toC", doorData.toC);
					}
				}
			}
		}

		for (const npc of room.npcs) {
			const sprite = this.add.rectangle(npc.c * TILE + TILE / 2, npc.r * TILE + TILE / 2, 28, 36, 0xa78bfa);
			this.physics.add.existing(sprite, true);
			this.npcSprites.add(sprite);
			sprite.setData("dialog", npc.dialog);
		}

		for (const g of room.gems) {
			const sprite = this.gemSprites.create(g.c * TILE + TILE / 2, g.r * TILE + TILE / 2, "gem") as Phaser.Physics.Arcade.Sprite;
			sprite.setScale(0.6);
			this.tweens.add({ targets: sprite, y: sprite.y - 5, duration: 600, yoyo: true, repeat: -1 });
		}

		for (const p of room.potions) {
			const sprite = this.potionSprites.create(p.c * TILE + TILE / 2, p.r * TILE + TILE / 2, "firstaid") as Phaser.Physics.Arcade.Sprite;
			sprite.setScale(0.5);
		}

		for (const e of room.enemies) {
			const sprite = this.enemySprites.create(e.c * TILE + TILE / 2, e.r * TILE + TILE / 2, e.type) as Phaser.Physics.Arcade.Sprite;
			sprite.setScale(0.7);
			sprite.setData("type", e.type);
			this.tweens.add({ targets: sprite, x: sprite.x + 40, duration: 1500, yoyo: true, repeat: -1 });
		}

		const startR = this.registry.get("startR") ?? room.playerStart.r;
		const startC = this.registry.get("startC") ?? room.playerStart.c;
		this.registry.remove("startR");
		this.registry.remove("startC");

		this.hero = this.physics.add.sprite(startC * TILE + TILE / 2, startR * TILE + TILE / 2, "dude");
		this.hero.setCollideWorldBounds(true);

		this.physics.add.collider(this.hero, this.walls);
		this.physics.add.overlap(this.hero, this.npcSprites, this.talkToNpc as any, undefined, this);
		this.physics.add.overlap(this.hero, this.gemSprites, this.collectGem as any, undefined, this);
		this.physics.add.overlap(this.hero, this.potionSprites, this.collectPotion as any, undefined, this);
		this.physics.add.overlap(this.hero, this.enemySprites, this.encounterEnemy as any, undefined, this);
		this.physics.add.overlap(this.hero, this.doorZones, this.enterDoor as any, undefined, this);
	}

	update() {
		const speed = 160;

		if (this.dialogBox) {
			(this.hero.body as Phaser.Physics.Arcade.Body).setVelocity(0);
			return;
		}

		if (this.cursors.left.isDown) {
			(this.hero.body as Phaser.Physics.Arcade.Body).setVelocity(-speed, 0);
			this.hero.anims.play("walk-down", true);
		} else if (this.cursors.right.isDown) {
			(this.hero.body as Phaser.Physics.Arcade.Body).setVelocity(speed, 0);
			this.hero.anims.play("walk-up", true);
		} else if (this.cursors.up.isDown) {
			(this.hero.body as Phaser.Physics.Arcade.Body).setVelocity(0, -speed);
			this.hero.anims.play("walk-up", true);
		} else if (this.cursors.down.isDown) {
			(this.hero.body as Phaser.Physics.Arcade.Body).setVelocity(0, speed);
			this.hero.anims.play("walk-down", true);
		} else {
			(this.hero.body as Phaser.Physics.Arcade.Body).setVelocity(0);
			this.hero.anims.play("idle");
		}
	}

	private getStatus() {
		return "${g.rpg.hp}: " + this.hp + "  ${g.rpg.potions}: " + this.inventory.potions + "  ${g.rpg.gems}: " + this.inventory.gems;
	}

	private talkToNpc(_hero: any, npc: any) {
		if (this.dialogBox) return;
		this.dialogTexts = npc.getData("dialog");
		this.dialogIndex = 0;
		this.showDialog();
	}

	private showDialog() {
		if (this.dialogIndex >= this.dialogTexts.length) {
			this.closeDialog();
			return;
		}

		if (this.dialogBox) this.dialogBox.destroy();

		const bg = this.add.rectangle(0, 0, 600, 80, 0x000000, 0.85);
		bg.setStrokeStyle(2, 0x06b6d4);

		const text = this.add.text(0, -10, this.dialogTexts[this.dialogIndex], {
			fontSize: "17px", color: "#ffffff", fontFamily: "Arial", wordWrap: { width: 560 },
		}).setOrigin(0.5);

		const hint = this.add.text(0, 25, "${g.rpg.clickContinue}", {
			fontSize: "13px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.dialogBox = this.add.container(400, 540, [bg, text, hint]).setDepth(200);
		this.dialogBox.setInteractive(new Phaser.Geom.Rectangle(-300, -40, 600, 80), Phaser.Geom.Rectangle.Contains);
		this.dialogBox.on("pointerdown", () => { this.dialogIndex++; this.showDialog(); });
	}

	private closeDialog() {
		if (this.dialogBox) { this.dialogBox.destroy(); this.dialogBox = null; }
	}

	private collectGem(_hero: any, gem: any) {
		gem.disableBody(true, true);
		this.inventory.gems++;
		this.statusText.setText(this.getStatus());
	}

	private collectPotion(_hero: any, potion: any) {
		potion.disableBody(true, true);
		this.inventory.potions++;
		this.statusText.setText(this.getStatus());
	}

	private encounterEnemy(_hero: any, enemy: any) {
		const type = enemy.getData("type");
		enemy.disableBody(true, true);
		this.scene.start("CombatScene", {
			enemyType: type,
			hp: this.hp,
			inventory: { ...this.inventory },
			room: this.currentRoom,
		});
	}

	private enterDoor(_hero: any, door: any) {
		const toRoom = door.getData("toRoom");
		const toR = door.getData("toR");
		const toC = door.getData("toC");
		if (toRoom === undefined) return;
		this.scene.start("GameScene", {
			room: toRoom,
			playerR: toR,
			playerC: toC,
			hp: this.hp,
			inventory: { ...this.inventory },
		});
	}
}
`,
		},
		{
			path: "src/scenes/combat-scene.ts",
			content: `import Phaser from "phaser";

export class CombatScene extends Phaser.Scene {
	private playerHP = 100;
	private enemyHP = 0;
	private enemyMaxHP = 0;
	private inventory = { gems: 0, potions: 0 };
	private room = 0;
	private enemyType = "skull";
	private isPlayerTurn = true;
	private turnText!: Phaser.GameObjects.Text;
	private playerHPText!: Phaser.GameObjects.Text;
	private enemyHPText!: Phaser.GameObjects.Text;
	private logText!: Phaser.GameObjects.Text;
	private enemySprite!: Phaser.GameObjects.Image;
	private attackBtn!: Phaser.GameObjects.Text;
	private potionBtn!: Phaser.GameObjects.Text;

	constructor() {
		super("CombatScene");
	}

	init(data: any) {
		this.playerHP = data.hp ?? 100;
		this.inventory = data.inventory ?? { gems: 0, potions: 2 };
		this.room = data.room ?? 0;
		this.enemyType = data.enemyType ?? "skull";
		this.enemyMaxHP = this.enemyType === "ghost" ? 40 : 30;
		this.enemyHP = this.enemyMaxHP;
		this.isPlayerTurn = true;
	}

	create() {
		this.add.rectangle(400, 300, 800, 600, 0x1e293b);

		this.enemySprite = this.add.image(400, 180, this.enemyType).setScale(2);
		this.tweens.add({ targets: this.enemySprite, y: 175, duration: 800, yoyo: true, repeat: -1 });

		this.enemyHPText = this.add.text(400, 260, "${g.rpg.hp}: " + this.enemyHP + "/" + this.enemyMaxHP, {
			fontSize: "20px", color: "#ef4444", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(400, 380, "🧑 Hero", { fontSize: "22px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5);
		this.playerHPText = this.add.text(400, 410, "${g.rpg.hp}: " + this.playerHP, {
			fontSize: "20px", color: "#22c55e", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.turnText = this.add.text(400, 310, "${g.rpg.yourTurn}", {
			fontSize: "18px", color: "#fbbf24", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.logText = this.add.text(400, 340, "", {
			fontSize: "15px", color: "#94a3b8", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.attackBtn = this.add.text(300, 480, "${g.rpg.attack}", {
			fontSize: "22px", color: "#ef4444", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });

		this.potionBtn = this.add.text(500, 480, "${g.rpg.usePotion}", {
			fontSize: "22px", color: "#22c55e", fontFamily: "Arial",
		}).setOrigin(0.5).setInteractive({ useHandCursor: true });

		this.attackBtn.on("pointerdown", () => this.playerAttack());
		this.potionBtn.on("pointerdown", () => this.usePotion());

		this.updateButtons();
	}

	private updateButtons() {
		this.attackBtn.setAlpha(this.isPlayerTurn ? 1 : 0.4);
		this.potionBtn.setAlpha(this.isPlayerTurn ? 1 : 0.4);
		this.potionBtn.setText("${g.rpg.usePotion} (" + this.inventory.potions + ")");
	}

	private playerAttack() {
		if (!this.isPlayerTurn) return;
		this.isPlayerTurn = false;

		const dmg = Phaser.Math.Between(8, 18);
		this.enemyHP = Math.max(0, this.enemyHP - dmg);
		this.enemyHPText.setText("${g.rpg.hp}: " + this.enemyHP + "/" + this.enemyMaxHP);
		this.logText.setText("-" + dmg + " dmg!");

		this.tweens.add({ targets: this.enemySprite, x: this.enemySprite.x + 15, duration: 50, yoyo: true, repeat: 2 });

		if (this.enemyHP <= 0) {
			this.logText.setText("${g.rpg.enemyDefeated}");
			this.time.delayedCall(1200, () => {
				this.scene.start("GameScene", { room: this.room, hp: this.playerHP, inventory: this.inventory });
			});
			return;
		}

		this.time.delayedCall(800, () => this.enemyTurn());
	}

	private usePotion() {
		if (!this.isPlayerTurn) return;
		if (this.inventory.potions <= 0) {
			this.logText.setText("${g.rpg.noPotions}");
			return;
		}

		this.isPlayerTurn = false;
		this.inventory.potions--;
		const heal = 30;
		this.playerHP = Math.min(100, this.playerHP + heal);
		this.playerHPText.setText("${g.rpg.hp}: " + this.playerHP);
		this.logText.setText("+" + heal + " HP!");
		this.updateButtons();

		this.time.delayedCall(800, () => this.enemyTurn());
	}

	private enemyTurn() {
		this.turnText.setText("${g.rpg.enemyTurn}");
		this.updateButtons();

		this.time.delayedCall(600, () => {
			const dmg = Phaser.Math.Between(5, 15);
			this.playerHP = Math.max(0, this.playerHP - dmg);
			this.playerHPText.setText("${g.rpg.hp}: " + this.playerHP);
			this.logText.setText("-" + dmg + " dmg!");

			this.cameras.main.shake(100, 0.005);

			if (this.playerHP <= 0) {
				this.logText.setText("💀 Defeated!");
				this.time.delayedCall(1500, () => {
					this.scene.start("MenuScene");
				});
				return;
			}

			this.time.delayedCall(600, () => {
				this.isPlayerTurn = true;
				this.turnText.setText("${g.rpg.yourTurn}");
				this.updateButtons();
			});
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
