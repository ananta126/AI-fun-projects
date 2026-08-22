import {
  getChallengeDataset,
  getInvestigationStats,
  MONTHS,
} from "@/lib/challenge-data";
import { getMessyDataset } from "@/lib/messy-data";

export type DatasetOverview = {
  tables: Array<{
    name: string;
    rows: number;
    columns: string[];
    sample: Array<Record<string, unknown> | object>;
  }>;
  monthly: Array<{
    month: string;
    transactions: number;
    alerts: number;
    alertsPerThousand: number;
  }>;
  channels: Array<{ channel: string; transactions: number }>;
  categories: Array<{
    category: string;
    transactions: number;
    julyTransactions: number;
    julyAlerts: number;
  }>;
  months: typeof MONTHS;
};

export function getDatasetOverview(): DatasetOverview {
  const dataset = getChallengeDataset();
  const stats = getInvestigationStats(dataset);
  const messy = getMessyDataset();

  const channels = new Map<string, number>();
  for (const t of dataset.transactions) {
    channels.set(t.channel, (channels.get(t.channel) ?? 0) + 1);
  }

  const categories = new Map<
    string,
    { transactions: number; julyTransactions: number; julyAlerts: number }
  >();
  for (const t of dataset.transactions) {
    const row = categories.get(t.category) ?? {
      transactions: 0,
      julyTransactions: 0,
      julyAlerts: 0,
    };
    row.transactions += 1;
    if (t.txn_ts.startsWith("2026-07")) row.julyTransactions += 1;
    categories.set(t.category, row);
  }
  const txnById = new Map(dataset.transactions.map((t) => [t.txn_id, t]));
  for (const alert of dataset.fraud_alerts) {
    const txn = txnById.get(alert.txn_id);
    if (txn?.txn_ts.startsWith("2026-07")) {
      const row = categories.get(txn.category);
      if (row) row.julyAlerts += 1;
    }
  }

  const txnCols = [
    "txn_id",
    "customer_id",
    "amount_inr",
    "channel",
    "category",
    "txn_ts",
    "status",
    "is_international",
  ];
  const alertCols = ["alert_id", "txn_id", "alert_ts", "rule_code", "severity", "status"];
  const custCols = ["customer_id", "full_name", "city", "kyc_status", "risk_segment", "account_opened_on"];

  return {
    tables: [
      {
        name: "customers",
        rows: dataset.customers.length,
        columns: custCols,
        sample: dataset.customers.slice(0, 8),
      },
      {
        name: "transactions",
        rows: dataset.transactions.length,
        columns: txnCols,
        sample: dataset.transactions.slice(0, 8),
      },
      {
        name: "fraud_alerts",
        rows: dataset.fraud_alerts.length,
        columns: alertCols,
        sample: dataset.fraud_alerts.slice(0, 8),
      },
      {
        name: "customers_raw",
        rows: messy.customers.length,
        columns: custCols,
        sample: messy.customers.slice(0, 8),
      },
      {
        name: "transactions_raw",
        rows: messy.transactions.length,
        columns: txnCols,
        sample: messy.transactions
          .filter((t) => t.customer_id === null)
          .slice(0, 4)
          .concat(messy.transactions.slice(80, 84)),
      },
      {
        name: "fraud_alerts_raw",
        rows: messy.fraud_alerts.length,
        columns: alertCols,
        sample: messy.fraud_alerts.slice(-8),
      },
    ],
    monthly: stats.byMonth,
    channels: [...channels.entries()]
      .map(([channel, transactions]) => ({ channel, transactions }))
      .sort((a, b) => b.transactions - a.transactions),
    categories: [...categories.entries()]
      .map(([category, row]) => ({ category, ...row }))
      .sort((a, b) => b.transactions - a.transactions),
    months: MONTHS,
  };
}
