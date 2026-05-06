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
import { useChatStore } from "@/stores/chat-store";
import { Check, Copy, Plus, Sparkles, Upload, X } from "lucide-react";

const CATEGORIES = [
	{ key: "all", label: "全部" },
	{ key: "character", label: "角色" },
	{ key: "environment", label: "环境" },
	{ key: "item", label: "道具" },
	{ key: "effect", label: "特效" },
	{ key: "shape", label: "形状" },
	{ key: "background", label: "背景" },
	{ key: "particle", label: "粒子" },
	{ key: "ui", label: "UI" },
	{ key: "mine", label: "我的" },
] as const;

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
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("all");
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [registryLoaded, setRegistryLoaded] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<AssetCatalogEntry | AssetEntry | null>(null);
	const [showAiInput, setShowAiInput] = useState(false);
	const [aiPrompt, setAiPrompt] = useState("");

	useEffect(() => {
		if (open && !registryLoaded) {
			assetRegistry.load().then(() => setRegistryLoaded(true));
		}
	}, [open, registryLoaded]);

	const filtered = useMemo(() => {
		const all = assetRegistry.getAll({
			category: category === "all" ? undefined : category,
			query: query || undefined,
		});
		return all;
	}, [query, category, registryLoaded]);

	const handleCopy = useCallback((entry: AssetCatalogEntry | AssetEntry) => {
		const code = entry.generatorCode ?? "";
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

			const loadCode = `this.load.image("${name}", "assets/${file.name}");`;

			await assetRegistry.addUserAsset(
				{
					id,
					name,
					nameZh: name,
					type: "texture",
					category: "item",
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
	}, []);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-border bg-card sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>素材库</DialogTitle>
					<DialogDescription>
						浏览内置素材或添加自定义素材，点击卡片查看详情
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					{/* Search + actions */}
					<div className="flex gap-2">
						<Input
							placeholder="搜索素材... (支持中英文)"
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
							上传
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
					</div>

					{/* AI prompt input */}
					{showAiInput && (
						<div className="flex gap-2 rounded-lg border border-border bg-accent/30 p-2">
							<Input
								placeholder="描述你想要的素材，如：一个蓝色的宝石..."
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
									const prompt = `请帮我生成素材：${aiPrompt}`;
									setAiPrompt("");
									setShowAiInput(false);
									onOpenChange(false);
									useChatStore.getState().sendMessage(prompt);
								}}
							>
								发送到对话
							</Button>
						</div>
					)}

					{/* Categories */}
					<div className="flex flex-wrap gap-1.5">
						{CATEGORIES.map((cat) => (
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
									未找到匹配的素材
								</p>
							) : (
								<div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
									{filtered.map((entry) => (
										<AssetCard
											key={entry.id}
											entry={entry}
											selected={selectedAsset?.id === entry.id}
											onSelect={() => setSelectedAsset(entry)}
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
										<p className="text-sm font-medium">{selectedAsset.nameZh}</p>
										<p className="text-xs text-muted-foreground">{selectedAsset.name}</p>
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
										{selectedAsset.source === "user" ? "用户" : "AI"}
									</span>
								)}

								{selectedAsset.generatorCode && (
									<pre className="max-h-[140px] overflow-auto whitespace-pre-wrap rounded bg-accent/50 p-2 text-[10px] leading-relaxed text-muted-foreground">
										{selectedAsset.generatorCode}
									</pre>
								)}

								<div className="flex gap-1.5">
									<Button
										size="sm"
										variant="outline"
										className="flex-1 gap-1"
										onClick={() => handleCopy(selectedAsset)}
									>
										{copiedId === selectedAsset.id ? (
											<>
												<Check className="h-3 w-3 text-green-400" />
												已复制
											</>
										) : (
											<>
												<Copy className="h-3 w-3" />
												复制
											</>
										)}
									</Button>
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
}: {
	entry: AssetCatalogEntry | AssetEntry;
	selected: boolean;
	onSelect: () => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [rendered, setRendered] = useState(false);

	useEffect(() => {
		if (!entry.generatorCode) return;

		let cancelled = false;
		renderAssetPreview(entry.generatorCode, 56).then((dataUrl) => {
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
	}, [entry.generatorCode]);

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
				{entry.nameZh}
			</span>
		</button>
	);
}
