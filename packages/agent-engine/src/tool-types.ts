import type { ToolDefinition } from "./types";

export interface AgentToolResult {
	success: boolean;
	message: string;
	data?: Record<string, unknown>;
	undoable?: boolean;
}

export interface AgentTool {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	requiresConfirmation?: boolean;
	execute: (args: Record<string, unknown>) => Promise<AgentToolResult>;
}

export function agentToolToDefinition(tool: AgentTool): ToolDefinition {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	};
}
