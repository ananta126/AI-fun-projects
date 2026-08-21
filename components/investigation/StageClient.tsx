"use client";

import { MultipleChoiceChallenge } from "@/components/challenges/MultipleChoiceChallenge";
import { DataExplorer } from "@/components/challenges/DataExplorer";
import { SqlEditor } from "@/components/challenges/SqlEditor";
import { StageComplete } from "@/components/investigation/StageComplete";
import { Timeline } from "@/components/investigation/Timeline";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { QUEST_MODULE } from "@/data/module";
import { evaluateExactAnswer } from "@/lib/evaluate-exact";
import {
  completeStage,
  recordSubmission,
  startModule,
} from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";
import type { QueryResult } from "@/lib/sql-types";
import type { UserProgress } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function StageClient({ stageId }: { stageId: string }) {
  const router = useRouter();
  const stage = QUEST_MODULE.stages.find((s) => s.id === stageId);
  const progress = useProgress();
  const [qIndex, setQIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [unlockedDisplay, setUnlockedDisplay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const locked = useMemo(() => {
    if (!stage) return true;
    if (!progress.paidAmount) return true;
    return stage.order > progress.currentStageOrder;
  }, [progress, stage]);

  if (!stage) {
    return (
      <AppShell rewardUnlocked={0} maxReward={QUEST_MODULE.maxRewardInr}>
        <p className="text-sm text-muted">Unknown stage.</p>
      </AppShell>
    );
  }

  const currentStage = stage;

  if (!progress.paidAmount) {
    return (
      <AppShell rewardUnlocked={0} maxReward={progress.maxReward}>
        <p className="text-sm text-muted">This case is not open yet.</p>
        <Button className="mt-4" onClick={() => startModule(progress)}>
          Simulate ₹200 entry
        </Button>
      </AppShell>
    );
  }

  if (locked) {
    return (
      <AppShell rewardUnlocked={progress.rewardUnlocked} maxReward={progress.maxReward}>
        <p className="text-sm text-muted">This stage is still sealed. Clear the previous desk first.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-teal">
          Back to case file
        </Link>
      </AppShell>
    );
  }

  if (stage.order > 2 || stage.challenges.length === 0) {
    return (
      <AppShell rewardUnlocked={progress.rewardUnlocked} maxReward={progress.maxReward}>
        <Badge>Coming next</Badge>
        <h1 className="mt-3 font-serif text-3xl">{stage.title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Stages 3–5 are not in this slice. Reset from Lab after you finish Stage 2, or continue
          once data quality, evidence, and the executive viva ship.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-teal">
          Back to case file
        </Link>
      </AppShell>
    );
  }

  const challenge = stage.challenges[Math.min(qIndex, stage.challenges.length - 1)]!;
  const alreadyDone = progress.completedStageIds.includes(stage.id);

  async function onMcq(answer: string) {
    const result = evaluateExactAnswer(answer, String(challenge.expectedAnswer ?? ""));
    setFeedback(result.feedback);
    const next = recordSubmission(progress, {
      challengeId: challenge.id,
      stageId: currentStage.id,
      type: "multiple_choice",
      payload: answer,
      passed: result.passed,
      feedback: result.feedback,
    });
    if (!result.passed) return;
    if (qIndex + 1 < currentStage.challenges.length) {
      setTimeout(() => {
        setQIndex((i) => i + 1);
        setFeedback(null);
      }, 650);
      return;
    }
    finish(next);
  }

  async function onSql(sql: string): Promise<{
    passed: boolean;
    feedback: string;
    result: QueryResult;
  }> {
    setBusy(true);
    try {
      const res = await fetch("/api/evaluate/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Evaluation failed");
      const next = recordSubmission(progress, {
        challengeId: challenge.id,
        stageId: currentStage.id,
        type: "sql",
        payload: { sql, matched: data.matched, expected: data.expected },
        passed: data.passed,
        feedback: data.feedback,
      });
      if (data.passed && !alreadyDone) {
        finish(next);
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  function finish(current: UserProgress) {
    if (current.completedStageIds.includes(currentStage.id)) {
      setUnlockedDisplay(current.rewardUnlocked);
      setShowComplete(true);
      return;
    }
    const updated = completeStage(current, currentStage.id);
    setUnlockedDisplay(updated.rewardUnlocked);
    setShowComplete(true);
  }

  const nextStage = QUEST_MODULE.stages.find((s) => s.order === stage.order + 1);

  return (
    <AppShell rewardUnlocked={progress.rewardUnlocked} maxReward={progress.maxReward}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge tone="teal">Stage {stage.order} of 5</Badge>
          <h1 className="mt-2 font-serif text-4xl">{stage.title}</h1>
        </div>
        <Link href="/dashboard" className="text-xs uppercase tracking-widest text-muted hover:text-text">
          Case file
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Timeline events={stage.briefing} />
        </div>
        <div className="space-y-4">
          {stage.id === "stage-1" ? <DataExplorer /> : null}
          {challenge.type === "multiple_choice" ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
                Finding {qIndex + 1} of {stage.challenges.length}
              </p>
              <MultipleChoiceChallenge
                key={challenge.id}
                challenge={challenge}
                disabled={busy || alreadyDone}
                onSubmit={onMcq}
              />
              {feedback ? <p className="text-sm text-teal">{feedback}</p> : null}
            </>
          ) : null}
          {challenge.type === "sql" ? (
            <SqlEditor disabled={busy || alreadyDone} onEvaluate={onSql} />
          ) : null}
        </div>
      </div>

      {showComplete ? (
        <StageComplete
          stageLabel={stage.title}
          reward={stage.rewardInr}
          total={unlockedDisplay ?? progress.rewardUnlocked}
          max={progress.maxReward}
          nextLabel={nextStage && nextStage.order <= 2 ? nextStage.title : nextStage ? `${nextStage.title} (next slice)` : undefined}
          onContinue={() => {
            setShowComplete(false);
            if (nextStage && nextStage.order <= 2) {
              router.push(`/investigate/${nextStage.id}`);
            } else {
              router.push("/dashboard");
            }
          }}
        />
      ) : null}
    </AppShell>
  );
}
