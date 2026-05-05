import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { baseUrl, apiKey, ...payload } = body;

	if (!baseUrl || !apiKey) {
		return NextResponse.json(
			{ error: "Missing baseUrl or apiKey" },
			{ status: 400 },
		);
	}

	try {
		const response = await fetch(`${baseUrl}/chat/completions`, {
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
				{ error: errorText },
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
			{ error: message },
			{ status: 500 },
		);
	}
}
