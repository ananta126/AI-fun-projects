import { QUEST_MODULE } from "@/data/module";
import { computeSkillBreakdown } from "@/lib/skill-score";
import { deriveStoryState } from "@/lib/story";
import type { AnalyticsEvent, RewardEntry, StoryState, SubmissionRecord, UserProgress } from "@/types";
import { nowIso, uid } from "@/lib/utils";

export const SIMULATED_USER_ID = "sim-analyst-001";
const STORAGE_KEY = "questbank.progress.v2";
const EVENTS_KEY = "questbank.analytics.v2";

export const EMPTY_PROGRESS: UserProgress = {
  userId: SIMULATED_USER_ID,
  moduleId: QUEST_MODULE.id,
  paidAmount: 0,
  rewardUnlocked: 0,
  maxReward: QUEST_MODULE.maxRewardInr,
  currentStageOrder: 0,
  completedStageIds: [],
  completedChallengeIds: [],
  begunStageIds: [],
  storyState: "NOT_STARTED",
  lastRewardAmount: null,
  rewardHistory: [],
  submissions: [],
  notes: {},
  skillScore: null,
  skillBreakdown: null,
  moduleCompleted: false,
  startedAt: null,
  completedAt: null,
};

const EMPTY_EVENTS: AnalyticsEvent[] = [];

let cachedProgressRaw: string | null | undefined;
let cachedProgress: UserProgress = EMPTY_PROGRESS;
let cachedEventsRaw: string | null | undefined;
let cachedEvents: AnalyticsEvent[] = EMPTY_EVENTS;

function withDerived(progress: UserProgress): UserProgress {
  return { ...progress, storyState: deriveStoryState(progress) };
}

export function emptyProgress(): UserProgress {
  return {
    ...EMPTY_PROGRESS,
    notes: {},
    completedStageIds: [],
    completedChallengeIds: [],
    begunStageIds: [],
    rewardHistory: [],
    submissions: [],
    storyState: "NOT_STARTED",
  };
}

export function loadProgress(): UserProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedProgressRaw) return cachedProgress;
    cachedProgressRaw = raw;
    if (!raw) {
      cachedProgress = EMPTY_PROGRESS;
      return cachedProgress;
    }
    const parsed = JSON.parse(raw) as UserProgress;
    cachedProgress = withDerived({
      ...EMPTY_PROGRESS,
      ...parsed,
      notes: parsed.notes ?? {},
      begunStageIds: parsed.begunStageIds ?? [],
      rewardHistory: (parsed.rewardHistory ?? []).map((row) => ({
        ...row,
        eventType: row.eventType ?? "REWARD",
      })),
    });
    return cachedProgress;
  } catch {
    cachedProgress = EMPTY_PROGRESS;
    cachedProgressRaw = null;
    return cachedProgress;
  }
}

export function saveProgress(progress: UserProgress) {
  if (typeof window === "undefined") return;
  const next = withDerived(progress);
  const raw = JSON.stringify(next);
  cachedProgressRaw = raw;
  cachedProgress = next;
  window.localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event("questbank-progress"));
}

export function loadEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return EMPTY_EVENTS;
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY) || "[]";
    if (raw === cachedEventsRaw) return cachedEvents;
    cachedEventsRaw = raw;
    cachedEvents = JSON.parse(raw) as AnalyticsEvent[];
    return cachedEvents;
  } catch {
    cachedEvents = EMPTY_EVENTS;
    cachedEventsRaw = "[]";
    return cachedEvents;
  }
}

export function track(
  name: AnalyticsEvent["name"],
  properties?: AnalyticsEvent["properties"],
) {
  if (typeof window === "undefined") return;
  const events = [...loadEvents(), { name, at: nowIso(), properties }];
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  cachedEventsRaw = JSON.stringify(events);
  cachedEvents = events;
  window.dispatchEvent(new Event("questbank-progress"));
}

