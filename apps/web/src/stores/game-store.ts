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
		set((s) => ({
			errors: [...s.errors.slice(-49), error],
			lastError: error,
		})),
	clearErrors: () => set({ errors: [], lastError: null }),
}));
