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

	test("converts enum to const object", () => {
		const input = `enum WeaponMode { SINGLE, BURST, AUTO }`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain("enum");
		expect(result).toContain("const WeaponMode");
		expect(result).toContain("SINGLE: 0");
		expect(result).toContain("BURST: 1");
		expect(result).toContain("AUTO: 2");
	});

	test("converts enum with explicit values", () => {
		const input = `export enum State { IDLE = 0, RUNNING = 1, DEAD = 99 }`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain("enum");
		expect(result).toContain("const State");
		expect(result).toContain("IDLE: 0");
		expect(result).toContain("DEAD: 99");
	});

	test("converts string enum", () => {
		const input = `enum Dir { UP = "up", DOWN = "down" }`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain("enum");
		expect(result).toContain('"up"');
		expect(result).toContain('"down"');
	});

	test("strips as const", () => {
		const input = `const CFG = { X: 1 } as const;`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain("as const");
		expect(result).toContain("const CFG");
	});

	test("strips complex as casts", () => {
		const input = `const x = foo as unknown;`;
		const result = transpileTypeScript(input);
		expect(result).not.toContain(" as ");
	});
});
