import { describe, test, expect } from "bun:test";
import { createVisualCommand, type VisualUndoEntry } from "../visual-commands";

describe("createVisualCommand", () => {
	test("returns a command with correct id and name for update", () => {
		const entry: VisualUndoEntry = {
			type: "update",
			objectId: "obj_1",
			oldProps: { x: 0 },
			newProps: { x: 100 },
		};
		const cmd = createVisualCommand(entry);
		expect(cmd.id).toMatch(/^visual_\d+$/);
		expect(cmd.name).toBe("visual_update: obj_1");
		expect(cmd.source).toBe("visual");
	});

	test("returns a command with correct name for create", () => {
		const entry: VisualUndoEntry = {
			type: "create",
			objectId: "obj_2",
			objectSnapshot: {
				id: "obj_2",
				type: "sprite",
				name: "test",
				x: 10,
				y: 20,
			},
		};
		const cmd = createVisualCommand(entry);
		expect(cmd.name).toBe("visual_create: obj_2");
	});

	test("returns a command with correct name for delete", () => {
		const entry: VisualUndoEntry = {
			type: "delete",
			objectId: "obj_3",
			objectSnapshot: {
				id: "obj_3",
				type: "text",
				name: "label",
				x: 50,
				y: 50,
			},
		};
		const cmd = createVisualCommand(entry);
		expect(cmd.name).toBe("visual_delete: obj_3");
	});

	test("execute and undo are async functions", () => {
		const entry: VisualUndoEntry = {
			type: "update",
			objectId: "obj_1",
			oldProps: { x: 0 },
			newProps: { x: 100 },
		};
		const cmd = createVisualCommand(entry);
		expect(typeof cmd.execute).toBe("function");
		expect(typeof cmd.undo).toBe("function");
	});

	test("unique ids for sequential commands", () => {
		const e1: VisualUndoEntry = { type: "update", objectId: "a", oldProps: {}, newProps: {} };
		const e2: VisualUndoEntry = { type: "update", objectId: "b", oldProps: {}, newProps: {} };
		const cmd1 = createVisualCommand(e1);
		const cmd2 = createVisualCommand(e2);
		expect(cmd1.id).not.toBe(cmd2.id);
	});
});
