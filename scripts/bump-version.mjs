#!/usr/bin/env node

/**
 * Usage: node scripts/bump-version.mjs <version>
 * Example: node scripts/bump-version.mjs 0.2.0
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
	console.error("Usage: node scripts/bump-version.mjs <version>");
	console.error("Example: node scripts/bump-version.mjs 0.2.0");
	process.exit(1);
}

const PACKAGE_JSONS = [
	"apps/web/package.json",
	"apps/tauri/package.json",
	"packages/core/package.json",
	"packages/ui/package.json",
	"packages/code-editor/package.json",
	"packages/agent-engine/package.json",
	"packages/phaser-runtime/package.json",
];

const I18N_FILES = [
	"apps/web/src/i18n/en.ts",
	"apps/web/src/i18n/zh.ts",
];

let updated = 0;

// 1. Update package.json files
for (const rel of PACKAGE_JSONS) {
	const abs = resolve(root, rel);
	const json = JSON.parse(readFileSync(abs, "utf-8"));
	const old = json.version;
	json.version = newVersion;
	writeFileSync(abs, JSON.stringify(json, null, "\t") + "\n");
	console.log(`  ${rel}: ${old} -> ${newVersion}`);
	updated++;
}

// 2. Update i18n footer version
const versionRe = /RimeCraft v\d+\.\d+\.\d+/g;
for (const rel of I18N_FILES) {
	const abs = resolve(root, rel);
	let content = readFileSync(abs, "utf-8");
	if (versionRe.test(content)) {
		versionRe.lastIndex = 0;
		content = content.replace(versionRe, `RimeCraft v${newVersion}`);
		writeFileSync(abs, content);
		console.log(`  ${rel}: footer -> v${newVersion}`);
		updated++;
	}
}

console.log(`\nDone. Updated ${updated} files to v${newVersion}.`);
