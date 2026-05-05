import type {
	AgentLLMConfig,
	AgentMessage,
	AgentEvent,
	ToolDefinition,
	ToolCallInfo,
} from "./types";
import type { ExpertRole } from "./expert-roles";
import { getExpertRoleSystemPrompt, EXPERT_ROLES } from "./expert-roles";
import { ToolRegistry } from "./tool-registry";

interface RunAgentLoopParams {
	messages: AgentMessage[];
	llmConfig: AgentLLMConfig;
	expertRole: ExpertRole;
	activeRoleId?: ExpertRole;
	gameContext?: string | null;
	tools?: ToolDefinition[];
	signal?: AbortSignal;
}

function buildSystemPrompt(params: RunAgentLoopParams): string {
	const parts: string[] = [];

	parts.push(
		"你是 RimeCraft 的 AI 助手，一个面向青少年的 2D 游戏对话式开发工具。",
	);
	parts.push(
		"用户通过自然语言描述想法，你帮助他们使用 Phaser.js 创建 2D 游戏。",
	);
	parts.push("");

	const rolePrompt = getExpertRoleSystemPrompt(params.expertRole);
	if (rolePrompt) {
		parts.push(rolePrompt);
		parts.push("");
	}

	if (params.expertRole === "director" && params.activeRoleId) {
		const activeRole = EXPERT_ROLES[params.activeRoleId];
		if (activeRole) {
			parts.push(
				`当前激活的专家角色：${activeRole.name}（${params.activeRoleId}）`,
			);
			parts.push("");
		}
	}

	if (params.gameContext) {
		parts.push("当前游戏状态：");
		parts.push(params.gameContext);
		parts.push("");
	}

	parts.push("重要规则：");
	parts.push("- 使用中文回复，语言通俗易懂，避免过于专业的术语");
	parts.push("- 生成代码时使用 TypeScript + Phaser 4 API");
	parts.push("- 每次修改代码后，游戏预览会自动刷新");
	parts.push("- 如果用户描述模糊，主动提问引导");
	parts.push("- 出错时不要慌，分析原因后修复");

	return parts.join("\n");
}

export async function* runAgentLoop(
	params: RunAgentLoopParams,
): AsyncGenerator<AgentEvent> {
	const systemPrompt = buildSystemPrompt(params);

	const apiMessages = [
		{ role: "system" as const, content: systemPrompt },
		...params.messages.map((m) => ({
			role: m.role as "user" | "assistant" | "system" | "tool",
			content: m.content,
			...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
			...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
		})),
	];

	const tools = params.tools ?? ToolRegistry.getDefinitions();

	if (
		params.expertRole === "director" &&
		!tools.find(
			(t) => t.function.name === "switch_expert_role",
		)
	) {
		tools.push({
			type: "function",
			function: {
				name: "switch_expert_role",
				description: "切换到指定的专家角色",
				parameters: {
					type: "object",
					properties: {
						role: {
							type: "string",
							enum: [
								"design",
								"coding",
								"asset",
								"gameplay",
								"debug",
							],
							description: "目标角色 ID",
						},
					},
					required: ["role"],
				},
			},
		});
	}

	yield { type: "status", status: "thinking" };

	try {
		const response = await fetch(`${params.llmConfig.baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${params.llmConfig.apiKey}`,
			},
			body: JSON.stringify({
				model: params.llmConfig.model,
				messages: apiMessages,
				tools: tools.length > 0 ? tools : undefined,
				stream: true,
			}),
			signal: params.signal,
		});

		if (!response.ok) {
			const errorText = await response.text();
			yield {
				type: "error",
				message: `LLM API error (${response.status}): ${errorText}`,
			};
			return;
		}

		yield { type: "status", status: "streaming" };

		const reader = response.body?.getReader();
		if (!reader) {
			yield { type: "error", message: "No response body" };
			return;
		}

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
				if (!trimmed || trimmed === "data: [DONE]") continue;
				if (!trimmed.startsWith("data: ")) continue;

				try {
					const data = JSON.parse(trimmed.slice(6));
					const delta = data.choices?.[0]?.delta;
					if (!delta) continue;

					if (delta.content) {
						yield { type: "text_delta", content: delta.content };
					}

					if (delta.tool_calls) {
						for (const tc of delta.tool_calls) {
							const idx = tc.index ?? 0;
							if (!toolCalls[idx]) {
								toolCalls[idx] = {
									id: tc.id ?? "",
									type: "function",
									function: {
										name: tc.function?.name ?? "",
										arguments:
											tc.function?.arguments ?? "",
									},
								};
							} else {
								if (tc.id) toolCalls[idx].id = tc.id;
								if (tc.function?.name) {
									toolCalls[idx].function.name =
										tc.function.name;
								}
								if (tc.function?.arguments) {
									toolCalls[idx].function.arguments +=
										tc.function.arguments;
								}
							}
						}
					}

					if (data.choices?.[0]?.finish_reason) {
						const usage = data.usage;
						if (toolCalls.length > 0) {
							yield {
								type: "tool_calls_complete",
								toolCalls,
							};
						}
						yield {
							type: "message_end",
							usage: usage
								? {
										promptTokens:
											usage.prompt_tokens ?? 0,
										completionTokens:
											usage.completion_tokens ?? 0,
										totalTokens:
											usage.total_tokens ?? 0,
									}
								: undefined,
						};
					}
				} catch {
					// Skip malformed JSON chunks
				}
			}
		}
	} catch (error) {
		if (params.signal?.aborted) {
			yield { type: "error", message: "Request cancelled" };
		} else {
			const message =
				error instanceof Error ? error.message : String(error);
			yield { type: "error", message };
		}
	}
}
