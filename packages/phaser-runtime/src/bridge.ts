import { EventEmitter } from "eventemitter3";

export interface BridgeCommand {
	type: "execute";
	id: string;
	method: string;
	args: unknown[];
}

export interface BridgeResponse {
	type: "result";
	id: string;
	ok: boolean;
	data?: unknown;
	error?: string;
}

export interface BridgeEvent {
	type: "event";
	event: "error" | "fps" | "state_change" | "scene_change" | "ready";
	data: unknown;
}

type BridgeMessage = BridgeResponse | BridgeEvent;

export class PhaserBridge extends EventEmitter {
	private iframe: HTMLIFrameElement | null = null;
	private pendingRequests = new Map<
		string,
		{
			resolve: (value: unknown) => void;
			reject: (reason: Error) => void;
			timeout: ReturnType<typeof setTimeout>;
		}
	>();
	private requestCounter = 0;
	private ready = false;

	constructor() {
		super();
		this.handleMessage = this.handleMessage.bind(this);
	}

	attach(iframe: HTMLIFrameElement): void {
		this.iframe = iframe;
		window.addEventListener("message", this.handleMessage);
	}

	detach(): void {
		window.removeEventListener("message", this.handleMessage);
		for (const [, pending] of this.pendingRequests) {
			clearTimeout(pending.timeout);
			pending.reject(new Error("Bridge detached"));
		}
		this.pendingRequests.clear();
		this.iframe = null;
		this.ready = false;
	}

	isReady(): boolean {
		return this.ready;
	}

	async execute<T = unknown>(method: string, args: unknown[] = []): Promise<T> {
		if (!this.iframe?.contentWindow) {
			throw new Error("Bridge not attached to iframe");
		}

		const id = `req_${++this.requestCounter}`;
		const command: BridgeCommand = { type: "execute", id, method, args };

		return new Promise<T>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error(`Bridge request timeout: ${method}`));
			}, 10000);

			this.pendingRequests.set(id, {
				resolve: resolve as (value: unknown) => void,
				reject,
				timeout,
			});

			this.iframe!.contentWindow!.postMessage(command, "*");
		});
	}

	private handleMessage(event: MessageEvent): void {
		const msg = event.data as BridgeMessage;
		if (!msg || typeof msg !== "object" || !("type" in msg)) return;

		if (msg.type === "result") {
			const pending = this.pendingRequests.get(msg.id);
			if (!pending) return;

			clearTimeout(pending.timeout);
			this.pendingRequests.delete(msg.id);

			if (msg.ok) {
				pending.resolve(msg.data);
			} else {
				pending.reject(new Error(msg.error ?? "Unknown bridge error"));
			}
		} else if (msg.type === "event") {
			if (msg.event === "ready") {
				this.ready = true;
			}
			this.emit(msg.event, msg.data);
		}
	}
}
