export interface GameContext {
	project: {
		name: string;
		engine: string;
	};
	canvas: {
		width: number;
		height: number;
		fps: number;
	};
	scenes: SceneSnapshot[];
	assets: AssetSnapshot[];
	animations: AnimationSnapshot[];
	errors: string[];
}

export interface SceneSnapshot {
	id: string;
	name: string;
	filePath: string;
	active: boolean;
	objects: ObjectSnapshot[];
	colliders: ColliderSnapshot[];
	camera?: CameraSnapshot;
	inputs: InputSnapshot[];
}

export interface ObjectSnapshot {
	index: number;
	id: string;
	name: string;
	type: string;
	x: number;
	y: number;
	properties: Record<string, unknown>;
}

export interface ColliderSnapshot {
	objectA: string;
	objectB: string;
	type: "collide" | "overlap";
	callback?: string;
}

export interface CameraSnapshot {
	follow?: string;
	zoom: number;
	bounds?: { x: number; y: number; width: number; height: number };
	scrollX: number;
	scrollY: number;
}

export interface InputSnapshot {
	type: "keyboard" | "pointer";
	key?: string;
	event: string;
	action: string;
}

export interface AssetSnapshot {
	key: string;
	type: string;
	path: string;
}

export interface AnimationSnapshot {
	key: string;
	texture: string;
	frames: string;
	frameRate: number;
	repeat: number;
}

export class GameContextBuilder {
	buildContext(context: GameContext): string {
		const lines: string[] = [];

		lines.push("=== Game Context ===");
		lines.push(`Project: ${context.project.name}`);
		lines.push(`Engine: ${context.project.engine}`);
		lines.push(
			`Canvas: ${context.canvas.width}x${context.canvas.height} @ ${context.canvas.fps}fps`,
		);
		lines.push("");

		lines.push(`=== Scenes (${context.scenes.length}) ===`);
		for (const scene of context.scenes) {
			const status = scene.active ? "[active]" : "[inactive]";
			lines.push(`${status} ${scene.name} (${scene.filePath})`);

			if (scene.active && scene.objects.length > 0) {
				lines.push(`  Objects (${scene.objects.length}):`);
				for (const obj of scene.objects) {
					const propsStr = Object.entries(obj.properties)
						.map(([k, v]) => `${k}=${JSON.stringify(v)}`)
						.join(" ");
					lines.push(
						`    #${obj.index} "${obj.name}" ${obj.type} x=${obj.x} y=${obj.y} ${propsStr}`,
					);
				}
			}

			if (scene.active && scene.colliders.length > 0) {
				lines.push("  Colliders:");
				for (const col of scene.colliders) {
					const cb = col.callback ? ` → ${col.callback}` : "";
					lines.push(
						`    ${col.objectA} ↔ ${col.objectB} (${col.type}${cb})`,
					);
				}
			}

			if (scene.active && scene.camera) {
				const cam = scene.camera;
				const follow = cam.follow ? `following "${cam.follow}", ` : "";
				const bounds = cam.bounds
					? `bounds=(${cam.bounds.x},${cam.bounds.y},${cam.bounds.width},${cam.bounds.height})`
					: "";
				lines.push(`  Camera: ${follow}${bounds}`);
			}

			if (scene.active && scene.inputs.length > 0) {
				const inputStr = scene.inputs
					.map((i) => `${i.key ?? i.type} → ${i.action}`)
					.join(", ");
				lines.push(`  Input: ${inputStr}`);
			}
		}
		lines.push("");

		if (context.assets.length > 0) {
			lines.push(`=== Assets (${context.assets.length} loaded) ===`);
			const grouped = new Map<string, AssetSnapshot[]>();
			for (const asset of context.assets) {
				const list = grouped.get(asset.type) ?? [];
				list.push(asset);
				grouped.set(asset.type, list);
			}
			for (const [type, assets] of grouped) {
				lines.push(
					`  ${type}: ${assets.map((a) => a.key).join(", ")}`,
				);
			}
			lines.push("");
		}

		if (context.animations.length > 0) {
			lines.push(`=== Animations (${context.animations.length}) ===`);
			for (const anim of context.animations) {
				lines.push(
					`  "${anim.key}": ${anim.texture} ${anim.frames} @ ${anim.frameRate}fps repeat=${anim.repeat}`,
				);
			}
			lines.push("");
		}

		lines.push("=== Recent Errors ===");
		if (context.errors.length > 0) {
			for (const err of context.errors) {
				lines.push(`  ${err}`);
			}
		} else {
			lines.push("  (none)");
		}

		return lines.join("\n");
	}
}
