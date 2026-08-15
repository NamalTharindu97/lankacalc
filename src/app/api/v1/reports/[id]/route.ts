import { NextResponse } from "next/server";

import { deleteReport, getReport } from "@/server/reports/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await getReport(request.headers, id);
  return NextResponse.json(response.body, { status: response.status });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await deleteReport(request.headers, id);
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(response.body, { status: response.status });
}
