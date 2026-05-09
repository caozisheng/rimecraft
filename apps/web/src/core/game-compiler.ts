import type { StorageProvider } from "@/lib/storage/types";
import { useProjectStore } from "@/stores/project-store";
import { bundleProject } from "./compiler/bundler";
import { generateSandboxHtml } from "./compiler/sandbox-generator";

export class GameCompiler {
	private getStorage: () => StorageProvider;

	constructor(getStorage: () => StorageProvider) {
		this.getStorage = getStorage;
	}

	async compile(): Promise<string> {
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");

		const storage = this.getStorage();
		const files = await storage.listFiles(projectId);
		const tsFiles = files.filter(
			(f) => f.path.endsWith(".ts") && f.path.startsWith("src/"),
		);

		const sources: Record<string, string> = {};
		for (const file of tsFiles) {
			const content = await storage.readFile(projectId, file.path);
			sources[file.path] = content;
		}

		const bundledJs = bundleProject(sources);
		return generateSandboxHtml(bundledJs);
	}
}
