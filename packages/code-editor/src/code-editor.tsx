"use client";

import { useRef, useCallback } from "react";
import MonacoEditor, { type OnMount, type OnChange } from "@monaco-editor/react";
import type * as MonacoTypes from "monaco-editor";

interface CodeEditorProps {
	value: string;
	language?: string;
	readOnly?: boolean;
	onChange?: (value: string) => void;
}

export function CodeEditor({
	value,
	language = "typescript",
	readOnly = false,
	onChange,
}: CodeEditorProps) {
	const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null);

	const handleMount: OnMount = useCallback((editor, monaco) => {
		editorRef.current = editor;

		monaco.editor.defineTheme("rimecraft-dark", {
			base: "vs-dark",
			inherit: true,
			rules: [],
			colors: {
				"editor.background": "#1a1a2e",
				"editor.foreground": "#e8e8f0",
				"editorLineNumber.foreground": "#4a4a6a",
				"editor.selectionBackground": "#7c3aed40",
				"editor.lineHighlightBackground": "#2a2a4a",
			},
		});
		monaco.editor.setTheme("rimecraft-dark");
	}, []);

	const handleChange: OnChange = useCallback(
		(val) => {
			if (val !== undefined) {
				onChange?.(val);
			}
		},
		[onChange],
	);

	return (
		<MonacoEditor
			value={value}
			language={language}
			theme="vs-dark"
			onChange={handleChange}
			onMount={handleMount}
			options={{
				readOnly,
				minimap: { enabled: false },
				fontSize: 13,
				lineNumbers: "on",
				scrollBeyondLastLine: false,
				automaticLayout: true,
				tabSize: 2,
				wordWrap: "on",
				padding: { top: 8, bottom: 8 },
				renderLineHighlight: "line",
				scrollbar: {
					verticalScrollbarSize: 8,
					horizontalScrollbarSize: 8,
				},
			}}
			loading={
				<div className="flex h-full items-center justify-center text-gray-500">
					加载编辑器...
				</div>
			}
		/>
	);
}
