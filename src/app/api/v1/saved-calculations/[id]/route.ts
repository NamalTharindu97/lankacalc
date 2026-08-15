import { NextResponse } from "next/server";

import {
  deleteSavedCalculation,
  getSavedCalculation,
  renameSavedCalculation,
} from "@/server/api/accounts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await getSavedCalculation(request.headers, id);
  return NextResponse.json(response.body, { status: response.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await renameSavedCalculation(request.headers, id, await request.json());
  return NextResponse.json(response.body, { status: response.status });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await deleteSavedCalculation(request.headers, id);
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(response.body, { status: response.status });
}
