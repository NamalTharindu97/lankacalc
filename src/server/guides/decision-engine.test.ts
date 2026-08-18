import { describe, expect, it } from "vitest";

import { evaluateDecisionTree } from "./decision-engine";
import type {
  DecisionEdgeRow,
  DecisionNodeRow,
  DecisionOutcomeRow,
} from "./types";

const TREE_ID = "00000000-0000-0000-0000-000000000001";

function node(
  overrides: Partial<DecisionNodeRow> & { id: string; key: string },
): DecisionNodeRow {
  return {
    treeId: TREE_ID,
    type: "single-choice",
    question: `Question for ${overrides.key}`,
    sortOrder: 0,
    ...overrides,
  };
}

function edge(
  overrides: Partial<DecisionEdgeRow> & { id: string },
): DecisionEdgeRow {
  return {
    treeId: TREE_ID,
    fromNodeId: null,
    toNodeId: null,
    toOutcomeId: null,
    condition: { answer: "yes" },
    sortOrder: 0,
    ...overrides,
  };
}

function outcome(
  overrides: Partial<DecisionOutcomeRow> & { id: string; key: string },
): DecisionOutcomeRow {
  return {
    treeId: TREE_ID,
    title: `Outcome ${overrides.key}`,
    documents: [],
    fees: [],
    steps: [],
    offices: [],
    forms: [],
    links: [],
    ...overrides,
  };
}

