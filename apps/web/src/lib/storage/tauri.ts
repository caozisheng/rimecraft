import type {
	ProjectMeta,
	Project,
	FileEntry,
	RimecraftManifest,
} from "@rimecraft/core";
import type { StorageProvider } from "./types";
import {
	readTextFile,
	writeTextFile,
	readDir,
	mkdir,
	remove,
	exists,
	BaseDirectory,
} from "@tauri-apps/plugin-fs";
import { homeDir } from "@tauri-apps/api/path";

const ROOT_DIR = "RimeCraft/projects";

async function getProjectRoot(): Promise<string> {
	const home = await homeDir();
	return `${home}${ROOT_DIR}`;
}

function projectPath(base: string, projectId: string): string {
	return `${base}/${projectId}`;
}

async function ensureDir(path: string): Promise<void> {
	if (!(await exists(path))) {
		await mkdir(path, { recursive: true });
	}
}

export class TauriStorageProvider implements StorageProvider {
	private rootPromise: Promise<string> | null = null;

	private async getRoot(): Promise<string> {
		if (!this.rootPromise) {
			this.rootPromise = getProjectRoot();
		}
		const root = await this.rootPromise;
		await ensureDir(root);
		return root;
	}

	async createProject(meta: ProjectMeta): Promise<Project> {
		const root = await this.getRoot();
		const projDir = projectPath(root, meta.id);
		await ensureDir(projDir);
		await ensureDir(`${projDir}/src`);
		await ensureDir(`${projDir}/assets`);

		const manifest: RimecraftManifest = {
			id: meta.id,
			name: meta.name,
			version: "0.1.0",
			engine: "phaser@4.0",
			template: meta.template,
			author: { uid: "local", name: "本地用户" },
			forkedFrom: null,
			createdAt: meta.createdAt,
			updatedAt: meta.updatedAt,
			tags: meta.tags,
			visibility: "private",
			collaborators: [],
		};

		await writeTextFile(
			`${projDir}/rimecraft.json`,
			JSON.stringify({ meta, manifest }, null, 2),
		);

		const defaultFiles = this.getDefaultProjectFiles(meta);
		for (const file of defaultFiles) {
			await this.writeFile(meta.id, file.path, file.content);
		}

		return {
			meta,
			manifest,
			files: defaultFiles.map((f) => ({
				path: f.path,
				type: "file" as const,
			})),
		};
	}

	async openProject(id: string): Promise<Project> {
		const root = await this.getRoot();
		const projDir = projectPath(root, id);

		const raw = await readTextFile(`${projDir}/rimecraft.json`);
		const record = JSON.parse(raw) as { meta: ProjectMeta; manifest: RimecraftManifest };

		const files = await this.listFiles(id);
		return { meta: record.meta, manifest: record.manifest, files };
	}

	async saveProject(project: Project): Promise<void> {
		const root = await this.getRoot();
		const projDir = projectPath(root, project.meta.id);

		const updatedMeta = { ...project.meta, updatedAt: new Date().toISOString() };
		const updatedManifest = { ...project.manifest, updatedAt: new Date().toISOString() };

		await writeTextFile(
			`${projDir}/rimecraft.json`,
			JSON.stringify({ meta: updatedMeta, manifest: updatedManifest }, null, 2),
		);
	}

	async deleteProject(id: string): Promise<void> {
		const root = await this.getRoot();
		const projDir = projectPath(root, id);
		if (await exists(projDir)) {
			await remove(projDir, { recursive: true });
		}
	}

	async listProjects(): Promise<ProjectMeta[]> {
		const root = await this.getRoot();
		if (!(await exists(root))) return [];

		const entries = await readDir(root);
		const projects: ProjectMeta[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory) continue;
			const manifestPath = `${root}/${entry.name}/rimecraft.json`;
			if (!(await exists(manifestPath))) continue;

			try {
				const raw = await readTextFile(manifestPath);
				const record = JSON.parse(raw) as { meta: ProjectMeta };
				projects.push(record.meta);
			} catch {
				// Skip corrupted project entries
			}
		}

