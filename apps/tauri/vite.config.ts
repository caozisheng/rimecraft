import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	plugins: [react()],

	publicDir: "../web/public",

	clearScreen: false,

	envPrefix: ["VITE_", "TAURI_ENV_*"],

	resolve: {
		alias: [
			{ find: "next/image", replacement: path.resolve(__dirname, "src/shims/next-image.tsx") },
			{ find: "next/link", replacement: path.resolve(__dirname, "src/shims/next-link.tsx") },
			{ find: "next/navigation", replacement: path.resolve(__dirname, "src/shims/next-navigation.ts") },
			{ find: "@", replacement: path.resolve(__dirname, "../web/src") },
		],
	},

	server: {
		port: 1420,
		strictPort: true,
		host: host || "127.0.0.1",
		watch: { ignored: ["**/src-tauri/**"] },
	},

	build: {
		target: ["windows", "android"].includes(process.env.TAURI_ENV_PLATFORM ?? "")
			? "chrome130"
			: "safari15",
		minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
		sourcemap: !!process.env.TAURI_ENV_DEBUG,
	},
});
