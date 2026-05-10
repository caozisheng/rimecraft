"use client";

import { useState, useEffect } from "react";
import { getEditorCore } from "@/core/editor-core";
import {
	Gamepad2,
	FolderOpen,
	Sparkles,
	Settings,
	Trash2,
	Clock,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { LLMSettingsDialog } from "@/components/editor/llm-settings-dialog";
import type { ProjectMeta } from "@rimecraft/core";

const TEMPLATES = [
	{ id: "endless-runner" as const, icon: "🦕" },
	{ id: "platformer" as const, icon: "🍄" },
	{ id: "space-shooter" as const, icon: "🚀" },
	{ id: "rpg" as const, icon: "⚔️" },
	{ id: "puzzle" as const, icon: "🧩" },
	{ id: "breakout" as const, icon: "🧱" },
	{ id: "blank" as const, icon: "✨" },
];

function formatRelativeTime(isoString: string, locale: string): string {
	const date = new Date(isoString);
	const now = Date.now();
	const diffMs = now - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	const diffHour = Math.floor(diffMs / 3600000);
	const diffDay = Math.floor(diffMs / 86400000);

	if (locale === "zh") {
		if (diffMin < 1) return "刚刚";
		if (diffMin < 60) return `${diffMin} 分钟前`;
		if (diffHour < 24) return `${diffHour} 小时前`;
		if (diffDay < 30) return `${diffDay} 天前`;
		return date.toLocaleDateString("zh-CN");
	}
	if (locale === "ja") {
		if (diffMin < 1) return "たった今";
		if (diffMin < 60) return `${diffMin} 分前`;
		if (diffHour < 24) return `${diffHour} 時間前`;
		if (diffDay < 30) return `${diffDay} 日前`;
		return date.toLocaleDateString("ja-JP");
	}
	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHour < 24) return `${diffHour}h ago`;
	if (diffDay < 30) return `${diffDay}d ago`;
	return date.toLocaleDateString("en-US");
}

function getTemplateIcon(templateId?: string): string {
	const t = TEMPLATES.find((t) => t.id === templateId);
	return t?.icon ?? "🎮";
}

