"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { ZodError } from "zod";
import { AlertCircle, Calculator, CheckCircle2, Loader2, Save, X } from "lucide-react";

import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{field.label}</Label>
      <div className="flex items-center gap-2">
        {field.type === "select" ? (
          <Select
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
          </Select>
        ) : (
          <Input
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
        {field.suffix ? (
          <span className="shrink-0 text-sm font-medium text-muted-foreground">{field.suffix}</span>
        ) : null}
      </div>
      {field.description ? (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
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
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
              01
            </div>
            <div>
              <CardTitle className="text-lg">Your values</CardTitle>
              <p className="text-sm text-muted-foreground">Only values needed for this calculation are sent.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
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

            {formError ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError}
              </div>
            ) : null}

            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  Calculate result
                  <Calculator className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card aria-live="polite" aria-busy={isPending}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
              02
            </div>
            <div>
              <CardTitle className="text-lg">Result</CardTitle>
              <p className="text-sm text-muted-foreground">Totals, workings, and declared assumptions.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {result.breakdown.map((item) => (
                  <div className="rounded-lg bg-muted/50 p-4" key={item.label}>
                    <span className="text-xs font-medium uppercase text-muted-foreground">{item.label}</span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight">{formatValue(item.value)}</span>
                      {item.unit ? <span className="text-xs font-medium text-muted-foreground">{item.unit}</span> : null}
                    </div>
                    {item.expression ? (
                      <code className="mt-2 block text-xs text-muted-foreground">{item.expression}</code>
                    ) : null}
                  </div>
                ))}
              </div>

              {result.assumptions.length > 0 ? (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Assumptions</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {result.assumptions.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  </div>
                </>
              ) : null}

              {result.warnings.length > 0 ? (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">Check before deciding</h3>
                  <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                    {result.warnings.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                </div>
              ) : null}

              <Separator />

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Normalized inputs</h3>
                <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {Object.entries(result.normalizedInputs).map(([key, value]) => (
                    <div className="flex justify-between" key={key}>
                      <span>{humanize(key)}:</span>
                      <span className="font-medium text-foreground">{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {result.ruleVersions.length > 0 ? (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Rule versions</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {result.ruleVersions.map((rule) => (
                        <p key={`${rule.key}-${rule.version}`}>
                          {rule.key} {rule.version}, effective {rule.effectiveFrom}{rule.effectiveTo ? ` to ${rule.effectiveTo}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {result.sources.length > 0 ? (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Sources</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {result.sources.map((source) => (
                        <a
                          className="block rounded-md border p-2 transition-colors hover:bg-muted"
                          href={source.url}
                          key={source.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="font-medium text-foreground">{source.authority}: {source.title}</span>
                          <span className="mt-1 block text-xs">
                            {source.publishedOn ? `Published ${source.publishedOn}` : ""}
                            {source.retrievedAt ? `, retrieved ${source.retrievedAt}` : ""}
                            {`, verified ${source.verifiedAt}`}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                {result.verifiedAt ? <p>Last verified {result.verifiedAt}</p> : null}
                <p>Calculated with {result.calculator} v{result.calculationVersion}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                {saveStatus === "saved" ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved to your account.{" "}
                    <Link className="underline" href="/saved">View saved calculations</Link>
                  </div>
                ) : saveOpen ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void persistSave(saveName);
                    }}
                  >
                    <Label htmlFor="save-name">Name this calculation</Label>
                    <div className="flex gap-2">
                      <Input
                        id="save-name"
                        maxLength={160}
                        onChange={(event) => setSaveName(event.target.value)}
                        required
                        type="text"
                        value={saveName}
                      />
                      <Button disabled={saveStatus === "saving"} size="sm" type="submit">
                        {saveStatus === "saving" ? "Saving..." : "Save"}
                      </Button>
                      <Button onClick={() => setSaveOpen(false)} size="sm" type="button" variant="ghost">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button onClick={handleSaveClick} type="button" variant="outline">
                    <Save className="h-4 w-4" />
                    {session ? "Save result" : "Save result · sign in"}
                  </Button>
                )}
                {saveError ? (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {saveError}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <span className="text-4xl font-bold text-muted-foreground">=</span>
              </div>
              <p className="mt-4 max-w-[260px] text-sm text-muted-foreground">
                Enter your values to see a transparent breakdown here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
