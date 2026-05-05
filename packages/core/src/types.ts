export interface RimecraftManifest {
	id: string;
	name: string;
	version: string;
	engine: string;
	template?: string;
	author: {
		uid: string;
		name: string;
	};
	forkedFrom: string | null;
	createdAt: string;
	updatedAt: string;
	thumbnail?: string;
	tags: string[];
	visibility: "private" | "unlisted" | "public";
	collaborators: string[];
}

export interface ProjectMeta {
	id: string;
	name: string;
	template?: string;
	createdAt: string;
	updatedAt: string;
	thumbnail?: string;
	tags: string[];
}

export interface Project {
	meta: ProjectMeta;
	manifest: RimecraftManifest;
	files: FileEntry[];
}

export interface FileEntry {
	path: string;
	type: "file" | "directory";
	size?: number;
	modifiedAt?: string;
}

export interface SceneMeta {
	id: string;
	name: string;
	type: "menu" | "game" | "ui" | "gameover" | "custom";
	filePath: string;
}

export interface GameObjectMeta {
	id: string;
	name: string;
	type:
		| "sprite"
		| "image"
		| "text"
		| "tilesprite"
		| "graphics"
		| "group"
		| "container";
	sceneId: string;
	x: number;
	y: number;
	properties: Record<string, unknown>;
}

export interface AssetMeta {
	id: string;
	key: string;
	type: "image" | "spritesheet" | "audio" | "tilemap" | "font";
	path: string;
	size?: number;
}

export interface GameConfig {
	width: number;
	height: number;
	backgroundColor: string;
	physics: {
		default: "arcade" | "matter";
		arcade?: {
			gravity: { x: number; y: number };
			debug: boolean;
		};
		matter?: {
			gravity: { x: number; y: number };
			debug: boolean;
		};
	};
	fps: number;
}

export interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: string;
	toolCalls?: ToolCall[];
}

export interface ToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
	result?: ToolCallResult;
}

export interface ToolCallResult {
	success: boolean;
	data?: unknown;
	error?: string;
	undoable: boolean;
}

export interface ExpertRole {
	id: string;
	name: string;
	description: string;
	systemPrompt: string;
	tools: string[];
}
