"use client";

import { useState } from "react";
import {
	useAISettingsStore,
	type RoleLLMOverride,
} from "@/stores/ai-settings-store";
import { GAME_EXPERT_ROLES, type GameExpertRole } from "@/core/agent-roles";
import type { LLMProvider } from "rimeagent"
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/i18n";

const OVERRIDABLE_ROLES = GAME_EXPERT_ROLES.filter(
	(r) => r !== "director",
);

const PROVIDER_OPTIONS: {
	value: LLMProvider;
	label: string;
	defaultUrl: string;
	defaultModel: string;
}[] = [
	{ value: "openai", label: "OpenAI", defaultUrl: "https://api.openai.com/v1", defaultModel: "gpt-4.1" },
	{ value: "anthropic", label: "Anthropic", defaultUrl: "https://api.anthropic.com", defaultModel: "claude-sonnet-4-20250514" },
	{ value: "deepseek", label: "DeepSeek", defaultUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat" },
	{ value: "local", label: "Local (Ollama)", defaultUrl: "http://localhost:11434/v1", defaultModel: "llama3" },
];

function LLMConfigFields({
	prefix,
	provider,
	baseUrl,
	apiKey,
	model,
	onProviderChange,
	onBaseUrlChange,
	onApiKeyChange,
	onModelChange,
}: {
	prefix: string;
	provider: LLMProvider;
	baseUrl: string;
	apiKey: string;
	model: string;
	onProviderChange: (v: LLMProvider) => void;
	onBaseUrlChange: (v: string) => void;
	onApiKeyChange: (v: string) => void;
	onModelChange: (v: string) => void;
}) {
	const { messages: m } = useI18n();
	const [showKey, setShowKey] = useState(false);

	const handleProviderChange = (v: LLMProvider) => {
		onProviderChange(v);
		const opt = PROVIDER_OPTIONS.find((o) => o.value === v);
		if (opt) {
			onBaseUrlChange(opt.defaultUrl);
			onModelChange(opt.defaultModel);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<label htmlFor={`${prefix}-provider`} className="text-xs text-muted-foreground">
					{m.settings.providerType}
				</label>
				<select
					id={`${prefix}-provider`}
					value={provider}
					onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
					className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/50"
				>
					{PROVIDER_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			</div>

			<div className="flex flex-col gap-1">
				<label htmlFor={`${prefix}-base-url`} className="text-xs text-muted-foreground">
					{m.settings.baseUrl}
				</label>
				<input
					id={`${prefix}-base-url`}
					key={`${prefix}-base-url-${provider}`}
					defaultValue={baseUrl}
					placeholder="https://api.openai.com/v1"
					onBlur={(e) => onBaseUrlChange(e.target.value)}
					className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label htmlFor={`${prefix}-api-key`} className="text-xs text-muted-foreground">
					{m.settings.apiKey}
				</label>
				<div className="relative">
					<input
						id={`${prefix}-api-key`}
						type={showKey ? "text" : "password"}
						defaultValue={apiKey}
						placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
						onBlur={(e) => onApiKeyChange(e.target.value)}
						className="h-7 w-full rounded-md border border-border bg-card px-2 pr-8 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
					/>
					<button
						type="button"
						onClick={() => setShowKey((s) => !s)}
						className="absolute right-0 top-0 flex h-7 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
					>
						{showKey ? (
							<EyeOff className="h-3.5 w-3.5" />
						) : (
							<Eye className="h-3.5 w-3.5" />
						)}
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<label htmlFor={`${prefix}-model`} className="text-xs text-muted-foreground">
					{m.settings.model}
				</label>
				<input
					id={`${prefix}-model`}
					key={`${prefix}-model-${provider}`}
					defaultValue={model}
					placeholder="gpt-4.1"
					onBlur={(e) => onModelChange(e.target.value)}
					className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
				/>
			</div>
		</div>
	);
}

function ToggleSwitch({
	checked,
	onChange,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
				checked ? "bg-primary" : "bg-muted"
			}`}
		>
			<span
				className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
					checked ? "translate-x-4" : "translate-x-0.5"
				}`}
			/>
		</button>
	);
}

function RoleOverrideItem({ role }: { role: GameExpertRole }) {
	const { messages: m } = useI18n();
	const roleOverrides = useAISettingsStore((s) => s.roleOverrides);
	const toggleRoleOverride = useAISettingsStore((s) => s.toggleRoleOverride);
	const setRoleOverrideConfig = useAISettingsStore(
		(s) => s.setRoleOverrideConfig,
	);

	const override: RoleLLMOverride | undefined = roleOverrides[role];
	const enabled = override?.enabled ?? false;
	const roleInfo = m.roles[role];

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-border p-2">
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="truncate text-xs font-medium text-foreground">
						{roleInfo?.name ?? role}
					</div>
					<div className="truncate text-[10px] text-muted-foreground">
						{roleInfo?.description}
					</div>
				</div>
				<ToggleSwitch
					checked={enabled}
					onChange={(checked) => toggleRoleOverride(role, checked)}
				/>
			</div>
			{enabled && override && (
				<div className="mt-1 border-t border-border pt-2">
					<LLMConfigFields
						prefix={`role-${role}`}
						provider={override.provider}
						baseUrl={override.baseUrl}
						apiKey={override.apiKey}
						model={override.model}
						onProviderChange={(v) =>
							setRoleOverrideConfig(role, { provider: v })
						}
						onBaseUrlChange={(v) =>
							setRoleOverrideConfig(role, { baseUrl: v })
						}
						onApiKeyChange={(v) =>
							setRoleOverrideConfig(role, { apiKey: v })
						}
						onModelChange={(v) =>
							setRoleOverrideConfig(role, { model: v })
						}
					/>
				</div>
			)}
			{!enabled && (
				<div className="text-[10px] text-muted-foreground">
					{m.settings.usingDefault}
				</div>
			)}
		</div>
	);
}

export function AgentSettings() {
	const { messages: m } = useI18n();
	const {
		llmProvider,
		llmBaseUrl,
		llmApiKey,
		llmModel,
		setLLMConfig,
		resetLLMConfig,
	} = useAISettingsStore();

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="flex flex-col gap-4 p-3">
				{/* Default Configuration */}
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<h3 className="text-xs font-semibold text-foreground">
							{m.settings.defaultConfig}
						</h3>
						<span className="text-[10px] text-muted-foreground">
							{m.settings.defaultConfigHint}
						</span>
					</div>
					<LLMConfigFields
						prefix="default"
						provider={llmProvider}
						baseUrl={llmBaseUrl}
						apiKey={llmApiKey}
						model={llmModel}
						onProviderChange={(v) => setLLMConfig({ provider: v })}
						onBaseUrlChange={(v) => setLLMConfig({ baseUrl: v })}
						onApiKeyChange={(v) => setLLMConfig({ apiKey: v })}
						onModelChange={(v) => setLLMConfig({ model: v })}
					/>
				</div>

				<hr className="border-border" />

				{/* Per-Role Overrides */}
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-0.5">
						<h3 className="text-xs font-semibold text-foreground">
							{m.settings.perRoleConfig}
						</h3>
						<p className="text-[10px] text-muted-foreground">
							{m.settings.perRoleConfigHint}
						</p>
					</div>
					{OVERRIDABLE_ROLES.map((role) => (
						<RoleOverrideItem key={role} role={role} />
					))}
				</div>

				<hr className="border-border" />

				<button
					type="button"
					onClick={resetLLMConfig}
					className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
				>
					{m.settings.resetAll}
				</button>
			</div>
		</div>
	);
}
