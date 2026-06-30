import type { AgentTool } from "rimeagent"
import type { ToolContext, Command } from "./tool-context";
import { refreshFileList, getMessages, t, normalizeError } from "./tool-context";
import { sceneBridge } from "../scene-bridge";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { generateObjectId, resolveObjectId, getSimilarObjects } from "../scene-graph";
import type { SceneObject, SceneObjectBounds } from "../scene-graph";

export function createSceneTools(ctx: ToolContext): AgentTool[] {
	const { pm, preview, cmd } = ctx;
	const dm = getMessages();

	return [
		{
			name: "create_scene",
			description: dm.tools.createScene.desc,
			parameters: {
				type: "object",
				properties: {
					name: {
						type: "string",
						description: dm.tools.createScene.nameDesc,
					},
					type: {
						type: "string",
						enum: ["menu", "game", "ui", "gameover", "custom"],
						description: dm.tools.createScene.typeDesc,
					},
				},
				required: ["name"],
			},
			async execute(args) {
				try {
					const m = getMessages();
					const name = args.name as string;
					const type = (args.type as string) || "game";
					const className =
						name.charAt(0).toUpperCase() + name.slice(1);
					const sceneKey = className;
					const fileName = name
						.replace(/([A-Z])/g, "-$1")
						.toLowerCase()
						.replace(/^-/, "");
					const filePath = `src/scenes/${fileName}.ts`;

					const content = generateSceneTemplate(
						className,
						sceneKey,
						type,
					);

					const writeCmd: Command = {
						id: `create_scene_${Date.now()}`,
						name: `create_scene: ${className}`,
						async execute() {
							await pm().writeFile(filePath, content);
							await refreshFileList(pm);
						},
						async undo() {
							await pm().deleteFile(filePath);
							await refreshFileList(pm);
						},
					};

					await cmd().execute(writeCmd);

					return {
						success: true,
						message: t(m.tools.createSceneSuccess, { className, path: filePath }),
						undoable: true,
						data: { path: filePath, className, sceneKey },
					};
				} catch (e) {
					const m = getMessages();
					return {
						success: false,
						message: `${m.tools.createSceneFailed}: ${normalizeError(e)}`,
					};
				}
			},
		},
		{
			name: "inspect_scene",
			description: dm.tools.inspectScene.desc,
			parameters: {
				type: "object",
				properties: {},
			},
			async execute() {
				const m = getMessages();
				try {
					const result = await new Promise<{
						objects: SceneObjectBounds[];
						settings: { width: number; height: number };
					} | null>((resolve) => {
						const timeout = setTimeout(() => {
							unsub();
							resolve(null);
						}, 3000);
						const unsub = sceneBridge.onMessage((msg) => {
							if (msg.type === "scene_tree") {
								clearTimeout(timeout);
								unsub();
								resolve({ objects: msg.objects, settings: msg.settings });
							}
						});
						sceneBridge.requestSceneTree();
					});

					if (!result) {
						return { success: false, message: m.tools.inspectSceneTimeout };
					}

					const { objects, settings } = result;
					if (objects.length === 0) {
						return {
							success: true,
							message: m.tools.inspectSceneEmpty,
							data: { objects: [], settings },
						};
					}

					return {
						success: true,
						message: m.tools.inspectSceneSuccess
							.replace("{count}", String(objects.length))
							.replace("{width}", String(settings.width))
							.replace("{height}", String(settings.height)),
						data: { objects, settings },
					};
				} catch (e) {
					return {
						success: false,
						message: `${m.tools.inspectSceneTimeout}: ${normalizeError(e)}`,
					};
				}
			},
		},
		{
			name: "place_object",
			description: dm.tools.placeObject.desc,
			parameters: {
				type: "object",
				properties: {
					type: {
						type: "string",
						description: dm.tools.placeObject.typeDesc,
						enum: ["sprite", "image", "text", "graphics"],
					},
					name: {
						type: "string",
						description: dm.tools.placeObject.nameDesc,
					},
					x: {
						type: "number",
						description: dm.tools.placeObject.xDesc,
					},
					y: {
						type: "number",
						description: dm.tools.placeObject.yDesc,
					},
					texture: {
						type: "string",
						description: dm.tools.placeObject.textureDesc,
					},
					text: {
						type: "string",
						description: dm.tools.placeObject.textDesc,
					},
				},
				required: ["type", "name", "x", "y"],
			},
			async execute(args) {
				const m = getMessages();
				try {
					const objType = args.type as SceneObject["type"];
					const name = args.name as string;
					const x = args.x as number;
					const y = args.y as number;

					const obj: SceneObject = {
						id: generateObjectId(),
						type: objType,
						name,
						x,
						y,
					};

					if (args.texture) obj.texture = args.texture as string;
					if (args.text) obj.text = args.text as string;

					sceneBridge.createObject(obj);
					useVisualEditorStore.getState().addObject(obj);

					return {
						success: true,
						message: m.tools.placeObjectSuccess
							.replace("{name}", name)
							.replace("{x}", String(x))
							.replace("{y}", String(y)),
						data: { id: obj.id, type: objType, name, x, y },
					};
				} catch (e) {
					return {
						success: false,
						message: `${m.tools.placeObjectFailed}: ${normalizeError(e)}`,
					};
				}
			},
		},
		{
			name: "update_object",
			description: dm.tools.updateObject.desc,
			parameters: {
				type: "object",
				properties: {
					id: {
						type: "string",
						description: dm.tools.updateObject.idDesc,
					},
					x: {
						type: "number",
						description: dm.tools.updateObject.xDesc,
					},
					y: {
						type: "number",
						description: dm.tools.updateObject.yDesc,
					},
					rotation: {
						type: "number",
						description: dm.tools.updateObject.rotationDesc,
					},
					scaleX: {
						type: "number",
						description: dm.tools.updateObject.scaleXDesc,
					},
					scaleY: {
						type: "number",
						description: dm.tools.updateObject.scaleYDesc,
					},
					alpha: {
						type: "number",
						description: dm.tools.updateObject.alphaDesc,
					},
					visible: {
						type: "boolean",
						description: dm.tools.updateObject.visibleDesc,
					},
					depth: {
						type: "number",
						description: dm.tools.updateObject.depthDesc,
					},
				},
				required: ["id"],
			},
			async execute(args) {
				const m = getMessages();
				try {
					const idOrName = args.id as string;
					const veStore = useVisualEditorStore.getState();
					const objects = veStore.sceneGraph?.objects ?? [];

					const resolved = resolveObjectId(objects, idOrName);
					if (!resolved) {
						const similar = getSimilarObjects(objects, idOrName);
						const suggestions = similar.map((s) => ({
							type: "similar_id" as const,
							text: `${s.name} (${s.id})`,
						}));
						const hint = similar.length > 0
							? `\n\nAvailable objects:\n${similar.map((s) => `  - ${s.name} [${s.type}] id=${s.id}`).join("\n")}`
							: "";
						return {
							success: false,
							message: `${m.tools.updateObjectFailed}: object "${idOrName}" not found${hint}`,
							suggestions,
						};
					}

					const id = resolved.id;
					const props: Partial<SceneObject> = {};
					if (args.x !== undefined) props.x = args.x as number;
					if (args.y !== undefined) props.y = args.y as number;
					if (args.rotation !== undefined) props.rotation = args.rotation as number;
					if (args.scaleX !== undefined) props.scaleX = args.scaleX as number;
					if (args.scaleY !== undefined) props.scaleY = args.scaleY as number;
					if (args.alpha !== undefined) props.alpha = args.alpha as number;
					if (args.visible !== undefined) props.visible = args.visible as boolean;
					if (args.depth !== undefined) props.depth = args.depth as number;

					sceneBridge.updateObject(id, props);
					veStore.updateObject(id, props);

					const resolvedNote = id !== idOrName ? ` (resolved: ${resolved.name})` : "";
					return {
						success: true,
						message: m.tools.updateObjectSuccess.replace("{id}", id) + resolvedNote,
						data: { id, updatedProps: Object.keys(props) },
					};
				} catch (e) {
					return {
						success: false,
						message: `${m.tools.updateObjectFailed}: ${normalizeError(e)}`,
					};
				}
			},
		},
		{
			name: "remove_object",
			description: dm.tools.removeObject.desc,
			parameters: {
				type: "object",
				properties: {
					id: {
						type: "string",
						description: dm.tools.removeObject.idDesc,
					},
				},
				required: ["id"],
			},
			async execute(args) {
				const m = getMessages();
				try {
					const idOrName = args.id as string;
					const veStore = useVisualEditorStore.getState();
					const objects = veStore.sceneGraph?.objects ?? [];

					const resolved = resolveObjectId(objects, idOrName);
					if (!resolved) {
						const similar = getSimilarObjects(objects, idOrName);
						const suggestions = similar.map((s) => ({
							type: "similar_id" as const,
							text: `${s.name} (${s.id})`,
						}));
						const hint = similar.length > 0
							? `\n\nAvailable objects:\n${similar.map((s) => `  - ${s.name} [${s.type}] id=${s.id}`).join("\n")}`
							: "";
						return {
							success: false,
							message: `${m.tools.removeObjectFailed}: object "${idOrName}" not found${hint}`,
							suggestions,
						};
					}

					const id = resolved.id;
					sceneBridge.deleteObject(id);
					veStore.removeObject(id);

					return {
						success: true,
						message: m.tools.removeObjectSuccess.replace("{id}", id),
						data: { id },
					};
				} catch (e) {
					return {
						success: false,
						message: `${m.tools.removeObjectFailed}: ${normalizeError(e)}`,
					};
				}
			},
		},
	];
}

