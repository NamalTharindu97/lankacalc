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
  description?: string;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  options?: Array<{ label: string; value: string }>;
  visibleWhen?: { field: string; equals: string };
};

export type SourceReference = {
  authority: string;
  title: string;
  url: string;
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

export type CalculatorDefinition = CalculatorMetadata & {
  calculate(rawInput: unknown): CalculationResult;
};

type CalculatorConfiguration<TSchema extends z.ZodType> = CalculatorMetadata & {
  schema: TSchema;
  run(input: z.output<TSchema>): CalculationResult;
};

export function defineCalculator<TSchema extends z.ZodType>(
  configuration: CalculatorConfiguration<TSchema>,
): CalculatorDefinition {
  const { schema, run, ...metadata } = configuration;

  return {
    ...metadata,
    calculate(rawInput: unknown) {
      return run(schema.parse(rawInput));
    },
  };
}
