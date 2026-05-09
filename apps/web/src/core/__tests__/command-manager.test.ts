import { describe, test, expect, beforeEach } from "bun:test";
import { CommandManager, type Command } from "../command-manager";

function makeCommand(
	id: string,
	log: string[],
): Command {
	return {
		id,
		name: id,
		async execute() {
			log.push(`exec:${id}`);
		},
		async undo() {
			log.push(`undo:${id}`);
		},
	};
}

describe("CommandManager", () => {
	let mgr: CommandManager;
	let log: string[];

	beforeEach(() => {
		mgr = new CommandManager();
		log = [];
	});

	test("starts empty", () => {
		expect(mgr.historyLength).toBe(0);
		expect(mgr.currentPointer).toBe(-1);
	});

	test("execute runs command and tracks history", async () => {
		await mgr.execute(makeCommand("a", log));
		expect(log).toEqual(["exec:a"]);
		expect(mgr.historyLength).toBe(1);
		expect(mgr.currentPointer).toBe(0);
	});

	test("record adds to history without executing", () => {
		mgr.record(makeCommand("a", log));
		expect(log).toEqual([]);
		expect(mgr.historyLength).toBe(1);
		expect(mgr.currentPointer).toBe(0);
	});

	test("undo reverses last command", async () => {
		await mgr.execute(makeCommand("a", log));
		const undone = await mgr.undo();
		expect(undone).toBe(true);
		expect(log).toEqual(["exec:a", "undo:a"]);
		expect(mgr.currentPointer).toBe(-1);
	});

	test("undo returns false when nothing to undo", async () => {
		expect(await mgr.undo()).toBe(false);
	});

	test("redo re-executes after undo", async () => {
		await mgr.execute(makeCommand("a", log));
		await mgr.undo();
		const redone = await mgr.redo();
		expect(redone).toBe(true);
		expect(log).toEqual(["exec:a", "undo:a", "exec:a"]);
	});

	test("redo returns false at end of history", async () => {
		await mgr.execute(makeCommand("a", log));
		expect(await mgr.redo()).toBe(false);
	});

	test("execute after undo truncates forward history", async () => {
		await mgr.execute(makeCommand("a", log));
		await mgr.execute(makeCommand("b", log));
		await mgr.undo();
		await mgr.execute(makeCommand("c", log));
		expect(mgr.historyLength).toBe(2);
		expect(await mgr.redo()).toBe(false);
	});

	test("undoToCheckpoint rolls back to checkpoint", async () => {
		await mgr.execute(makeCommand("a", log));
		const cp = mgr.getCheckpoint();
		await mgr.execute(makeCommand("b", log));
		await mgr.execute(makeCommand("c", log));
		await mgr.undoToCheckpoint(cp);
		expect(mgr.currentPointer).toBe(0);
		expect(log).toContain("undo:c");
		expect(log).toContain("undo:b");
	});

	test("clear resets everything", async () => {
		await mgr.execute(makeCommand("a", log));
		mgr.clear();
		expect(mgr.historyLength).toBe(0);
		expect(mgr.currentPointer).toBe(-1);
	});
});
