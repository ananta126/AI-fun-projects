"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/challenges/DataTable";
import { useEffect, useState } from "react";

export type DatasetOverview = {
  tables: Array<{
    name: string;
    rows: number;
    columns: string[];
    sample: Array<Record<string, unknown>>;
  }>;
  monthly: Array<{
    month: string;
    transactions: number;
    alerts: number;
    alertsPerThousand: number;
  }>;
  channels: Array<{ channel: string; transactions: number }>;
  categories: Array<{
    category: string;
    transactions: number;
    julyTransactions: number;
    julyAlerts: number;
  }>;
};

export function DataExplorer() {
  const [overview, setOverview] = useState<DatasetOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState("transactions");
  const [view, setView] = useState<"sample" | "monthly" | "channels" | "categories">("sample");

  useEffect(() => {
    fetch("/api/dataset/overview")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load warehouse snapshot.");
        return res.json() as Promise<DatasetOverview>;
      })
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <Card className="p-4 text-sm text-danger">{error}</Card>;
  }
  if (!overview) {
    return <Card className="p-4 text-sm text-muted">Loading warehouse snapshot…</Card>;
  }

  const active = overview.tables.find((t) => t.name === table) ?? overview.tables[0]!;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge>Warehouse snapshot</Badge>
          <h3 className="mt-2 font-serif text-xl">Inspect the books</h3>
          <p className="mt-1 text-sm text-muted">
            Table names, columns, samples, and basic shape. Numbers are real for this case.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {overview.tables.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => {
              setTable(t.name);
              setView("sample");
            }}
            className={`rounded-md border px-3 py-1.5 font-mono text-xs ${
              table === t.name ? "border-teal bg-teal/10 text-teal" : "border-line text-muted"
            }`}
          >
            {t.name} · {t.rows.toLocaleString("en-IN")}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-widest text-muted">
        {active.columns.map((col) => (
          <span key={col} className="rounded bg-white/5 px-2 py-1 font-mono normal-case tracking-normal text-text/80">
            {col}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["sample", "Sample records"],
            ["monthly", "Monthly stats"],
            ["channels", "By channel"],
            ["categories", "By category"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`text-xs ${view === id ? "text-teal" : "text-muted hover:text-text"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {view === "sample" ? (
          <DataTable columns={active.columns} rows={active.sample} />
        ) : null}
        {view === "monthly" ? (
          <DataTable
            columns={["month", "transactions", "alerts", "alerts_per_1000"]}
            rows={overview.monthly.map((m) => ({
              month: m.month,
              transactions: m.transactions,
              alerts: m.alerts,
              alerts_per_1000: m.alertsPerThousand,
            }))}
          />
        ) : null}
        {view === "channels" ? (
          <DataTable
            columns={["channel", "transactions"]}
            rows={overview.channels.map((c) => ({
              channel: c.channel,
              transactions: c.transactions,
            }))}
          />
        ) : null}
        {view === "categories" ? (
          <DataTable
            columns={["category", "transactions", "july_transactions", "july_alerts"]}
            rows={overview.categories.map((c) => ({
              category: c.category,
              transactions: c.transactions,
              july_transactions: c.julyTransactions,
              july_alerts: c.julyAlerts,
            }))}
          />
        ) : null}
      </div>
    </Card>
  );
}
