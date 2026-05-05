import { EditorLayout } from "@/components/editor/editor-layout";
import { WelcomeScreen } from "@/components/welcome/welcome-screen";
import { useProjectStore } from "@/stores/project-store";

export default function App() {
	const currentProject = useProjectStore((s) => s.currentProject);

	if (!currentProject) {
		return <WelcomeScreen />;
	}

	return <EditorLayout />;
}
