import type { AgentTool } from "@rimecraft/agent-engine";
import type { ToolContext } from "./tool-context";
import { getMessages, t, normalizeError } from "./tool-context";
import { useGameStore } from "@/stores/game-store";
import { useProjectStore } from "@/stores/project-store";

export function createConfigTools(ctx: ToolContext): AgentTool[] {
	const { pm, preview } = ctx;
	const dm = getMessages();

	return [
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

					const configCmd = {
						id: `config_${Date.now()}`,
						name: "set_game_config",
						async execute() {
							await pm().writeFile("src/main.ts", mainContent);
						},
						async undo() {
							await pm().writeFile("src/main.ts", oldContent);
						},
					};

					await ctx.cmd().execute(configCmd);
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
						message: `${m.tools.configFailed}: ${normalizeError(e)}`,
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
						message: `${m.tools.restartPreviewFailed}: ${normalizeError(e)}`,
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
	];
}
