import {
	ToolRegistry,
	type AgentTool,
} from "@rimecraft/agent-engine";
import type { ProjectManager } from "./project-manager";
import type { PreviewManager } from "./preview-manager";
import type { CommandManager, Command } from "./command-manager";
import { useProjectStore } from "@/stores/project-store";
import { useGameStore } from "@/stores/game-store";
import { ASSET_CATALOG, searchCatalog } from "@/lib/assets/asset-catalog";
import { assetRegistry } from "@/lib/assets/asset-registry";
import { getMessages, t } from "@/i18n";
import { sceneBridge } from "./scene-bridge";
import { useVisualEditorStore } from "@/stores/visual-editor-store";
import { generateObjectId } from "./scene-graph";
import type { SceneObject, SceneObjectBounds } from "./scene-graph";

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

		const resolveFilePath = async (input: string): Promise<string | null> => {
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
			const byName = paths.find((p) => (p.split("/").pop() ?? p).toLowerCase() === fileNameLower);
			if (byName) return byName;
			const partial = paths.find((p) => p.toLowerCase().includes(fileNameLower));
			if (partial) return partial;
			return null;
		};

		const dm = getMessages();

		return [
			{
				name: "list_files",
				description: dm.tools.listFiles.desc,
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: dm.tools.listFiles.pathDesc,
						},
					},
				},
				async execute(args) {
					try {
						const m = getMessages();
						const projectId =
							useProjectStore.getState().currentProject?.id;
						if (!projectId)
							return {
								success: false,
								message: m.agent.noProject,
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
							message: `${t(m.tools.projectHasFiles, { count: filtered.length })}:\n${fileList}`,
							data: {
								files: filtered.map((f) => f.path),
								count: filtered.length,
							},
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.listFilesFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "read_file",
				description: dm.tools.readFile.desc,
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: dm.tools.readFile.pathDesc,
						},
					},
					required: ["path"],
				},
				async execute(args) {
					try {
						const m = getMessages();
						const rawPath = args.path as string;
						const path = (await resolveFilePath(rawPath)) ?? rawPath;
						const content = await pm().readFile(path);
						return {
							success: true,
							message: `${t(m.tools.fileContent, { path })}:\n${content}`,
							data: { path, content },
						};
					} catch (e) {
						const m = getMessages();
						const path = args.path as string;
						const fileName = path.split("/").pop() ?? path;
						let suggestion = "";
						try {
							const projectId = useProjectStore.getState().currentProject?.id;
							if (projectId) {
								const files = await pm().getStorage().listFiles(projectId);
								const similar = files
									.filter((f) => f.path.includes(fileName.replace(/\.\w+$/, "")) || f.path.endsWith(fileName))
									.map((f) => f.path)
									.slice(0, 5);
								if (similar.length > 0) {
									suggestion = `\n\n${m.tools.readFileSuggestion}\n${similar.map((f) => `  - ${f}`).join("\n")}`;
								}
							}
						} catch { /* ignore */ }
						return {
							success: false,
							message: `${m.tools.readFileFailed}: ${e instanceof Error ? e.message : String(e)}${suggestion}`,
						};
					}
				},
			},
			{
				name: "write_file",
				description: dm.tools.writeFile.desc,
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: dm.tools.writeFile.pathDesc,
						},
						content: {
							type: "string",
							description: dm.tools.writeFile.contentDesc,
						},
					},
					required: ["path", "content"],
				},
				async execute(args) {
					try {
						const m = getMessages();
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
							message: t(m.tools.writeFileSuccess, { path }),
							undoable: true,
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.writeFileFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "delete_file",
				description: dm.tools.deleteFile.desc,
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: dm.tools.deleteFile.pathDesc,
						},
					},
					required: ["path"],
				},
				async execute(args) {
					try {
						const m = getMessages();
						const rawPath = args.path as string;
						const path = (await resolveFilePath(rawPath)) ?? rawPath;
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
							message: t(m.tools.deleteFileSuccess, { path }),
							undoable: true,
						};
					} catch (e) {
						const m = getMessages();
						const path = args.path as string;
						let suggestion = "";
						try {
							const projectId = useProjectStore.getState().currentProject?.id;
							if (projectId) {
								const files = await pm().getStorage().listFiles(projectId);
								const available = files.map((f) => f.path).slice(0, 10);
								suggestion = "\n\n" + m.tools.availableFiles + ":\n" + available.map((f) => `  - ${f}`).join("\n");
							}
						} catch { /* ignore */ }
						return {
							success: false,
							message: `${m.tools.deleteFileFailed}: ${e instanceof Error ? e.message : String(e)}${suggestion}`,
						};
					}
				},
			},
			{
				name: "create_scene",
				description: dm.tools.createScene.desc,
				parameters: {
					type: "object",
					properties: {
						name: {
							type: "string",
							description: dm.tools.createScene.nameDesc,
						},
						type: {
							type: "string",
							enum: ["menu", "game", "ui", "gameover", "custom"],
							description: dm.tools.createScene.typeDesc,
						},
					},
					required: ["name"],
				},
				async execute(args) {
					try {
						const m = getMessages();
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
							message: t(m.tools.createSceneSuccess, { className, path: filePath }),
							undoable: true,
							data: { path: filePath, className, sceneKey },
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.createSceneFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "restart_preview",
				description: dm.tools.restartPreview.desc,
				parameters: {
					type: "object",
					properties: {
						sceneId: {
							type: "string",
							description: dm.tools.restartPreview.sceneIdDesc,
						},
					},
				},
				async execute() {
					try {
						const m = getMessages();
						preview().requestCompilation();
						return {
							success: true,
							message: m.tools.restartPreviewSuccess,
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.restartPreviewFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "get_game_state",
				description: dm.tools.getGameState.desc,
				parameters: {
					type: "object",
					properties: {},
				},
				async execute() {
					const m = getMessages();
					const gameState = useGameStore.getState();
					const projectState = useProjectStore.getState();
					const files = projectState.files.map((f) => f.path);
					const errors = gameState.errors.slice(-5);

					return {
						success: true,
						message: [
							`${m.tools.gameState}:`,
							`- ${m.agent.running}: ${gameState.isRunning ? m.tools.gameRunning : m.tools.gameNotRunning}`,
							`- FPS: ${gameState.fps}`,
							`- ${m.tools.currentScene}: ${gameState.activeSceneId ?? m.tools.noScene}`,
							`- ${m.tools.fileCount}: ${files.length}`,
							errors.length > 0
								? `- ${m.agent.recentErrors}:\n${errors.map((e) => `  · ${e}`).join("\n")}`
								: `- ${m.tools.noErrors}`,
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
							message: `${m.tools.undoAllFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "rename_file",
				description: dm.tools.renameFile.desc,
				parameters: {
					type: "object",
					properties: {
						oldPath: {
							type: "string",
							description: dm.tools.renameFile.oldPathDesc,
						},
						newPath: {
							type: "string",
							description: dm.tools.renameFile.newPathDesc,
						},
					},
					required: ["oldPath", "newPath"],
				},
				async execute(args) {
					try {
						const m = getMessages();
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
							message: t(m.tools.renameSuccess, { oldPath, newPath }),
							undoable: true,
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.renameFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "patch_file",
				description: dm.tools.patchFile.desc,
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: dm.tools.patchFile.pathDesc,
						},
						search: {
							type: "string",
							description: dm.tools.patchFile.searchDesc,
						},
						replace: {
							type: "string",
							description: dm.tools.patchFile.replaceDesc,
						},
					},
					required: ["path", "search", "replace"],
				},
				async execute(args) {
					try {
						const m = getMessages();
						const rawPath = args.path as string;
						const path = (await resolveFilePath(rawPath)) ?? rawPath;
						const search = args.search as string;
						const replace = args.replace as string;

						const oldContent = await pm().readFile(path);
						if (!oldContent.includes(search)) {
							const lines = oldContent.split("\n");
							const searchFirstLine = search.split("\n")[0].trim();
							const candidates = lines
								.map((line, i) => ({ line: line.trim(), lineNum: i + 1 }))
								.filter((l) => l.line.includes(searchFirstLine.slice(0, 20)));
							const hint = candidates.length > 0
								? `\n\n${t(m.tools.patchHintLine, { lines: candidates.slice(0, 3).map((c) => c.lineNum).join(", ") })}`
								: `\n\n${m.tools.patchHintRead}`;
							return {
								success: false,
								message: `${t(m.tools.patchNotFound, { path })}${hint}`,
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
							message: t(m.tools.patchSuccess, { path }),
							undoable: true,
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.patchFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "get_project_structure",
				description: dm.tools.getProjectStructure.desc,
				parameters: { type: "object", properties: {} },
				async execute() {
					try {
						const m = getMessages();
						const projectId =
							useProjectStore.getState().currentProject?.id;
						if (!projectId)
							return { success: false, message: m.agent.noProject };

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
							message: `${t(m.tools.projectStructure, { count: files.length })}:\n${tree.join("\n")}`,
							data: { files: sorted.map((f) => f.path), count: files.length },
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.getStructureFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "search_in_files",
				description: dm.tools.searchInFiles.desc,
				parameters: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description: dm.tools.searchInFiles.queryDesc,
						},
						filePattern: {
							type: "string",
							description: dm.tools.searchInFiles.filePatternDesc,
						},
					},
					required: ["query"],
				},
				async execute(args) {
					try {
						const m = getMessages();
						const query = args.query as string;
						const filePattern = (args.filePattern as string) || "";
						const projectId =
							useProjectStore.getState().currentProject?.id;
						if (!projectId)
							return { success: false, message: m.agent.noProject };

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
								message: t(m.tools.noSearchResults, { query }),
							};
						}

						const limited = results.slice(0, 50);
						return {
							success: true,
							message: `${t(m.tools.searchResults, { count: results.length })}:\n${limited.join("\n")}${results.length > 50 ? `\n${t(m.tools.searchMore, { extra: results.length - 50 })}` : ""}`,
							data: { matches: limited, total: results.length },
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.searchFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "get_runtime_errors",
				description: dm.tools.getRuntimeErrors.desc,
				parameters: { type: "object", properties: {} },
				async execute() {
					const m = getMessages();
					const gameState = useGameStore.getState();
					const errors = gameState.errors;

					if (errors.length === 0) {
						return {
							success: true,
							message: m.tools.noRuntimeErrors,
							data: { errors: [], count: 0 },
						};
					}

					return {
						success: true,
						message: `${t(m.tools.runtimeErrorList, { count: errors.length })}:\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`,
						data: { errors, count: errors.length },
					};
				},
			},
			{
				name: "list_project_assets",
				description: dm.tools.listProjectAssets.desc,
				parameters: { type: "object", properties: {} },
				async execute() {
					try {
						const m = getMessages();
						const projectId = useProjectStore.getState().currentProject?.id;
						if (!projectId) return { success: false, message: m.agent.noProject };

						const storage = pm().getStorage();
						const files = await storage.listFiles(projectId);
						const assetFiles = files.filter((f) => f.path.startsWith("assets/"));

						if (assetFiles.length === 0) {
							return { success: true, message: m.tools.noProjectAssets, data: { assets: [], count: 0 } };
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
							message: `${t(m.tools.projectAssets, { count: assets.length })}:\n${lines.join("\n")}`,
							data: { assets, count: assets.length },
						};
					} catch (e) {
						const m = getMessages();
						return { success: false, message: `${m.tools.listAssetsFailed}: ${e instanceof Error ? e.message : String(e)}` };
					}
				},
			},
			{
				name: "search_assets",
				description: dm.tools.searchAssets.desc,
				parameters: {
					type: "object",
					properties: {
						query: { type: "string", description: dm.tools.searchAssets.queryDesc },
						type: { type: "string", enum: ["image", "audio", "data", "font", "all"], description: dm.tools.searchAssets.typeDesc },
					},
				},
				async execute(args) {
					try {
						const m = getMessages();
						const projectId = useProjectStore.getState().currentProject?.id;
						const query = ((args.query as string) || "").toLowerCase();
						const filterType = (args.type as string) || "all";
						const sections: string[] = [];

						const catalogResults = searchCatalog(query || "", filterType !== "all" ? filterType : undefined);
						if (catalogResults.length > 0) {
							const lines = catalogResults.map(
								(a) => `  - ${a.nameZh} (${a.name}) [${a.category}]\n    ${a.generatorCode.split("\n").join("\n    ")}`,
							);
							sections.push(`${t(m.tools.builtinAssets, { count: catalogResults.length })}:\n${lines.join("\n")}`);
						}

						if (projectId) {
							const storage = pm().getStorage();
							const files = await storage.listFiles(projectId);
							let assetFiles = files.filter((f) => f.path.startsWith("assets/"));

							const extGroups: Record<string, string[]> = {
								image: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"],
								audio: [".mp3", ".wav", ".ogg"],
								data: [".json", ".xml", ".csv"],
								font: [".ttf", ".otf", ".woff", ".woff2"],
							};

							if (filterType !== "all" && extGroups[filterType]) {
								const exts = extGroups[filterType];
								assetFiles = assetFiles.filter((f) => exts.some((e) => f.path.toLowerCase().endsWith(e)));
							}

							if (query) {
								assetFiles = assetFiles.filter((f) => f.path.toLowerCase().includes(query));
							}

							if (assetFiles.length > 0) {
								sections.push(`${t(m.tools.projectResources, { count: assetFiles.length })}:\n${assetFiles.map((f) => `  - ${f.path}`).join("\n")}`);
							}
						}

						if (sections.length === 0) {
							return { success: true, message: m.tools.noAssetResults, data: { results: [], catalogResults: [], count: 0 } };
						}

						return {
							success: true,
							message: sections.join("\n\n"),
							data: { catalogResults, count: catalogResults.length },
						};
					} catch (e) {
						const m = getMessages();
						return { success: false, message: `${m.tools.searchAssetsFailed}: ${e instanceof Error ? e.message : String(e)}` };
					}
				},
			},
			{
				name: "import_asset",
				description: dm.tools.importAsset.desc,
				parameters: {
					type: "object",
					properties: {
						url: { type: "string", description: "Resource URL" },
						fileName: { type: "string", description: "Save filename (e.g. player.png)" },
						assetKey: { type: "string", description: "Phaser asset key (e.g. player)" },
						assetType: { type: "string", enum: ["image", "spritesheet", "audio", "atlas"], description: "Asset type (default: image)" },
						frameConfig: {
							type: "object",
							description: "Spritesheet frame config",
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
						const m = getMessages();
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
							message: `${m.tools.assetReady}\n\`\`\`typescript\n${preloadCode}\n\`\`\``,
							data: { targetPath, assetKey, assetType, preloadCode },
						};
					} catch (e) {
						const m = getMessages();
						return { success: false, message: `${m.tools.importAssetFailed}: ${e instanceof Error ? e.message : String(e)}` };
					}
				},
			},
			{
				name: "create_animation",
				description: dm.tools.createAnimation.desc,
				parameters: {
					type: "object",
					properties: {
						scenePath: { type: "string", description: "Scene file path, e.g. src/scenes/game-scene.ts" },
						animKey: { type: "string", description: "Animation name, e.g. player-walk" },
						textureKey: { type: "string", description: "Spritesheet texture key" },
						frameStart: { type: "number", description: "Start frame (default 0)" },
						frameEnd: { type: "number", description: "End frame" },
						frameRate: { type: "number", description: "Frame rate (default 10)" },
						repeat: { type: "number", description: "Repeat count (-1 = infinite, default -1)" },
					},
					required: ["scenePath", "animKey", "textureKey", "frameEnd"],
				},
				async execute(args) {
					try {
						const m = getMessages();
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
							return { success: false, message: t(m.tools.sceneNotFound, { path: scenePath }) };
						}

						const animCode = `\n    this.anims.create({\n      key: "${animKey}",\n      frames: this.anims.generateFrameNumbers("${textureKey}", { start: ${frameStart}, end: ${frameEnd} }),\n      frameRate: ${frameRate},\n      repeat: ${repeat},\n    });\n`;

						const createIdx = sceneContent.indexOf("create()");
						if (createIdx === -1) {
							return { success: false, message: t(m.tools.createMethodNotFound, { path: scenePath }) };
						}

						const braceIdx = sceneContent.indexOf("{", createIdx);
						if (braceIdx === -1) {
							return { success: false, message: t(m.tools.createMethodBroken, { path: scenePath }) };
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
							message: t(m.tools.animCreated, { path: scenePath, key: animKey }),
							undoable: true,
							data: { animKey, textureKey, frameStart, frameEnd, frameRate, repeat },
						};
					} catch (e) {
						const m = getMessages();
						return { success: false, message: `${m.tools.animFailed}: ${e instanceof Error ? e.message : String(e)}` };
					}
				},
			},
			{
				name: "browse_asset_catalog",
				description: dm.tools.browseAssetCatalog.desc,
				parameters: {
					type: "object",
					properties: {
						category: {
							type: "string",
							enum: ["character", "environment", "ui", "effect", "item", "shape", "background", "particle", "all"],
							description: "Asset category (default: all)",
						},
					},
				},
				async execute(args) {
					const m = getMessages();
					const category = (args.category as string) || "all";
					const filtered = category === "all"
						? ASSET_CATALOG
						: ASSET_CATALOG.filter((a) => a.category === category);

					if (filtered.length === 0) {
						return { success: true, message: m.tools.noCatalogAssets };
					}

					const grouped: Record<string, typeof filtered> = {};
					for (const a of filtered) {
						(grouped[a.category] ??= []).push(a);
					}

					const catNames: Record<string, string> = {
						character: m.tools.catCharacter,
						environment: m.tools.catEnvironment,
						ui: m.tools.catUI,
						effect: m.tools.catEffect,
						item: m.tools.catItem,
						shape: m.tools.catShape,
						background: m.tools.catBackground,
						particle: m.tools.catParticle,
					};

					const sections = Object.entries(grouped).map(([cat, assets]) => {
						const lines = assets.map(
							(a) => a.preloadCode
								? `  - ${a.nameZh} (key: "${a.name}"${a.url ? ", CDN image" : ""})\n    ${a.preloadCode}`
								: `  - ${a.nameZh} (key: "${a.name}")\n    ${a.generatorCode.split("\n").join("\n    ")}`,
						);
						return `【${catNames[cat] ?? cat}】(${assets.length})\n${lines.join("\n")}`;
					});

					return {
						success: true,
						message: `${t(m.tools.catalogHeader, { count: filtered.length })}:\n\n${sections.join("\n\n")}\n\n${m.tools.catalogUsage}`,
						data: { assets: filtered, count: filtered.length },
					};
				},
			},
			{
				name: "generate_asset",
				description: dm.tools.generateAsset.desc,
				parameters: {
					type: "object",
					properties: {
						name: {
							type: "string",
							description: "Asset English name (used as texture key, e.g. magic-sword)",
						},
						nameZh: {
							type: "string",
							description: "Asset Chinese name",
						},
						category: {
							type: "string",
							enum: ["character", "environment", "ui", "effect", "item", "shape", "background", "particle"],
							description: "Asset category",
						},
						generatorCode: {
							type: "string",
							description: "Phaser Graphics API generation code",
						},
						tags: {
							type: "array",
							items: { type: "string" },
							description: "Search tags",
						},
					},
					required: ["name", "nameZh", "category", "generatorCode"],
				},
				async execute(args) {
					try {
						const m = getMessages();
						const name = args.name as string;
						const nameZh = args.nameZh as string;
						const category = args.category as string;
						const generatorCode = args.generatorCode as string;
						const tags = (args.tags as string[]) || [name, nameZh];
						const id = `llm-${Date.now().toString(36)}`;

						await assetRegistry.load();
						await assetRegistry.addUserAsset({
							id,
							name,
							nameZh,
							type: "texture",
							category,
							tags,
							source: "llm-generated",
							generatorCode,
						});

						return {
							success: true,
							message: `${t(m.tools.generateAssetSuccess, { nameZh })}\n\n${m.tools.generateAssetUsage}\n\`\`\`typescript\n${generatorCode}\n\`\`\`\n\n${m.tools.generateAssetTip}`,
							data: { id, name, nameZh, category, generatorCode },
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.generateAssetFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "set_game_config",
				description: dm.tools.setGameConfig.desc,
				parameters: {
					type: "object",
					properties: {
						width: {
							type: "number",
							description: "Game canvas width (pixels)",
						},
						height: {
							type: "number",
							description: "Game canvas height (pixels)",
						},
						backgroundColor: {
							type: "string",
							description: "Background color (hex, e.g. #1a1a2e)",
						},
						gravity: {
							type: "number",
							description: "Gravity Y value (e.g. 300)",
						},
						debug: {
							type: "boolean",
							description: "Enable physics debug mode",
						},
					},
				},
				async execute(args) {
					try {
						const m = getMessages();
						let mainContent: string;
						try {
							mainContent = await pm().readFile("src/main.ts");
						} catch {
							return {
								success: false,
								message: m.tools.mainTsNotFound,
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
							changes.push(`${m.tools.configSize}: ${w}x${h}`);
						}

						if (args.backgroundColor) {
							const bg = args.backgroundColor as string;
							mainContent = mainContent.replace(
								/backgroundColor:\s*["']#?[0-9a-fA-F]+["']/,
								`backgroundColor: "${bg}"`,
							);
							changes.push(`${m.tools.configBg}: ${bg}`);
						}

						if (args.gravity !== undefined) {
							const g = args.gravity as number;
							mainContent = mainContent.replace(
								/gravity:\s*\{[^}]*\}/,
								`gravity: { x: 0, y: ${g} }`,
							);
							changes.push(`${m.tools.configGravity}: ${g}`);
						}

						if (args.debug !== undefined) {
							const d = args.debug as boolean;
							mainContent = mainContent.replace(
								/debug:\s*(true|false)/,
								`debug: ${d}`,
							);
							changes.push(d ? m.tools.configDebugOn : m.tools.configDebugOff);
						}

						if (mainContent === oldContent) {
							return {
								success: true,
								message: m.tools.configNoChange,
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
							message: `${m.tools.configUpdated}: ${changes.join(", ")}`,
							undoable: true,
						};
					} catch (e) {
						const m = getMessages();
						return {
							success: false,
							message: `${m.tools.configFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "inspect_scene",
				description: dm.tools.inspectScene.desc,
				parameters: {
					type: "object",
					properties: {},
				},
				async execute() {
					const m = getMessages();
					try {
						const result = await new Promise<{
							objects: SceneObjectBounds[];
							settings: { width: number; height: number };
						} | null>((resolve) => {
							const timeout = setTimeout(() => {
								unsub();
								resolve(null);
							}, 3000);
							const unsub = sceneBridge.onMessage((msg) => {
								if (msg.type === "scene_tree") {
									clearTimeout(timeout);
									unsub();
									resolve({ objects: msg.objects, settings: msg.settings });
								}
							});
							sceneBridge.requestSceneTree();
						});

						if (!result) {
							return { success: false, message: m.tools.inspectSceneTimeout };
						}

						const { objects, settings } = result;
						if (objects.length === 0) {
							return {
								success: true,
								message: m.tools.inspectSceneEmpty,
								data: { objects: [], settings },
							};
						}

						return {
							success: true,
							message: m.tools.inspectSceneSuccess
								.replace("{count}", String(objects.length))
								.replace("{width}", String(settings.width))
								.replace("{height}", String(settings.height)),
							data: { objects, settings },
						};
					} catch (e) {
						return {
							success: false,
							message: `${m.tools.inspectSceneTimeout}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "place_object",
				description: dm.tools.placeObject.desc,
				parameters: {
					type: "object",
					properties: {
						type: {
							type: "string",
							description: dm.tools.placeObject.typeDesc,
							enum: ["sprite", "image", "text", "graphics"],
						},
						name: {
							type: "string",
							description: dm.tools.placeObject.nameDesc,
						},
						x: {
							type: "number",
							description: dm.tools.placeObject.xDesc,
						},
						y: {
							type: "number",
							description: dm.tools.placeObject.yDesc,
						},
						texture: {
							type: "string",
							description: dm.tools.placeObject.textureDesc,
						},
						text: {
							type: "string",
							description: dm.tools.placeObject.textDesc,
						},
					},
					required: ["type", "name", "x", "y"],
				},
				async execute(args) {
					const m = getMessages();
					try {
						const objType = args.type as SceneObject["type"];
						const name = args.name as string;
						const x = args.x as number;
						const y = args.y as number;

						const obj: SceneObject = {
							id: generateObjectId(),
							type: objType,
							name,
							x,
							y,
						};

						if (args.texture) obj.texture = args.texture as string;
						if (args.text) obj.text = args.text as string;

						sceneBridge.createObject(obj);
						useVisualEditorStore.getState().addObject(obj);

						return {
							success: true,
							message: m.tools.placeObjectSuccess
								.replace("{name}", name)
								.replace("{x}", String(x))
								.replace("{y}", String(y)),
							data: { id: obj.id, type: objType, name, x, y },
						};
					} catch (e) {
						return {
							success: false,
							message: `${m.tools.placeObjectFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "update_object",
				description: dm.tools.updateObject.desc,
				parameters: {
					type: "object",
					properties: {
						id: {
							type: "string",
							description: dm.tools.updateObject.idDesc,
						},
						x: {
							type: "number",
							description: dm.tools.updateObject.xDesc,
						},
						y: {
							type: "number",
							description: dm.tools.updateObject.yDesc,
						},
						rotation: {
							type: "number",
							description: dm.tools.updateObject.rotationDesc,
						},
						scaleX: {
							type: "number",
							description: dm.tools.updateObject.scaleXDesc,
						},
						scaleY: {
							type: "number",
							description: dm.tools.updateObject.scaleYDesc,
						},
						alpha: {
							type: "number",
							description: dm.tools.updateObject.alphaDesc,
						},
						visible: {
							type: "boolean",
							description: dm.tools.updateObject.visibleDesc,
						},
						depth: {
							type: "number",
							description: dm.tools.updateObject.depthDesc,
						},
					},
					required: ["id"],
				},
				async execute(args) {
					const m = getMessages();
					try {
						const id = args.id as string;
						const props: Partial<SceneObject> = {};
						if (args.x !== undefined) props.x = args.x as number;
						if (args.y !== undefined) props.y = args.y as number;
						if (args.rotation !== undefined) props.rotation = args.rotation as number;
						if (args.scaleX !== undefined) props.scaleX = args.scaleX as number;
						if (args.scaleY !== undefined) props.scaleY = args.scaleY as number;
						if (args.alpha !== undefined) props.alpha = args.alpha as number;
						if (args.visible !== undefined) props.visible = args.visible as boolean;
						if (args.depth !== undefined) props.depth = args.depth as number;

						sceneBridge.updateObject(id, props);
						useVisualEditorStore.getState().updateObject(id, props);

						return {
							success: true,
							message: m.tools.updateObjectSuccess.replace("{id}", id),
							data: { id, updatedProps: Object.keys(props) },
						};
					} catch (e) {
						return {
							success: false,
							message: `${m.tools.updateObjectFailed}: ${e instanceof Error ? e.message : String(e)}`,
						};
					}
				},
			},
			{
				name: "remove_object",
				description: dm.tools.removeObject.desc,
				parameters: {
					type: "object",
					properties: {
						id: {
							type: "string",
							description: dm.tools.removeObject.idDesc,
						},
					},
					required: ["id"],
				},
				async execute(args) {
					const m = getMessages();
					try {
						const id = args.id as string;

						sceneBridge.deleteObject(id);
						useVisualEditorStore.getState().removeObject(id);

						return {
							success: true,
							message: m.tools.removeObjectSuccess.replace("{id}", id),
							data: { id },
						};
					} catch (e) {
						return {
							success: false,
							message: `${m.tools.removeObjectFailed}: ${e instanceof Error ? e.message : String(e)}`,
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
	const m = getMessages();
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
			.text(width / 2, height / 3, "${m.sceneTemplate.gameTitle}", {
				fontSize: "48px",
				color: "#ffffff",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const startBtn = this.add
			.text(width / 2, height * 0.6, "${m.sceneTemplate.startGame}", {
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
			.text(width / 2, height / 3, "${m.sceneTemplate.gameOver}", {
				fontSize: "48px",
				color: "#ef4444",
				fontFamily: "Arial",
			})
			.setOrigin(0.5);

		const retryBtn = this.add
			.text(width / 2, height * 0.6, "${m.sceneTemplate.retry}", {
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
	}

	update() {
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
	}

	create() {
	}

	update() {
	}
}
`;
	}
}
