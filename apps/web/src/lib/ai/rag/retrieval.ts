import patternsData from "./phaser4-patterns.json";
import apiData from "./phaser4-api-index.json";
import errorFixesData from "./phaser4-error-fixes.json";
import architectureData from "./phaser4-architecture.json";

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

interface ErrorFixEntry {
	id: string;
	category: string;
	errorPattern: string;
	errorRegex: string;
	severity: string;
	frequency: string;
	keywords: string[];
	cause: string;
	fix: {
		wrong?: string;
		correct?: string;
		explanation?: string;
		checkList?: string[];
	};
	relatedErrors?: string[];
}

interface ArchGuide {
	id: string;
	title: string;
	keywords: string[];
	applicableGameTypes?: string[];
	content: string;
}

export interface RetrievalConfig {
	maxResults?: number;
	contextType?: "coding" | "debug" | "design" | "general";
	currentCode?: string;
	recentErrors?: string[];
}

const patterns: PatternEntry[] = patternsData.patterns;
const subsystems: ApiSubsystem[] = apiData.subsystems;
const errorFixes: ErrorFixEntry[] = (errorFixesData as { errors: ErrorFixEntry[] }).errors;
const archGuides: ArchGuide[] = (architectureData as { guides: ArchGuide[] }).guides;

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

const FREQUENCY_SCORE: Record<string, number> = {
	"very-common": 4,
	common: 3,
	uncommon: 2,
	rare: 1,
};

// Level 1: Error-driven retrieval (priority in debug mode)
export function retrieveErrorFixes(
	errors: string[],
	maxResults = 3,
): ErrorFixEntry[] {
	const results: ErrorFixEntry[] = [];
	const seen = new Set<string>();

	for (const error of errors) {
		for (const entry of errorFixes) {
			if (seen.has(entry.id)) continue;
			if (entry.errorRegex) {
				try {
					const regex = new RegExp(entry.errorRegex, "i");
					if (regex.test(error)) {
						results.push(entry);
						seen.add(entry.id);
					}
				} catch {
					// invalid regex, skip
				}
			}
		}
	}

	// Also try keyword matching for errors that didn't match any regex
	if (results.length < maxResults) {
		const errorTokens = tokenize(errors.join(" "));
		for (const entry of errorFixes) {
			if (seen.has(entry.id)) continue;
			const s = scoreMatch(entry.keywords, errorTokens);
			if (s > 2) {
				results.push(entry);
				seen.add(entry.id);
			}
		}
	}

	return results
		.sort(
			(a, b) =>
				(FREQUENCY_SCORE[b.frequency] ?? 0) -
				(FREQUENCY_SCORE[a.frequency] ?? 0),
		)
		.slice(0, maxResults);
}

// Level 2: Extract Phaser APIs from current code for context-aware docs
const API_PATTERNS = [
	/this\.add\.(sprite|image|text|graphics|tileSprite|container|particles|group)/g,
	/this\.physics\.add\.(sprite|group|staticGroup|collider|overlap)/g,
	/this\.input\.(keyboard|on|setDraggable)/g,
	/this\.cameras\.main\.(startFollow|setBounds|shake|fade|flash|zoom)/g,
	/this\.tweens\.(add|chain)/g,
	/this\.load\.(image|spritesheet|audio|tilemapTiledJSON|atlas)/g,
	/this\.anims\.(create|play)/g,
	/this\.time\.(addEvent|delayedCall)/g,
	/this\.sound\.(add|play)/g,
	/this\.scene\.(start|launch|stop|restart|pause|resume)/g,
	/body!\.\s*(setVelocity|setGravity|setBounce|setCollide|setImmovable|setSize)/g,
];

function extractPhaserApisFromCode(code: string): string[] {
	const apis = new Set<string>();
	for (const pattern of API_PATTERNS) {
		pattern.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(code)) !== null) {
			apis.add(match[0].trim());
		}
	}
	return Array.from(apis);
}

function retrieveApiDocsForCode(
	code: string,
	maxResults = 5,
): ApiSubsystem[] {
	const usedApis = extractPhaserApisFromCode(code);
	if (usedApis.length === 0) return [];

	const tokens = tokenize(usedApis.join(" "));
	const scored = subsystems.map((s) => ({
		subsystem: s,
		score: scoreMatch(s.keywords, tokens),
	}));

	return scored
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, maxResults)
		.map((s) => s.subsystem);
}

