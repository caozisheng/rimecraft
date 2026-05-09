"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { getEditorCore } from "@/core/editor-core";
import { sceneBridge } from "@/core/scene-bridge";
import { Play, Pause, RotateCcw, Maximize2, Copy, Check, Pencil, Save } from "lucide-react";
import { useI18n } from "@/i18n";
import { VisualToolBar } from "../visual/tool-bar";
import { OverlayRenderer } from "../visual/overlay-renderer";
import { AspectIframe, ControlButton } from "./preview-components";
import { autoSaveVisualChanges } from "./auto-save";
import { setupVisualEditorShortcuts } from "./visual-editor-shortcuts";

export function PreviewPanel() {
	const { messages: m } = useI18n();
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
	const visualMode = useEditorStore((s) => s.visualEditorMode);
	const toggleVisual = useEditorStore((s) => s.toggleVisualEditorMode);
	const dirty = useVisualEditorStore((s) => s.dirty);
	const [saving, setSaving] = useState(false);
	const setObjectBounds = useVisualEditorStore((s) => s.setObjectBounds);
	const setIframeBounds = useVisualEditorStore((s) => s.setIframeBounds);
	const overlayRef = useRef<HTMLDivElement>(null);

	const handleToggleVisual = useCallback(() => {
		if (visualMode && dirty) {
			setSaving(true);
			autoSaveVisualChanges().finally(() => setSaving(false));
		}
		toggleVisual();
	}, [visualMode, dirty, toggleVisual]);

	const handleManualSave = useCallback(async () => {
		if (!visualMode) return;
		setSaving(true);
		await autoSaveVisualChanges();
		setSaving(false);
	}, [visualMode]);

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

	useEffect(() => {
		if (!iframeRef.current) return;
		sceneBridge.attach(iframeRef.current);
		const unsub = sceneBridge.onMessage((msg) => {
			if (msg.type === "scene_tree") {
				setObjectBounds(msg.objects);
				if (msg.settings) {
					setIframeBounds({ width: msg.settings.width, height: msg.settings.height });
				}
			}
		});
		return () => { unsub(); sceneBridge.detach(); };
	}, [compiledHtml, revision, setObjectBounds]);

	useEffect(() => {
		sceneBridge.setEditMode(visualMode);
		if (visualMode) {
			sceneBridge.requestSceneTree();
		}
	}, [visualMode]);

	useEffect(() => setupVisualEditorShortcuts(), []);

	return (
		<div className="flex h-full flex-col bg-card">
			{/* Preview Controls */}
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<div className="flex items-center gap-1">
					{previewMode === "play" ? (
						<ControlButton
							icon={<Pause className="h-3.5 w-3.5" />}
							onClick={handlePause}
							label={m.preview.pause}
						/>
					) : (
						<ControlButton
							icon={<Play className="h-3.5 w-3.5" />}
							onClick={handlePlay}
							label={m.preview.play}
						/>
					)}
					<ControlButton
						icon={<RotateCcw className="h-3.5 w-3.5" />}
						onClick={handleRestart}
						label={m.preview.restart}
					/>
					<ControlButton
						icon={<Maximize2 className="h-3.5 w-3.5" />}
						onClick={handleFullscreen}
						label={m.preview.fullscreen}
					/>
					<ControlButton
						icon={<Pencil className="h-3.5 w-3.5" />}
						onClick={handleToggleVisual}
						label={m.visualEditor.editMode}
						active={visualMode}
					/>
					{visualMode && dirty && (
						<ControlButton
							icon={<Save className="h-3.5 w-3.5" />}
							onClick={handleManualSave}
							label={saving ? m.visualEditor.saving : m.visualEditor.unsavedChanges}
						/>
					)}
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
								{m.preview.errorCount.replace("{count}", String(errors.length))}: {lastError}
							</span>
							<button
								type="button"
								title={m.preview.copyErrors}
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
			<div className="relative flex-1 bg-[#1a1a2e]" ref={overlayRef}>
				<AspectIframe
					iframeRef={iframeRef}
					containerRef={overlayRef}
				/>

				{visualMode && (
					<>
						<OverlayRenderer containerRef={overlayRef} />
						<div className="absolute left-2 top-2 z-10">
							<VisualToolBar />
						</div>
					</>
				)}

				{!isRunning && !compiledHtml && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
						<Play className="mb-4 h-16 w-16 text-muted-foreground/30" />
						<p className="text-sm text-muted-foreground">
							{m.preview.emptyState}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
