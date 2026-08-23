import type { ChallengeDataset, Customer, FraudAlert, Transaction } from "@/types";

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
];

const FIRST = [
  "Aarav",
  "Diya",
  "Ishaan",
  "Meera",
  "Kabir",
  "Ananya",
  "Rohan",
  "Sana",
  "Vikram",
  "Nisha",
  "Arjun",
  "Pooja",
  "Dev",
  "Kavya",
  "Nikhil",
];

const LAST = [
  "Sharma",
  "Iyer",
  "Patel",
  "Khan",
  "Reddy",
  "Gupta",
  "Nair",
  "Das",
  "Singh",
  "Joshi",
  "Banerjee",
  "Mehta",
];

const CHANNELS = ["UPI", "NEFT", "IMPS", "CARD", "WIRE", "ATM"] as const;
const CATEGORIES = [
  "SALARY",
  "VENDOR_PAY",
  "RETAIL",
  "TRAVEL",
  "CRYPTO",
  "CASH_WITHDRAWAL",
  "BILL_PAY",
  "WALLET_TOPUP",
] as const;

export const MONTHS = [
  { key: "2026-01", label: "January 2026" },
  { key: "2026-02", label: "February 2026" },
  { key: "2026-03", label: "March 2026" },
  { key: "2026-04", label: "April 2026" },
  { key: "2026-05", label: "May 2026" },
  { key: "2026-06", label: "June 2026" },
  { key: "2026-07", label: "July 2026" },
] as const;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

export function shouldGenerateAlert(txn: Transaction): boolean {
  if (txn.status !== "SETTLED") return false;
  if (txn.amount_inr >= 250_000) return true;
  if (txn.channel === "WIRE" && txn.amount_inr >= 75_000) return true;
  if (txn.category === "CRYPTO" && txn.amount_inr >= 50_000) return true;
  if (txn.is_international === 1 && txn.amount_inr >= 100_000) return true;
  return false;
}

function isLeakedJulyAlert(txn: Transaction): boolean {
  const month = txn.txn_ts.slice(0, 7);
  if (month !== "2026-07") return false;
  const n = Number(txn.txn_id.replace(/\D/g, ""));
  if (txn.category === "CRYPTO" && n % 8 > 2) return true;
  if (n % 17 === 0) return true;
  return false;
}

let cached: ChallengeDataset | null = null;

export function getChallengeDataset(): ChallengeDataset {
  if (cached) return cached;
  cached = generateChallengeDataset(1262026);
  return cached;
}

