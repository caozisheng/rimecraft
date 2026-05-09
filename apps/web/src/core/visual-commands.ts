import type { Command } from "./command-manager";
import { sceneBridge } from "./scene-bridge";
import type { SceneObject } from "./scene-graph";

export interface VisualUndoEntry {
	type: "update" | "create" | "delete";
	objectId: string;
	oldProps?: Partial<SceneObject>;
	newProps?: Partial<SceneObject>;
	objectSnapshot?: SceneObject;
}

let visualSeq = 0;

export function createVisualCommand(entry: VisualUndoEntry): Command {
	return {
		id: `visual_${++visualSeq}`,
		name: `visual_${entry.type}: ${entry.objectId}`,
		source: "visual",
		async execute() {
			switch (entry.type) {
				case "update":
					if (entry.newProps) sceneBridge.updateObject(entry.objectId, entry.newProps);
					break;
				case "create":
					if (entry.objectSnapshot) sceneBridge.createObject(entry.objectSnapshot);
					break;
				case "delete":
					sceneBridge.deleteObject(entry.objectId);
					break;
			}
			sceneBridge.requestSceneTree();
		},
		async undo() {
			switch (entry.type) {
				case "update":
					if (entry.oldProps) sceneBridge.updateObject(entry.objectId, entry.oldProps);
					break;
				case "create":
					sceneBridge.deleteObject(entry.objectId);
					break;
				case "delete":
					if (entry.objectSnapshot) sceneBridge.createObject(entry.objectSnapshot);
					break;
			}
			sceneBridge.requestSceneTree();
		},
	};
}
