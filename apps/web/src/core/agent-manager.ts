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

		const refreshFileList = async () => {
			const projectId = useProjectStore.getState().currentProject?.id;
			if (projectId) {
				const files = await pm().getStorage().listFiles(projectId);
				useProjectStore
					.getState()
					.setFiles(files.map((f) => ({ path: f.path, type: "file" as const })));
			}
		};

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
								await refreshFileList();
							},
							async undo() {
								if (oldContent !== null) {
									await pm().writeFile(path, oldContent);
								} else {
									await pm().deleteFile(path);
								}
								await refreshFileList();
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
								await refreshFileList();
							},
							async undo() {
								await pm().writeFile(path, oldContent);
								await refreshFileList();
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
								await refreshFileList();
							},
							async undo() {
								await pm().deleteFile(filePath);
								await refreshFileList();
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
			{
				name: "undo_all",
				description: "撤销当前对话中 Agent 的所有文件操作，回到对话开始前的状态",
				parameters: { type: "object", properties: {} },
				async execute() {
					try {
						const checkpoint = cmd().getCheckpoint();
						if (checkpoint <= 0) {
							return { success: false, message: "没有可撤销的操作" };
						}
						await cmd().undoToCheckpoint(0);
						preview().requestCompilation();
						return {
							success: true,
							message: `已撤销所有操作，回到初始状态`,
						};
					} catch (e) {
						return {
							success: false,
							message: `撤销失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "rename_file",
				description: "重命名或移动文件到新路径",
				parameters: {
					type: "object",
					properties: {
						oldPath: {
							type: "string",
							description: "原文件路径，如 src/scenes/old-name.ts",
						},
						newPath: {
							type: "string",
							description: "新文件路径，如 src/scenes/new-name.ts",
						},
					},
					required: ["oldPath", "newPath"],
				},
				async execute(args) {
					try {
						const oldPath = args.oldPath as string;
						const newPath = args.newPath as string;
						const content = await pm().readFile(oldPath);

						const renameCmd: Command = {
							id: `rename_${Date.now()}`,
							name: `rename_file: ${oldPath} → ${newPath}`,
							async execute() {
								await pm().writeFile(newPath, content);
								await pm().deleteFile(oldPath);
								await refreshFileList();
							},
							async undo() {
								await pm().writeFile(oldPath, content);
								await pm().deleteFile(newPath);
								await refreshFileList();
							},
						};

						await cmd().execute(renameCmd);
						preview().requestCompilation();

						return {
							success: true,
							message: `成功重命名: ${oldPath} → ${newPath}`,
							undoable: true,
						};
					} catch (e) {
						return {
							success: false,
							message: `重命名文件失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "patch_file",
				description: "对文件进行局部修改：搜索指定内容并替换为新内容。适用于小范围修改，无需重写整个文件。",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "文件路径",
						},
						search: {
							type: "string",
							description: "要搜索的原始内容（精确匹配）",
						},
						replace: {
							type: "string",
							description: "替换后的新内容",
						},
					},
					required: ["path", "search", "replace"],
				},
				async execute(args) {
					try {
						const path = args.path as string;
						const search = args.search as string;
						const replace = args.replace as string;

						const oldContent = await pm().readFile(path);
						if (!oldContent.includes(search)) {
							return {
								success: false,
								message: `在 ${path} 中找不到要替换的内容。请确认搜索内容完全匹配。`,
							};
						}

						const newContent = oldContent.replace(search, replace);

						const patchCmd: Command = {
							id: `patch_${Date.now()}`,
							name: `patch_file: ${path}`,
							async execute() {
								await pm().writeFile(path, newContent);
							},
							async undo() {
								await pm().writeFile(path, oldContent);
							},
						};

						await cmd().execute(patchCmd);
						preview().requestCompilation();

						return {
							success: true,
							message: `成功修改文件: ${path}`,
							undoable: true,
						};
					} catch (e) {
						return {
							success: false,
							message: `修改文件失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "get_project_structure",
				description: "获取项目的完整目录结构，包含文件大小信息",
				parameters: { type: "object", properties: {} },
				async execute() {
					try {
						const projectId =
							useProjectStore.getState().currentProject?.id;
						if (!projectId)
							return { success: false, message: "没有打开的项目" };

						const storage = pm().getStorage();
						const files = await storage.listFiles(projectId);
						const sorted = [...files].sort((a, b) =>
							a.path.localeCompare(b.path),
						);

						const tree: string[] = [];
						for (const f of sorted) {
							const depth = f.path.split("/").length - 1;
							const indent = "  ".repeat(depth);
							const name = f.path.split("/").pop() ?? f.path;
							tree.push(`${indent}${name}`);
						}

						return {
							success: true,
							message: `项目结构 (${files.length} 个文件):\n${tree.join("\n")}`,
							data: { files: sorted.map((f) => f.path), count: files.length },
						};
					} catch (e) {
						return {
							success: false,
							message: `获取项目结构失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "search_in_files",
				description: "在项目文件中搜索包含指定关键词的代码行",
				parameters: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description: "要搜索的关键词或文本",
						},
						filePattern: {
							type: "string",
							description: "文件后缀过滤，如 .ts（可选，默认搜索所有文件）",
						},
					},
					required: ["query"],
				},
				async execute(args) {
					try {
						const query = args.query as string;
						const filePattern = (args.filePattern as string) || "";
						const projectId =
							useProjectStore.getState().currentProject?.id;
						if (!projectId)
							return { success: false, message: "没有打开的项目" };

						const storage = pm().getStorage();
						const files = await storage.listFiles(projectId);
						const filtered = filePattern
							? files.filter((f) => f.path.endsWith(filePattern))
							: files;

						const results: string[] = [];
						for (const f of filtered) {
							try {
								const content = await storage.readFile(
									projectId,
									f.path,
								);
								const lines = content.split("\n");
								for (let i = 0; i < lines.length; i++) {
									if (lines[i].includes(query)) {
										results.push(
											`${f.path}:${i + 1}: ${lines[i].trim()}`,
										);
									}
								}
							} catch {
								// skip unreadable files
							}
						}

						if (results.length === 0) {
							return {
								success: true,
								message: `没有找到包含 "${query}" 的代码`,
							};
						}

						const limited = results.slice(0, 50);
						return {
							success: true,
							message: `找到 ${results.length} 处匹配:\n${limited.join("\n")}${results.length > 50 ? `\n... 还有 ${results.length - 50} 处` : ""}`,
							data: { matches: limited, total: results.length },
						};
					} catch (e) {
						return {
							success: false,
							message: `搜索失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "get_runtime_errors",
				description: "获取游戏运行时的错误日志，用于诊断和修复问题",
				parameters: { type: "object", properties: {} },
				async execute() {
					const gameState = useGameStore.getState();
					const errors = gameState.errors;

					if (errors.length === 0) {
						return {
							success: true,
							message: "没有运行时错误",
							data: { errors: [], count: 0 },
						};
					}

					return {
						success: true,
						message: `运行时错误 (${errors.length}):\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`,
						data: { errors, count: errors.length },
					};
				},
			},
			{
				name: "set_game_config",
				description: "修改游戏配置，如画布尺寸、背景颜色、物理引擎设置等。会自动更新 src/main.ts 中的配置。",
				parameters: {
					type: "object",
					properties: {
						width: {
							type: "number",
							description: "游戏画布宽度（像素）",
						},
						height: {
							type: "number",
							description: "游戏画布高度（像素）",
						},
						backgroundColor: {
							type: "string",
							description: "背景颜色（十六进制，如 #1a1a2e）",
						},
						gravity: {
							type: "number",
							description: "重力值（Y轴，如 300 表示向下的重力）",
						},
						debug: {
							type: "boolean",
							description: "是否开启物理调试模式",
						},
					},
				},
				async execute(args) {
					try {
						let mainContent: string;
						try {
							mainContent = await pm().readFile("src/main.ts");
						} catch {
							return {
								success: false,
								message: "找不到 src/main.ts，请先创建主文件",
							};
						}

						const oldContent = mainContent;
						const changes: string[] = [];

						if (args.width !== undefined || args.height !== undefined) {
							const w = (args.width as number) ?? 800;
							const h = (args.height as number) ?? 600;
							mainContent = mainContent.replace(
								/width:\s*\d+/,
								`width: ${w}`,
							);
							mainContent = mainContent.replace(
								/height:\s*\d+/,
								`height: ${h}`,
							);
							changes.push(`尺寸: ${w}x${h}`);
						}

						if (args.backgroundColor) {
							const bg = args.backgroundColor as string;
							mainContent = mainContent.replace(
								/backgroundColor:\s*["']#?[0-9a-fA-F]+["']/,
								`backgroundColor: "${bg}"`,
							);
							changes.push(`背景色: ${bg}`);
						}

						if (args.gravity !== undefined) {
							const g = args.gravity as number;
							mainContent = mainContent.replace(
								/gravity:\s*\{[^}]*\}/,
								`gravity: { x: 0, y: ${g} }`,
							);
							changes.push(`重力: ${g}`);
						}

						if (args.debug !== undefined) {
							const d = args.debug as boolean;
							mainContent = mainContent.replace(
								/debug:\s*(true|false)/,
								`debug: ${d}`,
							);
							changes.push(`调试模式: ${d ? "开" : "关"}`);
						}

						if (mainContent === oldContent) {
							return {
								success: true,
								message: "配置未发生变化",
							};
						}

						const configCmd: Command = {
							id: `config_${Date.now()}`,
							name: "set_game_config",
							async execute() {
								await pm().writeFile("src/main.ts", mainContent);
							},
							async undo() {
								await pm().writeFile("src/main.ts", oldContent);
							},
						};

						await cmd().execute(configCmd);
						preview().requestCompilation();

						return {
							success: true,
							message: `已更新游戏配置: ${changes.join(", ")}`,
							undoable: true,
						};
					} catch (e) {
						return {
							success: false,
							message: `修改配置失败: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
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
