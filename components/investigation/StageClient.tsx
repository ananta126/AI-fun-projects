"use client";

import { EvidenceForm, type EvidencePayload } from "@/components/challenges/EvidenceForm";
import { MultipleChoiceChallenge } from "@/components/challenges/MultipleChoiceChallenge";
import { DataExplorer } from "@/components/challenges/DataExplorer";
import { SqlEditor } from "@/components/challenges/SqlEditor";
import { TextChallenge } from "@/components/challenges/TextChallenge";
import { InvestigationComplete } from "@/components/investigation/InvestigationComplete";
import { StageComplete } from "@/components/investigation/StageComplete";
import { Timeline } from "@/components/investigation/Timeline";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { QUEST_MODULE } from "@/data/module";
import { SQL_STARTERS } from "@/data/sql-starters";
import { evaluateExactAnswer } from "@/lib/evaluate-exact";
import {
  completeStage,
  recordSubmission,
  saveNotes,
  startModule,
} from "@/lib/progress";
import { MEMO_RUBRIC, scoreExplanation, scoreViva, STAGE4_RUBRIC } from "@/lib/rubric";
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
  const [skillDisplay, setSkillDisplay] = useState<number | null>(null);
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

  const challenge = stage.challenges[Math.min(qIndex, stage.challenges.length - 1)]!;
  const alreadyDone = progress.completedStageIds.includes(stage.id);
  const nextStage = QUEST_MODULE.stages.find((s) => s.order === stage.order + 1);

  function advanceOrFinish(next: UserProgress) {
    if (qIndex + 1 < currentStage.challenges.length) {
      setQIndex((i) => i + 1);
      setFeedback(null);
      return;
    }
    finish(next);
  }

  function finish(current: UserProgress) {
    if (current.completedStageIds.includes(currentStage.id)) {
      setUnlockedDisplay(current.rewardUnlocked);
      setSkillDisplay(current.skillScore);
      setShowComplete(true);
      return;
    }
    const updated = completeStage(current, currentStage.id);
    setUnlockedDisplay(updated.rewardUnlocked);
    setSkillDisplay(updated.skillScore);
    setShowComplete(true);
  }

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
    advanceOrFinish(next);
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
        body: JSON.stringify({ sql, challengeId: challenge.id }),
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
      if (data.passed) {
        advanceOrFinish(next);
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function onEvidence(payload: EvidencePayload) {
    const res = await fetch("/api/evaluate/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Evaluation failed");
    const next = recordSubmission(progress, {
      challengeId: challenge.id,
      stageId: currentStage.id,
      type: "numerical",
      payload,
      passed: data.passed,
      feedback: data.feedback,
    });
    if (data.passed) advanceOrFinish(next);
    return data;
  }

  function onText(text: string) {
    const scored =
      challenge.id === "s4-explain"
        ? scoreExplanation(text, STAGE4_RUBRIC)
        : challenge.id === "s5-memo"
          ? scoreExplanation(text, MEMO_RUBRIC)
          : scoreViva(challenge.id, text);
    setFeedback(scored.feedback);
    const withNotes = saveNotes(progress, challenge.id, text);
    const next = recordSubmission(withNotes, {
      challengeId: challenge.id,
      stageId: currentStage.id,
      type: "text",
      payload: text,
      passed: scored.passed,
      feedback: scored.feedback,
    });
    if (!scored.passed) return;
    advanceOrFinish(next);
  }

  const showExplorer = stage.id === "stage-1" || stage.id === "stage-3" || stage.id === "stage-4";
  const showSql =
    challenge.type === "sql" || stage.id === "stage-3" || stage.id === "stage-4";

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
          {showExplorer ? <DataExplorer /> : null}
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Finding {qIndex + 1} of {stage.challenges.length}
          </p>
          {challenge.type === "multiple_choice" ? (
            <MultipleChoiceChallenge
              key={challenge.id}
              challenge={challenge}
              disabled={busy || alreadyDone}
              onSubmit={onMcq}
            />
          ) : null}
          {challenge.type === "sql" ? (
            <SqlEditor
              key={challenge.id}
              disabled={busy || alreadyDone}
              starter={SQL_STARTERS[challenge.id]}
              onEvaluate={onSql}
            />
          ) : null}
          {challenge.type === "numerical" ? (
            <EvidenceForm key={challenge.id} disabled={busy || alreadyDone} onSubmit={onEvidence} />
          ) : null}
          {challenge.type === "text" ? (
            <TextChallenge
              key={challenge.id}
              title={challenge.title}
              description={challenge.description}
              disabled={busy || alreadyDone}
              minChars={challenge.id.startsWith("s5-viva") ? 40 : 80}
              onSubmit={onText}
            />
          ) : null}
          {challenge.type !== "sql" && showSql ? (
            <SqlEditor
              key={`probe-${challenge.id}`}
              disabled={busy}
              starter={SQL_STARTERS["s3-sql-dup-txn"]}
              onEvaluate={async (sql) => {
                const res = await fetch("/api/sql", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sql }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Query failed");
                return { passed: false, feedback: "Probe query only — it is not scored.", result: data };
              }}
            />
          ) : null}
          {feedback ? <p className="text-sm text-teal">{feedback}</p> : null}
        </div>
      </div>

      {showComplete && currentStage.order === 5 ? (
        <InvestigationComplete
          skillScore={skillDisplay ?? progress.skillScore ?? 0}
          reward={unlockedDisplay ?? progress.rewardUnlocked}
          onContinue={() => {
            setShowComplete(false);
            router.push("/dashboard");
          }}
        />
      ) : null}

      {showComplete && currentStage.order !== 5 ? (
        <StageComplete
          stageLabel={stage.title}
          reward={stage.rewardInr}
          total={unlockedDisplay ?? progress.rewardUnlocked}
          max={progress.maxReward}
          nextLabel={nextStage?.title}
          onContinue={() => {
            setShowComplete(false);
            if (nextStage) router.push(`/investigate/${nextStage.id}`);
            else router.push("/dashboard");
          }}
        />
      ) : null}
    </AppShell>
  );
}
