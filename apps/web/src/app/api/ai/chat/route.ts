import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { provider, baseUrl, apiKey, ...payload } = body;

	if (!baseUrl || !apiKey) {
		return NextResponse.json(
			{ error: "Missing baseUrl or apiKey" },
			{ status: 400 },
		);
	}

	const isAnthropic = provider === "anthropic";
	const target = isAnthropic
		? `${baseUrl.replace(/\/+$/, "")}/v1/messages`
		: `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (isAnthropic) {
		headers["x-api-key"] = apiKey;
		headers["anthropic-version"] = "2023-06-01";
	} else {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	try {
		const response = await fetch(target, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return NextResponse.json(
				{ error: `API returned ${response.status}: ${errorText}` },
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
			{ error: `Cannot connect to ${target}: ${message}` },
			{ status: 502 },
		);
	}
}
