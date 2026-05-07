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
		makeTexture(this, "hero", 0x06b6d4, 28, 36);
		makeTexture(this, "npc", 0xa78bfa, 28, 36);
		makeTexture(this, "wall", 0x64748b, 40, 40);
		makeTexture(this, "floor", 0x365314, 40, 40);
		makeTexture(this, "chest", 0xfbbf24, 24, 24);

		this.add
			.text(400, 180, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		this.add
			.text(400, 260, "${g.rpg.subtitle}", {
				fontSize: "24px",
				color: "#a3e635",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const startBtn = this.add
			.text(400, 400, "${g.rpg.startAdventure}", {
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
			.text(400, 480, "${g.rpg.moveHint}", {
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

// 地图: 0=地面 1=墙壁 2=NPC 3=宝箱
const MAP = [
	[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	[1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1,0,0,0,0,0,0,2,0,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3,0,1],
	[1,1,1,0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
	[1,0,3,0,0,0,0,0,0,0,1,0,0,0,0,2,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
	[1,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const NPC_DIALOGS = [
	["${g.rpg.npcDialog1a}", "${g.rpg.npcDialog1b}"],
	["${g.rpg.npcDialog2a}", "${g.rpg.npcDialog2b}"],
	["${g.rpg.npcDialog3a}", "${g.rpg.npcDialog3b}", "${g.rpg.npcDialog3c}"],
];

export class GameScene extends Phaser.Scene {
	private hero;
	private walls;
	private npcs;
	private chests;
	private cursors;
	private dialogBox = null;
	private dialogTexts = [];
	private dialogIndex = 0;
	private chestsCollected = 0;
	private totalChests = 0;
	private statusText;

	constructor() {
		super("GameScene");
	}

	create() {
		this.chestsCollected = 0;
		this.totalChests = 0;
		this.dialogBox = null;

		this.walls = this.physics.add.staticGroup();
		this.npcs = this.physics.add.staticGroup();
		this.chests = this.physics.add.staticGroup();

		// 绘制地面
		for (let row = 0; row < MAP.length; row++) {
			for (let col = 0; col < MAP[row].length; col++) {
				const x = col * TILE + TILE / 2;
				const y = row * TILE + TILE / 2;
				const cell = MAP[row][col];

				this.add.image(x, y, "floor");

				if (cell === 1) {
					this.walls.create(x, y, "wall").refreshBody();
				} else if (cell === 2) {
					this.npcs.create(x, y, "npc").refreshBody();
				} else if (cell === 3) {
					this.chests.create(x, y, "chest").refreshBody();
					this.totalChests++;
				}
			}
		}

		// 英雄
		this.hero = this.physics.add.sprite(80, 80, "hero");
		this.hero.body.setCollideWorldBounds(true);

		this.physics.add.collider(this.hero, this.walls);
		this.physics.add.overlap(this.hero, this.npcs, this.talkToNpc, undefined, this);
		this.physics.add.overlap(this.hero, this.chests, this.openChest, undefined, this);

		this.cursors = this.input.keyboard.createCursorKeys();

		// 状态栏
		this.statusText = this.add
			.text(16, 16, this.getStatusStr(), {
				fontSize: "18px",
				color: "#fbbf24",
				fontFamily: "Arial",
				backgroundColor: "#00000088",
				padding: { x: 8, y: 4 },
			})
			.setScrollFactor(0)
			.setDepth(100);

		// 相机
		this.cameras.main.setBounds(0, 0, 20 * TILE, 15 * TILE);
		this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);
		this.physics.world.setBounds(0, 0, 20 * TILE, 15 * TILE);
	}

	update() {
		const speed = 160;

		if (this.dialogBox) {
			this.hero.body.setVelocity(0);
			return;
		}

		if (this.cursors.left.isDown) {
			this.hero.body.setVelocity(-speed, 0);
		} else if (this.cursors.right.isDown) {
			this.hero.body.setVelocity(speed, 0);
		} else if (this.cursors.up.isDown) {
			this.hero.body.setVelocity(0, -speed);
		} else if (this.cursors.down.isDown) {
			this.hero.body.setVelocity(0, speed);
		} else {
			this.hero.body.setVelocity(0);
		}
	}

	private getStatusStr() {
		return "${g.rpg.chests}: " + this.chestsCollected + " / " + this.totalChests;
	}

	private talkToNpc(_heroObj, npcObj) {
		if (this.dialogBox) return;

		const npcIndex = this.npcs.getChildren().indexOf(npcObj);
		this.dialogTexts = NPC_DIALOGS[npcIndex % NPC_DIALOGS.length];
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
			fontSize: "18px",
			color: "#ffffff",
			fontFamily: "Arial",
			wordWrap: { width: 560 },
		}).setOrigin(0.5);

		const hint = this.add.text(0, 25, "${g.rpg.clickContinue}", {
			fontSize: "13px",
			color: "#94a3b8",
			fontFamily: "Arial",
		}).setOrigin(0.5);

		this.dialogBox = this.add.container(400, 540, [bg, text, hint]);
		this.dialogBox.setDepth(200);

		this.dialogBox.setInteractive(
			new Phaser.Geom.Rectangle(-300, -40, 600, 80),
			Phaser.Geom.Rectangle.Contains,
		);
		this.dialogBox.on("pointerdown", () => {
			this.dialogIndex++;
			this.showDialog();
		});
	}

	private closeDialog() {
		if (this.dialogBox) {
			this.dialogBox.destroy();
			this.dialogBox = null;
		}
	}

	private openChest(_heroObj, chestObj) {
		chestObj.disableBody(true, true);
		this.chestsCollected++;
		this.statusText.setText(this.getStatusStr());

		if (this.chestsCollected >= this.totalChests) {
			this.time.delayedCall(300, () => {
				this.dialogTexts = ["${g.rpg.allChestsFound}"];
				this.dialogIndex = 0;
				this.showDialog();
			});
		}
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
