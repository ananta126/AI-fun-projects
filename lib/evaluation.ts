import { getMissingAlertTransactions, getChallengeDataset } from "@/lib/challenge-data";
import { getQualityIssues } from "@/lib/messy-data";
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
  return new Set(values.map((v) => String(v)).filter((v) => v && v !== "null" && v !== "undefined"));
}

async function evaluateIdSet(
  sql: string,
  expectedIds: string[],
  column: string,
  failMessage: string,
): Promise<SqlEvalResult> {
  const result = await runChallengeQuery(sql);
  const expected = asStringSet(expectedIds);
  const col = result.columns.find((c) => c.toLowerCase() === column.toLowerCase());
  if (!col) {
    return {
      passed: false,
      feedback: `Result must include a ${column} column.`,
      result,
      matched: 0,
      expected: expected.size,
    };
  }
  const got = asStringSet(result.rows.map((row) => row[col]));
  let matched = 0;
  for (const id of got) {
    if (expected.has(id)) matched += 1;
  }
  const extra = [...got].filter((id) => !expected.has(id)).length;
  const missing = [...expected].filter((id) => !got.has(id)).length;
  const recall = expected.size ? matched / expected.size : 0;
  const precision = got.size ? matched / got.size : 0;
  const hidden = expectedIds.slice(0, 5);
  const hiddenHits = hidden.filter((id) => got.has(id)).length;
  const passed =
    recall >= 0.95 &&
    precision >= 0.95 &&
    extra <= Math.max(2, Math.floor(expected.size * 0.05)) &&
    missing <= Math.max(2, Math.floor(expected.size * 0.05)) &&
    hiddenHits >= Math.min(3, hidden.length);

  return {
    passed,
    feedback: passed
      ? `Result set checks out. ${matched} of ${expected.size} expected ${column} values.`
      : `${failMessage} Matched ${matched}/${expected.size} (${Math.round(recall * 100)}% recall).`,
    result,
    matched,
    expected: expected.size,
  };
}

export async function evaluateMissingAlertsSql(sql: string): Promise<SqlEvalResult> {
  const dataset = getChallengeDataset();
  const expected = getMissingAlertTransactions(dataset).map((t) => t.txn_id);
  const result = await evaluateIdSet(
    sql,
    expected,
    "txn_id",
    "Include settled transactions that meet the published rules and are absent from fraud_alerts.",
  );
  if (!result.passed) return result;

  const txnKey = result.result.columns.find((c) => c.toLowerCase() === "txn_id");
  const got = asStringSet(result.result.rows.map((row) => (txnKey ? row[txnKey] : "")));
  const hiddenMustHave = getMissingAlertTransactions(dataset)
    .filter((t) => t.txn_ts.startsWith("2026-07") && t.category === "CRYPTO")
    .slice(0, 8)
    .map((t) => t.txn_id);
  const hiddenHits = hiddenMustHave.filter((id) => got.has(id)).length;
  if (hiddenHits < Math.min(5, hiddenMustHave.length)) {
    return {
      ...result,
      passed: false,
      feedback: "Hidden cases from the July CRYPTO leak are missing. Keep going.",
    };
  }
  return {
    ...result,
    feedback: `Result set matches the leak. ${result.matched} of ${result.expected} missing alerts recovered.`,
  };
}

export async function evaluateSqlChallenge(challengeId: string, sql: string): Promise<SqlEvalResult> {
  const issues = getQualityIssues();
  if (challengeId === "s2-sql-1") return evaluateMissingAlertsSql(sql);
  if (challengeId === "s3-sql-dup-txn") {
    return evaluateIdSet(
      sql,
      issues.duplicateTxnIds,
      "txn_id",
      "Return transaction IDs that appear more than once in transactions_raw.",
    );
  }
  if (challengeId === "s3-sql-bad-cust") {
    return evaluateIdSet(
      sql,
      issues.invalidCustomerTxnIds,
      "txn_id",
      "Return transactions_raw rows whose customer_id is NULL or not in customers_raw.",
    );
  }
  if (challengeId === "s3-sql-dup-alert") {
    return evaluateIdSet(
      sql,
      issues.duplicateAlertCustomerIds,
      "customer_id",
      "Return customers who have more than one fraud_alerts_raw row for the same transaction.",
    );
  }
  throw new Error("Unknown SQL challenge.");
}

export { evaluateExactAnswer } from "@/lib/evaluate-exact";
