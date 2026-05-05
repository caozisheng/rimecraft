import {
	ToolRegistry,
	type AgentTool,
} from "@rimecraft/agent-engine";
import type { ProjectManager } from "./project-manager";
import type { PreviewManager } from "./preview-manager";
import type { CommandManager, Command } from "./command-manager";
import { useProjectStore } from "@/stores/project-store";
import { useGameStore } from "@/stores/game-store";

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
		const tools = this.createGameTools();
		for (const tool of tools) {
			ToolRegistry.register(tool);
		}
	}

	private createGameTools(): AgentTool[] {
		const pm = () => this.projectManager;
		const preview = () => this.previewManager;
		const cmd = () => this.commandManager;

		return [
			{
				name: "list_files",
				description: "列出项目中的所有文件和目录结构",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "可选的子目录路径前缀，用于过滤",
						},
					},
				},
				async execute(args) {
					try {
						const projectId =
							useProjectStore.getState().currentProject?.id;
						if (!projectId)
							return {
								success: false,
								message: "没有打开的项目",
							};

						const storage = pm().getStorage();
						const files = await storage.listFiles(projectId);
						const prefix = (args.path as string) || "";
						const filtered = prefix
							? files.filter((f) => f.path.startsWith(prefix))
							: files;

						const fileList = filtered
							.map((f) => f.path)
							.sort()
							.join("\n");
						return {
							success: true,
							message: `项目包含 ${filtered.length} 个文件:\n${fileList}`,
							data: {
								files: filtered.map((f) => f.path),
								count: filtered.length,
							},
						};
					} catch (e) {
						return {
							success: false,
							message: `列出文件失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "read_file",
				description: "读取项目中指定文件的内容",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "文件路径，如 src/scenes/game-scene.ts",
						},
					},
					required: ["path"],
				},
				async execute(args) {
					try {
						const path = args.path as string;
						const content = await pm().readFile(path);
						return {
							success: true,
							message: `文件 ${path} 内容:\n${content}`,
							data: { path, content },
						};
					} catch (e) {
						return {
							success: false,
							message: `读取文件失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "write_file",
				description:
					"写入或覆盖文件内容。这是修改游戏代码的主要工具。写入后会自动触发重新编译和预览刷新。",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "文件路径，如 src/scenes/game-scene.ts",
						},
						content: {
							type: "string",
							description: "完整的文件内容",
						},
					},
					required: ["path", "content"],
				},
				async execute(args) {
					try {
						const path = args.path as string;
						const content = args.content as string;

						let oldContent: string | null = null;
						try {
							oldContent = await pm().readFile(path);
						} catch {
							// New file
						}

						const writeCmd: Command = {
							id: `write_${Date.now()}`,
							name: `write_file: ${path}`,
							async execute() {
								await pm().writeFile(path, content);
								const projectId =
									useProjectStore.getState().currentProject
										?.id;
								if (projectId) {
									const files =
										await pm()
											.getStorage()
											.listFiles(projectId);
									useProjectStore
										.getState()
										.setFiles(
											files.map((f) => ({
												path: f.path,
												type: "file" as const,
											})),
										);
								}
							},
							async undo() {
								if (oldContent !== null) {
									await pm().writeFile(path, oldContent);
								} else {
									await pm().deleteFile(path);
								}
								const projectId =
									useProjectStore.getState().currentProject
										?.id;
								if (projectId) {
									const files =
										await pm()
											.getStorage()
											.listFiles(projectId);
									useProjectStore
										.getState()
										.setFiles(
											files.map((f) => ({
												path: f.path,
												type: "file" as const,
											})),
										);
								}
							},
						};

						await cmd().execute(writeCmd);
						preview().requestCompilation();

						return {
							success: true,
							message: `成功写入文件: ${path}`,
							undoable: true,
						};
					} catch (e) {
						return {
							success: false,
							message: `写入文件失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "delete_file",
				description: "删除项目中的指定文件",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "要删除的文件路径",
						},
					},
					required: ["path"],
				},
				async execute(args) {
					try {
						const path = args.path as string;
						const oldContent = await pm().readFile(path);

						const deleteCmd: Command = {
							id: `delete_${Date.now()}`,
							name: `delete_file: ${path}`,
							async execute() {
								await pm().deleteFile(path);
								const projectId =
									useProjectStore.getState().currentProject
										?.id;
								if (projectId) {
									const files =
										await pm()
											.getStorage()
											.listFiles(projectId);
									useProjectStore
										.getState()
										.setFiles(
											files.map((f) => ({
												path: f.path,
												type: "file" as const,
											})),
										);
								}
							},
							async undo() {
								await pm().writeFile(path, oldContent);
								const projectId =
									useProjectStore.getState().currentProject
										?.id;
								if (projectId) {
									const files =
										await pm()
											.getStorage()
											.listFiles(projectId);
									useProjectStore
										.getState()
										.setFiles(
											files.map((f) => ({
												path: f.path,
												type: "file" as const,
											})),
										);
								}
							},
						};

						await cmd().execute(deleteCmd);
						preview().requestCompilation();

						return {
							success: true,
							message: `成功删除文件: ${path}`,
							undoable: true,
						};
					} catch (e) {
						return {
							success: false,
							message: `删除文件失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "create_scene",
				description:
					"创建新的 Phaser 场景文件，自动生成带有 preload/create/update 方法的骨架代码",
				parameters: {
					type: "object",
					properties: {
						name: {
							type: "string",
							description:
								"场景名称（英文，如 GameScene, BossScene）",
						},
						type: {
							type: "string",
							enum: ["menu", "game", "ui", "gameover", "custom"],
							description: "场景类型，影响生成的骨架代码",
						},
					},
					required: ["name"],
				},
				async execute(args) {
					try {
						const name = args.name as string;
						const type = (args.type as string) || "game";
						const className =
							name.charAt(0).toUpperCase() + name.slice(1);
						const sceneKey = className;
						const fileName = name
							.replace(/([A-Z])/g, "-$1")
							.toLowerCase()
							.replace(/^-/, "");
						const filePath = `src/scenes/${fileName}.ts`;

						const content = generateSceneTemplate(
							className,
							sceneKey,
							type,
						);

						const writeCmd: Command = {
							id: `create_scene_${Date.now()}`,
							name: `create_scene: ${className}`,
							async execute() {
								await pm().writeFile(filePath, content);
								const projectId =
									useProjectStore.getState().currentProject
										?.id;
								if (projectId) {
									const files =
										await pm()
											.getStorage()
											.listFiles(projectId);
									useProjectStore
										.getState()
										.setFiles(
											files.map((f) => ({
												path: f.path,
												type: "file" as const,
											})),
										);
								}
							},
							async undo() {
								await pm().deleteFile(filePath);
								const projectId =
									useProjectStore.getState().currentProject
										?.id;
								if (projectId) {
									const files =
										await pm()
											.getStorage()
											.listFiles(projectId);
									useProjectStore
										.getState()
										.setFiles(
											files.map((f) => ({
												path: f.path,
												type: "file" as const,
											})),
										);
								}
							},
						};

						await cmd().execute(writeCmd);

						return {
							success: true,
							message: `成功创建场景 ${className} (${filePath})。注意：你还需要在 src/main.ts 中导入并注册此场景。`,
							undoable: true,
							data: { path: filePath, className, sceneKey },
						};
					} catch (e) {
						return {
							success: false,
							message: `创建场景失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "restart_preview",
				description: "重新编译项目代码并重启游戏预览",
				parameters: {
					type: "object",
					properties: {
						sceneId: {
							type: "string",
							description: "指定启动场景（可选）",
						},
					},
				},
				async execute() {
					try {
						preview().requestCompilation();
						return {
							success: true,
							message: "游戏预览正在重新编译和重启...",
						};
					} catch (e) {
						return {
							success: false,
							message: `重启预览失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "get_game_state",
				description:
					"获取当前游戏运行时状态，包括 FPS、错误日志等信息",
				parameters: {
					type: "object",
					properties: {},
				},
				async execute() {
					const gameState = useGameStore.getState();
					const projectState = useProjectStore.getState();
					const files = projectState.files.map((f) => f.path);
					const errors = gameState.errors.slice(-5);

					return {
						success: true,
						message: [
							`游戏状态:`,
							`- 运行中: ${gameState.isRunning ? "是" : "否"}`,
							`- FPS: ${gameState.fps}`,
							`- 当前场景: ${gameState.activeSceneId ?? "无"}`,
							`- 文件数: ${files.length}`,
							errors.length > 0
								? `- 最近错误:\n${errors.map((e) => `  · ${e}`).join("\n")}`
								: "- 无错误",
						].join("\n"),
						data: {
							fps: gameState.fps,
							isRunning: gameState.isRunning,
							activeSceneId: gameState.activeSceneId,
							objectCount: gameState.objectCount,
							errors,
							files,
						},
					};
				},
			},
			{
				name: "undo",
				description: "撤销上一步操作",
				parameters: { type: "object", properties: {} },
				async execute() {
					const success = await cmd().undo();
					if (success) {
						preview().requestCompilation();
						return { success: true, message: "已撤销上一步操作" };
					}
					return {
						success: false,
						message: "没有可撤销的操作",
					};
				},
			},
			{
				name: "redo",
				description: "重做上一步被撤销的操作",
				parameters: { type: "object", properties: {} },
				async execute() {
					const success = await cmd().redo();
					if (success) {
						preview().requestCompilation();
						return { success: true, message: "已重做操作" };
					}
					return {
						success: false,
						message: "没有可重做的操作",
					};
				},
			},
		];
	}

	dispose(): void {
		ToolRegistry.clear();
		this.initialized = false;
	}
}

function generateSceneTemplate(
	className: string,
	sceneKey: string,
	type: string,
): string {
	switch (type) {
		case "menu":
			return `import Phaser from "phaser";

export class ${className} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	create() {
		const { width, height } = this.scale;

		this.add
			.text(width / 2, height / 3, "游戏标题", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const startBtn = this.add
			.text(width / 2, height * 0.6, "开始游戏", {
				fontSize: "28px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		startBtn.on("pointerdown", () => {
			this.scene.start("GameScene");
		});

		startBtn.on("pointerover", () => startBtn.setColor("#22c55e"));
		startBtn.on("pointerout", () => startBtn.setColor("#06b6d4"));
	}
}
`;
		case "gameover":
			return `import Phaser from "phaser";

export class ${className} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	create() {
		const { width, height } = this.scale;

		this.add
			.text(width / 2, height / 3, "游戏结束", {
				fontSize: "48px",
				color: "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const retryBtn = this.add
			.text(width / 2, height * 0.6, "再来一次", {
				fontSize: "28px",
				color: "#06b6d4",
				fontFamily: "Arial",
			})
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true });

		retryBtn.on("pointerdown", () => {
			this.scene.start("GameScene");
		});

		retryBtn.on("pointerover", () => retryBtn.setColor("#22c55e"));
		retryBtn.on("pointerout", () => retryBtn.setColor("#06b6d4"));
	}
}
`;
		case "ui":
			return `import Phaser from "phaser";

export class ${className} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	create() {
		// UI 场景通常叠加在游戏场景上方
		// 用于显示分数、血条、按钮等 UI 元素
	}

	update() {
		// 在这里更新 UI 状态
	}
}
`;
		default:
			return `import Phaser from "phaser";

export class ${className} extends Phaser.Scene {
	constructor() {
		super("${sceneKey}");
	}

	preload() {
		// 在这里加载游戏资源
		// this.load.image("key", "assets/images/image.png");
	}

	create() {
		// 在这里创建游戏对象
	}

	update() {
		// 在这里编写每帧更新的游戏逻辑
	}
}
`;
	}
}
