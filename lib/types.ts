export type SystemId = "shopify" | "sap" | "hubspot" | "salesforce" | "stripe" | "datev";
export type Entity = "customer" | "order" | "invoice";
export type Status = "synced" | "failed" | "pending" | "conflict";
export type Scenario = "normal" | "conflict" | "failure";
export type Strategy = "a" | "b" | "merge";
export type Side = "a" | "b";

export interface PipelineRun {
  id: string;
  stage: number; // 0..3, siehe STAGES
  progress: number; // 0..1 über alle Stufen
  startedAt: number;
  scenario: Scenario;
}

export interface Pipeline {
  id: string;
  name: string;
  source: SystemId;
  target: SystemId;
  entity: Entity;
  schedule: string;
  twoWay: boolean;
  paused: boolean;
  run: PipelineRun | null;
  lastRunAt: number;
  lastRunResult: "ok" | "partial" | "failed";
}

export interface SyncRecord {
  id: string;
  pipelineId: string;
  entity: Entity;
  ref: string;
  label: string;
  status: Status;
  at: number;
  durationMs?: number;
  message?: string;
  retryable?: boolean;
  conflictId?: string;
  attempts: number;
  runId?: string;
}

export interface ConflictField {
  key: string;
  label: string;
  a: string;
  b: string;
  aAt: number;
  bAt: number;
}

export interface Conflict {
  id: string;
  recordId: string;
  pipelineId: string;
  entity: Entity;
  ref: string;
  label: string;
  detectedAt: number;
  rule: string;
  fields: ConflictField[];
  unchanged: { label: string; value: string }[];
  resolution?: {
    strategy: Strategy;
    picks: Record<string, Side>;
    values: Record<string, string>;
    at: number;
  };
}
