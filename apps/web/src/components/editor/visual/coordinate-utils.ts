import { useEffect, useState } from "react";
import { useVisualEditorStore } from "@/stores/visual-editor-store";

export interface CoordMapping {
	scale: number;
	offsetX: number;
	offsetY: number;
}

export function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
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

export function useCoordinateMapping(
	containerRef: React.RefObject<HTMLElement | null>,
): CoordMapping | null {
	const containerSize = useContainerSize(containerRef);
	const iframeBounds = useVisualEditorStore((s) => s.iframeBounds);
	if (!iframeBounds || containerSize.w === 0 || containerSize.h === 0)
		return null;
	const scaleW = containerSize.w / iframeBounds.width;
	const h = iframeBounds.height * scaleW;
	let scale: number;
	let offsetX: number;
	let offsetY: number;
	if (h <= containerSize.h) {
		scale = scaleW;
		offsetX = 0;
		offsetY = (containerSize.h - h) / 2;
	} else {
		scale = containerSize.h / iframeBounds.height;
		offsetX = (containerSize.w - iframeBounds.width * scale) / 2;
		offsetY = 0;
	}
	return { scale, offsetX, offsetY };
}

export function screenToGame(
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
