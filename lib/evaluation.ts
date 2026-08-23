import { getMissingSourceAlerts, getQualityIssues } from "@/lib/messy-data";
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

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
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
  const passed =
    recall >= 0.95 &&
    precision >= 0.9 &&
    extra <= Math.max(1, Math.floor(expected.size * 0.1)) &&
    missing <= Math.max(1, Math.floor(expected.size * 0.1));

  return {
    passed,
    feedback: passed
      ? `Result set checks out. ${matched} of ${expected.size} expected ${column} values.`
      : `${failMessage} Matched ${matched}/${expected.size}.`,
    result,
    matched,
    expected: expected.size,
  };
}

export async function evaluateMissingSourceAlertsSql(sql: string): Promise<SqlEvalResult> {
  const expected = getMissingSourceAlerts().map((a) => a.alert_id);
  return evaluateIdSet(
    sql,
    expected,
    "alert_id",
    "Return alert_id values that exist in fraud_alerts_raw but not in fraud_alerts.",
  );
}

export async function evaluateChannelConcentrationSql(sql: string): Promise<SqlEvalResult> {
  const result = await runChallengeQuery(sql);
  const expectedIds = getMissingSourceAlerts().map((a) => a.alert_id);
  const alertCol = result.columns.find((c) => c.toLowerCase() === "alert_id");
  if (alertCol) {
    const got = asStringSet(result.rows.map((row) => row[alertCol]));
    const expected = asStringSet(expectedIds);
    let matched = 0;
    for (const id of got) if (expected.has(id)) matched += 1;
    const passed = matched === expected.size && got.size === expected.size;
    if (passed) {
      return {
        passed: true,
        feedback: "The missing set is complete. Inspect channel — it is not spread evenly.",
        result,
        matched,
        expected: expected.size,
      };
    }
  }

  const channelCol = result.columns.find((c) => c.toLowerCase() === "channel");
  const countCol = result.columns.find((c) => {
    const n = c.toLowerCase();
    return ["missing", "cnt", "count", "n", "alerts"].includes(n) || n.includes("count");
  });
  if (channelCol && countCol) {
    const upi = result.rows.find((row) => String(row[channelCol]).toUpperCase() === "UPI");
    const upiCount = num(upi?.[countCol]) ?? 0;
    const otherMissing = result.rows
      .filter((row) => String(row[channelCol]).toUpperCase() !== "UPI")
      .reduce((sum, row) => sum + (num(row[countCol]) ?? 0), 0);
    const passed = upiCount === 14 && otherMissing === 0;
    return {
      passed,
      feedback: passed
        ? "The missing alerts concentrate in a single channel. Fourteen of fourteen."
        : "Channel mix is not conclusive yet. Compare source alerts to warehouse alerts by channel.",
      result,
      matched: passed ? 14 : upiCount,
      expected: 14,
    };
  }

  return {
    passed: false,
    feedback:
      "Return either the missing alert_id values, or a channel breakdown with a count/missing column.",
    result,
    matched: 0,
    expected: 14,
  };
}

export async function evaluateSqlChallenge(challengeId: string, sql: string): Promise<SqlEvalResult> {
  const issues = getQualityIssues();
  if (challengeId === "s2-sql-1") return evaluateMissingSourceAlertsSql(sql);
  if (challengeId === "s4-sql-channel") return evaluateChannelConcentrationSql(sql);
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
