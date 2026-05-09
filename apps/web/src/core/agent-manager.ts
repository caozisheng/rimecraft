import { ToolRegistry } from "@rimecraft/agent-engine";
import type { ProjectManager } from "./project-manager";
import type { PreviewManager } from "./preview-manager";
import type { CommandManager } from "./command-manager";
import {
	createFileTools,
	createSceneTools,
	createAssetTools,
	createConfigTools,
	createUtilityTools,
	type ToolContext,
} from "./tools";

export class AgentManager {
	private initialized = false;
	private projectManager!: ProjectManager;
	private previewManager!: PreviewManager;
	private commandManager!: CommandManager;

	setManagers(
		project: ProjectManager,
		preview: PreviewManager,
		command: CommandManager,
	): void {
		this.projectManager = project;
		this.previewManager = preview;
		this.commandManager = command;
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;
		await this.registerTools();
		this.initialized = true;
	}

	private async registerTools(): Promise<void> {
		const ctx: ToolContext = {
			pm: () => this.projectManager,
			preview: () => this.previewManager,
			cmd: () => this.commandManager,
		};

		const tools = [
			...createFileTools(ctx),
			...createSceneTools(ctx),
			...createAssetTools(ctx),
			...createConfigTools(ctx),
			...createUtilityTools(ctx),
		];

		for (const tool of tools) {
			ToolRegistry.register(tool);
		}
	}

	dispose(): void {
		ToolRegistry.clear();
		this.initialized = false;
	}
}
