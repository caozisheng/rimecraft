import type { AgentLLMConfig, ToolDefinition } from "./types";
import { CloudLLMBackend, type LLMBackend, type StreamChunk } from "./llm-backend";

const openaiBackend = new CloudLLMBackend();

export function getLLMBackend(config: AgentLLMConfig): LLMBackend {
	return openaiBackend;
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
): Promise<{ ok: boolean; error?: string; provider?: string }> {
	const provider = config.provider ?? "openai-compatible";
	try {
		const response = await fetch(`${config.baseUrl}/models`, {
			headers: { Authorization: `Bearer ${config.apiKey}` },
		});
		if (response.ok) return { ok: true, provider };
		return { ok: false, error: `API returned ${response.status}`, provider };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Connection failed",
			provider,
		};
	}
}
