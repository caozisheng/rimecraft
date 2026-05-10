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

function fuzzyScore(a: string, b: string): number {
	const al = a.toLowerCase();
	const bl = b.toLowerCase();
	if (al === bl) return 1;
	if (al.includes(bl) || bl.includes(al)) return 0.8;
	let matches = 0;
	const shorter = al.length < bl.length ? al : bl;
	const longer = al.length < bl.length ? bl : al;
	for (const ch of shorter) {
		if (longer.includes(ch)) matches++;
	}
	return matches / Math.max(al.length, bl.length);
}

export function resolveObjectId(
	objects: SceneObject[],
	idOrName: string,
): SceneObject | undefined {
	const exact = findObject(objects, idOrName);
	if (exact) return exact;

	const flat = flattenObjects(objects);
	const byName = flat.find(
		(o) => o.name.toLowerCase() === idOrName.toLowerCase(),
	);
	if (byName) return byName;

	const byLabel = flat.find(
		(o) => o.label?.toLowerCase() === idOrName.toLowerCase(),
	);
	if (byLabel) return byLabel;

	const partialName = flat.find(
		(o) => o.name.toLowerCase().includes(idOrName.toLowerCase()),
	);
	if (partialName) return partialName;

	const scored = flat
		.map((o) => ({ obj: o, score: Math.max(fuzzyScore(o.name, idOrName), fuzzyScore(o.id, idOrName)) }))
		.filter((s) => s.score >= 0.5)
		.sort((a, b) => b.score - a.score);
	return scored[0]?.obj;
}

export function getSimilarObjects(
	objects: SceneObject[],
	idOrName: string,
	limit = 5,
): Array<{ id: string; name: string; type: string }> {
	const flat = flattenObjects(objects);
	return flat
		.map((o) => ({
			id: o.id,
			name: o.name,
			type: o.type,
			score: Math.max(fuzzyScore(o.name, idOrName), fuzzyScore(o.id, idOrName)),
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ id, name, type }) => ({ id, name, type }));
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
