import {
	ToolRegistry,
	type AgentTool,
} from "@rimecraft/agent-engine";

export class AgentManager {
	private initialized = false;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		await this.registerTools();
		this.initialized = true;
	}

	private async registerTools(): Promise<void> {
		const tools = await this.createGameTools();
		for (const tool of tools) {
			ToolRegistry.register(tool);
		}
	}

	private async createGameTools(): Promise<AgentTool[]> {
		return [
			{
				name: "list_files",
				description: "列出项目中的所有文件",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "可选的子目录路径",
						},
					},
				},
				async execute() {
					return {
						success: true,
						message: "文件列表获取成功",
						data: { files: [] },
					};
				},
			},
			{
				name: "read_file",
				description: "读取指定文件的内容",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "文件路径",
						},
					},
					required: ["path"],
				},
				async execute(args) {
					const path = args.path as string;
					return {
						success: true,
						message: `成功读取文件: ${path}`,
						data: { content: "" },
					};
				},
			},
			{
				name: "write_file",
				description: "写入或覆盖文件内容",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "文件路径",
						},
						content: {
							type: "string",
							description: "文件内容",
						},
					},
					required: ["path", "content"],
				},
				async execute(args) {
					const path = args.path as string;
					return {
						success: true,
						message: `成功写入文件: ${path}`,
						undoable: true,
					};
				},
			},
			{
				name: "create_scene",
				description:
					"创建新的 Phaser 场景文件，自动生成 init/preload/create/update 骨架代码",
				parameters: {
					type: "object",
					properties: {
						name: {
							type: "string",
							description: "场景名称",
						},
						type: {
							type: "string",
							enum: [
								"menu",
								"game",
								"ui",
								"gameover",
							],
							description: "场景类型",
						},
					},
					required: ["name"],
				},
				async execute(args) {
					const name = args.name as string;
					return {
						success: true,
						message: `成功创建场景: ${name}`,
						undoable: true,
					};
				},
			},
			{
				name: "generate_code",
				description:
					"基于自然语言描述生成 Phaser.js 游戏代码",
				parameters: {
					type: "object",
					properties: {
						sceneId: {
							type: "string",
							description: "目标场景 ID",
						},
						description: {
							type: "string",
							description: "代码功能描述",
						},
						scope: {
							type: "string",
							enum: ["full", "method", "snippet"],
							description: "生成范围",
						},
					},
					required: ["description"],
				},
				async execute(args) {
					const desc = args.description as string;
					return {
						success: true,
						message: `代码生成完成: ${desc}`,
						undoable: true,
					};
				},
			},
			{
				name: "modify_code",
				description: "基于描述增量修改代码",
				parameters: {
					type: "object",
					properties: {
						path: {
							type: "string",
							description: "文件路径",
						},
						description: {
							type: "string",
							description: "修改描述",
						},
					},
					required: ["path", "description"],
				},
				async execute(args) {
					const path = args.path as string;
					return {
						success: true,
						message: `代码修改完成: ${path}`,
						undoable: true,
					};
				},
			},
			{
				name: "fix_error",
				description: "分析运行时报错并修复代码",
				parameters: {
					type: "object",
					properties: {
						errorLog: {
							type: "string",
							description: "错误日志",
						},
						path: {
							type: "string",
							description: "相关文件路径",
						},
					},
					required: ["errorLog"],
				},
				async execute(args) {
					const errorLog = args.errorLog as string;
					return {
						success: true,
						message: `错误修复完成: ${errorLog.slice(0, 50)}...`,
						undoable: true,
					};
				},
			},
			{
				name: "restart_preview",
				description: "重新编译并重启游戏预览",
				parameters: {
					type: "object",
					properties: {
						sceneId: {
							type: "string",
							description: "指定启动场景",
						},
					},
				},
				async execute() {
					return {
						success: true,
						message: "游戏预览已重启",
					};
				},
			},
			{
				name: "get_game_state",
				description:
					"获取当前游戏运行时状态（FPS、对象数、错误日志）",
				parameters: {
					type: "object",
					properties: {},
				},
				async execute() {
					return {
						success: true,
						message: "游戏状态获取成功",
						data: {
							fps: 60,
							objectCount: 0,
							errors: [],
						},
					};
				},
			},
			{
				name: "undo",
				description: "撤销上一步操作",
				parameters: { type: "object", properties: {} },
				async execute() {
					return { success: true, message: "已撤销" };
				},
			},
			{
				name: "redo",
				description: "重做上一步操作",
				parameters: { type: "object", properties: {} },
				async execute() {
					return { success: true, message: "已重做" };
				},
			},
		];
	}

	dispose(): void {
		ToolRegistry.clear();
		this.initialized = false;
	}
}
