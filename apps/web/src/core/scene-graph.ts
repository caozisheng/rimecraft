export interface SceneGraph {
	version: 1;
	settings: SceneSettings;
	assets: SceneAssetRef[];
	objects: SceneObject[];
}

export interface SceneSettings {
	width: number;
	height: number;
	backgroundColor: string;
	physics?: {
		type: "arcade" | "matter";
		gravity?: { x: number; y: number };
	};
}

export interface SceneAssetRef {
	key: string;
	assetId: string;
	type: "image" | "spritesheet" | "generated";
}

export interface SceneObject {
	id: string;
	type:
		| "sprite"
		| "image"
		| "text"
		| "graphics"
		| "container"
		| "tilemap"
		| "particles";
	name: string;
	label?: string;

	x: number;
	y: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	originX?: number;
	originY?: number;

	alpha?: number;
	visible?: boolean;
	depth?: number;
	tint?: number;

	texture?: string;
	frame?: string | number;
	frameConfig?: { frameWidth: number; frameHeight: number };
	text?: string;
	style?: Record<string, unknown>;
	generatorCode?: string;

	physics?: {
		type: "arcade";
		bodyType: "dynamic" | "static";
		bounce?: number;
		gravity?: boolean;
		collideWorldBounds?: boolean;
	};

	children?: SceneObject[];
	behaviors?: string[];
}

export interface SceneObjectBounds {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	originX: number;
	originY: number;
}

export function createEmptyScene(
	width = 800,
	height = 600,
): SceneGraph {
	return {
		version: 1,
		settings: { width, height, backgroundColor: "#1a1a2e" },
		assets: [],
		objects: [],
	};
}

let _nextId = 1;
export function generateObjectId(): string {
	return `obj_${Date.now().toString(36)}_${(_nextId++).toString(36)}`;
}

export function findObject(
	objects: SceneObject[],
	id: string,
): SceneObject | undefined {
	for (const obj of objects) {
		if (obj.id === id) return obj;
		if (obj.children) {
			const found = findObject(obj.children, id);
			if (found) return found;
		}
	}
	return undefined;
}

export function removeObject(
	objects: SceneObject[],
	id: string,
): boolean {
	const idx = objects.findIndex((o) => o.id === id);
	if (idx !== -1) {
		objects.splice(idx, 1);
		return true;
	}
	for (const obj of objects) {
		if (obj.children && removeObject(obj.children, id)) return true;
	}
	return false;
}

export function flattenObjects(objects: SceneObject[]): SceneObject[] {
	const result: SceneObject[] = [];
	for (const obj of objects) {
		result.push(obj);
		if (obj.children) {
			result.push(...flattenObjects(obj.children));
		}
	}
	return result;
}
