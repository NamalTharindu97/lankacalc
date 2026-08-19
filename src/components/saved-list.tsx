"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Download, FileText, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type SavedItem = {
  id: string;
  name: string;
  calculatorKey: string;
  createdAt: string;
};

type ReportState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "ready"; downloadUrl: string }
  | { status: "failed"; error: string };

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
  const [reportState, setReportState] = useState<Record<string, ReportState>>({});

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

  async function generateReport(id: string) {
    setReportState((current) => ({ ...current, [id]: { status: "generating" } }));
    try {
      const created = await fetch(`/api/v1/saved-calculations/${id}/report`, { method: "POST" });
      if (!created.ok) throw new Error();
      const report = (await created.json()) as { id: string };

      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const response = await fetch(`/api/v1/reports/${report.id}`);
        if (!response.ok) throw new Error();
        const meta = (await response.json()) as { status: string; downloadUrl: string | null; errorMessage?: string };
        if (meta.status === "ready" && meta.downloadUrl) {
          const downloadUrl = meta.downloadUrl;
          setReportState((current) => ({ ...current, [id]: { status: "ready", downloadUrl } }));
          return;
        }
        if (meta.status === "failed") {
          setReportState((current) => ({
            ...current,
            [id]: { status: "failed", error: meta.errorMessage ?? "The report could not be generated." },
          }));
          return;
        }
      }
      throw new Error();
    } catch {
      setReportState((current) => ({
        ...current,
        [id]: { status: "failed", error: "The report could not be generated." },
      }));
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Saved calculations</CardTitle>
            <p className="text-sm text-muted-foreground">Nothing saved yet. Run a calculation and save the result.</p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/#calculators">Choose a calculator</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Saved calculations</h1>
        <p className="text-sm text-muted-foreground">Your saved inputs, results, rules, and assumptions.</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const report = reportState[item.id];
          return (
            <Card key={item.id}>
              <CardContent className="p-4">
                {renamingId === item.id ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void rename(item.id);
                    }}
                  >
                    <Input
                      aria-label="New name"
                      autoFocus
                      className="flex-1"
                      maxLength={160}
                      onChange={(event) => setRenamingName(event.target.value)}
                      required
                      type="text"
                      value={renamingName}
                    />
                    <Button size="sm" type="submit">Rename</Button>
                    <Button onClick={() => setRenamingId(null)} size="sm" type="button" variant="ghost">Cancel</Button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.calculatorKey} · saved {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/calculators/${item.calculatorKey}`}>Open</Link>
                      </Button>
                      <Button
                        onClick={() => {
                          setRenamingName(item.name);
                          setRenamingId(item.id);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button onClick={() => void exportItem(item.id)} size="sm" variant="ghost">
                        <Download className="h-3 w-3" />
                      </Button>
                      {report?.status === "generating" ? (
                        <Button disabled size="sm" variant="ghost">
                          <Loader2 className="h-3 w-3 animate-spin" />
                        </Button>
                      ) : report?.status === "ready" ? (
                        <Button asChild size="sm" variant="ghost">
                          <a download href={report.downloadUrl} rel="noreferrer">
                            <FileText className="h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        <Button onClick={() => void generateReport(item.id)} size="sm" variant="ghost">
                          <FileText className="h-3 w-3" />
                        </Button>
                      )}
                      <Button onClick={() => void remove(item.id)} size="sm" variant="ghost">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
                {report?.status === "failed" ? (
                  <p className="mt-2 text-xs text-destructive" role="alert">{report.error}</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
    </div>
  );
}
