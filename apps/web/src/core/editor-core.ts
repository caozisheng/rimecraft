import { ProjectManager } from "./project-manager";
import { PreviewManager } from "./preview-manager";
import { CommandManager } from "./command-manager";
import { AgentManager } from "./agent-manager";

export interface EditorCoreDeps {
	project?: ProjectManager;
	preview?: PreviewManager;
	command?: CommandManager;
	agent?: AgentManager;
}

class EditorCore {
	private static instance: EditorCore | null = null;

	readonly project: ProjectManager;
	readonly preview: PreviewManager;
	readonly command: CommandManager;
	readonly agent: AgentManager;

	private constructor(deps?: EditorCoreDeps) {
		this.command = deps?.command ?? new CommandManager();
		this.project = deps?.project ?? new ProjectManager();
		this.preview = deps?.preview ?? new PreviewManager(this.project);
		this.agent = deps?.agent ?? new AgentManager();
		this.agent.setManagers(this.project, this.preview, this.command);
	}

	static getInstance(deps?: EditorCoreDeps): EditorCore {
		if (!EditorCore.instance) {
			EditorCore.instance = new EditorCore(deps);
		}
		return EditorCore.instance;
	}

	static resetForTesting(deps?: EditorCoreDeps): EditorCore {
		EditorCore.instance?.dispose();
		EditorCore.instance = new EditorCore(deps);
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
