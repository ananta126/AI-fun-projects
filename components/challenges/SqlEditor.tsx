"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/challenges/DataTable";
import { getDatasetOverview } from "@/lib/dataset-overview";
import type { QueryResult } from "@/lib/sql-types";
import { runChallengeQuery } from "@/lib/sql-engine";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[260px] place-items-center text-sm text-muted">Loading SQL workbench…</div>
  ),
});

const DEFAULT_STARTER = `-- Read-only warehouse console.
-- SELECT / WITH only. Trailing semicolon is allowed.

SELECT *
FROM transactions
LIMIT 25;
`;

export function SqlEditor({
  onEvaluate,
  submitDisabled,
  starter,
  allowedTables,
  submitLabel = "Submit finding",
}: {
  onEvaluate?: (sql: string) => Promise<{
    passed: boolean;
    feedback: string;
    result: QueryResult;
  }>;
  submitDisabled?: boolean;
  starter?: string;
  allowedTables: string[];
  submitLabel?: string;
}) {
  const [sql, setSql] = useState(starter ?? DEFAULT_STARTER);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<QueryResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(() => {
    const overview = getDatasetOverview();
    return overview.tables.filter((table) => allowedTables.includes(table.name));
  }, [allowedTables]);

  function insertPreview(tableName: string) {
    setSql(`SELECT *\nFROM ${tableName}\nLIMIT 25;`);
    setFeedback(null);
    setPassed(null);
    setError(null);
  }

  async function runOnly() {
    setBusy(true);
    setError(null);
    setFeedback(null);
    setPassed(null);
    try {
      const data = await runChallengeQuery(sql, allowedTables);
      setRunResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
      setRunResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!onEvaluate) return;
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
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-teal">SQL workbench</div>
          <div className="text-sm text-text">Query the granted warehouse. Run first, then submit if this finding is SQL.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={runOnly}>
            {busy ? "Running…" : "Run query"}
          </Button>
          {onEvaluate ? (
            <Button disabled={busy || submitDisabled} onClick={submit}>
              {submitLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid border-b border-line lg:grid-cols-[220px_1fr]">
        <div className="border-b border-line p-3 lg:border-b-0 lg:border-r">
          <div className="text-[11px] uppercase tracking-widest text-muted">Granted tables</div>
          <ul className="mt-2 space-y-1">
            {schema.map((table) => (
              <li key={table.name}>
                <button
                  type="button"
                  onClick={() => insertPreview(table.name)}
                  className="w-full rounded-md px-2 py-1.5 text-left font-mono text-[11px] text-muted hover:bg-teal/10 hover:text-teal"
                >
                  {table.name}
                  <span className="block text-[10px] text-muted/80">{table.rows.toLocaleString("en-IN")} rows</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="h-[280px]">
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
              tabSize: 2,
            }}
          />
        </div>
      </div>

      <div className="p-4">
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        {feedback ? (
          <p className={`mb-3 text-sm ${passed ? "text-ok" : "text-danger"}`}>{feedback}</p>
        ) : null}
        {runResult ? (
          <>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
              Result · {runResult.rowCount} row{runResult.rowCount === 1 ? "" : "s"}
              {runResult.truncated ? " · showing first 500" : ""}
            </p>
            <div className="max-h-80 overflow-auto">
              <DataTable columns={runResult.columns} rows={runResult.rows} empty="Query returned no rows." />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            Write a SELECT, then Run query. Results appear here. Click a table name to load a sample.
          </p>
        )}
      </div>
    </Card>
  );
}
