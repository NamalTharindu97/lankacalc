"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <section className="saved-page">
      <div className="panel-heading">
        <span>01</span>
        <div>
          <h1>Reminders</h1>
          <p>Date-based email reminders so obligations are not missed. Not legal or compliance advice.</p>
        </div>
      </div>

      <form className="reminder-form" onSubmit={createReminder}>
        <div className="input-shell">
          <input
            aria-label="Reminder title"
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What are you being reminded about?"
            required
            type="text"
            value={title}
          />
        </div>
        <div className="reminder-form-row">
          <div className="input-shell">
            <input
              aria-label="Obligation date"
              min={today}
              onChange={(event) => setObligationDate(event.target.value)}
              required
              type="date"
              value={obligationDate}
            />
          </div>
          <div className="input-shell">
            <input
              aria-label="Action URL"
              onChange={(event) => setActionUrl(event.target.value)}
              placeholder="Action link (optional)"
              type="url"
              value={actionUrl}
            />
          </div>
        </div>
        <div className="input-shell">
          <input
            aria-label="Reminder note"
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note (optional)"
            type="text"
            value={note}
          />
        </div>
        <fieldset className="reminder-offsets">
          <legend>Remind me before</legend>
          {DEFAULT_OFFSETS.map((offset) => (
            <label key={offset}>
              <input
                checked={offsets.includes(offset)}
                onChange={() => toggleOffset(offset)}
                type="checkbox"
              />
              {offset} day{offset === 1 ? "" : "s"}
            </label>
          ))}
          <span className="reminder-timezone">delivered at 9am {preferences.timezone}</span>
        </fieldset>
        <button className="save-submit" disabled={busy} type="submit">
          {busy ? "Creating…" : "Add reminder"}
        </button>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
      </form>

      <label className="reminder-email-toggle">
        <input
          checked={preferences.emailEnabled}
          onChange={(event) => void toggleEmail(event.target.checked)}
          type="checkbox"
        />
        Email me reminder notifications
      </label>

      {reminders.length === 0 ? (
        <p className="reminder-empty">No reminders yet. Add one above.</p>
      ) : (
        <ul className="reminder-list">
          {reminders.map((item) => (
            <li className="saved-row reminder-row" key={item.id}>
              <div className="saved-details">
                <strong>{item.title}</strong>
                <span>
                  {formatCalendarDate(item.obligationDate)} · {item.timezone}
                </span>
                {item.note ? <span>{item.note}</span> : null}
                {item.actionUrl ? <span>Action: {item.actionUrl}</span> : null}
              </div>
              <div className="reminder-deliveries">
                {item.deliveries.map((delivery) => (
                  <span className={`delivery-badge delivery-${delivery.status}`} key={delivery.id}>
                    {delivery.offsetDays}d · {formatDate(delivery.scheduledFor)} · {statusLabels[delivery.status]}
                  </span>
                ))}
              </div>
              <div className="saved-actions">
                {item.status === "active" ? (
                  <button className="text-button" onClick={() => void cancelReminder(item.id)} type="button">
                    Cancel
                  </button>
                ) : null}
                <button className="text-button danger" onClick={() => void deleteReminder(item.id)} type="button">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
