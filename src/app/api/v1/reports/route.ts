import { NextResponse } from "next/server";

import { listReports } from "@/server/reports/service";

export async function GET(request: Request) {
  const response = await listReports(request.headers);
  return NextResponse.json(response.body, { status: response.status });
}
