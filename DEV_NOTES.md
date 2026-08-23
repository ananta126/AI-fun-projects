# Developer notes — planted investigation (do not share with playtesters)

Seed: `1262026` in `lib/challenge-data.ts`.

This file is for builders only. The product UI must never link here.

## Warehouse vs source

| Table | Approx. size | Notes |
| --- | ---: | --- |
| customers | 500 | Clean |
| transactions | 5,000 | Clean |
| fraud_alerts | ~681 | July CRYPTO leak (~26% alert drop vs June) |
| customers_raw | 500 | Same as warehouse |
| transactions_raw | 5,012 | +12 duplicate `txn_id` rows; 20 NULL `customer_id`; 15 `C99999` |
| fraud_alerts_raw | warehouse + 14 | **14 UPI-only extras** (`ALM000001`–`ALM000014`) |
| pipeline_logs | 3 jobs | All `SUCCESS`. `rows_read` vs `rows_written` silently disagree |

## Investigation 01 — July divergence

Monthly warehouse shape (settled txns vs alerts) makes **July 2026** the first meaningful break: volume holds, alert count drops.

The dashboard's "fraud is down ~26%" is `(June alerts − July alerts) / June alerts`.

Do not highlight July in the UI.

Expected answers:

1. July 2026
2. July alert count dropped while transaction volume stayed roughly comparable

## Investigation 02 — fourteen missing alerts

The 14 `ALM*` rows exist in `fraud_alerts_raw` and not in `fraud_alerts`.

They are cloned from **July UPI** warehouse alerts (new `alert_id`, same `txn_id`). All fourteen are UPI. That fact is **not** given to the learner in I02.

Reference SQL (any equivalent anti-join is valid):

```sql
SELECT r.alert_id
FROM fraud_alerts_raw r
LEFT JOIN fraud_alerts w ON w.alert_id = r.alert_id
WHERE w.alert_id IS NULL;
```

Expected: the 14 `ALM*` ids.

## Investigation 03 — pipeline "clean"

Planted defects in raw only:

- **12** duplicate `txn_id` values
- **35** invalid-customer txns (20 NULL + 15 ghost `C99999`)
- Extra source alerts share `txn_id` with an existing warehouse alert → customers with more than one raw alert row for the same transaction
- **9** warehouse-copied alerts with `alert_ts = 2025-12-01`

Arjun's logs show SUCCESS. `july_close_fraud_alerts` reads 644 and writes 630.

## Investigation 04 — concentration

Missing source-only alerts by channel: **UPI = 14, every other channel = 0**.

Do not put "UPI" in the mission copy.

Impact gold (from `getImpactMetrics()`):

- missing alerts = 14
- affected transaction count = unique `txn_id` of those 14
- fraud rate % = `100 * warehouse_alerts / settled` (1 decimal)
- dashboard decline % = rounded June→July alert drop
- affected channel = UPI

## Final review

Root cause the learner should argue:

The dashboard did not show a decline in fraud. It showed a decline in what the pipeline could see. Fourteen source UPI alerts never landed in the warehouse; July warehouse alert volume also diverged from transaction volume. Duplicates and invalid customer IDs mean a "successful" load is not a correct load.

## Rewards

25 + 35 + 30 + 30 + 30 = 150. Entry simulated at 200. Reward events are append-only (`rewardHistory`).
