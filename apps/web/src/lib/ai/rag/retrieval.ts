import patternsData from "./phaser4-patterns.json";
import apiData from "./phaser4-api-index.json";
import errorFixesData from "./phaser4-error-fixes.json";
import architectureData from "./phaser4-architecture.json";
import skillsData from "./phaser4-skills-index.json";

interface PatternEntry {
	id: string;
	keywords: string[];
	title: string;
	code: string;
	category?: string;
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

interface SkillEntry {
	id: string;
	name: string;
	triggers: string[];
	sections: {
		quickStart: string;
		patterns: { title: string; code: string }[];
		gotchas: string[];
		apiQuickRef: string[];
	};
	relatedSkills: string[];
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
const skills: SkillEntry[] = (skillsData as { skills: SkillEntry[] }).skills;

function tokenize(text: string): string[] {
	const raw = text
		.toLowerCase()
		.replace(/[^\w一-鿿぀-ヿㇰ-ㇿｦ-ﾟ]+/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 0);
	const result: string[] = [];
	const CJK_RE = /[一-鿿぀-ヿ]/;
	for (const t of raw) {
		result.push(t);
		if (CJK_RE.test(t) && t.length > 2) {
			for (let i = 0; i <= t.length - 2; i++) {
				result.push(t.slice(i, i + 2));
			}
		}
	}
	return result;
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
	/this\.add\.(sprite|image|text|graphics|tileSprite|container|particles|group|zone|rectangle|circle|triangle|line|star|bitmapText|nineslice|rope|video|dom|layer|renderTexture)/g,
	/this\.physics\.add\.(sprite|image|group|staticGroup|staticImage|collider|overlap|existing)/g,
	/this\.physics\.(moveToObject|moveTo|accelerateToObject|accelerateTo|velocityFromAngle|velocityFromRotation|closest|furthest)/g,
	/this\.physics\.world\.(setBounds|setBoundsCollision|enable|disable|wrap)/g,
	/this\.input\.keyboard!\.(createCursorKeys|addKey|addKeys|removeKey|removeAllKeys|on|enabled)/g,
	/this\.input\.(on|setDraggable|setDefaultCursor|activePointer|enabled|setTopOnly)/g,
	/this\.cameras\.main\.(startFollow|stopFollow|setBounds|setDeadzone|setZoom|zoomTo|setScroll|centerOn|pan|shake|flash|fadeOut|fadeIn|fadeFrom|fadeTo|setBackgroundColor|setViewport|worldView|getWorldPoint|ignore)/g,
	/this\.cameras\.(add|remove)/g,
	/this\.tweens\.(add|chain|addCounter|killAll|killTweensOf|getTweensOf|isTweening|pauseAll|resumeAll)/g,
	/this\.load\.(image|spritesheet|audio|tilemapTiledJSON|tilemapCSV|atlas|multiatlas|bitmapFont|json|text|xml|svg|video|setBaseURL|setPath|setCORS|start)/g,
	/this\.anims\.(create|exists|get|remove|pauseAll|resumeAll|generateFrameNumbers|generateFrameNames|staggerPlay)/g,
	/this\.time\.(addEvent|delayedCall|removeEvent|removeAllEvents)/g,
	/this\.sound\.(add|play|get|getAll|removeByKey|removeAll|stopAll|pauseAll|resumeAll|unlock)/g,
	/this\.scene\.(start|launch|stop|restart|pause|resume|sleep|wake|switch|run|get|isActive|isPaused|isSleeping|bringToTop|sendToBack|moveUp|moveDown)/g,
	/this\.scale\.(width|height|resize|setGameSize|setZoom|startFullscreen|stopFullscreen|toggleFullscreen|on)/g,
	/this\.make\.(tilemap)/g,
	/this\.registry\.(set|get|has|remove)/g,
	/this\.textures\.(exists|get|remove)/g,
	/this\.cache\.(json|text)\.(get)/g,
	/body!\.\s*(setVelocity|setMaxVelocity|setAcceleration|setDrag|setFriction|setGravity|setBounce|setCollideWorldBounds|setImmovable|setMass|setSize|setOffset|setCircle|stop|reset|setAllowGravity|onFloor|onCeiling|onWall)/g,
	/Phaser\.Math\.(Between|FloatBetween|Distance|Angle|Clamp|Wrap|Snap|Linear|SmoothStep|DegToRad|RadToDeg|Percent)/g,
	/Phaser\.Display\.Color\.(HexStringToColor|IntegerToColor|GetColor|RandomRGB)/g,
	/Phaser\.Geom\.(Rectangle|Circle|Line|Point|Triangle|Polygon|Intersects)/g,
	/Phaser\.Utils\.Array\.(GetRandom|Shuffle|Remove)/g,
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
	categoryFilter?: string,
): { title: string; code: string }[] {
	const tokens = tokenize(query);
	if (tokens.length === 0) return [];

	const filtered = categoryFilter
		? patterns.filter((p) => p.category === categoryFilter)
		: patterns;

	const scored = filtered.map((p) => ({
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

// Level 0.2: Skill domain retrieval
function retrieveSkillContext(
	query: string,
	contextType: "coding" | "debug" | "design" | "general",
	maxSkills = 2,
): string[] {
	if (contextType === "design") return [];
	const tokens = tokenize(query);
	if (tokens.length === 0) return [];

	const scored = skills.map((s) => ({
		skill: s,
		score: scoreMatch(s.triggers, tokens),
	}));

	const topSkills = scored
		.filter((s) => s.score > 2)
		.sort((a, b) => b.score - a.score)
		.slice(0, maxSkills);

	const parts: string[] = [];
	for (const { skill } of topSkills) {
		parts.push(`\n### [Skill: ${skill.name}]`);

		if (contextType === "debug") {
			if (skill.sections.gotchas.length > 0) {
				parts.push("**Gotchas (常见陷阱):**");
				for (const g of skill.sections.gotchas.slice(0, 5)) {
					parts.push(`- ⚠️ ${g}`);
				}
			}
			if (skill.sections.apiQuickRef.length > 0) {
				parts.push("**API Quick Reference:**");
				for (const a of skill.sections.apiQuickRef.slice(0, 8)) {
					parts.push(`- ${a}`);
				}
			}
		} else {
			if (skill.sections.patterns.length > 0) {
				const relevant = skill.sections.patterns.slice(0, 3);
				for (const p of relevant) {
					parts.push(`**${p.title}:**`);
					parts.push("```typescript");
					parts.push(p.code);
					parts.push("```");
				}
			}
			if (skill.sections.gotchas.length > 0) {
				parts.push("**Gotchas:**");
				for (const g of skill.sections.gotchas.slice(0, 3)) {
					parts.push(`- ⚠️ ${g}`);
				}
			}
		}
	}
	return parts;
}

const ERROR_SKILL_MAP: Record<string, string[]> = {
	"body|velocity|gravity|collide|overlap|bounce": ["physics-arcade"],
	"matter|constraint|joint|sensor": ["physics-matter"],
	"tween|ease|yoyo": ["tweens"],
	"animation|anim|frame|play": ["animations"],
	"camera|zoom|follow|shake": ["cameras"],
	"particle|emitter": ["particles"],
	"tilemap|tile|layer": ["tilemaps"],
	"sound|audio|music": ["audio-and-sound"],
	"keyboard|cursor|key|input": ["input-keyboard-mouse-touch"],
	"group|container|children": ["groups-and-containers"],
	"text|font|bitmap": ["text-and-bitmaptext"],
	"texture|load|preload|spritesheet": ["loading-assets", "sprites-and-images"],
	"scene|start|launch|sleep": ["scenes"],
	"timer|delay|time": ["time-and-timers"],
	"scale|resize|fullscreen": ["scale-and-responsive"],
	"filter|postfx|blur|glow": ["filters-and-postfx"],
	"graphics|shape|draw|line|rect": ["graphics-and-shapes"],
	"path|curve|bezier": ["curves-and-paths"],
};

function retrieveSkillGotchasForError(error: string): string[] {
	const matchedSkillIds = new Set<string>();
	for (const [pattern, skillIds] of Object.entries(ERROR_SKILL_MAP)) {
		if (new RegExp(pattern, "i").test(error)) {
			for (const id of skillIds) matchedSkillIds.add(id);
		}
	}

	const gotchas: string[] = [];
	for (const skill of skills) {
		if (matchedSkillIds.has(skill.id)) {
			for (const g of skill.sections.gotchas) {
				gotchas.push(`[${skill.name}] ${g}`);
			}
		}
	}
	return gotchas;
}

function buildGameCatalog(code: string): string | null {
	const lines: string[] = [];
	const sceneMatches = code.match(/class\s+(\w+)\s+extends\s+Phaser\.Scene/g);
	if (sceneMatches) {
		lines.push(`Scenes: ${sceneMatches.map((m) => m.match(/class\s+(\w+)/)?.[1]).filter(Boolean).join(", ")}`);
	}
	const hasConfig = /GAME_CONFIG/.test(code);
	lines.push(`config.ts: ${hasConfig ? "yes" : "not detected"}`);
	const apis = extractPhaserApisFromCode(code);
	if (apis.length > 0) {
		lines.push(`APIs used: ${apis.slice(0, 10).join(", ")}`);
	}
	return lines.length > 0 ? lines.join("\n") : null;
}

// Main entry point: multi-level context-aware RAG
export function buildRagContext(
	userMessage: string,
	config?: RetrievalConfig,
): string {
	const contextType = config?.contextType ?? "general";
	const parts: string[] = [];

	// === Level 0: Structure-aware retrieval (new game / new scene requests) ===
	const NEW_GAME_KEYWORDS = /新建|创建|新游戏|做一个|帮我做|create|new game|make a|build/i;
	const NEW_SCENE_KEYWORDS = /新场景|添加场景|加个场景|new scene|add scene/i;
	if (NEW_GAME_KEYWORDS.test(userMessage) || NEW_SCENE_KEYWORDS.test(userMessage)) {
		const structurePatterns = retrievePatterns(userMessage, 2, "structure");
		if (structurePatterns.length > 0) {
			parts.push("### 代码结构参考 / Code Structure Reference");
			for (const p of structurePatterns) {
				parts.push(`\n**${p.title}:**`);
				parts.push("```typescript");
				parts.push(p.code);
				parts.push("```");
			}
		}
	}

	// === Level 0.1: Category-aware retrieval (detect specialized patterns) ===
	const CATEGORY_KEYWORDS: Record<string, RegExp> = {
		movement: /冲刺|滑墙|攀爬|游泳|绳索|dash|wall.?slide|wall.?jump|climb|swim|rope|grapple|ladder|ice|friction/i,
		ai: /AI|状态机|巡逻|追踪|boss|敌人行为|flocking|turret|state.?machine|patrol|chase|flee|boss.?phase/i,
		procedural: /随机生成|程序生成|地牢|procedural|dungeon|loot|terrain.?gen/i,
		mobile: /手机|移动端|触摸|摇杆|滑动|mobile|touch|joystick|swipe|gesture|safe.?area/i,
		multiplayer: /多人|联机|同屏|split.?screen|multiplayer|websocket|local.?multi/i,
		mechanics: /合成|种植|钓鱼|潜行|crafting|farming|fishing|stealth|grapple/i,
	};
	for (const [category, regex] of Object.entries(CATEGORY_KEYWORDS)) {
		if (regex.test(userMessage)) {
			const categoryPatterns = retrievePatterns(userMessage, 2, category);
			if (categoryPatterns.length > 0) {
				parts.push(`\n### ${category} 参考 / ${category} Reference`);
				for (const p of categoryPatterns) {
					parts.push(`\n**${p.title}:**`);
					parts.push("```typescript");
					parts.push(p.code);
					parts.push("```");
				}
			}
		}
	}

	// === Level 0.2: Skill domain retrieval (Phaser official skills) ===
	const skillParts = retrieveSkillContext(userMessage, contextType);
	if (skillParts.length > 0) {
		parts.push(...skillParts);
	}

	// === Level 0.5: Game catalog (auto-generated project structure index) ===
	if (config?.currentCode) {
		const catalog = buildGameCatalog(config.currentCode);
		if (catalog) {
			parts.push("\n### 当前游戏结构 / Current Game Structure");
			parts.push(catalog);
		}
	}

	// === Level 1: Error-driven retrieval (debug mode priority) ===
	if (
		config?.recentErrors?.length &&
		(contextType === "debug" || contextType === "general")
	) {
		const fixes = retrieveErrorFixes(config.recentErrors, 5);
		if (fixes.length > 0) {
			parts.push("### 错误诊断参考 / Error Diagnosis Reference");
			for (const fix of fixes) {
				parts.push(`\n**[${fix.category}] ${fix.errorPattern}**`);
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

		// Skill gotchas cross-reference for errors
		const errorStr = config.recentErrors.join(" ");
		const skillGotchas = retrieveSkillGotchasForError(errorStr);
		if (skillGotchas.length > 0) {
			parts.push("\n### Skill Gotchas (相关陷阱)");
			for (const g of skillGotchas.slice(0, 5)) {
				parts.push(`- ⚠️ ${g}`);
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

	// Token budget control: total RAG context max ~4000 tokens (expanded for larger knowledge base)
	return truncateToTokenBudget(fullContext, 4000);
}
