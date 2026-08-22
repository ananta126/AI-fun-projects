import { evaluateSqlChallenge } from "../lib/evaluation";
import { getEvidenceMetrics, getQualityIssues } from "../lib/messy-data";

async function main() {
  const issues = getQualityIssues();
  const metrics = getEvidenceMetrics();
  console.log("quality issues", {
    dupTxn: issues.duplicateTxnIds.length,
    badCust: issues.invalidCustomerTxnIds.length,
    dupAlertTxn: issues.duplicateAlertTxnIds.length,
    dupAlertCust: issues.duplicateAlertCustomerIds.length,
    ts: issues.timestampIssueAlertIds.length,
  });
  console.log("evidence metrics", metrics);

  const dupTxn = await evaluateSqlChallenge(
    "s3-sql-dup-txn",
    `SELECT txn_id FROM transactions_raw GROUP BY txn_id HAVING COUNT(*) > 1`,
  );
  const badCust = await evaluateSqlChallenge(
    "s3-sql-bad-cust",
    `SELECT t.txn_id FROM transactions_raw t LEFT JOIN customers_raw c ON c.customer_id = t.customer_id WHERE t.customer_id IS NULL OR c.customer_id IS NULL`,
  );
  const dupAlert = await evaluateSqlChallenge(
    "s3-sql-dup-alert",
    `SELECT DISTINCT t.customer_id
     FROM (
       SELECT txn_id FROM fraud_alerts_raw GROUP BY txn_id HAVING COUNT(*) > 1
     ) d
     JOIN transactions_raw t ON t.txn_id = d.txn_id
     WHERE t.customer_id IS NOT NULL`,
  );

  console.log(dupTxn.feedback, dupTxn.passed);
  console.log(badCust.feedback, badCust.passed);
  console.log(dupAlert.feedback, dupAlert.passed);

  if (!dupTxn.passed || !badCust.passed || !dupAlert.passed) {
    throw new Error("Stage 3 reference SQL failed");
  }
  if (metrics.duplicateTxnIds !== 12 || metrics.invalidCustomerTxns !== 35) {
    throw new Error("Unexpected planted quality counts");
  }
  console.log("stage 3–4 fixtures passed");
}

void main();
