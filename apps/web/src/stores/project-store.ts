import { create } from "zustand";
import type { ProjectMeta, RimecraftManifest, FileEntry } from "@rimecraft/core";

interface ProjectState {
	currentProject: ProjectMeta | null;
	manifest: RimecraftManifest | null;
	files: FileEntry[];
	recentProjects: ProjectMeta[];
	isLoading: boolean;

	setCurrentProject: (project: ProjectMeta | null) => void;
	setManifest: (manifest: RimecraftManifest | null) => void;
	setFiles: (files: FileEntry[]) => void;
	addRecentProject: (project: ProjectMeta) => void;
	setLoading: (loading: boolean) => void;
	closeProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
	currentProject: null,
	manifest: null,
	files: [],
	recentProjects: [],
	isLoading: false,

	setCurrentProject: (project) =>
		set({ currentProject: project }),

	setManifest: (manifest) => set({ manifest }),

	setFiles: (files) => set({ files }),

	addRecentProject: (project) =>
		set((state) => ({
			recentProjects: [
				project,
				...state.recentProjects.filter(
					(p) => p.id !== project.id,
				),
			].slice(0, 10),
		})),

	setLoading: (isLoading) => set({ isLoading }),

	closeProject: () =>
		set({
			currentProject: null,
			manifest: null,
			files: [],
		}),
}));
