import type { AgentLLMConfig, ToolDefinition } from "./types";
import { CloudLLMBackend, type LLMBackend, type StreamChunk } from "./llm-backend";

const defaultBackend = new CloudLLMBackend();

export function getLLMBackend(_config: AgentLLMConfig): LLMBackend {
	return defaultBackend;
}

export function streamChatCompletion(
	config: AgentLLMConfig,
	messages: Record<string, unknown>[],
	signal?: AbortSignal,
	tools?: ToolDefinition[],
): AsyncGenerator<StreamChunk> {
	const backend = getLLMBackend(config);
	return backend.streamChat(config, messages, signal, tools);
}

export async function testLLMConnection(
	config: AgentLLMConfig,
): Promise<{ ok: boolean; error?: string }> {
	try {
		const response = await fetch(`${config.baseUrl}/models`, {
			headers: { Authorization: `Bearer ${config.apiKey}` },
		});
		if (response.ok) return { ok: true };
		return { ok: false, error: `API returned ${response.status}` };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Connection failed",
		};
	}
}
