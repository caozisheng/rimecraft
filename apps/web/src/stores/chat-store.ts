import { create } from "zustand";
import { nanoid } from "nanoid";
import { getMessages } from "@/i18n";
import type {
	AgentMessage,
	AgentStatus,
	ExpertRole,
} from "@rimecraft/agent-engine";
import { runChatAgentLoop } from "./agent-loop";

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

		await runChatAgentLoop(
			{
				addMessage: state.addMessage,
				get: () => get(),
				set: (partial) => set(partial as Partial<ChatState>),
			},
			content,
		);
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
