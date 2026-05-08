interface ParsedCSS {
	backgroundColor?: string;
	gradient?: { angle: number; stops: { color: string; pos: number }[] };
	borderRadius?: number;
	borderWidth?: number;
	borderColor?: string;
	boxShadowX?: number;
	boxShadowY?: number;
	boxShadowBlur?: number;
	boxShadowColor?: string;
}

function parseColor(raw: string): string {
	raw = raw.trim();
	if (raw.startsWith("#")) {
		const hex = raw.slice(1);
		if (hex.length === 3) {
			return `0x${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
		}
		return `0x${hex.slice(0, 6)}`;
	}
	if (raw.startsWith("rgb")) {
		const m = raw.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
		if (m) {
			const hex = [m[1], m[2], m[3]]
				.map((n) => Number(n).toString(16).padStart(2, "0"))
				.join("");
			return `0x${hex}`;
		}
	}
	const named: Record<string, string> = {
		red: "0xff0000",
		green: "0x00ff00",
		blue: "0x0000ff",
		white: "0xffffff",
		black: "0x000000",
		yellow: "0xffff00",
		orange: "0xffa500",
		purple: "0x800080",
		gray: "0x808080",
		grey: "0x808080",
		pink: "0xffc0cb",
		cyan: "0x00ffff",
		transparent: "0x000000",
	};
	return named[raw.toLowerCase()] ?? "0x888888";
}

function parseCSS(css: string): ParsedCSS {
	const result: ParsedCSS = {};

	const bgMatch = css.match(
		/background(?:-color)?\s*:\s*([^;]+?)(?:\s*;|$)/im,
	);
	if (bgMatch) {
		const val = bgMatch[1].trim();
		const gradMatch = val.match(
			/linear-gradient\(\s*(\d+)deg\s*,\s*(.+)\)/i,
		);
		if (gradMatch) {
			const angle = Number(gradMatch[1]);
			const parts = gradMatch[2].split(",").map((s) => s.trim());
			const stops = parts.map((p, i) => {
				const tokens = p.split(/\s+/);
				const color = tokens[0];
				const pos =
					tokens[1] && tokens[1].includes("%")
						? Number.parseFloat(tokens[1]) / 100
						: i / Math.max(parts.length - 1, 1);
				return { color, pos };
			});
			result.gradient = { angle, stops };
		} else {
			result.backgroundColor = val;
		}
	}

	const brMatch = css.match(/border-radius\s*:\s*(\d+)/im);
	if (brMatch) result.borderRadius = Number(brMatch[1]);

	const borderMatch = css.match(
		/border\s*:\s*(\d+)px\s+\w+\s+([^;]+?)(?:\s*;|$)/im,
	);
	if (borderMatch) {
		result.borderWidth = Number(borderMatch[1]);
		result.borderColor = borderMatch[2].trim();
	}

	const shadowMatch = css.match(
		/box-shadow\s*:\s*(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+([^;]+?)(?:\s*;|$)/im,
	);
	if (shadowMatch) {
		result.boxShadowX = Number(shadowMatch[1]);
		result.boxShadowY = Number(shadowMatch[2]);
		result.boxShadowBlur = Number(shadowMatch[3]);
		result.boxShadowColor = shadowMatch[4].trim();
	}

	return result;
}

export function cssToGeneratorCode(
	css: string,
	width: number,
	height: number,
	textureKey: string,
): string {
	const p = parseCSS(css);
	const lines: string[] = [`const g = this.add.graphics();`];

	if (p.boxShadowX || p.boxShadowY || p.boxShadowBlur) {
		const sc = parseColor(p.boxShadowColor ?? "rgba(0,0,0,0.3)");
		lines.push(`g.fillStyle(${sc}, 0.3);`);
		const sx = p.boxShadowX ?? 0;
		const sy = p.boxShadowY ?? 0;
		const sb = p.boxShadowBlur ?? 4;
		lines.push(`g.fillRect(${sx}, ${sy}, ${width + sb}, ${height + sb});`);
	}

	if (p.gradient) {
		const steps = 16;
		const stripH = Math.ceil(height / steps);
		for (let i = 0; i < steps; i++) {
			const t = i / (steps - 1);
			const stopIdx = p.gradient.stops.findIndex((s) => s.pos >= t);
			const s0 =
				p.gradient.stops[Math.max(0, stopIdx - 1)] ?? p.gradient.stops[0];
			const s1 = p.gradient.stops[stopIdx] ?? s0;
			const localT =
				s1.pos === s0.pos
					? 0
					: (t - s0.pos) / (s1.pos - s0.pos);
			const c0 = parseColor(s0.color);
			const c1 = parseColor(s1.color);
			const r0 = Number.parseInt(c0.slice(2, 4), 16);
			const g0 = Number.parseInt(c0.slice(4, 6), 16);
			const b0 = Number.parseInt(c0.slice(6, 8), 16);
			const r1 = Number.parseInt(c1.slice(2, 4), 16);
			const g1 = Number.parseInt(c1.slice(4, 6), 16);
			const b1 = Number.parseInt(c1.slice(6, 8), 16);
			const r = Math.round(r0 + (r1 - r0) * localT);
			const g = Math.round(g0 + (g1 - g0) * localT);
			const b = Math.round(b0 + (b1 - b0) * localT);
			const hex = `0x${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
			lines.push(`g.fillStyle(${hex}, 1);`);
			lines.push(`g.fillRect(0, ${i * stripH}, ${width}, ${stripH});`);
		}
	} else if (p.backgroundColor) {
		const c = parseColor(p.backgroundColor);
		lines.push(`g.fillStyle(${c}, 1);`);
		if (p.borderRadius) {
			lines.push(
				`g.fillRoundedRect(0, 0, ${width}, ${height}, ${p.borderRadius});`,
			);
		} else {
			lines.push(`g.fillRect(0, 0, ${width}, ${height});`);
		}
	} else {
		lines.push(`g.fillStyle(0x888888, 1);`);
		lines.push(`g.fillRect(0, 0, ${width}, ${height});`);
	}

	if (p.borderWidth && p.borderColor) {
		const bc = parseColor(p.borderColor);
		lines.push(`g.lineStyle(${p.borderWidth}, ${bc}, 1);`);
		if (p.borderRadius) {
			lines.push(
				`g.strokeRoundedRect(0, 0, ${width}, ${height}, ${p.borderRadius});`,
			);
		} else {
			lines.push(`g.strokeRect(0, 0, ${width}, ${height});`);
		}
	}

	lines.push(`g.generateTexture("${textureKey}", ${width}, ${height});`);
	lines.push(`g.destroy();`);

	return lines.join("\n");
}
