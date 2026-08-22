"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/challenges/DataTable";
import type { QueryResult } from "@/lib/sql-types";
import dynamic from "next/dynamic";
import { useState } from "react";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[280px] place-items-center text-sm text-muted">Loading SQL editor…</div>
  ),
});

const STARTER = `-- Find settled transactions that should have an alert
-- but do not appear in fraud_alerts.
-- Published rules:
--   amount_inr >= 250000
--   OR (channel = 'WIRE' AND amount_inr >= 75000)
--   OR (category = 'CRYPTO' AND amount_inr >= 50000)
--   OR (is_international = 1 AND amount_inr >= 100000)

SELECT t.txn_id
FROM transactions t
WHERE 1 = 0;
`;

export function SqlEditor({
  onEvaluate,
  disabled,
  starter,
}: {
  onEvaluate: (sql: string) => Promise<{
    passed: boolean;
    feedback: string;
    result: QueryResult;
  }>;
  disabled?: boolean;
  starter?: string;
}) {
  const [sql, setSql] = useState(starter ?? STARTER);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<QueryResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runOnly() {
    setBusy(true);
    setError(null);
    setFeedback(null);
    setPassed(null);
    try {
      const res = await fetch("/api/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");
      setRunResult(data as QueryResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
      setRunResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const outcome = await onEvaluate(sql);
      setRunResult(outcome.result);
      setFeedback(outcome.feedback);
      setPassed(outcome.passed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted">SQL console · read-only</div>
          <div className="text-sm text-text">PostgreSQL-style SELECT against the challenge schema</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy || disabled} onClick={runOnly}>
            Run
          </Button>
          <Button disabled={busy || disabled} onClick={submit}>
            Submit result
          </Button>
        </div>
      </div>
      <div className="h-[280px] border-b border-line">
        <Editor
          height="280px"
          defaultLanguage="sql"
          theme="vs-dark"
          value={sql}
          onChange={(value) => setSql(value ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "IBM Plex Mono, ui-monospace, monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
      <div className="p-4">
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        {feedback ? (
          <p className={`mb-3 text-sm ${passed ? "text-ok" : "text-danger"}`}>{feedback}</p>
        ) : null}
        {runResult ? (
          <>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
              {runResult.rowCount} row{runResult.rowCount === 1 ? "" : "s"}
              {runResult.truncated ? " · showing first 500" : ""}
            </p>
            <DataTable columns={runResult.columns} rows={runResult.rows} empty="Query returned no rows." />
          </>
        ) : (
          <p className="text-sm text-muted">Run a query to inspect results before submitting.</p>
        )}
      </div>
    </Card>
  );
}
