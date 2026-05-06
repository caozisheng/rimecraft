"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { getEditorCore } from "@/core/editor-core";
import { Code2, FileCode, ChevronRight, FileText } from "lucide-react";
import { useI18n } from "@/i18n";

let CodeEditor: React.ComponentType<{
	value: string;
	language?: string;
	readOnly?: boolean;
	onChange?: (value: string) => void;
}> | null = null;

export function CodePanel() {
	const { messages: m } = useI18n();
	const currentFilePath = useEditorStore((s) => s.currentFilePath);
	const setCurrentFilePath = useEditorStore((s) => s.setCurrentFilePath);
	const files = useProjectStore((s) => s.files);
	const [fileContent, setFileContent] = useState<string>("");
	const [editorLoaded, setEditorLoaded] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		import("@rimecraft/code-editor").then((mod) => {
			CodeEditor = mod.CodeEditor;
			setEditorLoaded(true);
		});
	}, []);

	useEffect(() => {
		if (!currentFilePath) return;
		const core = getEditorCore();
		core.project.readFile(currentFilePath).then(setFileContent).catch(() => setFileContent(""));
	}, [currentFilePath]);

	const handleChange = useCallback(
		(value: string) => {
			if (!currentFilePath || saving) return;
			setFileContent(value);
			setSaving(true);
			const core = getEditorCore();
			core.project.writeFile(currentFilePath, value).then(() => {
				core.preview.requestCompilation();
				setSaving(false);
			}).catch(() => setSaving(false));
		},
		[currentFilePath, saving],
	);

	const tsFiles = files
		.filter((f) => f.path.endsWith(".ts") && f.path.startsWith("src/"))
		.sort((a, b) => a.path.localeCompare(b.path));

	return (
		<div className="flex h-full flex-col border-t border-border bg-card">
			<div className="flex items-center gap-2 border-b border-border px-3 py-2">
				<Code2 className="h-3.5 w-3.5 text-muted-foreground" />
				<span className="text-xs font-medium">{m.codePanel.title}</span>
				{currentFilePath && (
					<span className="text-xs text-muted-foreground">— {currentFilePath}</span>
				)}
				{saving && <span className="ml-auto text-xs text-game-warning">{m.codePanel.saving}</span>}
			</div>

			<div className="flex flex-1 overflow-hidden">
				{/* File Tree */}
				<div className="w-48 shrink-0 overflow-y-auto border-r border-border bg-background p-1">
					{tsFiles.map((file) => (
						<button
							key={file.path}
							type="button"
							onClick={() => setCurrentFilePath(file.path)}
							className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors ${
								currentFilePath === file.path
									? "bg-primary/20 text-primary"
									: "text-muted-foreground hover:bg-accent hover:text-foreground"
							}`}
						>
							<FileText className="h-3 w-3 shrink-0" />
							<span className="truncate">{file.path.replace("src/", "")}</span>
						</button>
					))}
					{tsFiles.length === 0 && (
						<p className="p-2 text-xs text-muted-foreground">{m.codePanel.noFiles}</p>
					)}
				</div>

				{/* Editor Area */}
				<div className="flex-1">
					{currentFilePath && editorLoaded && CodeEditor ? (
						<CodeEditor
							value={fileContent}
							language="typescript"
							onChange={handleChange}
						/>
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
							<FileCode className="h-8 w-8 opacity-30" />
							<p className="text-xs">
								{editorLoaded ? m.codePanel.selectFile : m.codePanel.editorLoading}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
