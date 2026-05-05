import type { AgentTool, AgentToolResult } from "./tool-types";
import type { ToolCallInfo, ToolDefinition } from "./types";
import { agentToolToDefinition } from "./tool-types";

const toolMap = new Map<string, AgentTool>();

export const ToolRegistry = {
	register(tool: AgentTool): void {
		toolMap.set(tool.name, tool);
	},

	get(name: string): AgentTool | undefined {
		return toolMap.get(name);
	},

	getAll(): AgentTool[] {
		return Array.from(toolMap.values());
	},

	getDefinitions(): ToolDefinition[] {
		return Array.from(toolMap.values()).map(agentToolToDefinition);
	},

	async executeToolCall(
		toolCall: ToolCallInfo,
	): Promise<AgentToolResult> {
		const tool = toolMap.get(toolCall.function.name);
		if (!tool) {
			return {
				success: false,
				message: `Unknown tool: ${toolCall.function.name}`,
			};
		}

		try {
			const args = JSON.parse(toolCall.function.arguments);
			return await tool.execute(args);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			return {
				success: false,
				message: `Tool execution error: ${message}`,
			};
		}
	},

	clear(): void {
		toolMap.clear();
	},
};
