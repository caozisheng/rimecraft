#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKILLS_DIR =
	process.argv[2] ||
	join(__dirname, "..", "..", "phaser", "skills");
const OUT_FILE = join(
	__dirname,
	"..",
	"apps",
	"web",
	"src",
	"lib",
	"ai",
	"rag",
	"phaser4-skills-index.json",
);

const CHINESE_KEYWORD_MAP = {
	"physics-arcade": ["物理", "碰撞", "重力", "速度", "弹跳", "加速"],
	"animations": ["动画", "帧动画", "精灵动画", "播放动画"],
	"tweens": ["缓动", "补间", "动画效果", "渐变", "过渡", "弹性"],
	"cameras": ["相机", "镜头", "跟随", "震动", "缩放", "视角"],
	"particles": ["粒子", "特效", "爆炸", "火焰", "烟雾"],
	"input-keyboard-mouse-touch": ["键盘", "鼠标", "触摸", "输入", "按键", "手柄"],
	"loading-assets": ["加载", "资源", "图片", "音频", "预加载"],
	"scenes": ["场景", "切换", "过渡", "暂停", "恢复"],
	"tilemaps": ["瓦片", "地图", "关卡", "图块"],
	"tilemap-and-tiles": ["瓦片", "地图", "关卡", "图块"],
	"audio-and-sound": ["音频", "音效", "音乐", "声音", "背景音乐"],
	"groups-and-containers": ["组", "容器", "对象池", "分组"],
	"text-and-bitmaptext": ["文字", "字体", "文本", "标签"],
	"text-and-fonts": ["文字", "字体", "文本", "标签"],
	"time-and-timers": ["定时器", "延迟", "计时", "倒计时"],
	"sprites-and-images": ["精灵", "图像", "纹理"],
	"graphics-and-shapes": ["图形", "形状", "绘制", "画线", "矩形"],
	"scale-and-responsive": ["缩放", "适配", "响应式", "全屏"],
	"geometry-and-math": ["数学", "几何", "距离", "角度", "随机"],
	"data-manager": ["数据", "存储", "变量", "注册表"],
	"events-system": ["事件", "监听", "触发", "回调"],
	"game-setup-and-config": ["配置", "初始化", "启动", "设置"],
	"physics-matter": ["刚体", "约束", "关节", "传感器"],
	"curves-and-paths": ["曲线", "路径", "贝塞尔", "跟随路径"],
	"render-textures": ["渲染纹理", "动态纹理", "截图"],
	"filters-and-postfx": ["滤镜", "后处理", "模糊", "发光"],
	"masks": ["遮罩", "裁剪"],
	"lighting": ["光照", "灯光", "阴影"],
	"display-list-and-depth": ["深度", "层级", "排序", "显示列表"],
	"actions-and-utilities": ["批量操作", "排列", "网格"],
	"game-object-components": ["组件", "混入", "透明度", "翻转"],
	"v3-to-v4-migration": ["迁移", "升级", "v3", "v4"],
	"v4-new-features": ["新功能", "新特性", "v4"],
	"web-audio-api": ["音频", "Web Audio", "音频処理"],
};

