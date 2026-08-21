import type { Metadata } from "next";
import { cookies } from "next/headers";

import { RemindersList, type ReminderItem } from "@/components/reminders-list";
import { RemindersSignIn } from "@/components/reminders-sign-in";
import { auth } from "@/server/auth";
import { getPreferences, listReminders } from "@/server/reminders/service";

export const metadata: Metadata = {
  title: "Reminders",
  robots: { index: false, follow: false },
};

export default async function RemindersPage() {
  const cookieStore = await cookies();
  const headers = new Headers();
  for (const cookie of cookieStore.getAll()) {
    headers.append("Cookie", `${cookie.name}=${cookie.value}`);
  }

  const session = await auth.api.getSession({ headers });
  if (!session) {
    return <RemindersSignIn />;
  }

  const remindersResponse = await listReminders(headers);
  const preferencesResponse = await getPreferences(headers);
  const reminders = remindersResponse.status === 200
    ? (remindersResponse.body as { reminders: ReminderItem[] }).reminders
    : [];
  const preferences = preferencesResponse.status === 200
    ? (preferencesResponse.body as { emailEnabled: boolean; timezone: string })
    : { emailEnabled: true, timezone: "Asia/Colombo" };

  return <RemindersList initialReminders={reminders} initialPreferences={preferences} />;
}