export function startModule(progress: UserProgress): UserProgress {
  if (progress.paidAmount > 0) return progress;
  const next: UserProgress = {
    ...progress,
    paidAmount: QUEST_MODULE.priceInr,
    currentStageOrder: 1,
    startedAt: nowIso(),
    storyState: "CASE_STARTED",
  };
  saveProgress(next);
  track("case_started", { moduleId: QUEST_MODULE.id, paidAmount: QUEST_MODULE.priceInr });
  track("module_started", { moduleId: QUEST_MODULE.id, paidAmount: QUEST_MODULE.priceInr });
  return next;
}

export function beginInvestigation(progress: UserProgress, stageId: string): UserProgress {
  if (!progress.paidAmount) progress = startModule(progress);
  if (progress.begunStageIds.includes(stageId)) return progress;
  const next: UserProgress = {
    ...progress,
    begunStageIds: [...progress.begunStageIds, stageId],
    lastRewardAmount: null,
  };
  saveProgress(next);
  track("investigation_started", { stageId });
  track("stage_started", { stageId });
  return next;
}

export function recordSubmission(
  progress: UserProgress,
  input: Omit<SubmissionRecord, "id" | "submittedAt">,
): UserProgress {
  const submission: SubmissionRecord = {
    ...input,
    id: uid("sub"),
    submittedAt: nowIso(),
  };
  let storyState: StoryState = progress.storyState;
  if (input.passed) {
    if (input.challengeId === "s1-q2") storyState = "ANOMALY_IDENTIFIED";
    if (input.challengeId === "s2-sql-1") storyState = "MISSING_ALERTS_IDENTIFIED";
    if (input.challengeId === "s3-sql-dup-alert") storyState = "DATA_QUALITY_ISSUE_FOUND";
    if (input.challengeId === "s4-sql-channel") storyState = "UPI_PATTERN_IDENTIFIED";
    if (input.challengeId === "s5-viva-3") storyState = "CASE_SOLVED";
  }
  const next: UserProgress = {
    ...progress,
    submissions: [...progress.submissions, submission],
    completedChallengeIds: input.passed
      ? Array.from(new Set([...progress.completedChallengeIds, input.challengeId]))
      : progress.completedChallengeIds,
    storyState,
  };
  saveProgress(next);
  track("challenge_submitted", {
    challengeId: input.challengeId,
    passed: input.passed,
  });
  if (input.passed) track("challenge_passed", { challengeId: input.challengeId });
  else track("challenge_failed", { challengeId: input.challengeId });
  return next;
}

export function completeStage(progress: UserProgress, stageId: string): UserProgress {
  if (progress.completedStageIds.includes(stageId)) return progress;
  const stage = QUEST_MODULE.stages.find((s) => s.id === stageId);
  if (!stage) return progress;

  const remaining = progress.maxReward - progress.rewardUnlocked;
  const amount = Math.min(stage.rewardInr, remaining);
  const entry: RewardEntry = {
    stageId,
    label: stage.kind === "review" ? "FINAL_REVIEW_COMPLETED" : `INVESTIGATION_${stage.code}_COMPLETED`,
    eventType: "REWARD",
    amountInr: amount,
    unlockedAt: nowIso(),
  };

  const nextOrder = Math.min(stage.order + 1, QUEST_MODULE.stages.length);
  const moduleCompleted = stage.order === QUEST_MODULE.stages.length;
  const completedStageIds = [...progress.completedStageIds, stageId];
  const nextProgressBase: UserProgress = {
    ...progress,
    completedStageIds,
    rewardUnlocked: progress.rewardUnlocked + amount,
    lastRewardAmount: amount,
    rewardHistory: [...progress.rewardHistory, entry],
    currentStageOrder: moduleCompleted ? stage.order : nextOrder,
    moduleCompleted,
    completedAt: moduleCompleted ? nowIso() : progress.completedAt,
  };
  const breakdown = moduleCompleted ? computeSkillBreakdown(nextProgressBase) : progress.skillBreakdown;

  const next: UserProgress = {
    ...nextProgressBase,
    skillScore: breakdown?.overall ?? progress.skillScore,
    skillBreakdown: breakdown,
    storyState: moduleCompleted ? "CASE_CLOSED" : deriveStoryState(nextProgressBase),
  };
  saveProgress(next);
  track("stage_completed", { stageId, reward: amount });
  track("reward_unlocked", { stageId, amount, total: next.rewardUnlocked });
  if (moduleCompleted) {
    track("case_completed", { rewardUnlocked: next.rewardUnlocked });
    track("module_completed", { rewardUnlocked: next.rewardUnlocked });
  }
  return next;
}

