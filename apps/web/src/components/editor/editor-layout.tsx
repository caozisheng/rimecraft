"use client";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ChatPanel } from "./panels/chat-panel";
import { PreviewPanel } from "./panels/preview-panel";
import { CodePanel } from "./panels/code-panel";
import { Inspector } from "./visual/inspector";
import { EditorToolbar } from "./editor-toolbar";
import { useEditorStore } from "@/stores/editor-store";

export function EditorLayout() {
	const codePanelVisible = useEditorStore((s) => s.codePanelVisible);
	const visualMode = useEditorStore((s) => s.visualEditorMode);

	return (
		<div className="flex h-screen flex-col">
			<EditorToolbar />
			<PanelGroup direction="horizontal" className="flex-1">
				<Panel
					defaultSize={40}
					minSize={25}
					maxSize={60}
				>
					<ChatPanel />
				</Panel>
				<PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
				<Panel defaultSize={60} minSize={30}>
					<div className="flex h-full flex-col">
						<div className={codePanelVisible ? "flex-1" : "h-full"}>
							<div className="flex h-full">
								<div className="flex-1">
									<PreviewPanel />
								</div>
								{visualMode && (
									<div className="w-56 shrink-0 overflow-y-auto border-l border-border bg-card">
										<Inspector />
									</div>
								)}
							</div>
						</div>
						{codePanelVisible && (
							<>
								<PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />
								<div className="h-[30%] min-h-[150px]">
									<CodePanel />
								</div>
							</>
						)}
					</div>
				</Panel>
			</PanelGroup>
		</div>
	);
}
