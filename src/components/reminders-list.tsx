"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, Trash2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Delivery = {
  id: string;
  offsetDays: number;
  scheduledFor: string;
  status: string;
  attempts: number;
  sentAt: string | null;
  detail: string | null;
};

export type ReminderItem = {
  id: string;
  title: string;
  obligationDate: string;
  timezone: string;
  note: string | null;
  actionUrl: string | null;
  status: string;
  createdAt: string;
  deliveries: Delivery[];
};

export type ReminderPreferences = {
  emailEnabled: boolean;
  timezone: string;
};

const DEFAULT_OFFSETS = [30, 7, 1];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCalendarDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", { timeZone: "UTC", dateStyle: "medium" })
    .format(new Date(`${value}T00:00:00Z`));
}

const statusLabels: Record<string, string> = {
  active: "Active",
  cancelled: "Cancelled",
  delivered: "Delivered",
  failed: "Failed",
  pending: "Scheduled",
  sent: "Sent",
  skipped: "Skipped",
};

export function RemindersList({
  initialReminders,
  initialPreferences,
}: {
  initialReminders: ReminderItem[];
  initialPreferences: ReminderPreferences;
}) {
  const router = useRouter();
  const [reminders, setReminders] = useState(initialReminders);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [title, setTitle] = useState("");
  const [obligationDate, setObligationDate] = useState("");
  const [note, setNote] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [offsets, setOffsets] = useState(DEFAULT_OFFSETS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleOffset(offset: number) {
    setOffsets((current) =>
      current.includes(offset)
        ? current.filter((value) => value !== offset)
        : [...current, offset].sort((a, b) => b - a));
  }

  async function createReminder(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/v1/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          obligationDate,
          note: note || undefined,
          actionUrl: actionUrl || undefined,
          offsets,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string; issues?: Array<{ message: string }> } };
        const message = body.error?.message ?? "The reminder could not be created.";
        throw new Error(body.error?.issues?.[0]?.message ?? message);
      }
      const body = (await response.json()) as { reminder: ReminderItem };
      setReminders((current) => [body.reminder, ...current]);
      setTitle("");
      setObligationDate("");
      setNote("");
      setActionUrl("");
      setOffsets(DEFAULT_OFFSETS);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The reminder could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelReminder(id: string) {
    if (!window.confirm("Cancel this reminder? Future deliveries will be stopped.")) return;
    setError(null);
    const response = await fetch(`/api/v1/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!response.ok) {
      setError("The reminder could not be cancelled.");
      return;
    }
    setReminders((current) => current.map((item) =>
      item.id === id ? { ...item, status: "cancelled" } : item));
  }

  async function deleteReminder(id: string) {
    if (!window.confirm("Delete this reminder?")) return;
    setError(null);
    const response = await fetch(`/api/v1/reminders/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("The reminder could not be deleted.");
      return;
    }
    setReminders((current) => current.filter((item) => item.id !== id));
  }

  async function toggleEmail(enabled: boolean) {
    setError(null);
    const response = await fetch("/api/v1/reminders/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailEnabled: enabled }),
    });
    if (!response.ok) {
      setError("Your email preference could not be saved.");
      return;
    }
    setPreferences((current) => ({ ...current, emailEnabled: enabled }));
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
        <p className="text-sm text-muted-foreground">Date-based email reminders so obligations are not missed. Not legal or compliance advice.</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <form className="space-y-3" onSubmit={createReminder}>
            <Input
              aria-label="Reminder title"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What are you being reminded about?"
              required
              type="text"
              value={title}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label="Obligation date"
                min={today}
                onChange={(event) => setObligationDate(event.target.value)}
                required
                type="date"
                value={obligationDate}
              />
              <Input
                aria-label="Action URL"
                onChange={(event) => setActionUrl(event.target.value)}
                placeholder="Action link (optional)"
                type="url"
                value={actionUrl}
              />
            </div>
            <Input
              aria-label="Reminder note"
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note (optional)"
              type="text"
              value={note}
            />
            <fieldset className="rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Remind me before</legend>
              <div className="flex flex-wrap items-center gap-4">
                {DEFAULT_OFFSETS.map((offset) => (
                  <label className="flex items-center gap-2 text-sm" key={offset}>
                    <input
                      checked={offsets.includes(offset)}
                      className="h-4 w-4 rounded border-input"
                      onChange={() => toggleOffset(offset)}
                      type="checkbox"
                    />
                    {offset} day{offset === 1 ? "" : "s"}
                  </label>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">delivered at 9am {preferences.timezone}</span>
              </div>
            </fieldset>
            <Button disabled={busy} type="submit">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Creating..." : "Add reminder"}
            </Button>
            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <label className="mb-6 flex items-center gap-2 text-sm font-medium">
        <input
          checked={preferences.emailEnabled}
          className="h-4 w-4 rounded border-input"
          onChange={(event) => void toggleEmail(event.target.checked)}
          type="checkbox"
        />
        Email me reminder notifications
      </label>

      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reminders yet. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {reminders.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatCalendarDate(item.obligationDate)} · {item.timezone}
                    </p>
                    {item.note ? <p className="text-sm text-muted-foreground">{item.note}</p> : null}
                    {item.actionUrl ? <p className="text-sm text-muted-foreground">Action: {item.actionUrl}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.deliveries.map((delivery) => (
                      <Badge
                        className={delivery.status === "failed" ? "border-destructive text-destructive" : delivery.status === "sent" || delivery.status === "delivered" ? "border-green-500 text-green-700 dark:text-green-400" : ""}
                        key={delivery.id}
                        variant="outline"
                      >
                        {delivery.offsetDays}d · {formatDate(delivery.scheduledFor)} · {statusLabels[delivery.status]}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {item.status === "active" ? (
                      <Button onClick={() => void cancelReminder(item.id)} size="sm" variant="ghost">
                        <XCircle className="h-3 w-3" />
                        Cancel
                      </Button>
                    ) : null}
                    <Button onClick={() => void deleteReminder(item.id)} size="sm" variant="ghost">
                      <Trash2 className="h-3 w-3 text-destructive" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
