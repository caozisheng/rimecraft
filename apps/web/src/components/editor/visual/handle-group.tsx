"use client";

import type { SceneObjectBounds } from "@/core/scene-graph";
import type { DragType, Corner } from "./drag-system";
import { ROTATION_HANDLE_DIST } from "./drag-system";

export function HandleGroup({
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
