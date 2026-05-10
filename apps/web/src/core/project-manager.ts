import type { ProjectMeta, Project, FileEntry } from "@rimecraft/core";
import { IndexedDBStorageProvider } from "@/lib/storage/indexeddb";
import type { StorageProvider } from "@/lib/storage/types";
import { useProjectStore } from "@/stores/project-store";
import { useChatStore } from "@/stores/chat-store";

function isTauri(): boolean {
	return typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
}

export class ProjectManager {
	private storage: StorageProvider;
	private ready: Promise<void>;
	private _idbStorage: IndexedDBStorageProvider | null = null;

	constructor() {
		const idb = new IndexedDBStorageProvider();
		this._idbStorage = idb;
		this.storage = idb;
		this.ready = this.initStorage();
	}

	private async initStorage(): Promise<void> {
		if (isTauri()) {
			try {
				const { TauriStorageProvider } = await import(
					/* webpackIgnore: true */ "@/lib/storage/tauri"
				);
				this.storage = new TauriStorageProvider();
			} catch (e) {
				console.warn("Failed to init TauriStorageProvider, falling back to IndexedDB:", e);
			}
		}
	}

	private async ensureReady(): Promise<void> {
		await this.ready;
	}

	private getIdb(): IndexedDBStorageProvider {
		return this._idbStorage!;
	}

	getStorage(): StorageProvider {
		return this.storage;
	}

	async createProject(meta: ProjectMeta): Promise<Project> {
		await this.ensureReady();
		await this.persistCurrentChat();

		const project = await this.storage.createProject(meta);

		const store = useProjectStore.getState();
		store.setCurrentProject(project.meta);
		store.setManifest(project.manifest);
		store.setFiles(project.files);
		store.addRecentProject(project.meta);

		useChatStore.getState().clearMessages();

		return project;
	}

	async openProject(id: string): Promise<Project> {
		await this.ensureReady();
		await this.persistCurrentChat();

		const project = await this.storage.openProject(id);

		const store = useProjectStore.getState();
		store.setCurrentProject(project.meta);
		store.setManifest(project.manifest);
		store.setFiles(project.files);
		store.addRecentProject(project.meta);

		await this.restoreChat(id);

		return project;
	}

	async saveProject(): Promise<void> {
		await this.ensureReady();
		const store = useProjectStore.getState();
		if (!store.currentProject || !store.manifest) return;

		await this.storage.saveProject({
			meta: store.currentProject,
			manifest: store.manifest,
			files: store.files,
		});
	}

	async deleteProject(id: string): Promise<void> {
		await this.ensureReady();
		await this.storage.deleteProject(id);
		const store = useProjectStore.getState();
		if (store.currentProject?.id === id) {
			store.closeProject();
		}
	}

	async listProjects(): Promise<ProjectMeta[]> {
		await this.ensureReady();
		return this.storage.listProjects();
	}

	async readFile(path: string): Promise<string> {
		await this.ensureReady();
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		return this.storage.readFile(projectId, path);
	}

	async writeFile(path: string, content: string): Promise<void> {
		await this.ensureReady();
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		await this.storage.writeFile(projectId, path, content);
	}

	async deleteFile(path: string): Promise<void> {
		await this.ensureReady();
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		await this.storage.deleteFile(projectId, path);
	}

	async exportProject(): Promise<Blob> {
		await this.ensureReady();
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		const chatMessages = useChatStore.getState().messages;
		return this.storage.exportProject(projectId, { chatMessages });
	}

	async downloadExport(fileName: string): Promise<void> {
		await this.ensureReady();
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");
		const chatMessages = useChatStore.getState().messages;
		await this.storage.downloadExport(projectId, fileName, { chatMessages });
	}

	async importProject(blob: Blob): Promise<Project> {
		await this.ensureReady();
		const result = await this.storage.importProject(blob);

		if (result.chatMessages && Array.isArray(result.chatMessages) && result.chatMessages.length > 0) {
			const chatStore = useChatStore.getState();
			chatStore.clearMessages();
			for (const msg of result.chatMessages) {
				const m = msg as any;
				if (m && m.role && m.content !== undefined) {
					chatStore.addMessage(m.role, m.content, {
						id: m.id,
						toolCalls: m.toolCalls,
						toolCallId: m.toolCallId,
						toolResults: m.toolResults,
						commandCheckpoint: m.commandCheckpoint,
						createdAt: m.createdAt,
					});
				}
			}
		}

		return result.project;
	}

	async persistCurrentChat(): Promise<void> {
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) return;
		const messages = useChatStore.getState().messages;
		if (messages.length === 0) return;
		try {
			await this.getIdb().saveChatMessages(projectId, messages);
		} catch (e) {
			console.warn("Failed to persist chat:", e);
		}
	}

	async saveChatMessages(): Promise<void> {
		await this.persistCurrentChat();
	}

	private async restoreChat(projectId: string): Promise<void> {
		try {
			const saved = await this.getIdb().loadChatMessages(projectId);
			const chatStore = useChatStore.getState();
			chatStore.clearMessages();
			if (Array.isArray(saved) && saved.length > 0) {
				for (const msg of saved) {
					const m = msg as any;
					if (m && m.role && m.content !== undefined) {
						chatStore.addMessage(m.role, m.content, {
							id: m.id,
							toolCalls: m.toolCalls,
							toolCallId: m.toolCallId,
							toolResults: m.toolResults,
							commandCheckpoint: m.commandCheckpoint,
							createdAt: m.createdAt,
						});
					}
				}
			}
		} catch (e) {
			console.warn("Failed to restore chat:", e);
		}
	}
}
