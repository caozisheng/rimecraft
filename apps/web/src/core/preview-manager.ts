import { PhaserBridge } from "@rimecraft/phaser-runtime";
import { useGameStore } from "@/stores/game-store";
import { GameCompiler } from "./game-compiler";
import type { ProjectManager } from "./project-manager";

export class PreviewManager {
	private bridge: PhaserBridge;
	private iframe: HTMLIFrameElement | null = null;
	private compiler: GameCompiler;
	private compileTimer: ReturnType<typeof setTimeout> | null = null;
	private onHtmlReady: ((html: string) => void) | null = null;

	constructor(projectManager: ProjectManager) {
		this.bridge = new PhaserBridge();
		this.compiler = new GameCompiler(projectManager.getStorage());

		this.bridge.on("fps", (fps: number) => {
			useGameStore.getState().setFps(fps);
		});

		this.bridge.on("error", (error: string) => {
			useGameStore.getState().addError(error);
		});

		this.bridge.on("ready", () => {
			useGameStore.getState().setRunning(true);
		});
	}

	attachIframe(iframe: HTMLIFrameElement): void {
		this.iframe = iframe;
		this.bridge.attach(iframe);
	}

	detachIframe(): void {
		this.bridge.detach();
		this.iframe = null;
	}

	async execute<T = unknown>(
		method: string,
		args: unknown[] = [],
	): Promise<T> {
		return this.bridge.execute<T>(method, args);
	}

	requestCompilation(): void {
		if (this.compileTimer) {
			clearTimeout(this.compileTimer);
		}
		this.compileTimer = setTimeout(() => {
			this.compileAndReload();
			this.compileTimer = null;
		}, 300);
	}

	async compileAndReload(): Promise<void> {
		try {
			useGameStore.getState().clearErrors();
			useGameStore.getState().setRunning(false);

			const html = await this.compiler.compile();
			if (this.onHtmlReady) {
				this.onHtmlReady(html);
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			useGameStore.getState().addError(`编译失败: ${msg}`);
		}
	}

	setHtmlReadyCallback(cb: (html: string) => void): void {
		this.onHtmlReady = cb;
	}

	reload(): void {
		if (this.iframe) {
			this.iframe.src = this.iframe.src;
		}
	}

	isReady(): boolean {
		return this.bridge.isReady();
	}

	getBridge(): PhaserBridge {
		return this.bridge;
	}

	dispose(): void {
		if (this.compileTimer) {
			clearTimeout(this.compileTimer);
		}
		this.bridge.detach();
	}
}
