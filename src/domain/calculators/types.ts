import type { z } from "zod";

export type CalculatorClassification =
  | "static"
  | "configurable"
  | "regulated"
  | "data-driven"
  | "workflow";

export type CalculatorField = {
  name: string;
  label: string;
  type: "number" | "date" | "select";
  required: boolean;
  description?: string;
  defaultValue?: string | number;
  min?: number | string;
  max?: number | string;
  maxDecimalPlaces?: number;
  step?: number;
  suffix?: string;
  options?: Array<{ label: string; value: string }>;
  visibleWhen?: {
    field: string;
    equals?: string;
    notEquals?: string;
    in?: string[];
    notIn?: string[];
  };
};

export type SourceReference = {
  authority: string;
  title: string;
  url: string;
  publishedOn?: string | null;
  retrievedAt?: string;
  verifiedAt: string;
};

export type RuleReference = {
  key: string;
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type BreakdownItem = {
  label: string;
  expression?: string;
  value: string | number;
  unit?: string;
};

export type CalculationResult = {
  calculator: string;
  calculationVersion: string;
  asOfDate: string | null;
  normalizedInputs: Record<string, string | number>;
  result: Record<string, string | number>;
  breakdown: BreakdownItem[];
  assumptions: string[];
  warnings: string[];
  ruleVersions: RuleReference[];
  sources: SourceReference[];
  verifiedAt: string | null;
};

export type CalculatorMetadata = {
  key: string;
  name: string;
  shortName: string;
  summary: string;
  category: string;
  classification: CalculatorClassification;
  version: string;
  accent: "ink" | "orange" | "green" | "blue" | "rose" | "gold";
  fields: CalculatorField[];
};

export type RuleDependency = {
  name: string;
  key: string;
  scope: string;
};

export type StaticCalculatorDefinition = CalculatorMetadata & {
  execution: "browser";
  calculate(rawInput: unknown): CalculationResult;
};

export type RegulatedCalculatorDefinition = CalculatorMetadata & {
  execution: "server";
  ruleDependencies: readonly RuleDependency[];
  getAsOfDate(rawInput: unknown): string;
  calculate(rawInput: unknown, rulePayloads: Readonly<Record<string, unknown>>): CalculationResult;
};

export type CalculatorDefinition = StaticCalculatorDefinition | RegulatedCalculatorDefinition;

type CalculatorConfiguration<TSchema extends z.ZodType> = CalculatorMetadata & {
  schema: TSchema;
  run(input: z.output<TSchema>): CalculationResult;
};

export function defineCalculator<TSchema extends z.ZodType>(
  configuration: CalculatorConfiguration<TSchema>,
): StaticCalculatorDefinition {
  const { schema, run, ...metadata } = configuration;

  return {
    ...metadata,
    execution: "browser",
    calculate(rawInput: unknown) {
      return run(schema.parse(rawInput));
    },
  };
}

type RegulatedCalculatorConfiguration<TSchema extends z.ZodType> = CalculatorMetadata & {
  schema: TSchema;
  ruleDependencies: readonly RuleDependency[];
  getAsOfDate(input: z.output<TSchema>): string;
  run(
    input: z.output<TSchema>,
    rulePayloads: Readonly<Record<string, unknown>>,
  ): CalculationResult;
};

export function defineRegulatedCalculator<TSchema extends z.ZodType>(
  configuration: RegulatedCalculatorConfiguration<TSchema>,
): RegulatedCalculatorDefinition {
  const { schema, ruleDependencies, getAsOfDate, run, ...metadata } = configuration;

  return {
    ...metadata,
    execution: "server",
    ruleDependencies,
    getAsOfDate(rawInput: unknown) {
      return getAsOfDate(schema.parse(rawInput));
    },
    calculate(rawInput: unknown, rulePayloads: Readonly<Record<string, unknown>>) {
      return run(schema.parse(rawInput), rulePayloads);
    },
  };
}
