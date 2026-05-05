import { PhaserBridge } from "@rimecraft/phaser-runtime";
import { useGameStore } from "@/stores/game-store";

export class PreviewManager {
	private bridge: PhaserBridge;
	private iframe: HTMLIFrameElement | null = null;

	constructor() {
		this.bridge = new PhaserBridge();

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
		this.bridge.detach();
	}
}
