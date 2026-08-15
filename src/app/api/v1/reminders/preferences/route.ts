import { NextResponse } from "next/server";

import { getPreferences, updatePreferences } from "@/server/reminders/service";

export async function GET(request: Request) {
  const response = await getPreferences(request.headers);
  return NextResponse.json(response.body, { status: response.status });
}

export async function PATCH(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const response = await updatePreferences(request.headers, rawBody);
  return NextResponse.json(response.body, { status: response.status });
}
