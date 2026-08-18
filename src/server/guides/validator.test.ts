import { describe, expect, it } from "vitest";

import { validateDecisionGraph } from "./validator";
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

describe("validateDecisionGraph", () => {
  it("reports error for empty nodes", () => {
    const result = validateDecisionGraph([], [], []);
    expect(result).toEqual({
      valid: false,
      issues: [
        { severity: "error", message: "Decision tree has no nodes." },
      ],
    });
  });

  it("validates a simple valid graph", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
    const o = outcome({ id: "o1", key: "result", title: "Result" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
    });

    const result = validateDecisionGraph([n], [e], [o]);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("validates a multi-branch graph", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
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

    const result = validateDecisionGraph([n], [e1, e2], [o1, o2]);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("reports error for unknown from-node reference", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
    const o = outcome({ id: "o1", key: "result", title: "Result" });
    const e = edge({
      id: "e1",
      fromNodeId: "unknown",
      toOutcomeId: "o1",
    });

    const result = validateDecisionGraph([n], [e], [o]);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("unknown from-node"),
          path: "edge:e1",
        }),
      ]),
    );
  });

  it("reports error for unknown to-node reference", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: "unknown",
    });

    const result = validateDecisionGraph([n], [e], []);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("unknown to-node"),
          path: "edge:e1",
        }),
      ]),
    );
  });

  it("reports error for unknown outcome reference", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "unknown",
    });

    const result = validateDecisionGraph([n], [e], []);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("unknown outcome"),
          path: "edge:e1",
        }),
      ]),
    );
  });

  it("reports error for edge with neither target", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: null,
      toOutcomeId: null,
    });

    const result = validateDecisionGraph([n], [e], []);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("neither to-node nor to-outcome"),
          path: "edge:e1",
        }),
      ]),
    );
  });

  it("reports error for edge with both targets", () => {
    const n1 = node({ id: "n1", key: "a", sortOrder: 0 });
    const n2 = node({ id: "n2", key: "b", sortOrder: 1 });
    const o = outcome({ id: "o1", key: "r", title: "R" });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: "n2",
      toOutcomeId: "o1",
    });

    const result = validateDecisionGraph([n1, n2], [e], [o]);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("both to-node and to-outcome"),
          path: "edge:e1",
        }),
      ]),
    );
  });

  it("reports error for self-loop", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
    const e = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: "n1",
    });

    const result = validateDecisionGraph([n], [e], []);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("self-loop"),
          path: "edge:e1",
        }),
      ]),
    );
  });

  it("reports error when all nodes have incoming edges (no root)", () => {
    const n1 = node({ id: "n1", key: "a", sortOrder: 0 });
    const n2 = node({ id: "n2", key: "b", sortOrder: 1 });
    const o = outcome({ id: "o1", key: "r", title: "R" });
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

    const result = validateDecisionGraph([n1, n2], [e1, e2], [o]);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("no root node"),
        }),
      ]),
    );
  });

  it("warns for multiple root nodes", () => {
    const n1 = node({ id: "n1", key: "a", sortOrder: 0 });
    const n2 = node({ id: "n2", key: "b", sortOrder: 1 });
    const o = outcome({ id: "o1", key: "r", title: "R" });
    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
    });

    const result = validateDecisionGraph([n1, n2], [e1], [o]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          message: expect.stringContaining("Multiple nodes have no incoming"),
        }),
      ]),
    );
  });

  it("reports error for unreachable node", () => {
    const n1 = node({ id: "n1", key: "root", sortOrder: 0 });
    const n2 = node({ id: "n2", key: "disconnected", sortOrder: 1 });
    const o = outcome({ id: "o1", key: "r", title: "R" });
    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
    });

    const result = validateDecisionGraph([n1, n2], [e1], [o]);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("not reachable from the root"),
          path: "node:n2",
        }),
      ]),
    );
  });

  it("warns for unreachable outcome", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
    const o1 = outcome({ id: "o1", key: "reachable", title: "Reachable" });
    const o2 = outcome({ id: "o2", key: "orphan", title: "Orphan" });
    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toOutcomeId: "o1",
    });

    const result = validateDecisionGraph([n], [e1], [o1, o2]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          message: expect.stringContaining("not reachable from the root"),
          path: "outcome:o2",
        }),
      ]),
    );
  });

  it("reports error for terminal node without outcome edge", () => {
    const n1 = node({ id: "n1", key: "root", sortOrder: 0 });
    const n2 = node({ id: "n2", key: "leaf", sortOrder: 1 });
    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: "n2",
      condition: { answer: "go" },
    });

    const result = validateDecisionGraph([n1, n2], [e1], []);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("Terminal node"),
          path: "node:n2",
        }),
      ]),
    );
  });

  it("reports error for duplicate conditions on single-choice node", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
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
      condition: { answer: "yes" },
    });

    const result = validateDecisionGraph([n], [e1, e2], [o1, o2]);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("duplicate edge conditions"),
          path: "node:n1",
        }),
      ]),
    );
  });

  it("does not report duplicate conditions error for unique conditions", () => {
    const n = node({ id: "n1", key: "root", sortOrder: 0 });
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

    const result = validateDecisionGraph([n], [e1, e2], [o1, o2]);
    const dupIssues = result.issues.filter((i) =>
      i.message.includes("duplicate edge conditions"),
    );
    expect(dupIssues).toHaveLength(0);
  });

  it("validates complex multi-branch graph", () => {
    const root = node({ id: "n1", key: "service", sortOrder: 0 });
    const sub = node({ id: "n2", key: "sub-type", sortOrder: 1 });
    const o1 = outcome({ id: "o1", key: "passport", title: "Passport" });
    const o2 = outcome({ id: "o2", key: "nic-new", title: "New NIC" });
    const o3 = outcome({ id: "o3", key: "nic-renew", title: "Renew NIC" });

    const e1 = edge({
      id: "e1",
      fromNodeId: "n1",
      toNodeId: "n2",
      condition: { answer: "identity" },
    });
    const e2 = edge({
      id: "e2",
      fromNodeId: "n1",
      toOutcomeId: "o1",
      condition: { answer: "passport" },
    });
    const e3 = edge({
      id: "e3",
      fromNodeId: "n2",
      toOutcomeId: "o2",
      condition: { answer: "new" },
    });
    const e4 = edge({
      id: "e4",
      fromNodeId: "n2",
      toOutcomeId: "o3",
      condition: { answer: "renew" },
    });

    const result = validateDecisionGraph(
      [root, sub],
      [e1, e2, e3, e4],
      [o1, o2, o3],
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
