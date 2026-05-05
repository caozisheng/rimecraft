"use client";

import { useEditorStore } from "@/stores/editor-store";
import { Code2, FileCode } from "lucide-react";

export function CodePanel() {
	const currentFilePath = useEditorStore((s) => s.currentFilePath);

	return (
		<div className="flex h-full flex-col border-t border-border bg-card">
			{/* Code Panel Header */}
			<div className="flex items-center gap-2 border-b border-border px-3 py-2">
				<Code2 className="h-3.5 w-3.5 text-muted-foreground" />
				<span className="text-xs font-medium">代码编辑器</span>
				{currentFilePath && (
					<span className="text-xs text-muted-foreground">
						— {currentFilePath}
					</span>
				)}
			</div>

			{/* Code Editor Placeholder */}
			<div className="flex flex-1 items-center justify-center">
				{currentFilePath ? (
					<div className="h-full w-full bg-[#1e1e1e] p-4 font-mono text-xs text-[#d4d4d4]">
						{/* Monaco Editor will be mounted here */}
						<p className="text-muted-foreground">
							Monaco Editor 加载中...
						</p>
					</div>
				) : (
					<div className="flex flex-col items-center gap-2 text-muted-foreground">
						<FileCode className="h-8 w-8 opacity-30" />
						<p className="text-xs">
							在文件树中选择文件来查看代码
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
