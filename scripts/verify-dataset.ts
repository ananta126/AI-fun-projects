import {
  generateChallengeDataset,
  getInvestigationStats,
  getMissingAlertTransactions,
  shouldGenerateAlert,
} from "../lib/challenge-data";
import { getImpactMetrics, getMissingSourceAlerts, getQualityIssues } from "../lib/messy-data";

const data = generateChallengeDataset(1262026);
const stats = getInvestigationStats(data);
const missing = getMissingAlertTransactions(data);
const suspiciousByChannel: Record<string, number> = {};
for (const t of data.transactions) {
  if (!shouldGenerateAlert(t)) continue;
  suspiciousByChannel[t.channel] = (suspiciousByChannel[t.channel] ?? 0) + 1;
}

const lowest = [...stats.byMonth].sort((a, b) => a.alertsPerThousand - b.alertsPerThousand)[0];
const topChannel = Object.entries(suspiciousByChannel).sort((a, b) => b[1] - a[1])[0];

console.log("customers", data.customers.length);
console.log("transactions", data.transactions.length);
console.log("fraud_alerts", data.fraud_alerts.length);
console.log("missing alerts", missing.length);
console.log("monthly", stats.byMonth);
console.log("lowest alerts/1000", lowest);
console.log("suspicious by channel", suspiciousByChannel);
console.log("top suspicious channel", topChannel);

const julyCryptoTx = data.transactions.filter(
  (t) => t.txn_ts.startsWith("2026-07") && t.category === "CRYPTO" && shouldGenerateAlert(t),
).length;
const julyCryptoAlerts = data.fraud_alerts.filter((a) => {
  const t = data.transactions.find((x) => x.txn_id === a.txn_id);
  return t?.txn_ts.startsWith("2026-07") && t.category === "CRYPTO";
}).length;
console.log("july crypto should-alert", julyCryptoTx, "alerts", julyCryptoAlerts);

const missingSource = getMissingSourceAlerts();
const issues = getQualityIssues();
const impact = getImpactMetrics();
console.log("missing source alerts", missingSource.length, issues.missingSourceAlertIds);
console.log("impact", impact);
if (missingSource.length !== 14) {
  throw new Error(`Expected 14 source-only alerts, got ${missingSource.length}`);
}
if (impact.affectedChannel !== "UPI") {
  throw new Error("Missing alerts must concentrate in UPI");
}

if (lowest?.month !== "July 2026") {
  throw new Error(`Expected July 2026 as largest discrepancy, got ${lowest?.month}`);
}
if (impact.dashboardDeclinePct < 20 || impact.dashboardDeclinePct > 35) {
  throw new Error(`Expected ~26% dashboard decline, got ${impact.dashboardDeclinePct}%`);
}
if (julyCryptoAlerts === 0) {
  throw new Error("July CRYPTO should not be fully missing after the leak was softened");
}
if (topChannel?.[0] !== "UPI") {
  throw new Error(`Expected UPI as top suspicious channel, got ${topChannel?.[0]}`);
}
if (data.customers.length !== 500 || data.transactions.length !== 5000) {
  throw new Error("Unexpected table sizes");
}
if (data.fraud_alerts.length < 400 || data.fraud_alerts.length > 900) {
  throw new Error(`Alert count out of range: ${data.fraud_alerts.length}`);
}
console.log("dataset checks passed");