		return projects;
	}

	async readFile(projectId: string, path: string): Promise<string> {
		const root = await this.getRoot();
		const filePath = `${projectPath(root, projectId)}/${path}`;
		if (!(await exists(filePath))) {
			throw new Error(`File not found: ${path}`);
		}
		return readTextFile(filePath);
	}

	async writeFile(projectId: string, path: string, content: string): Promise<void> {
		const root = await this.getRoot();
		const filePath = `${projectPath(root, projectId)}/${path}`;

		const dir = filePath.substring(0, filePath.lastIndexOf("/"));
		await ensureDir(dir);

		await writeTextFile(filePath, content);
	}

	async deleteFile(projectId: string, path: string): Promise<void> {
		const root = await this.getRoot();
		const filePath = `${projectPath(root, projectId)}/${path}`;
		if (await exists(filePath)) {
			await remove(filePath);
		}
	}

	async listFiles(projectId: string): Promise<FileEntry[]> {
		const root = await this.getRoot();
		const projDir = projectPath(root, projectId);
		const files: FileEntry[] = [];

		await this.walkDir(projDir, projDir, files);
		return files;
	}

	private async walkDir(baseDir: string, currentDir: string, files: FileEntry[]): Promise<void> {
		if (!(await exists(currentDir))) return;

		const entries = await readDir(currentDir);
		for (const entry of entries) {
			const fullPath = `${currentDir}/${entry.name}`;
			const relativePath = fullPath.substring(baseDir.length + 1);

			if (relativePath === "rimecraft.json") continue;
			if (relativePath.startsWith("assets/")) continue;

			if (entry.isDirectory) {
				await this.walkDir(baseDir, fullPath, files);
			} else {
				files.push({ path: relativePath, type: "file" });
			}
		}
	}

	async readAsset(projectId: string, path: string): Promise<Blob> {
		const root = await this.getRoot();
		const filePath = `${projectPath(root, projectId)}/assets/${path}`;
		if (!(await exists(filePath))) {
			throw new Error(`Asset not found: ${path}`);
		}
		const content = await readTextFile(filePath);
		return new Blob([content]);
	}

	async writeAsset(projectId: string, path: string, blob: Blob): Promise<void> {
		const root = await this.getRoot();
		const filePath = `${projectPath(root, projectId)}/assets/${path}`;

		const dir = filePath.substring(0, filePath.lastIndexOf("/"));
		await ensureDir(dir);

		const content = await blob.text();
		await writeTextFile(filePath, content);
	}

	async exportProject(id: string): Promise<Blob> {
		const { default: JSZip } = await import("jszip");
		const zip = new JSZip();

		const project = await this.openProject(id);
		zip.file("rimecraft.json", JSON.stringify(project.manifest, null, 2));

		for (const file of project.files) {
			if (file.type === "file") {
				try {
					const content = await this.readFile(id, file.path);
					zip.file(file.path, content);
				} catch {
					// Skip files that can't be read
				}
			}
		}

		return zip.generateAsync({ type: "blob" });
	}

	async importProject(blob: Blob): Promise<Project> {
		const { default: JSZip } = await import("jszip");
		const zip = await JSZip.loadAsync(blob);

		const manifestFile = zip.file("rimecraft.json");
		if (!manifestFile) {
			throw new Error("Invalid .rimecraft file: missing rimecraft.json");
		}

		const manifestStr = await manifestFile.async("string");
		const manifest = JSON.parse(manifestStr) as RimecraftManifest;

		const newId = `proj_${Date.now().toString(36)}`;
		const meta: ProjectMeta = {
			id: newId,
			name: manifest.name,
			template: manifest.template,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			tags: manifest.tags,
		};

		const newManifest: RimecraftManifest = {
			...manifest,
			id: newId,
			forkedFrom: manifest.id,
			createdAt: meta.createdAt,
			updatedAt: meta.updatedAt,
		};

		const root = await this.getRoot();
		const projDir = projectPath(root, newId);
		await ensureDir(projDir);
		await ensureDir(`${projDir}/src`);
		await ensureDir(`${projDir}/assets`);

		await writeTextFile(
			`${projDir}/rimecraft.json`,
			JSON.stringify({ meta, manifest: newManifest }, null, 2),
		);

		const files: FileEntry[] = [];
		for (const [path, file] of Object.entries(zip.files)) {
			if (file.dir || path === "rimecraft.json") continue;

			const content = await file.async("string");
			await this.writeFile(newId, path, content);
			files.push({ path, type: "file" });
		}

		return { meta, manifest: newManifest, files };
	}

	private getDefaultProjectFiles(
		meta: ProjectMeta,
	): { path: string; content: string }[] {
		return [
			{
				path: "src/main.ts",
				content: `import Phaser from "phaser";
import { GameScene } from "./scenes/game-scene";
import { MenuScene } from "./scenes/menu-scene";

const config: Phaser.Types.Core.GameConfig = {
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
			.text(400, 400, "点击开始游戏", {
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
		// 在这里加载游戏资源
	}

	create() {
		this.add
			.text(400, 300, "游戏场景 - 开始创作吧!", {
				fontSize: "24px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);
	}

	update() {
		// 在这里编写游戏逻辑
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
}
