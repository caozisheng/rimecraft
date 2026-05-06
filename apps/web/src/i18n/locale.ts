export type Locale = "zh" | "en";

const LOCALE_KEY = "rimecraft_locale";

export function getStoredLocale(): Locale {
	const stored = typeof localStorage !== "undefined" ? localStorage.getItem(LOCALE_KEY) : null;
	if (stored === "en" || stored === "zh") return stored;
	return "en";
}

export function setStoredLocale(locale: Locale): void {
	localStorage.setItem(LOCALE_KEY, locale);
}
