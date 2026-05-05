"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { getEditorCore } from "@/core/editor-core";
import { Play, Pause, RotateCcw, Maximize2, Copy, Check } from "lucide-react";

export function PreviewPanel() {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const fps = useGameStore((s) => s.fps);
	const isRunning = useGameStore((s) => s.isRunning);
	const errors = useGameStore((s) => s.errors);
	const lastError = useGameStore((s) => s.lastError);
	const setRunning = useGameStore((s) => s.setRunning);
	const previewMode = useEditorStore((s) => s.previewMode);
	const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
	const currentProject = useProjectStore((s) => s.currentProject);
	const [compiledHtml, setCompiledHtml] = useState<string | null>(null);
	const [revision, setRevision] = useState(0);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!currentProject) return;

		const core = getEditorCore();
		core.agent.initialize();

		core.preview.setHtmlReadyCallback((html) => {
			setCompiledHtml(html);
			setRevision((r) => r + 1);
		});

		core.preview.requestCompilation();
	}, [currentProject]);

	useEffect(() => {
		if (!compiledHtml || !iframeRef.current) return;

		const core = getEditorCore();
		core.preview.detachIframe();
		core.preview.attachIframe(iframeRef.current);

		const blob = new Blob([compiledHtml], { type: "text/html" });
		const url = URL.createObjectURL(blob);

		const iframe = iframeRef.current;
		iframe.src = url;

		iframe.onload = () => {
			URL.revokeObjectURL(url);
		};
	}, [compiledHtml, revision]);

	const handlePlay = useCallback(() => {
		setPreviewMode("play");
		setRunning(true);
		if (iframeRef.current?.contentWindow) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "execute",
					id: "play",
					method: "game.resume",
					args: [],
				},
				"*",
			);
		}
	}, [setPreviewMode, setRunning]);

	const handlePause = useCallback(() => {
		setPreviewMode("pause");
		setRunning(false);
		if (iframeRef.current?.contentWindow) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "execute",
					id: "pause",
					method: "game.pause",
					args: [],
				},
				"*",
			);
		}
	}, [setPreviewMode, setRunning]);

	const handleRestart = useCallback(() => {
		setRunning(false);
		useGameStore.getState().clearErrors();
		const core = getEditorCore();
		core.preview.requestCompilation();
		setPreviewMode("play");
	}, [setPreviewMode, setRunning]);

	const handleFullscreen = useCallback(() => {
		iframeRef.current?.requestFullscreen?.();
	}, []);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const msg = event.data;
			if (!msg || typeof msg !== "object" || msg.type !== "event")
				return;

			if (msg.event === "ready") {
				setRunning(true);
				setPreviewMode("play");
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [setRunning, setPreviewMode]);

	return (
		<div className="flex h-full flex-col bg-card">
			{/* Preview Controls */}
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<div className="flex items-center gap-1">
					{previewMode === "play" ? (
						<ControlButton
							icon={<Pause className="h-3.5 w-3.5" />}
							onClick={handlePause}
							label="暂停"
						/>
					) : (
						<ControlButton
							icon={<Play className="h-3.5 w-3.5" />}
							onClick={handlePlay}
							label="播放"
						/>
					)}
					<ControlButton
						icon={<RotateCcw className="h-3.5 w-3.5" />}
						onClick={handleRestart}
						label="重启"
					/>
					<ControlButton
						icon={<Maximize2 className="h-3.5 w-3.5" />}
						onClick={handleFullscreen}
						label="全屏"
					/>
				</div>

				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					{isRunning && (
						<span
							className={
								fps < 30
									? "text-game-error"
									: "text-game-success"
							}
						>
							FPS: {fps}
						</span>
					)}
					{errors.length > 0 && (
						<span className="flex items-center gap-1.5 text-game-error">
							<span className="max-w-[220px] truncate" title={lastError ?? ""}>
								{errors.length} 个错误: {lastError}
							</span>
							<button
								type="button"
								title="复制错误信息"
								onClick={() => {
									if (lastError) {
										navigator.clipboard.writeText(lastError);
										setCopied(true);
										setTimeout(() => setCopied(false), 1500);
									}
								}}
								className="shrink-0 rounded p-0.5 hover:bg-accent"
							>
								{copied ? (
									<Check className="h-3 w-3 text-game-success" />
								) : (
									<Copy className="h-3 w-3" />
								)}
							</button>
						</span>
					)}
				</div>
			</div>

			{/* Game Canvas */}
			<div className="relative flex-1 bg-[#1a1a2e]">
				<iframe
					ref={iframeRef}
					title="Game Preview"
					className="h-full w-full border-0"
					sandbox="allow-scripts allow-same-origin"
				/>

				{!isRunning && !compiledHtml && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
						<Play className="mb-4 h-16 w-16 text-muted-foreground/30" />
						<p className="text-sm text-muted-foreground">
							创建游戏后，预览将在这里显示
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function ControlButton({
	icon,
	onClick,
	label,
}: {
	icon: React.ReactNode;
	onClick: () => void;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={label}
			className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
		>
			{icon}
		</button>
	);
}
