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
		// Allow ; inside type (e.g. { r: number; c: number }[])
		result = result.replace(
			/((?:const|let|var)\s+\w+)\s*:\s*[^=\n]+(\s*=)/g,
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
			/^(\s+\w+)[?!]?\s*:\s*[^=\n;{]+;/gm,
			"$1;",
		);

		// Remove class field type annotations (with initializer)
		// fieldName: Type = value → fieldName = value
		// (?!>) prevents matching => (arrow functions in object literals)
		result = result.replace(
			/^(\s+\w+)[?!]?\s*:\s*[^=\n;{]+(\s*=(?!>))/gm,
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
		// PascalCase types required (not ALL_CAPS like TWEEN_MS)
		// (x: number, scene: Phaser.Scene, items: Item[]) → (x, scene, items)
		result = result.replace(
			/([(,]\s*)(\w+)\??\s*:\s*(?:string|number|boolean|void|any|unknown|never|null|undefined|[A-Z][a-z][\w.]*(?:<[^>]*>)?(?:\[\])?)(?=\s*[,)=])/g,
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
// Asset base URL for resolving /assets/ paths in blob: iframe
window.__ASSET_BASE__ = "${origin}";

// Patch Phaser loader to resolve /assets/ paths against __ASSET_BASE__
(function() {
	var _origAdd = Phaser.Loader.LoaderPlugin.prototype.addFile;
	Phaser.Loader.LoaderPlugin.prototype.addFile = function(file) {
		if (Array.isArray(file)) {
			file.forEach(function(f) {
				if (f.url && typeof f.url === "string" && f.url.startsWith("/assets/")) {
					f.url = window.__ASSET_BASE__ + f.url;
				}
			});
		} else if (file && file.url && typeof file.url === "string" && file.url.startsWith("/assets/")) {
			file.url = window.__ASSET_BASE__ + file.url;
		}
		return _origAdd.call(this, file);
	};
})();

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
			// Inject scale config to auto-fit the container
			if (!config.scale) {
				config.scale = {
					mode: Phaser.Scale.FIT,
					autoCenter: Phaser.Scale.CENTER_BOTH,
					width: config.width || 800,
					height: config.height || 600,
				};
			}
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

			// Resize canvas when iframe resizes
			const game = this;
			window.addEventListener("resize", function() {
				if (game && game.scale && game.isBooted) {
					try {
						game.scale.resize(config.scale.width || config.width || 800, config.scale.height || config.height || 600);
					} catch(e) {}
				}
			});
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
// Scene bridge: parent ↔ iframe protocol for visual editor
(function() {
	var editMode = false;

	window.addEventListener("message", function(e) {
		var msg = e.data;
		if (!msg || !msg.type) return;
		var game = window.__game;

		if (msg.type === "set_edit_mode") {
			editMode = !!msg.enabled;
			if (game && game.scene) {
				var scenes = game.scene.getScenes(true);
				for (var i = 0; i < scenes.length; i++) {
					var s = scenes[i];
					if (editMode) {
						if (s.physics && s.physics.world) s.physics.world.pause();
						if (!s.__origUpdate) s.__origUpdate = s.update;
						s.update = function() {};
						if (s.tweens) s.tweens.pauseAll();
						if (s.time) s.time.paused = true;
						var editChildren = getChildren(s);
						for (var ci = 0; ci < editChildren.length; ci++) {
							var ec = editChildren[ci];
							if (ec.anims && ec.anims.isPlaying) ec.anims.pause();
						}
					} else {
						if (s.__origUpdate) { s.update = s.__origUpdate; delete s.__origUpdate; }
						if (s.physics && s.physics.world) s.physics.world.resume();
						if (s.tweens) s.tweens.resumeAll();
						if (s.time) s.time.paused = false;
					}
				}
			}
			window.parent.postMessage({ type: "edit_mode_changed", enabled: editMode }, "*");
			if (editMode) sendSceneTree();
			return;
		}

		if (msg.type === "scene_inspect") {
			sendSceneTree();
			return;
		}

		if (msg.type === "object_inspect") {
			var obj = findGameObject(msg.id);
			if (obj) {
				window.parent.postMessage({
					type: "object_props", id: msg.id,
					props: extractProps(obj)
				}, "*");
			}
			return;
		}

		if (msg.type === "object_update") {
			var target = findGameObject(msg.id);
			if (target && msg.props) {
				applyProps(target, msg.props);
				sendSceneTree();
			}
			return;
		}

		if (msg.type === "object_create") {
			var scene = getActiveScene();
			if (scene && msg.objectData) {
				createGameObject(scene, msg.objectData);
				sendSceneTree();
			}
			return;
		}

		if (msg.type === "object_delete") {
			var toDelete = findGameObject(msg.id);
			if (toDelete) {
				toDelete.destroy();
				sendSceneTree();
			}
			return;
		}

		if (msg.type === "load_texture") {
			var ltScene = getActiveScene();
			var ltKey = msg.key;
			var ltUrl = msg.url;
			if (ltScene && ltKey && ltUrl) {
				if (window.__game.textures.exists(ltKey)) {
					window.parent.postMessage({ type: "texture_loaded", key: ltKey }, "*");
				} else {
					ltScene.load.image(ltKey, ltUrl);
					ltScene.load.once("complete", function() {
						window.parent.postMessage({ type: "texture_loaded", key: ltKey }, "*");
					});
					ltScene.load.start();
				}
			}
			return;
		}

		if (msg.type === "generate_texture") {
			var gtScene = getActiveScene();
			var gtKey = msg.key;
			var gtCode = msg.code;
			if (gtScene && gtKey && gtCode) {
				if (window.__game.textures.exists(gtKey)) {
					window.parent.postMessage({ type: "texture_loaded", key: gtKey }, "*");
				} else {
					try {
						new Function("scene", gtCode).call(gtScene, gtScene);
					} catch (e) {}
					window.parent.postMessage({ type: "texture_loaded", key: gtKey }, "*");
				}
			}
			return;
		}

		if (msg.type === "request_textures") {
			var game = window.__game;
			var keys = [];
			if (game && game.textures) {
				var list = game.textures.getTextureKeys ? game.textures.getTextureKeys() : [];
				for (var ti = 0; ti < list.length; ti++) {
					var k = list[ti];
					if (k === "__DEFAULT" || k === "__MISSING" || k === "__WHITE") continue;
					keys.push(k);
				}
			}
			window.parent.postMessage({ type: "texture_list", keys: keys }, "*");
			return;
		}

		if (msg.type === "request_full_state") {
			var fsScene = getActiveScene();
			if (!fsScene) { window.parent.postMessage({ type: "full_state", objects: [], settings: { width: 800, height: 600 } }, "*"); return; }
			var fsCam = fsScene.cameras ? fsScene.cameras.main : null;
			var fsScrollX = fsCam ? fsCam.scrollX : 0;
			var fsScrollY = fsCam ? fsCam.scrollY : 0;
			var fsZoom = fsCam ? fsCam.zoom : 1;
			var fsObjects = [];
			var fsList = getChildren(fsScene);
			for (var fi = 0; fi < fsList.length; fi++) {
				var fc = fsList[fi];
				if (!fc) continue;
				if (!fc.__objectId) fc.__objectId = "auto_" + (_nextAutoId++);
				var fo = {
					id: fc.__objectId,
					type: fc.type || "image",
					name: fc.name || fc.__objectId,
					x: (fc.x - fsScrollX) * fsZoom,
					y: (fc.y - fsScrollY) * fsZoom,
					rotation: fc.rotation || 0,
					scaleX: fc.scaleX || 1,
					scaleY: fc.scaleY || 1,
					originX: fc.originX !== undefined ? fc.originX : 0.5,
					originY: fc.originY !== undefined ? fc.originY : 0.5,
					alpha: fc.alpha != null ? fc.alpha : 1,
					visible: fc.visible !== false,
					depth: fc.depth || 0
				};
				if (fc.texture && fc.texture.key) fo.texture = fc.texture.key;
				if (fc.frame && fc.frame.name !== undefined) fo.frame = fc.frame.name;
				if (fc.text !== undefined) fo.text = fc.text;
				if (fc.tintTopLeft !== undefined) fo.tint = fc.tintTopLeft;
				if (fc.flipX !== undefined) fo.flipX = fc.flipX;
				if (fc.flipY !== undefined) fo.flipY = fc.flipY;
				try { var fb = fc.getBounds(); fo.width = fb.width; fo.height = fb.height; } catch(e) {}
				fsObjects.push(fo);
			}
			var fsGw = fsScene.scale ? fsScene.scale.width : 800;
			var fsGh = fsScene.scale ? fsScene.scale.height : 600;
			window.parent.postMessage({ type: "full_state", objects: fsObjects, settings: { width: fsGw, height: fsGh } }, "*");
			return;
		}
	});

	var _nextAutoId = 0;

	function getActiveScene() {
		var game = window.__game;
		if (!game) return null;
		// Phaser 3 & 4
		if (game.scene && typeof game.scene.getScenes === "function") {
			var scenes = game.scene.getScenes(true);
			if (scenes.length > 0) return scenes[0];
		}
		// Phaser 4 fallback: scene.scenes array
		if (game.scene && game.scene.scenes) {
			for (var i = 0; i < game.scene.scenes.length; i++) {
				var s = game.scene.scenes[i];
				if (s.sys && s.sys.isActive && s.sys.isActive()) return s;
			}
			if (game.scene.scenes.length > 0) return game.scene.scenes[0];
		}
		return null;
	}

	function getChildren(scene) {
		if (scene.children && scene.children.list) return scene.children.list;
		if (scene.children && typeof scene.children.getAll === "function") return scene.children.getAll();
		return [];
	}

	function findGameObject(id) {
		var scene = getActiveScene();
		if (!scene) return null;
		var all = getChildren(scene);
		for (var i = 0; i < all.length; i++) {
			if (all[i].__objectId === id) return all[i];
		}
		return null;
	}

	function sendSceneTree() {
		var scene = getActiveScene();
		if (!scene) return;
		var cam = scene.cameras ? scene.cameras.main : null;
		var scrollX = cam ? cam.scrollX : 0;
		var scrollY = cam ? cam.scrollY : 0;
		var zoom = cam ? cam.zoom : 1;
		var objects = [];
		var list = getChildren(scene);
		for (var i = 0; i < list.length; i++) {
			var child = list[i];
			if (!child) continue;
			if (!child.__objectId) child.__objectId = "auto_" + (_nextAutoId++);
			var w = child.displayWidth !== undefined ? Math.abs(child.displayWidth) : (child.width || 0);
			var h = child.displayHeight !== undefined ? Math.abs(child.displayHeight) : (child.height || 0);
			if ((w === 0 || h === 0) && child.getBounds) {
				try { var b = child.getBounds(); w = b.width || w; h = b.height || h; } catch(e) {}
			}
			objects.push({
				id: child.__objectId,
				x: (child.x - scrollX) * zoom,
				y: (child.y - scrollY) * zoom,
				width: w * zoom,
				height: h * zoom,
				rotation: child.rotation || 0,
				originX: child.originX !== undefined ? child.originX : 0.5,
				originY: child.originY !== undefined ? child.originY : 0.5
			});
		}
		var gw = scene.scale ? scene.scale.width : 800;
		var gh = scene.scale ? scene.scale.height : 600;
		window.parent.postMessage({
			type: "scene_tree",
			objects: objects,
			settings: { width: gw, height: gh }
		}, "*");
	}

	function extractProps(obj) {
		var p = {
			x: obj.x, y: obj.y,
			rotation: obj.rotation || 0,
			scaleX: obj.scaleX || 1, scaleY: obj.scaleY || 1,
			alpha: obj.alpha != null ? obj.alpha : 1,
			visible: obj.visible !== false,
			depth: obj.depth || 0,
			name: obj.name || "",
			type: obj.type || "unknown"
		};
		if (obj.texture && obj.texture.key) p.texture = obj.texture.key;
		if (obj.frame && obj.frame.name !== undefined) p.frame = obj.frame.name;
		if (obj.text !== undefined) p.text = obj.text;
		if (obj.originX !== undefined) p.originX = obj.originX;
		if (obj.originY !== undefined) p.originY = obj.originY;
		if (obj.tintTopLeft !== undefined) p.tint = obj.tintTopLeft;
		if (obj.flipX !== undefined) p.flipX = obj.flipX;
		if (obj.flipY !== undefined) p.flipY = obj.flipY;
		try {
			var b = obj.getBounds();
			p.width = b.width; p.height = b.height;
		} catch(e) {}
		return p;
	}

	function applyProps(obj, props) {
		var cam = getActiveScene() && getActiveScene().cameras ? getActiveScene().cameras.main : null;
		var scrollX = cam ? cam.scrollX : 0;
		var scrollY = cam ? cam.scrollY : 0;
		var zoom = cam ? cam.zoom : 1;
		if (props.x !== undefined) obj.x = props.x / zoom + scrollX;
		if (props.y !== undefined) obj.y = props.y / zoom + scrollY;
		if (props.rotation !== undefined) obj.rotation = props.rotation;
		if (props.scaleX !== undefined) obj.scaleX = props.scaleX;
		if (props.scaleY !== undefined) obj.scaleY = props.scaleY;
		if (props.displayWidth !== undefined && 'displayWidth' in obj) obj.displayWidth = props.displayWidth / zoom;
		if (props.displayHeight !== undefined && 'displayHeight' in obj) obj.displayHeight = props.displayHeight / zoom;
		if (props.alpha !== undefined) obj.alpha = props.alpha;
		if (props.visible !== undefined) obj.visible = props.visible;
		if (props.depth !== undefined) obj.depth = props.depth;
		if (props.text !== undefined && obj.setText) obj.setText(props.text);
		if (props.tint !== undefined && obj.setTint) obj.setTint(props.tint);
		if (props.texture !== undefined && obj.setTexture) {
				if (obj.anims && obj.anims.isPlaying) obj.anims.stop();
				obj.setTexture(props.texture);
			}
		if (props.frame !== undefined && obj.setFrame) obj.setFrame(props.frame);
		if (props.name !== undefined) obj.name = props.name;
		if (props.flipX !== undefined) obj.flipX = props.flipX;
		if (props.flipY !== undefined) obj.flipY = props.flipY;
		if (props.originX !== undefined && obj.setOrigin) {
			obj.setOrigin(props.originX, props.originY !== undefined ? props.originY : obj.originY);
		}
	}

	function createGameObject(scene, data) {
		var cam = scene.cameras ? scene.cameras.main : null;
		var scrollX = cam ? cam.scrollX : 0;
		var scrollY = cam ? cam.scrollY : 0;
		var zoom = cam ? cam.zoom : 1;
		var wx = (data.x || 0) / zoom + scrollX;
		var wy = (data.y || 0) / zoom + scrollY;
		var obj;
		if (data.type === "image" && data.texture) {
			obj = scene.add.image(wx, wy, data.texture, data.frame);
		} else if (data.type === "sprite" && data.texture) {
			obj = scene.add.sprite(wx, wy, data.texture, data.frame);
		} else if (data.type === "text") {
			obj = scene.add.text(wx, wy, data.text || "", data.style || {});
		} else if (data.type === "graphics") {
			obj = scene.add.graphics({ x: wx, y: wy });
			if (data.generatorCode) {
				try { new Function("g", data.generatorCode)(obj); } catch(e) {}
			}
		} else {
			obj = scene.add.image(wx, wy, data.texture || "__DEFAULT");
		}
		if (obj) {
			obj.__objectId = data.id || ("obj_" + Date.now());
			if (data.name) obj.name = data.name;
			if (data.rotation) obj.rotation = data.rotation;
			if (data.scaleX !== undefined) obj.scaleX = data.scaleX;
			if (data.scaleY !== undefined) obj.scaleY = data.scaleY;
			if (data.alpha !== undefined) obj.alpha = data.alpha;
			if (data.depth !== undefined) obj.depth = data.depth;
			if (data.originX !== undefined && obj.setOrigin) {
				obj.setOrigin(data.originX, data.originY !== undefined ? data.originY : 0.5);
			}
			if (data.physics) {
				var physType = data.physics.bodyType === "static" ? "staticBody" : "body";
				if (scene.physics && scene.physics.add) {
					scene.physics.add.existing(obj, data.physics.bodyType === "static");
					if (obj.body) {
						if (data.physics.bounce !== undefined) obj.body.setBounce(data.physics.bounce);
						if (data.physics.collideWorldBounds) obj.body.setCollideWorldBounds(true);
					}
				}
			}
		}
		return obj;
	}

	// Periodically sync bounds in edit mode
	setInterval(function() {
		if (editMode) sendSceneTree();
	}, 500);
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
