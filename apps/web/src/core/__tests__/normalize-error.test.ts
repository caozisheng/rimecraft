import { describe, test, expect } from "bun:test";
import { normalizeError } from "../../utils/normalize-error";

describe("normalizeError", () => {
	test("extracts message from Error instance", () => {
		expect(normalizeError(new Error("something broke"))).toBe("something broke");
	});

	test("converts string to string", () => {
		expect(normalizeError("raw string error")).toBe("raw string error");
	});

	test("converts number to string", () => {
		expect(normalizeError(42)).toBe("42");
	});

	test("converts null to string", () => {
		expect(normalizeError(null)).toBe("null");
	});

	test("converts undefined to string", () => {
		expect(normalizeError(undefined)).toBe("undefined");
	});

	test("converts object to string", () => {
		expect(normalizeError({ code: 500 })).toBe("[object Object]");
	});

	test("extracts message from TypeError", () => {
		expect(normalizeError(new TypeError("bad type"))).toBe("bad type");
	});
});
