import { create } from "zustand";
import type {
	SceneGraph,
	SceneObject,
	SceneObjectBounds,
} from "@/core/scene-graph";
import { createEmptyScene, findObject } from "@/core/scene-graph";

export type EditorTool = "select" | "move" | "rotate" | "scale" | "add";
export type AddObjectType = "text" | "image" | "sprite";

interface UndoEntry {
	type: "update" | "create" | "delete";
	objectId: string;
	oldProps?: Partial<SceneObject>;
	newProps?: Partial<SceneObject>;
	objectSnapshot?: SceneObject;
}

const MAX_UNDO = 50;

interface VisualEditorState {
	enabled: boolean;
	tool: EditorTool;
	addObjectType: AddObjectType;
	sceneGraph: SceneGraph;
	selectedObjectIds: string[];
	objectBounds: SceneObjectBounds[];
	iframeBounds: { width: number; height: number } | null;
	snapToGrid: boolean;
	gridSize: number;
	undoStack: UndoEntry[];
	redoStack: UndoEntry[];
	dirty: boolean;

	setEnabled: (enabled: boolean) => void;
	setTool: (tool: EditorTool) => void;
	setAddObjectType: (type: AddObjectType) => void;
	setSceneGraph: (scene: SceneGraph) => void;
	updateSceneSettings: (
		settings: Partial<SceneGraph["settings"]>,
	) => void;
	selectObject: (id: string | null) => void;
	selectObjects: (ids: string[]) => void;
	addObject: (obj: SceneObject) => void;
	updateObject: (id: string, props: Partial<SceneObject>) => void;
	removeObject: (id: string) => void;
	setObjectBounds: (bounds: SceneObjectBounds[]) => void;
	setIframeBounds: (bounds: { width: number; height: number } | null) => void;
	toggleSnapToGrid: () => void;
	setGridSize: (size: number) => void;
	getSelectedObjects: () => SceneObject[];
	pushUndo: (entry: UndoEntry) => void;
	undo: () => UndoEntry | null;
	redo: () => UndoEntry | null;
	clearHistory: () => void;
	setDirty: (dirty: boolean) => void;
}

export const useVisualEditorStore = create<VisualEditorState>(
	(set, get) => ({
		enabled: false,
		tool: "select",
		addObjectType: "text" as AddObjectType,
		sceneGraph: createEmptyScene(),
		selectedObjectIds: [],
		objectBounds: [],
		iframeBounds: null,
		snapToGrid: true,
		gridSize: 16,
		undoStack: [],
		redoStack: [],
		dirty: false,

		setEnabled: (enabled) => set({ enabled }),
		setTool: (tool) => set({ tool }),
		setAddObjectType: (addObjectType) => set({ addObjectType }),
		setSceneGraph: (sceneGraph) => set({ sceneGraph }),
		updateSceneSettings: (settings) =>
			set((s) => ({
				sceneGraph: {
					...s.sceneGraph,
					settings: { ...s.sceneGraph.settings, ...settings },
				},
			})),

		selectObject: (id) =>
			set({ selectedObjectIds: id ? [id] : [] }),
		selectObjects: (ids) => set({ selectedObjectIds: ids }),

		addObject: (obj) =>
			set((s) => ({
				sceneGraph: {
					...s.sceneGraph,
					objects: [...s.sceneGraph.objects, obj],
				},
			})),

		updateObject: (id, props) =>
			set((s) => {
				const objects = structuredClone(s.sceneGraph.objects);
				const target = findObject(objects, id);
				if (target) Object.assign(target, props);
				return {
					sceneGraph: { ...s.sceneGraph, objects },
				};
			}),

		removeObject: (id) =>
			set((s) => {
				const objects = s.sceneGraph.objects.filter(
					(o) => o.id !== id,
				);
				return {
					sceneGraph: { ...s.sceneGraph, objects },
					selectedObjectIds: s.selectedObjectIds.filter(
						(sid) => sid !== id,
					),
				};
			}),

		setObjectBounds: (objectBounds) => set({ objectBounds }),
		setIframeBounds: (iframeBounds) => set({ iframeBounds }),
		toggleSnapToGrid: () =>
			set((s) => ({ snapToGrid: !s.snapToGrid })),
		setGridSize: (gridSize) => set({ gridSize }),

		getSelectedObjects: () => {
			const state = get();
			return state.selectedObjectIds
				.map((id) => findObject(state.sceneGraph.objects, id))
				.filter(Boolean) as SceneObject[];
		},

		pushUndo: (entry) =>
			set((s) => ({
				undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), entry],
				redoStack: [],
				dirty: true,
			})),

		undo: () => {
			const s = get();
			if (s.undoStack.length === 0) return null;
			const entry = s.undoStack[s.undoStack.length - 1];
			set({
				undoStack: s.undoStack.slice(0, -1),
				redoStack: [...s.redoStack, entry],
				dirty: true,
			});
			return entry;
		},

		redo: () => {
			const s = get();
			if (s.redoStack.length === 0) return null;
			const entry = s.redoStack[s.redoStack.length - 1];
			set({
				redoStack: s.redoStack.slice(0, -1),
				undoStack: [...s.undoStack, entry],
				dirty: true,
			});
			return entry;
		},

		clearHistory: () => set({ undoStack: [], redoStack: [], dirty: false }),
		setDirty: (dirty) => set({ dirty }),
	}),
);
