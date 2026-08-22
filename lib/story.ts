import { QUEST_MODULE } from "@/data/module";
import type { StoryState, TimelineEvent, UserProgress } from "@/types";

export const STORY_ORDER: StoryState[] = [
  "NOT_STARTED",
  "CASE_STARTED",
  "INVESTIGATION_01_STARTED",
  "ANOMALY_IDENTIFIED",
  "REWARD_25_UNLOCKED",
  "INVESTIGATION_02_UNLOCKED",
  "INVESTIGATION_02_STARTED",
  "MISSING_ALERTS_IDENTIFIED",
  "REWARD_35_UNLOCKED",
  "INVESTIGATION_03_UNLOCKED",
  "INVESTIGATION_03_STARTED",
  "DATA_QUALITY_ISSUE_FOUND",
  "REWARD_90_UNLOCKED",
  "INVESTIGATION_04_UNLOCKED",
  "INVESTIGATION_04_STARTED",
  "UPI_PATTERN_IDENTIFIED",
  "REWARD_120_UNLOCKED",
  "FINAL_REVIEW_UNLOCKED",
  "FINAL_REVIEW_STARTED",
  "CASE_SOLVED",
  "REWARD_150_UNLOCKED",
  "CASE_CLOSED",
];

export function storyRank(state: StoryState): number {
  const idx = STORY_ORDER.indexOf(state);
  return idx < 0 ? 0 : idx;
}

export function isAtLeast(current: StoryState, min: StoryState): boolean {
  return storyRank(current) >= storyRank(min);
}

export type StoryMessage = TimelineEvent & {
  id: string;
  minState: StoryState;
};

export const STORY_FEED: StoryMessage[] = [
  {
    id: "priya-0912",
    time: "09:12 AM",
    from: "Priya Nair — Head of Fraud Analytics",
    channel: "slack",
    subject: "SECURE MESSAGE",
    minState: "CASE_STARTED",
    body: "Something doesn't look right with this month's numbers.\n\nThe fraud dashboard is celebrating a decline in suspicious activity.\n\nTransaction volumes haven't moved much.\n\nCan you take a look before standup?",
  },
  {
    id: "ops-0918",
    time: "09:18 AM",
    from: "SYSTEM — OPS BOT",
    channel: "system",
    subject: "ACCESS GRANT",
    minState: "CASE_STARTED",
    body: "Access granted.\n\nWarehouse snapshot available for July close.\n\nRead-only access:\n\ncustomers\ntransactions\nfraud_alerts",
  },
  {
    id: "note-001",
    time: "09:21 AM",
    from: "INVESTIGATION NOTE #001",
    channel: "note",
    subject: "CASE NOTE",
    minState: "CASE_STARTED",
    body: "Don't start with the dashboard.\n\nStart with the data.",
  },
  {
    id: "update-0947",
    time: "09:47 AM",
    from: "CASE UPDATE",
    channel: "update",
    minState: "ANOMALY_IDENTIFIED",
    body: "July is definitely different.\n\nBut that doesn't tell us whether fraud actually fell.\n\nIt only tells us that fewer alerts reached the dashboard.",
  },
  {
    id: "priya-1002",
    time: "10:02 AM",
    from: "Priya Nair — Head of Fraud Analytics",
    channel: "slack",
    subject: "SECURE MESSAGE",
    minState: "INVESTIGATION_02_UNLOCKED",
    body: "Good catch.\n\nNow we need to answer a different question.\n\nDid suspicious activity fall...\n\nor did some alerts disappear before they reached the warehouse?",
  },
  {
    id: "ops-raw",
    time: "10:08 AM",
    from: "SYSTEM — OPS BOT",
    channel: "system",
    minState: "INVESTIGATION_02_UNLOCKED",
    body: "Additional evidence unlocked.\n\nfraud_alerts_raw",
  },
  {
    id: "update-1036",
    time: "10:36 AM",
    from: "CASE UPDATE",
    channel: "update",
    minState: "MISSING_ALERTS_IDENTIFIED",
    body: "You found them.\n\nFourteen alerts never made it into the warehouse.\n\nThat's enough to explain part of the discrepancy.\n\nBut not enough to explain why the dashboard changed so dramatically.",
  },
  {
    id: "arjun-1117",
    time: "11:17 AM",
    from: "Arjun Mehta — Data Engineering",
    channel: "slack",
    subject: "SECURE MESSAGE",
    minState: "INVESTIGATION_03_UNLOCKED",
    body: "Checked the pipeline logs.\n\nNo failed jobs.\n\nWarehouse load completed successfully.\n\nSource data looks clean.",
  },
  {
    id: "note-002",
    time: "11:21 AM",
    from: "INVESTIGATION NOTE #002",
    channel: "note",
    subject: "CASE NOTE",
    minState: "INVESTIGATION_03_UNLOCKED",
    body: "Pipeline succeeded.\n\nThat doesn't mean the data is correct.",
  },
  {
    id: "ops-raw-full",
    time: "11:22 AM",
    from: "SYSTEM — OPS BOT",
    channel: "system",
    minState: "INVESTIGATION_03_UNLOCKED",
    body: "Additional evidence unlocked.\n\ncustomers_raw\ntransactions_raw\npipeline_logs",
  },
  {
    id: "arjun-1158",
    time: "11:58 AM",
    from: "Arjun Mehta — Data Engineering",
    channel: "slack",
    subject: "SECURE MESSAGE",
    minState: "DATA_QUALITY_ISSUE_FOUND",
    body: "Wait.\n\nShow me those records again.\n\nThese aren't random duplicates.",
  },
  {
    id: "priya-1204",
    time: "12:04 PM",
    from: "Priya Nair — Head of Fraud Analytics",
    channel: "slack",
    subject: "SECURE MESSAGE",
    minState: "UPI_PATTERN_IDENTIFIED",
    body: "All fourteen?\n\nYou're sure?\n\nThat's not random.",
  },
  {
    id: "update-1231",
    time: "12:31 PM",
    from: "CASE UPDATE",
    channel: "update",
    minState: "FINAL_REVIEW_UNLOCKED",
    body: "The CFO has been told that fraud is down 26%.\n\nPriya hasn't approved that number.\n\nYou have five minutes before the executive review.",
  },
];

