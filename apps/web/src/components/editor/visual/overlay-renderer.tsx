"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { SceneObject } from "@/core/scene-graph";
import { generateObjectId } from "@/core/scene-graph";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { sceneBridge } from "@/core/scene-bridge";
import { useCoordinateMapping, screenToGame } from "./coordinate-utils";
import type { DragState } from "./drag-system";
import { CORNER_SIGN, MIN_SIZE, getDragCursor, isBackgroundObject } from "./drag-system";
import { GridCanvas } from "./grid-canvas";
import { HandleGroup } from "./handle-group";

export function OverlayRenderer({
	containerRef,
}: {
	containerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const objectBounds = useVisualEditorStore((s) => s.objectBounds);
	const selectedIds = useVisualEditorStore((s) => s.selectedObjectIds);
	const selectObject = useVisualEditorStore((s) => s.selectObject);
	const selectObjects = useVisualEditorStore((s) => s.selectObjects);
	const tool = useVisualEditorStore((s) => s.tool);
	const setTool = useVisualEditorStore((s) => s.setTool);
	const iframeBounds = useVisualEditorStore((s) => s.iframeBounds);
	const mapping = useCoordinateMapping(containerRef);

	const [isDragging, setIsDragging] = useState(false);
	const dragRef = useRef<DragState | null>(null);
	const mappingRef = useRef(mapping);
	mappingRef.current = mapping;

	const startDrag = useCallback(
		(
			e: React.PointerEvent,
			objId: string,
			type: DragState["type"],
			corner?: DragState["corner"],
		) => {
			e.stopPropagation();
			e.preventDefault();
			const m = mappingRef.current;
			const container = containerRef.current;
			if (!m || !container) return;

			const bounds = useVisualEditorStore
				.getState()
				.objectBounds.find((b) => b.id === objId);
			if (!bounds) return;

			if (type === "move") {
				const ids = useVisualEditorStore.getState().selectedObjectIds;
				if (e.ctrlKey || e.metaKey) {
					selectObjects(
						ids.includes(objId)
							? ids.filter((id) => id !== objId)
							: [...ids, objId],
					);
				} else if (!ids.includes(objId)) {
					selectObject(objId);
				}
			}

			const currentIds =
				useVisualEditorStore.getState().selectedObjectIds;
			const allBounds = useVisualEditorStore.getState().objectBounds;
			const allStarts = currentIds
				.map((id) => {
					const b = allBounds.find((ob) => ob.id === id);
					return b ? { id, x: b.x, y: b.y } : null;
				})
				.filter(Boolean) as { id: string; x: number; y: number }[];

			dragRef.current = {
				type,
				objectId: objId,
				corner,
				startGame: screenToGame(e.clientX, e.clientY, container, m),
				startBounds: { ...bounds },
				allStarts,
				snapshotBounds: allBounds.filter((b) =>
					currentIds.includes(b.id),
				).map((b) => ({ ...b })),
			};
			setIsDragging(true);
		},
		[containerRef, selectObject, selectObjects],
	);

	useEffect(() => {
		if (!isDragging) return;

		const onMove = (e: PointerEvent) => {
			const drag = dragRef.current;
			const m = mappingRef.current;
			const container = containerRef.current;
			if (!drag || !m || !container) return;

			const game = screenToGame(e.clientX, e.clientY, container, m);
			const dx = game.x - drag.startGame.x;
			const dy = game.y - drag.startGame.y;
			const sb = drag.startBounds;

			if (drag.type === "move") {
				for (const s of drag.allStarts) {
					sceneBridge.updateObject(s.id, {
						x: s.x + dx,
						y: s.y + dy,
					});
				}
			} else if (drag.type === "resize" && drag.corner) {
				const [sx, sy] = CORNER_SIGN[drag.corner];
				const rot = sb.rotation || 0;
				const cosR = Math.cos(-rot);
				const sinR = Math.sin(-rot);
				const localDx = dx * cosR - dy * sinR;
				const localDy = dx * sinR + dy * cosR;
				const newW = Math.max(MIN_SIZE, sb.width + sx * localDx);
				const newH = Math.max(MIN_SIZE, sb.height + sy * localDy);
				const dw = newW - sb.width;
				const dh = newH - sb.height;
				const locOffX = (sx * dw) / 2;
				const locOffY = (sy * dh) / 2;
				const cosP = Math.cos(rot);
				const sinP = Math.sin(rot);

				sceneBridge.updateObject(drag.objectId, {
					x: sb.x + locOffX * cosP - locOffY * sinP,
					y: sb.y + locOffX * sinP + locOffY * cosP,
					displayWidth: newW,
					displayHeight: newH,
				} as any);
			} else if (drag.type === "rotate") {
				const angle = Math.atan2(game.y - sb.y, game.x - sb.x);
				const startAngle = Math.atan2(
					drag.startGame.y - sb.y,
					drag.startGame.x - sb.x,
				);
				sceneBridge.updateObject(drag.objectId, {
					rotation: (sb.rotation || 0) + (angle - startAngle),
				});
			}
		};

		const onUp = () => {
			const drag = dragRef.current;
			if (drag) {
				const store = useVisualEditorStore.getState();
				const currentBounds = store.objectBounds;
				for (const snap of drag.snapshotBounds) {
					const cur = currentBounds.find((b) => b.id === snap.id);
					if (!cur) continue;
					const moved =
						snap.x !== cur.x ||
						snap.y !== cur.y ||
						snap.width !== cur.width ||
						snap.height !== cur.height ||
						snap.rotation !== cur.rotation;
					if (moved) {
						store.pushUndo({
							type: "update",
							objectId: snap.id,
							oldProps: { x: snap.x, y: snap.y, rotation: snap.rotation },
							newProps: { x: cur.x, y: cur.y, rotation: cur.rotation },
						});
					}
				}
			}
			dragRef.current = null;
			setIsDragging(false);
			sceneBridge.requestSceneTree();
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		return () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
	}, [isDragging, containerRef]);

	const handleCanvasClick = useCallback(
		(e: React.MouseEvent) => {
			if (isDragging) return;

			if (tool === "add") {
				const m = mappingRef.current;
				const container = containerRef.current;
				if (!m || !container) return;
				const game = screenToGame(
					e.clientX,
					e.clientY,
					container,
					m,
				);
				const store = useVisualEditorStore.getState();
				const addType = store.addObjectType;
				const gx = Math.round(game.x);
				const gy = Math.round(game.y);
				const id = generateObjectId();

				let objData: SceneObject;
				if (addType === "text") {
					objData = {
						id,
						type: "text",
						name: "New Text",
						x: gx,
						y: gy,
						originX: 0,
						originY: 0,
						text: "Text",
						style: { fontSize: "24px", color: "#ffffff" },
					} as SceneObject;
				} else {
					objData = {
						id,
						type: addType,
						name: `New ${addType}`,
						x: gx,
						y: gy,
						texture: "__DEFAULT",
					} as SceneObject;
				}

				sceneBridge.createObject(objData);
				store.pushUndo({
					type: "create",
					objectId: id,
					objectSnapshot: objData,
				});
				sceneBridge.requestSceneTree();
				setTool("select");
				selectObject(id);
				return;
			}

			selectObject(null);
		},
		[isDragging, tool, containerRef, selectObject, setTool],
	);

	if (!mapping) {
		return (
			<div className="pointer-events-none absolute inset-0">
				<GridCanvas mapping={null} containerRef={containerRef} />
			</div>
		);
	}

	const { scale, offsetX, offsetY } = mapping;

	return (
		<div className="absolute inset-0">
			<GridCanvas mapping={mapping} containerRef={containerRef} />

			<div className="absolute inset-0" onClick={handleCanvasClick} />

			{objectBounds.map((obj, index) => {
				const selected = selectedIds.includes(obj.id);
				const isBg = isBackgroundObject(obj, index, iframeBounds);
				const sx = obj.x * scale + offsetX;
				const sy = obj.y * scale + offsetY;
				const sw = obj.width * scale;
				const sh = obj.height * scale;
				const ox = obj.originX ?? 0.5;
				const oy = obj.originY ?? 0.5;

				if (isBg && !selected) {
					return (
						<div
							key={obj.id}
							className="pointer-events-none absolute z-0 border border-dashed border-muted-foreground/20"
							style={{
								left: sx - sw * ox,
								top: sy - sh * oy,
								width: sw,
								height: sh,
							}}
						>
							<div className="absolute -top-4 left-0 whitespace-nowrap rounded bg-muted/60 px-1 py-0.5 text-[8px] text-muted-foreground">
								bg
							</div>
						</div>
					);
				}

				const isAddMode = tool === "add";

				return (
					<div key={obj.id}>
						<div
							className={`absolute z-10 ${isAddMode ? "pointer-events-none" : "cursor-move"}`}
							style={{
								left: sx - sw * ox,
								top: sy - sh * oy,
								width: sw,
								height: sh,
								transform: obj.rotation
									? `rotate(${obj.rotation}rad)`
									: undefined,
								transformOrigin: `${ox * 100}% ${oy * 100}%`,
							}}
							onPointerDown={
								isAddMode
									? undefined
									: (e) => startDrag(e, obj.id, "move")
							}
						>
							<div
								className={`h-full w-full border ${
									selected
										? "border-primary bg-primary/5"
										: "border-transparent hover:border-primary/40"
								}`}
							/>
							{selected && (
								<div className="absolute -top-5 left-0 whitespace-nowrap rounded bg-primary/80 px-1 py-0.5 text-[9px] text-primary-foreground">
									{obj.id.replace("auto_", "obj ")}
								</div>
							)}
						</div>

						{selected && (
							<HandleGroup
								obj={obj}
								scale={scale}
								offsetX={offsetX}
								offsetY={offsetY}
								onStartDrag={startDrag}
							/>
						)}
					</div>
				);
			})}

			{isDragging && (
				<div
					className="fixed inset-0 z-50"
					style={{ cursor: getDragCursor(dragRef.current) }}
				/>
			)}
		</div>
	);
}
