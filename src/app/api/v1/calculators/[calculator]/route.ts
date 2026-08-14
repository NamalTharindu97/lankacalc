import { NextResponse } from "next/server";

import { getCalculator, getCalculatorMetadata } from "@/domain/calculators/registry";

type RouteContext = {
  params: Promise<{ calculator: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { calculator: calculatorKey } = await context.params;
  const calculator = getCalculator(calculatorKey);

  if (!calculator) {
    return NextResponse.json(
      { error: { code: "CALCULATOR_NOT_FOUND", message: "Calculator not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: getCalculatorMetadata(calculator) });
}
