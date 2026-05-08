"use client";

import { useState, useCallback } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import { getEditorCore } from "@/core/editor-core";
import {
	Code2,
	Download,
	Home,
	Palette,
	Pencil,
	Settings,
	Upload,
} from "lucide-react";
import { LLMSettingsDialog } from "./llm-settings-dialog";
import { AssetLibraryDialog } from "./asset-library-dialog";
import { useI18n } from "@/i18n";

export function EditorToolbar() {
	const { messages: m } = useI18n();
	const project = useProjectStore((s) => s.currentProject);
	const closeProject = useProjectStore((s) => s.closeProject);
	const toggleCodePanel = useEditorStore((s) => s.toggleCodePanel);
	const codePanelVisible = useEditorStore((s) => s.codePanelVisible);
	const visualMode = useEditorStore((s) => s.visualEditorMode);
	const toggleVisual = useEditorStore((s) => s.toggleVisualEditorMode);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [assetLibOpen, setAssetLibOpen] = useState(false);
	const [exporting, setExporting] = useState(false);

	const handleExport = useCallback(async () => {
		if (exporting || !project) return;
		setExporting(true);
		try {
			const core = getEditorCore();
			await core.project.downloadExport(`${project.name}.rimecraft.zip`);
		} catch (e) {
			console.error("Export failed:", e);
		} finally {
			setExporting(false);
		}
	}, [exporting, project]);

	const handleImport = useCallback(() => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".rimecraft,.zip";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const core = getEditorCore();
				const imported = await core.project.importProject(file);
				await core.project.openProject(imported.meta.id);
			} catch (e) {
				console.error("Import failed:", e);
			}
		};
		input.click();
	}, []);

	return (
		<>
			<div className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={closeProject}
						className="flex items-center gap-2 transition-colors hover:opacity-80"
						title={m.toolbar.backHome}
					>
						<span className="bg-gradient-to-r from-game-primary to-game-secondary bg-clip-text text-lg font-bold text-transparent">
							RimeCraft
						</span>
					</button>
					{project && (
						<span className="text-sm text-muted-foreground">
							/ {project.name}
						</span>
					)}
				</div>

				<div className="flex items-center gap-1">
					<ToolbarButton
						icon={<Home className="h-4 w-4" />}
						label={m.toolbar.home}
						onClick={closeProject}
					/>
					<ToolbarButton
						icon={<Upload className="h-4 w-4" />}
						label={m.toolbar.import}
						onClick={handleImport}
					/>
					<ToolbarButton
						icon={<Code2 className="h-4 w-4" />}
						label={m.toolbar.code}
						active={codePanelVisible}
						onClick={toggleCodePanel}
					/>
					<ToolbarButton
						icon={<Pencil className="h-4 w-4" />}
						label={m.toolbar.visualEditor}
						active={visualMode}
						onClick={toggleVisual}
					/>
					<ToolbarButton
						icon={<Palette className="h-4 w-4" />}
						label={m.toolbar.assetLib}
						onClick={() => setAssetLibOpen(true)}
					/>
					<ToolbarButton
						icon={<Download className="h-4 w-4" />}
						label={exporting ? m.toolbar.exporting : m.toolbar.export}
						onClick={handleExport}
					/>
					<div className="mx-2 h-6 w-px bg-border" />
					<ToolbarButton
						icon={<Settings className="h-4 w-4" />}
						label={m.common.settings}
						onClick={() => setSettingsOpen(true)}
					/>
				</div>
			</div>

			<LLMSettingsDialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
			/>
			<AssetLibraryDialog
				open={assetLibOpen}
				onOpenChange={setAssetLibOpen}
			/>
		</>
	);
}

function ToolbarButton({
	icon,
	label,
	active,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	active?: boolean;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
				active
					? "bg-primary/20 text-primary"
					: "text-muted-foreground hover:bg-accent hover:text-foreground"
			}`}
		>
			{icon}
			<span>{label}</span>
		</button>
	);
}
