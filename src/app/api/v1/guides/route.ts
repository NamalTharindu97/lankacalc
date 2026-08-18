import { NextResponse } from "next/server";

import { authenticateOperator } from "@/server/admin-auth";
import { createGuide, listGuides } from "@/server/guides/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const product = url.searchParams.get("product") ?? undefined;
  const guides = await listGuides(product);
  return NextResponse.json({ data: guides });
}

export async function POST(request: Request) {
  const operator = authenticateOperator(request);
  if (!operator) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Operator authentication required." } },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const guide = await createGuide(body);
    return NextResponse.json({ data: guide }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("validation") || message.includes("invalid")) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message } },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
