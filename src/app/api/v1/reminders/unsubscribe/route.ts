import { NextResponse } from "next/server";

import { unsubscribeByToken } from "@/server/reminders/service";

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  const token = typeof rawBody?.token === "string" ? rawBody.token : "";
  const reason = typeof rawBody?.reason === "string" ? rawBody.reason.slice(0, 200) : undefined;
  const response = await unsubscribeByToken(token, "email-link", reason);
  return NextResponse.json(response.body, { status: response.status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const response = await unsubscribeByToken(token, "email-link");
  return NextResponse.json(response.body, { status: response.status });
}
