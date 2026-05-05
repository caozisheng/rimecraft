import { v7 as uuidv7 } from "uuid";

export function generateProjectId(): string {
	return `proj_${uuidv7().replace(/-/g, "").slice(0, 12)}`;
}

export function generateObjectId(): string {
	return `obj_${uuidv7().replace(/-/g, "").slice(0, 8)}`;
}

export const SUPPORTED_IMAGE_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"image/svg+xml",
] as const;

export const SUPPORTED_AUDIO_TYPES = [
	"audio/mpeg",
	"audio/wav",
	"audio/ogg",
	"audio/webm",
] as const;

export const DEFAULT_CANVAS_WIDTH = 800;
export const DEFAULT_CANVAS_HEIGHT = 600;
export const DEFAULT_FPS = 60;

export const PROJECT_DIR_STRUCTURE = {
	src: {
		"main.ts": true,
		scenes: {},
		objects: {},
		config: {},
	},
	assets: {
		images: {},
		audio: {},
		tilemaps: {},
		fonts: {},
	},
	".chat": {
		"history.json": true,
	},
} as const;
