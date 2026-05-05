export function formatTimestamp(date: Date = new Date()): string {
	return date.toISOString();
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);
}

export function fileExtension(path: string): string {
	const dot = path.lastIndexOf(".");
	return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}

export function isImageFile(path: string): boolean {
	const ext = fileExtension(path);
	return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
}

export function isAudioFile(path: string): boolean {
	const ext = fileExtension(path);
	return ["mp3", "wav", "ogg", "webm"].includes(ext);
}

export function isCodeFile(path: string): boolean {
	const ext = fileExtension(path);
	return ["ts", "tsx", "js", "jsx", "json"].includes(ext);
}
