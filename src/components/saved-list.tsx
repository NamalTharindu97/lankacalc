"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type SavedItem = {
  id: string;
  name: string;
  calculatorKey: string;
  createdAt: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SavedList({ items }: { items: SavedItem[] }) {
  const router = useRouter();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function rename(id: string) {
    const response = await fetch(`/api/v1/saved-calculations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renamingName }),
    });
    if (!response.ok) {
      setError("The calculation could not be renamed.");
      return;
    }
    setRenamingId(null);
    setError(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this saved calculation?")) return;
    const response = await fetch(`/api/v1/saved-calculations/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("The calculation could not be deleted.");
      return;
    }
    setError(null);
    router.refresh();
  }

  async function exportItem(id: string) {
    const response = await fetch(`/api/v1/saved-calculations/${id}/export`);
    if (!response.ok) {
      setError("The calculation could not be exported.");
      return;
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? "saved-calculation.json";
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (items.length === 0) {
    return (
      <section className="saved-page">
        <div className="panel-heading">
          <span>01</span>
          <div><h1>Saved calculations</h1><p>Nothing saved yet. Run a calculation and save the result.</p></div>
        </div>
        <Link className="primary-action" href="/#calculators">Choose a calculator</Link>
      </section>
    );
  }

  return (
    <section className="saved-page">
      <div className="panel-heading">
        <span>01</span>
        <div><h1>Saved calculations</h1><p>Your saved inputs, results, rules, and assumptions.</p></div>
      </div>

      <ul className="saved-list">
        {items.map((item) => (
          <li className="saved-row" key={item.id}>
            {renamingId === item.id ? (
              <form
                className="saved-rename"
                onSubmit={(event) => {
                  event.preventDefault();
                  void rename(item.id);
                }}
              >
                <div className="input-shell">
                  <input
                    aria-label="New name"
                    autoFocus
                    maxLength={160}
                    onChange={(event) => setRenamingName(event.target.value)}
                    required
                    type="text"
                    value={renamingName}
                  />
                </div>
                <button className="save-submit" type="submit">Rename</button>
                <button className="text-button" onClick={() => setRenamingId(null)} type="button">Cancel</button>
              </form>
            ) : (
              <>
                <div className="saved-details">
                  <strong>{item.name}</strong>
                  <span>{item.calculatorKey} · saved {formatDate(item.createdAt)}</span>
                </div>
                <div className="saved-actions">
                  <Link className="text-button" href={`/calculators/${item.calculatorKey}`}>Open</Link>
                  <button
                    className="text-button"
                    onClick={() => {
                      setRenamingName(item.name);
                      setRenamingId(item.id);
                    }}
                    type="button"
                  >
                    Rename
                  </button>
                  <button className="text-button" onClick={() => void exportItem(item.id)} type="button">Export</button>
                  <button className="text-button danger" onClick={() => void remove(item.id)} type="button">Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {error ? <div className="form-error" role="alert">{error}</div> : null}
    </section>
  );
}
