export function transpileTypeScript(code: string): string {
	let result = code;

	result = result.replace(
		/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\n?/g,
		"",
	);

	result = result.replace(
		/export\s+type\s+\{[^}]*\};?\n?/g,
		"",
	);

	result = result.replace(
		/(?:export\s+)?(?:interface|type)\s+\w+(?:<[^>]*>)?\s*(?:extends\s+[^{]*)?{[^}]*}\n?/g,
		"",
	);

	result = result.replace(
		/\b(private|protected|public|readonly)\s+/g,
		"",
	);

	result = result.replace(
		/(class\s+\w+(?:\s+extends\s+[^{]+)?)\s+implements\s+[^{]+/g,
		"$1",
	);

	result = result.replace(
		/((?:const|let|var)\s+\w+)\s*:\s*[^=\n]+(\s*=)/g,
		"$1$2",
	);

	result = result.replace(
		/((?:const|let|var)\s+\w+)\s*:\s*[^=\n;]+(\s*;)/g,
		"$1$2",
	);

	result = result.replace(
		/^(\s+\w+)[?!]?\s*:\s*[^=\n;{]+;/gm,
		"$1;",
	);

	result = result.replace(
		/^(\s+\w+)[?!]?\s*:\s*[^=\n;{]+(\s*=(?!>))/gm,
		"$1$2",
	);

	result = result.replace(
		/(\))\s*:\s*[^{;(]*?(\s*\{)/g,
		"$1$2",
	);

	result = result.replace(
		/(\))\s*:\s*[^=;(]+?(\s*=>)/g,
		"$1$2",
	);

	result = result.replace(
		/([(,]\s*)(\w+)\??\s*:\s*(?:string|number|boolean|void|any|unknown|never|null|undefined|[A-Z][a-z][\w.]*(?:<[^>]*>)?(?:\[\])?)(?=\s*[,)=])/g,
		"$1$2",
	);

	result = result.replace(/\s+as\s+[\w.]+(?:\[\])?/g, "");

	result = result.replace(
		/(?<=\w)<(?:string|number|boolean|any|unknown|Record|Map|Set|Array|Promise)\b[^>]*>/g,
		"",
	);

	result = result.replace(/(\w)!/g, "$1");

	return result;
}
