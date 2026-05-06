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
	ragContext?: string | null;
	tools?: ToolDefinition[];
	signal?: AbortSignal;
}

const PHASER_KNOWLEDGE = `
## Phaser 4 代码生成规则

你生成的代码必须严格遵循以下规则。注意：本项目使用 **Phaser 4.0.0**，与 Phaser 3 有重大 API 差异。

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

### ⚠️ Phaser 4 vs Phaser 3 关键差异（必读）

以下是最容易出错的 API 变化，**绝对不要使用 Phaser 3 的写法**：

#### Group (对象组/对象池)
Phaser 4 中 Group.children 是 **Set** 类型，不是自定义集合。
\`\`\`typescript
// ❌ Phaser 3 (错误！会报 children.each is not a function)
group.children.each((child) => { ... });
group.children.iterate((child) => { ... });
group.children.size;

// ✅ Phaser 4 (正确)
group.getChildren().forEach((child) => { ... });   // 遍历所有子对象
group.getChildren().length;                         // 获取子对象数量
group.getFirst(true);                               // 获取第一个活跃对象
group.getFirst(false);                              // 获取第一个非活跃对象 (对象池回收)
group.countActive(true);                            // 活跃对象计数
group.countActive(false);                           // 非活跃对象计数
group.getMatching("active", true);                  // 按属性过滤
group.killAndHide(obj);                             // 对象池: 回收对象 (setActive(false) + setVisible(false))
\`\`\`

#### Physics Group (物理组)
\`\`\`typescript
// 创建物理组 (对象池模式)
this.bullets = this.physics.add.group({
  classType: Phaser.Physics.Arcade.Sprite,
  maxSize: 20,
  runChildUpdate: true,
  createCallback: (obj: Phaser.GameObjects.GameObject) => {
    const bullet = obj as Phaser.Physics.Arcade.Sprite;
    bullet.setActive(false).setVisible(false);
  }
});

// 从池中获取/发射子弹
const bullet = this.bullets.getFirst(false, true, x, y, "bullet");
if (bullet) {
  bullet.setActive(true).setVisible(true);
  bullet.body!.setVelocityY(-400);
}

// 回收子弹 (出屏幕时)
this.bullets.getChildren().forEach((b) => {
  const bullet = b as Phaser.Physics.Arcade.Sprite;
  if (bullet.active && bullet.y < -50) {
    this.bullets.killAndHide(bullet);
    bullet.body!.stop();
  }
});
\`\`\`

#### Static Group (静态物理组)
\`\`\`typescript
const platforms = this.physics.add.staticGroup();
platforms.create(400, 580, "ground").setScale(2).refreshBody();
// refreshBody() 必须在 setScale 后调用，否则物理体大小不匹配
\`\`\`

### 关键 API 速查

#### 创建对象
- 精灵: this.add.sprite(x, y, "key") / this.physics.add.sprite(x, y, "key")
- 文本: this.add.text(x, y, "text", { fontSize: "24px", color: "#fff" })
- 图形: this.add.graphics() → graphics.fillRect(x, y, w, h)
- 平铺精灵(滚动背景): this.add.tileSprite(x, y, w, h, "key")
- 图片(静态): this.add.image(x, y, "key")

#### 物理系统
- 碰撞: this.physics.add.collider(objA, objB, callback, null, this)
- 重叠: this.physics.add.overlap(objA, objB, callback, null, this)
- 速度: sprite.body!.setVelocity(vx, vy) / setVelocityX(v) / setVelocityY(v)
- 重力: sprite.body!.setGravityY(300)
- 弹跳: sprite.body!.setBounce(0.2)
- 不可移动: sprite.body!.setImmovable(true)
- 世界边界碰撞: sprite.body!.setCollideWorldBounds(true)
- 大小: sprite.body!.setSize(w, h) / setOffset(x, y)

#### 输入
- 键盘方向键: this.input.keyboard!.createCursorKeys() → cursors.left.isDown
- 单个按键: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
- 鼠标/触控: this.input.on("pointerdown", (pointer) => { ... })
- 对象可点击: sprite.setInteractive(); sprite.on("pointerdown", callback)

#### 场景管理
- 切换场景: this.scene.start("SceneName", { score: 100 })
- 传递数据: create(data: { score: number }) { ... } 接收
- 并行场景: this.scene.launch("UIScene") / this.scene.stop("UIScene")
- 重启当前: this.scene.restart()

#### 动画与特效
- 补间动画: this.tweens.add({ targets: obj, x: 400, duration: 1000, ease: "Power2" })
- 计时器: this.time.addEvent({ delay: 1000, callback: fn, loop: true })
- 延迟调用: this.time.delayedCall(500, callback)
- 粒子: this.add.particles(x, y, "key", { speed: 100, lifespan: 500 })
- 相机跟随: this.cameras.main.startFollow(player)
- 相机震动: this.cameras.main.shake(200, 0.01)
- 相机闪烁: this.cameras.main.flash(300)

#### 常用游戏模式代码

##### 无尽跑酷 — 障碍物循环生成
\`\`\`typescript
this.time.addEvent({
  delay: 1500,
  loop: true,
  callback: () => {
    const x = this.scale.width + 50;
    const y = this.scale.height - 60;
    const obstacle = this.obstacles.getFirst(false, true, x, y, "obstacle");
    if (obstacle) {
      obstacle.setActive(true).setVisible(true);
      obstacle.body!.setVelocityX(-300);
    }
  }
});

// update() 中回收出屏障碍物
this.obstacles.getChildren().forEach((obj) => {
  const o = obj as Phaser.Physics.Arcade.Sprite;
  if (o.active && o.x < -50) {
    this.obstacles.killAndHide(o);
    o.body!.stop();
  }
});
\`\`\`

##### 得分系统
\`\`\`typescript
private score = 0;
private scoreText!: Phaser.GameObjects.Text;

create() {
  this.scoreText = this.add.text(16, 16, "分数: 0", {
    fontSize: "28px", color: "#fff", fontFamily: "Arial"
  }).setScrollFactor(0).setDepth(100);
}

addScore(points: number) {
  this.score += points;
  this.scoreText.setText("分数: " + this.score);
}
\`\`\`

##### 游戏结束流程
\`\`\`typescript
gameOver() {
  this.physics.pause();
  this.scene.start("GameOverScene", { score: this.score });
}
\`\`\`

### 无图片资源时的替代方案
如果项目没有图片素材, 使用 Graphics 绘制替代:
\`\`\`typescript
const gfx = this.add.graphics();
gfx.fillStyle(0x06b6d4, 1);
gfx.fillRect(0, 0, 32, 48);
gfx.generateTexture("player", 32, 48);
gfx.destroy();
const player = this.physics.add.sprite(100, 400, "player");
\`\`\`

多个不同颜色的纹理:
\`\`\`typescript
function makeTexture(scene: Phaser.Scene, key: string, color: number, w: number, h: number) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRect(0, 0, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}
// 在 preload() 或 create() 开头调用
makeTexture(this, "player", 0x06b6d4, 32, 48);
makeTexture(this, "ground", 0x4ade80, 800, 40);
makeTexture(this, "obstacle", 0xef4444, 30, 50);
makeTexture(this, "bullet", 0xfbbf24, 8, 8);
makeTexture(this, "sky", 0x1e3a5f, 800, 600);
\`\`\`

### 重要注意事项
- 所有 import 必须使用相对路径 (./xxx), Phaser 用 import Phaser from "phaser"
- 使用 export class 导出场景类
- 不要使用 async/await 在 preload() 中, Phaser 有自己的加载管理
- physics.add.sprite() 返回的是带物理体的精灵, add.sprite() 返回的是普通精灵
- 修改代码后游戏会自动重新编译和刷新预览
- collider/overlap 回调函数签名: (objA, objB) => void, 如果需要 this 引用, 传第四个参数 null 和第五个 this
- 对象池 (Group maxSize) 比反复 new 更高效, 射击/障碍物/粒子等应使用对象池
- 使用 setScrollFactor(0) 让 UI 元素不跟随相机滚动 (如分数文本)
- 使用 setDepth(n) 控制渲染层级, 数值越大越在前面
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

	if (params.ragContext) {
		parts.push(params.ragContext);
		parts.push("");
	}

	parts.push("## 工作规则");
	parts.push("- 使用中文回复，语言通俗易懂，避免过于专业的术语");
	parts.push("- 生成代码时使用 TypeScript + Phaser 4 API");
	parts.push("- 生成代码时自动附带简洁的中文注释，帮助用户理解关键逻辑，但不要过度注释");
	parts.push("- 每次修改代码后，游戏预览会自动刷新");
	parts.push("- 如果用户描述模糊，主动提问引导");
	parts.push("- 出错时不要慌，分析原因后修复");
	parts.push("- 使用 write_file 工具写入代码文件，路径以 src/ 开头");
	parts.push("- 修改游戏时，先用 list_files 和 read_file 了解当前代码，再用 write_file 修改");
	parts.push("- 生成完整可运行的代码，不要省略任何部分");
	parts.push("- 对已有文件做小修改时，优先使用 patch_file 工具进行精确替换，避免重写整个文件");
	parts.push("- 写完代码后，系统会自动编译并启动游戏预览，检测运行时错误");
	parts.push("- 如果系统报告了运行时错误，你必须分析错误信息，读取相关代码，修复问题");
	parts.push("- 不要在还有运行时错误的情况下结束任务，确保游戏能正常运行");
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

	const isBrowser = typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);

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
