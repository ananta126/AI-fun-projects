"use client";

export function DataTable({
  columns,
  rows,
  empty = "No rows.",
}: {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  empty?: string;
}) {
  if (!columns.length) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-auto rounded-lg border border-line">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-white/5 font-mono uppercase tracking-wider text-muted">
          <tr>
            {columns.map((col) => (
              <th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line/80 odd:bg-white/[0.02]">
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap px-3 py-2 font-mono text-text/90">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value);
}
