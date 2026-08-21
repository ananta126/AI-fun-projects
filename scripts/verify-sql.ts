import { evaluateMissingAlertsSql } from "../lib/evaluation";
import { assertReadOnlySql } from "../lib/sql-safety";

const good = `
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
  AND f.txn_id IS NULL
`;

async function main() {
  try {
    assertReadOnlySql("DROP TABLE transactions");
    throw new Error("safety failed");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("read-only")) {
      throw error;
    }
  }

  const result = await evaluateMissingAlertsSql(good);
  console.log(result.feedback, result.passed, result.matched, result.expected);
  if (!result.passed) {
    throw new Error("Expected the reference SQL to pass");
  }
  console.log("sql evaluation passed");
}

void main();
