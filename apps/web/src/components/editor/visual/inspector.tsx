"use client";

import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { sceneBridge } from "@/core/scene-bridge";
import { useI18n } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import { AssetLibraryDialog } from "../asset-library-dialog";
import { Image } from "lucide-react";

interface ObjectProps {
	x: number;
	y: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	alpha: number;
	visible: boolean;
	depth: number;
	name: string;
	type: string;
	texture?: string;
	frame?: string | number;
	text?: string;
	originX?: number;
	originY?: number;
	width?: number;
	height?: number;
	tint?: number;
	flipX?: boolean;
	flipY?: boolean;
}

export function Inspector() {
	const { messages: m } = useI18n();
	const selectedIds = useVisualEditorStore((s) => s.selectedObjectIds);
	const objectBounds = useVisualEditorStore((s) => s.objectBounds);
	const [objProps, setObjProps] = useState<ObjectProps | null>(null);
	const [textureKeys, setTextureKeys] = useState<string[]>([]);
	const [assetDialogOpen, setAssetDialogOpen] = useState(false);

	const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
	const selected = selectedId
		? objectBounds.find((o) => o.id === selectedId)
		: null;

	useEffect(() => {
		if (!selectedId) {
			setObjProps(null);
			return;
		}
		sceneBridge.requestObjectProps(selectedId);
		sceneBridge.requestTextures();

		const unsub = sceneBridge.onMessage((msg) => {
			if (msg.type === "object_props" && msg.id === selectedId) {
				setObjProps(msg.props as unknown as ObjectProps);
			}
			if (msg.type === "texture_list") {
				setTextureKeys(msg.keys);
			}
		});
		return unsub;
	}, [selectedId]);

	const handleChange = useCallback(
		(prop: string, value: number | string | boolean) => {
			if (!selectedId) return;
			sceneBridge.updateObject(selectedId, { [prop]: value } as any);
			setObjProps((prev) => prev ? { ...prev, [prop]: value } : prev);
		},
		[selectedId],
	);

	const handleSetTexture = useCallback(
		(key: string) => {
			if (!selectedId) return;
			sceneBridge.updateObject(selectedId, { texture: key } as any);
			setObjProps((prev) => prev ? { ...prev, texture: key } : prev);
			sceneBridge.requestSceneTree();
		},
		[selectedId],
	);

	const handleAssetPicked = useCallback(
		(assetName: string, assetUrl: string, generatorCode: string) => {
			if (!selectedId) return;
			setAssetDialogOpen(false);

			const applyTexture = () => {
				sceneBridge.updateObject(selectedId, { texture: assetName } as any);
				setObjProps((prev) => prev ? { ...prev, texture: assetName } : prev);
				sceneBridge.requestSceneTree();
			};

			if (assetUrl) {
				const unsub = sceneBridge.onMessage((msg) => {
					if (msg.type === "texture_loaded" && msg.key === assetName) {
						unsub();
						applyTexture();
					}
				});
				sceneBridge.loadTexture(assetName, assetUrl);
			} else if (generatorCode) {
				const unsub = sceneBridge.onMessage((msg) => {
					if (msg.type === "texture_loaded" && msg.key === assetName) {
						unsub();
						applyTexture();
					}
				});
				sceneBridge.generateTexture(assetName, generatorCode);
			} else {
				applyTexture();
			}
		},
		[selectedId],
	);

	if (!selected || !selectedId) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<p className="text-xs text-muted-foreground">
					{m.visualEditor.noSelection}
				</p>
			</div>
		);
	}

	const hasTexture = objProps?.type === "Image" || objProps?.type === "Sprite"
		|| objProps?.type === "image" || objProps?.type === "sprite";
	const isSprite = objProps?.type === "Sprite" || objProps?.type === "sprite";
	const isText = objProps?.type === "text" || objProps?.type === "Text";

	return (
		<div className="space-y-3 overflow-y-auto p-3">
			<h3 className="text-xs font-medium">{m.visualEditor.inspector}</h3>

			{/* Identity */}
			{objProps && (
				<div className="space-y-1.5">
					<div className="flex items-center gap-1.5">
						<span className="rounded bg-accent/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
							{objProps.type}
						</span>
						<input
							type="text"
							value={objProps.name}
							onChange={(e) => handleChange("name", e.target.value)}
							placeholder="name"
							className="flex-1 rounded border border-border bg-accent/30 px-1.5 py-0.5 text-[11px] outline-none focus:border-primary"
						/>
					</div>
				</div>
			)}

			{/* Transform */}
			<div className="space-y-1.5">
				<label className="text-[10px] font-medium uppercase text-muted-foreground">
					{m.visualEditor.transform}
				</label>
				<div className="grid grid-cols-2 gap-1.5">
					<PropInput label={m.visualEditor.x} value={Math.round(selected.x)} onChange={(v) => handleChange("x", v)} />
					<PropInput label={m.visualEditor.y} value={Math.round(selected.y)} onChange={(v) => handleChange("y", v)} />
					<PropInput label={m.visualEditor.width} value={Math.round(selected.width)} onChange={(v) => handleChange("displayWidth", v)} />
					<PropInput label={m.visualEditor.height} value={Math.round(selected.height)} onChange={(v) => handleChange("displayHeight", v)} />
					<PropInput label={m.visualEditor.rotation} value={Math.round((selected.rotation || 0) * 180 / Math.PI)} onChange={(v) => handleChange("rotation", v * Math.PI / 180)} step={1} />
					<PropInput label={m.visualEditor.scaleLabel} value={Number((objProps?.scaleX ?? 1).toFixed(2))} onChange={(v) => { handleChange("scaleX", v); handleChange("scaleY", v); }} step={0.1} />
				</div>
			</div>

			{/* Display */}
			{objProps && (
				<div className="space-y-1.5">
					<label className="text-[10px] font-medium uppercase text-muted-foreground">
						{m.visualEditor.display}
					</label>
					<div className="grid grid-cols-2 gap-1.5">
						<PropInput label={m.visualEditor.alpha} value={Number((objProps.alpha ?? 1).toFixed(2))} onChange={(v) => handleChange("alpha", Math.max(0, Math.min(1, v)))} step={0.1} />
						<PropInput label={m.visualEditor.depth} value={objProps.depth} onChange={(v) => handleChange("depth", v)} />
					</div>
					<label className="flex cursor-pointer items-center gap-1.5 rounded border border-border bg-accent/30 px-1.5 py-1">
						<input
							type="checkbox"
							checked={objProps.visible}
							onChange={(e) => handleChange("visible", e.target.checked)}
							className="h-3 w-3"
						/>
						<span className="text-[10px] text-muted-foreground">{m.visualEditor.visible}</span>
					</label>
				</div>
			)}

			{/* Texture */}
			{objProps && hasTexture && (
				<div className="space-y-1.5">
					<label className="text-[10px] font-medium uppercase text-muted-foreground">
						{m.visualEditor.texture}
					</label>
					<div className="flex items-center gap-1.5 rounded border border-border bg-accent/30 px-1.5 py-1">
						<Image className="h-3 w-3 shrink-0 text-muted-foreground" />
						<span className="flex-1 truncate text-[11px]">
							{objProps.texture || m.visualEditor.noTexture}
						</span>
						<button
							type="button"
							onClick={() => setAssetDialogOpen(true)}
							className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/30"
						>
							{m.visualEditor.changeTexture}
						</button>
					</div>
					{/* Quick picker for already-loaded textures */}
					{textureKeys.length > 0 && (
						<div className="rounded border border-border bg-card p-1.5">
							<div className="max-h-32 space-y-0.5 overflow-y-auto">
								{textureKeys.map((key) => (
									<button
										key={key}
										type="button"
										onClick={() => handleSetTexture(key)}
										className={`w-full rounded px-1.5 py-0.5 text-left text-[11px] transition-colors ${
											key === objProps.texture
												? "bg-primary/20 text-primary"
												: "hover:bg-accent"
										}`}
									>
										{key}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Frame (for sprites) */}
					{isSprite && (
						<div className="flex items-center gap-1 rounded border border-border bg-accent/30 px-1.5 py-0.5">
							<span className="text-[10px] text-muted-foreground">{m.visualEditor.frame}</span>
							<input
								type="text"
								value={objProps.frame ?? ""}
								onChange={(e) => {
									const val = e.target.value;
									const num = Number(val);
									handleChange("frame", Number.isNaN(num) ? val : num);
								}}
								className="w-full bg-transparent text-right text-[11px] outline-none"
							/>
						</div>
					)}
				</div>
			)}

			{/* Sprite / Image extras */}
			{objProps && hasTexture && (
				<div className="space-y-1.5">
					<div className="flex gap-1.5">
						<label className="flex flex-1 cursor-pointer items-center gap-1.5 rounded border border-border bg-accent/30 px-1.5 py-1">
							<input
								type="checkbox"
								checked={objProps.flipX ?? false}
								onChange={(e) => handleChange("flipX", e.target.checked)}
								className="h-3 w-3"
							/>
							<span className="text-[10px] text-muted-foreground">{m.visualEditor.flipX}</span>
						</label>
						<label className="flex flex-1 cursor-pointer items-center gap-1.5 rounded border border-border bg-accent/30 px-1.5 py-1">
							<input
								type="checkbox"
								checked={objProps.flipY ?? false}
								onChange={(e) => handleChange("flipY", e.target.checked)}
								className="h-3 w-3"
							/>
							<span className="text-[10px] text-muted-foreground">{m.visualEditor.flipY}</span>
						</label>
					</div>
					<div className="flex items-center gap-1 rounded border border-border bg-accent/30 px-1.5 py-0.5">
						<span className="text-[10px] text-muted-foreground">{m.visualEditor.tint}</span>
						<input
							type="color"
							value={`#${((objProps.tint ?? 0xffffff) & 0xffffff).toString(16).padStart(6, "0")}`}
							onChange={(e) => handleChange("tint", Number.parseInt(e.target.value.slice(1), 16))}
							className="ml-auto h-5 w-8 cursor-pointer border-0 bg-transparent p-0"
						/>
					</div>
				</div>
			)}

			{/* Text content */}
			{objProps && isText && (
				<div className="space-y-1.5">
					<label className="text-[10px] font-medium uppercase text-muted-foreground">
						{m.visualEditor.text}
					</label>
					<textarea
						value={objProps.text ?? ""}
						onChange={(e) => handleChange("text", e.target.value)}
						rows={2}
						className="w-full rounded border border-border bg-accent/30 px-1.5 py-1 text-[11px] outline-none focus:border-primary"
					/>
				</div>
			)}

			<AssetLibraryDialog
				open={assetDialogOpen}
				onOpenChange={setAssetDialogOpen}
				onPickAsset={handleAssetPicked}
			/>
		</div>
	);
}

function PropInput({
	label,
	value,
	onChange,
	step = 1,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	step?: number;
}) {
	return (
		<div className="flex items-center gap-1 rounded border border-border bg-accent/30 px-1.5 py-0.5">
			<span className="text-[10px] text-muted-foreground">{label}</span>
			<input
				type="number"
				value={value}
				step={step}
				onChange={(e) => onChange(Number(e.target.value))}
				className="w-full bg-transparent text-right text-[11px] outline-none"
			/>
		</div>
	);
}
