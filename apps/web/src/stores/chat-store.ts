import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
	AgentMessage,
	AgentStatus,
	ExpertRole,
} from "@rimecraft/agent-engine";

interface ChatState {
	messages: AgentMessage[];
	status: AgentStatus;
	streamingContent: string;
	expertRole: ExpertRole;
	activeRoleId: ExpertRole | null;
	isOpen: boolean;
	abortController: AbortController | null;

	addMessage: (
		role: "user" | "assistant" | "system" | "tool",
		content: string,
		extra?: Partial<AgentMessage>,
	) => AgentMessage;
	updateLastAssistantMessage: (content: string) => void;
	appendStreamingContent: (delta: string) => void;
	clearStreamingContent: () => void;
	setStatus: (status: AgentStatus) => void;
	setExpertRole: (role: ExpertRole) => void;
	setActiveRoleId: (role: ExpertRole | null) => void;
	setOpen: (open: boolean) => void;
	setAbortController: (controller: AbortController | null) => void;
	clearMessages: () => void;

	sendMessage: (content: string) => Promise<void>;
	cancelRequest: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
	messages: [],
	status: "idle",
	streamingContent: "",
	expertRole: "director",
	activeRoleId: null,
	isOpen: true,
	abortController: null,

	addMessage: (role, content, extra) => {
		const msg: AgentMessage = {
			id: nanoid(),
			role,
			content,
			createdAt: Date.now(),
			...extra,
		};
		set((s) => ({ messages: [...s.messages, msg] }));
		return msg;
	},

	updateLastAssistantMessage: (content) =>
		set((s) => {
			const messages = [...s.messages];
			for (let i = messages.length - 1; i >= 0; i--) {
				if (messages[i].role === "assistant") {
					messages[i] = { ...messages[i], content };
					break;
				}
			}
			return { messages };
		}),

	appendStreamingContent: (delta) =>
		set((s) => ({
			streamingContent: s.streamingContent + delta,
		})),

	clearStreamingContent: () => set({ streamingContent: "" }),

	setStatus: (status) => set({ status }),

	setExpertRole: (expertRole) => set({ expertRole }),

	setActiveRoleId: (activeRoleId) => set({ activeRoleId }),

	setOpen: (isOpen) => set({ isOpen }),

	setAbortController: (abortController) => set({ abortController }),

	clearMessages: () => set({ messages: [], streamingContent: "" }),

	sendMessage: async (content) => {
		const state = get();
		if (state.status !== "idle") return;

		state.addMessage("user", content);
		set({ status: "thinking", streamingContent: "" });

		const abortController = new AbortController();
		set({ abortController });

		try {
			const { runAgentLoop } = await import(
				"@rimecraft/agent-engine"
			);

			const llmConfig = {
				baseUrl:
					localStorage.getItem("rimecraft_llm_baseUrl") ??
					"https://api.openai.com/v1",
				apiKey:
					localStorage.getItem("rimecraft_llm_apiKey") ?? "",
				model:
					localStorage.getItem("rimecraft_llm_model") ??
					"gpt-4.1",
			};

			const maxIterations =
				state.expertRole === "director" ? 20 : 10;
			let iterations = 0;

			const currentMessages = get().messages;

			const events = runAgentLoop({
				messages: currentMessages,
				llmConfig,
				expertRole: state.expertRole,
				activeRoleId: state.activeRoleId ?? undefined,
				signal: abortController.signal,
			});

			let fullContent = "";

			for await (const event of events) {
				if (abortController.signal.aborted) break;

				switch (event.type) {
					case "status":
						set({ status: event.status });
						break;

					case "text_delta":
						fullContent += event.content;
						set({ streamingContent: fullContent });
						break;

					case "tool_calls_complete": {
						const { ToolRegistry } = await import(
							"@rimecraft/agent-engine"
						);

						for (const toolCall of event.toolCalls) {
							if (
								toolCall.function.name ===
								"switch_expert_role"
							) {
								const args = JSON.parse(
									toolCall.function.arguments,
								);
								set({
									activeRoleId: args.role,
								});
								state.addMessage(
									"tool",
									`已切换到角色: ${args.role}`,
									{ toolCallId: toolCall.id },
								);
							} else {
								const result =
									await ToolRegistry.executeToolCall(
										toolCall,
									);
								state.addMessage(
									"tool",
									result.message,
									{
										toolCallId: toolCall.id,
										toolResults: [
											{
												toolName:
													toolCall.function
														.name,
												success: result.success,
												message: result.message,
												undoable:
													result.undoable,
											},
										],
									},
								);
							}
						}
						break;
					}

					case "message_end":
						if (fullContent) {
							state.addMessage("assistant", fullContent);
							fullContent = "";
							set({ streamingContent: "" });
						}
						iterations++;
						break;

					case "error":
						set({ status: "error" });
						state.addMessage(
							"system",
							`错误: ${event.message}`,
						);
						break;
				}

				if (iterations >= maxIterations) break;
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			state.addMessage("system", `发送消息失败: ${message}`);
		} finally {
			set({
				status: "idle",
				abortController: null,
				streamingContent: "",
			});
		}
	},

	cancelRequest: () => {
		const { abortController } = get();
		abortController?.abort();
		set({
			status: "idle",
			abortController: null,
			streamingContent: "",
		});
	},
}));
