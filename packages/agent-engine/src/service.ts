import type {
	AgentLLMConfig,
	AgentMessage,
	AgentEvent,
	ToolDefinition,
	ToolCallInfo,
} from "./types";
import type { ExpertRole } from "./expert-roles";
import { getExpertRoleSystemPrompt, EXPERT_ROLES } from "./expert-roles";
import { ToolRegistry } from "./tool-registry";

interface RunAgentLoopParams {
	messages: AgentMessage[];
	llmConfig: AgentLLMConfig;
	expertRole: ExpertRole;
	activeRoleId?: ExpertRole;
	gameContext?: string | null;
	tools?: ToolDefinition[];
	signal?: AbortSignal;
}

const PHASER_KNOWLEDGE = `
## Phaser 4 代码生成规则

你生成的代码必须严格遵循以下规则：

### 项目结构
- 入口文件: src/main.ts — 创建 Phaser.Game 实例, 注册所有场景
- 场景文件: src/scenes/<name>.ts — 每个场景一个文件, 导出场景类
- 配置文件: src/config/game-config.ts — 游戏配置常量

### main.ts 标准模板
\`\`\`typescript
import Phaser from "phaser";
import { GameScene } from "./scenes/game-scene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#1a1a2e",
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  scene: [GameScene]
};

new Phaser.Game(config);
\`\`\`

### 场景标准模板
\`\`\`typescript
import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }
  preload() { /* this.load.image("key", "url"); */ }
  create() { /* this.add.sprite(x, y, "key"); */ }
  update(time: number, delta: number) { /* 每帧逻辑 */ }
}
\`\`\`

### 关键 API 速查
- 创建精灵: this.add.sprite(x, y, "key") / this.physics.add.sprite(x, y, "key")
- 创建文本: this.add.text(x, y, "text", { fontSize: "24px", color: "#fff" })
- 创建图形: this.add.graphics() → graphics.fillRect(x, y, w, h)
- 物理碰撞: this.physics.add.collider(objA, objB, callback)
- 重叠检测: this.physics.add.overlap(objA, objB, callback)
- 键盘输入: this.input.keyboard!.createCursorKeys()
- 场景切换: this.scene.start("SceneName")
- 计时器: this.time.addEvent({ delay: 1000, callback: fn, loop: true })
- 补间动画: this.tweens.add({ targets: obj, x: 400, duration: 1000 })
- 粒子: this.add.particles(x, y, "key", { speed: 100, lifespan: 500 })
- 相机跟随: this.cameras.main.startFollow(player)
- 设置物理体: sprite.body!.setVelocity(vx, vy) / .setGravityY(300) / .setBounce(0.2)
- 静态物理组: this.physics.add.staticGroup()

### 无图片资源时的替代方案
如果项目没有图片素材, 使用 Graphics 绘制替代:
\`\`\`typescript
// 用矩形代替精灵
const graphics = this.add.graphics();
graphics.fillStyle(0x06b6d4, 1);
graphics.fillRect(0, 0, 32, 48);
graphics.generateTexture("player", 32, 48);
graphics.destroy();
const player = this.physics.add.sprite(100, 400, "player");
\`\`\`

### 重要注意事项
- 所有 import 必须使用相对路径 (./xxx), Phaser 用 import Phaser from "phaser"
- 使用 export class 导出场景类
- 不要使用 async/await 在 preload() 中, Phaser 有自己的加载管理
- physics.add.sprite() 返回的是带物理体的精灵, add.sprite() 返回的是普通精灵
- 修改代码后游戏会自动重新编译和刷新预览
`;

function buildSystemPrompt(params: RunAgentLoopParams): string {
	const parts: string[] = [];

	parts.push(
		"你是 RimeCraft 的 AI 助手，一个面向青少年的 2D 游戏对话式开发工具。",
	);
	parts.push(
		"用户通过自然语言描述想法，你帮助他们使用 Phaser.js 创建 2D 游戏。",
	);
	parts.push("");

	const rolePrompt = getExpertRoleSystemPrompt(params.expertRole);
	if (rolePrompt) {
		parts.push(rolePrompt);
		parts.push("");
	}

	if (params.expertRole === "director" && params.activeRoleId) {
		const activeRole = EXPERT_ROLES[params.activeRoleId];
		if (activeRole) {
			parts.push(
				`当前激活的专家角色：${activeRole.name}（${params.activeRoleId}）`,
			);
			parts.push(
				"你现在必须以该专家角色的身份工作，使用对应的专业知识和工具来完成任务。",
			);
			parts.push("");
			parts.push(activeRole.systemPromptAddition);
			parts.push("");
		}
	}

	parts.push(PHASER_KNOWLEDGE);
	parts.push("");

	if (params.gameContext) {
		parts.push("=== 当前游戏项目状态 ===");
		parts.push(params.gameContext);
		parts.push("");
	}

	parts.push("## 工作规则");
	parts.push("- 使用中文回复，语言通俗易懂，避免过于专业的术语");
	parts.push("- 生成代码时使用 TypeScript + Phaser 4 API");
	parts.push("- 每次修改代码后，游戏预览会自动刷新");
	parts.push("- 如果用户描述模糊，主动提问引导");
	parts.push("- 出错时不要慌，分析原因后修复");
	parts.push("- 使用 write_file 工具写入代码文件，路径以 src/ 开头");
	parts.push("- 修改游戏时，先用 list_files 和 read_file 了解当前代码，再用 write_file 修改");
	parts.push("- 生成完整可运行的代码，不要省略任何部分");
	parts.push("- 对已有文件做小修改时，优先使用 patch_file 工具进行精确替换，避免重写整个文件");
	parts.push("- 写完代码后，用 get_runtime_errors 检查是否有运行时错误，如有则自动修复");
	parts.push("- 创建新游戏时，需要同时创建 src/main.ts（入口）和 src/scenes/ 下的场景文件");

	return parts.join("\n");
}