export function generateChallengeDataset(seed = 1262026): ChallengeDataset {
  const rng = mulberry32(seed);
  const customers: Customer[] = [];

  for (let i = 1; i <= 500; i++) {
    customers.push({
      customer_id: `C${pad(i, 5)}`,
      full_name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      city: pick(rng, CITIES),
      kyc_status: rng() < 0.88 ? "VERIFIED" : rng() < 0.6 ? "PENDING" : "EXPIRED",
      risk_segment: rng() < 0.7 ? "LOW" : rng() < 0.7 ? "MEDIUM" : "HIGH",
      account_opened_on: `202${Math.floor(rng() * 4)}-${pad(1 + Math.floor(rng() * 12), 2)}-${pad(1 + Math.floor(rng() * 28), 2)}`,
    });
  }

  const monthWeights = [0.13, 0.13, 0.14, 0.14, 0.15, 0.155, 0.155];
  const transactions: Transaction[] = [];
  const targetCount = 5000;

  for (let i = 1; i <= targetCount; i++) {
    const monthIndex = weightedIndex(rng, monthWeights);
    const month = MONTHS[monthIndex]!;
    const day = 1 + Math.floor(rng() * 28);
    const hour = 8 + Math.floor(rng() * 12);
    const minute = Math.floor(rng() * 60);

    let channel: (typeof CHANNELS)[number] = pick(rng, CHANNELS);
    let category: (typeof CATEGORIES)[number] = pick(rng, CATEGORIES);

    const roll = rng();
    if (roll < 0.32) channel = "UPI";
    else if (roll < 0.52) channel = "CARD";
    else if (roll < 0.66) channel = "IMPS";
    else if (roll < 0.8) channel = "NEFT";
    else if (roll < 0.88) channel = "WIRE";
    else channel = "ATM";

    if (month.key === "2026-07" && rng() < 0.09) {
      category = "CRYPTO";
      channel = rng() < 0.55 ? "UPI" : "WIRE";
    } else if (rng() < 0.045) {
      category = "CRYPTO";
    } else if (rng() < 0.12) {
      category = "SALARY";
      channel = rng() < 0.7 ? "NEFT" : "IMPS";
    }

    let amount = 800 + Math.round(rng() * 18_000);
    if (channel === "CARD" && rng() < 0.07) {
      amount = 250_000 + Math.round(rng() * 420_000);
    } else if (channel === "WIRE" && rng() < 0.18) {
      amount = 80_000 + Math.round(rng() * 180_000);
    } else if (category === "CRYPTO") {
      amount = rng() < 0.7 ? 52_000 + Math.round(rng() * 90_000) : 8_000 + Math.round(rng() * 30_000);
    } else if (rng() < 0.015) {
      amount = 260_000 + Math.round(rng() * 900_000);
    }

    const isInternational =
      channel === "WIRE" && rng() < 0.45 ? 1 : rng() < 0.03 ? 1 : 0;
    if (isInternational && rng() < 0.35) {
      amount = Math.max(amount, 110_000 + Math.round(rng() * 200_000));
    }

    const status: Transaction["status"] =
      rng() < 0.94 ? "SETTLED" : rng() < 0.5 ? "PENDING" : "REVERSED";

    transactions.push({
      txn_id: `TXN${pad(i, 6)}`,
      customer_id: pick(rng, customers).customer_id,
      amount_inr: amount,
      channel,
      category,
      txn_ts: `${month.key}-${pad(day, 2)}T${pad(hour, 2)}:${pad(minute, 2)}:00+05:30`,
      status,
      is_international: isInternational,
    });
  }

  const fraud_alerts: FraudAlert[] = [];
  let alertN = 1;

  for (const txn of transactions) {
    if (!shouldGenerateAlert(txn)) continue;
    const month = txn.txn_ts.slice(0, 7);
    const noiseSkip = month !== "2026-07" && rng() < 0.03;
    const ts = new Date(txn.txn_ts);
    ts.setMinutes(ts.getMinutes() + 4 + Math.floor(rng() * 90));
    const status: FraudAlert["status"] = rng() < 0.55 ? "OPEN" : rng() < 0.5 ? "CLEARED" : "ESCALATED";
    if (noiseSkip || isLeakedJulyAlert(txn)) continue;

    fraud_alerts.push({
      alert_id: `AL${pad(alertN++, 6)}`,
      txn_id: txn.txn_id,
      alert_ts: ts.toISOString().replace("Z", "+00:00"),
      rule_code: ruleCodeFor(txn),
      severity:
        txn.amount_inr >= 500_000
          ? "CRITICAL"
          : txn.amount_inr >= 250_000
            ? "HIGH"
            : txn.category === "CRYPTO"
              ? "MEDIUM"
              : "HIGH",
      status,
    });
  }

  return { customers, transactions, fraud_alerts };
}

function ruleCodeFor(txn: Transaction): string {
  if (txn.amount_inr >= 250_000) return "HV_AMT_250K";
  if (txn.channel === "WIRE" && txn.amount_inr >= 75_000) return "WIRE_75K";
  if (txn.category === "CRYPTO" && txn.amount_inr >= 50_000) return "CRYPTO_50K";
  return "INTL_100K";
}

function weightedIndex(rng: () => number, weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function getMissingAlertTransactions(dataset: ChallengeDataset): Transaction[] {
  return dataset.transactions.filter((txn) => {
    if (!shouldGenerateAlert(txn)) return false;
    return !dataset.fraud_alerts.some((a) => a.txn_id === txn.txn_id);
  });
}

export function getInvestigationStats(dataset: ChallengeDataset) {
  const byMonth = MONTHS.map((m) => {
    const txns = dataset.transactions.filter(
      (t) => t.txn_ts.startsWith(m.key) && t.status === "SETTLED",
    );
    const alerts = dataset.fraud_alerts.filter((a) => {
      const txn = dataset.transactions.find((t) => t.txn_id === a.txn_id);
      return txn?.txn_ts.startsWith(m.key);
    });
    const rate = txns.length ? (alerts.length / txns.length) * 1000 : 0;
    return {
      month: m.label,
      key: m.key,
      transactions: txns.length,
      alerts: alerts.length,
      alertsPerThousand: Number(rate.toFixed(2)),
    };
  });

  const suspicious = dataset.transactions.filter(shouldGenerateAlert);
  const byChannel: Record<string, number> = {};
  for (const t of suspicious) {
    byChannel[t.channel] = (byChannel[t.channel] ?? 0) + 1;
  }

  return { byMonth, byChannel, missingAlerts: getMissingAlertTransactions(dataset).length };
}
