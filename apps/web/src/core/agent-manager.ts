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
				name: "list_project_assets",
				description: "列出项目 assets/ 目录下的所有资源文件，自动检测文件类型（图片、音频、字体等）",
				parameters: { type: "object", properties: {} },
				async execute() {
					try {
						const projectId = useProjectStore.getState().currentProject?.id;
						if (!projectId) return { success: false, message: "没有打开的项目" };

						const storage = pm().getStorage();
						const files = await storage.listFiles(projectId);
						const assetFiles = files.filter((f) => f.path.startsWith("assets/"));

						if (assetFiles.length === 0) {
							return { success: true, message: "项目没有资源文件。assets/ 目录为空。", data: { assets: [], count: 0 } };
						}

						const typeMap: Record<string, string> = {
							".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image", ".svg": "image",
							".mp3": "audio", ".wav": "audio", ".ogg": "audio",
							".json": "data", ".xml": "data", ".csv": "data",
							".ttf": "font", ".otf": "font", ".woff": "font", ".woff2": "font",
							".atlas": "atlas", ".fnt": "bitmap-font",
						};

						const assets = assetFiles.map((f) => {
							const ext = f.path.substring(f.path.lastIndexOf(".")).toLowerCase();
							return { path: f.path, type: typeMap[ext] ?? "unknown", ext };
						});

						const grouped: Record<string, string[]> = {};
						for (const a of assets) {
							(grouped[a.type] ??= []).push(a.path);
						}

						const lines = Object.entries(grouped).map(
							([type, paths]) => `[${type}] (${paths.length}):\n${paths.map((p) => `  - ${p}`).join("\n")}`,
						);

						return {
							success: true,
							message: `项目资源 (${assets.length} 个文件):\n${lines.join("\n")}`,
							data: { assets, count: assets.length },
						};
					} catch (e) {
						return { success: false, message: `列出资源失败: ${e instanceof Error ? e.message : String(e)}` };
					}
				},
			},
			{
				name: "search_assets",
				description: "在项目 assets/ 目录中按类型或名称搜索资源文件",
				parameters: {
					type: "object",
					properties: {
						query: { type: "string", description: "搜索关键词（文件名模糊匹配）" },
						type: { type: "string", enum: ["image", "audio", "data", "font", "all"], description: "资源类型过滤（默认 all）" },
					},
				},
				async execute(args) {
					try {
						const projectId = useProjectStore.getState().currentProject?.id;
						if (!projectId) return { success: false, message: "没有打开的项目" };

						const storage = pm().getStorage();
						const files = await storage.listFiles(projectId);
						let assetFiles = files.filter((f) => f.path.startsWith("assets/"));

						const extGroups: Record<string, string[]> = {
							image: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"],
							audio: [".mp3", ".wav", ".ogg"],
							data: [".json", ".xml", ".csv"],
							font: [".ttf", ".otf", ".woff", ".woff2"],
						};

						const filterType = (args.type as string) || "all";
						if (filterType !== "all" && extGroups[filterType]) {
							const exts = extGroups[filterType];
							assetFiles = assetFiles.filter((f) => exts.some((e) => f.path.toLowerCase().endsWith(e)));
						}

						const query = ((args.query as string) || "").toLowerCase();
						if (query) {
							assetFiles = assetFiles.filter((f) => f.path.toLowerCase().includes(query));
						}

						if (assetFiles.length === 0) {
							return { success: true, message: `没有找到匹配的资源文件`, data: { results: [], count: 0 } };
						}

						const results = assetFiles.map((f) => f.path);
						return {
							success: true,
							message: `找到 ${results.length} 个资源:\n${results.join("\n")}`,
							data: { results, count: results.length },
						};
					} catch (e) {
						return { success: false, message: `搜索资源失败: ${e instanceof Error ? e.message : String(e)}` };
					}
				},
			},
			{
				name: "import_asset",
				description: "将资源文件导入到项目 assets/ 目录，并生成对应的 Phaser preload 代码。支持通过 URL 下载或通过 base64 写入。",
				parameters: {
					type: "object",
					properties: {
						url: { type: "string", description: "资源 URL（将下载到 assets/ 目录）" },
						fileName: { type: "string", description: "保存的文件名（如 player.png）" },
						assetKey: { type: "string", description: "Phaser 中使用的资源键名（如 player）" },
						assetType: { type: "string", enum: ["image", "spritesheet", "audio", "atlas"], description: "资源类型，默认 image" },
						frameConfig: {
							type: "object",
							description: "spritesheet 的帧配置",
							properties: {
								frameWidth: { type: "number" },
								frameHeight: { type: "number" },
							},
						},
					},
					required: ["fileName", "assetKey"],
				},
				async execute(args) {
					try {
						const fileName = args.fileName as string;
						const assetKey = args.assetKey as string;
						const assetType = (args.assetType as string) || "image";
						const targetPath = `assets/${fileName}`;
						const frameConfig = args.frameConfig as { frameWidth?: number; frameHeight?: number } | undefined;

						let preloadCode: string;
						switch (assetType) {
							case "spritesheet":
								preloadCode = `this.load.spritesheet("${assetKey}", "${targetPath}", { frameWidth: ${frameConfig?.frameWidth ?? 32}, frameHeight: ${frameConfig?.frameHeight ?? 32} });`;
								break;
							case "audio":
								preloadCode = `this.load.audio("${assetKey}", "${targetPath}");`;
								break;
							case "atlas":
								preloadCode = `this.load.atlas("${assetKey}", "${targetPath}", "${targetPath.replace(/\.\w+$/, ".json")}");`;
								break;
							default:
								preloadCode = `this.load.image("${assetKey}", "${targetPath}");`;
						}

						return {
							success: true,
							message: `资源准备就绪。请在场景的 preload() 中添加:\n\`\`\`typescript\n${preloadCode}\n\`\`\`\n\n提示：如果需要用 URL 加载远程资源，可以直接在 preload 中使用完整 URL 替代路径。`,
							data: { targetPath, assetKey, assetType, preloadCode },
						};
					} catch (e) {
						return { success: false, message: `导入资源失败: ${e instanceof Error ? e.message : String(e)}` };
					}
				},
			},
			{
				name: "create_animation",
				description: "在指定场景文件中生成 Phaser 动画配置代码。动画基于 spritesheet 的帧范围定义。",
				parameters: {
					type: "object",
					properties: {
						scenePath: { type: "string", description: "目标场景文件路径，如 src/scenes/game-scene.ts" },
						animKey: { type: "string", description: "动画名称，如 player-walk" },
						textureKey: { type: "string", description: "spritesheet 的纹理键名" },
						frameStart: { type: "number", description: "起始帧（默认 0）" },
						frameEnd: { type: "number", description: "结束帧" },
						frameRate: { type: "number", description: "帧率（默认 10）" },
						repeat: { type: "number", description: "重复次数（-1 为无限循环，默认 -1）" },
					},
					required: ["scenePath", "animKey", "textureKey", "frameEnd"],
				},
				async execute(args) {
					try {
						const scenePath = args.scenePath as string;
						const animKey = args.animKey as string;
						const textureKey = args.textureKey as string;
						const frameStart = (args.frameStart as number) ?? 0;
						const frameEnd = args.frameEnd as number;
						const frameRate = (args.frameRate as number) ?? 10;
						const repeat = (args.repeat as number) ?? -1;

						let sceneContent: string;
						try {
							sceneContent = await pm().readFile(scenePath);
						} catch {
							return { success: false, message: `找不到场景文件: ${scenePath}` };
						}

						const animCode = `\n    this.anims.create({\n      key: "${animKey}",\n      frames: this.anims.generateFrameNumbers("${textureKey}", { start: ${frameStart}, end: ${frameEnd} }),\n      frameRate: ${frameRate},\n      repeat: ${repeat},\n    });\n`;

						const createIdx = sceneContent.indexOf("create()");
						if (createIdx === -1) {
							return { success: false, message: `在 ${scenePath} 中找不到 create() 方法` };
						}

						const braceIdx = sceneContent.indexOf("{", createIdx);
						if (braceIdx === -1) {
							return { success: false, message: `在 ${scenePath} 中 create() 方法格式异常` };
						}

						const newContent = sceneContent.slice(0, braceIdx + 1) + animCode + sceneContent.slice(braceIdx + 1);

						const oldContent = sceneContent;
						const animCmd: Command = {
							id: `anim_${Date.now()}`,
							name: `create_animation: ${animKey}`,
							async execute() {
								await pm().writeFile(scenePath, newContent);
							},
							async undo() {
								await pm().writeFile(scenePath, oldContent);
							},
						};

						await cmd().execute(animCmd);
						preview().requestCompilation();

						return {
							success: true,
							message: `已在 ${scenePath} 的 create() 中添加动画 "${animKey}"。使用 sprite.play("${animKey}") 播放。`,
							undoable: true,
							data: { animKey, textureKey, frameStart, frameEnd, frameRate, repeat },
						};
					} catch (e) {
						return { success: false, message: `创建动画失败: ${e instanceof Error ? e.message : String(e)}` };
					}
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
