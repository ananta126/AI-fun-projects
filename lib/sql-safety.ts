const FORBIDDEN =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM|REINDEX)\b/i;

const KNOWN_TABLES = [
  "customers",
  "transactions",
  "fraud_alerts",
  "customers_raw",
  "transactions_raw",
  "fraud_alerts_raw",
  "pipeline_logs",
] as const;

export function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeReadOnlySql(sql: string): string {
  const stripped = stripSqlComments(sql);
  if (!stripped) {
    throw new Error("Query is empty.");
  }
  const withoutTrailing = stripped.replace(/;+\s*$/g, "").trim();
  if (withoutTrailing.includes(";")) {
    throw new Error("Multiple statements are not allowed.");
  }
  return withoutTrailing;
}

export function assertReadOnlySql(sql: string): string {
  const normalized = normalizeReadOnlySql(sql);
  if (FORBIDDEN.test(normalized)) {
    throw new Error("Only read-only SELECT queries are allowed.");
  }
  const head = normalized.replace(/^\(/, "").trim().toUpperCase();
  if (!head.startsWith("SELECT") && !head.startsWith("WITH")) {
    throw new Error("Query must start with SELECT or WITH.");
  }
  return normalized;
}

export function assertAllowedTables(sql: string, allowedTables: string[]): void {
  const normalized = normalizeReadOnlySql(sql).toLowerCase();
  const allowed = new Set(allowedTables.map((name) => name.toLowerCase()));
  const blocked = KNOWN_TABLES.filter((name) => {
    if (allowed.has(name)) return false;
    const pattern = new RegExp(`\\b${name}\\b`, "i");
    return pattern.test(normalized);
  });
  if (blocked.length) {
    throw new Error(
      `Access denied: ${blocked.join(", ")} is not in your current warehouse grant.`,
    );
  }
}

export function toSqliteDialect(sql: string): string {
  return sql.replace(/\bILIKE\b/gi, "LIKE");
}

export { KNOWN_TABLES };
