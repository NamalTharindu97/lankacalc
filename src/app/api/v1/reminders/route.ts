import { NextResponse } from "next/server";

import { createReminder, listReminders } from "@/server/reminders/service";

export async function GET(request: Request) {
  const response = await listReminders(request.headers);
  return NextResponse.json(response.body, { status: response.status });
}

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const response = await createReminder(request.headers, rawBody);
  return NextResponse.json(response.body, { status: response.status });
}
