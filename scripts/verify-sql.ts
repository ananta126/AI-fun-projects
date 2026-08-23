import { evaluateSqlChallenge } from "../lib/evaluation";
import { runChallengeQuery } from "../lib/sql-engine";
import { assertReadOnlySql } from "../lib/sql-safety";

const missingSource = `
SELECT r.alert_id
FROM fraud_alerts_raw r
LEFT JOIN fraud_alerts w ON w.alert_id = r.alert_id
WHERE w.alert_id IS NULL
`;

const byChannel = `
SELECT t.channel, COUNT(*) AS missing
FROM fraud_alerts_raw r
LEFT JOIN fraud_alerts w ON w.alert_id = r.alert_id
JOIN transactions t ON t.txn_id = r.txn_id
WHERE w.alert_id IS NULL
GROUP BY t.channel
`;

async function main() {
  const explore = await runChallengeQuery(`
-- monthly volume
SELECT substr(txn_ts, 1, 7) AS month, COUNT(*) AS txn_count
FROM transactions
GROUP BY month
ORDER BY month;
`);
  if (!explore.rowCount) throw new Error("Explore query should return monthly rows");
  console.log("explore rows", explore.rowCount);

  const commented = `
-- source vs warehouse
SELECT r.alert_id
FROM fraud_alerts_raw r
LEFT JOIN fraud_alerts w ON w.alert_id = r.alert_id
WHERE w.alert_id IS NULL;
`;
  assertReadOnlySql(commented);
  const commentedRun = await evaluateSqlChallenge("s2-sql-1", commented);
  if (!commentedRun.passed) throw new Error("Commented SQL with trailing semicolon should run");

  try {
    assertReadOnlySql("DROP TABLE transactions");
    throw new Error("safety failed");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("read-only")) {
      throw error;
    }
  }

  const missing = await evaluateSqlChallenge("s2-sql-1", missingSource);
  console.log(missing.feedback, missing.passed, missing.matched, missing.expected);
  if (!missing.passed) throw new Error("Expected the source-vs-warehouse anti-join to pass");

  const exceptSql = await evaluateSqlChallenge(
    "s2-sql-1",
    `SELECT alert_id FROM fraud_alerts_raw
     EXCEPT
     SELECT alert_id FROM fraud_alerts`,
  );
  if (!exceptSql.passed) throw new Error("EXCEPT equivalent should pass");

  const channel = await evaluateSqlChallenge("s4-sql-channel", byChannel);
  console.log(channel.feedback, channel.passed);
  if (!channel.passed) throw new Error("Expected channel concentration SQL to pass");

  console.log("sql evaluation passed");
}

void main();
