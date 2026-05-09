import { describe, test, expect } from "bun:test";
import { transpileTypeScript } from "../../core/compiler/transpiler";

describe("transpileTypeScript", () => {
	test("strips import type statements", () => {
		const input = `import type { Foo } from "./foo";\nconst x = 1;`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain("import type");
		expect(result).toContain("const x = 1;");
	});

	test("strips export type statements", () => {
		const input = `export type { Foo };\nconst x = 1;`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain("export type");
		expect(result).toContain("const x = 1;");
	});

	test("strips interface declarations", () => {
		const input = `interface Foo { bar: string }\nconst x = 1;`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain("interface");
		expect(result).toContain("const x = 1;");
	});

	test("strips access modifiers", () => {
		const input = `private x = 1;\npublic y = 2;\nreadonly z = 3;`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain("private");
		expect(result).not.toContain("public");
		expect(result).not.toContain("readonly");
	});

	test("strips as-casts", () => {
		const input = `const x = obj as string;`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain(" as string");
	});

	test("preserves non-TS code", () => {
		const input = `function hello() { return "world"; }`;
		expect(transpileTypeScript(input)).toContain(input);
	});
});
