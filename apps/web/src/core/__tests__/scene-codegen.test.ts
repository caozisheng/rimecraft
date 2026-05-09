import { describe, test, expect, mock } from "bun:test";
import type { SceneGraph } from "../scene-graph";

mock.module("@/lib/assets/asset-registry", () => ({
	assetRegistry: {
		getAll: () => [],
	},
}));

// Dynamic import after mock setup
const sceneCodegenModule = require("../scene-codegen") as typeof import("../scene-codegen");
const sceneGraphModule = require("../scene-graph") as typeof import("../scene-graph");

const { generateSceneCode, GENERATED_MARKER } = sceneCodegenModule;
const { createEmptyScene } = sceneGraphModule;

describe("generateSceneCode", () => {
	test("generates valid class structure", () => {
		const scene = createEmptyScene();
		const code = generateSceneCode(scene);
		expect(code).toContain("class GameScene extends Phaser.Scene");
		expect(code).toContain('super("GameScene")');
		expect(code).toContain("preload()");
		expect(code).toContain("create()");
	});

	test("uses custom scene name and key", () => {
		const scene = createEmptyScene();
		const code = generateSceneCode(scene, "MyScene", "myKey");
		expect(code).toContain("class MyScene extends Phaser.Scene");
		expect(code).toContain('super("myKey")');
	});

	test("generates image object", () => {
		const scene = createEmptyScene();
		scene.objects.push({
			id: "obj1",
			type: "image",
			name: "player",
			x: 100,
			y: 200,
			texture: "hero",
		});
		const code = generateSceneCode(scene);
		expect(code).toContain('this.add.image(100, 200, "hero")');
	});

	test("generates text object", () => {
		const scene = createEmptyScene();
		scene.objects.push({
			id: "obj2",
			type: "text",
			name: "score",
			x: 10,
			y: 10,
			text: "Score: 0",
		});
		const code = generateSceneCode(scene);
		expect(code).toContain("this.add.text(10, 10,");
		expect(code).toContain("Score: 0");
	});

	test("generates sprite with physics", () => {
		const scene = createEmptyScene();
		scene.objects.push({
			id: "obj3",
			type: "sprite",
			name: "enemy",
			x: 50,
			y: 50,
			texture: "baddie",
			physics: {
				type: "arcade",
				bodyType: "dynamic",
				bounce: 0.5,
				collideWorldBounds: true,
			},
		});
		const code = generateSceneCode(scene);
		expect(code).toContain("this.physics.add.existing");
		expect(code).toContain("setBounce(0.5)");
		expect(code).toContain("setCollideWorldBounds(true)");
	});

	test("applies transform properties", () => {
		const scene = createEmptyScene();
		scene.objects.push({
			id: "obj4",
			type: "image",
			name: "item",
			x: 0,
			y: 0,
			texture: "star",
			rotation: 1.5,
			scaleX: 2,
			scaleY: 3,
			alpha: 0.5,
			depth: 10,
			visible: false,
		});
		const code = generateSceneCode(scene);
		expect(code).toContain("rotation = 1.5");
		expect(code).toContain("setScale(2, 3)");
		expect(code).toContain("alpha = 0.5");
		expect(code).toContain("depth = 10");
		expect(code).toContain("visible = false");
	});

	test("generates preload for image assets", () => {
		const scene = createEmptyScene();
		scene.assets.push({
			key: "hero",
			assetId: "custom-hero",
			type: "image",
		});
		const code = generateSceneCode(scene);
		expect(code).toContain('this.load.image("hero"');
	});

	test("generates preload for spritesheet assets", () => {
		const scene = createEmptyScene();
		scene.assets.push({
			key: "walk",
			assetId: "custom-walk",
			type: "spritesheet",
		});
		const code = generateSceneCode(scene);
		expect(code).toContain('this.load.spritesheet("walk"');
		expect(code).toContain("frameWidth");
	});

	test("GENERATED_MARKER is exported", () => {
		expect(GENERATED_MARKER).toBe("// @rimecraft-generated");
	});

	test("sanitizes variable names from object names", () => {
		const scene = createEmptyScene();
		scene.objects.push({
			id: "obj5",
			type: "image",
			name: "my-player 2!",
			x: 0,
			y: 0,
			texture: "t",
		});
		const code = generateSceneCode(scene);
		expect(code).toContain("const my_player_2");
	});
});
