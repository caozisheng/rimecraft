import { ProjectManager } from "./project-manager";
import { PreviewManager } from "./preview-manager";
import { CommandManager } from "./command-manager";
import { AgentManager } from "./agent-manager";

class EditorCore {
	private static instance: EditorCore | null = null;

	readonly project: ProjectManager;
	readonly preview: PreviewManager;
	readonly command: CommandManager;
	readonly agent: AgentManager;

	private constructor() {
		this.command = new CommandManager();
		this.project = new ProjectManager();
		this.preview = new PreviewManager();
		this.agent = new AgentManager();
	}

	static getInstance(): EditorCore {
		if (!EditorCore.instance) {
			EditorCore.instance = new EditorCore();
		}
		return EditorCore.instance;
	}

	dispose(): void {
		this.preview.dispose();
		this.agent.dispose();
		EditorCore.instance = null;
	}
}

export function getEditorCore(): EditorCore {
	return EditorCore.getInstance();
}

export { EditorCore };
