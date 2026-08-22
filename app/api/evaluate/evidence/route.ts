import { NextResponse } from "next/server";
import { getEvidenceMetrics } from "@/lib/messy-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      totalTransactions?: number;
      suspiciousTransactions?: number;
      fraudRatePct?: number;
      missingAlerts?: number;
      duplicateTxnIds?: number;
    };
    const expected = getEvidenceMetrics();
    const checks = [
      ["totalTransactions", body.totalTransactions, expected.totalTransactions, 0],
      ["suspiciousTransactions", body.suspiciousTransactions, expected.suspiciousTransactions, 0],
      ["fraudRatePct", body.fraudRatePct, expected.fraudRatePct, 0.2],
      ["missingAlerts", body.missingAlerts, expected.missingAlerts, 0],
      ["duplicateTxnIds", body.duplicateTxnIds, expected.duplicateTxnIds, 0],
    ] as const;

    const misses = checks.filter(([, got, want, tol]) => {
      if (typeof got !== "number" || Number.isNaN(got)) return true;
      return Math.abs(got - want) > tol;
    });

    const passed = misses.length === 0;
    return NextResponse.json({
      passed,
      feedback: passed
        ? "Evidence pack accepted. The CRO can work with this."
        : `Off on ${misses.length} figure${misses.length === 1 ? "" : "s"} (${misses.map(([k]) => k).join(", ")}). Re-query the warehouse and the raw landing tables.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evaluation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
