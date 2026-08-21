const FORBIDDEN =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM|REINDEX)\b/i;

export function assertReadOnlySql(sql: string): void {
  const trimmed = sql.trim();
  if (!trimmed) {
    throw new Error("Query is empty.");
  }
  if (trimmed.includes(";")) {
    throw new Error("Multiple statements are not allowed.");
  }
  if (FORBIDDEN.test(trimmed)) {
    throw new Error("Only read-only SELECT queries are allowed.");
  }
  const head = trimmed.replace(/^\s*\(/, "").trim().toUpperCase();
  if (!head.startsWith("SELECT") && !head.startsWith("WITH")) {
    throw new Error("Query must start with SELECT or WITH.");
  }
}

export function toSqliteDialect(sql: string): string {
  return sql.replace(/\bILIKE\b/gi, "LIKE");
}
