import { NextResponse } from "next/server";

import { getCalculatorMetadata, getCalculators } from "@/domain/calculators/registry";

export function GET() {
  return NextResponse.json({
    data: getCalculators().map(getCalculatorMetadata),
  });
}
