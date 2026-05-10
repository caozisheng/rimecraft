export type Locale = "zh" | "en" | "ja";

const LOCALE_KEY = "rimecraft_locale";

function detectBrowserLocale(): Locale {
	const lang = (navigator.language || "").toLowerCase();
	if (lang.startsWith("zh")) return "zh";
	if (lang.startsWith("ja")) return "ja";
	return "en";
}

export function getStoredLocale(): Locale {
	const stored = typeof localStorage !== "undefined" ? localStorage.getItem(LOCALE_KEY) : null;
	if (stored === "en" || stored === "zh" || stored === "ja") return stored;
	return typeof navigator !== "undefined" ? detectBrowserLocale() : "en";
}

export function setStoredLocale(locale: Locale): void {
	localStorage.setItem(LOCALE_KEY, locale);
}
