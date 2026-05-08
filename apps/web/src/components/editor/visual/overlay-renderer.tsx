"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { SceneObjectBounds, SceneObject } from "@/core/scene-graph";
import { generateObjectId } from "@/core/scene-graph";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { sceneBridge } from "@/core/scene-bridge";

// ── Coordinate mapping ──────────────────────────────────────────────

interface CoordMapping {
	scale: number;
	offsetX: number;
	offsetY: number;
}

function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
	const [size, setSize] = useState({ w: 0, h: 0 });
	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const measure = () => {
			setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
		};

		const ro = new ResizeObserver(() => measure());
		ro.observe(el);
		window.addEventListener("resize", measure);
		measure();

		return () => {
			ro.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [ref]);
	return size;
}

function useCoordinateMapping(
	containerRef: React.RefObject<HTMLElement | null>,
): CoordMapping | null {
	const containerSize = useContainerSize(containerRef);
	const iframeBounds = useVisualEditorStore((s) => s.iframeBounds);
	if (!iframeBounds || containerSize.w === 0 || containerSize.h === 0)
		return null;
	const scale = Math.min(
		containerSize.w / iframeBounds.width,
		containerSize.h / iframeBounds.height,
	);
	return {
		scale,
		offsetX: (containerSize.w - iframeBounds.width * scale) / 2,
		offsetY: (containerSize.h - iframeBounds.height * scale) / 2,
	};
}

function screenToGame(
	clientX: number,
	clientY: number,
	container: HTMLElement,
	m: CoordMapping,
) {
	const rect = container.getBoundingClientRect();
	return {
		x: (clientX - rect.left - m.offsetX) / m.scale,
		y: (clientY - rect.top - m.offsetY) / m.scale,
	};
}

// ── Background detection ────────────────────────────────────────────

function isBackgroundObject(
	obj: SceneObjectBounds,
	index: number,
	iframeBounds: { width: number; height: number } | null,
): boolean {
	if (!iframeBounds || index !== 0) return false;
	const coverage =
		(obj.width * obj.height) / (iframeBounds.width * iframeBounds.height);
	return coverage > 0.85;
}

// ── Drag system ─────────────────────────────────────────────────────

type DragType = "move" | "resize" | "rotate";
type Corner = "nw" | "ne" | "sw" | "se";

interface DragState {
	type: DragType;
	objectId: string;
	corner?: Corner;
	startGame: { x: number; y: number };
	startBounds: SceneObjectBounds;
	allStarts: { id: string; x: number; y: number }[];
	snapshotBounds: SceneObjectBounds[];
}

const CORNER_SIGN: Record<Corner, [number, number]> = {
	se: [1, 1],
	sw: [-1, 1],
	ne: [1, -1],
	nw: [-1, -1],
};

const MIN_SIZE = 8;
const ROTATION_HANDLE_DIST = 24;

function getDragCursor(drag: DragState | null): string {
	if (!drag) return "default";
	if (drag.type === "move") return "move";
	if (drag.type === "rotate") return "grabbing";
	if (drag.corner) return `${drag.corner}-resize`;
	return "default";
}

// ── Grid canvas (DPR-aware) ─────────────────────────────────────────

function GridCanvas({
	mapping,
	containerRef,
}: {
	mapping: CoordMapping | null;
	containerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const snapToGrid = useVisualEditorStore((s) => s.snapToGrid);
	const gridSize = useVisualEditorStore((s) => s.gridSize);

	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container || !snapToGrid || !mapping) return;
		const iframeBounds = useVisualEditorStore.getState().iframeBounds;
		if (!iframeBounds) return;

		const dpr = window.devicePixelRatio || 1;
		const w = container.clientWidth;
		const h = container.clientHeight;
		if (w === 0 || h === 0) return;

		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const scaledGrid = gridSize * mapping.scale;
		if (scaledGrid < 4) return;

		const { scale, offsetX, offsetY } = mapping;
		const canvasW = iframeBounds.width * scale;
		const canvasH = iframeBounds.height * scale;

		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let gx = 0; gx <= iframeBounds.width; gx += gridSize) {
			const px = Math.round(gx * scale + offsetX) + 0.5;
			ctx.moveTo(px, Math.round(offsetY));
			ctx.lineTo(px, Math.round(offsetY + canvasH));
		}
		for (let gy = 0; gy <= iframeBounds.height; gy += gridSize) {
			const py = Math.round(gy * scale + offsetY) + 0.5;
			ctx.moveTo(Math.round(offsetX), py);
			ctx.lineTo(Math.round(offsetX + canvasW), py);
		}
		ctx.stroke();
	}, [snapToGrid, gridSize, mapping, containerRef]);

	if (!snapToGrid) return null;
	return (
		<canvas
			ref={canvasRef}
			className="pointer-events-none absolute left-0 top-0"
		/>
	);
}

