import { NextResponse } from "next/server";

import { deleteAccount } from "@/server/api/accounts";

export async function DELETE(request: Request) {
  const response = await deleteAccount(request.headers);
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(response.body, { status: response.status });
}
