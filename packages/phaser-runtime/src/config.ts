export interface PhaserGameConfig {
	width: number;
	height: number;
	backgroundColor: string;
	parent: string;
	physics: {
		default: "arcade" | "matter";
		arcade?: {
			gravity: { x: number; y: number };
			debug: boolean;
		};
	};
	scene: string[];
}

export function createGameConfig(
	overrides: Partial<PhaserGameConfig> = {},
): PhaserGameConfig {
	return {
		width: 800,
		height: 600,
		backgroundColor: "#1a1a2e",
		parent: "game-container",
		physics: {
			default: "arcade",
			arcade: {
				gravity: { x: 0, y: 300 },
				debug: false,
			},
		},
		scene: [],
		...overrides,
	};
}
