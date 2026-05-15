"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@rimecraft/ui";
import { Button } from "@rimecraft/ui";
import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n/locale";
import { useProjectStore } from "@/stores/project-store";
import { generateTemplateFiles } from "@/lib/templates";
import { getEditorCore } from "@/core/editor-core";
import {
	checkForUpdates,
	getCurrentVersion,
	openDownloadPage,
	type UpdateCheckResult,
} from "@/lib/update-checker";

export function LLMSettingsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { messages: m, locale, setLocale } = useI18n();

	const [updateStatus, setUpdateStatus] = useState<
		"idle" | "checking" | "latest" | "available" | "error"
	>("idle");
	const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);

	const handleCheckUpdate = async () => {
		setUpdateStatus("checking");
		try {
			const result = await checkForUpdates();
			setUpdateResult(result);
			setUpdateStatus(result.hasUpdate ? "available" : "latest");
		} catch {
			setUpdateStatus("error");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border-border bg-card">
				<DialogHeader>
					<DialogTitle>{m.settings.title}</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					{/* Language */}
					<div className="grid gap-1.5">
						<label className="text-sm font-medium">
							{m.settings.language}
						</label>
						<div className="flex gap-2">
							{(["zh", "en", "ja"] as Locale[]).map((l) => (
								<button
									key={l}
									type="button"
									onClick={async () => {
										setLocale(l);
										const meta = useProjectStore.getState().currentProject;
										if (!meta?.template) return;
										const core = getEditorCore();
										const storage = core.project.getStorage();
										const newFiles = generateTemplateFiles(meta);
										for (const f of newFiles) {
											await storage.writeFile(meta.id, f.path, f.content);
										}
										const fileEntries = await storage.listFiles(meta.id);
										useProjectStore.getState().setFiles(fileEntries);
										core.preview.requestCompilation();
									}}
									className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
										locale === l
											? "bg-primary text-primary-foreground"
											: "border border-border bg-card text-foreground hover:bg-accent"
									}`}
								>
									{l === "zh" ? "中文" : l === "ja" ? "日本語" : "English"}
								</button>
							))}
						</div>
					</div>

					{/* Update check */}
					<div className="grid gap-1.5 border-t border-border pt-4">
						<label className="text-sm font-medium">
							{m.settings.update}
						</label>
						<div className="flex items-center gap-3">
							<span className="text-xs text-muted-foreground">
								{m.settings.currentVersion}: v{getCurrentVersion()}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={handleCheckUpdate}
								disabled={updateStatus === "checking"}
								className="h-7 text-xs"
							>
								{updateStatus === "checking"
									? m.settings.checking
									: m.settings.checkUpdate}
							</Button>
						</div>
						{updateStatus === "latest" && (
							<p className="text-xs text-green-500">
								{m.settings.latestVersion}
							</p>
						)}
						{updateStatus === "available" && updateResult && (
							<div className="flex items-center gap-2">
								<p className="text-xs text-yellow-500">
									{m.settings.newVersion.replace(
										"{version}",
										`v${updateResult.latestVersion}`,
									)}
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => openDownloadPage(updateResult.downloadUrl)}
									className="h-7 text-xs"
								>
									{m.settings.download}
								</Button>
							</div>
						)}
						{updateStatus === "error" && (
							<p className="text-xs text-red-500">
								{m.settings.checkFailed}
							</p>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
