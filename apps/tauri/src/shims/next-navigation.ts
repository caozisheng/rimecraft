export function useRouter() {
	return { push: (url: string) => { window.location.href = url; }, back: () => window.history.back(), replace: (url: string) => { window.location.replace(url); } };
}
export function usePathname() { return window.location.pathname; }
export function useSearchParams() { return new URLSearchParams(window.location.search); }
export function redirect(url: string) { window.location.href = url; }
