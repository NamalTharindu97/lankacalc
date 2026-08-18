import type {
  DecisionEdgeRow,
  DecisionNodeRow,
  DecisionOutcomeRow,
  ValidationIssue,
  ValidationResult,
} from "./types";

export function validateDecisionGraph(
  nodes: DecisionNodeRow[],
  edges: DecisionEdgeRow[],
  outcomes: DecisionOutcomeRow[],
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (nodes.length === 0) {
    issues.push({ severity: "error", message: "Decision tree has no nodes." });
    return { valid: false, issues };
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const outcomesById = new Map(outcomes.map((o) => [o.id, o]));

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, DecisionEdgeRow[]>();

  for (const node of nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    if (edge.fromNodeId) {
      const list = outgoing.get(edge.fromNodeId);
      if (list) {
        list.push(edge);
      } else {
        issues.push({
          severity: "error",
          message: `Edge references unknown from-node '${edge.fromNodeId}'.`,
          path: `edge:${edge.id}`,
        });
      }
    }

    if (edge.toNodeId) {
      if (!nodesById.has(edge.toNodeId)) {
        issues.push({
          severity: "error",
          message: `Edge references unknown to-node '${edge.toNodeId}'.`,
          path: `edge:${edge.id}`,
        });
      } else {
        incoming.set(edge.toNodeId, (incoming.get(edge.toNodeId) ?? 0) + 1);
      }
    }

    if (edge.toOutcomeId) {
      if (!outcomesById.has(edge.toOutcomeId)) {
        issues.push({
          severity: "error",
          message: `Edge references unknown outcome '${edge.toOutcomeId}'.`,
          path: `edge:${edge.id}`,
        });
      }
    }

    if (!edge.toNodeId && !edge.toOutcomeId) {
      issues.push({
        severity: "error",
        message: `Edge has neither to-node nor to-outcome.`,
        path: `edge:${edge.id}`,
      });
    }

    if (edge.toNodeId && edge.toOutcomeId) {
      issues.push({
        severity: "error",
        message: `Edge has both to-node and to-outcome; exactly one is required.`,
        path: `edge:${edge.id}`,
      });
    }

    if (edge.fromNodeId && edge.toNodeId && edge.fromNodeId === edge.toNodeId) {
      issues.push({
        severity: "error",
        message: `Edge creates a self-loop on node '${edge.fromNodeId}'.`,
        path: `edge:${edge.id}`,
      });
    }
  }

  const nodesWithNoIncoming = nodes.filter(
    (n) => (incoming.get(n.id) ?? 0) === 0,
  );
  if (nodesWithNoIncoming.length === 0) {
    issues.push({
      severity: "error",
      message: "Every node has incoming edges; there is no root node.",
    });
  } else if (nodesWithNoIncoming.length > 1) {
    issues.push({
      severity: "warning",
      message: `Multiple nodes have no incoming edges: ${nodesWithNoIncoming.map((n) => n.key).join(", ")}.`,
    });
  }

  const nodesWithNoOutgoing = nodes.filter(
    (n) => (outgoing.get(n.id)?.length ?? 0) === 0,
  );
  for (const node of nodesWithNoOutgoing) {
    const hasOutcomeEdge = edges.some(
      (e) => e.fromNodeId === node.id && e.toOutcomeId,
    );
    if (!hasOutcomeEdge) {
      issues.push({
        severity: "error",
        message: `Terminal node '${node.key}' has no outgoing edges and no outcome edge.`,
        path: `node:${node.id}`,
      });
    }
  }

  const reachable = new Set<string>();
  if (nodesWithNoIncoming.length > 0) {
    const root = nodesWithNoIncoming.reduce((a, b) =>
      a.sortOrder < b.sortOrder ? a : b,
    );
    const queue = [root.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) {
        continue;
      }
      reachable.add(current);
      for (const edge of outgoing.get(current) ?? []) {
        if (edge.toNodeId && !reachable.has(edge.toNodeId)) {
          queue.push(edge.toNodeId);
        }
      }
    }
  }

  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      issues.push({
        severity: "error",
        message: `Node '${node.key}' is not reachable from the root.`,
        path: `node:${node.id}`,
      });
    }
  }

  const reachableOutcomes = new Set<string>();
  for (const edge of edges) {
    if (edge.toOutcomeId && edge.fromNodeId && reachable.has(edge.fromNodeId)) {
      reachableOutcomes.add(edge.toOutcomeId);
    }
  }

  for (const outcome of outcomes) {
    if (!reachableOutcomes.has(outcome.id)) {
      issues.push({
        severity: "warning",
        message: `Outcome '${outcome.key}' is not reachable from the root.`,
        path: `outcome:${outcome.id}`,
      });
    }
  }

  for (const node of nodes) {
    const nodeEdges = outgoing.get(node.id) ?? [];
    if (nodeEdges.length > 0 && node.type === "single-choice") {
      const conditions = nodeEdges.map((e) => JSON.stringify(e.condition));
      const uniqueConditions = new Set(conditions);
      if (uniqueConditions.size < conditions.length) {
        issues.push({
          severity: "error",
          message: `Node '${node.key}' has duplicate edge conditions.`,
          path: `node:${node.id}`,
        });
      }
    }
  }

  const valid = issues.filter((i) => i.severity === "error").length === 0;
  return { valid, issues };
}
