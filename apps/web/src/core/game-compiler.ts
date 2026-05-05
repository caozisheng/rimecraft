import type { StorageProvider } from "@/lib/storage/types";
import { useProjectStore } from "@/stores/project-store";

const PHASER_CDN_URL = "/phaser.min.js";

export class GameCompiler {
	private getStorage: () => StorageProvider;

	constructor(getStorage: () => StorageProvider) {
		this.getStorage = getStorage;
	}

	async compile(): Promise<string> {
		const projectId = useProjectStore.getState().currentProject?.id;
		if (!projectId) throw new Error("No project open");

		const storage = this.getStorage();
		const files = await storage.listFiles(projectId);
		const tsFiles = files.filter(
			(f) => f.path.endsWith(".ts") && f.path.startsWith("src/"),
		);

		const sources: Record<string, string> = {};
		for (const file of tsFiles) {
			const content = await storage.readFile(projectId, file.path);
			sources[file.path] = content;
		}

		const bundledJs = this.bundleProject(sources);
		return this.generateSandboxHtml(bundledJs);
	}

	private bundleProject(sources: Record<string, string>): string {
		const modules: Record<string, string> = {};
		const moduleOrder: string[] = [];

		for (const [path, content] of Object.entries(sources)) {
			const moduleId = path.replace(/\.ts$/, "").replace(/^src\//, "");
			const transpiled = this.transpileTypeScript(content, path);
			const { code, deps } = this.rewriteImports(transpiled, path);
			modules[moduleId] = code;
			moduleOrder.push(moduleId);
		}

		const sorted = this.topologicalSort(modules, moduleOrder);

		const runtime = `
(function() {
	const __modules = {};
	const __cache = {};

	function __define(id, factory) {
		__modules[id] = factory;
	}

	function __require(id) {
		if (id === "phaser" || id === "Phaser") return window.Phaser;
		if (__cache[id]) return __cache[id].exports;
		const mod = __modules[id];
		if (!mod) {
			console.error("Module not found: " + id);
			return {};
		}
		__cache[id] = { exports: {} };
		mod(__cache[id].exports, __require);
		return __cache[id].exports;
	}

${sorted.map((id) => `	__define("${id}", function(exports, require) {\n${modules[id]}\n	});`).join("\n\n")}

	// Boot entry point
	try {
		__require("main");
	} catch(e) {
		console.error("Game boot error:", e);
		window.parent.postMessage({
			type: "event",
			event: "error",
			data: "Boot error: " + e.message
		}, "*");
	}
})();
`;
		return runtime;
	}

	private transpileTypeScript(code: string, _path: string): string {
		let result = code;

		// Remove type imports: import type { ... } from ...
		result = result.replace(
			/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\n?/g,
			"",
		);

		// Remove type-only exports: export type { ... }
		result = result.replace(
			/export\s+type\s+\{[^}]*\};?\n?/g,
			"",
		);

		// Remove interface/type declarations (handles common cases)
		result = result.replace(
			/(?:export\s+)?(?:interface|type)\s+\w+(?:<[^>]*>)?\s*(?:extends\s+[^{]*)?{[^}]*}\n?/g,
			"",
		);

		// Remove access modifiers (must run before class field handling)
		result = result.replace(
			/\b(private|protected|public|readonly)\s+/g,
			"",
		);

		// Remove `implements ...` from class declarations
		result = result.replace(
			/(class\s+\w+(?:\s+extends\s+[^{]+)?)\s+implements\s+[^{]+/g,
			"$1",
		);

		// Remove type annotations from variable declarations (with initializer)
		// let x: Type = ... → let x = ...
		result = result.replace(
			/((?:const|let|var)\s+\w+)\s*:\s*[^=\n;]+(\s*=)/g,
			"$1$2",
		);

		// Remove type annotations from variable declarations (without initializer)
		// let x: Type; → let x;
		result = result.replace(
			/((?:const|let|var)\s+\w+)\s*:\s*[^=\n;]+(\s*;)/g,
			"$1$2",
		);

		// Remove class field type annotations (without initializer)
		// Handles: fieldName: Type; / fieldName!: Type; / fieldName?: Type;
		result = result.replace(
			/^(\s+\w+)[?!]?\s*:\s*[^=\n;{(]+;/gm,
			"$1;",
		);

		// Remove class field type annotations (with initializer)
		// fieldName: Type = value → fieldName = value
		result = result.replace(
			/^(\s+\w+)[?!]?\s*:\s*[^=\n;{(]+(\s*=)/gm,
			"$1$2",
		);

		// Remove function/method return type annotations
		// ): ReturnType { → ) {
		result = result.replace(
			/(\))\s*:\s*[^{;(]*?(\s*\{)/g,
			"$1$2",
		);

		// Remove return type from arrow functions: ): Type =>
		result = result.replace(
			/(\))\s*:\s*[^=;(]+?(\s*=>)/g,
			"$1$2",
		);

		// Remove type annotations from function parameters
		// Only matches after ( or , to avoid mangling object literal properties
		// (x: number, scene: Phaser.Scene, items: Item[]) → (x, scene, items)
		result = result.replace(
			/([(,]\s*)(\w+)\??\s*:\s*(?:string|number|boolean|void|any|unknown|never|null|undefined|[A-Z][\w.]*(?:<[^>]*>)?(?:\[\])?)(?=\s*[,)=])/g,
			"$1$2",
		);

		// Remove `as Type` assertions
		result = result.replace(/\s+as\s+[\w.]+(?:\[\])?/g, "");

		// Remove <Type> type arguments from new expressions and calls (but not JSX)
		result = result.replace(
			/(?<=\w)<(?:string|number|boolean|any|unknown|Record|Map|Set|Array|Promise)\b[^>]*>/g,
			"",
		);

		// Remove `!` non-null assertions
		result = result.replace(/(\w)!/g, "$1");

		return result;
	}

	private rewriteImports(
		code: string,
		currentPath: string,
	): { code: string; deps: string[] } {
		const deps: string[] = [];
		let result = code;

		// Convert: import Phaser from "phaser" → const Phaser = require("phaser");
		result = result.replace(
			/import\s+(\w+)\s+from\s+['"]phaser['"];?/g,
			"const $1 = require('phaser');",
		);

		// Convert: import { A, B } from "./path" → const { A, B } = require("resolved");
		result = result.replace(
			/import\s+\{([^}]+)\}\s+from\s+['"](\.\.?\/[^'"]+)['"];?/g,
			(_match, imports, relPath) => {
				const resolved = this.resolveModulePath(currentPath, relPath);
				deps.push(resolved);
				return `const {${imports}} = require("${resolved}");`;
			},
		);

		// Convert: import X from "./path" → const X = require("resolved");
		result = result.replace(
			/import\s+(\w+)\s+from\s+['"](\.\.?\/[^'"]+)['"];?/g,
			(_match, name, relPath) => {
				const resolved = this.resolveModulePath(currentPath, relPath);
				deps.push(resolved);
				return `const ${name} = require("${resolved}");`;
			},
		);

		// Convert: export class X → exports.X = class X; (and handle constructor)
		result = result.replace(
			/export\s+class\s+(\w+)/g,
			"exports.$1 = class $1",
		);

		// Convert: export function X → exports.X = function X
		result = result.replace(
			/export\s+function\s+(\w+)/g,
			"exports.$1 = function $1",
		);

		// Convert: export const X → exports.X = ...
		result = result.replace(
			/export\s+(const|let|var)\s+(\w+)/g,
			"$1 $2 = exports.$2",
		);

		// Convert: export default X → exports.default = X
		result = result.replace(
			/export\s+default\s+/g,
			"exports.default = ",
		);

		return { code: result, deps };
	}

	private resolveModulePath(from: string, relativePath: string): string {
		const stripped = from.replace(/^src\//, "");
		const hasDir = stripped.includes("/");
		const fromDir = hasDir
			? stripped.replace(/\/[^/]+$/, "")
			: "";
		const rel = relativePath.replace(/\.ts$/, "");

		if (rel.startsWith("./")) {
			const target = rel.slice(2);
			const resolved = fromDir ? `${fromDir}/${target}` : target;
			return resolved.replace(/\/+/g, "/");
		}
		if (rel.startsWith("../")) {
			const parts = fromDir ? fromDir.split("/") : [];
			let target = rel;
			while (target.startsWith("../")) {
				parts.pop();
				target = target.slice(3);
			}
			const resolved =
				parts.length > 0 ? `${parts.join("/")}/${target}` : target;
			return resolved.replace(/\/+/g, "/");
		}
		return rel;
	}

	private topologicalSort(
		modules: Record<string, string>,
		order: string[],
	): string[] {
		// Simple: put "main" last, config files first, scenes in the middle
		const sorted = order.filter((id) => id !== "main");
		sorted.sort((a, b) => {
			const aIsConfig = a.includes("config");
			const bIsConfig = b.includes("config");
			if (aIsConfig && !bIsConfig) return -1;
			if (!aIsConfig && bIsConfig) return 1;
			return a.localeCompare(b);
		});
		if (modules["main"]) {
			sorted.push("main");
		}
		return sorted;
	}

	generateSandboxHtml(bundledJs: string): string {
		const origin = typeof window !== "undefined" ? window.location.origin : "";
		return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
canvas { display: block; }
</style>
</head>
<body>
<script src="${origin}${PHASER_CDN_URL}"></script>
<script>
// Bridge: report events to parent
(function() {
	let fpsInterval;

	window.addEventListener("message", function(e) {
		const msg = e.data;
		if (!msg || msg.type !== "execute") return;

		try {
			if (msg.method === "game.pause" && window.__game) {
				window.__game.pause();
				respond(msg.id, true);
			} else if (msg.method === "game.resume" && window.__game) {
				window.__game.resume();
				respond(msg.id, true);
			} else if (msg.method === "game.destroy") {
				if (window.__game) {
					window.__game.destroy(true);
					window.__game = null;
				}
				respond(msg.id, true);
			} else {
				respond(msg.id, false, "Unknown method: " + msg.method);
			}
		} catch(err) {
			respond(msg.id, false, err.message);
		}
	});

	function respond(id, ok, error) {
		window.parent.postMessage({
			type: "result", id: id, ok: ok, data: null, error: error
		}, "*");
	}

	// Override Phaser.Game to capture the instance
	const _origGame = Phaser.Game;
	class _WrappedGame extends _origGame {
		constructor(config) {
			super(config);
			window.__game = this;

			// Report ready
			this.events.once("ready", function() {
				window.parent.postMessage({ type: "event", event: "ready", data: true }, "*");
			});

			// FPS reporting
			fpsInterval = setInterval(() => {
				if (this && this.loop) {
					window.parent.postMessage({
						type: "event", event: "fps",
						data: Math.round(this.loop.actualFps || 0)
					}, "*");
				}
			}, 1000);
		}

		destroy(removeCanvas) {
			if (fpsInterval) { clearInterval(fpsInterval); fpsInterval = null; }
			super.destroy(removeCanvas);
			window.__game = null;
		}
	}
	Phaser.Game = _WrappedGame;

	// Capture errors
	window.onerror = function(msg, url, line, col, error) {
		let detail = String(msg);
		if (line) detail += " (line " + line + (col ? ":" + col : "") + ")";
		if (error && error.stack) {
			const stackLines = error.stack.split("\\n").slice(0, 6).map(function(l) {
				return l.replace(/\\s+at\\s+/, "  at ").replace(/blob:[^:]+:/, "game:");
			});
			detail += "\\nStack:\\n" + stackLines.join("\\n");
		}
		window.parent.postMessage({
			type: "event", event: "error",
			data: detail
		}, "*");
	};

	window.addEventListener("unhandledrejection", function(e) {
		let detail = "Promise rejected: " + (e.reason?.message || e.reason || "unknown");
		if (e.reason?.stack) {
			const stackLines = e.reason.stack.split("\\n").slice(0, 6).map(function(l) {
				return l.replace(/\\s+at\\s+/, "  at ").replace(/blob:[^:]+:/, "game:");
			});
			detail += "\\nStack:\\n" + stackLines.join("\\n");
		}
		window.parent.postMessage({
			type: "event", event: "error",
			data: detail
		}, "*");
	});
})();
</script>
<script>
// Game code
${bundledJs}
</script>
</body>
</html>`;
	}
}
