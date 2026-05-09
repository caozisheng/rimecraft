"use client";

import { useEffect, useState } from "react";
import { useVisualEditorStore } from "@/stores/visual-editor-store";

export function AspectIframe({
	iframeRef,
	containerRef,
}: {
	iframeRef: React.RefObject<HTMLIFrameElement | null>;
	containerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const iframeBounds = useVisualEditorStore((s) => s.iframeBounds);
	const [style, setStyle] = useState<React.CSSProperties>({
		width: "100%",
		height: "100%",
	});

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const update = () => {
			const cw = container.clientWidth;
			const ch = container.clientHeight;
			if (cw === 0 || ch === 0) return;

			const bounds = useVisualEditorStore.getState().iframeBounds;
			if (!bounds) {
				setStyle({ width: "100%", height: "100%" });
				return;
			}

			const scaleW = cw / bounds.width;
			const h = Math.round(bounds.height * scaleW);
			if (h <= ch) {
				setStyle({
					width: cw,
					height: h,
					position: "absolute",
					left: 0,
					top: Math.round((ch - h) / 2),
				});
			} else {
				const scaleH = ch / bounds.height;
				const w = Math.round(bounds.width * scaleH);
				setStyle({
					width: w,
					height: ch,
					position: "absolute",
					left: Math.round((cw - w) / 2),
					top: 0,
				});
			}
		};

		const ro = new ResizeObserver(update);
		ro.observe(container);
		update();
		return () => ro.disconnect();
	}, [containerRef, iframeBounds]);

	return (
		<iframe
			ref={iframeRef}
			title="Game Preview"
			className="border-0"
			style={style}
			sandbox="allow-scripts allow-same-origin"
		/>
	);
}

export function ControlButton({
	icon,
	onClick,
	label,
	active,
}: {
	icon: React.ReactNode;
	onClick: () => void;
	label: string;
	active?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={label}
			className={`rounded-md p-1.5 transition-colors ${
				active
					? "bg-primary/20 text-primary"
					: "text-muted-foreground hover:bg-accent hover:text-foreground"
			}`}
		>
			{icon}
		</button>
	);
}
