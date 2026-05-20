import pkg from "../../package.json";

const GITHUB_REPO = "caozisheng/rimecraft";
const CURRENT_VERSION = pkg.version;

export interface UpdateCheckResult {
	hasUpdate: boolean;
	currentVersion: string;
	latestVersion: string;
	downloadUrl: string;
}

function compareVersions(a: string, b: string): number {
	const pa = a.replace(/^v/, "").split(".").map(Number);
	const pb = b.replace(/^v/, "").split(".").map(Number);
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const na = pa[i] ?? 0;
		const nb = pb[i] ?? 0;
		if (na !== nb) return na - nb;
	}
	return 0;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
	const res = await fetch(
		`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
		{ headers: { Accept: "application/vnd.github.v3+json" } },
	);
	if (!res.ok) throw new Error(`GitHub API ${res.status}`);
	const data = await res.json();
	const latestVersion = (data.tag_name as string).replace(/^v/, "");
	return {
		hasUpdate: compareVersions(CURRENT_VERSION, latestVersion) < 0,
		currentVersion: CURRENT_VERSION,
		latestVersion,
		downloadUrl: data.html_url as string,
	};
}

export function getCurrentVersion(): string {
	return CURRENT_VERSION;
}

export function openDownloadPage(url: string): void {
	window.open(url, "_blank");
}
