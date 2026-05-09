import { describe, test, expect } from "bun:test";
import {
	createEmptyScene,
	generateObjectId,
	findObject,
	removeObject,
	flattenObjects,
	type SceneObject,
} from "../scene-graph";

describe("createEmptyScene", () => {
	test("returns default 800x600 scene", () => {
		const scene = createEmptyScene();
		expect(scene.version).toBe(1);
		expect(scene.settings.width).toBe(800);
		expect(scene.settings.height).toBe(600);
		expect(scene.objects).toEqual([]);
		expect(scene.assets).toEqual([]);
	});

	test("accepts custom dimensions", () => {
		const scene = createEmptyScene(1024, 768);
		expect(scene.settings.width).toBe(1024);
		expect(scene.settings.height).toBe(768);
	});
});

describe("generateObjectId", () => {
	test("returns unique ids", () => {
		const a = generateObjectId();
		const b = generateObjectId();
		expect(a).not.toBe(b);
		expect(a).toMatch(/^obj_/);
	});
});

function makeObj(id: string, children?: SceneObject[]): SceneObject {
	return {
		id,
		type: "image",
		name: id,
		x: 0,
		y: 0,
		children,
	};
}

describe("findObject", () => {
	test("finds top-level object", () => {
		const objects = [makeObj("a"), makeObj("b")];
		expect(findObject(objects, "b")?.id).toBe("b");
	});

	test("finds nested object", () => {
		const objects = [makeObj("parent", [makeObj("child")])];
		expect(findObject(objects, "child")?.id).toBe("child");
	});

	test("returns undefined for missing id", () => {
		expect(findObject([makeObj("a")], "missing")).toBeUndefined();
	});
});

describe("removeObject", () => {
	test("removes top-level object", () => {
		const objects = [makeObj("a"), makeObj("b")];
		expect(removeObject(objects, "a")).toBe(true);
		expect(objects).toHaveLength(1);
		expect(objects[0].id).toBe("b");
	});

	test("removes nested object", () => {
		const child = makeObj("child");
		const objects = [makeObj("parent", [child])];
		expect(removeObject(objects, "child")).toBe(true);
		expect(objects[0].children).toHaveLength(0);
	});

	test("returns false for missing id", () => {
		const objects = [makeObj("a")];
		expect(removeObject(objects, "missing")).toBe(false);
		expect(objects).toHaveLength(1);
	});
});

describe("flattenObjects", () => {
	test("flattens nested hierarchy", () => {
		const objects = [
			makeObj("a", [makeObj("b"), makeObj("c")]),
			makeObj("d"),
		];
		const flat = flattenObjects(objects);
		expect(flat.map((o) => o.id)).toEqual(["a", "b", "c", "d"]);
	});

	test("handles empty array", () => {
		expect(flattenObjects([])).toEqual([]);
	});
});
