export function transpileTypeScript(code: string): string {
	let result = code;

	// Remove `import type { ... } from "..."`
	result = result.replace(
		/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\n?/g,
		"",
	);

	// Remove `export type { ... }`
	result = result.replace(
		/export\s+type\s+\{[^}]*\};?\n?/g,
		"",
	);

	// Remove interface and type alias declarations (including multi-line)
	result = result.replace(
		/(?:export\s+)?(?:interface|type)\s+\w+(?:<[^>]*>)?\s*(?:extends\s+[^{]*)?\{[^}]*\}\n?/g,
		"",
	);

	// Convert enums to plain objects
	result = result.replace(
		/(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g,
		(_match, name, body) => {
			const members = body
				.split(",")
				.map((m: string) => m.trim())
				.filter((m: string) => m.length > 0);
			const entries: string[] = [];
			let autoVal = 0;
			for (const member of members) {
				const eqIdx = member.indexOf("=");
				if (eqIdx !== -1) {
					const key = member.slice(0, eqIdx).trim();
					const val = member.slice(eqIdx + 1).trim();
					entries.push(`${key}: ${val}`);
					const numVal = Number(val);
					autoVal = Number.isNaN(numVal) ? autoVal : numVal + 1;
				} else {
					entries.push(`${member}: ${autoVal}`);
					autoVal++;
				}
			}
			return `const ${name} = { ${entries.join(", ")} }`;
		},
	);

	// Remove access modifiers
	result = result.replace(
		/\b(private|protected|public|readonly)\s+/g,
		"",
	);

	// Remove `implements ...` from class declarations
	result = result.replace(
		/(class\s+\w+(?:\s+extends\s+[^{]+)?)\s+implements\s+[^{]+/g,
		"$1",
	);

	// Variable declarations with type annotation and assignment: `const x: Type = ...`
	result = result.replace(
		/((?:const|let|var)\s+\w+)\s*:\s*[^=\n]+(\s*=)/g,
		"$1$2",
	);

	// Variable declarations with type annotation only: `let x: Type;`
	result = result.replace(
		/((?:const|let|var)\s+\w+)\s*:\s*[^=\n;]+(\s*;)/g,
		"$1$2",
	);

	// Class property declarations with type only: `  score: number;`
	result = result.replace(
		/^(\s+\w+)[?!]?\s*:\s*[^=\n;{]+;/gm,
		"$1;",
	);

	// Class property declarations with type and initializer: `  score: number = 0`
	result = result.replace(
		/^(\s+\w+)[?!]?\s*:\s*[^=\n;{]+(\s*=(?!>))/gm,
		"$1$2",
	);

	// Return type annotations: `) : Type {`
	result = result.replace(
		/(\))\s*:\s*[^{;(]*?(\s*\{)/g,
		"$1$2",
	);

	// Arrow function return types: `): Type =>`
	result = result.replace(
		/(\))\s*:\s*[^=;(]+?(\s*=>)/g,
		"$1$2",
	);

	// Parameter type annotations: `(param: Type, ...)`
	// Only strip well-known TS types to avoid mangling object literals like `{ duration: TWEEN_MS }`
	result = result.replace(
		/([(,]\s*)(\w+)\??\s*:\s*(?:string|number|boolean|void|any|unknown|never|null|undefined)(?:\[\])?(?=\s*[,)=])/g,
		"$1$2",
	);
	// Class/interface type annotations in function params: `(param: Phaser.Input.Pointer)`
	// Only match after `(` or `, ` when preceding context looks like a param list
	result = result.replace(
		/(\(\s*(?:\w+\s*,\s*)*)(\w+)\??\s*:\s*[A-Z][\w.]*(?:<[^>]*>)?(?:\[\])?(?=\s*[,)])/g,
		"$1$2",
	);

	// Remove all `as <type>` casts (including `as const`, `as unknown as Foo`, `as Type<T>`, `as Type[]`)
	result = result.replace(
		/\s+as\s+(?:const|[\w.]+(?:<[^>]*>)?(?:\[\])?)/g,
		"",
	);

	// Remove generic type arguments on function/method calls: `.method<Type>(`
	result = result.replace(
		/(?<=\w)<(?:string|number|boolean|any|unknown|Record|Map|Set|Array|Promise|Phaser)\b[^>]*>/g,
		"",
	);

	// Non-null assertions: `obj!.prop`, `arr[i]!.prop`, `fn()!.prop` → remove `!`
	result = result.replace(/([\w\])])!/g, "$1");

	return result;
}
