"use client";

import { getDatasetOverview, type DatasetOverview } from "@/lib/dataset-overview";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/challenges/DataTable";
import { track } from "@/lib/progress";
import { useMemo, useState } from "react";

export function DataExplorer({ allowedTables }: { allowedTables: string[] }) {
  const [overview] = useState<DatasetOverview>(() => getDatasetOverview());
  const tables = useMemo(
    () => overview.tables.filter((t) => allowedTables.includes(t.name)),
    [overview.tables, allowedTables],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<"sample" | "monthly" | "channels" | "categories">("sample");
  const table = tables.some((t) => t.name === picked) ? picked! : tables[0]?.name;
  const active = tables.find((t) => t.name === table);
  if (!active) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted">No evidence unlocked yet.</p>
      </Card>
    );
  }

  const warehouse = ["customers", "transactions", "fraud_alerts"].includes(active.name);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge>Evidence locker</Badge>
          <h3 className="mt-2 font-serif text-xl">Warehouse & source extracts</h3>
          <p className="mt-1 text-sm text-muted">
            Access is read-only and expands as the case progresses. Row counts are live for this snapshot.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {tables.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => {
              setPicked(t.name);
              setView("sample");
              track("evidence_opened", { table: t.name });
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
        )
          .filter(([id]) => {
            if (id === "sample") return true;
            return warehouse;
          })
          .map(([id, label]) => (
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
        {view === "sample" ? <DataTable columns={active.columns} rows={active.sample} /> : null}
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
