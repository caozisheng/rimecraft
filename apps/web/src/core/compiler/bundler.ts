import { transpileTypeScript } from "./transpiler";

export function bundleProject(sources: Record<string, string>): string {
	const modules: Record<string, string> = {};
	const moduleOrder: string[] = [];

	for (const [path, content] of Object.entries(sources)) {
		const moduleId = path.replace(/\.ts$/, "").replace(/^src\//, "");
		const transpiled = transpileTypeScript(content);
		const { code, deps } = rewriteImports(transpiled, path);
		modules[moduleId] = code;
		moduleOrder.push(moduleId);
	}

	const sorted = topologicalSort(modules, moduleOrder);

	return `
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
}

function rewriteImports(
	code: string,
	currentPath: string,
): { code: string; deps: string[] } {
	const deps: string[] = [];
	let result = code;

	result = result.replace(
		/import\s+(\w+)\s+from\s+['"]phaser['"];?/g,
		"const $1 = require('phaser');",
	);

	result = result.replace(
		/import\s+\{([^}]+)\}\s+from\s+['"](\.\.?\/[^'"]+)['"];?/g,
		(_match, imports, relPath) => {
			const resolved = resolveModulePath(currentPath, relPath);
			deps.push(resolved);
			return `const {${imports}} = require("${resolved}");`;
		},
	);

	result = result.replace(
		/import\s+(\w+)\s+from\s+['"](\.\.?\/[^'"]+)['"];?/g,
		(_match, name, relPath) => {
			const resolved = resolveModulePath(currentPath, relPath);
			deps.push(resolved);
			return `const ${name} = require("${resolved}");`;
		},
	);

	result = result.replace(
		/export\s+class\s+(\w+)/g,
		"exports.$1 = class $1",
	);

	result = result.replace(
		/export\s+function\s+(\w+)/g,
		"exports.$1 = function $1",
	);

	result = result.replace(
		/export\s+(const|let|var)\s+(\w+)/g,
		"$1 $2 = exports.$2",
	);

	result = result.replace(
		/export\s+default\s+/g,
		"exports.default = ",
	);

	return { code: result, deps };
}

function resolveModulePath(from: string, relativePath: string): string {
	const stripped = from.replace(/^src\//, "");
	const hasDir = stripped.includes("/");
	const fromDir = hasDir ? stripped.replace(/\/[^/]+$/, "") : "";
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

function topologicalSort(
	modules: Record<string, string>,
	order: string[],
): string[] {
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
