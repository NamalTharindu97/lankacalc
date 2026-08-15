import { ZodError } from "zod";

import { getCalculator } from "@/domain/calculators/registry";
import { resolveRegulatedProvenance, RegulatedRuleUnavailableError } from "@/server/rules/runtime";

export type CalculationApiResponse = {
  status: number;
  body: unknown;
};

export async function executeCalculationRequest(
  calculatorKey: string,
  payload: unknown,
): Promise<CalculationApiResponse> {
  const calculator = getCalculator(calculatorKey);

  if (!calculator) {
    return {
      status: 404,
      body: {
        error: {
          code: "CALCULATOR_NOT_FOUND",
          message: `Calculator '${calculatorKey}' was not found.`,
        },
      },
    };
  }

  try {
    if (calculator.execution === "browser") {
      return { status: 200, body: calculator.calculate(payload) };
    }
    const asOfDate = calculator.getAsOfDate(payload);
    const provenance = await resolveRegulatedProvenance(calculator, asOfDate);
    return {
      status: 200,
      body: {
        ...calculator.calculate(payload, provenance.payloads),
        ruleVersions: provenance.rules.map(({ key, version, effectiveFrom, effectiveTo }) => ({ key, version, effectiveFrom, effectiveTo })),
        sources: provenance.sources,
        verifiedAt: provenance.verifiedAt,
      },
    };
  } catch (error) {
    if (error instanceof RegulatedRuleUnavailableError) {
      return {
        status: 503,
        body: { error: { code: "RULE_UNAVAILABLE", message: error.message } },
      };
    }
    if (error instanceof ZodError) {
      return {
        status: 422,
        body: {
          error: {
            code: "VALIDATION_ERROR",
            message: "The calculation input is invalid.",
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
      };
    }

    if (error instanceof RangeError) {
      return {
        status: 422,
        body: {
          error: {
            code: "CALCULATION_OUT_OF_RANGE",
            message: "The calculation result is outside the supported range.",
          },
        },
      };
    }

    throw error;
  }
}
