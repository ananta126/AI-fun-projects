"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { QUEST_MODULE } from "@/data/module";
import { resetProgress } from "@/lib/progress";
import { useAnalyticsEvents, useProgress } from "@/lib/use-progress";
import { formatInr } from "@/lib/utils";

export default function DevPage() {
  const progress = useProgress();
  const events = useAnalyticsEvents();

  return (
    <AppShell rewardUnlocked={progress.rewardUnlocked} maxReward={QUEST_MODULE.maxRewardInr}>
      <h1 className="font-serif text-3xl">Lab</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        MVP testing only. Reset the simulated analyst, inspect submissions, and read reward state.
        Stages 3–5 and full admin complete/uncomplete land in a later slice.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="danger" onClick={() => resetProgress()}>
          Reset progress
        </Button>
      </div>
      <Card className="mt-6 overflow-auto p-4">
        <pre className="font-mono text-xs leading-5 text-muted">
          {JSON.stringify({ progress, events }, null, 2)}
        </pre>
      </Card>
      <p className="mt-4 font-mono text-xs text-muted">
        Simulated user · paid {formatInr(QUEST_MODULE.priceInr)} on start · max {formatInr(QUEST_MODULE.maxRewardInr)}
      </p>
    </AppShell>
  );
}
