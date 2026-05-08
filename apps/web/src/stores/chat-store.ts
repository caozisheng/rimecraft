import { create } from "zustand";
import { nanoid } from "nanoid";
import { getMessages, t } from "@/i18n";
import { getStoredLocale } from "@/i18n/locale";
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

	undoTurn: (checkpointMessageId: string) => Promise<void>;
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

	undoTurn: async (checkpointMessageId) => {
		const state = get();
		if (state.status !== "idle") return;

		const msgIndex = state.messages.findIndex(
			(m) => m.id === checkpointMessageId,
		);
		if (msgIndex < 0) return;

		const checkpointMsg = state.messages[msgIndex];
		if (checkpointMsg.commandCheckpoint === undefined) return;

		try {
			const { getEditorCore } = await import("@/core/editor-core");
			const core = getEditorCore();
			await core.command.undoToCheckpoint(checkpointMsg.commandCheckpoint);
			core.preview.requestCompilation();

			const kept = state.messages.slice(0, msgIndex);
			set({
				messages: [
					...kept,
					{
						id: nanoid(),
						role: "system",
						content: getMessages().chat.undoSuccess,
						createdAt: Date.now(),
					},
				],
			});
		} catch {
			state.addMessage("system", getMessages().chat.undoFailed);
		}
	},

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

					const m = getMessages();
					const parts: string[] = [];
					parts.push(`${m.agent.project}: ${projectState.currentProject?.name ?? m.agent.unnamed}`);
					parts.push(`${m.agent.files} (${srcFiles.length}):`);
					for (const f of srcFiles) {
						const fileContent = await storage.readFile(projectId, f.path);
						if (fileContent.length > 10000) {
							parts.push(`\n--- ${f.path} (${fileContent.length} chars, ${m.agent.truncated}) ---`);
							parts.push(fileContent.slice(0, 10000) + "\n... (truncated)");
						} else {
							parts.push(`\n--- ${f.path} ---`);
							parts.push(fileContent);
						}
					}

					parts.push(`\n=== ${m.agent.runtimeState} ===`);
					parts.push(`${m.agent.running}: ${gameState.isRunning ? m.agent.yes : m.agent.no}`);
					parts.push(`FPS: ${gameState.fps}`);
					if (gameState.errors.length > 0) {
						parts.push(`${m.agent.recentErrors} (${gameState.errors.length}):`);
						for (const err of gameState.errors.slice(-5)) {
							parts.push(`  - ${err}`);
						}
					}

					return parts.join("\n");
				} catch {
					return null;
				}
			};

			let gameContext = await buildGameContext();

			let ragContext: string | null = null;
			try {
				const { buildRagContext } = await import("@/lib/ai/rag/retrieval");
				ragContext = buildRagContext(content) || null;
			} catch { /* RAG optional */ }

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

			const previousErrorSignatures = new Set<string>();
			let consecutiveErrorRounds = 0;

			const normalizeErrorSig = (e: string): string =>
				e.replace(/(line \d+(?::\d+)?)/g, "").replace(/game:\d+:\d+/g, "").trim();

			const waitForRuntimeErrors = async (): Promise<{ all: string[]; fresh: string[] }> => {
				const { useGameStore } = await import("@/stores/game-store");
				useGameStore.getState().clearErrors();
				const { getEditorCore } = await import("@/core/editor-core");
				getEditorCore().preview.requestCompilation();
				await new Promise((r) => setTimeout(r, 4000));
				const all = useGameStore.getState().errors;
				const fresh = all.filter((e) => !previousErrorSignatures.has(normalizeErrorSig(e)));
				for (const e of all) {
					previousErrorSignatures.add(normalizeErrorSig(e));
				}
				return { all, fresh };
			};

			// Multi-round agent loop: keep calling LLM until the game runs
			// without errors or we hit maxIterations
			while (iterations < maxIterations) {
				if (abortController.signal.aborted) break;

				set({ currentIteration: iterations + 1 });

				if (iterations > 0) {
					try {
						gameContext = await buildGameContext();
					} catch { /* keep previous context */ }
				}

				const currentMessages = get().messages;
				const events = runAgentLoop({
					messages: currentMessages,
					llmConfig,
					expertRole: state.expertRole,
					activeRoleId: get().activeRoleId ?? undefined,
					gameContext,
					ragContext,
					signal: abortController.signal,
					locale: getStoredLocale(),
				});

				let fullContent = "";
				let hadToolCalls = false;
				let shouldBreak = false;
				let hadFileWrites = false;
				let rafHandle: number | null = null;
				const flushStreaming = () => {
					rafHandle = null;
					set({ streamingContent: fullContent });
				};

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
							if (rafHandle === null) {
								rafHandle = requestAnimationFrame(flushStreaming);
							}
							break;

						case "tool_calls_complete": {
							console.log("[CHAT] tool_calls_complete received, iteration:", iterations, "tools:", event.toolCalls.map(t => t.function.name));
							if (rafHandle !== null) {
								cancelAnimationFrame(rafHandle);
								rafHandle = null;
							}
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
										t(getMessages().agent.switchedRole, { role: args.role }),
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
							if (rafHandle !== null) {
								cancelAnimationFrame(rafHandle);
								rafHandle = null;
							}
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
								`${getMessages().common.error}: ${event.message}`,
							);
							shouldBreak = true;
							break;
					}
				}

				iterations++;

				if (shouldBreak) break;

				// After each round, check for runtime errors.
				// If the agent wrote files, recompile and wait for fresh errors.
				// If text-only response (agent thinks it's done), still check
				// existing errors without recompiling — don't let agent declare
				// "done" while errors remain.
				if (hadFileWrites) {
					try {
						const { all: allErrors, fresh: freshErrors } = await waitForRuntimeErrors();
						if (allErrors.length > 0 && !abortController.signal.aborted) {
							consecutiveErrorRounds++;

							if (state.expertRole === "director" && get().activeRoleId !== "debug") {
								set({ activeRoleId: "debug" });
							}

							const em = getMessages();
							const errorList = freshErrors.length > 0
								? freshErrors.map((e) => `- ${e}`).join("\n")
								: allErrors.slice(-5).map((e) => `- ${e}`).join("\n");
							const prefix = freshErrors.length > 0
								? t(em.agent.runtimeErrors, { count: freshErrors.length })
								: t(em.agent.stillErrors, { count: allErrors.length });

							let debugHint = "\n\n" + em.agent.debugHint;
							if (consecutiveErrorRounds >= 3) {
								debugHint = "\n\n" + em.agent.debugHintAlt;
							}

							state.addMessage(
								"system",
								t(em.agent.debugFixPrompt, { prefix, errors: errorList, hint: debugHint }),
							);
							set({ status: "thinking", streamingContent: "" });
							continue;
						} else {
							consecutiveErrorRounds = 0;
							if (!hadToolCalls) break;
						}
					} catch {
						if (!hadToolCalls) break;
					}
				} else if (!hadToolCalls) {
					// Text-only response — agent thinks it's done.
					// Check existing errors without recompiling.
					try {
						const { useGameStore } = await import("@/stores/game-store");
						const existingErrors = useGameStore.getState().errors;
						if (existingErrors.length > 0 && !abortController.signal.aborted) {
							consecutiveErrorRounds++;

							if (state.expertRole === "director" && get().activeRoleId !== "debug") {
								set({ activeRoleId: "debug" });
							}

							const em = getMessages();
							const errorList = existingErrors.slice(-5).map((e) => `- ${e}`).join("\n");
							const prefix = t(em.agent.stillErrors, { count: existingErrors.length });

							let debugHint = "\n\n" + em.agent.debugHint;
							if (consecutiveErrorRounds >= 3) {
								debugHint = "\n\n" + em.agent.debugHintAlt;
							}

							state.addMessage(
								"system",
								t(em.agent.debugFixPrompt, { prefix, errors: errorList, hint: debugHint }),
							);
							set({ status: "thinking", streamingContent: "" });
							continue;
						}
					} catch { /* ignore */ }
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
						const mm = getMessages();
						state.addMessage(
							"system",
							`${t(mm.agent.maxIterations, { max: maxIterations, count: remainingErrors.length })}:\n${remainingErrors.map((e) => `- ${e}`).join("\n")}\n\n${mm.agent.retryHint}`,
						);
					}
				} catch { /* ignore */ }
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			state.addMessage("system", t(getMessages().chat.sendFailed, { message }));
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
