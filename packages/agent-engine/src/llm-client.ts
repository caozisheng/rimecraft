import type { AgentLLMConfig } from "./types";

export class LLMClient {
	private config: AgentLLMConfig;

	constructor(config: AgentLLMConfig) {
		this.config = config;
	}

	getConfig(): AgentLLMConfig {
		return { ...this.config };
	}

	updateConfig(updates: Partial<AgentLLMConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	async testConnection(): Promise<{ ok: boolean; error?: string }> {
		try {
			const response = await fetch(
				`${this.config.baseUrl}/models`,
				{
					headers: {
						Authorization: `Bearer ${this.config.apiKey}`,
					},
				},
			);
			if (response.ok) {
				return { ok: true };
			}
			return {
				ok: false,
				error: `API returned ${response.status}`,
			};
		} catch (error) {
			return {
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Connection failed",
			};
		}
	}

	static defaultConfig(): AgentLLMConfig {
		return {
			baseUrl: "https://api.openai.com/v1",
			apiKey: "",
			model: "gpt-4.1",
		};
	}
}
