export const SQL_STARTERS: Record<string, string> = {
  "s2-sql-1": `-- Find settled transactions that should have an alert
-- but do not appear in fraud_alerts.
-- Rules: amount_inr >= 250000
--   OR (channel = 'WIRE' AND amount_inr >= 75000)
--   OR (category = 'CRYPTO' AND amount_inr >= 50000)
--   OR (is_international = 1 AND amount_inr >= 100000)

SELECT t.txn_id
FROM transactions t
WHERE 1 = 0;
`,
  "s3-sql-dup-txn": `-- tables: transactions_raw
-- Find txn_id values that appear more than once.

SELECT txn_id
FROM transactions_raw
WHERE 1 = 0;
`,
  "s3-sql-bad-cust": `-- NULL customer_id, or customer_id not in customers_raw

SELECT t.txn_id
FROM transactions_raw t
WHERE 1 = 0;
`,
  "s3-sql-dup-alert": `-- More than one fraud_alerts_raw row for the same txn_id
-- Return customer_id

SELECT t.customer_id
FROM fraud_alerts_raw a
JOIN transactions_raw t ON t.txn_id = a.txn_id
WHERE 1 = 0;
`,
};
