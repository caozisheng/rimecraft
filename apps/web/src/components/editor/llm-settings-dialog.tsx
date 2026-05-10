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

const KEYS = {
	baseUrl: "rimecraft_llm_baseUrl",
	apiKey: "rimecraft_llm_apiKey",
	model: "rimecraft_llm_model",
} as const;

export function LLMSettingsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { messages: m, locale, setLocale } = useI18n();
	const [baseUrl, setBaseUrl] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [model, setModel] = useState("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (open) {
			setBaseUrl(
				localStorage.getItem(KEYS.baseUrl) ??
					"https://api.openai.com/v1",
			);
			setApiKey(localStorage.getItem(KEYS.apiKey) ?? "");
			setModel(localStorage.getItem(KEYS.model) ?? "gpt-4.1");
			setSaved(false);
		}
	}, [open]);

	const handleSave = () => {
		localStorage.setItem(KEYS.baseUrl, baseUrl.trim());
		localStorage.setItem(KEYS.apiKey, apiKey.trim());
		localStorage.setItem(KEYS.model, model.trim());
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
									onClick={() => setLocale(l)}
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
