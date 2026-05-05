import type { ProjectMeta, Project, FileEntry } from "@rimecraft/core";
import { IndexedDBStorageProvider } from "@/lib/storage/indexeddb";
import type { StorageProvider } from "@/lib/storage/types";
import { useProjectStore } from "@/stores/project-store";

export class ProjectManager {
	private storage: StorageProvider;

	constructor() {
		this.storage = new IndexedDBStorageProvider();
	}

	getStorage(): StorageProvider {
		return this.storage;
	}

	async createProject(
		meta: ProjectMeta,
	): Promise<Project> {
		const project = await this.storage.createProject(meta);

		const store = useProjectStore.getState();
		store.setCurrentProject(project.meta);
		store.setManifest(project.manifest);
		store.setFiles(project.files);
		store.addRecentProject(project.meta);

		return project;
	}

	async openProject(id: string): Promise<Project> {
		const project = await this.storage.openProject(id);

		const store = useProjectStore.getState();
		store.setCurrentProject(project.meta);
		store.setManifest(project.manifest);
		store.setFiles(project.files);
		store.addRecentProject(project.meta);

		return project;
	}

	async saveProject(): Promise<void> {
		const store = useProjectStore.getState();
		if (!store.currentProject || !store.manifest) return;

		await this.storage.saveProject({
			meta: store.currentProject,
			manifest: store.manifest,
			files: store.files,
		});
	}

	async deleteProject(id: string): Promise<void> {
		await this.storage.deleteProject(id);
		const store = useProjectStore.getState();
		if (store.currentProject?.id === id) {
			store.closeProject();
		}
	}

	async listProjects(): Promise<ProjectMeta[]> {
		return this.storage.listProjects();
	}

	async readFile(path: string): Promise<string> {
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		return this.storage.readFile(projectId, path);
	}

	async writeFile(path: string, content: string): Promise<void> {
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		await this.storage.writeFile(projectId, path, content);
	}

	async deleteFile(path: string): Promise<void> {
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		await this.storage.deleteFile(projectId, path);
	}

	async exportProject(): Promise<Blob> {
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		return this.storage.exportProject(projectId);
	}

	async importProject(blob: Blob): Promise<Project> {
		return this.storage.importProject(blob);
	}
}
