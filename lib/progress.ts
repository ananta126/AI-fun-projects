import { QUEST_MODULE } from "@/data/module";
import { computeSkillScore } from "@/lib/skill-score";
import type { AnalyticsEvent, RewardEntry, SubmissionRecord, UserProgress } from "@/types";
import { nowIso, uid } from "@/lib/utils";

export const SIMULATED_USER_ID = "sim-analyst-001";
const STORAGE_KEY = "questbank.progress.v1";
const EVENTS_KEY = "questbank.analytics.v1";

export const EMPTY_PROGRESS: UserProgress = {
  userId: SIMULATED_USER_ID,
  moduleId: QUEST_MODULE.id,
  paidAmount: 0,
  rewardUnlocked: 0,
  maxReward: QUEST_MODULE.maxRewardInr,
  currentStageOrder: 0,
  completedStageIds: [],
  completedChallengeIds: [],
  rewardHistory: [],
  submissions: [],
  notes: {},
  skillScore: null,
  moduleCompleted: false,
  startedAt: null,
  completedAt: null,
};

const EMPTY_EVENTS: AnalyticsEvent[] = [];

let cachedProgressRaw: string | null | undefined;
let cachedProgress: UserProgress = EMPTY_PROGRESS;
let cachedEventsRaw: string | null | undefined;
let cachedEvents: AnalyticsEvent[] = EMPTY_EVENTS;

export function emptyProgress(): UserProgress {
  return { ...EMPTY_PROGRESS, notes: {}, completedStageIds: [], completedChallengeIds: [], rewardHistory: [], submissions: [] };
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
    cachedProgress = {
      ...EMPTY_PROGRESS,
      ...parsed,
      notes: parsed.notes ?? {},
    };
    return cachedProgress;
  } catch {
    cachedProgress = EMPTY_PROGRESS;
    cachedProgressRaw = null;
    return cachedProgress;
  }
}

export function saveProgress(progress: UserProgress) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(progress);
  cachedProgressRaw = raw;
  cachedProgress = progress;
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
  };
  saveProgress(next);
  track("module_started", { moduleId: QUEST_MODULE.id, paidAmount: QUEST_MODULE.priceInr });
  track("stage_started", { stageId: "stage-1" });
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
  const next: UserProgress = {
    ...progress,
    submissions: [...progress.submissions, submission],
    completedChallengeIds: input.passed
      ? Array.from(new Set([...progress.completedChallengeIds, input.challengeId]))
      : progress.completedChallengeIds,
  };
  saveProgress(next);
  track("challenge_submitted", {
    challengeId: input.challengeId,
    passed: input.passed,
  });
  if (input.passed) {
    track("challenge_passed", { challengeId: input.challengeId });
  }
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
    label: `Stage ${stage.order}`,
    amountInr: amount,
    unlockedAt: nowIso(),
  };

  const nextOrder = Math.min(stage.order + 1, QUEST_MODULE.stages.length);
  const moduleCompleted = stage.order === QUEST_MODULE.stages.length;

  const next: UserProgress = {
    ...progress,
    completedStageIds: [...progress.completedStageIds, stageId],
    rewardUnlocked: progress.rewardUnlocked + amount,
    rewardHistory: [...progress.rewardHistory, entry],
    currentStageOrder: moduleCompleted ? stage.order : nextOrder,
    moduleCompleted,
    completedAt: moduleCompleted ? nowIso() : progress.completedAt,
    skillScore: moduleCompleted ? computeSkillScore({
      ...progress,
      completedStageIds: [...progress.completedStageIds, stageId],
    }) : progress.skillScore,
  };
  saveProgress(next);
  track("stage_completed", { stageId, reward: amount });
  track("reward_unlocked", { stageId, amount, total: next.rewardUnlocked });
  if (moduleCompleted) {
    track("module_completed", { rewardUnlocked: next.rewardUnlocked });
  } else {
    const nextStage = QUEST_MODULE.stages.find((s) => s.order === nextOrder);
    if (nextStage) track("stage_started", { stageId: nextStage.id });
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

export function forceCompleteStage(progress: UserProgress, stageId: string): UserProgress {
  let next = progress.paidAmount ? progress : startModule(progress);
  const target = QUEST_MODULE.stages.find((s) => s.id === stageId);
  if (!target) return next;
  for (const stage of QUEST_MODULE.stages) {
    if (stage.order > target.order) break;
    if (!next.completedStageIds.includes(stage.id)) {
      const challengeIds = stage.challenges.map((c) => c.id);
      next = {
        ...next,
        completedChallengeIds: Array.from(new Set([...next.completedChallengeIds, ...challengeIds])),
      };
      next = completeStage(next, stage.id);
    }
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
    rewardHistory,
    rewardUnlocked,
    currentStageOrder: progress.paidAmount ? target.order : 0,
    moduleCompleted: false,
    completedAt: null,
    skillScore: null,
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
