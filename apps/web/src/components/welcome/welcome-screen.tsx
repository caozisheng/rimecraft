"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { Gamepad2, Plus, FolderOpen, Sparkles } from "lucide-react";

const TEMPLATES = [
	{
		id: "endless-runner",
		name: "无尽跑酷",
		description: "小恐龙风格的无尽跑酷游戏",
		icon: "🦕",
	},
	{
		id: "platformer",
		name: "平台跳跃",
		description: "超级马里奥风格的横版跳跃",
		icon: "🍄",
	},
	{
		id: "space-shooter",
		name: "太空射击",
		description: "太空射击弹幕游戏",
		icon: "🚀",
	},
	{
		id: "rpg",
		name: "RPG 冒险",
		description: "像素风角色扮演探索",
		icon: "⚔️",
	},
	{
		id: "puzzle",
		name: "解谜益智",
		description: "推箱子、消除类逻辑游戏",
		icon: "🧩",
	},
	{
		id: "blank",
		name: "空白项目",
		description: "从零开始创建",
		icon: "✨",
	},
];

export function WelcomeScreen() {
	const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
	const [projectName, setProjectName] = useState("");

	const handleCreateProject = (templateId: string) => {
		const name = projectName.trim() || "我的游戏";
		const project = {
			id: `proj_${Date.now().toString(36)}`,
			name,
			template: templateId,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			tags: [],
		};
		setCurrentProject(project);
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
			{/* Logo */}
			<div className="mb-8 text-center">
				<div className="mb-4 flex items-center justify-center gap-3">
					<Gamepad2 className="h-10 w-10 text-game-primary" />
					<h1 className="bg-gradient-to-r from-game-primary to-game-secondary bg-clip-text text-4xl font-bold text-transparent">
						RimeCraft
					</h1>
				</div>
				<p className="text-lg text-muted-foreground">
					用对话创造你的 2D 游戏世界
				</p>
			</div>

			{/* Project Name Input */}
			<div className="mb-8 w-full max-w-md">
				<input
					type="text"
					value={projectName}
					onChange={(e) => setProjectName(e.target.value)}
					placeholder="给你的游戏起个名字..."
					className="w-full rounded-xl border border-border bg-card px-6 py-4 text-center text-lg outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
				/>
			</div>

			{/* Template Grid */}
			<div className="mb-8 grid w-full max-w-3xl grid-cols-3 gap-4">
				{TEMPLATES.map((template) => (
					<button
						key={template.id}
						type="button"
						onClick={() => handleCreateProject(template.id)}
						className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-accent"
					>
						<span className="text-4xl">{template.icon}</span>
						<span className="font-medium">{template.name}</span>
						<span className="text-xs text-muted-foreground">
							{template.description}
						</span>
					</button>
				))}
			</div>

			{/* Quick Actions */}
			<div className="flex gap-4">
				<button
					type="button"
					className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
				>
					<FolderOpen className="h-4 w-4" />
					打开项目
				</button>
				<button
					type="button"
					className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
				>
					<Sparkles className="h-4 w-4" />
					导入 .rimecraft 文件
				</button>
			</div>

			{/* Footer */}
			<p className="mt-12 text-xs text-muted-foreground">
				RimeCraft v0.1.0 — 面向青少年的 AI 对话式 2D 游戏开发工具
			</p>
		</div>
	);
}
