import fs from "fs";
import path from "path";
import initSqlJs, { type Database, type SqlValue } from "sql.js";
import { getChallengeDataset } from "@/lib/challenge-data";
import { getMessyDataset } from "@/lib/messy-data";
import { assertReadOnlySql, toSqliteDialect } from "@/lib/sql-safety";
import type { QueryResult } from "@/lib/sql-types";

const ROW_LIMIT = 500;
const QUERY_TIMEOUT_MS = 2500;

let dbPromise: Promise<Database> | null = null;

async function loadSqlJs() {
  const wasmPath = path.join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm");
  const wasmBinary = new Uint8Array(fs.readFileSync(wasmPath)).buffer;
  return initSqlJs({ wasmBinary });
}

export async function getChallengeDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await loadSqlJs();
      const db = new SQL.Database();
      seedDb(db);
      return db;
    })();
  }
  return dbPromise;
}

function seedDb(db: Database) {
  const data = getChallengeDataset();
  db.run(`
    CREATE TABLE customers (
      customer_id TEXT PRIMARY KEY,
      full_name TEXT,
      city TEXT,
      kyc_status TEXT,
      risk_segment TEXT,
      account_opened_on TEXT
    );
    CREATE TABLE transactions (
      txn_id TEXT PRIMARY KEY,
      customer_id TEXT,
      amount_inr INTEGER,
      channel TEXT,
      category TEXT,
      txn_ts TEXT,
      status TEXT,
      is_international INTEGER
    );
    CREATE TABLE fraud_alerts (
      alert_id TEXT PRIMARY KEY,
      txn_id TEXT,
      alert_ts TEXT,
      rule_code TEXT,
      severity TEXT,
      status TEXT
    );
  `);

  const insertMany = (sql: string, rows: SqlValue[][]) => {
    const stmt = db.prepare(sql);
    db.run("BEGIN");
    for (const row of rows) {
      stmt.run(row);
    }
    db.run("COMMIT");
    stmt.free();
  };

  insertMany(
    "INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?)",
    data.customers.map((c) => [
      c.customer_id,
      c.full_name,
      c.city,
      c.kyc_status,
      c.risk_segment,
      c.account_opened_on,
    ]),
  );

  insertMany(
    "INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    data.transactions.map((t) => [
      t.txn_id,
      t.customer_id,
      t.amount_inr,
      t.channel,
      t.category,
      t.txn_ts,
      t.status,
      t.is_international,
    ]),
  );

  insertMany(
    "INSERT INTO fraud_alerts VALUES (?, ?, ?, ?, ?, ?)",
    data.fraud_alerts.map((a) => [
      a.alert_id,
      a.txn_id,
      a.alert_ts,
      a.rule_code,
      a.severity,
      a.status,
    ]),
  );

  const messy = getMessyDataset();
  db.run(`
    CREATE TABLE customers_raw (
      customer_id TEXT,
      full_name TEXT,
      city TEXT,
      kyc_status TEXT,
      risk_segment TEXT,
      account_opened_on TEXT
    );
    CREATE TABLE transactions_raw (
      txn_id TEXT,
      customer_id TEXT,
      amount_inr INTEGER,
      channel TEXT,
      category TEXT,
      txn_ts TEXT,
      status TEXT,
      is_international INTEGER
    );
    CREATE TABLE fraud_alerts_raw (
      alert_id TEXT,
      txn_id TEXT,
      alert_ts TEXT,
      rule_code TEXT,
      severity TEXT,
      status TEXT
    );
  `);

  insertMany(
    "INSERT INTO customers_raw VALUES (?, ?, ?, ?, ?, ?)",
    messy.customers.map((c) => [
      c.customer_id,
      c.full_name,
      c.city,
      c.kyc_status,
      c.risk_segment,
      c.account_opened_on,
    ]),
  );

  insertMany(
    "INSERT INTO transactions_raw VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    messy.transactions.map((t) => [
      t.txn_id,
      t.customer_id,
      t.amount_inr,
      t.channel,
      t.category,
      t.txn_ts,
      t.status,
      t.is_international,
    ]),
  );

  insertMany(
    "INSERT INTO fraud_alerts_raw VALUES (?, ?, ?, ?, ?, ?)",
    messy.fraud_alerts.map((a) => [
      a.alert_id,
      a.txn_id,
      a.alert_ts,
      a.rule_code,
      a.severity,
      a.status,
    ]),
  );
}

export type { QueryResult } from "@/lib/sql-types";

export async function runChallengeQuery(sql: string): Promise<QueryResult> {
  assertReadOnlySql(sql);
  const db = await getChallengeDb();
  const rewritten = toSqliteDialect(sql);
  const started = Date.now();
  let result;
  try {
    result = db.exec(rewritten);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed.";
    throw new Error(message);
  }
  if (Date.now() - started > QUERY_TIMEOUT_MS) {
    throw new Error("Query exceeded the time limit.");
  }
  if (!result.length) {
    return { columns: [], rows: [], rowCount: 0, truncated: false };
  }
  const table = result[0]!;
  const truncated = table.values.length > ROW_LIMIT;
  const values = table.values.slice(0, ROW_LIMIT);
  const rows = values.map((valueRow) => {
    const obj: Record<string, unknown> = {};
    table.columns.forEach((col, i) => {
      obj[col] = valueRow[i];
    });
    return obj;
  });
  return {
    columns: table.columns,
    rows,
    rowCount: table.values.length,
    truncated,
  };
}

export function resetChallengeDbCache() {
  dbPromise = null;
}
