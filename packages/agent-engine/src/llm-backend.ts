import type { AgentLLMConfig, ToolDefinition, ToolCallInfo, TokenUsage } from "./types";

export type StreamChunk =
	| { type: "content_delta"; delta: string }
	| { type: "tool_calls_complete"; toolCalls: ToolCallInfo[] }
	| { type: "done"; usage?: TokenUsage }
	| { type: "error"; message: string };

export interface LLMBackend {
	streamChat(
		config: AgentLLMConfig,
		messages: Record<string, unknown>[],
		signal?: AbortSignal,
		tools?: ToolDefinition[],
	): AsyncGenerator<StreamChunk>;
}

export class CloudLLMBackend implements LLMBackend {
	private shouldUseDirect(): boolean {
		if (typeof window === "undefined") return false;
		// biome-ignore lint: dynamic platform detection
		const w = window as any;
		return !!w.__TAURI_INTERNALS__ ||
			navigator.userAgent.includes("wv") ||
			typeof w.__CAPACITOR__ !== "undefined";
	}

	async *streamChat(
		config: AgentLLMConfig,
		messages: Record<string, unknown>[],
		signal?: AbortSignal,
		tools?: ToolDefinition[],
	): AsyncGenerator<StreamChunk> {
		const direct = this.shouldUseDirect();
		const url = direct
			? config.baseUrl.replace(/\/+$/, "") + "/chat/completions"
			: "/api/ai/chat";

		const payload: Record<string, unknown> = {
			model: config.model,
			messages,
			stream: true,
		};
		if (tools && tools.length > 0) {
			payload.tools = tools;
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		let body: string;
		if (direct) {
			headers.Authorization = `Bearer ${config.apiKey}`;
			body = JSON.stringify(payload);
		} else {
			body = JSON.stringify({
				baseUrl: config.baseUrl,
				apiKey: config.apiKey,
				...payload,
			});
		}

		let response: Response;
		try {
			response = await fetch(url, { method: "POST", headers, body, signal });
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Network error";
			yield { type: "error", message: msg };
			return;
		}

		if (!response.ok) {
			const text = await response.text().catch(() => "Unknown error");
			yield { type: "error", message: `API error ${response.status}: ${text}` };
			return;
		}

		const reader = response.body?.getReader();
		if (!reader) {
			yield { type: "error", message: "No response body" };
			return;
		}

		try {
			const decoder = new TextDecoder();
			let buffer = "";
			const toolCalls: ToolCallInfo[] = [];

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || trimmed.startsWith(":")) continue;
					if (trimmed === "data: [DONE]") {
						if (toolCalls.length > 0) {
							yield { type: "tool_calls_complete", toolCalls };
						}
						yield { type: "done" };
						continue;
					}
					if (!trimmed.startsWith("data: ")) continue;

					try {
						const data = JSON.parse(trimmed.slice(6));
						const delta = data.choices?.[0]?.delta;

						if (delta?.content) {
							yield { type: "content_delta", delta: delta.content };
						}

						if (delta?.tool_calls) {
							for (const tc of delta.tool_calls) {
								const idx = tc.index ?? 0;
								if (!toolCalls[idx]) {
									toolCalls[idx] = {
										id: tc.id ?? "",
										type: "function",
										function: {
											name: tc.function?.name ?? "",
											arguments: tc.function?.arguments ?? "",
										},
									};
								} else {
									if (tc.id) toolCalls[idx].id = tc.id;
									if (tc.function?.name) {
										toolCalls[idx].function.name = tc.function.name;
									}
									if (tc.function?.arguments) {
										toolCalls[idx].function.arguments += tc.function.arguments;
									}
								}
							}
						}

						const finishReason = data.choices?.[0]?.finish_reason;
						if (finishReason) {
							const usage = data.usage;
							if (toolCalls.length > 0) {
								yield { type: "tool_calls_complete", toolCalls };
							}
							yield {
								type: "done",
								usage: usage
									? {
											promptTokens: usage.prompt_tokens ?? 0,
											completionTokens: usage.completion_tokens ?? 0,
											totalTokens: usage.total_tokens ?? 0,
										}
									: undefined,
							};
						}
					} catch {
						// Skip malformed JSON chunks
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}
}
