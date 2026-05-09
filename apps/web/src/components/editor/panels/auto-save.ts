import { sceneBridge } from "@/core/scene-bridge";
import type { FullStateObject } from "@/core/scene-bridge";
import { generateSceneCode, GENERATED_MARKER } from "@/core/scene-codegen";
import { normalizeError } from "@/utils/normalize-error";
import { getEditorCore } from "@/core/editor-core";
import { useProjectStore } from "@/stores/project-store";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { useGameStore } from "@/stores/game-store";
import type { SceneGraph, SceneObject, SceneAssetRef } from "@/core/scene-graph";

function fullStateToSceneGraph(
	objects: FullStateObject[],
	settings: { width: number; height: number },
): SceneGraph {
	const assetSet = new Map<string, SceneAssetRef>();
	const sceneObjects: SceneObject[] = [];

	for (const o of objects) {
		if (o.texture && o.texture !== "__DEFAULT" && o.texture !== "__MISSING" && o.texture !== "__WHITE") {
			if (!assetSet.has(o.texture)) {
				assetSet.set(o.texture, {
					key: o.texture,
					assetId: o.texture,
					type: "image",
				});
			}
		}

		const obj: SceneObject = {
			id: o.id,
			type: (o.type === "Sprite" ? "sprite" : o.type === "Text" ? "text" : o.type === "Graphics" ? "graphics" : "image") as SceneObject["type"],
			name: o.name || o.id,
			x: o.x,
			y: o.y,
			rotation: o.rotation || undefined,
			scaleX: o.scaleX !== 1 ? o.scaleX : undefined,
			scaleY: o.scaleY !== 1 ? o.scaleY : undefined,
			originX: o.originX,
			originY: o.originY,
			alpha: o.alpha !== 1 ? o.alpha : undefined,
			visible: o.visible === false ? false : undefined,
			depth: o.depth || undefined,
			texture: o.texture,
			frame: o.frame,
			text: o.text,
		};
		sceneObjects.push(obj);
	}

	return {
		version: 1,
		settings: {
			width: settings.width,
			height: settings.height,
			backgroundColor: "#1a1a2e",
		},
		assets: Array.from(assetSet.values()),
		objects: sceneObjects,
	};
}

async function findSceneFilePath(): Promise<string | null> {
	const files = useProjectStore.getState().files;
	const scenePaths = files
		.filter((f) => f.path.includes("/scenes/") && f.path.endsWith(".ts"))
		.map((f) => f.path);
	if (scenePaths.length > 0) {
		const gamePath = scenePaths.find((p) => p.includes("game-scene"));
		return gamePath ?? scenePaths[0];
	}
	return null;
}

export async function autoSaveVisualChanges(): Promise<boolean> {
	try {
		const objects = await sceneBridge.requestFullStateAsync();
		if (objects.length === 0) return false;

		const iframeBounds = useVisualEditorStore.getState().iframeBounds;
		const settings = iframeBounds ?? { width: 800, height: 600 };
		const sceneGraph = fullStateToSceneGraph(objects, settings);
		const code = generateSceneCode(sceneGraph);

		const scenePath = await findSceneFilePath();
		if (!scenePath) return false;

		const core = getEditorCore();

		let existingContent: string | null = null;
		try {
			existingContent = await core.project.readFile(scenePath);
		} catch {
			// File doesn't exist yet — safe to write
		}

		if (existingContent && !existingContent.trimStart().startsWith(GENERATED_MARKER)) {
			useGameStore.getState().addError(
				"Auto-save skipped: scene file was manually edited. Use visual editor on generated scenes only.",
			);
			return false;
		}

		const oldContent = existingContent;
		const saveCmd = {
			id: `autosave_${Date.now()}`,
			name: `auto_save: ${scenePath}`,
			async execute() {
				await core.project.writeFile(scenePath, code);
			},
			async undo() {
				if (oldContent !== null) {
					await core.project.writeFile(scenePath, oldContent);
				}
			},
		};
		await core.command.execute(saveCmd);

		useVisualEditorStore.getState().setDirty(false);
		return true;
	} catch (e) {
		const msg = normalizeError(e);
		useGameStore.getState().addError(`Auto-save failed: ${msg}`);
		return false;
	}
}
