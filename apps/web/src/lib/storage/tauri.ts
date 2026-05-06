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
} from "@tauri-apps/plugin-fs";
import { appDataDir, sep } from "@tauri-apps/api/path";
import { generateTemplateFiles } from "../templates";

async function getProjectRoot(): Promise<string> {
	const base = await appDataDir();
	return base + "projects";
}

function joinPath(...parts: string[]): string {
	return parts.join(sep());
}

function parentDir(path: string): string {
	const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	return i > 0 ? path.substring(0, i) : path;
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
		const projDir = joinPath(root, meta.id);
		await ensureDir(projDir);
		await ensureDir(joinPath(projDir, "src"));
		await ensureDir(joinPath(projDir, "assets"));

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
			joinPath(projDir, "rimecraft.json"),
			JSON.stringify({ meta, manifest }, null, 2),
		);

		const defaultFiles = generateTemplateFiles(meta);
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
		const projDir = joinPath(root, id);

		const raw = await readTextFile(joinPath(projDir, "rimecraft.json"));
		const record = JSON.parse(raw) as { meta: ProjectMeta; manifest: RimecraftManifest };

		const files = await this.listFiles(id);
		return { meta: record.meta, manifest: record.manifest, files };
	}

	async saveProject(project: Project): Promise<void> {
		const root = await this.getRoot();
		const projDir = joinPath(root, project.meta.id);

		const updatedMeta = { ...project.meta, updatedAt: new Date().toISOString() };
		const updatedManifest = { ...project.manifest, updatedAt: new Date().toISOString() };

		await writeTextFile(
			joinPath(projDir, "rimecraft.json"),
			JSON.stringify({ meta: updatedMeta, manifest: updatedManifest }, null, 2),
		);
	}

	async deleteProject(id: string): Promise<void> {
		const root = await this.getRoot();
		const projDir = joinPath(root, id);
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
			const manifestPath = joinPath(root, entry.name, "rimecraft.json");
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

	async readFile(projectId: string, filePath: string): Promise<string> {
		const root = await this.getRoot();
		const full = joinPath(root, projectId, ...filePath.split("/"));
		if (!(await exists(full))) {
			throw new Error(`File not found: ${filePath}`);
		}
		return readTextFile(full);
	}

	async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
		const root = await this.getRoot();
		const full = joinPath(root, projectId, ...filePath.split("/"));
		await ensureDir(parentDir(full));
		await writeTextFile(full, content);
	}

	async deleteFile(projectId: string, filePath: string): Promise<void> {
		const root = await this.getRoot();
		const full = joinPath(root, projectId, ...filePath.split("/"));
		if (await exists(full)) {
			await remove(full);
		}
	}

	async listFiles(projectId: string): Promise<FileEntry[]> {
		const root = await this.getRoot();
		const projDir = joinPath(root, projectId);
		const files: FileEntry[] = [];
		await this.walkDir(projDir, projDir, files);
		return files;
	}

	private async walkDir(baseDir: string, currentDir: string, files: FileEntry[]): Promise<void> {
		if (!(await exists(currentDir))) return;

		const entries = await readDir(currentDir);
		for (const entry of entries) {
			const fullPath = joinPath(currentDir, entry.name);
			const relativePath = fullPath
				.substring(baseDir.length + 1)
				.replace(/\\/g, "/");

			if (relativePath === "rimecraft.json") continue;
			if (relativePath.startsWith("assets/") || relativePath.startsWith("assets\\")) continue;

			if (entry.isDirectory) {
				await this.walkDir(baseDir, fullPath, files);
			} else {
				files.push({ path: relativePath, type: "file" });
			}
		}
	}

	async readAsset(projectId: string, assetPath: string): Promise<Blob> {
		const root = await this.getRoot();
		const full = joinPath(root, projectId, "assets", ...assetPath.split("/"));
		if (!(await exists(full))) {
			throw new Error(`Asset not found: ${assetPath}`);
		}
		const content = await readTextFile(full);
		return new Blob([content]);
	}

	async writeAsset(projectId: string, assetPath: string, blob: Blob): Promise<void> {
		const root = await this.getRoot();
		const full = joinPath(root, projectId, "assets", ...assetPath.split("/"));
		await ensureDir(parentDir(full));
		const content = await blob.text();
		await writeTextFile(full, content);
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
		const projDir = joinPath(root, newId);
		await ensureDir(projDir);
		await ensureDir(joinPath(projDir, "src"));
		await ensureDir(joinPath(projDir, "assets"));

		await writeTextFile(
			joinPath(projDir, "rimecraft.json"),
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
}
