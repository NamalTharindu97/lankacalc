"use client";

import { useState } from "react";

import {
  buildOperationRequest,
  operationDefaults,
  rulePlatformOperations,
  type RulePlatformOperation,
} from "@/domain/rule-platform/operations";

type DashboardSource = {
  id: string;
  key: string;
  authority: string;
  title: string;
  url: string;
  official: boolean;
  verifiedAt: string | null;
  revision: number;
  linkCheck: { status: string; checkedAt: string } | null;
};

type DashboardDefinition = {
  id: string;
  key: string;
  calculatorKey: string;
  scope: string;
  name: string;
};

type DashboardVersion = {
  id: string;
  ruleDefinitionId: string;
  ruleName: string;
  version: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  checksum: string;
  reviewer: string | null;
  publishedAt: string | null;
};

type AgedCount = { count: number; oldestAt: string | null; oldestAgeSeconds: number | null };

type OperationalStatus = {
  generatedAt: string;
  thresholdsSeconds: { reminderStaleClaim: number; reportStuck: number };
  reminders: {
    deliveries: { pending: number; claimed: number; sent: number; skipped: number; failed: number };
    attempts: { success: number; transientFailure: number; permanentFailure: number; skipped: number };
    overduePending: AgedCount;
    staleClaimed: AgedCount;
    failed: AgedCount;
  };
  reports: {
    jobs: { queued: number; generating: number; completed: number; ready: number; failed: number };
    stuckQueued: AgedCount;
    stuckGenerating: AgedCount;
    failed: AgedCount;
  };
};

type DashboardData = {
  sources: DashboardSource[];
  definitions: DashboardDefinition[];
  versions: DashboardVersion[];
  totals: { sources: number; definitions: number; drafts: number; published: number };
  operations: OperationalStatus;
  operator: { name: string; role: "admin" | "reviewer" };
};

const groups = ["Sources", "Rules", "Evidence", "Lifecycle"] as const;

function localDateTime(): string {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(new Date(value.includes("T") ? value : `${value}T00:00:00Z`));
}

