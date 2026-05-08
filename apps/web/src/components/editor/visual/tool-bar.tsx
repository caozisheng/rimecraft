"use client";

import { useVisualEditorStore, type EditorTool, type AddObjectType } from "@/stores/visual-editor-store";
import { useI18n } from "@/i18n";
import { sceneBridge } from "@/core/scene-bridge";
import { MousePointer2, Plus, Grid3x3, Trash2, Type, ImageIcon, Film } from "lucide-react";
import { useState } from "react";

const TOOLS: { key: EditorTool; icon: typeof MousePointer2; labelKey: string }[] = [
	{ key: "select", icon: MousePointer2, labelKey: "select" },
];

const ADD_TYPES: { key: AddObjectType; icon: typeof Type; labelKey: string }[] = [
	{ key: "text", icon: Type, labelKey: "addText" },
	{ key: "image", icon: ImageIcon, labelKey: "addImage" },
	{ key: "sprite", icon: Film, labelKey: "addSprite" },
];

export function VisualToolBar() {
	const { messages: m } = useI18n();
	const tool = useVisualEditorStore((s) => s.tool);
	const setTool = useVisualEditorStore((s) => s.setTool);
	const addObjectType = useVisualEditorStore((s) => s.addObjectType);
	const setAddObjectType = useVisualEditorStore((s) => s.setAddObjectType);
	const snapToGrid = useVisualEditorStore((s) => s.snapToGrid);
	const toggleSnap = useVisualEditorStore((s) => s.toggleSnapToGrid);
	const selectedIds = useVisualEditorStore((s) => s.selectedObjectIds);
	const [showAddMenu, setShowAddMenu] = useState(false);

	const handleDelete = () => {
		for (const id of selectedIds) {
			sceneBridge.deleteObject(id);
		}
		useVisualEditorStore.getState().selectObject(null);
		sceneBridge.requestSceneTree();
	};

	const handleAddType = (type: AddObjectType) => {
		setAddObjectType(type);
		setTool("add");
		setShowAddMenu(false);
	};

	return (
		<div className="flex items-center gap-0.5 rounded-lg border border-border bg-card/90 p-1 shadow-sm backdrop-blur-sm">
			{TOOLS.map(({ key, icon: Icon, labelKey }) => (
				<button
					key={key}
					type="button"
					title={(m.visualEditor as Record<string, string>)[labelKey]}
					onClick={() => setTool(key)}
					className={`rounded-md p-1.5 transition-colors ${
						tool === key
							? "bg-primary/20 text-primary"
							: "text-muted-foreground hover:bg-accent hover:text-foreground"
					}`}
				>
					<Icon className="h-4 w-4" />
				</button>
			))}

			{/* Add button with dropdown */}
			<div className="relative">
				<button
					type="button"
					title={m.visualEditor.add}
					onClick={() => setShowAddMenu(!showAddMenu)}
					className={`rounded-md p-1.5 transition-colors ${
						tool === "add"
							? "bg-primary/20 text-primary"
							: "text-muted-foreground hover:bg-accent hover:text-foreground"
					}`}
				>
					<Plus className="h-4 w-4" />
				</button>
				{showAddMenu && (
					<div className="absolute left-0 top-full z-30 mt-1 rounded-lg border border-border bg-card p-1 shadow-lg">
						{ADD_TYPES.map(({ key, icon: Icon, labelKey }) => (
							<button
								key={key}
								type="button"
								onClick={() => handleAddType(key)}
								className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
									tool === "add" && addObjectType === key
										? "bg-primary/20 text-primary"
										: "text-muted-foreground hover:bg-accent hover:text-foreground"
								}`}
							>
								<Icon className="h-3.5 w-3.5" />
								{(m.visualEditor as Record<string, string>)[labelKey]}
							</button>
						))}
					</div>
				)}
			</div>

			<div className="mx-1 h-5 w-px bg-border" />
			<button
				type="button"
				title={m.visualEditor.snapToGrid}
				onClick={toggleSnap}
				className={`rounded-md p-1.5 transition-colors ${
					snapToGrid
						? "bg-primary/20 text-primary"
						: "text-muted-foreground hover:bg-accent hover:text-foreground"
				}`}
			>
				<Grid3x3 className="h-4 w-4" />
			</button>
			{selectedIds.length > 0 && (
				<>
					<div className="mx-1 h-5 w-px bg-border" />
					<button
						type="button"
						title={m.visualEditor.delete}
						onClick={handleDelete}
						className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				</>
			)}
		</div>
	);
}
