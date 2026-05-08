"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { getEditorCore } from "@/core/editor-core";
import { sceneBridge } from "@/core/scene-bridge";
import type { FullStateObject } from "@/core/scene-bridge";
import { generateSceneCode } from "@/core/scene-codegen";
import type { SceneGraph, SceneObject, SceneAssetRef } from "@/core/scene-graph";
import { Play, Pause, RotateCcw, Maximize2, Copy, Check, Pencil, Save } from "lucide-react";
import { useI18n } from "@/i18n";
import { VisualToolBar } from "../visual/tool-bar";
import { OverlayRenderer } from "../visual/overlay-renderer";

function fullStateToSceneGraph(
	objects: FullStateObject[],
	settings: { width: number; height: number },
): SceneGraph {
	const assetSet = new Map<string, SceneAssetRef>();
	const sceneObjects: SceneObject[] = [];

	for (const o of objects) {
		if (o.texture && o.texture !== "__DEFAULT" && o.texture !== "__MISSING" && o.texture !== "__WHITE") {
			if (!assetSet.has(o.texture)) {
				assetSet.set(o.texture, {
					key: o.texture,
					assetId: o.texture,
					type: "image",
				});
			}
		}

		const obj: SceneObject = {
			id: o.id,
			type: (o.type === "Sprite" ? "sprite" : o.type === "Text" ? "text" : o.type === "Graphics" ? "graphics" : "image") as SceneObject["type"],
			name: o.name || o.id,
			x: o.x,
			y: o.y,
			rotation: o.rotation || undefined,
			scaleX: o.scaleX !== 1 ? o.scaleX : undefined,
			scaleY: o.scaleY !== 1 ? o.scaleY : undefined,
			originX: o.originX,
			originY: o.originY,
			alpha: o.alpha !== 1 ? o.alpha : undefined,
			visible: o.visible === false ? false : undefined,
			depth: o.depth || undefined,
			texture: o.texture,
			frame: o.frame,
			text: o.text,
		};
		sceneObjects.push(obj);
	}

	return {
		version: 1,
		settings: {
			width: settings.width,
			height: settings.height,
			backgroundColor: "#1a1a2e",
		},
		assets: Array.from(assetSet.values()),
		objects: sceneObjects,
	};
}

async function findSceneFilePath(): Promise<string | null> {
	const files = useProjectStore.getState().files;
	const scenePaths = files
		.filter((f) => f.path.includes("/scenes/") && f.path.endsWith(".ts"))
		.map((f) => f.path);
	if (scenePaths.length > 0) {
		const gamePath = scenePaths.find((p) => p.includes("game-scene"));
		return gamePath ?? scenePaths[0];
	}
	return null;
}

async function autoSaveVisualChanges(): Promise<boolean> {
	try {
		const objects = await sceneBridge.requestFullStateAsync();
		if (objects.length === 0) return false;

		const iframeBounds = useVisualEditorStore.getState().iframeBounds;
		const settings = iframeBounds ?? { width: 800, height: 600 };
		const sceneGraph = fullStateToSceneGraph(objects, settings);
		const code = generateSceneCode(sceneGraph);

		const scenePath = await findSceneFilePath();
		if (!scenePath) return false;

		const core = getEditorCore();
		await core.project.writeFile(scenePath, code);
		useVisualEditorStore.getState().setDirty(false);
		return true;
	} catch (e) {
		console.error("Auto-save failed:", e);
		return false;
	}
}

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
	const selectObject = useVisualEditorStore((s) => s.selectObject);
	const overlayRef = useRef<HTMLDivElement>(null);

	const handleToggleVisual = useCallback(async () => {
		if (visualMode && dirty) {
			setSaving(true);
			await autoSaveVisualChanges();
			setSaving(false);
			useVisualEditorStore.getState().clearHistory();
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
	}, [visualMode]);

	// Keyboard shortcuts for visual editor
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!useEditorStore.getState().visualEditorMode) return;
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			const store = useVisualEditorStore.getState();
			const ctrlOrMeta = e.ctrlKey || e.metaKey;

			// Save: Ctrl+S
			if (ctrlOrMeta && e.key === "s") {
				e.preventDefault();
				if (store.dirty) {
					autoSaveVisualChanges();
				}
				return;
			}

			// Undo: Ctrl+Z
			if (ctrlOrMeta && e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				const entry = store.undo();
				if (entry) {
					if (entry.type === "update" && entry.oldProps) {
						sceneBridge.updateObject(entry.objectId, entry.oldProps);
					} else if (entry.type === "create") {
						sceneBridge.deleteObject(entry.objectId);
					} else if (entry.type === "delete" && entry.objectSnapshot) {
						sceneBridge.createObject(entry.objectSnapshot);
					}
					sceneBridge.requestSceneTree();
				}
				return;
			}

			// Redo: Ctrl+Shift+Z or Ctrl+Y
			if ((ctrlOrMeta && e.key === "z" && e.shiftKey) || (ctrlOrMeta && e.key === "y")) {
				e.preventDefault();
				const entry = store.redo();
				if (entry) {
					if (entry.type === "update" && entry.newProps) {
						sceneBridge.updateObject(entry.objectId, entry.newProps);
					} else if (entry.type === "create" && entry.objectSnapshot) {
						sceneBridge.createObject(entry.objectSnapshot);
					} else if (entry.type === "delete") {
						sceneBridge.deleteObject(entry.objectId);
					}
					sceneBridge.requestSceneTree();
				}
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
	}, []);

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

function AspectIframe({
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

			const scale = Math.min(cw / bounds.width, ch / bounds.height);
			const w = Math.round(bounds.width * scale);
			const h = Math.round(bounds.height * scale);
			setStyle({
				width: w,
				height: h,
				position: "absolute",
				left: Math.round((cw - w) / 2),
				top: Math.round((ch - h) / 2),
			});
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

function ControlButton({
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
