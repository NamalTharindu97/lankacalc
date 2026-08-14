import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateOperator, canPerform } from "@/server/admin-auth";
import { getDatabase } from "@/server/db/client";
import { isoDateSchema } from "@/server/rules/date";
import { getRulePlatform } from "@/server/rules/registry";
import type { JsonValue } from "@/server/rules/json";
import { checkSourceLink, createSource, isAllowedSourceUrl, reviseSource, verifySource } from "@/server/sources/service";

const identifier = z.string().min(1).max(160).regex(/^[a-z0-9][a-z0-9._-]*$/);
const uuid = z.uuid();
const dateOnly = isoDateSchema;
const timestamp = z.iso.datetime().refine((value) => Number(value.slice(0, 4)) > 0, "Timestamp year must be 0001 or later.");
const hash = z.string().regex(/^[a-f0-9]{64}$/).nullable().optional();
const json = z.json();

const sourceFields = {
  authority: z.string().min(1).max(200),
  title: z.string().min(1).max(1_000),
  url: z.url().startsWith("https://").refine(isAllowedSourceUrl, "URL host is not an approved official authority."),
  publishedOn: dateOnly.nullable().optional(),
  retrievedAt: timestamp,
  contentHash: hash,
  archiveUrl: z.url().startsWith("https://").nullable().optional(),
  changeNote: z.string().min(1).max(2_000),
};

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createSource"), key: identifier, official: z.boolean(), ...sourceFields }),
  z.object({ action: z.literal("reviseSource"), sourceId: uuid, ...sourceFields }),
  z.object({ action: z.literal("verifySource"), sourceId: uuid, outcome: z.enum(["verified", "rejected"]), reason: z.string().min(1).max(2_000) }),
  z.object({ action: z.literal("checkSource"), sourceId: uuid }),
  z.object({
    action: z.literal("createDefinition"),
    key: identifier,
    calculatorKey: identifier,
    scope: identifier,
    name: z.string().min(1).max(200),
    description: z.string().max(2_000).optional(),
  }),
  z.object({
    action: z.literal("createDraft"),
    ruleDefinitionId: uuid,
    version: z.string().min(1).max(40),
    effectiveFrom: dateOnly,
    effectiveTo: dateOnly.nullable().optional(),
    payload: json,
    payloadSchemaVersion: z.string().min(1).max(40),
  }),
  z.object({
    action: z.literal("updateDraft"),
    ruleVersionId: uuid,
    version: z.string().min(1).max(40),
    effectiveFrom: dateOnly,
    effectiveTo: dateOnly.nullable().optional(),
    payload: json,
    payloadSchemaVersion: z.string().min(1).max(40),
  }),
  z.object({ action: z.literal("attachSource"), ruleVersionId: uuid, sourceId: uuid, note: z.string().max(2_000).optional() }),
  z.object({ action: z.literal("addFixture"), ruleVersionId: uuid, name: z.string().min(1).max(200), input: json, expectedResult: json }),
  z.object({ action: z.literal("runFixtures"), ruleVersionId: uuid }),
  z.object({ action: z.literal("compareRule"), ruleVersionId: uuid, asOfDate: dateOnly }),
  z.object({ action: z.literal("reviewRule"), ruleVersionId: uuid, reason: z.string().min(1).max(2_000) }),
  z.object({
    action: z.literal("publishRule"),
    ruleVersionId: uuid,
    replacesRuleVersionId: uuid.optional(),
    reason: z.string().min(1).max(2_000),
  }),
  z.object({ action: z.literal("promoteScheduled"), asOfDate: dateOnly }),
  z.object({ action: z.literal("retireRule"), ruleVersionId: uuid, effectiveOn: dateOnly, reason: z.string().min(1).max(2_000) }),
  z.object({ action: z.literal("ruleHistory"), ruleVersionId: uuid }),
  z.object({ action: z.literal("dashboard") }),
]);

const reviewerActions = new Set([
  "verifySource",
  "checkSource",
  "runFixtures",
  "compareRule",
  "reviewRule",
  "ruleHistory",
  "dashboard",
]);

class PayloadTooLargeError extends Error {}

async function readRequestBody(request: Request): Promise<string> {
  const maximumBytes = 16_384;
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) throw new PayloadTooLargeError();
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return body + decoder.decode();
    bytesRead += value.byteLength;
    if (bytesRead > maximumBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }
}

function databaseCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: unknown; cause?: unknown };
  return typeof value.code === "string" ? value.code : databaseCode(value.cause);
}

