import type { AgentTool } from "@rime/agent-engine";
import type { ToolContext } from "./tool-context";
import { getMessages, normalizeError } from "./tool-context";

export function createUtilityTools(ctx: ToolContext): AgentTool[] {
	const { preview, cmd } = ctx;
	const dm = getMessages();

	return [
		{
			name: "undo",
			description: dm.tools.undo.desc,
			parameters: { type: "object", properties: {} },
			async execute() {
				const m = getMessages();
				const success = await cmd().undo();
				if (success) {
					preview().requestCompilation();
					return { success: true, message: m.tools.undoSuccess };
				}
				return {
					success: false,
					message: m.tools.undoNoOp,
				};
			},
		},
		{
			name: "redo",
			description: dm.tools.redo.desc,
			parameters: { type: "object", properties: {} },
			async execute() {
				const m = getMessages();
				const success = await cmd().redo();
				if (success) {
					preview().requestCompilation();
					return { success: true, message: m.tools.redoSuccess };
				}
				return {
					success: false,
					message: m.tools.redoNoOp,
				};
			},
		},
		{
			name: "undo_all",
			description: dm.tools.undoAll.desc,
			parameters: { type: "object", properties: {} },
			async execute() {
				try {
					const m = getMessages();
					const checkpoint = cmd().getCheckpoint();
					if (checkpoint <= 0) {
						return { success: false, message: m.tools.undoNoOp };
					}
					await cmd().undoToCheckpoint(0);
					preview().requestCompilation();
					return {
						success: true,
						message: m.tools.undoAllSuccess,
					};
				} catch (e) {
					const m = getMessages();
					return {
						success: false,
						message: `${m.tools.undoAllFailed}: ${normalizeError(e)}`,
					};
				}
			},
		},
	];
}
