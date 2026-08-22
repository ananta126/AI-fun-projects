"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QUEST_MODULE } from "@/data/module";
import { startModule } from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";
import { formatInr } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";

export function DashboardClient() {
  const progress = useProgress();

  const started = Boolean(progress.paidAmount);
  const completedCount = progress.completedStageIds.length;
  const pct = Math.round((completedCount / QUEST_MODULE.stages.length) * 100);
  const current = QUEST_MODULE.stages.find((s) => s.order === (progress.currentStageOrder || 1));

  const mission = useMemo(() => {
    if (!started) return "Open the case. Simulated entry: ₹200.";
    if (progress.moduleCompleted) return "Investigation complete.";
    return current?.title ?? "Continue the investigation.";
  }, [started, progress.moduleCompleted, current?.title]);

  return (
    <AppShell rewardUnlocked={progress.rewardUnlocked} maxReward={progress.maxReward}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <Badge tone="gold">Active module</Badge>
          <h1 className="mt-3 font-serif text-4xl tracking-tight md:text-5xl">{QUEST_MODULE.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{QUEST_MODULE.subtitle}</p>

          <Card className="mt-6 p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted">
              <span>Investigation progress</span>
              <span className="font-mono text-teal">{pct}%</span>
            </div>
            <ProgressBar className="mt-3" value={pct} />
            <div className="mt-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted">Reward</div>
                <div className="font-mono text-xl text-gold">
                  {formatInr(progress.rewardUnlocked)} / {formatInr(progress.maxReward)} unlocked
                </div>
              </div>
              <div className="text-right text-xs text-muted">
                Entry {formatInr(progress.paidAmount || QUEST_MODULE.priceInr)} · simulated
              </div>
            </div>
          </Card>

          <div className="mt-6 space-y-2">
            {QUEST_MODULE.stages.map((stage) => {
              const done = progress.completedStageIds.includes(stage.id);
              const locked = !started || stage.order > progress.currentStageOrder;
              const active = started && stage.order === progress.currentStageOrder && !done;
              return (
                <Card key={stage.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted">
                      {done ? "✓" : locked ? "🔒" : active ? "▸" : "○"}
                    </span>
                    <div>
                      <div className="text-sm">
                        Stage {stage.order} — {stage.title}
                      </div>
                      <div className="text-[11px] uppercase tracking-widest text-muted">
                        {formatInr(stage.rewardInr)} · {locked ? "Locked" : done ? "Cleared" : "Current mission"}
                      </div>
                    </div>
                  </div>
                  {active || done ? (
                    <Link href={`/investigate/${stage.id}`}>
                      <Button variant="outline">{done ? "Review" : "Open"}</Button>
                    </Link>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-[11px] uppercase tracking-widest text-muted">Current mission</div>
            <p className="mt-2 font-serif text-2xl">{mission}</p>
            <div className="mt-6">
              {!started ? (
                <Button
                  variant="gold"
                  className="w-full"
                  onClick={() => startModule(progress)}
                >
                  Pay {formatInr(QUEST_MODULE.priceInr)} and start (simulated)
                </Button>
              ) : progress.moduleCompleted ? (
                <div className="space-y-3">
                  <p className="font-mono text-sm text-teal">
                    Skill score: {progress.skillScore ?? 0}/100
                  </p>
                  <Link href="/dashboard">
                    <Button className="w-full" variant="outline">
                      Investigation completed
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link href={`/investigate/${current?.id ?? "stage-1"}`}>
                  <Button className="w-full">Continue investigation</Button>
                </Link>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-[11px] uppercase tracking-widest text-muted">Reward ledger</div>
            {progress.rewardHistory.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No rupees unlocked yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 font-mono text-sm">
                {progress.rewardHistory.map((row) => (
                  <li key={row.stageId} className="flex justify-between">
                    <span className="text-muted">{row.label}</span>
                    <span className="text-gold">+{formatInr(row.amountInr)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] leading-5 text-muted">
              Simulated wallet only. No payouts, withdrawals, or real payments in this MVP.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
