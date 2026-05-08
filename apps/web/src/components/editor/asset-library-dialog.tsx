"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	Input,
	Button,
} from "@rimecraft/ui";
import {
	ASSET_CATALOG,
	type AssetCatalogEntry,
} from "@/lib/assets/asset-catalog";
import {
	assetRegistry,
	type AssetEntry,
} from "@/lib/assets/asset-registry";
import { renderAssetPreview } from "@/lib/assets/asset-previewer";
import { cssToGeneratorCode } from "@/lib/assets/css-to-canvas";
import { useChatStore } from "@/stores/chat-store";
import { useI18n } from "@/i18n";
import { Check, Copy, Plus, Sparkles, Upload, X, Trash2, Code } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
	character: "bg-cyan-500/20 text-cyan-400",
	environment: "bg-green-500/20 text-green-400",
	item: "bg-yellow-500/20 text-yellow-400",
	effect: "bg-orange-500/20 text-orange-400",
	ui: "bg-purple-500/20 text-purple-400",
	shape: "bg-pink-500/20 text-pink-400",
	background: "bg-indigo-500/20 text-indigo-400",
	particle: "bg-red-500/20 text-red-400",
};

export function AssetLibraryDialog({
	open,
	onOpenChange,
	onPickAsset,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPickAsset?: (assetName: string, assetUrl: string, generatorCode: string) => void;
}) {
	const { messages: m, locale } = useI18n();
	const categories = [
		{ key: "all", label: m.assetLib.categories.all },
		{ key: "character", label: m.assetLib.categories.character },
		{ key: "environment", label: m.assetLib.categories.environment },
		{ key: "item", label: m.assetLib.categories.item },
		{ key: "effect", label: m.assetLib.categories.effect },
		{ key: "shape", label: m.assetLib.categories.shape },
		{ key: "background", label: m.assetLib.categories.background },
		{ key: "particle", label: m.assetLib.categories.particle },
		{ key: "ui", label: m.assetLib.categories.ui },
		{ key: "mine", label: m.assetLib.categories.mine },
	] as const;

	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("all");
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [registryLoaded, setRegistryLoaded] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<AssetCatalogEntry | AssetEntry | null>(null);
	const [showAiInput, setShowAiInput] = useState(false);
	const [aiPrompt, setAiPrompt] = useState("");
	const [showCssEditor, setShowCssEditor] = useState(false);
	const [cssCode, setCssCode] = useState("");
	const [cssWidth, setCssWidth] = useState(64);
	const [cssHeight, setCssHeight] = useState(64);
	const [cssName, setCssName] = useState("");
	const cssPreviewRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (open) {
			assetRegistry.load().then(() => setRegistryLoaded((v) => !v));
		}
	}, [open]);

	const filtered = useMemo(() => {
		const all = assetRegistry.getAll({
			category: category === "all" ? undefined : category,
			query: query || undefined,
		});
		return all;
	}, [query, category, registryLoaded]);

	const handleCopy = useCallback((entry: AssetCatalogEntry | AssetEntry) => {
		const code = ("preloadCode" in entry && entry.preloadCode) ? entry.preloadCode : (entry.generatorCode ?? "");
		navigator.clipboard.writeText(code);
		setCopiedId(entry.id);
		setTimeout(() => setCopiedId(null), 1500);
	}, []);

	const handleUpload = useCallback(() => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;

			const name = file.name.replace(/\.[^.]+$/, "");
			const id = `user-${Date.now().toString(36)}`;

			let thumbnailDataUrl: string | undefined;
			try {
				const bitmap = await createImageBitmap(file);
				const canvas = document.createElement("canvas");
				canvas.width = 64;
				canvas.height = 64;
				const ctx = canvas.getContext("2d")!;
				const scale = Math.min(64 / bitmap.width, 64 / bitmap.height);
				const dw = bitmap.width * scale;
				const dh = bitmap.height * scale;
				ctx.drawImage(bitmap, (64 - dw) / 2, (64 - dh) / 2, dw, dh);
				thumbnailDataUrl = canvas.toDataURL("image/png");
			} catch { /* ignore */ }

			const uploadCategory = category !== "all" && category !== "mine" ? category : "item";
			const loadCode = `this.load.image("${name}", "assets/${file.name}");`;

			await assetRegistry.addUserAsset(
				{
					id,
					name,
					nameZh: name,
					type: "texture",
					category: uploadCategory,
					tags: [name],
					source: "user",
					generatorCode: loadCode,
					blobPath: `assets/${file.name}`,
					thumbnailDataUrl,
				},
				file,
			);
			setRegistryLoaded(false);
		};
		input.click();
	}, [category]);

	const handleDelete = useCallback(async (entry: AssetEntry) => {
		if (!confirm(m.assetLib.deleteConfirm)) return;
		await assetRegistry.removeUserAsset(entry.id);
		setSelectedAsset(null);
		setRegistryLoaded(false);
	}, [m]);

	useEffect(() => {
		if (!showCssEditor || !cssCode.trim() || !cssPreviewRef.current) return;
		const timer = setTimeout(() => {
			const gen = cssToGeneratorCode(cssCode, cssWidth, cssHeight, "preview");
			renderAssetPreview(gen, 120).then((dataUrl) => {
				if (!cssPreviewRef.current) return;
				const img = new Image();
				img.onload = () => {
					const ctx = cssPreviewRef.current?.getContext("2d");
					if (!ctx) return;
					ctx.clearRect(0, 0, 120, 120);
					ctx.drawImage(img, 0, 0);
				};
				img.src = dataUrl;
			});
		}, 300);
		return () => clearTimeout(timer);
	}, [cssCode, cssWidth, cssHeight, showCssEditor]);

	const handleSaveCss = useCallback(async () => {
		const name = cssName.trim() || `css-${Date.now().toString(36)}`;
		const id = `css-${Date.now().toString(36)}`;
		const gen = cssToGeneratorCode(cssCode, cssWidth, cssHeight, name);
		await assetRegistry.addUserAsset({
			id,
			name,
			nameZh: name,
			type: "css",
			category: "shape",
			tags: [name, "css"],
			source: "user",
			generatorCode: gen,
			cssCode,
			cssWidth,
			cssHeight,
			width: cssWidth,
			height: cssHeight,
		});
		setCssCode("");
		setCssName("");
		setShowCssEditor(false);
		setRegistryLoaded(false);
	}, [cssCode, cssWidth, cssHeight, cssName]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-border bg-card sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{m.assetLib.title}</DialogTitle>
					<DialogDescription>
						{m.assetLib.subtitle}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					{/* Search + actions */}
					<div className="flex gap-2">
						<Input
							placeholder={m.assetLib.searchPlaceholder}
							value={query}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setQuery(e.target.value)
							}
							className="flex-1"
						/>
						<Button
							variant="outline"
							size="sm"
							className="shrink-0 gap-1.5"
							onClick={handleUpload}
						>
							<Upload className="h-3.5 w-3.5" />
							{m.common.upload}
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="shrink-0 gap-1.5"
							onClick={() => setShowAiInput(!showAiInput)}
						>
							<Sparkles className="h-3.5 w-3.5" />
							AI
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="shrink-0 gap-1.5"
							onClick={() => setShowCssEditor(!showCssEditor)}
						>
							<Code className="h-3.5 w-3.5" />
							CSS
						</Button>
					</div>

					{/* AI prompt input */}
					{showAiInput && (
						<div className="flex gap-2 rounded-lg border border-border bg-accent/30 p-2">
							<Input
								placeholder={m.assetLib.aiPlaceholder}
								value={aiPrompt}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setAiPrompt(e.target.value)
								}
								className="flex-1"
							/>
							<Button
								size="sm"
								disabled={!aiPrompt.trim()}
								onClick={() => {
									const prompt = locale === "zh" ? `请帮我生成素材：${aiPrompt}` : `Please generate an asset: ${aiPrompt}`;
									setAiPrompt("");
									setShowAiInput(false);
									onOpenChange(false);
									useChatStore.getState().sendMessage(prompt);
								}}
							>
								{m.assetLib.sendToChat}
							</Button>
						</div>
					)}

					{/* CSS editor panel */}
					{showCssEditor && (
						<div className="space-y-2 rounded-lg border border-border bg-accent/30 p-3">
							<div className="flex gap-3">
								<div className="flex-1 space-y-2">
									<Input
										placeholder={m.assetLib.cssName}
										value={cssName}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCssName(e.target.value)}
									/>
									<textarea
										placeholder={m.assetLib.cssPlaceholder}
										value={cssCode}
										onChange={(e) => setCssCode(e.target.value)}
										className="h-24 w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
									/>
									<div className="flex gap-2">
										<div className="flex items-center gap-1">
											<span className="text-xs text-muted-foreground">{m.assetLib.cssWidth}</span>
											<Input
												type="number"
												value={cssWidth}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCssWidth(Number(e.target.value) || 64)}
												className="w-16"
											/>
										</div>
										<div className="flex items-center gap-1">
											<span className="text-xs text-muted-foreground">{m.assetLib.cssHeight}</span>
											<Input
												type="number"
												value={cssHeight}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCssHeight(Number(e.target.value) || 64)}
												className="w-16"
											/>
										</div>
										<Button
											size="sm"
											disabled={!cssCode.trim()}
											onClick={handleSaveCss}
											className="ml-auto"
										>
											{m.assetLib.cssSave}
										</Button>
									</div>
								</div>
								<div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded border border-border bg-background">
									<canvas ref={cssPreviewRef} width={120} height={120} />
								</div>
							</div>
						</div>
					)}

					{/* Categories */}
					<div className="flex flex-wrap gap-1.5">
						{categories.map((cat) => (
							<button
								key={cat.key}
								type="button"
								onClick={() => {
									setCategory(cat.key);
									setSelectedAsset(null);
								}}
								className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
									category === cat.key
										? "bg-primary/20 text-primary"
										: "text-muted-foreground hover:bg-accent hover:text-foreground"
								}`}
							>
								{cat.label}
							</button>
						))}
					</div>

					{/* Grid + Detail */}
					<div className="flex gap-3" style={{ minHeight: 360 }}>
						{/* Grid */}
						<div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 400 }}>
							{filtered.length === 0 ? (
								<p className="py-12 text-center text-sm text-muted-foreground">
									{m.assetLib.noResults}
								</p>
							) : (
								<div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
									{filtered.map((entry) => (
										<AssetCard
											key={entry.id}
											entry={entry}
											selected={selectedAsset?.id === entry.id}
											onSelect={() => setSelectedAsset(entry)}
											locale={locale}
										/>
									))}
								</div>
							)}
						</div>

						{/* Detail panel */}
						{selectedAsset && (
							<div className="w-56 shrink-0 space-y-3 rounded-lg border border-border p-3">
								<div className="flex items-start justify-between">
									<div>
										<p className="text-sm font-medium">{locale === "en" ? selectedAsset.name : selectedAsset.nameZh}</p>
										<p className="text-xs text-muted-foreground">{locale === "en" ? selectedAsset.nameZh : selectedAsset.name}</p>
									</div>
									<button
										type="button"
										onClick={() => setSelectedAsset(null)}
										className="text-muted-foreground hover:text-foreground"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								</div>

								<span
									className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${CATEGORY_COLORS[selectedAsset.category] ?? "bg-gray-500/20 text-gray-400"}`}
								>
									{selectedAsset.category}
								</span>

								{"source" in selectedAsset && selectedAsset.source !== "builtin" && (
									<span className="ml-1 inline-block rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">
										{selectedAsset.source === "user" ? m.common.user : m.common.ai}
									</span>
								)}

								{(("preloadCode" in selectedAsset && selectedAsset.preloadCode) || selectedAsset.generatorCode) && (
									<pre className="max-h-[140px] overflow-auto whitespace-pre-wrap rounded bg-accent/50 p-2 text-[10px] leading-relaxed text-muted-foreground">
										{("preloadCode" in selectedAsset && selectedAsset.preloadCode) || selectedAsset.generatorCode}
									</pre>
								)}

								<div className="flex gap-1.5">
									{onPickAsset && (
										<Button
											size="sm"
											className="flex-1 gap-1"
											onClick={() => {
										const url = selectedAsset.url
											|| ("blobPath" in selectedAsset ? selectedAsset.blobPath : undefined)
											|| "";
										const genCode = selectedAsset.generatorCode || "";
										onPickAsset(selectedAsset.name, url, genCode);
									}}
										>
											<Check className="h-3 w-3" />
											{m.visualEditor.pickAsset}
										</Button>
									)}
									<Button
										size="sm"
										variant="outline"
										className="flex-1 gap-1"
										onClick={() => handleCopy(selectedAsset)}
									>
										{copiedId === selectedAsset.id ? (
											<>
												<Check className="h-3 w-3 text-green-400" />
												{m.common.copied}
											</>
										) : (
											<>
												<Copy className="h-3 w-3" />
												{m.common.copy}
											</>
										)}
									</Button>
									{"source" in selectedAsset && selectedAsset.source !== "builtin" && (
										<Button
											size="sm"
											variant="outline"
											className="gap-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
											onClick={() => handleDelete(selectedAsset as AssetEntry)}
										>
											<Trash2 className="h-3 w-3" />
											{m.assetLib.delete}
										</Button>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function AssetCard({
	entry,
	selected,
	onSelect,
	locale,
}: {
	entry: AssetCatalogEntry | AssetEntry;
	selected: boolean;
	onSelect: () => void;
	locale: string;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [rendered, setRendered] = useState(false);

	useEffect(() => {
		if (!entry.generatorCode && !entry.url) return;

		let cancelled = false;
		renderAssetPreview(entry.generatorCode || "", 56, entry.url).then((dataUrl) => {
			if (cancelled || !canvasRef.current) return;
			const img = new Image();
			img.onload = () => {
				const ctx = canvasRef.current?.getContext("2d");
				if (!ctx || !canvasRef.current) return;
				ctx.clearRect(0, 0, 56, 56);
				ctx.drawImage(img, 0, 0);
				setRendered(true);
			};
			img.src = dataUrl;
		});
		return () => { cancelled = true; };
	}, [entry.generatorCode, entry.url]);

	const hasThumbnail = "thumbnailDataUrl" in entry && entry.thumbnailDataUrl;

	return (
		<button
			type="button"
			onClick={onSelect}
			className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
				selected
					? "border-primary bg-primary/10"
					: "border-border hover:border-primary/50 hover:bg-accent/50"
			}`}
		>
			<div className="flex h-14 w-14 items-center justify-center rounded bg-accent/30">
				{hasThumbnail ? (
					<img
						src={(entry as AssetEntry).thumbnailDataUrl!}
						alt={entry.name}
						className="h-14 w-14 object-contain"
					/>
				) : (
					<canvas
						ref={canvasRef}
						width={56}
						height={56}
						className={rendered ? "" : "opacity-0"}
					/>
				)}
			</div>
			<span className="w-full truncate text-center text-[10px] text-muted-foreground">
				{locale === "en" ? entry.name : entry.nameZh}
			</span>
		</button>
	);
}