function formatAge(seconds: number | null): string {
  if (seconds === null) return "none";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86_400)}d ${Math.floor((seconds % 86_400) / 3600)}h`;
}

function errorMessage(body: unknown, status: number): string {
  if (!body || typeof body !== "object") return `Request failed with HTTP ${status}.`;
  const error = (body as { error?: { code?: string; message?: string; fields?: Record<string, string[]> } }).error;
  if (!error) return `Request failed with HTTP ${status}.`;
  const fields = error.fields ? Object.values(error.fields).flat().join(" ") : "";
  return [error.code, error.message, fields].filter(Boolean).join(": ");
}

export function RulePlatformConsole() {
  const initialOperation = rulePlatformOperations[0];
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [operation, setOperation] = useState<RulePlatformOperation>(initialOperation);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => operationDefaults(initialOperation));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);

  async function request(payload: Record<string, unknown>, requestToken = token): Promise<unknown> {
    const response = await fetch("/api/internal/rule-platform", {
      method: "POST",
      headers: {
        authorization: `Bearer ${requestToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body: unknown = await response.json();
    if (!response.ok) throw new Error(errorMessage(body, response.status));
    return (body as { data: unknown }).data;
  }

  async function refreshDashboard(requestToken = token) {
    const data = await request({ action: "dashboard" }, requestToken) as DashboardData;
    setDashboard(data);
    return data;
  }

  async function connect() {
    if (!token.trim()) {
      setError("Enter an administrator or reviewer token.");
      return;
    }
    const requestToken = token;
    setBusy(true);
    setError("");
    try {
      const data = await refreshDashboard(requestToken);
      if (data.operator.role === "reviewer" && operation.permission === "Admin") {
        const reviewerOperation = rulePlatformOperations.find((item) => item.permission === "Reviewer")!;
        setOperation(reviewerOperation);
        setValues(operationDefaults(reviewerOperation));
      }
      setConnected(true);
      setResult({ connected: true, message: "Operator session authenticated." });
    } catch (connectionError) {
      setConnected(false);
      setError(connectionError instanceof Error ? connectionError.message : "Could not authenticate.");
    } finally {
      setBusy(false);
    }
  }

  function chooseOperation(next: RulePlatformOperation, seeds: Record<string, string | boolean> = {}) {
    if (dashboard?.operator.role === "reviewer" && next.permission === "Admin") {
      setError("This action requires an administrator token.");
      return;
    }
    const defaults = operationDefaults(next);
    if (next.fields.some((field) => field.key === "retrievedAt")) defaults.retrievedAt = localDateTime();
    setOperation(next);
    setValues({ ...defaults, ...seeds });
    setError("");
    setResult(null);
    document.getElementById("operator-workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function chooseByAction(action: string, seeds: Record<string, string | boolean>) {
    const next = rulePlatformOperations.find((item) => item.action === action);
    if (next) chooseOperation(next, seeds);
  }

  async function submitOperation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (["publishRule", "retireRule"].includes(operation.action) && !window.confirm(`${operation.title}: confirm the selected rule version and effective dates before continuing.`)) return;
    setBusy(true);
    setError("");
    try {
      const payload = buildOperationRequest(operation, values);
      const data = await request(payload);
      setResult(data);
      try {
        await refreshDashboard();
      } catch (refreshError) {
        setError(`The operation succeeded, but the registers could not refresh. ${refreshError instanceof Error ? refreshError.message : "Refresh the session to reload them."}`);
      }
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rule-console">
      <section className="operator-hero">
        <div>
          <p className="eyebrow">Protected administration</p>
          <h1>Rule desk.</h1>
          <p className="operator-intro">Register evidence, test effective-dated parameters, and publish regulated rules through one auditable workflow.</p>
        </div>
        <div className={`operator-connection ${connected ? "is-connected" : ""}`}>
          <span className="connection-light" aria-hidden="true" />
          <div><strong>{connected ? `${dashboard?.operator.role ?? "operator"} session` : "Session locked"}</strong><small>{connected ? dashboard?.operator.name ?? "Dashboard data is current" : "Bearer token required"}</small></div>
        </div>
      </section>

      <section className="operator-auth" aria-labelledby="operator-access-title">
        <div>
          <span className="operator-index">00</span>
          <h2 id="operator-access-title">Operator access</h2>
          <p>Tokens remain in this browser tab only. They are never written to local storage.</p>
        </div>
        <div className="token-entry">
          <label htmlFor="operator-token">Admin or reviewer token</label>
          <div>
            <input
              autoComplete="off"
              disabled={busy}
              id="operator-token"
              onChange={(event) => { setToken(event.target.value); setConnected(false); setDashboard(null); }}
              placeholder="Paste a 32+ character token"
              type="password"
              value={token}
            />
            <button disabled={busy} onClick={connect} type="button">{busy ? "Checking..." : connected ? "Refresh" : "Connect"}</button>
          </div>
        </div>
      </section>

      {error && !connected ? <p className="operator-alert" role="alert">{error}</p> : null}

      {connected && dashboard ? (
        <>
          <section className="operator-metrics" aria-label="Rule platform summary">
            <article><span>01</span><strong>{dashboard.totals.sources}</strong><p>registered sources</p></article>
            <article><span>02</span><strong>{dashboard.totals.definitions}</strong><p>rule definitions</p></article>
            <article><span>03</span><strong>{dashboard.totals.drafts}</strong><p>draft versions</p></article>
            <article><span>04</span><strong>{dashboard.totals.published}</strong><p>published versions</p></article>
          </section>

          <section className="operator-registers" aria-label="Operational job health">
            <div className="register-panel">
              <div className="register-heading"><div><span>Reminders</span><h2>Delivery health</h2></div><small>Updated {formatDate(dashboard.operations.generatedAt)}</small></div>
              <div className="version-table">
                <article><div><strong>{dashboard.operations.reminders.deliveries.pending} pending / {dashboard.operations.reminders.deliveries.claimed} claimed</strong><small>Current delivery queue</small></div><span className="status-pill">queue</span></article>
                <article><div><strong>{dashboard.operations.reminders.overduePending.count} overdue</strong><small>Oldest {formatAge(dashboard.operations.reminders.overduePending.oldestAgeSeconds)}</small></div><span className={`status-pill ${dashboard.operations.reminders.overduePending.count ? "status-failed" : "status-published"}`}>due</span></article>
                <article><div><strong>{dashboard.operations.reminders.staleClaimed.count} stale claims</strong><small>Oldest {formatAge(dashboard.operations.reminders.staleClaimed.oldestAgeSeconds)} / threshold {formatAge(dashboard.operations.thresholdsSeconds.reminderStaleClaim)}</small></div><span className={`status-pill ${dashboard.operations.reminders.staleClaimed.count ? "status-failed" : "status-published"}`}>claims</span></article>
                <article><div><strong>{dashboard.operations.reminders.failed.count} failed deliveries</strong><small>Oldest {formatAge(dashboard.operations.reminders.failed.oldestAgeSeconds)} / {dashboard.operations.reminders.attempts.permanentFailure} permanent attempts</small></div><span className={`status-pill ${dashboard.operations.reminders.failed.count ? "status-failed" : "status-published"}`}>failed</span></article>
              </div>
            </div>

            <div className="register-panel">
              <div className="register-heading"><div><span>Reports</span><h2>Generation health</h2></div><small>No report content or errors</small></div>
              <div className="version-table">
                <article><div><strong>{dashboard.operations.reports.jobs.queued} queued / {dashboard.operations.reports.jobs.generating} generating</strong><small>{dashboard.operations.reports.jobs.ready} ready reports</small></div><span className="status-pill">queue</span></article>
                <article><div><strong>{dashboard.operations.reports.stuckQueued.count} stuck queued</strong><small>Oldest {formatAge(dashboard.operations.reports.stuckQueued.oldestAgeSeconds)} / threshold {formatAge(dashboard.operations.thresholdsSeconds.reportStuck)}</small></div><span className={`status-pill ${dashboard.operations.reports.stuckQueued.count ? "status-failed" : "status-published"}`}>queued</span></article>
                <article><div><strong>{dashboard.operations.reports.stuckGenerating.count} stuck generating</strong><small>Oldest {formatAge(dashboard.operations.reports.stuckGenerating.oldestAgeSeconds)}</small></div><span className={`status-pill ${dashboard.operations.reports.stuckGenerating.count ? "status-failed" : "status-published"}`}>running</span></article>
                <article><div><strong>{dashboard.operations.reports.failed.count} failed jobs</strong><small>Oldest {formatAge(dashboard.operations.reports.failed.oldestAgeSeconds)} / legacy completed {dashboard.operations.reports.jobs.completed}</small></div><span className={`status-pill ${dashboard.operations.reports.failed.count ? "status-failed" : "status-published"}`}>failed</span></article>
              </div>
            </div>
          </section>

          <section className="operator-registers">
            <div className="register-panel">
              <div className="register-heading"><div><span>Sources</span><h2>Evidence register</h2></div><button disabled={dashboard.operator.role === "reviewer"} onClick={() => chooseByAction("createSource", {})} type="button">New source</button></div>
              {dashboard.sources.length ? (
                <div className="register-list">
                  {dashboard.sources.map((source) => (
                    <article key={source.id}>
                      <div className="register-main"><span className={`status-dot status-${source.linkCheck?.status ?? "unchecked"}`} aria-hidden="true" /><div><strong>{source.title}</strong><p>{source.authority} / revision {source.revision} / link {source.linkCheck?.status ?? "unchecked"}</p></div></div>
                      <div className="register-meta"><code>{source.key}</code><span>{source.verifiedAt ? `Verified ${formatDate(source.verifiedAt)}` : "Not verified"}</span></div>
                      <div className="register-actions">
                        <button onClick={() => chooseByAction("checkSource", { sourceId: source.id })} type="button">Check</button>
                        <button onClick={() => chooseByAction("verifySource", { sourceId: source.id })} type="button">Verify</button>
                        <button disabled={dashboard.operator.role === "reviewer"} onClick={() => chooseByAction("reviseSource", { sourceId: source.id, authority: source.authority, title: source.title, url: source.url })} type="button">Revise</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="register-empty">No sources yet. Register an official publication to begin.</p>}
            </div>

            <div className="register-panel">
              <div className="register-heading"><div><span>Rules</span><h2>Version register</h2></div><button disabled={dashboard.operator.role === "reviewer"} onClick={() => chooseByAction("createDefinition", {})} type="button">New definition</button></div>
              {dashboard.versions.length ? (
                <div className="version-table" aria-label="Recent rule versions">
                  {dashboard.versions.map((version) => (
                    <article key={version.id}>
                      <div><span className={`status-pill status-${version.status}`}>{version.status}</span><strong>{version.ruleName}</strong><small>v{version.version} / {version.effectiveFrom}</small></div>
                      <code>{version.checksum.slice(0, 10)}</code>
                      <div className="register-actions">
                        {version.status === "draft" ? <button disabled={dashboard.operator.role === "reviewer"} onClick={() => chooseByAction("attachSource", { ruleVersionId: version.id })} type="button">Evidence</button> : null}
                        <button onClick={() => chooseByAction("ruleHistory", { ruleVersionId: version.id })} type="button">History</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="register-empty">No rule versions yet. Create a definition, then a draft.</p>}
            </div>
          </section>

          <section className="operator-workspace" id="operator-workbench">
            <nav className="operation-nav" aria-label="Rule platform operations">
              {groups.map((group) => (
                <div key={group}>
                  <p>{group}</p>
                  {rulePlatformOperations.filter((item) => item.group === group).map((item) => (
                    <button className={item.id === operation.id ? "is-active" : ""} disabled={dashboard.operator.role === "reviewer" && item.permission === "Admin"} key={item.id} onClick={() => chooseOperation(item)} type="button">
                      <span>{item.title}</span><small>{item.permission}</small>
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <div className="operation-form-panel">
              <div className="operation-heading"><span>{String(rulePlatformOperations.indexOf(operation) + 1).padStart(2, "0")}</span><div><p>{operation.group} / {operation.permission}</p><h2>{operation.title}</h2><small>{operation.description}</small></div></div>
              <form autoComplete="off" key={operation.id} onSubmit={submitOperation}>
                <div className="operation-fields">
                  {operation.fields.map((field) => {
                    const helpId = field.help ? `${operation.id}-${field.key}-help` : undefined;
                    if (field.type === "checkbox") {
                      return <label className="operator-checkbox" key={field.key}><input checked={Boolean(values[field.key])} onChange={(event) => setValues({ ...values, [field.key]: event.target.checked })} type="checkbox" /><span>{field.label}</span></label>;
                    }
                    return (
                      <label className={`operator-field field-${field.type}`} key={field.key}>
                        <span>{field.label}{field.required ? " *" : ""}</span>
                        {field.type === "select" ? (
                          <select aria-describedby={helpId} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} required={field.required} value={String(values[field.key] ?? "")}>
                            {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        ) : field.type === "textarea" || field.type === "json" ? (
                          <textarea aria-describedby={helpId} className={field.type === "json" ? "json-input" : ""} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} placeholder={field.placeholder} required={field.required} rows={field.type === "json" ? 8 : 4} value={String(values[field.key] ?? "")} />
                        ) : (
                          <input aria-describedby={helpId} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} placeholder={field.placeholder} required={field.required} type={field.type} value={String(values[field.key] ?? "")} />
                        )}
                        {field.help ? <small id={helpId}>{field.help}</small> : null}
                      </label>
                    );
                  })}
                </div>
                {error ? <p className="operator-alert" role="alert">{error}</p> : null}
                <button className="operator-submit" disabled={busy} type="submit"><span>{busy ? "Working..." : operation.title}</span><span aria-hidden="true">-&gt;</span></button>
              </form>
            </div>

            <aside className="operation-output" aria-live="polite">
              <div><span>Output</span><button onClick={() => result && navigator.clipboard.writeText(JSON.stringify(result, null, 2))} type="button">Copy JSON</button></div>
              {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : <p>Successful responses, IDs, fixture differences, and audit history appear here.</p>}
            </aside>
          </section>
        </>
      ) : (
        <section className="operator-locked" aria-hidden="true"><span>LC / RULES</span><p>Authenticate to open the evidence and version registers.</p></section>
      )}
    </div>
  );
}
