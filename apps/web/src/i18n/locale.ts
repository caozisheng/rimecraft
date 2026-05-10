export type Locale = "zh" | "en" | "ja";

const LOCALE_KEY = "rimecraft_locale";

export function getStoredLocale(): Locale {
	const stored = typeof localStorage !== "undefined" ? localStorage.getItem(LOCALE_KEY) : null;
	if (stored === "en" || stored === "zh" || stored === "ja") return stored;
	return "en";
}

export function setStoredLocale(locale: Locale): void {
	localStorage.setItem(LOCALE_KEY, locale);
}
