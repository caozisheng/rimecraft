import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { baseUrl, apiKey, ...payload } = body;

	if (!baseUrl || !apiKey) {
		return NextResponse.json(
			{ error: "请先在 LLM Settings 中配置 API Base URL 和 API Key" },
			{ status: 400 },
		);
	}

	const target = `${baseUrl}/chat/completions`;

	try {
		const response = await fetch(target, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return NextResponse.json(
				{ error: `API 返回 ${response.status}: ${errorText}` },
				{ status: response.status },
			);
		}

		if (payload.stream) {
			return new NextResponse(response.body, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			});
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{ error: `无法连接到 ${target}: ${message}` },
			{ status: 502 },
		);
	}
}
