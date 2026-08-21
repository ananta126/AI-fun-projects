export type ChallengeType = "multiple_choice" | "numerical" | "sql" | "text";

export type StageStatus = "locked" | "available" | "in_progress" | "completed";

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
  customer_id: string;
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
  rewardInr: number;
  briefing: TimelineEvent[];
  challenges: ChallengeDefinition[];
}

export interface TimelineEvent {
  time: string;
  from: string;
  channel: "email" | "slack" | "note" | "system";
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

export interface UserProgress {
  userId: string;
  moduleId: string;
  paidAmount: number;
  rewardUnlocked: number;
  maxReward: number;
  currentStageOrder: number;
  completedStageIds: string[];
  completedChallengeIds: string[];
  rewardHistory: RewardEntry[];
  submissions: SubmissionRecord[];
  skillScore: number | null;
  moduleCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AnalyticsEvent {
  name:
    | "module_started"
    | "stage_started"
    | "challenge_submitted"
    | "challenge_passed"
    | "stage_completed"
    | "reward_unlocked"
    | "module_completed";
  at: string;
  properties?: Record<string, string | number | boolean>;
}
