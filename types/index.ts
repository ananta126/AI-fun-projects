export type ChallengeType = "multiple_choice" | "numerical" | "sql" | "text";

export type StageStatus = "locked" | "available" | "in_progress" | "completed";

export type StoryState =
  | "NOT_STARTED"
  | "CASE_STARTED"
  | "INVESTIGATION_01_STARTED"
  | "ANOMALY_IDENTIFIED"
  | "REWARD_25_UNLOCKED"
  | "INVESTIGATION_02_UNLOCKED"
  | "INVESTIGATION_02_STARTED"
  | "MISSING_ALERTS_IDENTIFIED"
  | "REWARD_35_UNLOCKED"
  | "INVESTIGATION_03_UNLOCKED"
  | "INVESTIGATION_03_STARTED"
  | "DATA_QUALITY_ISSUE_FOUND"
  | "REWARD_90_UNLOCKED"
  | "INVESTIGATION_04_UNLOCKED"
  | "INVESTIGATION_04_STARTED"
  | "UPI_PATTERN_IDENTIFIED"
  | "REWARD_120_UNLOCKED"
  | "FINAL_REVIEW_UNLOCKED"
  | "FINAL_REVIEW_STARTED"
  | "CASE_SOLVED"
  | "REWARD_150_UNLOCKED"
  | "CASE_CLOSED";

export interface Customer {
  customer_id: string;
  full_name: string;
  city: string;
  kyc_status: "VERIFIED" | "PENDING" | "EXPIRED";
  risk_segment: "LOW" | "MEDIUM" | "HIGH";
  account_opened_on: string;
}

export interface Transaction {
  txn_id: string;
  customer_id: string | null;
  amount_inr: number;
  channel: string;
  category: string;
  txn_ts: string;
  status: "SETTLED" | "PENDING" | "REVERSED";
  is_international: number;
}

export interface FraudAlert {
  alert_id: string;
  txn_id: string;
  alert_ts: string;
  rule_code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "CLEARED" | "ESCALATED";
}

export interface ChallengeDataset {
  customers: Customer[];
  transactions: Transaction[];
  fraud_alerts: FraudAlert[];
}

export interface ChallengeDefinition {
  id: string;
  stageId: string;
  title: string;
  description: string;
  type: ChallengeType;
  datasetRef: string;
  options?: string[];
  expectedAnswer?: string | number | string[];
  evaluation: "exact" | "numeric_tolerance" | "sql_resultset" | "rubric";
  reward?: number;
}

export interface StageDefinition {
  id: string;
  order: number;
  title: string;
  shortTitle: string;
  code: string;
  kind: "investigation" | "review";
  rewardInr: number;
  briefing: TimelineEvent[];
  challenges: ChallengeDefinition[];
}

export interface TimelineEvent {
  id?: string;
  time: string;
  from: string;
  channel: "email" | "slack" | "note" | "system" | "update";
  subject?: string;
  body: string;
}

export interface ModuleDefinition {
  id: string;
  title: string;
  subtitle: string;
  priceInr: number;
  maxRewardInr: number;
  stages: StageDefinition[];
}

export interface RewardEntry {
  stageId: string;
  label: string;
  eventType: string;
  amountInr: number;
  unlockedAt: string;
}

export interface SubmissionRecord {
  id: string;
  challengeId: string;
  stageId: string;
  type: ChallengeType;
  payload: unknown;
  passed: boolean;
  feedback: string;
  submittedAt: string;
}

export interface SkillBreakdown {
  sqlReasoning: number;
  dataQuality: number;
  analysis: number;
  businessReasoning: number;
  communication: number;
  overall: number;
}

export interface UserProgress {
  userId: string;
  moduleId: string;
  paidAmount: number;
  rewardUnlocked: number;
  maxReward: number;
  currentStageOrder: number;
  completedStageIds: string[];
  completedChallengeIds: string[];
  begunStageIds: string[];
  storyState: StoryState;
  lastRewardAmount: number | null;
  rewardHistory: RewardEntry[];
  submissions: SubmissionRecord[];
  notes: Record<string, string>;
  skillScore: number | null;
  skillBreakdown: SkillBreakdown | null;
  moduleCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AnalyticsEvent {
  name:
    | "case_started"
    | "investigation_started"
    | "evidence_opened"
    | "challenge_submitted"
    | "challenge_passed"
    | "challenge_failed"
    | "reward_unlocked"
    | "case_completed"
    | "module_started"
    | "stage_started"
    | "stage_completed"
    | "module_completed";
  at: string;
  properties?: Record<string, string | number | boolean>;
}
