import type { AgentTool } from "@rimecraft/agent-engine";
import type { ToolContext, Command } from "./tool-context";
import { useProjectStore, getMessages, t, normalizeError } from "./tool-context";
import { ASSET_CATALOG, searchCatalog } from "@/lib/assets/asset-catalog";
import { assetRegistry } from "@/lib/assets/asset-registry";

export function createAssetTools(ctx: ToolContext): AgentTool[] {
	const { pm, preview, cmd } = ctx;
	const dm = getMessages();

	return [
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
					return { success: false, message: `${m.tools.listAssetsFailed}: ${normalizeError(e)}` };
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
					return { success: false, message: `${m.tools.searchAssetsFailed}: ${normalizeError(e)}` };
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
					return { success: false, message: `${m.tools.importAssetFailed}: ${normalizeError(e)}` };
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
					return { success: false, message: `${m.tools.animFailed}: ${normalizeError(e)}` };
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
						message: `${m.tools.generateAssetFailed}: ${normalizeError(e)}`,
					};
				}
			},
		},
	];
}
