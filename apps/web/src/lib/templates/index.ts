import type { ProjectMeta } from "@rimecraft/core";
import { getMessages } from "@/i18n";
import { endlessRunnerTemplate } from "./endless-runner";
import { platformerTemplate } from "./platformer";
import { spaceShooterTemplate } from "./space-shooter";
import { rpgTemplate } from "./rpg";
import { puzzleTemplate } from "./puzzle";
import { breakoutTemplate } from "./breakout";
import { rhythmTemplate } from "./rhythm";
import { boardGameTemplate } from "./board-game";
import { tankTemplate } from "./tank";
import { dodgeTemplate } from "./dodge";
import { flappyBirdTemplate } from "./flappy-bird";

export interface TemplateFile {
	path: string;
	content: string;
}

export type TemplateGenerator = (meta: ProjectMeta) => TemplateFile[];

const TEMPLATE_MAP: Record<string, TemplateGenerator> = {
	"endless-runner": endlessRunnerTemplate,
	platformer: platformerTemplate,
	"space-shooter": spaceShooterTemplate,
	rpg: rpgTemplate,
	puzzle: puzzleTemplate,
	breakout: breakoutTemplate,
	rhythm: rhythmTemplate,
	"board-game": boardGameTemplate,
	tank: tankTemplate,
	dodge: dodgeTemplate,
	"flappy-bird": flappyBirdTemplate,
};

export function generateTemplateFiles(meta: ProjectMeta): TemplateFile[] {
	const generator = meta.template ? TEMPLATE_MAP[meta.template] : undefined;
	if (generator) {
		return generator(meta);
	}
	return blankTemplate(meta);
}

function blankTemplate(meta: ProjectMeta): TemplateFile[] {
	const g = getMessages().gameText;
	return [
		{
			path: "src/main.ts",
			content: `import Phaser from "phaser";
import { GameScene } from "./scenes/game-scene";
import { MenuScene } from "./scenes/menu-scene";

const config = {
	type: Phaser.AUTO,
	width: 800,
	height: 600,
	backgroundColor: "#1a1a2e",
	physics: {
		default: "arcade",
		arcade: {
			gravity: { x: 0, y: 300 },
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

export class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	create() {
		this.add
			.text(400, 200, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const startText = this.add
			.text(400, 400, "${g.blank.clickToStart}", {
				fontSize: "24px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		startText.on("pointerdown", () => {
			this.scene.start("GameScene");
		});

		startText.on("pointerover", () => {
			startText.setColor("#22c55e");
		});

		startText.on("pointerout", () => {
			startText.setColor("#06b6d4");
		});
	}
}
`,
		},
		{
			path: "src/scenes/game-scene.ts",
			content: `import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
	constructor() {
		super("GameScene");
	}

	preload() {
	}

	create() {
		this.add
			.text(400, 300, "${g.blank.sceneHint}", {
				fontSize: "24px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);
	}

	update() {
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
	gravity: 300,
	debug: false,
};
`,
		},
	];
}
