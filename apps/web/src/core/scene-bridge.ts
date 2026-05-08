import type { SceneObject, SceneObjectBounds } from "./scene-graph";

export type BridgeMessageToIframe =
	| { type: "scene_inspect" }
	| { type: "object_inspect"; id: string }
	| { type: "object_update"; id: string; props: Partial<SceneObject> }
	| { type: "object_create"; objectData: SceneObject }
	| { type: "object_delete"; id: string }
	| { type: "set_edit_mode"; enabled: boolean }
	| { type: "request_textures" }
	| { type: "load_texture"; key: string; url: string }
	| { type: "generate_texture"; key: string; code: string }
	| { type: "request_full_state" };

export type BridgeMessageFromIframe =
	| { type: "scene_tree"; objects: SceneObjectBounds[]; settings: { width: number; height: number } }
	| { type: "object_props"; id: string; props: Record<string, unknown> }
	| { type: "object_bounds_update"; updates: SceneObjectBounds[] }
	| { type: "edit_mode_changed"; enabled: boolean }
	| { type: "texture_list"; keys: string[] }
	| { type: "texture_loaded"; key: string }
	| { type: "full_state"; objects: FullStateObject[]; settings: { width: number; height: number } };

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

export class SceneBridge {
	private iframe: HTMLIFrameElement | null = null;
	private listeners = new Set<BridgeListener>();
	private boundHandler: ((e: MessageEvent) => void) | null = null;

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
	}

	onMessage(listener: BridgeListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	send(msg: BridgeMessageToIframe) {
		this.iframe?.contentWindow?.postMessage(msg, "*");
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
		return new Promise((resolve) => {
			const unsub = this.onMessage((msg) => {
				if (msg.type === "full_state") {
					unsub();
					resolve(msg.objects);
				}
			});
			this.send({ type: "request_full_state" });
			setTimeout(() => { unsub(); resolve([]); }, 3000);
		});
	}
}

export const sceneBridge = new SceneBridge();
