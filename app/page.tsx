import { QUEST_MODULE } from "@/data/module";
import { formatInr } from "@/lib/utils";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen scanline">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16 md:px-6 md:py-24">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-teal/40 bg-teal/10 font-mono text-xs text-teal">
            QB
          </span>
          <span className="text-sm tracking-[0.22em] text-muted">QUESTBANK</span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Case 01 · Fraud Analytics Desk</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight md:text-6xl">{QUEST_MODULE.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{QUEST_MODULE.subtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Entry (simulated)" value={formatInr(QUEST_MODULE.priceInr)} />
          <Stat label="Max reward" value={formatInr(QUEST_MODULE.maxRewardInr)} />
          <Stat label="Stages live" value="1–2 of 5" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-bg hover:brightness-110"
          >
            Open the case file
          </Link>
          <Link
            href="/dev"
            className="rounded-md border border-line px-5 py-2.5 text-sm text-muted hover:text-text"
          >
            Lab / reset
          </Link>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          You are a data analyst at a large bank. The fraud dashboard says suspicious activity fell.
          Volumes did not. The investigation unfolds one stage at a time.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-card/70 p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-2 font-mono text-xl text-text">{value}</div>
    </div>
  );
}
