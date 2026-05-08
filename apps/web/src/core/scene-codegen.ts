import type { SceneGraph, SceneObject, SceneAssetRef } from "./scene-graph";
import { assetRegistry } from "@/lib/assets/asset-registry";

export function generateSceneCode(
	scene: SceneGraph,
	sceneName = "GameScene",
	sceneKey = "GameScene",
): string {
	const preloadLines = generatePreload(scene.assets);
	const createLines = generateCreate(scene.objects, scene.settings);

	return `import Phaser from "phaser";

export class ${sceneName} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	preload() {
${indent(preloadLines, 2)}
	}

	create() {
${indent(createLines, 2)}
	}
}
`;
}

function generatePreload(assets: SceneAssetRef[]): string {
	const lines: string[] = [];
	const allEntries = assetRegistry.getAll();
	for (const asset of assets) {
		const entry = allEntries.find((e) => e.id === asset.assetId);
		const path = entry?.url ?? `/assets/${asset.key}.png`;

		if (asset.type === "spritesheet") {
			const fw = entry?.frameConfig?.frameWidth ?? 32;
			const fh = entry?.frameConfig?.frameHeight ?? 32;
			lines.push(
				`this.load.spritesheet("${asset.key}", "${path}", { frameWidth: ${fw}, frameHeight: ${fh} });`,
			);
		} else {
			lines.push(`this.load.image("${asset.key}", "${path}");`);
		}
	}
	return lines.join("\n");
}

function generateCreate(objects: SceneObject[], settings: SceneGraph["settings"]): string {
	const lines: string[] = [];

	if (settings.physics) {
		lines.push(`// Physics: ${settings.physics.type}`);
	}

	for (const obj of objects) {
		lines.push(...generateObject(obj));
		lines.push("");
	}

	if (lines.length > 0 && lines[lines.length - 1] === "") {
		lines.pop();
	}
	return lines.join("\n");
}

function generateObject(obj: SceneObject): string[] {
	const lines: string[] = [];
	const varName = toVarName(obj.name);

	switch (obj.type) {
		case "image":
			lines.push(
				`const ${varName} = this.add.image(${obj.x}, ${obj.y}, "${obj.texture ?? "__DEFAULT"}");`,
			);
			break;
		case "sprite":
			lines.push(
				`const ${varName} = this.add.sprite(${obj.x}, ${obj.y}, "${obj.texture ?? "__DEFAULT"}");`,
			);
			break;
		case "text":
			lines.push(
				`const ${varName} = this.add.text(${obj.x}, ${obj.y}, ${JSON.stringify(obj.text ?? "")}, ${JSON.stringify(obj.style ?? { fontSize: "16px", color: "#ffffff" })});`,
			);
			break;
		case "graphics":
			lines.push(
				`const ${varName} = this.add.graphics({ x: ${obj.x}, y: ${obj.y} });`,
			);
			if (obj.generatorCode) {
				lines.push(`((g: Phaser.GameObjects.Graphics) => { ${obj.generatorCode} })(${varName});`);
			}
			break;
		default:
			lines.push(
				`const ${varName} = this.add.image(${obj.x}, ${obj.y}, "${obj.texture ?? "__DEFAULT"}");`,
			);
	}

	if (obj.rotation) lines.push(`${varName}.rotation = ${obj.rotation};`);
	if (obj.scaleX !== undefined || obj.scaleY !== undefined) {
		const sx = obj.scaleX ?? 1;
		const sy = obj.scaleY ?? 1;
		lines.push(`${varName}.setScale(${sx}, ${sy});`);
	}
	if (obj.alpha !== undefined && obj.alpha !== 1) {
		lines.push(`${varName}.alpha = ${obj.alpha};`);
	}
	if (obj.depth !== undefined) {
		lines.push(`${varName}.depth = ${obj.depth};`);
	}
	if (obj.originX !== undefined || obj.originY !== undefined) {
		lines.push(`${varName}.setOrigin(${obj.originX ?? 0.5}, ${obj.originY ?? 0.5});`);
	}
	if (obj.visible === false) {
		lines.push(`${varName}.visible = false;`);
	}

	if (obj.physics) {
		const isStatic = obj.physics.bodyType === "static";
		lines.push(`this.physics.add.existing(${varName}, ${isStatic});`);
		if (obj.physics.bounce !== undefined) {
			lines.push(`(${varName}.body as Phaser.Physics.Arcade.Body).setBounce(${obj.physics.bounce});`);
		}
		if (obj.physics.collideWorldBounds) {
			lines.push(`(${varName}.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);`);
		}
	}

	if (obj.children) {
		for (const child of obj.children) {
			lines.push(...generateObject(child));
		}
	}

	return lines;
}

function toVarName(name: string): string {
	const cleaned = name
		.replace(/[^a-zA-Z0-9_$]/g, "_")
		.replace(/^[0-9]/, "_$&")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "");
	return cleaned || "obj";
}

function indent(code: string, tabs: number): string {
	const prefix = "\t".repeat(tabs);
	return code
		.split("\n")
		.map((line) => (line.trim() ? prefix + line : line))
		.join("\n");
}
