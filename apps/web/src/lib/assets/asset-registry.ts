import { openDB, type IDBPDatabase } from "idb";
import { ASSET_CATALOG, searchCatalog } from "./asset-catalog";
import type { AssetCatalogEntry } from "./asset-catalog";

const DB_NAME = "rimecraft";
const DB_VERSION = 2;
const USER_ASSETS_STORE = "user_assets";

export type AssetSource = "builtin" | "user" | "llm-generated";

export interface AssetEntry {
	id: string;
	name: string;
	nameZh: string;
	type: "texture" | "spritesheet" | "audio" | "particle-config" | "tileset" | "css";
	category: string;
	tags: string[];
	source: AssetSource;
	generatorCode?: string;
	url?: string;
	preloadCode?: string;
	frameConfig?: { frameWidth: number; frameHeight: number };
	blobPath?: string;
	thumbnailDataUrl?: string;
	width?: number;
	height?: number;
	createdAt?: number;
	prompt?: string;
	cssCode?: string;
	cssWidth?: number;
	cssHeight?: number;
}

function catalogToEntry(e: AssetCatalogEntry): AssetEntry {
	return {
		...e,
		source: "builtin",
	};
}

async function getRegistryDb(): Promise<IDBPDatabase> {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db, oldVersion) {
			if (oldVersion < 1) {
				db.createObjectStore("projects", { keyPath: "id" });
				const fileStore = db.createObjectStore("files", { keyPath: "key" });
				fileStore.createIndex("projectId", "projectId");
				const assetStore = db.createObjectStore("assets", { keyPath: "key" });
				assetStore.createIndex("projectId", "projectId");
			}
			if (oldVersion < 2) {
				if (!db.objectStoreNames.contains(USER_ASSETS_STORE)) {
					const store = db.createObjectStore(USER_ASSETS_STORE, { keyPath: "id" });
					store.createIndex("category", "category");
					store.createIndex("source", "source");
				}
			}
		},
	});
}

class AssetRegistryImpl {
	private userAssets: AssetEntry[] = [];
	private loaded = false;

	async load(): Promise<void> {
		if (this.loaded) return;
		const db = await getRegistryDb();
		const records = (await db.getAll(USER_ASSETS_STORE)) as AssetEntry[];
		this.userAssets = records;
		this.loaded = true;
	}

	getAll(filter?: {
		category?: string;
		source?: AssetSource;
		query?: string;
	}): AssetEntry[] {
		const builtin = ASSET_CATALOG.map(catalogToEntry);
		let all = [...builtin, ...this.userAssets];

		if (filter?.source) {
			all = all.filter((e) => e.source === filter.source);
		}
		if (filter?.category && filter.category !== "all") {
			if (filter.category === "mine") {
				all = all.filter((e) => e.source !== "builtin");
			} else {
				all = all.filter((e) => e.category === filter.category);
			}
		}
		if (filter?.query) {
			const q = filter.query.toLowerCase();
			all = all.filter(
				(e) =>
					e.name.toLowerCase().includes(q) ||
					e.nameZh.includes(q) ||
					e.tags.some((t) => t.toLowerCase().includes(q)),
			);
		}
		return all;
	}

	async addUserAsset(
		entry: Omit<AssetEntry, "createdAt">,
		blob?: Blob,
	): Promise<AssetEntry> {
		const full: AssetEntry = {
			...entry,
			createdAt: Date.now(),
		};
		const db = await getRegistryDb();
		await db.put(USER_ASSETS_STORE, full);
		if (blob && full.blobPath) {
			const assetRecord = {
				key: `user:${full.id}`,
				projectId: "__user_library__",
				path: full.blobPath,
				blob,
			};
			await db.put("assets", assetRecord);
		}
		this.userAssets.push(full);
		return full;
	}

	async removeUserAsset(id: string): Promise<void> {
		const db = await getRegistryDb();
		await db.delete(USER_ASSETS_STORE, id);
		this.userAssets = this.userAssets.filter((e) => e.id !== id);
	}

	async updateUserAsset(
		id: string,
		patch: Partial<AssetEntry>,
	): Promise<void> {
		const idx = this.userAssets.findIndex((e) => e.id === id);
		if (idx === -1) return;
		const updated = { ...this.userAssets[idx], ...patch, id };
		this.userAssets[idx] = updated;
		const db = await getRegistryDb();
		await db.put(USER_ASSETS_STORE, updated);
	}

	getUserAssets(): AssetEntry[] {
		return this.userAssets;
	}
}

export const assetRegistry = new AssetRegistryImpl();
