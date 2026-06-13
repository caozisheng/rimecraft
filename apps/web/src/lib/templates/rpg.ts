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
import { GameOverScene } from "./scenes/game-over-scene";

const config = {
	type: Phaser.AUTO,
	width: 800,
	height: 600,
	backgroundColor: "#1a1a2e",
	physics: {
		default: "arcade",
		arcade: { gravity: { x: 0, y: 0 }, debug: false },
	},
	scene: [MenuScene, GameScene, CombatScene, GameOverScene],
};

new Phaser.Game(config);
`,
		},
		{
			path: "src/scenes/menu-scene.ts",
			content: `import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
	constructor() { super("MenuScene"); }

	preload() {
		this.load.spritesheet("dude", "/assets/sprites/dude.png", { frameWidth: 32, frameHeight: 48 });
		this.load.image("skull", "/assets/sprites/skull.png");
		this.load.image("ghost", "/assets/sprites/ghost.png");
		this.load.image("gem", "/assets/sprites/gem.png");
		this.load.image("firstaid", "/assets/sprites/firstaid.png");
		this.load.image("clown", "/assets/sprites/clown.png");
	}

	create() {
		this.anims.create({ key: "walk-down", frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
		this.anims.create({ key: "walk-up", frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
		this.anims.create({ key: "idle", frames: [{ key: "dude", frame: 4 }], frameRate: 20 });

		this.add.rectangle(400, 300, 800, 600, 0x1a2e1a);
		this.add.text(400, 120, "${meta.name}", { fontSize: "48px", color: "#ffffff", fontFamily: "Arial" }).setOrigin(0.5);
		this.add.text(400, 190, "${g.rpg.subtitle}", { fontSize: "24px", color: "#a3e635", fontFamily: "Arial" }).setOrigin(0.5);

		this.add.text(400, 260, "${g.rpg.storyIntro}", { fontSize: "16px", color: "#94a3b8", fontFamily: "Arial", align: "center", wordWrap: { width: 600 } }).setOrigin(0.5);

		const hero = this.add.sprite(370, 370, "dude").setScale(1.5);
		hero.play("walk-down");
		const skull = this.add.image(440, 370, "skull").setScale(0.8);
		this.tweens.add({ targets: skull, y: 365, duration: 800, yoyo: true, repeat: -1 });

		const startBtn = this.add.text(400, 460, "${g.rpg.startAdventure}", { fontSize: "28px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
		startBtn.on("pointerdown", () => this.scene.start("GameScene"));
		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));

		this.add.text(400, 540, "${g.rpg.moveHint}", { fontSize: "16px", color: "#94a3b8", fontFamily: "Arial" }).setOrigin(0.5);
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";

const TILE = 40;
const COLS = 20;
const ROWS = 15;

const WEAPONS = [
	{ name: "${g.rpg.weaponWood}", atk: 10 },
	{ name: "${g.rpg.weaponIron}", atk: 30 },
	{ name: "${g.rpg.weaponLegend}", atk: 60 },
];

const ARMORS = [
	{ name: "${g.rpg.armorCloth}", def: 5 },
	{ name: "${g.rpg.armorLeather}", def: 20 },
	{ name: "${g.rpg.armorSilk}", def: 50 },
];

interface NpcDef {
	r: number; c: number; color: number; name: string;
	dialog: string[]; questId: number; requiresQuest: number;
}

interface EnemyDef {
	r: number; c: number; type: string; name: string;
	hp: number; maxHp: number; atk: number; alive: boolean; questId: number;
}

interface Quest {
	state: number; targetEnemy: number; title: string;
	giveDialog: string; doneDialog: string; rewardType: string; rewardId: number;
}

const ROOM_MAP = [
	[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,1,1,0,0,1,1,1,0,0,0,0,0,1,1,0,0,1,1,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
	[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
	[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export class GameScene extends Phaser.Scene {
	private player!: Phaser.Physics.Arcade.Sprite;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private walls!: Phaser.Physics.Arcade.StaticGroup;
	private npcSprites: Phaser.Physics.Arcade.Sprite[] = [];
	private enemySprites: Phaser.Physics.Arcade.Sprite[] = [];
	private gfx!: Phaser.GameObjects.Graphics;

	private playerHp = 100;
	private playerMaxHp = 100;
	private weaponId = 0;
	private armorId = 0;

	private npcs: NpcDef[] = [];
	private enemies: EnemyDef[] = [];
	private quests: Quest[] = [];

	private talking = false;
	private dialogBox!: Phaser.GameObjects.Rectangle;
	private dialogNameText!: Phaser.GameObjects.Text;
	private dialogText!: Phaser.GameObjects.Text;
	private dialogHint!: Phaser.GameObjects.Text;
	private interactKey!: Phaser.Input.Keyboard.Key;
	private interactCooldown = 0;

	private hud!: Phaser.GameObjects.Text;
	private questHud!: Phaser.GameObjects.Text;
	private statusOpen = false;
	private statusBox!: Phaser.GameObjects.Rectangle;
	private statusText!: Phaser.GameObjects.Text;

	constructor() { super("GameScene"); }

	init(data: any) {
		if (data.hp !== undefined) this.playerHp = data.hp;
		if (data.weaponId !== undefined) this.weaponId = data.weaponId;
		if (data.armorId !== undefined) this.armorId = data.armorId;
		if (data.quests) this.quests = data.quests;
		if (data.enemies) this.enemies = data.enemies;
	}

	create() {
		if (this.npcs.length === 0) {
			this.npcs = [
				{ r: 3, c: 4, color: 0x22c55e, name: "${g.rpg.npcElder}", dialog: ["${g.rpg.elderDialog1}", "${g.rpg.elderDialog2}"], questId: 0, requiresQuest: -1 },
				{ r: 7, c: 15, color: 0xf472b6, name: "${g.rpg.npcGirl}", dialog: ["${g.rpg.girlDialog1}", "${g.rpg.girlDialog2}"], questId: 1, requiresQuest: 0 },
				{ r: 11, c: 3, color: 0x60a5fa, name: "${g.rpg.npcSmith}", dialog: ["${g.rpg.smithDialog1}", "${g.rpg.smithDialog2}"], questId: -1, requiresQuest: -1 },
			];
		}
		if (this.enemies.length === 0) {
			this.enemies = [
				{ r: 9, c: 10, type: "skull", name: "${g.rpg.enemyWolf}", hp: 60, maxHp: 60, atk: 8, alive: true, questId: 0 },
				{ r: 4, c: 16, type: "ghost", name: "${g.rpg.enemyDemon}", hp: 150, maxHp: 150, atk: 20, alive: false, questId: 1 },
			];
		}
		if (this.quests.length === 0) {
			this.quests = [
				{ state: 0, targetEnemy: 0, title: "${g.rpg.quest1Title}", giveDialog: "${g.rpg.quest1Give}", doneDialog: "${g.rpg.quest1Done}", rewardType: "weapon", rewardId: 1 },
				{ state: 0, targetEnemy: 1, title: "${g.rpg.quest2Title}", giveDialog: "${g.rpg.quest2Give}", doneDialog: "${g.rpg.quest2Done}", rewardType: "armor", rewardId: 2 },
			];
		}

		this.gfx = this.add.graphics();
		this.walls = this.physics.add.staticGroup();

		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const x = c * TILE + TILE / 2;
				const y = r * TILE + TILE / 2;
				if (ROOM_MAP[r][c] === 1) {
					this.gfx.fillStyle(0x334155, 1);
					this.gfx.fillRect(c * TILE, r * TILE, TILE, TILE);
					this.gfx.lineStyle(1, 0x475569);
					this.gfx.strokeRect(c * TILE, r * TILE, TILE, TILE);
					const w = this.walls.create(x, y, undefined as any) as Phaser.Physics.Arcade.Sprite;
					w.setVisible(false);
					w.body.setSize(TILE, TILE);
				} else {
					this.gfx.fillStyle(0x1e293b, 1);
					this.gfx.fillRect(c * TILE, r * TILE, TILE, TILE);
				}
			}
		}

		this.player = this.physics.add.sprite(10 * TILE + TILE / 2, 12 * TILE + TILE / 2, "dude").setScale(0.8);
		this.player.setCollideWorldBounds(true);
		this.player.body.setSize(24, 30, true);
		this.physics.add.collider(this.player, this.walls);

		this.npcSprites = [];
		for (const npc of this.npcs) {
			const s = this.add.rectangle(npc.c * TILE + TILE / 2, npc.r * TILE + TILE / 2, 28, 28, npc.color) as any;
			this.physics.add.existing(s, true);
			this.npcSprites.push(s);
			this.add.text(npc.c * TILE + TILE / 2, npc.r * TILE - 4, npc.name, { fontSize: "11px", color: "#ffffff", fontFamily: "Arial" }).setOrigin(0.5, 1);
		}

		this.enemySprites = [];
		for (let i = 0; i < this.enemies.length; i++) {
			const e = this.enemies[i];
			if (!e.alive) { this.enemySprites.push(null as any); continue; }
			const s = this.physics.add.sprite(e.c * TILE + TILE / 2, e.r * TILE + TILE / 2, e.type).setScale(0.8);
			this.tweens.add({ targets: s, y: s.y - 5, duration: 600, yoyo: true, repeat: -1 });
			this.physics.add.overlap(this.player, s, () => this.startCombat(i), undefined, this);
			this.enemySprites.push(s);
		}

		this.cursors = this.input.keyboard!.createCursorKeys();
		this.interactKey = this.input.keyboard!.addKey("SPACE");

		this.dialogBox = this.add.rectangle(400, 520, 720, 120, 0x0f172a, 0.92).setStrokeStyle(2, 0x475569).setVisible(false).setDepth(100);
		this.dialogNameText = this.add.text(60, 470, "", { fontSize: "16px", color: "#a3e635", fontFamily: "Arial", fontStyle: "bold" }).setVisible(false).setDepth(101);
		this.dialogText = this.add.text(60, 495, "", { fontSize: "14px", color: "#e2e8f0", fontFamily: "Arial", wordWrap: { width: 660 } }).setVisible(false).setDepth(101);
		this.dialogHint = this.add.text(720, 555, "${g.rpg.clickContinue}", { fontSize: "12px", color: "#64748b", fontFamily: "Arial" }).setVisible(false).setDepth(101);

		this.hud = this.add.text(16, 8, "", { fontSize: "14px", color: "#ffffff", fontFamily: "Arial", stroke: "#000", strokeThickness: 2 }).setDepth(100);
		this.questHud = this.add.text(784, 8, "", { fontSize: "13px", color: "#fbbf24", fontFamily: "Arial", stroke: "#000", strokeThickness: 2 }).setOrigin(1, 0).setDepth(100);

		this.statusBox = this.add.rectangle(400, 300, 400, 300, 0x0f172a, 0.95).setStrokeStyle(2, 0x475569).setVisible(false).setDepth(200);
		this.statusText = this.add.text(220, 170, "", { fontSize: "15px", color: "#e2e8f0", fontFamily: "Arial", lineSpacing: 8 }).setVisible(false).setDepth(201);
		this.statusOpen = false;

		this.input.keyboard!.addKey("I").on("down", () => this.toggleStatus());
		this.input.keyboard!.addKey("ESC").on("down", () => { if (this.statusOpen) this.toggleStatus(); });

		this.updateHud();
	}

	update(_t: number, delta: number) {
		if (this.statusOpen) return;

		this.interactCooldown = Math.max(0, this.interactCooldown - delta);

		if (this.talking) {
			this.player.setVelocity(0);
			if (this.interactKey.isDown && this.interactCooldown <= 0) {
				this.hideDialog();
				this.interactCooldown = 300;
			}
			return;
		}

		const speed = 160;
		this.player.setVelocity(0);
		if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); this.player.anims.play("walk-down", true); this.player.setFlipX(true); }
		else if (this.cursors.right.isDown) { this.player.setVelocityX(speed); this.player.anims.play("walk-down", true); this.player.setFlipX(false); }
		else if (this.cursors.up.isDown) { this.player.setVelocityY(-speed); this.player.anims.play("walk-up", true); }
		else if (this.cursors.down.isDown) { this.player.setVelocityY(speed); this.player.anims.play("walk-down", true); }
		else { this.player.anims.play("idle", true); }

		if (this.interactKey.isDown && this.interactCooldown <= 0) {
			this.tryInteract();
			this.interactCooldown = 400;
		}

		if (this.weaponId >= 2 && this.armorId >= 2) {
			this.scene.start("GameOverScene", { score: 0, win: true });
		}
	}

	private tryInteract() {
		const px = this.player.x;
		const py = this.player.y;
		for (let i = 0; i < this.npcs.length; i++) {
			const ns = this.npcSprites[i];
			if (!ns) continue;
			const dist = Phaser.Math.Distance.Between(px, py, ns.x, ns.y);
			if (dist < TILE * 1.5) {
				this.talkToNpc(i);
				return;
			}
		}
	}

	private talkToNpc(idx: number) {
		const npc = this.npcs[idx];
		const qid = npc.questId;

		if (qid >= 0 && qid < this.quests.length) {
			const q = this.quests[qid];
			if (npc.requiresQuest >= 0 && npc.requiresQuest < this.quests.length) {
				if (this.quests[npc.requiresQuest].state < 9) {
					this.showDialog(npc.name, npc.dialog[Math.floor(Math.random() * npc.dialog.length)]);
					return;
				}
			}
			if (q.state === 0) {
				q.state = 1;
				if (qid === 1) this.enemies[1].alive = true;
				this.rebuildEnemies();
				this.showDialog(npc.name, q.giveDialog);
				this.updateHud();
				return;
			}
			if (q.state === 1) {
				const e = this.enemies[q.targetEnemy];
				if (!e.alive && e.hp <= 0) {
					q.state = 9;
					if (q.rewardType === "weapon") this.weaponId = Math.max(this.weaponId, q.rewardId);
					if (q.rewardType === "armor") this.armorId = Math.max(this.armorId, q.rewardId);
					this.showDialog(npc.name, q.doneDialog);
					this.updateHud();
					return;
				}
				this.showDialog(npc.name, q.giveDialog);
				return;
			}
			if (q.state === 9) {
				this.showDialog(npc.name, npc.dialog[0]);
				return;
			}
		}
		this.showDialog(npc.name, npc.dialog[Math.floor(Math.random() * npc.dialog.length)]);
	}

	private rebuildEnemies() {
		for (const s of this.enemySprites) { if (s) s.destroy(); }
		this.enemySprites = [];
		for (let i = 0; i < this.enemies.length; i++) {
			const e = this.enemies[i];
			if (!e.alive) { this.enemySprites.push(null as any); continue; }
			const s = this.physics.add.sprite(e.c * TILE + TILE / 2, e.r * TILE + TILE / 2, e.type).setScale(0.8);
			this.tweens.add({ targets: s, y: s.y - 5, duration: 600, yoyo: true, repeat: -1 });
			this.physics.add.overlap(this.player, s, () => this.startCombat(i), undefined, this);
			this.enemySprites.push(s);
		}
	}

	private showDialog(name: string, text: string) {
		this.talking = true;
		this.dialogBox.setVisible(true);
		this.dialogNameText.setText(name).setVisible(true);
		this.dialogText.setText(text).setVisible(true);
		this.dialogHint.setVisible(true);
	}

	private hideDialog() {
		this.talking = false;
		this.dialogBox.setVisible(false);
		this.dialogNameText.setVisible(false);
		this.dialogText.setVisible(false);
		this.dialogHint.setVisible(false);
	}

	private startCombat(enemyIdx: number) {
		if (!this.enemies[enemyIdx].alive) return;
		this.scene.start("CombatScene", {
			enemyIdx, enemy: { ...this.enemies[enemyIdx] },
			playerHp: this.playerHp, playerMaxHp: this.playerMaxHp,
			weaponId: this.weaponId, armorId: this.armorId,
			quests: this.quests, enemies: this.enemies,
		});
	}

	private toggleStatus() {
		this.statusOpen = !this.statusOpen;
		if (this.statusOpen) {
			const w = WEAPONS[this.weaponId];
			const a = ARMORS[this.armorId];
			const activeQ = this.quests.filter(q => q.state === 1).map(q => "  - " + q.title).join("\\n") || "  ${g.rpg.noActiveQuest}";
			this.statusText.setText(
				"${g.rpg.statusTitle}\\n" +
				"HP: " + this.playerHp + " / " + this.playerMaxHp + "\\n" +
				"${g.rpg.weapon}: " + w.name + " (ATK " + w.atk + ")\\n" +
				"${g.rpg.armor}: " + a.name + " (DEF " + a.def + ")\\n\\n" +
				"${g.rpg.activeQuests}:\\n" + activeQ
			);
		}
		this.statusBox.setVisible(this.statusOpen);
		this.statusText.setVisible(this.statusOpen);
	}

	private updateHud() {
		const w = WEAPONS[this.weaponId];
		this.hud.setText("HP " + this.playerHp + "/" + this.playerMaxHp + "  " + w.name);
		const aq = this.quests.find(q => q.state === 1);
		this.questHud.setText(aq ? "\\u2694 " + aq.title : "");
	}
}
`,
		},
		{
			path: "src/scenes/combat-scene.ts",
			content: `import Phaser from "phaser";

const WEAPONS = [
	{ name: "${g.rpg.weaponWood}", atk: 10 },
	{ name: "${g.rpg.weaponIron}", atk: 30 },
	{ name: "${g.rpg.weaponLegend}", atk: 60 },
];

const ARMORS = [
	{ name: "${g.rpg.armorCloth}", def: 5 },
	{ name: "${g.rpg.armorLeather}", def: 20 },
	{ name: "${g.rpg.armorSilk}", def: 50 },
];

export class CombatScene extends Phaser.Scene {
	private enemyIdx = 0;
	private enemyName = "";
	private enemyHp = 0;
	private enemyMaxHp = 0;
	private enemyAtk = 0;
	private playerHp = 100;
	private playerMaxHp = 100;
	private weaponId = 0;
	private armorId = 0;
	private quests: any[] = [];
	private enemies: any[] = [];
	private playerTurn = true;
	private animating = false;
	private gfx!: Phaser.GameObjects.Graphics;
	private infoText!: Phaser.GameObjects.Text;
	private logText!: Phaser.GameObjects.Text;
	private atkBtn!: Phaser.GameObjects.Text;
	private fleeBtn!: Phaser.GameObjects.Text;
	private enemySprite!: Phaser.GameObjects.Sprite;
	private playerSprite!: Phaser.GameObjects.Sprite;

	constructor() { super("CombatScene"); }

	init(data: any) {
		this.enemyIdx = data.enemyIdx;
		this.enemyName = data.enemy.name;
		this.enemyHp = data.enemy.hp;
		this.enemyMaxHp = data.enemy.maxHp;
		this.enemyAtk = data.enemy.atk;
		this.playerHp = data.playerHp;
		this.playerMaxHp = data.playerMaxHp;
		this.weaponId = data.weaponId;
		this.armorId = data.armorId;
		this.quests = data.quests;
		this.enemies = data.enemies;
	}

	create() {
		this.playerTurn = true;
		this.animating = false;

		this.add.rectangle(400, 300, 800, 600, 0x1a1a2e);
		this.gfx = this.add.graphics();

		this.gfx.fillStyle(0x334155, 1);
		this.gfx.fillRect(0, 420, 800, 180);
		this.gfx.lineStyle(2, 0x475569);
		this.gfx.lineBetween(0, 420, 800, 420);

		this.add.text(400, 40, "${g.rpg.battleTitle}", { fontSize: "28px", color: "#ef4444", fontFamily: "Arial" }).setOrigin(0.5);

		this.enemySprite = this.add.sprite(400, 200, this.enemies[this.enemyIdx].type).setScale(3);
		this.tweens.add({ targets: this.enemySprite, y: 195, duration: 800, yoyo: true, repeat: -1 });

		this.playerSprite = this.add.sprite(200, 350, "dude").setScale(2);
		this.playerSprite.play("idle");

		this.add.text(400, 90, this.enemyName, { fontSize: "20px", color: "#fbbf24", fontFamily: "Arial" }).setOrigin(0.5);

		this.infoText = this.add.text(60, 440, "", { fontSize: "15px", color: "#e2e8f0", fontFamily: "Arial", lineSpacing: 6 });
		this.logText = this.add.text(400, 560, "${g.rpg.yourTurn}", { fontSize: "16px", color: "#a3e635", fontFamily: "Arial" }).setOrigin(0.5);

		this.atkBtn = this.add.text(550, 450, "${g.rpg.attack}", { fontSize: "22px", color: "#06b6d4", fontFamily: "Arial" }).setInteractive({ useHandCursor: true });
		this.atkBtn.on("pointerdown", () => this.doAttack());
		this.atkBtn.on("pointerover", () => this.atkBtn.setColor("#22c55e"));
		this.atkBtn.on("pointerout", () => this.atkBtn.setColor("#06b6d4"));

		this.fleeBtn = this.add.text(550, 490, "${g.rpg.flee}", { fontSize: "18px", color: "#94a3b8", fontFamily: "Arial" }).setInteractive({ useHandCursor: true });
		this.fleeBtn.on("pointerdown", () => this.flee());

		this.updateInfo();
	}

	private updateInfo() {
		const w = WEAPONS[this.weaponId];
		const a = ARMORS[this.armorId];
		this.infoText.setText(
			"HP: " + this.playerHp + "/" + this.playerMaxHp + "\\n" +
			w.name + " (ATK " + w.atk + ")\\n" +
			a.name + " (DEF " + a.def + ")\\n\\n" +
			this.enemyName + " HP: " + Math.max(0, this.enemyHp) + "/" + this.enemyMaxHp
		);
	}

	private doAttack() {
		if (!this.playerTurn || this.animating) return;
		this.animating = true;

		const w = WEAPONS[this.weaponId];
		const dmg = w.atk + Math.floor(Math.random() * w.atk * 0.5);
		this.enemyHp -= dmg;

		this.cameras.main.shake(80, 0.005);
		this.enemySprite.setTint(0xff6666);
		this.time.delayedCall(150, () => this.enemySprite.clearTint());

		const dmgText = this.add.text(this.enemySprite.x, this.enemySprite.y - 40, "-" + dmg, { fontSize: "24px", color: "#ef4444", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
		this.tweens.add({ targets: dmgText, y: dmgText.y - 40, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });

		this.logText.setText("${g.rpg.youDeal} " + dmg + " ${g.rpg.damage}!");
		this.updateInfo();

		if (this.enemyHp <= 0) {
			this.time.delayedCall(600, () => this.enemyDefeated());
			return;
		}

		this.playerTurn = false;
		this.time.delayedCall(800, () => this.enemyAttack());
	}

	private enemyAttack() {
		const a = ARMORS[this.armorId];
		const rawDmg = Math.floor(this.enemyAtk * (0.5 + Math.random()));
		const dmg = Math.max(1, rawDmg - Math.floor(a.def * 0.3));
		this.playerHp -= dmg;

		this.cameras.main.shake(100, 0.008);
		this.playerSprite.setTint(0xff0000);
		this.time.delayedCall(150, () => this.playerSprite.clearTint());

		const dmgText = this.add.text(this.playerSprite.x, this.playerSprite.y - 30, "-" + dmg, { fontSize: "24px", color: "#fbbf24", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
		this.tweens.add({ targets: dmgText, y: dmgText.y - 40, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });

		this.logText.setText(this.enemyName + " ${g.rpg.deals} " + dmg + " ${g.rpg.damage}!");
		this.updateInfo();

		if (this.playerHp <= 0) {
			this.time.delayedCall(600, () => {
				this.scene.start("GameOverScene", { score: 0, win: false });
			});
			return;
		}

		this.playerTurn = true;
		this.animating = false;
		this.time.delayedCall(500, () => this.logText.setText("${g.rpg.yourTurn}"));
	}

	private enemyDefeated() {
		this.enemies[this.enemyIdx].alive = false;
		this.enemies[this.enemyIdx].hp = 0;
		this.logText.setText(this.enemyName + " ${g.rpg.defeated}!");
		this.time.delayedCall(1200, () => {
			this.scene.start("GameScene", {
				hp: this.playerHp, weaponId: this.weaponId, armorId: this.armorId,
				quests: this.quests, enemies: this.enemies,
			});
		});
	}

	private flee() {
		this.scene.start("GameScene", {
			hp: this.playerHp, weaponId: this.weaponId, armorId: this.armorId,
			quests: this.quests, enemies: this.enemies,
		});
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
		const win = data.win ?? false;

		this.add.text(400, 180, win ? "${g.rpg.victory}" : "${g.common.gameOver}", {
			fontSize: "44px", color: win ? "#22c55e" : "#ef4444", fontFamily: "Arial",
		}).setOrigin(0.5);

		this.add.text(400, 260, win ? "${g.rpg.victoryMsg}" : "${g.rpg.defeatMsg}", {
			fontSize: "18px", color: "#94a3b8", fontFamily: "Arial", align: "center", wordWrap: { width: 500 },
		}).setOrigin(0.5);

		const retryBtn = this.add.text(400, 380, "${g.rpg.retry}", { fontSize: "24px", color: "#06b6d4", fontFamily: "Arial" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
		retryBtn.on("pointerdown", () => this.scene.start("MenuScene"));
		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));
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