export const EVIDENCE_UNLOCK: Record<string, StoryState> = {
  customers: "CASE_STARTED",
  transactions: "CASE_STARTED",
  fraud_alerts: "CASE_STARTED",
  fraud_alerts_raw: "INVESTIGATION_02_UNLOCKED",
  customers_raw: "INVESTIGATION_03_UNLOCKED",
  transactions_raw: "INVESTIGATION_03_UNLOCKED",
  pipeline_logs: "INVESTIGATION_03_UNLOCKED",
};

export type MissionCopy = {
  objective: string;
  support: string;
  rewardInr: number;
  beginLabel: string;
};

export const MISSIONS: Record<string, MissionCopy> = {
  "stage-1": {
    objective: "Find the first month where fraud activity stops behaving normally.",
    support: "Inspect the available data and determine when the numbers first begin to diverge.",
    rewardInr: 25,
    beginLabel: "BEGIN INVESTIGATION",
  },
  "stage-2": {
    objective: "Find the 14 alerts that exist in the source but not in the warehouse.",
    support: "A new evidence table is on the desk. Compare source to warehouse. Joins are allowed — we score the result, not the SQL text.",
    rewardInr: 35,
    beginLabel: "BEGIN INVESTIGATION",
  },
  "stage-3": {
    objective: "Test whether a successful pipeline actually produced correct data.",
    support: "Engineering says the load is clean. Inspect source versus warehouse without assuming they match.",
    rewardInr: 30,
    beginLabel: "BEGIN INVESTIGATION",
  },
  "stage-4": {
    objective: "Find out whether the missing alerts are random or concentrated in a specific channel.",
    support: "Calculate the pattern from the records. Then quantify what it does to the numbers the bank is about to brief.",
    rewardInr: 30,
    beginLabel: "BEGIN INVESTIGATION",
  },
  "stage-5": {
    objective: "Prepare the executive summary before the review.",
    support: "The CFO has been told fraud is down 26%. Explain what actually happened, then answer the follow-ups.",
    rewardInr: 30,
    beginLabel: "ENTER EXECUTIVE REVIEW",
  },
};

export function deriveStoryState(progress: UserProgress): StoryState {
  if (!progress.paidAmount) return "NOT_STARTED";
  const done = new Set(progress.completedStageIds);
  const begun = new Set(progress.begunStageIds);
  const passed = new Set(progress.completedChallengeIds);

  if (progress.moduleCompleted) return "CASE_CLOSED";
  if (done.has("stage-5")) return "REWARD_150_UNLOCKED";

  if (done.has("stage-4")) {
    if (begun.has("stage-5")) return "FINAL_REVIEW_STARTED";
    return "FINAL_REVIEW_UNLOCKED";
  }

  if (done.has("stage-3")) {
    if (passed.has("s4-sql-channel")) return "UPI_PATTERN_IDENTIFIED";
    if (begun.has("stage-4")) return "INVESTIGATION_04_STARTED";
    return "INVESTIGATION_04_UNLOCKED";
  }

  if (done.has("stage-2")) {
    if (begun.has("stage-3")) return "INVESTIGATION_03_STARTED";
    return "INVESTIGATION_03_UNLOCKED";
  }

  if (done.has("stage-1")) {
    if (begun.has("stage-2")) return "INVESTIGATION_02_STARTED";
    return "INVESTIGATION_02_UNLOCKED";
  }

  if (passed.has("s1-q1") && passed.has("s1-q2")) return "ANOMALY_IDENTIFIED";
  if (begun.has("stage-1")) return "INVESTIGATION_01_STARTED";
  return "CASE_STARTED";
}

export function visibleFeed(progress: UserProgress): StoryMessage[] {
  const state = progress.storyState || deriveStoryState(progress);
  return STORY_FEED.filter((msg) => isAtLeast(state, msg.minState));
}

export function allowedEvidenceTables(progress: UserProgress): string[] {
  const state = progress.storyState || deriveStoryState(progress);
  return Object.entries(EVIDENCE_UNLOCK)
    .filter(([, min]) => isAtLeast(state, min))
    .map(([name]) => name);
}

export function investigationLabel(stageId: string): string {
  const stage = QUEST_MODULE.stages.find((s) => s.id === stageId);
  if (!stage) return "Investigation";
  if (stage.kind === "review") return "Final Review";
  return `Investigation ${stage.code}`;
}
