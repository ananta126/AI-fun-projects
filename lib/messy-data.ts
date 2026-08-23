import {
  getChallengeDataset,
  getInvestigationStats,
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
  missingSourceAlertIds: string[];
  missingSourceTxnIds: string[];
};

export type PipelineLog = {
  job_id: string;
  job_name: string;
  layer: string;
  status: "SUCCESS";
  rows_read: number;
  rows_written: number;
  started_at: string;
  finished_at: string;
  message: string;
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

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

function buildMessyDataset(): { dataset: ChallengeDataset; issues: QualityIssues } {
  const clean = getChallengeDataset();
  const customers = clean.customers.map((c) => ({ ...c }));
  const transactions: Transaction[] = clean.transactions.map((t) => ({ ...t }));
  const fraud_alerts: FraudAlert[] = clean.fraud_alerts.map((a) => ({ ...a }));
  const validCustomers = new Set(customers.map((c) => c.customer_id));
  const txnById = new Map(clean.transactions.map((t) => [t.txn_id, t]));

  const duplicateTxnIds: string[] = [];
  for (let i = 0; i < 12; i++) {
    const source = transactions[80 + i]!;
    duplicateTxnIds.push(source.txn_id);
    transactions.push({
      ...source,
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

  const julyUpiAlerts = clean.fraud_alerts.filter((a) => {
    const txn = txnById.get(a.txn_id);
    return txn?.channel === "UPI" && txn.txn_ts.startsWith("2026-07");
  });
  const anyUpiAlerts = clean.fraud_alerts.filter((a) => txnById.get(a.txn_id)?.channel === "UPI");
  const sourcePool = julyUpiAlerts.length >= 14 ? julyUpiAlerts : anyUpiAlerts;
  const picked = sourcePool.slice(0, 14);

  const missingSourceAlerts: FraudAlert[] = picked.map((source, i) => ({
    ...source,
    alert_id: `ALM${pad(i + 1, 6)}`,
    status: "OPEN",
  }));
  fraud_alerts.push(...missingSourceAlerts);

  const duplicateAlertTxnIds = [...new Set(missingSourceAlerts.map((a) => a.txn_id))];
  const duplicateAlertCustomerIds = new Set<string>();
  for (const txnId of duplicateAlertTxnIds) {
    const txn = txnById.get(txnId);
    if (txn?.customer_id && validCustomers.has(txn.customer_id)) {
      duplicateAlertCustomerIds.add(txn.customer_id);
    }
  }

  const timestampIssueAlertIds: string[] = [];
  for (let i = 0; i < 9; i++) {
    const alert = fraud_alerts[30 + i]!;
    if (!alert.alert_id.startsWith("ALM")) {
      alert.alert_ts = "2025-12-01T00:00:00+00:00";
      timestampIssueAlertIds.push(alert.alert_id);
    }
  }

  const invalidCustomerTxnIds = [...new Set([...nullIds, ...ghostIds])];

  return {
    dataset: { customers, transactions, fraud_alerts },
    issues: {
      duplicateTxnIds: [...new Set(duplicateTxnIds)].sort(),
      invalidCustomerTxnIds: invalidCustomerTxnIds.sort(),
      duplicateAlertTxnIds: duplicateAlertTxnIds.sort(),
      duplicateAlertCustomerIds: [...duplicateAlertCustomerIds].sort(),
      timestampIssueAlertIds: [...new Set(timestampIssueAlertIds)].sort(),
      missingSourceAlertIds: missingSourceAlerts.map((a) => a.alert_id).sort(),
      missingSourceTxnIds: [...new Set(missingSourceAlerts.map((a) => a.txn_id))].sort(),
    },
  };
}

export function getPipelineLogs(): PipelineLog[] {
  const clean = getChallengeDataset();
  const messy = getMessyDataset();
  return [
    {
      job_id: "JB-4412",
      job_name: "july_close_customers",
      layer: "warehouse_load",
      status: "SUCCESS",
      rows_read: messy.customers.length,
      rows_written: clean.customers.length,
      started_at: "2026-08-01T02:04:11+00:00",
      finished_at: "2026-08-01T02:06:40+00:00",
      message: "Load completed successfully.",
    },
    {
      job_id: "JB-4413",
      job_name: "july_close_transactions",
      layer: "warehouse_load",
      status: "SUCCESS",
      rows_read: messy.transactions.length,
      rows_written: clean.transactions.length,
      started_at: "2026-08-01T02:06:41+00:00",
      finished_at: "2026-08-01T02:11:18+00:00",
      message: "Load completed successfully.",
    },
    {
      job_id: "JB-4414",
      job_name: "july_close_fraud_alerts",
      layer: "warehouse_load",
      status: "SUCCESS",
      rows_read: messy.fraud_alerts.length,
      rows_written: clean.fraud_alerts.length,
      started_at: "2026-08-01T02:11:19+00:00",
      finished_at: "2026-08-01T02:13:02+00:00",
      message: "Load completed successfully. Source checksum accepted.",
    },
  ];
}

export function getMissingSourceAlerts(): FraudAlert[] {
  const messy = getMessyDataset();
  const issues = getQualityIssues();
  const ids = new Set(issues.missingSourceAlertIds);
  return messy.fraud_alerts.filter((a) => ids.has(a.alert_id));
}

export function getMissingAlertsByChannel(): Array<{
  channel: string;
  expectedAlerts: number;
  warehouseAlerts: number;
  missing: number;
}> {
  const clean = getChallengeDataset();
  const messy = getMessyDataset();
  const txnById = new Map(clean.transactions.map((t) => [t.txn_id, t]));
  const warehouseIds = new Set(clean.fraud_alerts.map((a) => a.alert_id));

  const channels = new Map<string, { expectedAlerts: number; warehouseAlerts: number; missing: number }>();
  const bump = (channel: string) => {
    if (!channels.has(channel)) {
      channels.set(channel, { expectedAlerts: 0, warehouseAlerts: 0, missing: 0 });
    }
    return channels.get(channel)!;
  };

  for (const alert of messy.fraud_alerts) {
    const channel = txnById.get(alert.txn_id)?.channel ?? "UNKNOWN";
    const row = bump(channel);
    row.expectedAlerts += 1;
    if (warehouseIds.has(alert.alert_id)) row.warehouseAlerts += 1;
    else row.missing += 1;
  }

  return [...channels.entries()]
    .map(([channel, row]) => ({ channel, ...row }))
    .sort((a, b) => b.expectedAlerts - a.expectedAlerts);
}

export function getImpactMetrics() {
  const clean = getChallengeDataset();
  const issues = getQualityIssues();
  const stats = getInvestigationStats(clean);
  const june = stats.byMonth.find((m) => m.key === "2026-06");
  const july = stats.byMonth.find((m) => m.key === "2026-07");
  const juneAlerts = june?.alerts ?? 0;
  const julyAlerts = july?.alerts ?? 0;
  const dashboardDeclinePct = juneAlerts
    ? Number((((juneAlerts - julyAlerts) / juneAlerts) * 100).toFixed(0))
    : 0;
  const settled = clean.transactions.filter((t) => t.status === "SETTLED");
  const fraudRatePct = settled.length
    ? Number(((clean.fraud_alerts.length / settled.length) * 100).toFixed(1))
    : 0;

  return {
    missingAlerts: issues.missingSourceAlertIds.length,
    affectedTxnCount: issues.missingSourceTxnIds.length,
    juneWarehouseAlerts: juneAlerts,
    julyWarehouseAlerts: julyAlerts,
    dashboardDeclinePct,
    fraudRatePct,
    affectedChannel: "UPI",
    warehouseAlertCount: clean.fraud_alerts.length,
    rawAlertCount: getMessyDataset().fraud_alerts.length,
    settledTransactions: settled.length,
  };
}

export function getEvidenceMetrics() {
  const clean = getChallengeDataset();
  const messy = getMessyDataset();
  const issues = getQualityIssues();
  const settled = clean.transactions.filter((t) => t.status === "SETTLED");
  const suspicious = clean.transactions.filter(shouldGenerateAlert);
  const missingRules = getMissingAlertTransactions(clean);
  const fraudRatePct = settled.length
    ? Number(((clean.fraud_alerts.length / settled.length) * 100).toFixed(1))
    : 0;
  const impact = getImpactMetrics();

  return {
    totalTransactions: clean.transactions.length,
    settledTransactions: settled.length,
    suspiciousTransactions: suspicious.length,
    alertCount: clean.fraud_alerts.length,
    fraudRatePct,
    missingAlerts: impact.missingAlerts,
    ruleLeakMissing: missingRules.length,
    duplicateTxnIds: issues.duplicateTxnIds.length,
    duplicateAlertTxnIds: issues.duplicateAlertTxnIds.length,
    invalidCustomerTxns: issues.invalidCustomerTxnIds.length,
    messyTransactionRows: messy.transactions.length,
    messyAlertRows: messy.fraud_alerts.length,
    dashboardDeclinePct: impact.dashboardDeclinePct,
    affectedChannel: impact.affectedChannel,
    affectedTxnCount: impact.affectedTxnCount,
  };
}
