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
	currentIteration: number;
	maxIterations: number;

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
	currentIteration: 0,
	maxIterations: 0,

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
			const { runAgentLoop, ToolRegistry } = await import(
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
			set({ currentIteration: 0, maxIterations });

			const buildGameContext = async (): Promise<string | null> => {
				try {
					const { getEditorCore } = await import("@/core/editor-core");
					const core = getEditorCore();
					const { useProjectStore } = await import("@/stores/project-store");
					const { useGameStore } = await import("@/stores/game-store");
					const projectState = useProjectStore.getState();
					const gameState = useGameStore.getState();
					const projectId = projectState.currentProject?.id;
					if (!projectId) return null;

					const storage = core.project.getStorage();
					const files = await storage.listFiles(projectId);
					const srcFiles = files.filter(
						(f) => f.path.endsWith(".ts") && f.path.startsWith("src/"),
					);

					const parts: string[] = [];
					parts.push(`项目: ${projectState.currentProject?.name ?? "未命名"}`);
					parts.push(`文件 (${srcFiles.length}):`);
					for (const f of srcFiles) {
						const fileContent = await storage.readFile(projectId, f.path);
						if (fileContent.length > 10000) {
							parts.push(`\n--- ${f.path} (${fileContent.length} chars, 截断) ---`);
							parts.push(fileContent.slice(0, 10000) + "\n... (truncated)");
						} else {
							parts.push(`\n--- ${f.path} ---`);
							parts.push(fileContent);
						}
					}

					parts.push("\n=== 游戏运行时状态 ===");
					parts.push(`运行中: ${gameState.isRunning ? "是" : "否"}`);
					parts.push(`FPS: ${gameState.fps}`);
					if (gameState.errors.length > 0) {
						parts.push(`最近错误 (${gameState.errors.length}):`);
						for (const err of gameState.errors.slice(-5)) {
							parts.push(`  - ${err}`);
						}
					}

					return parts.join("\n");
				} catch {
					return null;
				}
			};

			const gameContext = await buildGameContext();

			// Create undo checkpoint so all agent operations can be rolled back
			let agentCheckpoint: number | undefined;
			try {
				const { getEditorCore } = await import("@/core/editor-core");
				agentCheckpoint = getEditorCore().command.getCheckpoint();
			} catch { /* ignore */ }

			const FILE_WRITE_TOOLS = new Set([
				"write_file", "patch_file", "create_scene",
				"delete_file", "rename_file", "set_game_config",
			]);

			const waitForRuntimeErrors = async (): Promise<string[]> => {
				const { useGameStore } = await import("@/stores/game-store");
				useGameStore.getState().clearErrors();
				const { getEditorCore } = await import("@/core/editor-core");
				getEditorCore().preview.requestCompilation();
				// Wait for debounced compilation (300ms) + compile + iframe load + Phaser init
				await new Promise((r) => setTimeout(r, 4000));
				return useGameStore.getState().errors;
			};

			// Multi-round agent loop: keep calling LLM until the game runs
			// without errors or we hit maxIterations
			while (iterations < maxIterations) {
				if (abortController.signal.aborted) break;

				set({ currentIteration: iterations + 1 });

				const currentMessages = get().messages;
				const events = runAgentLoop({
					messages: currentMessages,
					llmConfig,
					expertRole: state.expertRole,
					activeRoleId: get().activeRoleId ?? undefined,
					gameContext,
					signal: abortController.signal,
				});

				let fullContent = "";
				let hadToolCalls = false;
				let shouldBreak = false;
				let hadFileWrites = false;

				for await (const event of events) {
					if (abortController.signal.aborted) {
						shouldBreak = true;
						break;
					}

					switch (event.type) {
						case "status":
							set({ status: event.status });
							break;

						case "text_delta":
							fullContent += event.content;
							set({ streamingContent: fullContent });
							break;

						case "tool_calls_complete": {
							hadToolCalls = true;

							const msgExtra: Partial<AgentMessage> = {
								toolCalls: event.toolCalls,
							};
							if (iterations === 0 && agentCheckpoint !== undefined) {
								msgExtra.commandCheckpoint = agentCheckpoint;
							}

							state.addMessage(
								"assistant",
								fullContent || "",
								msgExtra,
							);
							fullContent = "";
							set({ streamingContent: "" });

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
									set({ status: "thinking" });
									const result =
										await ToolRegistry.executeToolCall(
											toolCall,
										);
									if (FILE_WRITE_TOOLS.has(toolCall.function.name)) {
										hadFileWrites = true;
									}
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
								const endExtra: Partial<AgentMessage> = {};
								if (iterations === 0 && agentCheckpoint !== undefined) {
									endExtra.commandCheckpoint = agentCheckpoint;
								}
								state.addMessage("assistant", fullContent, endExtra);
								fullContent = "";
								set({ streamingContent: "" });
							}
							break;

						case "error":
							set({ status: "error" });
							state.addMessage(
								"system",
								`错误: ${event.message}`,
							);
							shouldBreak = true;
							break;
					}
				}

				iterations++;

				if (shouldBreak) break;

				// When the LLM responded with text only (no tool calls),
				// it thinks the task is done. Verify by running the game.
				if (!hadToolCalls || hadFileWrites) {
					try {
						const runtimeErrors = await waitForRuntimeErrors();
						if (runtimeErrors.length > 0 && !abortController.signal.aborted) {
							state.addMessage(
								"system",
								`游戏预览启动后检测到 ${runtimeErrors.length} 个运行时错误，请分析代码并修复:\n${runtimeErrors.map((e) => `- ${e}`).join("\n")}`,
							);
							// Continue the loop so the LLM can fix these errors
							if (!hadToolCalls) {
								// LLM thought it was done — force another round
								set({ status: "thinking", streamingContent: "" });
								continue;
							}
						} else if (!hadToolCalls) {
							// No errors, LLM is done — exit loop
							break;
						}
					} catch {
						if (!hadToolCalls) break;
					}
				} else if (!hadToolCalls) {
					break;
				}

				set({ status: "thinking", streamingContent: "" });
			}

			// If we exhausted iterations and there are still errors, notify the user
			if (iterations >= maxIterations && !abortController.signal.aborted) {
				try {
					const { useGameStore } = await import("@/stores/game-store");
					const remainingErrors = useGameStore.getState().errors;
					if (remainingErrors.length > 0) {
						state.addMessage(
							"system",
							`⚠️ Agent 已达到最大迭代次数 (${maxIterations}) 但仍有 ${remainingErrors.length} 个运行时错误:\n${remainingErrors.map((e) => `- ${e}`).join("\n")}\n\n发送"修复错误"可以让 AI 重新尝试。`,
						);
					}
				} catch { /* ignore */ }
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
				currentIteration: 0,
				maxIterations: 0,
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