export async function* runAgentLoop(
	params: RunAgentLoopParams,
): AsyncGenerator<AgentEvent> {
	const systemPrompt = buildSystemPrompt(params);

	const apiMessages = [
		{ role: "system" as const, content: systemPrompt },
		...params.messages.map((m) => ({
			role: m.role as "user" | "assistant" | "system" | "tool",
			content: m.content || null,
			...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
			...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
		})),
	];

	const tools = params.tools ?? ToolRegistry.getDefinitions();

	if (
		params.expertRole === "director" &&
		!tools.find(
			(t) => t.function.name === "switch_expert_role",
		)
	) {
		tools.push({
			type: "function",
			function: {
				name: "switch_expert_role",
				description: "切换到指定的专家角色",
				parameters: {
					type: "object",
					properties: {
						role: {
							type: "string",
							enum: [
								"design",
								"coding",
								"asset",
								"gameplay",
								"debug",
							],
							description: "目标角色 ID",
						},
					},
					required: ["role"],
				},
			},
		});
	}

	yield { type: "status", status: "thinking" };

	const isBrowser = typeof window !== "undefined" && !("__TAURI__" in window);

	try {
		let response: Response;

		if (isBrowser) {
			response = await fetch("/api/ai/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					baseUrl: params.llmConfig.baseUrl,
					apiKey: params.llmConfig.apiKey,
					model: params.llmConfig.model,
					messages: apiMessages,
					tools: tools.length > 0 ? tools : undefined,
					stream: true,
				}),
				signal: params.signal,
			});
		} else {
			response = await fetch(`${params.llmConfig.baseUrl}/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${params.llmConfig.apiKey}`,
				},
				body: JSON.stringify({
					model: params.llmConfig.model,
					messages: apiMessages,
					tools: tools.length > 0 ? tools : undefined,
					stream: true,
				}),
				signal: params.signal,
			});
		}

		if (!response.ok) {
			const errorText = await response.text();
			yield {
				type: "error",
				message: `LLM API error (${response.status}): ${errorText}`,
			};
			return;
		}

		yield { type: "status", status: "streaming" };

		const reader = response.body?.getReader();
		if (!reader) {
			yield { type: "error", message: "No response body" };
			return;
		}

		const decoder = new TextDecoder();
		let buffer = "";
		const toolCalls: ToolCallInfo[] = [];

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed === "data: [DONE]") continue;
				if (!trimmed.startsWith("data: ")) continue;

				try {
					const data = JSON.parse(trimmed.slice(6));
					const delta = data.choices?.[0]?.delta;
					if (!delta) continue;

					if (delta.content) {
						yield { type: "text_delta", content: delta.content };
					}

					if (delta.tool_calls) {
						for (const tc of delta.tool_calls) {
							const idx = tc.index ?? 0;
							if (!toolCalls[idx]) {
								toolCalls[idx] = {
									id: tc.id ?? "",
									type: "function",
									function: {
										name: tc.function?.name ?? "",
										arguments:
											tc.function?.arguments ?? "",
									},
								};
							} else {
								if (tc.id) toolCalls[idx].id = tc.id;
								if (tc.function?.name) {
									toolCalls[idx].function.name =
										tc.function.name;
								}
								if (tc.function?.arguments) {
									toolCalls[idx].function.arguments +=
										tc.function.arguments;
								}
							}
						}
					}

					if (data.choices?.[0]?.finish_reason) {
						const usage = data.usage;
						if (toolCalls.length > 0) {
							yield {
								type: "tool_calls_complete",
								toolCalls,
							};
						}
						yield {
							type: "message_end",
							usage: usage
								? {
										promptTokens:
											usage.prompt_tokens ?? 0,
										completionTokens:
											usage.completion_tokens ?? 0,
										totalTokens:
											usage.total_tokens ?? 0,
									}
								: undefined,
						};
					}
				} catch {
					// Skip malformed JSON chunks
				}
			}
		}
	} catch (error) {
		if (params.signal?.aborted) {
			yield { type: "error", message: "Request cancelled" };
		} else {
			const message =
				error instanceof Error ? error.message : String(error);
			yield { type: "error", message };
		}
	}
}
