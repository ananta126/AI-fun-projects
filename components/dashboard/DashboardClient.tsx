"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { QUEST_MODULE } from "@/data/module";
import { startModule } from "@/lib/progress";
import { investigationLabel, MISSIONS } from "@/lib/story";
import { useProgress } from "@/lib/use-progress";
import { formatInr } from "@/lib/utils";
import Link from "next/link";

export function DashboardClient() {
  const progress = useProgress();

  const started = Boolean(progress.paidAmount);
  const current = QUEST_MODULE.stages.find((s) => s.order === (progress.currentStageOrder || 1));
  const mission = current ? MISSIONS[current.id] : null;

  return (
    <AppShell
      rewardUnlocked={progress.rewardUnlocked}
      maxReward={progress.maxReward}
      paidAmount={progress.paidAmount}
      lastRewardAmount={progress.lastRewardAmount}
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <Badge tone="gold">Active case</Badge>
          <h1 className="mt-3 font-serif text-4xl tracking-tight md:text-5xl">{QUEST_MODULE.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{QUEST_MODULE.subtitle}</p>

          <Card className="mt-6 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted">Paid</div>
                <div className="font-mono text-xl">{formatInr(progress.paidAmount || 0)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted">Unlocked</div>
                <div className="font-mono text-xl text-gold">
                  {formatInr(progress.rewardUnlocked)} / {formatInr(progress.maxReward)}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              Simulated entry and reward wallet. No payment provider. No withdrawals.
            </p>
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
                      {done ? "✓" : locked ? "·" : active ? "▸" : "○"}
                    </span>
                    <div>
                      <div className="text-sm">
                        {investigationLabel(stage.id)} — {stage.title}
                      </div>
                      <div className="text-[11px] uppercase tracking-widest text-muted">
                        {formatInr(stage.rewardInr)} · {locked ? "Sealed" : done ? "Cleared" : "Current"}
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
            <div className="text-[11px] uppercase tracking-widest text-muted">Current objective</div>
            <p className="mt-2 font-serif text-2xl">
              {!started
                ? "Enter the case. Simulated fee: ₹200."
                : progress.moduleCompleted
                  ? "Case closed."
                  : mission?.objective}
            </p>
            <div className="mt-6">
              {!started ? (
                <Button variant="gold" className="w-full" onClick={() => startModule(progress)}>
                  ENTER CASE — ₹200
                </Button>
              ) : progress.moduleCompleted ? (
                <Link href="/investigate/stage-5">
                  <Button className="w-full" variant="outline">
                    View case closed
                  </Button>
                </Link>
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
                  <li key={`${row.stageId}-${row.unlockedAt}`} className="flex justify-between">
                    <span className="text-muted">{row.label}</span>
                    <span className="text-gold">+{formatInr(row.amountInr)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
