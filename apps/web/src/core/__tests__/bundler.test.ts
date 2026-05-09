import { describe, test, expect } from "bun:test";
import { bundleProject } from "../../core/compiler/bundler";

describe("bundleProject", () => {
	test("wraps code in IIFE module system", () => {
		const sources = {
			"src/main.ts": `console.log("hello");`,
		};
		const result = bundleProject(sources);
		expect(result).toContain("__modules");
		expect(result).toContain("__require");
		expect(result).toContain("__define");
		expect(result).toContain('__require("main")');
	});

	test("rewrites Phaser import to window.Phaser", () => {
		const sources = {
			"src/main.ts": `import Phaser from "phaser";\nconsole.log(Phaser);`,
		};
		const result = bundleProject(sources);
		expect(result).toContain("require('phaser')");
		expect(result).not.toContain('from "phaser"');
	});

	test("rewrites relative imports to require calls", () => {
		const sources = {
			"src/main.ts": `import { Foo } from "./utils";\nconsole.log(Foo);`,
			"src/utils.ts": `export const Foo = 1;`,
		};
		const result = bundleProject(sources);
		expect(result).toContain('require("utils")');
	});

	test("rewrites export class", () => {
		const sources = {
			"src/main.ts": `export class MyScene {}`,
		};
		const result = bundleProject(sources);
		expect(result).toContain("exports.MyScene = class MyScene");
	});

	test("places main module last", () => {
		const sources = {
			"src/main.ts": `console.log("main");`,
			"src/utils.ts": `export const x = 1;`,
		};
		const result = bundleProject(sources);
		const mainIdx = result.indexOf('__define("main"');
		const utilsIdx = result.indexOf('__define("utils"');
		expect(utilsIdx).toBeLessThan(mainIdx);
	});

	test("prioritizes config modules", () => {
		const sources = {
			"src/main.ts": `console.log("main");`,
			"src/game-config.ts": `export const config = {};`,
			"src/scene.ts": `export class S {}`,
		};
		const result = bundleProject(sources);
		const configIdx = result.indexOf('__define("game-config"');
		const sceneIdx = result.indexOf('__define("scene"');
		expect(configIdx).toBeLessThan(sceneIdx);
	});
});
