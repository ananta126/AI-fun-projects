export function scoreExplanation(text: string, requiredGroups: string[][]): {
  passed: boolean;
  hits: number;
  feedback: string;
} {
  const hay = text.toLowerCase();
  const hits = requiredGroups.filter((group) => group.some((kw) => hay.includes(kw))).length;
  const needed = Math.min(3, requiredGroups.length);
  const passed = text.trim().length >= 80 && hits >= needed;
  return {
    passed,
    hits,
    feedback: passed
      ? "The write-up covers the core of the case."
      : "Add more evidence: July drop, the alert pipeline leak (especially CRYPTO / WIRE), and data-quality noise such as duplicates. Write at least a short paragraph.",
  };
}

export const STAGE4_RUBRIC = [
  ["july", "jul 2026", "this month"],
  ["pipeline", "leak", "missing alert", "did not alert", "didn't alert", "drop"],
  ["crypto", "wire"],
  ["duplicate", "data quality", "null", "dirty", "inconsistent"],
];

export const MEMO_RUBRIC = [
  ["dashboard", "alert", "under-count", "missing", "leak", "pipeline"],
  ["july", "crypto", "wire", "duplicate", "left join", "transactions_raw"],
  ["monitor", "fix", "pipeline", "data quality", "reconciliation", "alert rate"],
];

export function scoreViva(questionId: string, text: string): { passed: boolean; feedback: string } {
  const hay = text.toLowerCase();
  const longEnough = text.trim().length >= 40;
  const keywords: Record<string, string[]> = {
    "s5-viva-1": ["duplicate", "double", "count", "inflat", "dashboard", "volume", "quality"],
    "s5-viva-2": ["left join", "left", "missing", "null", "unmatched", "anti-join", "not in"],
    "s5-viva-3": ["alert", "rate", "reconcil", "monitor", "pipeline", "freshness", "coverage"],
  };
  const keys = keywords[questionId] ?? ["alert", "data"];
  const hit = keys.some((k) => hay.includes(k));
  const passed = longEnough && hit;
  return {
    passed,
    feedback: passed
      ? "Noted for the exec briefing."
      : "Too thin. Answer in a sentence or two using the evidence from the investigation.",
  };
}
