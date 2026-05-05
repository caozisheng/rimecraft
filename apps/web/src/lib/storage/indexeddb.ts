import type {
	ProjectMeta,
	Project,
	FileEntry,
	RimecraftManifest,
} from "@rimecraft/core";
import { openDB, type IDBPDatabase } from "idb";
import type { StorageProvider } from "./types";

const DB_NAME = "rimecraft";
const DB_VERSION = 1;
const PROJECTS_STORE = "projects";
const FILES_STORE = "files";
const ASSETS_STORE = "assets";

interface ProjectRecord {
	id: string;
	meta: ProjectMeta;
	manifest: RimecraftManifest;
}

interface FileRecord {
	key: string;
	projectId: string;
	path: string;
	content: string;
	modifiedAt: string;
}

interface AssetRecord {
	key: string;
	projectId: string;
	path: string;
	blob: Blob;
}

function fileKey(projectId: string, path: string): string {
	return `${projectId}:${path}`;
}

async function getDb(): Promise<IDBPDatabase> {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
				db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains(FILES_STORE)) {
				const fileStore = db.createObjectStore(FILES_STORE, {
					keyPath: "key",
				});
				fileStore.createIndex("projectId", "projectId");
			}
			if (!db.objectStoreNames.contains(ASSETS_STORE)) {
				const assetStore = db.createObjectStore(ASSETS_STORE, {
					keyPath: "key",
				});
				assetStore.createIndex("projectId", "projectId");
			}
		},
	});
}

export class IndexedDBStorageProvider implements StorageProvider {
	async createProject(meta: ProjectMeta): Promise<Project> {
		const db = await getDb();
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

		const record: ProjectRecord = { id: meta.id, meta, manifest };
		await db.put(PROJECTS_STORE, record);

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
		const db = await getDb();
		const record = (await db.get(PROJECTS_STORE, id)) as
			| ProjectRecord
			| undefined;
		if (!record) {
			throw new Error(`Project not found: ${id}`);
		}
		const files = await this.listFiles(id);
		return { meta: record.meta, manifest: record.manifest, files };
	}

	async saveProject(project: Project): Promise<void> {
		const db = await getDb();
		const record: ProjectRecord = {
			id: project.meta.id,
			meta: {
				...project.meta,
				updatedAt: new Date().toISOString(),
			},
			manifest: {
				...project.manifest,
				updatedAt: new Date().toISOString(),
			},
		};
		await db.put(PROJECTS_STORE, record);
	}

	async deleteProject(id: string): Promise<void> {
		const db = await getDb();
		await db.delete(PROJECTS_STORE, id);

		const fileTx = db.transaction(FILES_STORE, "readwrite");
		const fileIndex = fileTx.store.index("projectId");
		let fileCursor = await fileIndex.openCursor(id);
		while (fileCursor) {
			await fileCursor.delete();
			fileCursor = await fileCursor.continue();
		}

		const assetTx = db.transaction(ASSETS_STORE, "readwrite");
		const assetIndex = assetTx.store.index("projectId");
		let assetCursor = await assetIndex.openCursor(id);
		while (assetCursor) {
			await assetCursor.delete();
			assetCursor = await assetCursor.continue();
		}
	}

	async listProjects(): Promise<ProjectMeta[]> {
		const db = await getDb();
		const records = (await db.getAll(
			PROJECTS_STORE,
		)) as ProjectRecord[];
		return records.map((r) => r.meta);
	}

	async readFile(projectId: string, path: string): Promise<string> {
		const db = await getDb();
		const record = (await db.get(
			FILES_STORE,
			fileKey(projectId, path),
		)) as FileRecord | undefined;
		if (!record) {
			throw new Error(`File not found: ${path}`);
		}
		return record.content;
	}

	async writeFile(
		projectId: string,
		path: string,
		content: string,
	): Promise<void> {
		const db = await getDb();
		const record: FileRecord = {
			key: fileKey(projectId, path),
			projectId,
			path,
			content,
			modifiedAt: new Date().toISOString(),
		};
		await db.put(FILES_STORE, record);
	}

	async deleteFile(projectId: string, path: string): Promise<void> {
		const db = await getDb();
		await db.delete(FILES_STORE, fileKey(projectId, path));
	}

	async listFiles(projectId: string): Promise<FileEntry[]> {
		const db = await getDb();
		const tx = db.transaction(FILES_STORE, "readonly");
		const index = tx.store.index("projectId");
		const records = (await index.getAll(projectId)) as FileRecord[];
		return records.map((r) => ({
			path: r.path,
			type: "file" as const,
			modifiedAt: r.modifiedAt,
		}));
	}

	async readAsset(projectId: string, path: string): Promise<Blob> {
		const db = await getDb();
		const record = (await db.get(
			ASSETS_STORE,
			fileKey(projectId, path),
		)) as AssetRecord | undefined;
		if (!record) {
			throw new Error(`Asset not found: ${path}`);
		}
		return record.blob;
	}

	async writeAsset(
		projectId: string,
		path: string,
		blob: Blob,
	): Promise<void> {
		const db = await getDb();
		const record: AssetRecord = {
			key: fileKey(projectId, path),
			projectId,
			path,
			blob,
		};
		await db.put(ASSETS_STORE, record);
	}

	async exportProject(id: string): Promise<Blob> {
		const { default: JSZip } = await import("jszip");
		const zip = new JSZip();

		const project = await this.openProject(id);
		zip.file(
			"rimecraft.json",
			JSON.stringify(project.manifest, null, 2),
		);

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
			throw new Error(
				"Invalid .rimecraft file: missing rimecraft.json",
			);
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

		const db = await getDb();
		await db.put(PROJECTS_STORE, {
			id: newId,
			meta,
			manifest: newManifest,
		});

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
		// 标题文字
		this.add
			.text(400, 200, "${meta.name}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		// 开始按钮
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
		// 在这里创建游戏对象
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
