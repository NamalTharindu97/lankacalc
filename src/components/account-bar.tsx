import { cookies } from "next/headers";

import { AccountControls } from "@/components/account-controls";
import { auth } from "@/server/auth";

export async function AccountBar() {
  const cookieStore = await cookies();
  const headers = new Headers();
  for (const cookie of cookieStore.getAll()) {
    headers.append("Cookie", `${cookie.name}=${cookie.value}`);
  }
  const session = await auth.api.getSession({ headers });

  return (
    <AccountControls
      initialUser={session ? { name: session.user.name, email: session.user.email } : null}
    />
  );
}
