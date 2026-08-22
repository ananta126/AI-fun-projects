export const SQL_STARTERS: Record<string, string> = {
  "s2-sql-1": `-- Alerts that exist in the source extract
-- but never landed in the warehouse snapshot.
-- PostgreSQL-style anti-join is fine.

SELECT r.alert_id
FROM fraud_alerts_raw r
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
JOIN transactions t ON t.txn_id = a.txn_id
WHERE 1 = 0;
`,
  "s4-sql-channel": `-- Are the source-only alerts spread across channels
-- or concentrated? Join through transactions.

SELECT t.channel, COUNT(*) AS missing
FROM fraud_alerts_raw r
WHERE 1 = 0
GROUP BY t.channel;
`,
};
