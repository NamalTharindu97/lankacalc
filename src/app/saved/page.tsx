import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SavedList, type SavedItem } from "@/components/saved-list";
import { SavedSignIn } from "@/components/saved-sign-in";
import { listSavedCalculations } from "@/server/api/accounts";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Saved calculations",
};

export default async function SavedPage() {
  const cookieStore = await cookies();
  const headers = new Headers();
  for (const cookie of cookieStore.getAll()) {
    headers.append("Cookie", `${cookie.name}=${cookie.value}`);
  }

  const session = await auth.api.getSession({ headers });
  if (!session) {
    return <SavedSignIn />;
  }

  const response = await listSavedCalculations(headers);
  const items = response.status === 200 ? (response.body as SavedItem[]) : [];

  return <SavedList items={items} />;
}
