import { create } from "zustand";
import type {
	SceneGraph,
	SceneObject,
	SceneObjectBounds,
} from "@/core/scene-graph";
import { createEmptyScene, findObject } from "@/core/scene-graph";
import type { VisualUndoEntry } from "@/core/visual-commands";
import { createVisualCommand } from "@/core/visual-commands";
import { getEditorCore } from "@/core/editor-core";

export type EditorTool = "select" | "move" | "rotate" | "scale" | "add";
export type AddObjectType = "text" | "image" | "sprite";

export { type VisualUndoEntry };

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
	pushUndo: (entry: VisualUndoEntry) => void;
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

		pushUndo: (entry) => {
			const cmd = createVisualCommand(entry);
			try {
				getEditorCore().command.record(cmd);
			} catch {
				// EditorCore not initialized yet — ignore
			}
			set({ dirty: true });
		},

		setDirty: (dirty) => set({ dirty }),
	}),
);