// Level 3: Intent-based retrieval (patterns + architecture)
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

function retrieveArchGuides(
	query: string,
	maxResults = 2,
): ArchGuide[] {
	const tokens = tokenize(query);
	if (tokens.length === 0) return [];

	const scored = archGuides.map((g) => ({
		guide: g,
		score: scoreMatch(g.keywords, tokens),
	}));

	return scored
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, maxResults)
		.map((s) => s.guide);
}

// Level 4: API quick reference
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

// Token budget: rough estimate 1 token ≈ 4 chars
function truncateToTokenBudget(text: string, maxTokens: number): string {
	const maxChars = maxTokens * 4;
	if (text.length <= maxChars) return text;
	return text.slice(0, maxChars) + "\n... (truncated)";
}

// Main entry point: multi-level context-aware RAG
export function buildRagContext(
	userMessage: string,
	config?: RetrievalConfig,
): string {
	const contextType = config?.contextType ?? "general";
	const parts: string[] = [];

	// === Level 1: Error-driven retrieval (debug mode priority) ===
	if (
		config?.recentErrors?.length &&
		(contextType === "debug" || contextType === "general")
	) {
		const fixes = retrieveErrorFixes(config.recentErrors, 3);
		if (fixes.length > 0) {
			parts.push("### 错误诊断参考 / Error Diagnosis Reference");
			for (const fix of fixes) {
				parts.push(`\n**${fix.errorPattern}**`);
				parts.push(`原因/Cause: ${fix.cause}`);
				if (fix.fix.wrong && fix.fix.correct) {
					parts.push(`❌ Wrong: \`${fix.fix.wrong.split("\n")[0]}\``);
					parts.push(
						`✅ Correct: \`${fix.fix.correct.split("\n")[0]}\``,
					);
				}
				if (fix.fix.explanation) {
					parts.push(`Fix: ${fix.fix.explanation}`);
				}
				if (fix.fix.checkList?.length) {
					for (const item of fix.fix.checkList) {
						parts.push(`  - ${item}`);
					}
				}
			}
		}
	}

	// === Level 2: Code context retrieval ===
	if (config?.currentCode && contextType !== "design") {
		const apiDocs = retrieveApiDocsForCode(config.currentCode, 3);
		if (apiDocs.length > 0) {
			parts.push("\n### 当前使用的 API / Currently Used APIs");
			for (const doc of apiDocs) {
				parts.push(`\n**${doc.name}:**`);
				for (const a of doc.apis.slice(0, 8)) {
					parts.push(`- ${a}`);
				}
			}
		}
	}

	// === Level 3: Intent matching (patterns + architecture) ===
	const matchedPatterns = retrievePatterns(userMessage, 3);
	const matchedGuides = retrieveArchGuides(userMessage, 2);

	if (matchedPatterns.length > 0) {
		parts.push("\n### 参考代码模式 / Reference Code Patterns");
		for (const p of matchedPatterns) {
			parts.push(`\n**${p.title}:**`);
			parts.push("```typescript");
			parts.push(p.code);
			parts.push("```");
		}
	}

	if (matchedGuides.length > 0) {
		parts.push("\n### 架构参考 / Architecture Reference");
		for (const g of matchedGuides) {
			parts.push(`\n**${g.title}:**`);
			// Truncate long guides
			const content =
				g.content.length > 600 ? g.content.slice(0, 600) + "..." : g.content;
			parts.push(content);
		}
	}

	// === Level 4: API quick reference ===
	if (contextType !== "debug") {
		const matchedApis = retrieveApis(userMessage, 3);
		if (matchedApis.length > 0) {
			parts.push("\n### 相关 API / Related APIs");
			for (const api of matchedApis) {
				parts.push(`\n**${api.name}:**`);
				for (const a of api.apis.slice(0, 10)) {
					parts.push(`- ${a}`);
				}
			}
		}
	}

	if (parts.length === 0) return "";

	const fullContext =
		"=== 相关参考代码和 API / Related References ===\n" +
		parts.join("\n");

	// Token budget control: total RAG context max ~3000 tokens
	return truncateToTokenBudget(fullContext, 3000);
}
