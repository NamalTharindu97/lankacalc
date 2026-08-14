export type OperationField = {
  key: string;
  label: string;
  type: "text" | "url" | "textarea" | "date" | "datetime-local" | "checkbox" | "select" | "json";
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | boolean;
};

export type RulePlatformOperation = {
  id: string;
  action: string;
  group: "Sources" | "Rules" | "Evidence" | "Lifecycle";
  title: string;
  description: string;
  permission: "Admin" | "Reviewer";
  fields: OperationField[];
};

const id = (key: string, label: string, placeholder: string): OperationField => ({
  key,
  label,
  placeholder,
  required: true,
  type: "text",
});

const reason: OperationField = {
  key: "reason",
  label: "Reason",
  type: "textarea",
  required: true,
  placeholder: "Record the evidence and decision behind this action.",
};

export const rulePlatformOperations: RulePlatformOperation[] = [
  {
    id: "source-create",
    action: "createSource",
    group: "Sources",
    title: "Register source",
    description: "Create an official source and its first immutable revision.",
    permission: "Admin",
    fields: [
      id("key", "Source key", "ird-apit-2025-26"),
      { key: "authority", label: "Issuing authority", type: "text", required: true, placeholder: "Inland Revenue Department" },
      { key: "title", label: "Publication title", type: "text", required: true, placeholder: "Advance Personal Income Tax Tables 2025-2026" },
      { key: "url", label: "Official HTTPS URL", type: "url", required: true, placeholder: "https://www.ird.gov.lk/...", help: "Only reviewed official-authority hosts are accepted." },
      { key: "official", label: "Official authority source", type: "checkbox", defaultValue: true },
      { key: "publishedOn", label: "Publication date", type: "date" },
      { key: "retrievedAt", label: "Retrieved at", type: "datetime-local", required: true },
      { key: "contentHash", label: "Expected SHA-256", type: "text", placeholder: "Optional 64-character lowercase hash" },
      { key: "archiveUrl", label: "Permitted archive URL", type: "url", placeholder: "Optional HTTPS archive" },
      { key: "changeNote", label: "Revision note", type: "textarea", required: true, placeholder: "Initial source registration." },
    ],
  },
  {
    id: "source-revise",
    action: "reviseSource",
    group: "Sources",
    title: "Create source revision",
    description: "Preserve an amended publication as a new immutable revision.",
    permission: "Admin",
    fields: [
      id("sourceId", "Source ID", "UUID from the source register"),
      { key: "authority", label: "Issuing authority", type: "text", required: true },
      { key: "title", label: "Publication title", type: "text", required: true },
      { key: "url", label: "Official HTTPS URL", type: "url", required: true },
      { key: "publishedOn", label: "Publication date", type: "date" },
      { key: "retrievedAt", label: "Retrieved at", type: "datetime-local", required: true },
      { key: "contentHash", label: "Expected SHA-256", type: "text" },
      { key: "archiveUrl", label: "Permitted archive URL", type: "url" },
      { key: "changeNote", label: "What changed", type: "textarea", required: true },
    ],
  },
  {
    id: "source-check",
    action: "checkSource",
    group: "Sources",
    title: "Check official link",
    description: "Fetch the current revision, detect redirects or changes, and record the result.",
    permission: "Reviewer",
    fields: [id("sourceId", "Source ID", "Source UUID")],
  },
  {
    id: "source-verify",
    action: "verifySource",
    group: "Sources",
    title: "Verify source",
    description: "Accept or reject the latest revision after reviewing its content.",
    permission: "Reviewer",
    fields: [
      id("sourceId", "Source ID", "Source UUID"),
      { key: "outcome", label: "Outcome", type: "select", required: true, defaultValue: "verified", options: [{ label: "Verified", value: "verified" }, { label: "Rejected", value: "rejected" }] },
      reason,
    ],
  },
  {
    id: "rule-definition",
    action: "createDefinition",
    group: "Rules",
    title: "Create rule definition",
    description: "Assign a stable rule key, calculator owner, and scope.",
    permission: "Admin",
    fields: [
      id("key", "Rule key", "epf-contribution"),
      id("calculatorKey", "Calculator key", "salary"),
      { ...id("scope", "Scope", "default"), defaultValue: "default" },
      { key: "name", label: "Rule name", type: "text", required: true, placeholder: "EPF contribution rates" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    id: "rule-draft",
    action: "createDraft",
    group: "Rules",
    title: "Create draft version",
    description: "Validate structured parameters through the registered TypeScript handler.",
    permission: "Admin",
    fields: [
      id("ruleDefinitionId", "Rule definition ID", "Definition UUID"),
      { key: "version", label: "Version", type: "text", required: true, placeholder: "1.0.0" },
      { key: "effectiveFrom", label: "Effective from", type: "date", required: true },
      { key: "effectiveTo", label: "Effective to", type: "date" },
      { key: "payloadSchemaVersion", label: "Payload schema version", type: "text", required: true, defaultValue: "1" },
      { key: "payload", label: "Rule parameters (JSON)", type: "json", required: true, defaultValue: "{\n  \"rate\": 0.08\n}" },
    ],
  },
  {
    id: "rule-update",
    action: "updateDraft",
    group: "Rules",
    title: "Edit draft version",
    description: "Change parameters while the version is still a draft.",
    permission: "Admin",
    fields: [
      id("ruleVersionId", "Rule version ID", "Draft UUID"),
      { key: "version", label: "Version", type: "text", required: true },
      { key: "effectiveFrom", label: "Effective from", type: "date", required: true },
      { key: "effectiveTo", label: "Effective to", type: "date" },
      { key: "payloadSchemaVersion", label: "Payload schema version", type: "text", required: true, defaultValue: "1" },
      { key: "payload", label: "Rule parameters (JSON)", type: "json", required: true, defaultValue: "{}" },
    ],
  },
  {
    id: "evidence-source",
    action: "attachSource",
    group: "Evidence",
    title: "Attach verified source",
    description: "Bind the draft to the latest verified revision of an official source.",
    permission: "Admin",
    fields: [id("ruleVersionId", "Rule version ID", "Draft UUID"), id("sourceId", "Source ID", "Verified source UUID"), { key: "note", label: "Evidence note", type: "textarea" }],
  },
  {
    id: "evidence-fixture",
    action: "addFixture",
    group: "Evidence",
    title: "Add validation fixture",
    description: "Record an input and independently expected result.",
    permission: "Admin",
    fields: [
      id("ruleVersionId", "Rule version ID", "Draft UUID"),
      { key: "name", label: "Fixture name", type: "text", required: true },
      { key: "input", label: "Input (JSON)", type: "json", required: true, defaultValue: "{}" },
      { key: "expectedResult", label: "Expected result (JSON)", type: "json", required: true, defaultValue: "{}" },
    ],
  },
  { id: "evidence-run", action: "runFixtures", group: "Evidence", title: "Run fixtures", description: "Execute every fixture and persist structured differences.", permission: "Reviewer", fields: [id("ruleVersionId", "Rule version ID", "Draft UUID")] },
  { id: "evidence-compare", action: "compareRule", group: "Evidence", title: "Compare with active", description: "Compare draft parameters and fixture results with the active version.", permission: "Reviewer", fields: [id("ruleVersionId", "Rule version ID", "Draft UUID"), { key: "asOfDate", label: "As-of date", type: "date", required: true }] },
  { id: "lifecycle-review", action: "reviewRule", group: "Lifecycle", title: "Review and freeze", description: "Attribute review and make payload and evidence immutable.", permission: "Reviewer", fields: [id("ruleVersionId", "Rule version ID", "Draft UUID"), reason] },
  { id: "lifecycle-publish", action: "publishRule", group: "Lifecycle", title: "Publish or schedule", description: "Publish now or schedule by effective date; optionally replace an active version atomically.", permission: "Admin", fields: [id("ruleVersionId", "Rule version ID", "Reviewed UUID"), { key: "replacesRuleVersionId", label: "Version being replaced", type: "text", placeholder: "Optional active version UUID" }, reason] },
  { id: "lifecycle-promote", action: "promoteScheduled", group: "Lifecycle", title: "Promote scheduled rules", description: "Promote due versions whose current evidence remains valid.", permission: "Admin", fields: [{ key: "asOfDate", label: "Sri Lankan business date", type: "date", required: true }] },
  { id: "lifecycle-retire", action: "retireRule", group: "Lifecycle", title: "Retire version", description: "Stop a published or scheduled version on an explicit effective date.", permission: "Admin", fields: [id("ruleVersionId", "Rule version ID", "Active UUID"), { key: "effectiveOn", label: "Effective retirement date", type: "date", required: true }, reason] },
  { id: "lifecycle-history", action: "ruleHistory", group: "Lifecycle", title: "Inspect history", description: "Read version metadata, fixtures, and publication events.", permission: "Reviewer", fields: [id("ruleVersionId", "Rule version ID", "Version UUID")] },
];

export function operationDefaults(operation: RulePlatformOperation): Record<string, string | boolean> {
  return Object.fromEntries(operation.fields.map((field) => [field.key, field.defaultValue ?? (field.type === "checkbox" ? false : "")]));
}

export function buildOperationRequest(
  operation: RulePlatformOperation,
  values: Record<string, string | boolean>,
): Record<string, unknown> {
  const request: Record<string, unknown> = { action: operation.action };
  for (const field of operation.fields) {
    const value = values[field.key];
    if (field.type === "checkbox") {
      request[field.key] = Boolean(value);
      continue;
    }
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      if (field.required) throw new Error(`${field.label} is required.`);
      continue;
    }
    if (field.type === "json") {
      try {
        request[field.key] = JSON.parse(text);
      } catch {
        throw new Error(`${field.label} must contain valid JSON.`);
      }
    } else if (field.type === "datetime-local") {
      const timestamp = new Date(text);
      if (Number.isNaN(timestamp.getTime())) throw new Error(`${field.label} must be a valid date and time.`);
      request[field.key] = timestamp.toISOString();
    } else {
      request[field.key] = text;
    }
  }
  return request;
}
