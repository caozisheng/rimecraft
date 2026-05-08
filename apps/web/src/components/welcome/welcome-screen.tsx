"use client";

import { useState } from "react";
import { getEditorCore } from "@/core/editor-core";
import { Gamepad2, FolderOpen, Sparkles, Settings } from "lucide-react";
import { useI18n } from "@/i18n";
import { LLMSettingsDialog } from "@/components/editor/llm-settings-dialog";

const TEMPLATES = [
	{ id: "endless-runner" as const, icon: "🦕" },
	{ id: "platformer" as const, icon: "🍄" },
	{ id: "space-shooter" as const, icon: "🚀" },
	{ id: "rpg" as const, icon: "⚔️" },
	{ id: "puzzle" as const, icon: "🧩" },
	{ id: "breakout" as const, icon: "🧱" },
	{ id: "blank" as const, icon: "✨" },
];

export function WelcomeScreen() {
	const { messages: m } = useI18n();
	const [projectName, setProjectName] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

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
				// importProject returns a Project but doesn't set it in the store
				// The openProject path inside importProject handles store updates
				// We need to open it explicitly
				await core.project.openProject(project.meta.id);
			} catch (e) {
				console.error("Failed to import project:", e);
				setIsCreating(false);
			}
		};
		input.click();
	};

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
			{/* Settings Button */}
			<button
				type="button"
				onClick={() => setSettingsOpen(true)}
				className="absolute right-6 top-6 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
			>
				<Settings className="h-4 w-4" />
				{m.common.settings}
			</button>
			<LLMSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

			{/* Logo */}
			<div className="mb-8 text-center">
				<div className="mb-4 flex items-center justify-center gap-3">
					<Gamepad2 className="h-10 w-10 text-game-primary" />
					<h1 className="bg-gradient-to-r from-game-primary to-game-secondary bg-clip-text text-4xl font-bold text-transparent">
						RimeCraft
					</h1>
				</div>
				<p className="text-lg text-muted-foreground">
					{m.welcome.tagline}
				</p>
			</div>

			{/* Project Name Input */}
			<div className="mb-8 w-full max-w-md">
				<input
					type="text"
					value={projectName}
					onChange={(e) => setProjectName(e.target.value)}
					placeholder={m.welcome.inputPlaceholder}
					disabled={isCreating}
					className="w-full rounded-xl border border-border bg-card px-6 py-4 text-center text-lg outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
				/>
			</div>

			{/* Template Grid */}
			<div className="mb-8 grid w-full max-w-3xl grid-cols-3 gap-4">
				{TEMPLATES.map((template) => (
					<button
						key={template.id}
						type="button"
						disabled={isCreating}
						onClick={() => handleCreateProject(template.id)}
						className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-accent disabled:opacity-50"
					>
						<span className="text-4xl">{template.icon}</span>
						<span className="font-medium">{m.welcome.templates[template.id]?.name}</span>
						<span className="text-xs text-muted-foreground">
							{m.welcome.templates[template.id]?.description}
						</span>
					</button>
				))}
			</div>

			{/* Quick Actions */}
			<div className="flex gap-4">
				<button
					type="button"
					disabled={isCreating}
					onClick={handleImportProject}
					className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
				>
					<FolderOpen className="h-4 w-4" />
					{m.welcome.openProject}
				</button>
				<button
					type="button"
					disabled={isCreating}
					onClick={handleImportProject}
					className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
				>
					<Sparkles className="h-4 w-4" />
					{m.welcome.importFile}
				</button>
			</div>

			{isCreating && (
				<p className="mt-4 text-sm text-muted-foreground animate-pulse">
					{m.welcome.creating}
				</p>
			)}

			{/* Footer */}
			<p className="mt-12 text-xs text-muted-foreground">
				{m.welcome.footer}
			</p>
		</div>
	);
}
