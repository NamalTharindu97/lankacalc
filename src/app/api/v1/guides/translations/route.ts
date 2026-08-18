import { NextResponse } from "next/server";

import { authenticateOperator } from "@/server/admin-auth";
import { listTranslations, upsertTranslation } from "@/server/guides/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const locale = url.searchParams.get("locale") ?? undefined;

  if (!entityType || !entityId) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "entityType and entityId query parameters are required.",
        },
      },
      { status: 422 },
    );
  }

  const translations = await listTranslations(entityType, entityId, locale);
  return NextResponse.json({ data: translations });
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
    const translation = await upsertTranslation(body);
    return NextResponse.json({ data: translation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 422 },
    );
  }
}
