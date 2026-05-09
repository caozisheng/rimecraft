import type { SceneObjectBounds } from "@/core/scene-graph";

export type DragType = "move" | "resize" | "rotate";
export type Corner = "nw" | "ne" | "sw" | "se";

export interface DragState {
	type: DragType;
	objectId: string;
	corner?: Corner;
	startGame: { x: number; y: number };
	startBounds: SceneObjectBounds;
	allStarts: { id: string; x: number; y: number }[];
	snapshotBounds: SceneObjectBounds[];
}

export const CORNER_SIGN: Record<Corner, [number, number]> = {
	se: [1, 1],
	sw: [-1, 1],
	ne: [1, -1],
	nw: [-1, -1],
};

export const MIN_SIZE = 8;
export const ROTATION_HANDLE_DIST = 24;

export function getDragCursor(drag: DragState | null): string {
	if (!drag) return "default";
	if (drag.type === "move") return "move";
	if (drag.type === "rotate") return "grabbing";
	if (drag.corner) return `${drag.corner}-resize`;
	return "default";
}

export function isBackgroundObject(
	obj: SceneObjectBounds,
	index: number,
	iframeBounds: { width: number; height: number } | null,
): boolean {
	if (!iframeBounds || index !== 0) return false;
	const coverage =
		(obj.width * obj.height) / (iframeBounds.width * iframeBounds.height);
	return coverage > 0.85;
}
