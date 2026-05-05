import type { ProjectMeta, Project, FileEntry } from "@rimecraft/core";

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

	exportProject(id: string): Promise<Blob>;
	importProject(blob: Blob): Promise<Project>;
}
