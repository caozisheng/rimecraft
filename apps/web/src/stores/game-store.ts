import { create } from "zustand";

interface GameState {
	fps: number;
	isRunning: boolean;
	activeSceneId: string | null;
	objectCount: number;
	errors: string[];
	lastError: string | null;

	setFps: (fps: number) => void;
	setRunning: (running: boolean) => void;
	setActiveScene: (sceneId: string | null) => void;
	setObjectCount: (count: number) => void;
	addError: (error: string) => void;
	clearErrors: () => void;
}

function normalizeError(error: string): string {
	return error.replace(/\(line \d+(?::\d+)?\)/g, "").replace(/game:\d+:\d+/g, "").trim();
}

export const useGameStore = create<GameState>((set) => ({
	fps: 0,
	isRunning: false,
	activeSceneId: null,
	objectCount: 0,
	errors: [],
	lastError: null,

	setFps: (fps) => set({ fps }),
	setRunning: (isRunning) => set({ isRunning }),
	setActiveScene: (activeSceneId) => set({ activeSceneId }),
	setObjectCount: (objectCount) => set({ objectCount }),
	addError: (error) =>
		set((s) => {
			const normalized = normalizeError(error);
			const isDuplicate = s.errors.some(
				(e) => normalizeError(e) === normalized,
			);
			if (isDuplicate) return s;
			return {
				errors: [...s.errors.slice(-49), error],
				lastError: error,
			};
		}),
	clearErrors: () => set({ errors: [], lastError: null }),
}));
