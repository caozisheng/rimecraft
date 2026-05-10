import { nanoid } from "nanoid";
import { getMessages, t } from "@/i18n";
import { getStoredLocale } from "@/i18n/locale";
import type { AgentMessage, ExpertRole } from "@rimecraft/agent-engine";

interface ChatActions {
	addMessage: (
		role: "user" | "assistant" | "system" | "tool",
		content: string,
		extra?: Partial<AgentMessage>,
	) => AgentMessage;
	get: () => {
		messages: AgentMessage[];
		expertRole: ExpertRole;
		activeRoleId: ExpertRole | null;
	};
	set: (
		partial:
			| Record<string, unknown>
			| ((s: Record<string, unknown>) => Record<string, unknown>),
	) => void;
}

const FILE_WRITE_TOOLS = new Set([
	"write_file",
	"patch_file",
	"create_scene",
	"delete_file",
	"rename_file",
	"set_game_config",
]);

const MAX_CONSECUTIVE_ERROR_ROUNDS = 5;

async function buildGameContext(): Promise<string | null> {
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
		parts.push(
			`${m.agent.project}: ${projectState.currentProject?.name ?? m.agent.unnamed}`,
		);
		parts.push(`${m.agent.files} (${srcFiles.length}):`);
		for (const f of srcFiles) {
			const fileContent = await storage.readFile(projectId, f.path);
			if (fileContent.length > 10000) {
				parts.push(
					`\n--- ${f.path} (${fileContent.length} chars, ${m.agent.truncated}) ---`,
				);
				parts.push(fileContent.slice(0, 10000) + "\n... (truncated)");
			} else {
				parts.push(`\n--- ${f.path} ---`);
				parts.push(fileContent);
			}
		}

		parts.push(`\n=== ${m.agent.runtimeState} ===`);
		parts.push(
			`${m.agent.running}: ${gameState.isRunning ? m.agent.yes : m.agent.no}`,
		);
		parts.push(`FPS: ${gameState.fps}`);
		if (gameState.activeSceneId) {
			parts.push(`Active Scene: ${gameState.activeSceneId}`);
		}
		if (gameState.objectCount > 0) {
			parts.push(`Object Count: ${gameState.objectCount}`);
		}
		if (gameState.errors.length > 0) {
			parts.push(
				`${m.agent.recentErrors} (${gameState.errors.length}):`,
			);
			for (const err of gameState.errors.slice(-5)) {
				parts.push(`  - ${err}`);
			}
		}

		try {
			const { sceneBridge } = await import("@/core/scene-bridge");
			const sceneTree = await Promise.race([
				sceneBridge.requestSceneTreeAsync(),
				new Promise<null>((r) => setTimeout(() => r(null), 1500)),
			]);
			if (sceneTree && sceneTree.objects?.length > 0) {
				parts.push(`\n=== Scene Graph (${sceneTree.objects.length} objects) ===`);
				parts.push(`Canvas: ${sceneTree.settings.width}x${sceneTree.settings.height}`);
				for (const obj of sceneTree.objects.slice(0, 30)) {
					parts.push(`  - ${obj.name || obj.id} (${obj.type}) [${Math.round(obj.x)},${Math.round(obj.y)}]`);
				}
				if (sceneTree.objects.length > 30) {
					parts.push(`  ... +${sceneTree.objects.length - 30} more`);
				}
			}
		} catch { /* scene bridge optional */ }

		parts.push(`\n[snapshot @ ${new Date().toLocaleTimeString()}]`);

		return parts.join("\n");
	} catch {
		return null;
	}
}

function normalizeErrorSig(e: string): string {
	return e
		.replace(/(line \d+(?::\d+)?)/g, "")
		.replace(/game:\d+:\d+/g, "")
		.trim();
}

async function waitForRuntimeErrors(
	previousErrorSignatures: Set<string>,
): Promise<{ all: string[]; fresh: string[] }> {
	const { useGameStore } = await import("@/stores/game-store");
	useGameStore.getState().clearErrors();
	const { getEditorCore } = await import("@/core/editor-core");
	getEditorCore().preview.requestCompilation();
	await new Promise((r) => setTimeout(r, 4000));
	const all = useGameStore.getState().errors;
	const fresh = all.filter(
		(e) => !previousErrorSignatures.has(normalizeErrorSig(e)),
	);
	for (const e of all) {
		previousErrorSignatures.add(normalizeErrorSig(e));
	}
	return { all, fresh };
}

interface ErrorRound {
	round: number;
	errors: string[];
}

