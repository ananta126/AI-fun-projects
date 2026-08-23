"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { QUEST_MODULE } from "@/data/module";
import {
  forceCompleteStage,
  jumpToInvestigation,
  resetProgress,
  startModule,
  uncompleteFromStage,
} from "@/lib/progress";
import { investigationLabel } from "@/lib/story";
import { useAnalyticsEvents, useProgress } from "@/lib/use-progress";
import { formatInr } from "@/lib/utils";
import { resetChallengeDbCache } from "@/lib/sql-engine";
import { useState } from "react";

export default function DevPage() {
  const progress = useProgress();
  const events = useAnalyticsEvents();
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  return (
    <AppShell
      rewardUnlocked={progress.rewardUnlocked}
      maxReward={QUEST_MODULE.maxRewardInr}
      paidAmount={progress.paidAmount}
    >
      <h1 className="font-serif text-3xl">Lab</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Development only. Reset the simulated analyst, jump investigations, inspect submissions and
        reward events, and reseed the challenge database.
      </p>

      <Card className="mt-5 p-4">
        <div className="text-[11px] uppercase tracking-widest text-muted">Current story state</div>
        <p className="mt-2 font-mono text-sm text-teal">{progress.storyState}</p>
      </Card>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="gold" onClick={() => startModule(progress)}>
          Simulate ₹200 start
        </Button>
        <Button variant="danger" onClick={() => resetProgress()}>
          Reset case / user
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            resetChallengeDbCache();
            setSeedMsg("Challenge database will rebuild on the next SQL run.");
          }}
        >
          Reseed challenge data
        </Button>
      </div>
      {seedMsg ? <p className="mt-2 text-xs text-teal">{seedMsg}</p> : null}

      <div className="mt-6 grid gap-2">
        {QUEST_MODULE.stages.map((stage) => {
          const done = progress.completedStageIds.includes(stage.id);
          return (
            <Card key={stage.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm">
                  {investigationLabel(stage.id)} — {stage.title}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {done ? "completed" : progress.begunStageIds.includes(stage.id) ? "open" : "sealed"} ·{" "}
                  {formatInr(stage.rewardInr)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => jumpToInvestigation(progress, stage.id)}>
                  Jump here
                </Button>
                <Button variant="outline" onClick={() => forceCompleteStage(progress, stage.id)}>
                  Complete through here
                </Button>
                <Button variant="ghost" onClick={() => uncompleteFromStage(progress, stage.id)}>
                  Uncomplete from here
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 p-4">
        <div className="text-[11px] uppercase tracking-widest text-muted">Reward history</div>
        <p className="mt-2 font-mono text-sm text-gold">
          {formatInr(progress.rewardUnlocked)} / {formatInr(progress.maxReward)} · paid{" "}
          {formatInr(progress.paidAmount)} · skill {progress.skillScore ?? "—"}/100
        </p>
        <pre className="mt-3 overflow-auto font-mono text-xs text-muted">
          {JSON.stringify(progress.rewardHistory, null, 2)}
        </pre>
      </Card>

      <Card className="mt-6 overflow-auto p-4">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">
          Submissions ({progress.submissions.length})
        </div>
        <pre className="font-mono text-xs leading-5 text-muted">
          {JSON.stringify({ storyState: progress.storyState, progress, events }, null, 2)}
        </pre>
      </Card>
    </AppShell>
  );
}
