import { evaluateSqlChallenge } from "../lib/evaluation";
import { getEvidenceMetrics, getImpactMetrics, getQualityIssues } from "../lib/messy-data";

async function main() {
  const issues = getQualityIssues();
  const metrics = getEvidenceMetrics();
  const impact = getImpactMetrics();
  console.log("quality issues", {
    dupTxn: issues.duplicateTxnIds.length,
    badCust: issues.invalidCustomerTxnIds.length,
    missing: issues.missingSourceAlertIds.length,
    dupAlertCust: issues.duplicateAlertCustomerIds.length,
  });
  console.log("evidence metrics", metrics);
  console.log("impact", impact);

  const missing = await evaluateSqlChallenge(
    "s2-sql-1",
    `SELECT r.alert_id FROM fraud_alerts_raw r
     WHERE NOT EXISTS (SELECT 1 FROM fraud_alerts w WHERE w.alert_id = r.alert_id)`,
  );
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
     JOIN transactions t ON t.txn_id = d.txn_id
     WHERE t.customer_id IS NOT NULL`,
  );

  console.log(missing.feedback, missing.passed);
  console.log(dupTxn.feedback, dupTxn.passed);
  console.log(badCust.feedback, badCust.passed);
  console.log(dupAlert.feedback, dupAlert.passed);

  if (!missing.passed || !dupTxn.passed || !badCust.passed || !dupAlert.passed) {
    throw new Error("Investigation SQL fixtures failed");
  }
  if (issues.missingSourceAlertIds.length !== 14) {
    throw new Error(`Expected 14 missing source alerts, got ${issues.missingSourceAlertIds.length}`);
  }
  if (metrics.duplicateTxnIds !== 12 || metrics.invalidCustomerTxns !== 35) {
    throw new Error("Unexpected planted quality counts");
  }
  if (impact.affectedChannel !== "UPI" || impact.missingAlerts !== 14) {
    throw new Error("Impact gold is inconsistent");
  }
  console.log("investigation fixtures passed");
}

void main();
