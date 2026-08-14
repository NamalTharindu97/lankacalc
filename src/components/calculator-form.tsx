"use client";

import { useState, useTransition, type FormEvent } from "react";

import type {
  CalculationResult,
  CalculatorField,
  CalculatorMetadata,
} from "@/domain/calculators/types";

type ApiError = {
  error?: {
    message?: string;
    issues?: Array<{ path: string; message: string }>;
  };
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
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

  return value;
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/calculations/${calculator.key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
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
            if (field.visibleWhen && values[field.visibleWhen.field] !== field.visibleWhen.equals) {
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
            <p className="result-version">Calculated with {result.calculator} v{result.calculationVersion}</p>
          </div>
        ) : (
          <div className="result-empty">
            <span aria-hidden="true">=</span>
            <p>Enter your values to see a transparent breakdown here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
