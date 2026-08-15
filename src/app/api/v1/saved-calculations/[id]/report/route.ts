import { NextResponse } from "next/server";

import { createReport } from "@/server/reports/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await createReport(request.headers, id);
  return NextResponse.json(response.body, { status: response.status });
}
