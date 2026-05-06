const PREVIEW_CACHE = new Map<string, string>();

export async function renderAssetPreview(
	generatorCode: string,
	size = 64,
): Promise<string> {
	const cacheKey = `${generatorCode}:${size}`;
	const cached = PREVIEW_CACHE.get(cacheKey);
	if (cached) return cached;

	const sizeMatch = generatorCode.match(
		/generateTexture\(\s*["'][^"']+["']\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/,
	);
	const srcW = sizeMatch ? Number(sizeMatch[1]) : 64;
	const srcH = sizeMatch ? Number(sizeMatch[2]) : 64;

	const canvas = document.createElement("canvas");
	canvas.width = srcW;
	canvas.height = srcH;
	const ctx = canvas.getContext("2d")!;

	const graphics = createGraphicsProxy(ctx);

	try {
		const fn = new Function("g", "ctx", generatorCode
			.replace(/const\s+g\s*=\s*this\.add\.graphics\(\);?\s*/, "")
			.replace(/g\.generateTexture\([^)]*\);?\s*/, "")
			.replace(/g\.destroy\(\);?\s*/, "")
			.replaceAll(/\bthis\.add\.graphics\(\)/g, "g")
		);
		fn(graphics, ctx);
	} catch {
		ctx.fillStyle = "#334155";
		ctx.fillRect(0, 0, srcW, srcH);
		ctx.fillStyle = "#94a3b8";
		ctx.font = `${Math.max(10, srcW / 5)}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("?", srcW / 2, srcH / 2);
	}

	const out = document.createElement("canvas");
	out.width = size;
	out.height = size;
	const outCtx = out.getContext("2d")!;

	outCtx.imageSmoothingEnabled = true;
	outCtx.imageSmoothingQuality = "high";

	const scale = Math.min(size / srcW, size / srcH);
	const dw = srcW * scale;
	const dh = srcH * scale;
	const dx = (size - dw) / 2;
	const dy = (size - dh) / 2;
	outCtx.drawImage(canvas, dx, dy, dw, dh);

	const dataUrl = out.toDataURL("image/png");
	PREVIEW_CACHE.set(cacheKey, dataUrl);
	return dataUrl;
}

export function clearPreviewCache() {
	PREVIEW_CACHE.clear();
}

function hexToCSS(hex: number, alpha = 1): string {
	const r = (hex >> 16) & 0xff;
	const g = (hex >> 8) & 0xff;
	const b = hex & 0xff;
	return alpha >= 1
		? `rgb(${r},${g},${b})`
		: `rgba(${r},${g},${b},${alpha})`;
}

interface GraphicsProxy {
	fillStyle(color: number, alpha?: number): void;
	lineStyle(width: number, color: number, alpha?: number): void;
	fillRect(x: number, y: number, w: number, h: number): void;
	strokeRect(x: number, y: number, w: number, h: number): void;
	fillCircle(cx: number, cy: number, r: number): void;
	strokeCircle(cx: number, cy: number, r: number): void;
	fillTriangle(
		x1: number, y1: number,
		x2: number, y2: number,
		x3: number, y3: number,
	): void;
	fillRoundedRect(x: number, y: number, w: number, h: number, r: number): void;
	strokeRoundedRect(x: number, y: number, w: number, h: number, r: number): void;
	fillPoint(x: number, y: number, size?: number): void;
	generateTexture(key: string, w: number, h: number): void;
	destroy(): void;
	beginPath(): void;
	closePath(): void;
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	strokePath(): void;
	fillPath(): void;
}

function createGraphicsProxy(ctx: CanvasRenderingContext2D): GraphicsProxy {
	let currentFill = "#ffffff";
	let currentStroke = "#ffffff";
	let currentLineWidth = 1;

	return {
		fillStyle(color: number, alpha = 1) {
			currentFill = hexToCSS(color, alpha);
			ctx.fillStyle = currentFill;
		},
		lineStyle(width: number, color: number, alpha = 1) {
			currentLineWidth = width;
			currentStroke = hexToCSS(color, alpha);
			ctx.strokeStyle = currentStroke;
			ctx.lineWidth = width;
		},
		fillRect(x, y, w, h) {
			ctx.fillStyle = currentFill;
			ctx.fillRect(x, y, w, h);
		},
		strokeRect(x, y, w, h) {
			ctx.strokeStyle = currentStroke;
			ctx.lineWidth = currentLineWidth;
			ctx.strokeRect(x, y, w, h);
		},
		fillCircle(cx, cy, r) {
			ctx.fillStyle = currentFill;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.fill();
		},
		strokeCircle(cx, cy, r) {
			ctx.strokeStyle = currentStroke;
			ctx.lineWidth = currentLineWidth;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.stroke();
		},
		fillTriangle(x1, y1, x2, y2, x3, y3) {
			ctx.fillStyle = currentFill;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.lineTo(x3, y3);
			ctx.closePath();
			ctx.fill();
		},
		fillRoundedRect(x, y, w, h, r) {
			ctx.fillStyle = currentFill;
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, r);
			ctx.fill();
		},
		strokeRoundedRect(x, y, w, h, r) {
			ctx.strokeStyle = currentStroke;
			ctx.lineWidth = currentLineWidth;
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, r);
			ctx.stroke();
		},
		fillPoint(x, y, size = 1) {
			ctx.fillStyle = currentFill;
			const half = size / 2;
			ctx.fillRect(x - half, y - half, size, size);
		},
		generateTexture() {},
		destroy() {},
		beginPath() { ctx.beginPath(); },
		closePath() { ctx.closePath(); },
		moveTo(x, y) { ctx.moveTo(x, y); },
		lineTo(x, y) { ctx.lineTo(x, y); },
		strokePath() {
			ctx.strokeStyle = currentStroke;
			ctx.lineWidth = currentLineWidth;
			ctx.stroke();
		},
		fillPath() {
			ctx.fillStyle = currentFill;
			ctx.fill();
		},
	};
}