describe("evaluateDecisionTree", () => {
  it("returns unresolved for empty nodes", () => {
    const result = evaluateDecisionTree([], [], [], {});
    expect(result).toEqual({
      resolved: false,
      title: "Unresolved",
      note: "No matching path found. Please contact the official authority directly.",
    });
  });

  it("resolves single node to single outcome", () => {
    const n = node({ id: "n1", key: "service-type", sortOrder: 0 });
    const o = outcome({ id: "o1", key: "passport", title: "Passport" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "passport" },
    });

    const result = evaluateDecisionTree(
      [n],
      [e],
      [o],
      { "service-type": "passport" },
    );

    expect(result).toEqual({
      resolved: true,
      key: "passport",
      title: "Passport",
      documents: [],
      fees: [],
      steps: [],
      offices: [],
      forms: [],
      links: [],
    });
  });

  it("follows multi-step path through two nodes", () => {
    const n1 = node({ id: "n1", key: "category", sortOrder: 0 });
    const n2 = node({ id: "n2", key: "sub-type", sortOrder: 1 });
    const o = outcome({ id: "o1", key: "nic-new", title: "New NIC" });

    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: "n2",
      condition: { answer: "identity" },
    });
    const e2 = edge({
      id: "e2",
      fromNodeId: "n2",
      toOutcomeId: "o1",
      condition: { answer: "new" },
    });

    const result = evaluateDecisionTree(
      [n1, n2],
      [e1, e2],
      [o],
      { category: "identity", "sub-type": "new" },
    );

    expect(result).toMatchObject({ resolved: true, key: "nic-new" });
  });

  it("returns unresolved when answer is missing", () => {
    const n = node({ id: "n1", key: "service-type", sortOrder: 0 });
    const o = outcome({ id: "o1", key: "passport", title: "Passport" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "passport" },
    });

    const result = evaluateDecisionTree([n], [e], [o], {});
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });

  it("returns unresolved when answer does not match any edge", () => {
    const n = node({ id: "n1", key: "service-type", sortOrder: 0 });
    const o = outcome({ id: "o1", key: "passport", title: "Passport" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "passport" },
    });

    const result = evaluateDecisionTree(
      [n],
      [e],
      [o],
      { "service-type": "licence" },
    );
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });

  it("matches exact string with answer condition", () => {
    const n = node({ id: "n1", key: "q", sortOrder: 0 });
    const o1 = outcome({ id: "o1", key: "a", title: "A" });
    const o2 = outcome({ id: "o2", key: "b", title: "B" });
    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "yes" },
    });
    const e2 = edge({
      id: "e2",
      fromNodeId: "n1",
      toOutcomeId: "o2",
      condition: { answer: "no" },
    });

    const result = evaluateDecisionTree(
      [n],
      [e1, e2],
      [o1, o2],
      { q: "yes" },
    );
    expect(result).toMatchObject({ resolved: true, key: "a" });
  });

  it("matches multi-choice with answers condition (array)", () => {
    const n = node({
      id: "n1",
      key: "docs",
      type: "multi-choice",
      sortOrder: 0,
    });
    const o = outcome({ id: "o1", key: "result", title: "Result" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answers: ["birth-certificate", "nic"] },
    });

    const result = evaluateDecisionTree(
      [n],
      [e],
      [o],
      { docs: ["nic", "birth-certificate"] },
    );
    expect(result).toMatchObject({ resolved: true, key: "result" });
  });

  it("rejects multi-choice when answer is a subset", () => {
    const n = node({
      id: "n1",
      key: "docs",
      type: "multi-choice",
      sortOrder: 0,
    });
    const o = outcome({ id: "o1", key: "result", title: "Result" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answers: ["birth-certificate", "nic"] },
    });

    const result = evaluateDecisionTree(
      [n],
      [e],
      [o],
      { docs: ["nic"] },
    );
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });

  it("rejects multi-choice when answer has extra values", () => {
    const n = node({
      id: "n1",
      key: "docs",
      type: "multi-choice",
      sortOrder: 0,
    });
    const o = outcome({ id: "o1", key: "result", title: "Result" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answers: ["nic"] },
    });

    const result = evaluateDecisionTree(
      [n],
      [e],
      [o],
      { docs: ["nic", "passport"] },
    );
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });

  it("matches answers condition when single string is in expected list", () => {
    const n = node({ id: "n1", key: "q", sortOrder: 0 });
    const o = outcome({ id: "o1", key: "result", title: "Result" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answers: ["a", "b", "c"] },
    });

    const result = evaluateDecisionTree(
      [n],
      [e],
      [o],
      { q: "b" },
    );
    expect(result).toMatchObject({ resolved: true, key: "result" });
  });

  it("first matching edge wins", () => {
    const n = node({ id: "n1", key: "q", sortOrder: 0 });
    const o1 = outcome({ id: "o1", key: "first", title: "First" });
    const o2 = outcome({ id: "o2", key: "second", title: "Second" });
    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "x" },
      sortOrder: 0,
    });
    const e2 = edge({
      id: "e2",
      fromNodeId: "n1",
      toOutcomeId: "o2",
      condition: { answer: "x" },
      sortOrder: 1,
    });

    const result = evaluateDecisionTree(
      [n],
      [e1, e2],
      [o1, o2],
      { q: "x" },
    );
    expect(result).toMatchObject({ resolved: true, key: "first" });
  });

  it("detects cycle and returns unresolved", () => {
    const n1 = node({ id: "n1", key: "a", sortOrder: 0 });
    const n2 = node({ id: "n2", key: "b", sortOrder: 1 });
    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: "n2",
      condition: { answer: "go" },
    });
    const e2 = edge({
      id: "e2",
      fromNodeId: "n2",
      toNodeId: "n1",
      condition: { answer: "back" },
    });

    const result = evaluateDecisionTree(
      [n1, n2],
      [e1, e2],
      [],
      { a: "go", b: "back" },
    );
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });

  it("returns unresolved when edge references non-existent outcome", () => {
    const n = node({ id: "n1", key: "q", sortOrder: 0 });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "non-existent",
      condition: { answer: "yes" },
    });

    const result = evaluateDecisionTree([n], [e], [], { q: "yes" });
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });

  it("follows three-level deep path", () => {
    const n1 = node({ id: "n1", key: "step1", sortOrder: 0 });
    const n2 = node({ id: "n2", key: "step2", sortOrder: 1 });
    const n3 = node({ id: "n3", key: "step3", sortOrder: 2 });
    const o = outcome({ id: "o1", key: "deep-result", title: "Deep" });

    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: "n2",
      condition: { answer: "a" },
    });
    const e2 = edge({
      id: "e2",
      fromNodeId: "n2",
      toNodeId: "n3",
      condition: { answer: "b" },
    });
    const e3 = edge({
      id: "e3",
      fromNodeId: "n3",
      toOutcomeId: "o1",
      condition: { answer: "c" },
    });

    const result = evaluateDecisionTree(
      [n1, n2, n3],
      [e1, e2, e3],
      [o],
      { step1: "a", step2: "b", step3: "c" },
    );
    expect(result).toMatchObject({ resolved: true, key: "deep-result" });
  });

  it("includes full outcome data in resolved result", () => {
    const n = node({ id: "n1", key: "q", sortOrder: 0 });
    const o = outcome({
      id: "o1",
      key: "full",
      title: "Full Outcome",
      documents: [{ name: "NIC", required: true, note: "Original" }],
      fees: [{ name: "Processing", amount: "1000" }],
      steps: [{ order: 1, text: "Visit office", url: "https://example.com" }],
      offices: [{ name: "Colombo ABC", address: "123 Main St", hours: "9-5" }],
      forms: [{ name: "Form A", url: "https://example.com/form-a" }],
      links: [{ label: "Official site", url: "https://gov.example" }],
      escalation: [{ level: 1, authority: "Supervisor", procedure: "Complain" }],
      note: "Some note",
    });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "yes" },
    });

    const result = evaluateDecisionTree([n], [e], [o], { q: "yes" });
    expect(result).toEqual({
      resolved: true,
      key: "full",
      title: "Full Outcome",
      documents: [{ name: "NIC", required: true, note: "Original" }],
      fees: [{ name: "Processing", amount: "1000" }],
      steps: [{ order: 1, text: "Visit office", url: "https://example.com" }],
      offices: [{ name: "Colombo ABC", address: "123 Main St", hours: "9-5" }],
      forms: [{ name: "Form A", url: "https://example.com/form-a" }],
      links: [{ label: "Official site", url: "https://gov.example" }],
      escalation: [{ level: 1, authority: "Supervisor", procedure: "Complain" }],
      note: "Some note",
    });
  });

  it("returns unresolved for empty answer string", () => {
    const n = node({ id: "n1", key: "q", sortOrder: 0 });
    const o = outcome({ id: "o1", key: "r", title: "R" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "yes" },
    });

    const result = evaluateDecisionTree([n], [e], [o], { q: "" });
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });

  it("returns unresolved when edge has neither toNodeId nor toOutcomeId", () => {
    const n = node({ id: "n1", key: "q", sortOrder: 0 });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: null,
      toOutcomeId: null,
      condition: { answer: "yes" },
    });

    const result = evaluateDecisionTree([n], [e], [], { q: "yes" });
    expect(result).toMatchObject({ resolved: false, title: "Unresolved" });
  });

  it("branching: different answers lead to different outcomes", () => {
    const n = node({ id: "n1", key: "service", sortOrder: 0 });
    const o1 = outcome({ id: "o1", key: "passport", title: "Passport" });
    const o2 = outcome({ id: "o2", key: "nic", title: "NIC" });
    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "passport" },
    });
    const e2 = edge({
      id: "e2",
      fromNodeId: "n1",
      toOutcomeId: "o2",
      condition: { answer: "nic" },
    });

    const r1 = evaluateDecisionTree(
      [n],
      [e1, e2],
      [o1, o2],
      { service: "passport" },
    );
    expect(r1).toMatchObject({ resolved: true, key: "passport" });

    const r2 = evaluateDecisionTree(
      [n],
      [e1, e2],
      [o1, o2],
      { service: "nic" },
    );
    expect(r2).toMatchObject({ resolved: true, key: "nic" });
  });
});
