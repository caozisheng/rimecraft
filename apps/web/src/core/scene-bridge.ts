import type { SceneObject, SceneObjectBounds } from "./scene-graph";

let _msgId = 0;
function nextMessageId(): string {
	return `msg_${++_msgId}_${Date.now().toString(36)}`;
}

export type BridgeMessageToIframe =
	| { type: "scene_inspect"; messageId?: string }
	| { type: "object_inspect"; id: string; messageId?: string }
	| { type: "object_update"; id: string; props: Partial<SceneObject>; messageId?: string }
	| { type: "object_create"; objectData: SceneObject; messageId?: string }
	| { type: "object_delete"; id: string; messageId?: string }
	| { type: "set_edit_mode"; enabled: boolean; messageId?: string }
	| { type: "request_textures"; messageId?: string }
	| { type: "load_texture"; key: string; url: string; messageId?: string }
	| { type: "generate_texture"; key: string; code: string; messageId?: string }
	| { type: "request_full_state"; messageId?: string };

export type BridgeMessageFromIframe =
	| { type: "scene_tree"; objects: SceneObjectBounds[]; settings: { width: number; height: number }; messageId?: string }
	| { type: "object_props"; id: string; props: Record<string, unknown>; messageId?: string }
	| { type: "object_bounds_update"; updates: SceneObjectBounds[]; messageId?: string }
	| { type: "edit_mode_changed"; enabled: boolean; messageId?: string }
	| { type: "texture_list"; keys: string[]; messageId?: string }
	| { type: "texture_loaded"; key: string; messageId?: string }
	| { type: "full_state"; objects: FullStateObject[]; settings: { width: number; height: number }; messageId?: string };

export interface FullStateObject {
	id: string;
	type: string;
	name: string;
	x: number;
	y: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	originX: number;
	originY: number;
	alpha: number;
	visible: boolean;
	depth: number;
	texture?: string;
	frame?: string | number;
	text?: string;
	tint?: number;
	flipX?: boolean;
	flipY?: boolean;
	width?: number;
	height?: number;
}

type BridgeListener = (msg: BridgeMessageFromIframe) => void;

interface PendingRequest {
	resolve: (msg: BridgeMessageFromIframe) => void;
	timer: ReturnType<typeof setTimeout>;
}

export class SceneBridge {
	private iframe: HTMLIFrameElement | null = null;
	private listeners = new Set<BridgeListener>();
	private boundHandler: ((e: MessageEvent) => void) | null = null;
	private pendingRequests = new Map<string, PendingRequest>();

	attach(iframe: HTMLIFrameElement) {
		this.detach();
		this.iframe = iframe;
		this.boundHandler = (e: MessageEvent) => {
			const data = e.data;
			if (!data || typeof data.type !== "string") return;
			if (
				data.type === "scene_tree" ||
				data.type === "object_props" ||
				data.type === "object_bounds_update" ||
				data.type === "edit_mode_changed" ||
				data.type === "texture_list" ||
				data.type === "texture_loaded" ||
				data.type === "full_state"
			) {
				if (data.messageId && this.pendingRequests.has(data.messageId)) {
					const pending = this.pendingRequests.get(data.messageId)!;
					clearTimeout(pending.timer);
					this.pendingRequests.delete(data.messageId);
					pending.resolve(data as BridgeMessageFromIframe);
				}

				for (const listener of this.listeners) {
					listener(data as BridgeMessageFromIframe);
				}
			}
		};
		window.addEventListener("message", this.boundHandler);
	}

	detach() {
		if (this.boundHandler) {
			window.removeEventListener("message", this.boundHandler);
			this.boundHandler = null;
		}
		this.iframe = null;
		for (const [, pending] of this.pendingRequests) {
			clearTimeout(pending.timer);
		}
		this.pendingRequests.clear();
	}

	onMessage(listener: BridgeListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	send(msg: BridgeMessageToIframe) {
		this.iframe?.contentWindow?.postMessage(msg, "*");
	}

	sendAndWait<T extends BridgeMessageFromIframe>(
		msg: BridgeMessageToIframe,
		timeoutMs = 3000,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const messageId = nextMessageId();
			const timer = setTimeout(() => {
				this.pendingRequests.delete(messageId);
				reject(new Error(`Bridge request timed out: ${msg.type}`));
			}, timeoutMs);
			this.pendingRequests.set(messageId, {
				resolve: resolve as (msg: BridgeMessageFromIframe) => void,
				timer,
			});
			this.send({ ...msg, messageId });
		});
	}

	requestSceneTree() {
		this.send({ type: "scene_inspect" });
	}

	requestObjectProps(id: string) {
		this.send({ type: "object_inspect", id });
	}

	updateObject(id: string, props: Partial<SceneObject>) {
		this.send({ type: "object_update", id, props });
	}

	createObject(objectData: SceneObject) {
		this.send({ type: "object_create", objectData });
	}

	deleteObject(id: string) {
		this.send({ type: "object_delete", id });
	}

	requestTextures() {
		this.send({ type: "request_textures" });
	}

	loadTexture(key: string, url: string) {
		this.send({ type: "load_texture", key, url });
	}

	generateTexture(key: string, code: string) {
		this.send({ type: "generate_texture", key, code });
	}

	setEditMode(enabled: boolean) {
		this.send({ type: "set_edit_mode", enabled });
	}

	requestFullState() {
		this.send({ type: "request_full_state" });
	}

	requestFullStateAsync(): Promise<FullStateObject[]> {
		return this.sendAndWait<Extract<BridgeMessageFromIframe, { type: "full_state" }>>(
			{ type: "request_full_state" },
		).then((msg) => msg.objects).catch(() => []);
	}

	requestSceneTreeAsync() {
		return this.sendAndWait<Extract<BridgeMessageFromIframe, { type: "scene_tree" }>>(
			{ type: "scene_inspect" },
		);
	}

	requestTexturesAsync() {
		return this.sendAndWait<Extract<BridgeMessageFromIframe, { type: "texture_list" }>>(
			{ type: "request_textures" },
		).then((msg) => msg.keys).catch(() => [] as string[]);
	}
}

export const sceneBridge = new SceneBridge();
