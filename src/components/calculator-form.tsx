"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { ZodError } from "zod";

import { AuthDialog } from "@/components/auth-dialog";
import { getCalculator } from "@/domain/calculators/registry";
import type {
  CalculationResult,
  CalculatorField,
  CalculatorMetadata,
} from "@/domain/calculators/types";
import { authClient } from "@/server/auth/client";

type ApiError = {
  error?: {
    message?: string;
    issues?: Array<{ path: string; message: string }>;
  };
};

function today(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function initialValues(fields: readonly CalculatorField[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      String(field.defaultValue ?? (field.name === "asOfDate" ? today() : "")),
    ]),
  );
}

function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-LK", { maximumFractionDigits: 6 }).format(value);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    const sign = value.startsWith("-") ? "-" : "";
    const unsigned = sign ? value.slice(1) : value;
    const [integer, fraction] = unsigned.split(".");
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${sign}${grouped}${fraction ? `.${fraction}` : ""}`;
  }

  return value;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function hiddenField(
  field: CalculatorField,
  values: Record<string, string>,
): boolean {
  const visibleWhen = field.visibleWhen;
  if (visibleWhen === undefined) {
    return false;
  }
  if (visibleWhen.equals !== undefined && values[visibleWhen.field] !== visibleWhen.equals) {
    return true;
  }
  if (visibleWhen.notEquals !== undefined && values[visibleWhen.field] === visibleWhen.notEquals) {
    return true;
  }
  if (visibleWhen.in !== undefined && !visibleWhen.in.includes(values[visibleWhen.field])) {
    return true;
  }
  if (visibleWhen.notIn !== undefined && visibleWhen.notIn.includes(values[visibleWhen.field])) {
    return true;
  }
  return false;
}

function submissionValues(
  fields: readonly CalculatorField[],
  values: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    fields
      .filter((field) => !hiddenField(field, values))
      .map((field) => [field.name, values[field.name]]),
  );
}

function InputField({
  field,
  value,
  error,
  onChange,
}: {
  field: CalculatorField;
  value: string;
  error?: string;
  onChange(value: string): void;
}) {
  const describedBy = [field.description ? `${field.name}-description` : "", error ? `${field.name}-error` : ""]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="field-group">
      <label htmlFor={field.name}>{field.label}</label>
      <div className="input-shell">
        {field.type === "select" ? (
          <select
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            id={field.name}
            name={field.name}
            onChange={(event) => onChange(event.target.value)}
            required={field.required}
            value={value}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <input
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            id={field.name}
            max={field.max}
            min={field.min}
            name={field.name}
            onChange={(event) => onChange(event.target.value)}
            required={field.required}
            step={field.step}
            type={field.type}
            value={value}
          />
        )}
        {field.suffix ? <span className="input-suffix">{field.suffix}</span> : null}
      </div>
      {field.description ? <p id={`${field.name}-description`}>{field.description}</p> : null}
      {error ? <p className="field-error" id={`${field.name}-error`}>{error}</p> : null}
    </div>
  );
}

export function CalculatorForm({ calculator }: { calculator: CalculatorMetadata }) {
  const [values, setValues] = useState(() => initialValues(calculator.fields));
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const { data: session } = authClient.useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingSaveRef = useRef(false);

  function defaultSaveName(): string {
    return `${calculator.shortName} · ${today()}`;
  }

  async function persistSave(name: string) {
    if (!result) return;
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const response = await fetch("/api/v1/saved-calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          calculatorKey: calculator.key,
          input: submissionValues(calculator.fields, values),
          result,
        }),
      });
      if (!response.ok) {
        setSaveError("The calculation could not be saved. Please try again.");
        return;
      }
      setSaveStatus("saved");
    } catch {
      setSaveError("The save service is unavailable. Please try again.");
    } finally {
      setSaveStatus((status) => (status === "saving" ? "idle" : status));
    }
  }

  function handleSaveClick() {
    if (!session) {
      pendingSaveRef.current = true;
      setAuthOpen(true);
      return;
    }
    setSaveName(defaultSaveName());
    setSaveOpen(true);
  }

  function handleAuthenticated() {
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      void persistSave(defaultSaveName());
    }
  }

  function showValidationError(error: ZodError) {
    setResult(null);
    setFormError("The calculation input is invalid.");
    setFieldErrors(
      Object.fromEntries(
        error.issues.map((issue) => [issue.path.join("."), issue.message]),
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      if (calculator.classification === "static") {
        try {
          const definition = getCalculator(calculator.key);
          if (!definition) {
            setFormError("The calculator definition is unavailable.");
            return;
          }

          if (definition.execution !== "browser") {
            setFormError("This regulated calculator requires the calculation service.");
            return;
          }

          setResult(definition.calculate(values));
        } catch (error) {
          if (error instanceof ZodError) {
            showValidationError(error);
            return;
          }

          setResult(null);
          setFormError("The calculation could not be completed.");
        }
        return;
      }

      try {
        const response = await fetch(`/api/v1/calculations/${calculator.key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submissionValues(calculator.fields, values)),
        });
        const body = (await response.json()) as CalculationResult | ApiError;

        if (!response.ok) {
          const apiError = body as ApiError;
          setResult(null);
          setFormError(apiError.error?.message ?? "The calculation could not be completed.");
          setFieldErrors(
            Object.fromEntries(
              (apiError.error?.issues ?? []).map((issue) => [issue.path, issue.message]),
            ),
          );
          return;
        }

        setResult(body as CalculationResult);
      } catch {
        setResult(null);
        setFormError("The calculation service is unavailable. Please try again.");
      }
    });
  }

  return (
    <div className="calculator-workspace">
      <form className="calculator-form" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <span>01</span>
          <div><h2>Your values</h2><p>Only values needed for this calculation are sent.</p></div>
        </div>

        <div className="fields">
          {calculator.fields.map((field) => {
            if (hiddenField(field, values)) {
              return null;
            }

            return (
              <InputField
                error={fieldErrors[field.name]}
                field={field}
                key={field.name}
                onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
                value={values[field.name] ?? ""}
              />
            );
          })}
        </div>

        {formError ? <div className="form-error" role="alert">{formError}</div> : null}

        <button className="calculate-button" disabled={isPending} type="submit">
          {isPending ? "Calculating..." : "Calculate result"}
        </button>
      </form>

      <section className="result-panel" aria-live="polite" aria-busy={isPending}>
        <div className="panel-heading">
          <span>02</span>
          <div><h2>Result</h2><p>Totals, workings, and declared assumptions.</p></div>
        </div>

        {result ? (
          <div className="result-content">
            <div className="result-values">
              {result.breakdown.map((item) => (
                <div className="result-value" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{formatValue(item.value)}</strong>
                  {item.unit ? <small>{item.unit}</small> : null}
                  {item.expression ? <code>{item.expression}</code> : null}
                </div>
              ))}
            </div>

            {result.assumptions.length > 0 ? (
              <div className="result-notes"><h3>Assumptions</h3>{result.assumptions.map((note) => <p key={note}>{note}</p>)}</div>
            ) : null}
            {result.warnings.length > 0 ? (
              <div className="result-notes warning-notes"><h3>Check before deciding</h3>{result.warnings.map((note) => <p key={note}>{note}</p>)}</div>
            ) : null}
            <div className="result-notes">
              <h3>Normalized inputs</h3>
              {Object.entries(result.normalizedInputs).map(([key, value]) => (
                <p key={key}><strong>{humanize(key)}:</strong> {formatValue(value)}</p>
              ))}
            </div>
            {result.ruleVersions.length > 0 ? (
              <div className="result-notes">
                <h3>Rule versions</h3>
                {result.ruleVersions.map((rule) => (
                  <p key={`${rule.key}-${rule.version}`}>{rule.key} {rule.version}, effective {rule.effectiveFrom}{rule.effectiveTo ? ` to ${rule.effectiveTo}` : ""}</p>
                ))}
              </div>
            ) : null}
            {result.sources.length > 0 ? (
              <div className="result-notes">
                <h3>Sources</h3>
                {result.sources.map((source) => (
                  <p key={source.url}><a href={source.url} rel="noreferrer" target="_blank">{source.authority}: {source.title}</a>{source.publishedOn ? ` (published ${source.publishedOn})` : ""}{source.retrievedAt ? `, retrieved ${source.retrievedAt}` : ""}, verified {source.verifiedAt}</p>
                ))}
              </div>
            ) : null}
            {result.verifiedAt ? <p className="result-version">Last verified {result.verifiedAt}</p> : null}
            <p className="result-version">Calculated with {result.calculator} v{result.calculationVersion}</p>

            <div className="save-area">
              {saveStatus === "saved" ? (
                <p className="save-confirmed">
                  Saved to your account. <Link href="/saved">View saved calculations</Link>
                </p>
              ) : saveOpen ? (
                <form
                  className="save-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void persistSave(saveName);
                  }}
                >
                  <label htmlFor="save-name">Name this calculation</label>
                  <div className="save-form-row">
                    <div className="input-shell">
                      <input
                        id="save-name"
                        maxLength={160}
                        onChange={(event) => setSaveName(event.target.value)}
                        required
                        type="text"
                        value={saveName}
                      />
                    </div>
                    <button className="save-submit" disabled={saveStatus === "saving"} type="submit">
                      {saveStatus === "saving" ? "Saving..." : "Save"}
                    </button>
                    <button className="text-button" onClick={() => setSaveOpen(false)} type="button">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button className="save-button" onClick={handleSaveClick} type="button">
                  {session ? "Save result" : "Save result · sign in"}
                </button>
              )}
              {saveError ? <div className="form-error" role="alert">{saveError}</div> : null}
            </div>
          </div>
        ) : (
          <div className="result-empty">
            <span aria-hidden="true">=</span>
            <p>Enter your values to see a transparent breakdown here.</p>
          </div>
        )}
      </section>

      <AuthDialog
        onAuthenticated={handleAuthenticated}
        onClose={() => {
          pendingSaveRef.current = false;
          setAuthOpen(false);
        }}
        open={authOpen}
      />
    </div>
  );
}
