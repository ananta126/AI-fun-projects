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

July settled volume stays comparable to June (766 vs 683) while alerts collapse (27 vs 105).

## Stage 1 answers

1. **July 2026** — lowest alerts per 1,000 settled transactions.
2. **UPI** — highest count of rule-matching (suspicious) transactions (212). July CRYPTO often rides UPI.
3. **CRYPTO** — July activity is present; July CRYPTO alerts are 0 because of the leak.

## Stage 2 expected result

All settled transactions matching the rules with **no** `fraud_alerts.txn_id`. Count: **147**.

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

## Stage 3 planted defects (`*_raw`)

- **12** duplicate `txn_id` values (extra clone rows in `transactions_raw`)
- **20** NULL `customer_id`
- **15** ghost `customer_id = C99999` (not in `customers_raw`) → **35** invalid-customer txns
- **14** cloned fraud alerts (`ALD000001`…) on distinct txn_ids → **14** customers
- **9** alerts with `alert_ts` forced to 2025-12-01 (before the July 2026 book)

Raw row counts: transactions_raw 5012, fraud_alerts_raw 644.

## Stage 4 gold numbers (clean warehouse unless noted)

| Field | Value |
| --- | --- |
| Total transactions | 5000 |
| Suspicious (rule-matching) | 777 |
| Settled | 4680 |
| `fraud_alerts` rows | 630 |
| Fraud rate % | 13.5  (= 100 × 630 / 4680, 1 decimal) |
| Missing fraud alerts | 147 |
| Duplicate txn_id values in raw | 12 |

Root cause to write: July pipeline leak (CRYPTO + mid-value WIRE), plus raw-file duplicates/nulls that would distort any naïve dashboard.

## Stage 5 rubric

Memo must mention the leak/dashboard miss, evidence (July/CRYPTO/WIRE/duplicates), and a next step (fix pipeline, monitor alert rate / reconciliation).

Viva keywords: duplicates vs counts; LEFT JOIN for unmatched alerts; monitor alert rate / coverage / freshness.

## Reward math

25 + 35 + 30 + 30 + 30 = 150.

Skill score /100 is the sum of per-challenge weights in `lib/skill-score.ts`.