function publicError(error: unknown): { code: string; status: number } {
  const message = error instanceof Error ? error.message : "";
  if (/^[A-Z][A-Z0-9_]+$/.test(message)) {
    if (message.endsWith("_NOT_FOUND")) return { code: message, status: 404 };
    if (message.includes("REQUIRED") || message.includes("IMMUTABLE") || message.includes("NOT_ACTIVE") || message.includes("NOT_DRAFT") || message.includes("CHANGED")) {
      return { code: message, status: 409 };
    }
    return { code: message, status: 422 };
  }
  const sqlState = databaseCode(error);
  if (sqlState === "23P01") return { code: "RULE_PERIOD_OVERLAP", status: 409 };
  if (sqlState === "23505") return { code: "RESOURCE_CONFLICT", status: 409 };
  if (sqlState === "23514") return { code: "VALIDATION_ERROR", status: 422 };
  if (sqlState === "22008") return { code: "VALIDATION_ERROR", status: 422 };
  if (sqlState === "P0001") return { code: "RULE_STATE_CONFLICT", status: 409 };
  return { code: "INTERNAL_ERROR", status: 500 };
}

export async function POST(request: Request) {
  const operator = authenticateOperator(request);
  if (!operator) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Operator authentication is required." } }, { status: 401 });
  }

  let rawBody: string;
  try {
    rawBody = await readRequestBody(request);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds 16 KiB." } }, { status: 413 });
    }
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Request body could not be read." } }, { status: 400 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed.", fields: parsed.error.flatten().fieldErrors } }, { status: 422 });
  }
  const input = parsed.data;
  if ((input.action === "createDraft" || input.action === "updateDraft") && input.effectiveTo && input.effectiveTo < input.effectiveFrom) {
    return NextResponse.json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        fields: { effectiveTo: ["effectiveTo must be on or after effectiveFrom."] },
      },
    }, { status: 422 });
  }
  const permission = reviewerActions.has(input.action) ? "review" : "admin";
  if (!canPerform(operator, permission)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "This operator role cannot perform the action." } }, { status: 403 });
  }

  const database = getDatabase();
  const rules = getRulePlatform();
  try {
    let data: unknown;
    switch (input.action) {
      case "createSource":
        data = await createSource(database, { ...input, retrievedAt: new Date(input.retrievedAt) }, operator.name);
        break;
      case "reviseSource":
        data = await reviseSource(database, input.sourceId, { ...input, retrievedAt: new Date(input.retrievedAt) }, operator.name);
        break;
      case "verifySource":
        data = await verifySource(database, input.sourceId, input.outcome, input.reason, operator.name);
        break;
      case "checkSource":
        data = await checkSourceLink(database, input.sourceId);
        break;
      case "createDefinition":
        data = await rules.createDefinition(input, operator.name);
        break;
      case "createDraft":
        data = await rules.createDraft({ ...input, payload: input.payload as JsonValue }, operator.name);
        break;
      case "updateDraft":
        data = await rules.updateDraft(input.ruleVersionId, { ...input, payload: input.payload as JsonValue });
        break;
      case "attachSource":
        data = await rules.attachSource(input.ruleVersionId, input.sourceId, input.note);
        break;
      case "addFixture":
        data = await rules.addFixture(input.ruleVersionId, { name: input.name, input: input.input as JsonValue, expectedResult: input.expectedResult as JsonValue });
        break;
      case "runFixtures":
        data = await rules.runFixtures(input.ruleVersionId);
        break;
      case "compareRule":
        data = await rules.compareWithActive(input.ruleVersionId, input.asOfDate);
        break;
      case "reviewRule":
        data = await rules.review(input.ruleVersionId, operator.name, input.reason);
        break;
      case "publishRule":
        data = await rules.publish(input.ruleVersionId, operator.name, input.reason, undefined, input.replacesRuleVersionId);
        break;
      case "promoteScheduled":
        data = await rules.promoteScheduled(input.asOfDate, operator.name);
        break;
      case "retireRule":
        data = await rules.retire(input.ruleVersionId, input.effectiveOn, operator.name, input.reason);
        break;
      case "ruleHistory":
        data = await rules.getHistory(input.ruleVersionId);
        break;
      case "dashboard":
        data = { ...await rules.getDashboard(), operator };
        break;
    }
    return NextResponse.json({ data });
  } catch (error) {
    const failure = publicError(error);
    if (failure.status === 500) {
      console.error(JSON.stringify({ event: "rule_platform_failed", error: error instanceof Error ? error.name : "UnknownError" }));
    }
    return NextResponse.json({ error: { code: failure.code, message: "Rule platform action failed." } }, { status: failure.status });
  }
}