export function resetProgress(): UserProgress {
  const next = emptyProgress();
  saveProgress(next);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(EVENTS_KEY);
    cachedEventsRaw = "[]";
    cachedEvents = EMPTY_EVENTS;
    window.dispatchEvent(new Event("questbank-progress"));
  }
  return next;
}

export function saveNotes(progress: UserProgress, key: string, text: string): UserProgress {
  const next: UserProgress = {
    ...progress,
    notes: { ...progress.notes, [key]: text },
  };
  saveProgress(next);
  return next;
}

export function clearRewardToast(progress: UserProgress): UserProgress {
  if (!progress.lastRewardAmount) return progress;
  const next = { ...progress, lastRewardAmount: null };
  saveProgress(next);
  return next;
}

export function jumpToInvestigation(progress: UserProgress, stageId: string): UserProgress {
  let next = progress.paidAmount ? progress : startModule(progress);
  const target = QUEST_MODULE.stages.find((s) => s.id === stageId);
  if (!target) return next;
  for (const stage of QUEST_MODULE.stages) {
    if (stage.order >= target.order) break;
    if (!next.completedStageIds.includes(stage.id)) {
      const challengeIds = stage.challenges.map((c) => c.id);
      next = {
        ...next,
        completedChallengeIds: Array.from(new Set([...next.completedChallengeIds, ...challengeIds])),
        begunStageIds: Array.from(new Set([...next.begunStageIds, stage.id])),
      };
      next = completeStage(next, stage.id);
    }
  }
  if (!next.begunStageIds.includes(stageId)) {
    next = beginInvestigation(next, stageId);
  }
  return next;
}

export function forceCompleteStage(progress: UserProgress, stageId: string): UserProgress {
  let next = jumpToInvestigation(progress, stageId);
  const target = QUEST_MODULE.stages.find((s) => s.id === stageId);
  if (!target) return next;
  if (!next.completedStageIds.includes(stageId)) {
    next = {
      ...next,
      completedChallengeIds: Array.from(new Set([...next.completedChallengeIds, ...target.challenges.map((c) => c.id)])),
    };
    next = completeStage(next, stageId);
  }
  return next;
}

export function uncompleteFromStage(progress: UserProgress, stageId: string): UserProgress {
  const target = QUEST_MODULE.stages.find((s) => s.id === stageId);
  if (!target) return progress;
  const drop = new Set(
    QUEST_MODULE.stages.filter((s) => s.order >= target.order).map((s) => s.id),
  );
  const dropChallenges = new Set(
    QUEST_MODULE.stages
      .filter((s) => s.order >= target.order)
      .flatMap((s) => s.challenges.map((c) => c.id)),
  );
  const rewardHistory = progress.rewardHistory.filter((row) => !drop.has(row.stageId));
  const rewardUnlocked = Math.min(
    progress.maxReward,
    rewardHistory.reduce((sum, row) => sum + row.amountInr, 0),
  );
  const next: UserProgress = {
    ...progress,
    completedStageIds: progress.completedStageIds.filter((id) => !drop.has(id)),
    completedChallengeIds: progress.completedChallengeIds.filter((id) => !dropChallenges.has(id)),
    begunStageIds: progress.begunStageIds.filter((id) => !drop.has(id)),
    rewardHistory,
    rewardUnlocked,
    lastRewardAmount: null,
    currentStageOrder: progress.paidAmount ? target.order : 0,
    moduleCompleted: false,
    completedAt: null,
    skillScore: null,
    skillBreakdown: null,
  };
  saveProgress(next);
  return next;
}

export function subscribeProgress(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("questbank-progress", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("questbank-progress", onStoreChange);
  };
}
