import { NextResponse } from "next/server";

import { executeCalculationRequest } from "@/server/api/calculations";

type RouteContext = {
  params: Promise<{ calculator: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "The request body must contain valid JSON." } },
      { status: 400 },
    );
  }

  const { calculator: calculatorKey } = await context.params;
  const response = executeCalculationRequest(calculatorKey, payload);
  return NextResponse.json(response.body, { status: response.status });
}
