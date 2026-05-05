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
					<DialogTitle>AI Settings</DialogTitle>
					<DialogDescription>
						Configure your LLM provider. Supports any
						OpenAI-compatible API.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					<div className="grid gap-1.5">
						<label
							htmlFor="llm-base-url"
							className="text-sm font-medium"
						>
							API Base URL
						</label>
						<Input
							id="llm-base-url"
							value={baseUrl}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
							placeholder="https://api.openai.com/v1"
						/>
						<p className="text-xs text-muted-foreground">
							OpenAI / DeepSeek / Ollama (http://localhost:11434/v1)
						</p>
					</div>

					<div className="grid gap-1.5">
						<label
							htmlFor="llm-api-key"
							className="text-sm font-medium"
						>
							API Key
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
							Model
						</label>
						<Input
							id="llm-model"
							value={model}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel(e.target.value)}
							placeholder="gpt-4.1"
						/>
						<p className="text-xs text-muted-foreground">
							e.g. gpt-4.1, deepseek-chat, claude-sonnet-4-20250514
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button onClick={handleSave}>
						{saved ? "Saved!" : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
