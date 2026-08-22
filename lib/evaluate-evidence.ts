import { getImpactMetrics } from "@/lib/messy-data";

export type ImpactPayload = {
  affectedTxnCount: number;
  missingAlerts: number;
  fraudRatePct: number;
  percentageImpact: number;
  affectedChannel: string;
};

export function evaluateImpact(body: ImpactPayload): { passed: boolean; feedback: string } {
  const expected = getImpactMetrics();
  const channelOk = (body.affectedChannel || "").trim().toUpperCase() === "UPI";
  const checks: Array<[string, boolean]> = [
    ["affected transactions", body.affectedTxnCount === expected.affectedTxnCount],
    ["missing alerts", body.missingAlerts === expected.missingAlerts],
    [
      "fraud rate",
      typeof body.fraudRatePct === "number" &&
        Math.abs(body.fraudRatePct - expected.fraudRatePct) <= 0.2,
    ],
    [
      "percentage impact",
      Math.abs(body.percentageImpact - expected.dashboardDeclinePct) <= 1,
    ],
    ["channel", channelOk],
  ];
  const misses = checks.filter(([, ok]) => !ok).map(([name]) => name);
  const passed = misses.length === 0;
  return {
    passed,
    feedback: passed
      ? "Impact figures accepted. The concentration is now a business problem, not a curiosity."
      : `Off on ${misses.join(", ")}. Recompute from source vs warehouse — do not use the dashboard's story.`,
  };
}
