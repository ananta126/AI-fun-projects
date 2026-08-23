"use client";

import Link from "next/link";
import { formatInr } from "@/lib/utils";
import { clearRewardToast, loadProgress } from "@/lib/progress";
import { useEffect } from "react";

export function AppShell({
  children,
  rewardUnlocked,
  maxReward,
  paidAmount = 0,
  lastRewardAmount = null,
}: {
  children: React.ReactNode;
  rewardUnlocked: number;
  maxReward: number;
  paidAmount?: number;
  lastRewardAmount?: number | null;
}) {
  useEffect(() => {
    if (!lastRewardAmount) return;
    const t = window.setTimeout(() => {
      clearRewardToast(loadProgress());
    }, 2800);
    return () => window.clearTimeout(t);
  }, [lastRewardAmount]);

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
            {paidAmount > 0 ? (
              <div className="hidden rounded-md border border-line px-3 py-1.5 sm:block">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Paid</div>
                <div className="font-mono text-sm">{formatInr(paidAmount)}</div>
              </div>
            ) : null}
            <div className="reward-pulse rounded-md border border-gold/30 bg-gold/10 px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gold-dim">Unlocked</div>
              <div className="font-mono text-sm text-gold">
                {formatInr(rewardUnlocked)} <span className="text-muted">/ {formatInr(maxReward)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      {lastRewardAmount ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 rounded-md border border-gold/40 bg-bg-card px-4 py-3 font-mono text-sm text-gold shadow-lg">
          + {formatInr(lastRewardAmount)} UNLOCKED
        </div>
      ) : null}
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
