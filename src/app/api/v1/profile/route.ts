import { NextResponse } from "next/server";

import { getProfile, updateProfile } from "@/server/api/accounts";

export async function GET(request: Request) {
  const response = await getProfile(request.headers);
  return NextResponse.json(response.body, { status: response.status });
}

export async function PATCH(request: Request) {
  const response = await updateProfile(request.headers, await request.json());
  return NextResponse.json(response.body, { status: response.status });
}
