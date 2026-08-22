import type { UserProgress } from "@/types";

export const SKILL_WEIGHTS: Record<string, number> = {
  "s1-q1": 6,
  "s1-q2": 6,
  "s1-q3": 6,
  "s2-sql-1": 22,
  "s3-sql-dup-txn": 6,
  "s3-sql-bad-cust": 6,
  "s3-sql-dup-alert": 6,
  "s4-metrics": 15,
  "s4-explain": 7,
  "s5-memo": 8,
  "s5-viva-1": 4,
  "s5-viva-2": 4,
  "s5-viva-3": 4,
};

export function computeSkillScore(progress: UserProgress): number {
  let score = 0;
  for (const [id, weight] of Object.entries(SKILL_WEIGHTS)) {
    if (progress.completedChallengeIds.includes(id)) score += weight;
  }
  return Math.min(100, score);
}