const JAPANESE_KEYWORD_MAP = {
	"physics-arcade": ["物理", "衝突", "重力", "速度", "バウンス", "加速", "当たり判定"],
	"animations": ["アニメーション", "フレーム", "スプライトアニメ", "再生"],
	"tweens": ["トゥイーン", "イージング", "補間", "アニメーション効果", "遷移"],
	"cameras": ["カメラ", "追従", "振動", "ズーム", "視点", "スクロール"],
	"particles": ["パーティクル", "エフェクト", "爆発", "炎", "煙"],
	"input-keyboard-mouse-touch": ["キーボード", "マウス", "タッチ", "入力", "キー", "ゲームパッド"],
	"loading-assets": ["読み込み", "アセット", "画像", "音声", "プリロード", "リソース"],
	"scenes": ["シーン", "切り替え", "遷移", "一時停止", "再開"],
	"tilemaps": ["タイルマップ", "マップ", "ステージ", "タイル"],
	"tilemap-and-tiles": ["タイルマップ", "マップ", "ステージ", "タイル"],
	"audio-and-sound": ["オーディオ", "効果音", "音楽", "サウンド", "BGM"],
	"groups-and-containers": ["グループ", "コンテナ", "オブジェクトプール"],
	"text-and-bitmaptext": ["テキスト", "フォント", "文字", "ラベル"],
	"text-and-fonts": ["テキスト", "フォント", "文字", "ラベル"],
	"time-and-timers": ["タイマー", "遅延", "カウントダウン", "時間"],
	"sprites-and-images": ["スプライト", "画像", "テクスチャ"],
	"graphics-and-shapes": ["グラフィックス", "図形", "描画", "線", "矩形"],
	"scale-and-responsive": ["スケール", "レスポンシブ", "フルスクリーン", "画面適応"],
	"geometry-and-math": ["数学", "幾何", "距離", "角度", "ランダム"],
	"data-manager": ["データ", "保存", "変数", "レジストリ"],
	"events-system": ["イベント", "リスナー", "トリガー", "コールバック"],
	"game-setup-and-config": ["設定", "初期化", "起動", "コンフィグ"],
	"physics-matter": ["剛体", "制約", "ジョイント", "センサー"],
	"curves-and-paths": ["カーブ", "パス", "ベジェ", "経路追従"],
	"render-textures": ["レンダーテクスチャ", "動的テクスチャ", "スクリーンショット"],
	"filters-and-postfx": ["フィルター", "ポストエフェクト", "ぼかし", "グロー"],
	"masks": ["マスク", "クリッピング"],
	"lighting": ["ライティング", "照明", "影"],
	"display-list-and-depth": ["深度", "レイヤー", "ソート", "表示リスト"],
	"actions-and-utilities": ["一括操作", "配置", "グリッド"],
	"game-object-components": ["コンポーネント", "ミックスイン", "透明度", "反転"],
	"v3-to-v4-migration": ["移行", "アップグレード", "v3", "v4"],
	"v4-new-features": ["新機能", "新しい機能", "v4"],
	"web-audio-api": ["オーディオ", "Web Audio", "音声処理"],
};

function parseFrontmatter(md) {
	const match = md.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return { name: "", description: "" };
	const yaml = match[1];
	const name = yaml.match(/name:\s*(.+)/)?.[1]?.trim() || "";
	const descMatch = yaml.match(/description:\s*"([^"]+)"/);
	const description = descMatch?.[1] || "";
	return { name, description };
}

function extractTriggers(description) {
	const triggers = [];
	const triggerMatch = description.match(/[Tt]riggers?\s+on:\s*(.+?)\.?\s*$/);
	if (triggerMatch) {
		const parts = triggerMatch[1].split(/,\s*/);
		for (const p of parts) {
			const cleaned = p.trim().replace(/\.$/, "");
			if (cleaned) triggers.push(cleaned.toLowerCase());
		}
	}
	const words = description
		.replace(/[Tt]riggers?\s+on:.*$/, "")
		.toLowerCase()
		.match(/\b[a-z]{3,}\b/g);
	if (words) {
		for (const w of words) {
			if (
				!["use", "this", "skill", "when", "and", "the", "for", "with", "covers"].includes(w) &&
				!triggers.includes(w)
			) {
				triggers.push(w);
			}
		}
	}
	return [...new Set(triggers)];
}

function splitByHeading(md) {
	const sections = {};
	const regex = /^## (.+)$/gm;
	let lastHeading = null;
	let lastIndex = 0;
	let match;
	const headings = [];

	while ((match = regex.exec(md)) !== null) {
		if (lastHeading !== null) {
			sections[lastHeading] = md.slice(lastIndex, match.index).trim();
		}
		lastHeading = match[1].trim();
		lastIndex = match.index + match[0].length;
		headings.push(lastHeading);
	}
	if (lastHeading !== null) {
		sections[lastHeading] = md.slice(lastIndex).trim();
	}
	return sections;
}

function extractCodeBlocks(text) {
	if (!text) return "";
	const blocks = [];
	const regex = /```(?:js|javascript|typescript|ts)?\n([\s\S]*?)```/g;
	let match;
	while ((match = regex.exec(text)) !== null) {
		blocks.push(match[1].trim());
	}
	return blocks.join("\n\n");
}

