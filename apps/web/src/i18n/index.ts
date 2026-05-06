import { create } from "zustand";
import type { Locale } from "./locale";
import { getStoredLocale, setStoredLocale } from "./locale";
import type { Messages } from "./zh";
import zh from "./zh";
import en from "./en";

const messages: Record<Locale, Messages> = { zh, en };

interface I18nState {
	locale: Locale;
	messages: Messages;
	setLocale: (locale: Locale) => void;
}

export const useI18n = create<I18nState>((set) => {
	const locale = getStoredLocale();
	return {
		locale,
		messages: messages[locale],
		setLocale: (locale) => {
			setStoredLocale(locale);
			set({ locale, messages: messages[locale] });
		},
	};
});

export function t(
	template: string,
	vars?: Record<string, string | number>,
): string {
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (_, key) =>
		vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
	);
}

export function getMessages(locale?: Locale): Messages {
	return messages[locale ?? useI18n.getState().locale];
}

export function getLocale(): Locale {
	return useI18n.getState().locale;
}
