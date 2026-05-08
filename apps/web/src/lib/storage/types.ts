import type { ProjectMeta, Project, FileEntry } from "@rimecraft/core";

export interface ExportOptions {
	chatMessages?: unknown[];
}

export interface ImportResult {
	project: Project;
	chatMessages?: unknown[];
}

export interface StorageProvider {
	createProject(meta: ProjectMeta): Promise<Project>;
	openProject(id: string): Promise<Project>;
	saveProject(project: Project): Promise<void>;
	deleteProject(id: string): Promise<void>;
	listProjects(): Promise<ProjectMeta[]>;

	readFile(projectId: string, path: string): Promise<string>;
	writeFile(
		projectId: string,
		path: string,
		content: string,
	): Promise<void>;
	deleteFile(projectId: string, path: string): Promise<void>;
	listFiles(projectId: string): Promise<FileEntry[]>;

	readAsset(projectId: string, path: string): Promise<Blob>;
	writeAsset(
		projectId: string,
		path: string,
		blob: Blob,
	): Promise<void>;
	getAssetUrl(projectId: string, path: string): Promise<string>;

	exportProject(id: string, options?: ExportOptions): Promise<Blob>;
	downloadExport(id: string, fileName: string, options?: ExportOptions): Promise<void>;
	importProject(blob: Blob): Promise<ImportResult>;
}
