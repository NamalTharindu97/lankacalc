import type {
  DecisionCondition,
  DecisionEdgeRow,
  DecisionNodeRow,
  DecisionOutcomeRow,
  EvaluationResult,
} from "./types";

function matchesCondition(
  condition: DecisionCondition,
  answer: string | string[] | undefined,
): boolean {
  if (answer === undefined || answer === "") {
    return false;
  }

  if (condition.answer !== undefined) {
    return typeof answer === "string" && answer === condition.answer;
  }

  if (condition.answers !== undefined) {
    if (!Array.isArray(answer)) {
      return condition.answers.includes(answer);
    }
    return (
      condition.answers.length === answer.length &&
      condition.answers.every((a) => answer.includes(a))
    );
  }

  return false;
}

export function evaluateDecisionTree(
  nodes: DecisionNodeRow[],
  edges: DecisionEdgeRow[],
  outcomes: DecisionOutcomeRow[],
  answers: Record<string, string | string[]>,
): EvaluationResult {
  if (nodes.length === 0) {
    return {
      resolved: false,
      title: "Unresolved",
      note: "No matching path found. Please contact the official authority directly.",
    };
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const edgesByFromNode = new Map<string, DecisionEdgeRow[]>();

  for (const edge of edges) {
    if (edge.fromNodeId) {
      const existing = edgesByFromNode.get(edge.fromNodeId) ?? [];
      existing.push(edge);
      edgesByFromNode.set(edge.fromNodeId, existing);
    }
  }

  const root = nodes.reduce((a, b) => (a.sortOrder < b.sortOrder ? a : b));
  let currentNode: DecisionNodeRow | null = root;

  const visited = new Set<string>();
  let safety = 0;

  while (currentNode && safety < 100) {
    safety += 1;

    if (visited.has(currentNode.id)) {
      return {
        resolved: false,
        title: "Unresolved",
        note: "No matching path found. Please contact the official authority directly.",
      };
    }
    visited.add(currentNode.id);

    const outgoing: DecisionEdgeRow[] = edgesByFromNode.get(currentNode.id) ?? [];
    const answer = answers[currentNode.key];

    let matched: DecisionEdgeRow | null = null;
    for (const edge of outgoing) {
      if (matchesCondition(edge.condition, answer)) {
        matched = edge;
        break;
      }
    }

    if (!matched) {
      return {
        resolved: false,
        title: "Unresolved",
        note: "No matching path found. Please contact the official authority directly.",
      };
    }

    if (matched.toOutcomeId) {
      const outcome = outcomes.find((o) => o.id === matched!.toOutcomeId);
      if (!outcome) {
        return {
          resolved: false,
          title: "Unresolved",
          note: "No matching path found. Please contact the official authority directly.",
        };
      }
      return {
        resolved: true,
        key: outcome.key,
        title: outcome.title,
        documents: outcome.documents,
        fees: outcome.fees,
        steps: outcome.steps,
        offices: outcome.offices,
        forms: outcome.forms,
        links: outcome.links,
        escalation: outcome.escalation,
        note: outcome.note,
      };
    }

    if (matched.toNodeId) {
      currentNode = nodesById.get(matched.toNodeId) ?? null;
      continue;
    }

    return {
      resolved: false,
      title: "Unresolved",
      note: "No matching path found. Please contact the official authority directly.",
    };
  }

  return {
    resolved: false,
    title: "Unresolved",
    note: "No matching path found. Please contact the official authority directly.",
  };
}