function extractPatterns(text) {
	if (!text) return [];
	const patterns = [];
	const subSections = text.split(/^### /gm).filter(Boolean);
	for (const sub of subSections) {
		const titleMatch = sub.match(/^(.+?)[\n\r]/);
		if (!titleMatch) continue;
		const title = titleMatch[1].trim();
		const code = extractCodeBlocks(sub);
		if (code) {
			patterns.push({ title, code });
		}
	}
	return patterns;
}

function extractBulletList(text) {
	if (!text) return [];
	const items = [];
	const lines = text.split("\n");
	let currentItem = "";
	for (const line of lines) {
		const bulletMatch = line.match(/^\s*\d+\.\s*\*\*(.+?)\*\*\s*[-–—]\s*(.+)/);
		if (bulletMatch) {
			if (currentItem) items.push(currentItem);
			currentItem = `${bulletMatch[1]}: ${bulletMatch[2]}`;
		} else {
			const simpleBullet = line.match(/^\s*[-*]\s+(.+)/);
			if (simpleBullet && !line.includes("```")) {
				if (currentItem) items.push(currentItem);
				currentItem = simpleBullet[1].trim();
			} else if (currentItem && line.trim() && !line.startsWith("#") && !line.includes("```")) {
				currentItem += " " + line.trim();
			}
		}
	}
	if (currentItem) items.push(currentItem);
	return items.map((i) => i.replace(/\*\*/g, "").trim()).filter(Boolean);
}

function extractApiQuickRef(text) {
	if (!text) return [];
	const apis = [];
	const rows = text.match(/\|\s*`([^`]+)`\s*\|([^|]+)\|/g);
	if (rows) {
		for (const row of rows) {
			const m = row.match(/\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|/);
			if (m) {
				apis.push(`${m[1]} → ${m[2].trim()}`);
			}
		}
	}
	return apis;
}

function extractRelatedSkills(md) {
	const related = [];
	const match = md.match(/\*\*Related skills?:\*\*\s*(.+)/i);
	if (match) {
		const refs = match[1].match(/\.\.\/([a-z0-9-]+)\//g);
		if (refs) {
			for (const ref of refs) {
				const id = ref.replace(/\.\.\//g, "").replace(/\//g, "");
				related.push(id);
			}
		}
	}
	return related;
}

function extractTitle(md) {
	const match = md.match(/^#\s+(.+)$/m);
	return match ? match[1].trim() : "";
}

function processSkill(skillDir, dirName) {
	const skillPath = join(skillDir, "SKILL.md");
	let md;
	try {
		md = readFileSync(skillPath, "utf-8").replace(/\r\n/g, "\n");
	} catch {
		return null;
	}

	const { name, description } = parseFrontmatter(md);
	const id = name || dirName;
	const title = extractTitle(md);

	let triggers = extractTriggers(description);
	const chineseKws = CHINESE_KEYWORD_MAP[id] || CHINESE_KEYWORD_MAP[dirName] || [];
	const japaneseKws = JAPANESE_KEYWORD_MAP[id] || JAPANESE_KEYWORD_MAP[dirName] || [];
	triggers = [...new Set([...triggers, ...chineseKws, ...japaneseKws])];

	const sections = splitByHeading(md);

	const quickStart = extractCodeBlocks(sections["Quick Start"] || "");

	const patternsSection =
		sections["Common Patterns"] || sections["Patterns"] || "";
	const patterns = extractPatterns(patternsSection);

	const gotchasSection = sections["Gotchas"] || sections["Gotcha"] || "";
	const gotchas = extractBulletList(gotchasSection);

	const apiRefSection =
		sections["API Quick Reference"] ||
		sections["API Reference"] ||
		sections["API Quick Ref"] ||
		"";
	const apiQuickRef = extractApiQuickRef(apiRefSection);

	const relatedSkills = extractRelatedSkills(md);

	return {
		id,
		name: title || id,
		triggers,
		sections: {
			quickStart,
			patterns: patterns.slice(0, 10),
			gotchas: gotchas.slice(0, 15),
			apiQuickRef: apiQuickRef.slice(0, 20),
		},
		relatedSkills,
	};
}

const skillDirs = readdirSync(SKILLS_DIR).filter((d) => {
	try {
		return statSync(join(SKILLS_DIR, d)).isDirectory();
	} catch {
		return false;
	}
});

console.log(`Found ${skillDirs.length} skill directories in ${SKILLS_DIR}`);

const skills = [];
for (const dir of skillDirs.sort()) {
	const skill = processSkill(join(SKILLS_DIR, dir), dir);
	if (skill) {
		console.log(
			`  ✓ ${skill.id}: ${skill.triggers.length} triggers, ${skill.sections.patterns.length} patterns, ${skill.sections.gotchas.length} gotchas, ${skill.sections.apiQuickRef.length} APIs`,
		);
		skills.push(skill);
	} else {
		console.log(`  ✗ ${dir}: skipped (no SKILL.md)`);
	}
}

// === Process phaser/docs/ as additional skill entries ===
const DOCS_DIR = join(SKILLS_DIR, "..", "docs");

const DOCS_META = {
	"Phaser 4 Internal Space Guide": {
		id: "doc-internal-space",
		triggers: ["filter", "internal space", "mask", "coordinate", "normalized",
			"滤镜", "内部空间", "遮罩", "坐标", "フィルター", "内部空間", "マスク", "座標"],
		related: ["filters-and-postfx", "masks"],
	},
	"Phaser 4 Pixel Art Guide": {
		id: "doc-pixel-art",
		triggers: ["pixel art", "pixelart", "texture filtering", "antialiasing", "nearest", "blocky", "pixelate",
			"像素", "像素风", "像素画", "抗锯齿", "ピクセルアート", "ドット絵", "アンチエイリアス"],
		related: ["sprites-and-images", "game-setup-and-config", "filters-and-postfx"],
	},
	"Phaser 4 Rendering Concepts": {
		id: "doc-rendering-concepts",
		triggers: ["renderer", "webgl", "batching", "draw call", "pipeline", "gpu", "performance",
			"渲染", "渲染管线", "性能", "批处理", "レンダリング", "パフォーマンス", "描画"],
		related: ["game-setup-and-config", "sprites-and-images"],
	},
	"Phaser 4 Shader Guide": {
		id: "doc-shader-guide",
		triggers: ["shader", "glsl", "fragment", "vertex", "filter", "postfx", "uniform",
			"着色器", "片元", "顶点", "シェーダー", "フラグメント", "バーテックス"],
		related: ["filters-and-postfx", "render-textures"],
	},
	"Phaser Compact Texture Atlas Format Specification": {
		id: "doc-compact-atlas",
		triggers: ["atlas", "texture atlas", "compact", "pct", "spritesheet", "frame",
			"图集", "纹理图集", "アトラス", "テクスチャアトラス"],
		related: ["loading-assets", "sprites-and-images"],
	},
	"WebGL Compressed Textures": {
		id: "doc-compressed-textures",
		triggers: ["compressed texture", "ktx", "basis", "pvr", "astc", "etc", "s3tc", "gpu texture",
			"压缩纹理", "圧縮テクスチャ"],
		related: ["loading-assets"],
	},
};

function processDoc(docDir, dirName) {
	const files = readdirSync(docDir).filter((f) => f.endsWith(".md"));
	if (files.length === 0) return null;

	let md;
	try {
		md = readFileSync(join(docDir, files[0]), "utf-8").replace(/\r\n/g, "\n");
	} catch { return null; }

	const meta = DOCS_META[dirName];
	if (!meta) return null;

	const title = extractTitle(md) || dirName;
	const sections = splitByHeading(md);
	const sectionNames = Object.keys(sections);

	const cheatSheet = extractCodeBlocks(sections["Cheat Sheet"] || "");

	const patterns = [];
	for (const name of sectionNames) {
		if (["Cheat Sheet"].includes(name)) continue;
		const code = extractCodeBlocks(sections[name]);
		if (code) patterns.push({ title: name, code });
	}

	const gotchas = [];
	for (const name of sectionNames) {
		const bullets = extractBulletList(sections[name]);
		if (bullets.length > 0 && /gotcha|caveat|warning|best.?practice|cheat/i.test(name)) {
			gotchas.push(...bullets);
		}
	}

	const apiQuickRef = [];
	for (const name of sectionNames) {
		const refs = extractApiQuickRef(sections[name]);
		apiQuickRef.push(...refs);
	}

	return {
		id: meta.id,
		name: title,
		triggers: meta.triggers,
		sections: {
			quickStart: cheatSheet,
			patterns: patterns.slice(0, 10),
			gotchas: gotchas.slice(0, 15),
			apiQuickRef: apiQuickRef.slice(0, 20),
		},
		relatedSkills: meta.related,
	};
}

try {
	const docDirs = readdirSync(DOCS_DIR).filter((d) => {
		try { return statSync(join(DOCS_DIR, d)).isDirectory(); } catch { return false; }
	});
	console.log(`\nFound ${docDirs.length} doc directories in ${DOCS_DIR}`);
	for (const dir of docDirs.sort()) {
		const doc = processDoc(join(DOCS_DIR, dir), dir);
		if (doc) {
			console.log(`  ✓ ${doc.id}: ${doc.triggers.length} triggers, ${doc.sections.patterns.length} patterns, ${doc.sections.gotchas.length} gotchas`);
			skills.push(doc);
		}
	}
} catch (e) {
	console.warn("Skipping docs/ (not found):", e.message);
}

const output = { skills };
writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf-8");
console.log(`\nWrote ${skills.length} skills to ${OUT_FILE}`);
console.log(
	`Total: ${skills.reduce((a, s) => a + s.sections.patterns.length, 0)} patterns, ${skills.reduce((a, s) => a + s.sections.gotchas.length, 0)} gotchas, ${skills.reduce((a, s) => a + s.sections.apiQuickRef.length, 0)} APIs`,
);
