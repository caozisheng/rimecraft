"use client";

import { useRef, useEffect } from "react";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import type { CoordMapping } from "./coordinate-utils";

export function GridCanvas({
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
