import { describe, test, expect } from "bun:test";
import { generateSandboxHtml } from "../compiler/sandbox-generator";

describe("generateSandboxHtml", () => {
	const html = generateSandboxHtml('console.log("hello");');

	test("returns valid HTML document", () => {
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<html>");
		expect(html).toContain("</html>");
	});

	test("includes Phaser script tag", () => {
		expect(html).toContain("phaser.min.js");
	});

	test("includes bundled game code", () => {
		expect(html).toContain('console.log("hello");');
	});

	test("includes scene bridge message handler", () => {
		expect(html).toContain("scene_inspect");
		expect(html).toContain("object_update");
		expect(html).toContain("request_full_state");
		expect(html).toContain("set_edit_mode");
	});

	test("includes messageId forwarding in bridge responses", () => {
		expect(html).toContain("var mid = msg.messageId");
		expect(html).toContain("messageId: mid");
		expect(html).toContain("messageId: messageId");
	});

	test("includes sendSceneTree with messageId parameter", () => {
		expect(html).toContain("function sendSceneTree(messageId)");
	});

	test("includes error handling", () => {
		expect(html).toContain("window.onerror");
		expect(html).toContain("unhandledrejection");
	});

	test("includes Phaser.Game wrapper", () => {
		expect(html).toContain("_WrappedGame");
		expect(html).toContain("Phaser.Game = _WrappedGame");
	});

	test("includes asset base URL setup", () => {
		expect(html).toContain("__ASSET_BASE__");
	});

	test("includes periodic scene tree sync in edit mode", () => {
		expect(html).toContain("setInterval");
		expect(html).toContain("if (editMode) sendSceneTree()");
	});
});
