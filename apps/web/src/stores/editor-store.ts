import { create } from "zustand";

interface EditorState {
	activePanel: "chat" | "code" | "preview";
	chatPanelWidth: number;
	codePanelVisible: boolean;
	codePanelHeight: number;
	previewMode: "play" | "pause" | "stop";
	currentFilePath: string | null;
	showFileTree: boolean;

	setActivePanel: (panel: "chat" | "code" | "preview") => void;
	setChatPanelWidth: (width: number) => void;
	toggleCodePanel: () => void;
	setCodePanelVisible: (visible: boolean) => void;
	setPreviewMode: (mode: "play" | "pause" | "stop") => void;
	setCurrentFilePath: (path: string | null) => void;
	toggleFileTree: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
	activePanel: "chat",
	chatPanelWidth: 40,
	codePanelVisible: false,
	codePanelHeight: 30,
	previewMode: "stop",
	currentFilePath: null,
	showFileTree: false,

	setActivePanel: (activePanel) => set({ activePanel }),
	setChatPanelWidth: (chatPanelWidth) => set({ chatPanelWidth }),
	toggleCodePanel: () =>
		set((s) => ({ codePanelVisible: !s.codePanelVisible })),
	setCodePanelVisible: (codePanelVisible) =>
		set({ codePanelVisible }),
	setPreviewMode: (previewMode) => set({ previewMode }),
	setCurrentFilePath: (currentFilePath) =>
		set({ currentFilePath }),
	toggleFileTree: () =>
		set((s) => ({ showFileTree: !s.showFileTree })),
}));