function generateSceneTemplate(
	className: string,
	sceneKey: string,
	type: string,
): string {
	const m = getMessages();
	switch (type) {
		case "menu":
			return `import Phaser from "phaser";

export class ${className} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	create() {
		const { width, height } = this.scale;

		this.add
			.text(width / 2, height / 3, "${m.sceneTemplate.gameTitle}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const startBtn = this.add
			.text(width / 2, height * 0.6, "${m.sceneTemplate.startGame}", {
				fontSize: "28px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		startBtn.on("pointerdown", () => {
			this.scene.start("GameScene");
		});

		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));
	}
}
`;
		case "gameover":
			return `import Phaser from "phaser";

export class ${className} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	create() {
		const { width, height } = this.scale;

		this.add
			.text(width / 2, height / 3, "${m.sceneTemplate.gameOver}", {
				fontSize: "48px",
				color: "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const retryBtn = this.add
			.text(width / 2, height * 0.6, "${m.sceneTemplate.retry}", {
				fontSize: "28px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		retryBtn.on("pointerdown", () => {
			this.scene.start("GameScene");
		});

		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));
	}
}
`;
		case "ui":
			return `import Phaser from "phaser";

export class ${className} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	create() {
	}

	update() {
	}
}
`;
		default:
			return `import Phaser from "phaser";

export class ${className} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	preload() {
	}

	create() {
	}

	update() {
	}
}
`;
	}
}