// ── Main overlay ────────────────────────────────────────────────────

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

	// ── Start drag ──

	const startDrag = useCallback(
		(
			e: React.PointerEvent,
			objId: string,
			type: DragType,
			corner?: Corner,
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

	// ── Drag move / up ──

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

	// ── Canvas click: add-mode creates object, else deselect ──

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

			{/* Background: add-mode creates, select-mode deselects */}
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

				// Background objects: show outline only, no click capture
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
						{/* Object body */}
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

						{/* Handles for selected objects */}
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

			{/* Full-screen overlay during drag */}
			{isDragging && (
				<div
					className="fixed inset-0 z-50"
					style={{ cursor: getDragCursor(dragRef.current) }}
				/>
			)}
		</div>
	);
}

// ── Resize + rotation handles ───────────────────────────────────────

function HandleGroup({
	obj,
	scale,
	offsetX,
	offsetY,
	onStartDrag,
}: {
	obj: SceneObjectBounds;
	scale: number;
	offsetX: number;
	offsetY: number;
	onStartDrag: (
		e: React.PointerEvent,
		id: string,
		type: DragType,
		corner?: Corner,
	) => void;
}) {
	const sx = obj.x * scale + offsetX;
	const sy = obj.y * scale + offsetY;
	const sw = obj.width * scale;
	const sh = obj.height * scale;
	const ox = obj.originX ?? 0.5;
	const oy = obj.originY ?? 0.5;

	const corners: {
		corner: Corner;
		x: number;
		y: number;
		cursor: string;
	}[] = [
		{ corner: "nw", x: 0, y: 0, cursor: "nw-resize" },
		{ corner: "ne", x: sw, y: 0, cursor: "ne-resize" },
		{ corner: "sw", x: 0, y: sh, cursor: "sw-resize" },
		{ corner: "se", x: sw, y: sh, cursor: "se-resize" },
	];

	return (
		<div
			className="pointer-events-none absolute z-20"
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
		>
			{/* Corner resize handles */}
			{corners.map((c) => (
				<div
					key={c.corner}
					className="pointer-events-auto absolute h-2.5 w-2.5 rounded-sm border border-primary bg-background shadow-sm"
					style={{
						left: c.x - 5,
						top: c.y - 5,
						cursor: c.cursor,
					}}
					onPointerDown={(e) =>
						onStartDrag(e, obj.id, "resize", c.corner)
					}
				/>
			))}

			{/* Rotation handle */}
			<div
				className="pointer-events-none absolute"
				style={{
					left: sw / 2,
					top: -ROTATION_HANDLE_DIST,
					width: 0,
					height: ROTATION_HANDLE_DIST,
				}}
			>
				<div
					className="absolute bg-primary/50"
					style={{
						left: -0.5,
						top: 6,
						width: 1,
						height: ROTATION_HANDLE_DIST - 6,
					}}
				/>
				<div
					className="pointer-events-auto absolute h-3 w-3 cursor-grab rounded-full border border-primary bg-background shadow-sm"
					style={{ left: -6, top: -6 }}
					onPointerDown={(e) =>
						onStartDrag(e, obj.id, "rotate")
					}
				/>
			</div>
		</div>
	);
}
