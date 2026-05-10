"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@rimecraft/ui";
import { Input, Button } from "@rimecraft/ui";
import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n/locale";
import { useLLMConfigStore, detectProvider } from "@/stores/llm-config-store";
import { useProjectStore } from "@/stores/project-store";
import { generateTemplateFiles } from "@/lib/templates";
import { getEditorCore } from "@/core/editor-core";

export function LLMSettingsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { messages: m, locale, setLocale } = useI18n();
	const store = useLLMConfigStore();
	const [baseUrl, setBaseUrl] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [model, setModel] = useState("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (open) {
			const s = useLLMConfigStore.getState();
			setBaseUrl(s.baseUrl);
			setApiKey(s.apiKey);
			setModel(s.model);
			setSaved(false);
		}
	}, [open]);

	const handleSave = () => {
		store.saveAll({
			baseUrl: baseUrl.trim(),
			apiKey: apiKey.trim(),
			model: model.trim(),
		});
		setSaved(true);
		setTimeout(() => onOpenChange(false), 600);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-border bg-card">
				<DialogHeader>
					<DialogTitle>{m.settings.title}</DialogTitle>
					<DialogDescription>
						{m.settings.description}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					{/* Language */}
					<div className="grid gap-1.5">
						<label className="text-sm font-medium">
							{m.settings.language}
						</label>
						<div className="flex gap-2">
							{(["zh", "en", "ja"] as Locale[]).map((l) => (
								<button
									key={l}
									type="button"
									onClick={async () => {
										setLocale(l);
										const meta = useProjectStore.getState().currentProject;
										if (!meta?.template) return;
										const core = getEditorCore();
										const storage = core.project.getStorage();
										const newFiles = generateTemplateFiles(meta);
										for (const f of newFiles) {
											await storage.writeFile(meta.id, f.path, f.content);
										}
										const fileEntries = await storage.listFiles(meta.id);
										useProjectStore.getState().setFiles(fileEntries);
										core.preview.requestCompilation();
									}}
									className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
										locale === l
											? "bg-primary text-primary-foreground"
											: "border border-border bg-card text-foreground hover:bg-accent"
									}`}
								>
									{l === "zh" ? "中文" : l === "ja" ? "日本語" : "English"}
								</button>
							))}
						</div>
					</div>

					<div className="grid gap-1.5">
						<label
							htmlFor="llm-base-url"
							className="text-sm font-medium"
						>
							{m.settings.baseUrl}
						</label>
						<Input
							id="llm-base-url"
							value={baseUrl}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
							placeholder="https://api.openai.com/v1"
						/>
						<p className="text-xs text-muted-foreground">
							{m.settings.baseUrlHint}
							{baseUrl && (
								<span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
									{detectProvider(baseUrl)}
								</span>
							)}
						</p>
					</div>

					<div className="grid gap-1.5">
						<label
							htmlFor="llm-api-key"
							className="text-sm font-medium"
						>
							{m.settings.apiKey}
						</label>
						<Input
							id="llm-api-key"
							type="password"
							value={apiKey}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
							placeholder="sk-..."
						/>
					</div>

					<div className="grid gap-1.5">
						<label
							htmlFor="llm-model"
							className="text-sm font-medium"
						>
							{m.settings.model}
						</label>
						<Input
							id="llm-model"
							value={model}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel(e.target.value)}
							placeholder="gpt-4.1"
						/>
						<p className="text-xs text-muted-foreground">
							{m.settings.modelHint}
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						{m.common.cancel}
					</Button>
					<Button onClick={handleSave}>
						{saved ? m.settings.saved : m.common.save}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
