import type { ProjectManager } from "../project-manager";
import type { PreviewManager } from "../preview-manager";
import type { CommandManager, Command } from "../command-manager";
import { useProjectStore } from "@/stores/project-store";
import { getMessages, t } from "@/i18n";
import { normalizeError } from "@/utils/normalize-error";

export type { Command };

export interface ToolContext {
	pm: () => ProjectManager;
	preview: () => PreviewManager;
	cmd: () => CommandManager;
}

export async function refreshFileList(pm: () => ProjectManager): Promise<void> {
	const projectId = useProjectStore.getState().currentProject?.id;
	if (projectId) {
		const files = await pm().getStorage().listFiles(projectId);
		useProjectStore
			.getState()
			.setFiles(files.map((f) => ({ path: f.path, type: "file" as const })));
	}
}

export async function resolveFilePath(
	input: string,
	pm: () => ProjectManager,
): Promise<string | null> {
	const projectId = useProjectStore.getState().currentProject?.id;
	if (!projectId) return input;
	const storage = pm().getStorage();
	const files = await storage.listFiles(projectId);
	const paths = files.map((f) => f.path);
	if (paths.includes(input)) return input;
	const inputLower = input.toLowerCase();
	const exactCI = paths.find((p) => p.toLowerCase() === inputLower);
	if (exactCI) return exactCI;
	const fileName = input.split("/").pop() ?? input;
	const fileNameLower = fileName.toLowerCase();
	const byName = paths.find(
		(p) => (p.split("/").pop() ?? p).toLowerCase() === fileNameLower,
	);
	if (byName) return byName;
	const partial = paths.find((p) =>
		p.toLowerCase().includes(fileNameLower),
	);
	if (partial) return partial;
	return null;
}

export { useProjectStore, getMessages, t, normalizeError };
