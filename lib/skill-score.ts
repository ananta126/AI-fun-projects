import type { SkillBreakdown, UserProgress } from "@/types";

const SQL_IDS = ["s2-sql-1", "s3-sql-dup-txn", "s3-sql-bad-cust", "s3-sql-dup-alert", "s4-sql-channel"];
const DQ_IDS = ["s3-sql-dup-txn", "s3-sql-bad-cust", "s3-sql-dup-alert"];
const ANALYSIS_IDS = ["s1-q1", "s1-q2", "s4-sql-channel", "s4-metrics"];
const BUSINESS_IDS = ["s4-metrics", "s5-brief", "s5-viva-3"];
const COMM_IDS = ["s5-brief", "s5-viva-1", "s5-viva-2", "s5-viva-3"];

function dimension(progress: UserProgress, ids: string[], base: number): number {
  const passed = ids.filter((id) => progress.completedChallengeIds.includes(id)).length;
  const ratio = ids.length ? passed / ids.length : 0;
  const attempts = progress.submissions.filter((s) => ids.includes(s.challengeId));
  const fails = attempts.filter((s) => !s.passed).length;
  const penalty = Math.min(10, fails * 2);
  return Math.max(72, Math.min(96, Math.round(base + ratio * 12 - penalty)));
}

export function computeSkillBreakdown(progress: UserProgress): SkillBreakdown {
  const sqlReasoning = dimension(progress, SQL_IDS, 82);
  const dataQuality = dimension(progress, DQ_IDS, 80);
  const analysis = dimension(progress, ANALYSIS_IDS, 84);
  const businessReasoning = dimension(progress, BUSINESS_IDS, 81);
  const communication = dimension(progress, COMM_IDS, 78);
  const overall = Math.round(
    sqlReasoning * 0.24 +
      dataQuality * 0.2 +
      analysis * 0.22 +
      businessReasoning * 0.18 +
      communication * 0.16,
  );
  return {
    sqlReasoning,
    dataQuality,
    analysis,
    businessReasoning,
    communication,
    overall: Math.min(100, overall),
  };
}

export function computeSkillScore(progress: UserProgress): number {
  return computeSkillBreakdown(progress).overall;
}
