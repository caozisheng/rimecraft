"use client";

import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import {
	Code2,
	Download,
	FolderOpen,
	Play,
	Settings,
	Upload,
} from "lucide-react";

export function EditorToolbar() {
	const project = useProjectStore((s) => s.currentProject);
	const toggleCodePanel = useEditorStore((s) => s.toggleCodePanel);
	const codePanelVisible = useEditorStore((s) => s.codePanelVisible);

	return (
		<div className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
			<div className="flex items-center gap-3">
				<span className="bg-gradient-to-r from-game-primary to-game-secondary bg-clip-text text-lg font-bold text-transparent">
					RimeCraft
				</span>
				{project && (
					<span className="text-sm text-muted-foreground">
						/ {project.name}
					</span>
				)}
			</div>

			<div className="flex items-center gap-1">
				<ToolbarButton
					icon={<FolderOpen className="h-4 w-4" />}
					label="模板库"
				/>
				<ToolbarButton
					icon={<Upload className="h-4 w-4" />}
					label="素材库"
				/>
				<ToolbarButton
					icon={<Code2 className="h-4 w-4" />}
					label="代码"
					active={codePanelVisible}
					onClick={toggleCodePanel}
				/>
				<ToolbarButton
					icon={<Download className="h-4 w-4" />}
					label="导出"
				/>
				<ToolbarButton
					icon={<Play className="h-4 w-4" />}
					label="发布"
				/>
				<div className="mx-2 h-6 w-px bg-border" />
				<ToolbarButton
					icon={<Settings className="h-4 w-4" />}
					label="设置"
				/>
			</div>
		</div>
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
