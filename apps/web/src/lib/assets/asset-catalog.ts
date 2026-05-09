export type AssetCategory =
	| "character"
	| "environment"
	| "ui"
	| "effect"
	| "item"
	| "shape"
	| "background"
	| "particle";

export interface AssetCatalogEntry {
	id: string;
	name: string;
	nameZh: string;
	type: "texture" | "spritesheet" | "audio" | "particle-config" | "css";
	category: AssetCategory;
	tags: string[];
	generatorCode: string;
	url?: string;
	preloadCode?: string;
	frameConfig?: { frameWidth: number; frameHeight: number };
}

export { ASSET_CATALOG } from "./asset-catalog-data";

import { ASSET_CATALOG as _CATALOG } from "./asset-catalog-data";

export function searchCatalog(query: string, type?: string): AssetCatalogEntry[] {
	const q = query.toLowerCase();
	return _CATALOG.filter((entry) => {
		if (type && entry.category !== type && entry.type !== type) return false;
		return (
			entry.name.toLowerCase().includes(q) ||
			entry.nameZh.includes(q) ||
			entry.tags.some((t) => t.toLowerCase().includes(q))
		);
	});
}
