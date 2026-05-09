import type { AgentTool } from "@rimecraft/agent-engine";
import type { ToolContext, Command } from "./tool-context";
import {
	refreshFileList,
	resolveFilePath,
	useProjectStore,
	getMessages,
	t,
	normalizeError,
} from "./tool-context";

export function createFileTools(ctx: ToolContext): AgentTool[] {
	const { pm, preview, cmd } = ctx;
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
						message: `${m.tools.listFilesFailed}: ${normalizeError(e)}`,
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
					const path = (await resolveFilePath(rawPath, pm)) ?? rawPath;
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
						message: `${m.tools.readFileFailed}: ${normalizeError(e)}${suggestion}`,
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
							await refreshFileList(pm);
						},
						async undo() {
							if (oldContent !== null) {
								await pm().writeFile(path, oldContent);
							} else {
								await pm().deleteFile(path);
							}
							await refreshFileList(pm);
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
						message: `${m.tools.writeFileFailed}: ${normalizeError(e)}`,
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
					const path = (await resolveFilePath(rawPath, pm)) ?? rawPath;
					const oldContent = await pm().readFile(path);

					const deleteCmd: Command = {
						id: `delete_${Date.now()}`,
						name: `delete_file: ${path}`,
						async execute() {
							await pm().deleteFile(path);
							await refreshFileList(pm);
						},
						async undo() {
							await pm().writeFile(path, oldContent);
							await refreshFileList(pm);
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
						message: `${m.tools.deleteFileFailed}: ${normalizeError(e)}${suggestion}`,
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
							await refreshFileList(pm);
						},
						async undo() {
							await pm().writeFile(oldPath, content);
							await pm().deleteFile(newPath);
							await refreshFileList(pm);
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
						message: `${m.tools.renameFailed}: ${normalizeError(e)}`,
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
					const path = (await resolveFilePath(rawPath, pm)) ?? rawPath;
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
						message: `${m.tools.patchFailed}: ${normalizeError(e)}`,
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
						message: `${m.tools.getStructureFailed}: ${normalizeError(e)}`,
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
						message: `${m.tools.searchFailed}: ${normalizeError(e)}`,
					};
				}
			},
		},
	];
}
