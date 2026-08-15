import { NextResponse } from "next/server";

import { exportSavedCalculation } from "@/server/api/accounts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await exportSavedCalculation(request.headers, id);
  if (response.status !== 200) {
    return NextResponse.json(response.body, { status: response.status });
  }

  const payload = response.body as Record<string, unknown>;
  const name = typeof payload.savedCalculation === "object"
    && payload.savedCalculation !== null
    && "name" in payload.savedCalculation
    ? String(payload.savedCalculation.name)
    : "saved-calculation";
  const filename = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "saved-calculation"}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
