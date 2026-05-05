import * as React from "react";

interface MonacoEditorPlaceholderProps {
	value?: string;
	language?: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
}

export function MonacoEditorPlaceholder({
	value = "",
	language = "typescript",
	readOnly = false,
}: MonacoEditorPlaceholderProps) {
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				backgroundColor: "#1e1e1e",
				color: "#d4d4d4",
				fontFamily: "monospace",
				fontSize: "13px",
				padding: "16px",
				overflow: "auto",
				whiteSpace: "pre-wrap",
			}}
		>
			{value || `// Monaco Editor (${language}) - ${readOnly ? "只读" : "可编辑"}`}
		</div>
	);
}
