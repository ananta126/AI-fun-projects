import {
  getChallengeDataset,
  getMissingAlertTransactions,
} from "@/lib/challenge-data";
import { runChallengeQuery } from "@/lib/sql-engine";
import type { QueryResult } from "@/lib/sql-types";

export type SqlEvalResult = {
  passed: boolean;
  feedback: string;
  result: QueryResult;
  matched: number;
  expected: number;
};

function asStringSet(values: unknown[]): Set<string> {
  return new Set(values.map((v) => String(v)));
}

export async function evaluateMissingAlertsSql(sql: string): Promise<SqlEvalResult> {
  const result = await runChallengeQuery(sql);
  const dataset = getChallengeDataset();
  const expected = getMissingAlertTransactions(dataset);
  const expectedIds = asStringSet(expected.map((t) => t.txn_id));

  const txnKey = result.columns.find((c) => c.toLowerCase() === "txn_id");
  if (!txnKey) {
    return {
      passed: false,
      feedback: "Result must include a txn_id column so we can score the missing alerts.",
      result,
      matched: 0,
      expected: expectedIds.size,
    };
  }

  const got = asStringSet(result.rows.map((row) => row[txnKey]));
  let matched = 0;
  for (const id of got) {
    if (expectedIds.has(id)) matched += 1;
  }

  const extra = [...got].filter((id) => !expectedIds.has(id)).length;
  const missing = [...expectedIds].filter((id) => !got.has(id)).length;

  const hiddenMustHave = expected
    .filter((t) => t.txn_ts.startsWith("2026-07") && t.category === "CRYPTO")
    .slice(0, 8)
    .map((t) => t.txn_id);
  const hiddenHits = hiddenMustHave.filter((id) => got.has(id)).length;

  const recall = expectedIds.size ? matched / expectedIds.size : 0;
  const precision = got.size ? matched / got.size : 0;
  const passed =
    recall >= 0.95 &&
    precision >= 0.95 &&
    extra <= Math.max(3, Math.floor(expectedIds.size * 0.05)) &&
    missing <= Math.max(3, Math.floor(expectedIds.size * 0.05)) &&
    hiddenHits >= Math.min(5, hiddenMustHave.length);

  const feedback = passed
    ? `Result set matches the leak. ${matched} of ${expectedIds.size} missing alerts recovered.`
    : `Not quite. Matched ${matched}/${expectedIds.size} expected txn_ids (${Math.round(recall * 100)}% recall, ${Math.round(precision * 100)}% precision). Include settled transactions that meet the published rules and are absent from fraud_alerts.`;

  return { passed, feedback, result, matched, expected: expectedIds.size };
}

export { evaluateExactAnswer } from "@/lib/evaluate-exact";
