# Developer notes — planted investigation (do not share with playtesters)

Seed: `1262026` in `lib/challenge-data.ts`.

## Published fraud rules (also shown in Stage 2)

A **settled** transaction should raise an alert if any of:

- `amount_inr >= 250000`
- `channel = 'WIRE' AND amount_inr >= 75000`
- `category = 'CRYPTO' AND amount_inr >= 50000`
- `is_international = 1 AND amount_inr >= 100000`

## The leak

In **July 2026** the pipeline dropped alerts for:

- all CRYPTO transactions that should have alerted
- WIRE transactions under ₹2,50,000 that still met the WIRE ₹75k rule

Other months drop ~3% of expected alerts at random (noise).

## Stage 1 answers

1. **July 2026** — lowest alerts per 1,000 settled transactions (volume stays comparable to June).
2. **UPI** — highest count of rule-matching (suspicious) transactions. July CRYPTO often rides UPI, so the "safe" channel is the hottest by count.
3. **CRYPTO** — July activity is present; July alerts for CRYPTO collapse because of the leak.

## Stage 2 expected result

All settled transactions matching the rules with **no** `fraud_alerts.txn_id`.

Example shape:

```sql
SELECT t.txn_id
FROM transactions t
LEFT JOIN fraud_alerts f ON f.txn_id = t.txn_id
WHERE t.status = 'SETTLED'
  AND (
    t.amount_inr >= 250000
    OR (t.channel = 'WIRE' AND t.amount_inr >= 75000)
    OR (t.category = 'CRYPTO' AND t.amount_inr >= 50000)
    OR (t.is_international = 1 AND t.amount_inr >= 100000)
  )
  AND f.txn_id IS NULL;
```

## Stage 3+ mess (not generated in this slice)

Planned later: duplicate `txn_id`, NULL / inconsistent `customer_id`, duplicate alerts, timestamp mismatches.

## Reward math

25 + 35 + 30 + 30 + 30 = 150. This slice stops at ₹60.
