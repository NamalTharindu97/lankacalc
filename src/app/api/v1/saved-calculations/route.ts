import { NextResponse } from "next/server";

import { createSavedCalculation, listSavedCalculations } from "@/server/api/accounts";

export async function GET(request: Request) {
  const response = await listSavedCalculations(request.headers);
  return NextResponse.json(response.body, { status: response.status });
}

export async function POST(request: Request) {
  const response = await createSavedCalculation(request.headers, await request.json());
  return NextResponse.json(response.body, { status: response.status });
}
