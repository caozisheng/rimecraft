import patternsData from "./phaser4-patterns.json";
import apiData from "./phaser4-api-index.json";

interface PatternEntry {
	id: string;
	keywords: string[];
	title: string;
	code: string;
}

interface ApiSubsystem {
	name: string;
	keywords: string[];
	apis: string[];
}

const patterns: PatternEntry[] = patternsData.patterns;
const subsystems: ApiSubsystem[] = apiData.subsystems;

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\w一-鿿]+/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 0);
}

function scoreMatch(keywords: string[], queryTokens: string[]): number {
	let score = 0;
	for (const token of queryTokens) {
		for (const kw of keywords) {
			if (kw === token) {
				score += 3;
			} else if (kw.includes(token) || token.includes(kw)) {
				score += 1;
			}
		}
	}
	return score;
}

export function retrievePatterns(
	query: string,
	maxResults = 3,
): { title: string; code: string }[] {
	const tokens = tokenize(query);
	if (tokens.length === 0) return [];

	const scored = patterns.map((p) => ({
		pattern: p,
		score: scoreMatch(p.keywords, tokens),
	}));

	return scored
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, maxResults)
		.map((s) => ({ title: s.pattern.title, code: s.pattern.code }));
}

export function retrieveApis(
	query: string,
	maxResults = 3,
): { name: string; apis: string[] }[] {
	const tokens = tokenize(query);
	if (tokens.length === 0) return [];

	const scored = subsystems.map((s) => ({
		subsystem: s,
		score: scoreMatch(s.keywords, tokens),
	}));

	return scored
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, maxResults)
		.map((s) => ({ name: s.subsystem.name, apis: s.subsystem.apis }));
}

export function buildRagContext(userMessage: string): string {
	const matchedPatterns = retrievePatterns(userMessage, 3);
	const matchedApis = retrieveApis(userMessage, 3);

	if (matchedPatterns.length === 0 && matchedApis.length === 0) return "";

	const parts: string[] = [];
	parts.push("=== 相关参考代码和 API ===");

	if (matchedApis.length > 0) {
		parts.push("\n### 相关 API");
		for (const api of matchedApis) {
			parts.push(`\n**${api.name}:**`);
			for (const a of api.apis) {
				parts.push(`- ${a}`);
			}
		}
	}

	if (matchedPatterns.length > 0) {
		parts.push("\n### 参考代码模式");
		for (const p of matchedPatterns) {
			parts.push(`\n**${p.title}:**`);
			parts.push("```typescript");
			parts.push(p.code);
			parts.push("```");
		}
	}

	return parts.join("\n");
}
