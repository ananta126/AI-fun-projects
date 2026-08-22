import {
  getChallengeDataset,
  getMissingAlertTransactions,
  shouldGenerateAlert,
} from "@/lib/challenge-data";
import type { ChallengeDataset, FraudAlert, Transaction } from "@/types";

export type QualityIssues = {
  duplicateTxnIds: string[];
  invalidCustomerTxnIds: string[];
  duplicateAlertTxnIds: string[];
  duplicateAlertCustomerIds: string[];
  timestampIssueAlertIds: string[];
};

const GHOST_CUSTOMER = "C99999";

let messyCache: ChallengeDataset | null = null;
let issuesCache: QualityIssues | null = null;

export function getMessyDataset(): ChallengeDataset {
  if (messyCache) return messyCache;
  const built = buildMessyDataset();
  messyCache = built.dataset;
  issuesCache = built.issues;
  return messyCache;
}

export function getQualityIssues(): QualityIssues {
  if (!issuesCache) getMessyDataset();
  return issuesCache!;
}

function buildMessyDataset(): { dataset: ChallengeDataset; issues: QualityIssues } {
  const clean = getChallengeDataset();
  const customers = clean.customers.map((c) => ({ ...c }));
  const transactions: Transaction[] = clean.transactions.map((t) => ({ ...t }));
  const fraud_alerts: FraudAlert[] = clean.fraud_alerts.map((a) => ({ ...a }));
  const validCustomers = new Set(customers.map((c) => c.customer_id));

  const duplicateTxnIds: string[] = [];
  for (let i = 0; i < 12; i++) {
    const source = transactions[80 + i]!;
    duplicateTxnIds.push(source.txn_id);
    transactions.push({
      ...source,
      txn_ts: source.txn_ts,
      amount_inr: source.amount_inr + 1,
    });
  }

  const nullIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const row = transactions[200 + i]!;
    row.customer_id = null;
    nullIds.push(row.txn_id);
  }

  const ghostIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const row = transactions[320 + i]!;
    row.customer_id = GHOST_CUSTOMER;
    ghostIds.push(row.txn_id);
  }

  const duplicateAlertTxnIds: string[] = [];
  const duplicateAlertCustomerIds = new Set<string>();
  const blocked = new Set(duplicateTxnIds);
  const safeAlerts = fraud_alerts.filter((a) => !blocked.has(a.txn_id));
  for (let i = 0; i < 14; i++) {
    const source = safeAlerts[i]!;
    duplicateAlertTxnIds.push(source.txn_id);
    fraud_alerts.push({
      ...source,
      alert_id: `ALD${String(i + 1).padStart(6, "0")}`,
      status: "OPEN",
    });
    const txn = transactions.find((t) => t.txn_id === source.txn_id);
    if (txn?.customer_id && validCustomers.has(txn.customer_id)) {
      duplicateAlertCustomerIds.add(txn.customer_id);
    }
  }

  const timestampIssueAlertIds: string[] = [];
  for (let i = 0; i < 9; i++) {
    const alert = fraud_alerts[30 + i]!;
    alert.alert_ts = "2025-12-01T00:00:00+00:00";
    timestampIssueAlertIds.push(alert.alert_id);
  }

  const invalidCustomerTxnIds = [...new Set([...nullIds, ...ghostIds])];

  return {
    dataset: { customers, transactions, fraud_alerts },
    issues: {
      duplicateTxnIds: [...new Set(duplicateTxnIds)].sort(),
      invalidCustomerTxnIds: invalidCustomerTxnIds.sort(),
      duplicateAlertTxnIds: [...new Set(duplicateAlertTxnIds)].sort(),
      duplicateAlertCustomerIds: [...duplicateAlertCustomerIds].sort(),
      timestampIssueAlertIds: [...new Set(timestampIssueAlertIds)].sort(),
    },
  };
}

export function getEvidenceMetrics() {
  const clean = getChallengeDataset();
  const messy = getMessyDataset();
  const issues = getQualityIssues();
  const settled = clean.transactions.filter((t) => t.status === "SETTLED");
  const suspicious = clean.transactions.filter(shouldGenerateAlert);
  const missing = getMissingAlertTransactions(clean);
  const fraudRatePct = settled.length
    ? Number(((clean.fraud_alerts.length / settled.length) * 100).toFixed(1))
    : 0;

  return {
    totalTransactions: clean.transactions.length,
    settledTransactions: settled.length,
    suspiciousTransactions: suspicious.length,
    alertCount: clean.fraud_alerts.length,
    fraudRatePct,
    missingAlerts: missing.length,
    duplicateTxnIds: issues.duplicateTxnIds.length,
    duplicateAlertTxnIds: issues.duplicateAlertTxnIds.length,
    invalidCustomerTxns: issues.invalidCustomerTxnIds.length,
    messyTransactionRows: messy.transactions.length,
    messyAlertRows: messy.fraud_alerts.length,
  };
}
