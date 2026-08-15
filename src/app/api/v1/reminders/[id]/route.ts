import { NextResponse } from "next/server";

import { deleteReminder, getReminder, updateReminder } from "@/server/reminders/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await getReminder(request.headers, id);
  return NextResponse.json(response.body, { status: response.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const rawBody = await request.json().catch(() => null);
  const response = await updateReminder(request.headers, id, rawBody);
  return NextResponse.json(response.body, { status: response.status });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await deleteReminder(request.headers, id);
  return NextResponse.json(response.body, { status: response.status });
}
