import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameExpertRole } from "@/core/agent-roles";
import type { LLMProvider, AgentLLMConfig } from "@rimecraft/agent-engine";

export interface RoleLLMOverride {
	enabled: boolean;
	provider: LLMProvider;
	baseUrl: string;
	apiKey: string;
	model: string;
}

interface AISettingsState {
	llmProvider: LLMProvider;
	llmBaseUrl: string;
	llmApiKey: string;
	llmModel: string;
	roleOverrides: Partial<Record<GameExpertRole, RoleLLMOverride>>;
	setLLMConfig: (config: {
		provider?: LLMProvider;
		baseUrl?: string;
		apiKey?: string;
		model?: string;
	}) => void;
	resetLLMConfig: () => void;
	toggleRoleOverride: (role: GameExpertRole, enabled: boolean) => void;
	setRoleOverrideConfig: (
		role: GameExpertRole,
		config: { provider?: LLMProvider; baseUrl?: string; apiKey?: string; model?: string },
	) => void;
	resetRoleOverride: (role: GameExpertRole) => void;
	getConfigForRole: (role: string) => {
		provider: LLMProvider;
		baseUrl: string;
		apiKey: string;
		model: string;
	};
}

function migrateFromOldStore(): Partial<{
	llmProvider: LLMProvider;
	llmBaseUrl: string;
	llmApiKey: string;
	llmModel: string;
}> {
	if (typeof window === "undefined") return {};
	const baseUrl = localStorage.getItem("rimecraft_llm_baseUrl");
	const apiKey = localStorage.getItem("rimecraft_llm_apiKey");
	const model = localStorage.getItem("rimecraft_llm_model");
	if (!baseUrl && !apiKey && !model) return {};
	const result: Record<string, string> = {};
	if (baseUrl) {
		result.llmBaseUrl = baseUrl;
		const lower = baseUrl.toLowerCase();
		if (lower.includes("api.openai.com")) result.llmProvider = "openai";
		else if (lower.includes("anthropic") || lower.includes("claude")) result.llmProvider = "anthropic";
		else if (lower.includes("deepseek")) result.llmProvider = "deepseek";
		else result.llmProvider = "openai";
	}
	if (apiKey) result.llmApiKey = apiKey;
	if (model) result.llmModel = model;
	return result;
}

const migrated = migrateFromOldStore();

const DEFAULTS = {
	llmProvider: "openai" as LLMProvider,
	llmBaseUrl: "https://api.openai.com/v1",
	llmApiKey: "",
	llmModel: "gpt-4.1",
};

export const useAISettingsStore = create<AISettingsState>()(
	persist(
		(set, get) => ({
			...DEFAULTS,
			...migrated,
			roleOverrides: {},
			setLLMConfig: (config) =>
				set((state) => ({
					llmProvider: config.provider ?? state.llmProvider,
					llmBaseUrl: config.baseUrl ?? state.llmBaseUrl,
					llmApiKey: config.apiKey ?? state.llmApiKey,
					llmModel: config.model ?? state.llmModel,
				})),
			resetLLMConfig: () => set({ ...DEFAULTS, roleOverrides: {} }),
			toggleRoleOverride: (role, enabled) =>
				set((state) => {
					const existing = state.roleOverrides[role];
					return {
						roleOverrides: {
							...state.roleOverrides,
							[role]: {
								enabled,
								provider: existing?.provider ?? state.llmProvider,
								baseUrl: existing?.baseUrl ?? state.llmBaseUrl,
								apiKey: existing?.apiKey ?? state.llmApiKey,
								model: existing?.model ?? state.llmModel,
							},
						},
					};
				}),
			setRoleOverrideConfig: (role, config) =>
				set((state) => {
					const existing = state.roleOverrides[role];
					if (!existing?.enabled) return state;
					return {
						roleOverrides: {
							...state.roleOverrides,
							[role]: {
								...existing,
								provider: config.provider ?? existing.provider,
								baseUrl: config.baseUrl ?? existing.baseUrl,
								apiKey: config.apiKey ?? existing.apiKey,
								model: config.model ?? existing.model,
							},
						},
					};
				}),
			resetRoleOverride: (role) =>
				set((state) => {
					const { [role]: _, ...rest } = state.roleOverrides;
					return { roleOverrides: rest };
				}),
			getConfigForRole: (role) => {
				const state = get();
				const normalize = (p: LLMProvider) => p === "custom" ? "openai" as LLMProvider : p;
				const override = state.roleOverrides[role as GameExpertRole];
				if (override?.enabled) {
					return {
						provider: normalize(override.provider),
						baseUrl: override.baseUrl,
						apiKey: override.apiKey,
						model: override.model,
					};
				}
				return {
					provider: normalize(state.llmProvider),
					baseUrl: state.llmBaseUrl,
					apiKey: state.llmApiKey,
					model: state.llmModel,
				};
			},
		}),
		{
			name: "rimecraft-ai-settings",
			partialize: (state) => ({
				llmProvider: state.llmProvider,
				llmBaseUrl: state.llmBaseUrl,
				llmApiKey: state.llmApiKey,
				llmModel: state.llmModel,
				roleOverrides: state.roleOverrides,
			}),
		},
	),
);

export function getAIConfig(): AgentLLMConfig {
	const { llmBaseUrl, llmApiKey, llmModel, llmProvider } = useAISettingsStore.getState();
	return { baseUrl: llmBaseUrl, apiKey: llmApiKey, model: llmModel, provider: llmProvider };
}

export function getConfigForRole(role: string): AgentLLMConfig {
	const config = useAISettingsStore.getState().getConfigForRole(role);
	return { baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model, provider: config.provider };
}
