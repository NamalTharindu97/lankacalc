import { getDatabase } from "@/server/db/client";
import { RulePlatform, type RuleHandler } from "@/server/rules/service";

// Regulated calculator handlers are added with their approved specifications in Stage 2.
export const ruleHandlers: Readonly<Record<string, RuleHandler>> = {};

export function getRulePlatform(): RulePlatform {
  return new RulePlatform(getDatabase(), ruleHandlers);
}
