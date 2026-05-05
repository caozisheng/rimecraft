export type ExpertRole =
	| "director"
	| "design"
	| "coding"
	| "asset"
	| "gameplay"
	| "debug";

export type AgentStatus = "idle" | "thinking" | "streaming" | "error";

export interface AgentLLMConfig {
	baseUrl: string;
	apiKey: string;
	model: string;
}

export interface AgentMessage {
	id: string;
	role: "user" | "assistant" | "system" | "tool";
	content: string;
	toolCalls?: ToolCallInfo[];
	toolCallId?: string;
	toolResults?: ToolResultSummary[];
	commandCheckpoint?: number;
	createdAt: number;
}

export interface ToolCallInfo {
	id: string;
	type: "function";
	function: {
		name: string;
		arguments: string;
	};
}

export interface ToolResultSummary {
	toolName: string;
	success: boolean;
	message: string;
	undoable?: boolean;
}

export interface ToolDefinition {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

export interface TokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

export type AgentEvent =
	| { type: "text_delta"; content: string }
	| { type: "tool_calls_complete"; toolCalls: ToolCallInfo[] }
	| { type: "message_end"; usage?: TokenUsage }
	| { type: "error"; message: string }
	| { type: "status"; status: AgentStatus };
