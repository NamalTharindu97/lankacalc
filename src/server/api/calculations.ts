import { ZodError } from "zod";

import { getCalculator } from "@/domain/calculators/registry";

export type CalculationApiResponse = {
  status: number;
  body: unknown;
};

export function executeCalculationRequest(
  calculatorKey: string,
  payload: unknown,
): CalculationApiResponse {
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
    return {
      status: 200,
      body: calculator.calculate(payload),
    };
  } catch (error) {
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

    throw error;
  }
}
