import { useEditorStore } from "@/stores/editor-store";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { sceneBridge } from "@/core/scene-bridge";
import { getEditorCore } from "@/core/editor-core";
import { autoSaveVisualChanges } from "./auto-save";

export function setupVisualEditorShortcuts(): () => void {
	const onKeyDown = (e: KeyboardEvent) => {
		if (!useEditorStore.getState().visualEditorMode) return;
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

		const store = useVisualEditorStore.getState();
		const ctrlOrMeta = e.ctrlKey || e.metaKey;

		if (ctrlOrMeta && e.key === "s") {
			e.preventDefault();
			if (store.dirty) {
				autoSaveVisualChanges();
			}
			return;
		}

		if (ctrlOrMeta && e.key === "z" && !e.shiftKey) {
			e.preventDefault();
			const core = getEditorCore();
			core.command.undo();
			return;
		}

		if ((ctrlOrMeta && e.key === "z" && e.shiftKey) || (ctrlOrMeta && e.key === "y")) {
			e.preventDefault();
			const core = getEditorCore();
			core.command.redo();
			return;
		}

		const ids = store.selectedObjectIds;
		if (ids.length === 0 && e.key !== "Escape") return;

		const nudge = e.shiftKey ? 10 : 1;

		switch (e.key) {
			case "Delete":
			case "Backspace":
				for (const id of ids) {
					const bounds = store.objectBounds.find((o) => o.id === id);
					if (bounds) {
						store.pushUndo({
							type: "delete",
							objectId: id,
							objectSnapshot: {
								id,
								type: "image",
								name: id,
								x: bounds.x,
								y: bounds.y,
								rotation: bounds.rotation,
								originX: bounds.originX,
								originY: bounds.originY,
							},
						});
					}
					sceneBridge.deleteObject(id);
				}
				store.selectObject(null);
				sceneBridge.requestSceneTree();
				e.preventDefault();
				break;
			case "Escape":
				store.selectObject(null);
				e.preventDefault();
				break;
			case "ArrowUp":
				for (const id of ids) {
					const b = store.objectBounds.find((o) => o.id === id);
					if (b) {
						store.pushUndo({
							type: "update",
							objectId: id,
							oldProps: { y: b.y },
							newProps: { y: b.y - nudge },
						});
						sceneBridge.updateObject(id, { y: b.y - nudge });
					}
				}
				e.preventDefault();
				break;
			case "ArrowDown":
				for (const id of ids) {
					const b = store.objectBounds.find((o) => o.id === id);
					if (b) {
						store.pushUndo({
							type: "update",
							objectId: id,
							oldProps: { y: b.y },
							newProps: { y: b.y + nudge },
						});
						sceneBridge.updateObject(id, { y: b.y + nudge });
					}
				}
				e.preventDefault();
				break;
			case "ArrowLeft":
				for (const id of ids) {
					const b = store.objectBounds.find((o) => o.id === id);
					if (b) {
						store.pushUndo({
							type: "update",
							objectId: id,
							oldProps: { x: b.x },
							newProps: { x: b.x - nudge },
						});
						sceneBridge.updateObject(id, { x: b.x - nudge });
					}
				}
				e.preventDefault();
				break;
			case "ArrowRight":
				for (const id of ids) {
					const b = store.objectBounds.find((o) => o.id === id);
					if (b) {
						store.pushUndo({
							type: "update",
							objectId: id,
							oldProps: { x: b.x },
							newProps: { x: b.x + nudge },
						});
						sceneBridge.updateObject(id, { x: b.x + nudge });
					}
				}
				e.preventDefault();
				break;
		}
	};
	window.addEventListener("keydown", onKeyDown);
	return () => window.removeEventListener("keydown", onKeyDown);
}
