export type DecisionNodeType = "single-choice" | "multi-choice" | "text" | "date";

export type GuideStatus = "draft" | "published" | "retired";

export type GuideVersionStatus = "draft" | "reviewed" | "published" | "retired";

export type TranslationStatus = "draft" | "reviewed" | "published" | "stale";

export type GuideDocument = {
  name: string;
  required: boolean;
  note?: string;
};

export type GuideFee = {
  name: string;
  amount: string;
};

export type GuideStep = {
  order: number;
  text: string;
  url?: string;
};

export type GuideOffice = {
  name: string;
  address?: string;
  hours?: string;
};

export type GuideForm = {
  name: string;
  url?: string;
};

export type GuideLink = {
  label: string;
  url: string;
};

export type EscalationLevel = {
  level: number;
  authority: string;
  procedure: string;
};

export type DecisionCondition = {
  answer?: string;
  answers?: string[];
};

export type DecisionOutcomeData = {
  documents: GuideDocument[];
  fees: GuideFee[];
  steps: GuideStep[];
  offices: GuideOffice[];
  forms: GuideForm[];
  links: GuideLink[];
  escalation?: EscalationLevel[];
  note?: string;
};

export type DecisionEdgeRow = {
  id: string;
  treeId: string;
  fromNodeId: string | null;
  toNodeId: string | null;
  toOutcomeId: string | null;
  condition: DecisionCondition;
  sortOrder: number;
};

export type DecisionNodeRow = {
  id: string;
  treeId: string;
  key: string;
  type: DecisionNodeType;
  question: string;
  sortOrder: number;
};

export type DecisionOutcomeRow = {
  id: string;
  treeId: string;
  key: string;
  title: string;
  documents: GuideDocument[];
  fees: GuideFee[];
  steps: GuideStep[];
  offices: GuideOffice[];
  forms: GuideForm[];
  links: GuideLink[];
  escalation?: EscalationLevel[];
  note?: string;
};

export type DecisionTreeRow = {
  id: string;
  guideVersionId: string;
  name: string;
};

export type GuideRow = {
  id: string;
  key: string;
  product: string;
  name: string;
  description: string;
  status: GuideStatus;
};

export type GuideVersionRow = {
  id: string;
  guideId: string;
  version: string;
  status: GuideVersionStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  reviewedBy: string | null;
  publishedBy: string | null;
};

export type ContentSourceRow = {
  id: string;
  guideVersionId: string;
  key: string;
  authority: string;
  title: string;
  url: string;
  publishedOn: string | null;
  verifiedAt: Date | null;
};

export type GuideValidationFixtureRow = {
  id: string;
  guideVersionId: string;
  name: string;
  answers: Record<string, string | string[]>;
  expectedOutcome: string;
  passed: boolean | null;
  executedAt: Date | null;
};

export type TranslationRow = {
  id: string;
  entityType: string;
  entityId: string;
  locale: string;
  field: string;
  value: string;
  status: TranslationStatus;
};

export type UnresolvedOutcome = {
  resolved: false;
  title: "Unresolved";
  note: string;
};

export type ResolvedOutcome = {
  resolved: true;
  key: string;
  title: string;
  documents: GuideDocument[];
  fees: GuideFee[];
  steps: GuideStep[];
  offices: GuideOffice[];
  forms: GuideForm[];
  links: GuideLink[];
  escalation?: EscalationLevel[];
  note?: string;
};

export type EvaluationResult = ResolvedOutcome | UnresolvedOutcome;

export type ValidationIssue = {
  severity: "error" | "warning";
  message: string;
  path?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};
