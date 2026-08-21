import {
  generateChallengeDataset,
  getInvestigationStats,
  getMissingAlertTransactions,
  shouldGenerateAlert,
} from "../lib/challenge-data";

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

if (lowest?.month !== "July 2026") {
  throw new Error(`Expected July 2026 as largest discrepancy, got ${lowest?.month}`);
}
if (topChannel?.[0] !== "UPI") {
  throw new Error(`Expected UPI as top suspicious channel, got ${topChannel?.[0]}`);
}
if (julyCryptoAlerts !== 0) {
  throw new Error("Expected zero July CRYPTO alerts");
}
if (data.customers.length !== 500 || data.transactions.length !== 5000) {
  throw new Error("Unexpected table sizes");
}
if (data.fraud_alerts.length < 400 || data.fraud_alerts.length > 900) {
  throw new Error(`Alert count out of range: ${data.fraud_alerts.length}`);
}
console.log("dataset checks passed");