function buildDebugMessage(
	allErrors: string[],
	freshErrors: string[],
	consecutiveErrorRounds: number,
	errorHistory: ErrorRound[],
): string {
	const em = getMessages();
	const errorList =
		freshErrors.length > 0
			? freshErrors.map((e) => `- ${e}`).join("\n")
			: allErrors.slice(-5).map((e) => `- ${e}`).join("\n");
	const prefix =
		freshErrors.length > 0
			? t(em.agent.runtimeErrors, { count: freshErrors.length })
			: t(em.agent.stillErrors, { count: allErrors.length });

	let debugHint: string;
	if (consecutiveErrorRounds >= 5) {
		debugHint = "\n\n" + em.agent.debugHintAlt +
			"\n\n⚠️ CRITICAL: 5+ consecutive failed rounds. You MUST try a fundamentally different approach — rewrite the problematic section from scratch or remove it entirely.";
	} else if (consecutiveErrorRounds >= 3) {
		debugHint = "\n\n" + em.agent.debugHintAlt;
	} else {
		debugHint = "\n\n" + em.agent.debugHint;
	}

	let reflection = "";
	if (errorHistory.length >= 2) {
		const prev = errorHistory.slice(-3);
		const lines = prev.map((r) =>
			`Round ${r.round}: ${r.errors.slice(0, 2).join("; ")}`,
		);
		reflection = `\n\n[Error history — your previous fixes did NOT resolve these]\n${lines.join("\n")}`;
	}

	return t(em.agent.debugFixPrompt, {
		prefix,
		errors: errorList,
		hint: debugHint + reflection,
	});
}

