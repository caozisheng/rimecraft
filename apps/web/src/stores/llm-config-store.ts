import { create } from "zustand";
import type { AgentLLMConfig, LLMProvider } from "rimeagent"

const STORAGE_PREFIX = "rimecraft_llm_";

function load(key: string, fallback: string): string {
	if (typeof window === "undefined") return fallback;
	return localStorage.getItem(`${STORAGE_PREFIX}${key}`) ?? fallback;
}

function save(key: string, value: string) {
	localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
}

export function detectProvider(baseUrl: string): LLMProvider {
	const lower = baseUrl.toLowerCase();
	if (lower.includes("api.openai.com")) return "openai";
	if (lower.includes("anthropic") || lower.includes("claude")) return "anthropic";
	if (lower.includes("deepseek")) return "deepseek";
	return "custom";
}

interface LLMConfigState extends AgentLLMConfig {
	provider: LLMProvider;
	setBaseUrl: (url: string) => void;
	setApiKey: (key: string) => void;
	setModel: (model: string) => void;
	saveAll: (config: AgentLLMConfig) => void;
}

const initialBaseUrl = load("baseUrl", "https://api.openai.com/v1");

export const useLLMConfigStore = create<LLMConfigState>((set) => ({
	baseUrl: initialBaseUrl,
	apiKey: load("apiKey", ""),
	model: load("model", "gpt-4.1"),
	provider: detectProvider(initialBaseUrl),

	setBaseUrl: (baseUrl) => {
		save("baseUrl", baseUrl);
		set({ baseUrl, provider: detectProvider(baseUrl) });
	},
	setApiKey: (apiKey) => {
		save("apiKey", apiKey);
		set({ apiKey });
	},
	setModel: (model) => {
		save("model", model);
		set({ model });
	},
	saveAll: (config) => {
		save("baseUrl", config.baseUrl);
		save("apiKey", config.apiKey);
		save("model", config.model);
		set({
			...config,
			provider: detectProvider(config.baseUrl),
		});
	},
}));

export function getLLMConfig(): AgentLLMConfig {
	const { baseUrl, apiKey, model, provider } = useLLMConfigStore.getState();
	return { baseUrl, apiKey, model, provider };
}
