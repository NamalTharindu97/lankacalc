import { NextResponse } from "next/server";

import { getCalculator } from "@/domain/calculators/registry";
import { getDatabase } from "@/server/db/client";
import { getColomboDate, isIsoDate } from "@/server/rules/date";
import { listSourcesForCalculator } from "@/server/sources/service";

type RouteContext = { params: Promise<{ calculator: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { calculator } = await context.params;
  if (!getCalculator(calculator)) {
    return NextResponse.json({ error: { code: "CALCULATOR_NOT_FOUND", message: "Calculator not found." } }, { status: 404 });
  }

  const asOfDate = new URL(request.url).searchParams.get("asOfDate") ?? getColomboDate();
  if (!isIsoDate(asOfDate)) {
    return NextResponse.json({ error: { code: "INVALID_AS_OF_DATE", message: "asOfDate must use YYYY-MM-DD." } }, { status: 422 });
  }

  const sources = await listSourcesForCalculator(getDatabase(), calculator, asOfDate);
  return NextResponse.json({ data: sources });
}
