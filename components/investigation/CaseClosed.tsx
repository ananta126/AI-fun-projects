import { formatInr } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { SkillBreakdown } from "@/types";
import Link from "next/link";

export function CaseClosed({
  breakdown,
  paid,
  reward,
}: {
  breakdown: SkillBreakdown;
  paid: number;
  reward: number;
}) {
  const rows = [
    ["SQL Reasoning", breakdown.sqlReasoning],
    ["Data Quality", breakdown.dataQuality],
    ["Analysis", breakdown.analysis],
    ["Business Reasoning", breakdown.businessReasoning],
    ["Communication", breakdown.communication],
  ] as const;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Case closed</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">The dashboard did not show a decline in fraud.</h1>
      <p className="mt-3 font-serif text-2xl text-muted">It showed a decline in what the pipeline was able to see.</p>

      <div className="mt-8 rounded-xl border border-line bg-bg-card p-5">
        <div className="text-[11px] uppercase tracking-widest text-muted">Investigation score</div>
        <ul className="mt-4 space-y-2 font-mono text-sm">
          {rows.map(([label, value]) => (
            <li key={label} className="flex justify-between">
              <span className="text-muted">{label}</span>
              <span className="text-text">{value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 font-serif text-4xl text-teal">
          {breakdown.overall} <span className="text-lg text-muted">/ 100</span>
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-gold/30 bg-gold/5 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-gold">{formatInr(reward)} unlocked</div>
        <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted">Paid</div>
            <div>{formatInr(paid)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted">Reward unlocked</div>
            <div className="text-gold">{formatInr(reward)}</div>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Simulated balances only. No withdrawals in this MVP.
        </p>
      </div>

      <Link href="/dashboard" className="mt-6 inline-block">
        <Button variant="outline">Return to case file</Button>
      </Link>
    </div>
  );
}