export function WelcomeScreen() {
	const { messages: m, locale } = useI18n();
	const [projectName, setProjectName] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [projects, setProjects] = useState<ProjectMeta[]>([]);

	useEffect(() => {
		const core = getEditorCore();
		core.project.listProjects().then(setProjects).catch(console.error);
	}, []);

	const handleCreateProject = async (templateId: string) => {
		if (isCreating) return;
		setIsCreating(true);

		try {
			const name = projectName.trim() || m.welcome.defaultName;
			const meta = {
				id: `proj_${Date.now().toString(36)}`,
				name,
				template: templateId,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				tags: [] as string[],
			};

			const core = getEditorCore();
			await core.project.createProject(meta);
		} catch (e) {
			console.error("Failed to create project:", e);
			setIsCreating(false);
		}
	};

	const handleOpenProject = async (id: string) => {
		if (isCreating) return;
		setIsCreating(true);
		try {
			const core = getEditorCore();
			await core.project.openProject(id);
		} catch (e) {
			console.error("Failed to open project:", e);
			setIsCreating(false);
		}
	};

	const handleDeleteProject = async (id: string, name: string) => {
		const msg = (m.welcome.deleteConfirm as string).replace("{name}", name);
		if (!window.confirm(msg)) return;
		try {
			const core = getEditorCore();
			await core.project.deleteProject(id);
			setProjects((prev) => prev.filter((p) => p.id !== id));
		} catch (e) {
			console.error("Failed to delete project:", e);
		}
	};

	const handleImportProject = async () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".rimecraft,.zip";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;

			try {
				setIsCreating(true);
				const core = getEditorCore();
				const project = await core.project.importProject(file);
				await core.project.openProject(project.meta.id);
			} catch (e) {
				console.error("Failed to import project:", e);
				setIsCreating(false);
			}
		};
		input.click();
	};

	const sortedProjects = [...projects].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{/* Settings Button */}
			<button
				type="button"
				onClick={() => setSettingsOpen(true)}
				className="absolute right-6 top-6 z-10 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
			>
				<Settings className="h-4 w-4" />
				{m.common.settings}
			</button>
			<LLMSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

			{/* ===== Top: Templates ===== */}
			<section className="flex flex-col items-center border-b border-border px-8 pb-8 pt-12">
				{/* Logo */}
				<div className="mb-6 text-center">
					<div className="mb-2 flex items-center justify-center gap-3">
						<Gamepad2 className="h-8 w-8 text-game-primary" />
						<h1 className="bg-gradient-to-r from-game-primary to-game-secondary bg-clip-text text-3xl font-bold text-transparent">
							RimeCraft
						</h1>
					</div>
					<p className="text-sm text-muted-foreground">
						{m.welcome.tagline}
					</p>
				</div>

				{/* Project Name Input */}
				<div className="mb-6 w-full max-w-md">
					<input
						type="text"
						value={projectName}
						onChange={(e) => setProjectName(e.target.value)}
						placeholder={m.welcome.inputPlaceholder}
						disabled={isCreating}
						className="w-full rounded-xl border border-border bg-card px-5 py-3 text-center text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
					/>
				</div>

				{/* Template Grid */}
				<div className="mb-4 grid w-full max-w-4xl grid-cols-4 gap-3 sm:grid-cols-7">
					{TEMPLATES.map((template) => (
						<button
							key={template.id}
							type="button"
							disabled={isCreating}
							onClick={() => handleCreateProject(template.id)}
							className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-accent disabled:opacity-50"
						>
							<span className="text-3xl">{template.icon}</span>
							<span className="text-xs font-medium leading-tight">
								{m.welcome.templates[template.id]?.name}
							</span>
						</button>
					))}
				</div>

				{/* Quick Actions */}
				<div className="flex gap-3">
					<button
						type="button"
						disabled={isCreating}
						onClick={handleImportProject}
						className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
					>
						<FolderOpen className="h-3.5 w-3.5" />
						{m.welcome.openProject}
					</button>
					<button
						type="button"
						disabled={isCreating}
						onClick={handleImportProject}
						className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
					>
						<Sparkles className="h-3.5 w-3.5" />
						{m.welcome.importFile}
					</button>
				</div>

				{isCreating && (
					<p className="mt-3 text-sm text-muted-foreground animate-pulse">
						{m.welcome.creating}
					</p>
				)}
			</section>

			{/* ===== Bottom: My Projects ===== */}
			<section className="flex flex-1 flex-col px-8 py-6">
				<h2 className="mb-4 text-lg font-semibold">{m.welcome.myProjects}</h2>

				{sortedProjects.length === 0 ? (
					<div className="flex flex-1 items-center justify-center">
						<p className="text-sm text-muted-foreground">
							{m.welcome.noProjects}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{sortedProjects.map((project) => (
							<div
								key={project.id}
								role="button"
								tabIndex={isCreating ? -1 : 0}
								aria-disabled={isCreating}
								onClick={() => !isCreating && handleOpenProject(project.id)}
								onKeyDown={(e) => { if (!isCreating && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleOpenProject(project.id); } }}
								className="group relative flex cursor-pointer items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-accent aria-disabled:pointer-events-none aria-disabled:opacity-50"
							>
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
									{getTemplateIcon(project.template)}
								</span>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">{project.name}</p>
									<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
										<Clock className="h-3 w-3" />
										{formatRelativeTime(project.updatedAt, locale)}
									</p>
								</div>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleDeleteProject(project.id, project.name);
									}}
									className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
									title={m.welcome.deleteProject}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						))}
					</div>
				)}
			</section>

			{/* Footer */}
			<footer className="px-8 pb-4 text-center text-xs text-muted-foreground">
				{m.welcome.footer}
			</footer>
		</div>
	);
}