export async function runChatAgentLoop(
	actions: ChatActions,
	content: string,
): Promise<void> {
	const { addMessage, get, set } = actions;
	const state = get();

	addMessage("user", content);
	set({ status: "thinking", streamingContent: "" });

	const abortController = new AbortController();
	set({ abortController });

	try {
		const { runAgentLoop, ToolRegistry } = await import(
			"@rimecraft/agent-engine"
		);

		const { getLLMConfig } = await import("@/stores/llm-config-store");
		const llmConfig = getLLMConfig();

		const maxIterations = state.expertRole === "director" ? 20 : 10;
		let iterations = 0;
		set({ currentIteration: 0, maxIterations });

		let gameContext = await buildGameContext();

		let ragContext: string | null = null;
		try {
			const { buildRagContext } = await import("@/lib/ai/rag/retrieval");
			const activeRole = state.activeRoleId ?? state.expertRole;
			const contextType: "coding" | "debug" | "design" | "general" =
				activeRole === "debug"
					? "debug"
					: activeRole === "coding"
						? "coding"
						: activeRole === "design"
							? "design"
							: "general";

			let currentCode: string | undefined;
			let recentErrors: string[] | undefined;

			try {
				const { useGameStore } = await import("@/stores/game-store");
				const gameErrors = useGameStore.getState().errors;
				if (gameErrors.length > 0) {
					recentErrors = gameErrors.slice(-5);
				}
			} catch { /* ignore */ }

			try {
				const { getEditorCore } = await import("@/core/editor-core");
				const core = getEditorCore();
				const { useProjectStore } = await import("@/stores/project-store");
				const projectId = useProjectStore.getState().currentProject?.id;
				if (projectId) {
					const storage = core.project.getStorage();
					const files = await storage.listFiles(projectId);
					const srcFiles = files.filter(
						(f) => f.path.endsWith(".ts") && f.path.startsWith("src/"),
					);
					const codeSnippets: string[] = [];
					for (const f of srcFiles.slice(0, 5)) {
						const fc = await storage.readFile(projectId, f.path);
						codeSnippets.push(fc.slice(0, 3000));
					}
					currentCode = codeSnippets.join("\n");
				}
			} catch { /* ignore */ }

			ragContext = buildRagContext(content, {
				contextType,
				currentCode,
				recentErrors,
			}) || null;
		} catch {
			/* RAG optional */
		}

		let agentCheckpoint: number | undefined;
		try {
			const { getEditorCore } = await import("@/core/editor-core");
			agentCheckpoint = getEditorCore().command.getCheckpoint();
		} catch {
			/* ignore */
		}

		const previousErrorSignatures = new Set<string>();
		let consecutiveErrorRounds = 0;
		const errorHistory: ErrorRound[] = [];

		while (iterations < maxIterations) {
			if (abortController.signal.aborted) break;

			let isDebugRound = false;

			set({ currentIteration: iterations + 1 });

			if (iterations > 0) {
				try {
					gameContext = await buildGameContext();
				} catch {
					/* keep previous context */
				}
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
				locale: getStoredLocale() === "zh" ? "zh" : "en",
			});

			let fullContent = "";
			let hadToolCalls = false;
			let shouldBreak = false;
			let hadFileWrites = false;
			let rafHandle: number | null = null;
			let batchedDeltas = 0;
			let rafFlushes = 0;
			const flushStreaming = () => {
				rafHandle = null;
				rafFlushes++;
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
						batchedDeltas++;
						if (rafHandle === null) {
							rafHandle = requestAnimationFrame(flushStreaming);
						}
						break;

					case "tool_calls_complete": {
						console.log(
							"[CHAT] tool_calls_complete received, iteration:",
							iterations,
							"tools:",
							event.toolCalls.map((t) => t.function.name),
							`raf: ${rafFlushes} flushes / ${batchedDeltas} deltas`,
						);
						if (rafHandle !== null) {
							cancelAnimationFrame(rafHandle);
							rafHandle = null;
						}
						hadToolCalls = true;

						const msgExtra: Partial<AgentMessage> = {
							toolCalls: event.toolCalls,
						};
						if (
							iterations === 0 &&
							agentCheckpoint !== undefined
						) {
							msgExtra.commandCheckpoint = agentCheckpoint;
						}

						addMessage("assistant", fullContent || "", msgExtra);
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
								set({ activeRoleId: args.role });
								addMessage(
									"tool",
									t(getMessages().agent.switchedRole, {
										role: args.role,
									}),
									{ toolCallId: toolCall.id },
								);
							} else {
								set({ status: "thinking" });
								const result =
									await ToolRegistry.executeToolCall(
										toolCall,
									);
								if (
									FILE_WRITE_TOOLS.has(
										toolCall.function.name,
									)
								) {
									hadFileWrites = true;
								}
								addMessage("tool", result.message, {
									toolCallId: toolCall.id,
									toolResults: [
										{
											toolName:
												toolCall.function.name,
											success: result.success,
											message: result.message,
											undoable: result.undoable,
										},
									],
								});
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
							if (
								iterations === 0 &&
								agentCheckpoint !== undefined
							) {
								endExtra.commandCheckpoint = agentCheckpoint;
							}
							addMessage("assistant", fullContent, endExtra);
							fullContent = "";
							set({ streamingContent: "" });
						}
						break;

					case "error":
						set({ status: "error" });
						addMessage(
							"system",
							`${getMessages().common.error}: ${event.message}`,
						);
						shouldBreak = true;
						break;
				}
			}

			if (shouldBreak) break;

			if (hadFileWrites) {
				try {
					const { all: allErrors, fresh: freshErrors } =
						await waitForRuntimeErrors(previousErrorSignatures);
					if (
						allErrors.length > 0 &&
						!abortController.signal.aborted
					) {
						consecutiveErrorRounds++;
						errorHistory.push({ round: iterations + 1, errors: [...allErrors] });

						if (consecutiveErrorRounds >= MAX_CONSECUTIVE_ERROR_ROUNDS) {
							const mm = getMessages();
							addMessage(
								"system",
								`${t(mm.agent.maxIterations, { max: consecutiveErrorRounds, count: allErrors.length })}:\n${allErrors.map((e) => `- ${e}`).join("\n")}\n\n${mm.agent.retryHint}`,
							);
							break;
						}

						if (
							state.expertRole === "director" &&
							get().activeRoleId !== "debug"
						) {
							set({ activeRoleId: "debug" });
						}

						addMessage(
							"system",
							buildDebugMessage(
								allErrors,
								freshErrors,
								consecutiveErrorRounds,
								errorHistory,
							),
						);
						isDebugRound = true;
						set({ status: "thinking", streamingContent: "" });
						continue;
					} else {
						consecutiveErrorRounds = 0;
						iterations++;
						if (!hadToolCalls) break;
					}
				} catch {
					iterations++;
					if (!hadToolCalls) break;
				}
			} else if (!hadToolCalls) {
				try {
					const { useGameStore } = await import(
						"@/stores/game-store"
					);
					const existingErrors = useGameStore.getState().errors;
					if (
						existingErrors.length > 0 &&
						!abortController.signal.aborted
					) {
						consecutiveErrorRounds++;
						errorHistory.push({ round: iterations + 1, errors: [...existingErrors] });

						if (consecutiveErrorRounds >= MAX_CONSECUTIVE_ERROR_ROUNDS) {
							const mm = getMessages();
							addMessage(
								"system",
								`${t(mm.agent.maxIterations, { max: consecutiveErrorRounds, count: existingErrors.length })}:\n${existingErrors.map((e) => `- ${e}`).join("\n")}\n\n${mm.agent.retryHint}`,
							);
							break;
						}

						if (
							state.expertRole === "director" &&
							get().activeRoleId !== "debug"
						) {
							set({ activeRoleId: "debug" });
						}

						addMessage(
							"system",
							buildDebugMessage(
								existingErrors,
								[],
								consecutiveErrorRounds,
								errorHistory,
							),
						);
						isDebugRound = true;
						set({ status: "thinking", streamingContent: "" });
						continue;
					}
				} catch {
					/* ignore */
				}
				iterations++;
				break;
			} else {
				iterations++;
			}

			set({ status: "thinking", streamingContent: "" });
		}

		if (iterations >= maxIterations && !abortController.signal.aborted) {
			try {
				const { useGameStore } = await import("@/stores/game-store");
				const remainingErrors = useGameStore.getState().errors;
				if (remainingErrors.length > 0) {
					const mm = getMessages();
					const historyNote = errorHistory.length > 0
						? `\n\n[${errorHistory.length} debug rounds attempted]`
						: "";
					addMessage(
						"system",
						`${t(mm.agent.maxIterations, { max: maxIterations, count: remainingErrors.length })}:\n${remainingErrors.map((e) => `- ${e}`).join("\n")}\n\n${mm.agent.retryHint}${historyNote}`,
					);
				}
			} catch {
				/* ignore */
			}
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : String(error);
		addMessage(
			"system",
			t(getMessages().chat.sendFailed, { message }),
		);
	} finally {
		set({
			status: "idle",
			abortController: null,
			streamingContent: "",
			currentIteration: 0,
			maxIterations: 0,
		});
	}
}
