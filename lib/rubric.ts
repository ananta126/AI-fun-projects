export function scoreExplanation(text: string, requiredGroups: string[][]): {
  passed: boolean;
  hits: number;
  feedback: string;
} {
  const hay = text.toLowerCase();
  const hits = requiredGroups.filter((group) => group.some((kw) => hay.includes(kw))).length;
  const needed = Math.min(3, requiredGroups.length);
  const passed = text.trim().length >= 60 && hits >= needed;
  return {
    passed,
    hits,
    feedback: passed
      ? "The write-up covers the core of the case."
      : "Tie the answer back to the investigation: July, missing source alerts, data quality, and the concentrated channel. Write more than a slogan.",
  };
}

export const BRIEF_RUBRICS: Record<string, string[][]> = {
  changed: [
    ["july", "alert", "dashboard", "volume", "warehouse"],
    ["declin", "drop", "fewer", "26", "missing"],
  ],
  why: [
    ["warehouse", "pipeline", "dashboard", "alert"],
    ["missing", "did not", "never", "source", "raw", "reach"],
  ],
  quality: [
    ["duplicate", "null", "invalid", "transform", "quality", "raw"],
    ["customer", "txn", "alert", "id", "pipeline"],
  ],
  channel: [["upi"]],
  next: [
    ["monitor", "reconcil", "fix", "pipeline", "do not", "cfo", "brief", "coverage", "alert rate"],
  ],
};

export function scoreViva(questionId: string, text: string): { passed: boolean; feedback: string } {
  const hay = text.toLowerCase();
  const longEnough = text.trim().length >= 40;
  const keywords: Record<string, string[]> = {
    "s5-viva-1": ["duplicate", "double", "count", "inflat", "quality", "transform", "row"],
    "s5-viva-2": ["left join", "left", "missing", "null", "unmatched", "anti-join", "not in", "except"],
    "s5-viva-3": ["alert", "rate", "reconcil", "monitor", "pipeline", "source", "warehouse", "coverage"],
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

export function scoreBriefing(answers: Record<string, string>): { passed: boolean; feedback: string; hits: number } {
  const parts = ["changed", "why", "quality", "channel", "next"] as const;
  let hits = 0;
  for (const key of parts) {
    const scored = scoreExplanation(answers[key] ?? "", BRIEF_RUBRICS[key] ?? []);
    if (scored.passed || scored.hits >= 1) hits += scored.hits > 0 ? 1 : 0;
    if (key === "channel") {
      if ((answers[key] ?? "").toLowerCase().includes("upi")) hits += 1;
    }
  }
  const filled = parts.every((key) => (answers[key] ?? "").trim().length >= 24);
  const passed = filled && hits >= 5 && (answers.channel ?? "").toLowerCase().includes("upi");
  return {
    passed,
    hits,
    feedback: passed
      ? "The room can work with this. Stay with the evidence."
      : "Cover all five: what changed, why the dashboard declined, the data-quality issue, the affected channel, and what the bank should do next.",
  };
}
