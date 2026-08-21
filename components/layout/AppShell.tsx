import Link from "next/link";
import { formatInr } from "@/lib/utils";

export function AppShell({
  children,
  rewardUnlocked,
  maxReward,
}: {
  children: React.ReactNode;
  rewardUnlocked: number;
  maxReward: number;
}) {
  return (
    <div className="min-h-screen scanline">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-md border border-teal/40 bg-teal/10 font-mono text-xs text-teal">
              QB
            </span>
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-text">QUESTBANK</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted">Fraud Investigation Desk</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden text-xs uppercase tracking-widest text-muted hover:text-text md:inline">
              Case file
            </Link>
            <Link href="/dev" className="hidden text-xs uppercase tracking-widest text-muted hover:text-text md:inline">
              Lab
            </Link>
            <div className="reward-pulse rounded-md border border-gold/30 bg-gold/10 px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold-dim">Unlocked</div>
              <div className="font-mono text-sm text-gold">
                {formatInr(rewardUnlocked)} <span className="text-muted">/ {formatInr(maxReward)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
