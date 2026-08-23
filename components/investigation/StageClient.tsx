"use client";

import { ExecutiveBriefing } from "@/components/challenges/ExecutiveBriefing";
import { ImpactForm } from "@/components/challenges/ImpactForm";
import { MultipleChoiceChallenge } from "@/components/challenges/MultipleChoiceChallenge";
import { DataExplorer } from "@/components/challenges/DataExplorer";
import { SqlEditor } from "@/components/challenges/SqlEditor";
import { TextChallenge } from "@/components/challenges/TextChallenge";
import { CaseClosed } from "@/components/investigation/CaseClosed";
import { MissionCard } from "@/components/investigation/MissionCard";
import { StageComplete } from "@/components/investigation/StageComplete";
import { Timeline } from "@/components/investigation/Timeline";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { QUEST_MODULE } from "@/data/module";
import { SQL_STARTERS } from "@/data/sql-starters";
import { evaluateExactAnswer } from "@/lib/evaluate-exact";
import { evaluateSqlChallenge } from "@/lib/evaluation";
import { evaluateImpact, type ImpactPayload } from "@/lib/evaluate-evidence";
import {
  beginInvestigation,
  completeStage,
  recordSubmission,
  saveNotes,
  startModule,
} from "@/lib/progress";
import { scoreBriefing, scoreViva } from "@/lib/rubric";
import { allowedEvidenceTables, investigationLabel, MISSIONS, visibleFeed } from "@/lib/story";
import { useProgress } from "@/lib/use-progress";
import type { QueryResult } from "@/lib/sql-types";
import type { UserProgress } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const CASE_UPDATES: Record<string, string> = {
  "stage-1": "July is different. Fewer alerts reached the dashboard — that is not the same as fraud falling.",
  "stage-2": "Fourteen alerts never made it into the warehouse. That explains part of the gap, not the whole story.",
  "stage-3": "These are not random duplicates. Follow the trail.",
  "stage-4": "That's not random. The executive review is next.",
};

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

  const mission = stage ? MISSIONS[stage.id] : null;
  const begun = Boolean(stage && progress.begunStageIds.includes(stage.id));
  const feed = visibleFeed(progress);
  const evidenceTables = allowedEvidenceTables(progress);

  if (!stage) {
    return (
      <AppShell rewardUnlocked={0} maxReward={QUEST_MODULE.maxRewardInr} paidAmount={0}>
        <p className="text-sm text-muted">Unknown investigation.</p>
      </AppShell>
    );
  }

  const currentStage = stage;

  if (!progress.paidAmount) {
    return (
      <AppShell rewardUnlocked={0} maxReward={progress.maxReward} paidAmount={0}>
        <p className="text-sm text-muted">This case is not open yet.</p>
        <Button className="mt-4" onClick={() => startModule(progress)}>
          ENTER CASE — ₹200
        </Button>
      </AppShell>
    );
  }

  if (locked) {
    return (
      <AppShell rewardUnlocked={progress.rewardUnlocked} maxReward={progress.maxReward} paidAmount={progress.paidAmount}>
        <p className="text-sm text-muted">This part of the case is still sealed.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-teal">
          Back to case file
        </Link>
      </AppShell>
    );
  }

  if (progress.moduleCompleted && stage.id === "stage-5") {
    return (
      <AppShell rewardUnlocked={progress.rewardUnlocked} maxReward={progress.maxReward} paidAmount={progress.paidAmount}>
        <CaseClosed
          breakdown={
            progress.skillBreakdown ?? {
              sqlReasoning: 0,
              dataQuality: 0,
              analysis: 0,
              businessReasoning: 0,
              communication: 0,
              overall: progress.skillScore ?? 0,
            }
          }
          paid={progress.paidAmount}
          reward={progress.rewardUnlocked}
        />
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
      setShowComplete(true);
      return;
    }
    const updated = completeStage(current, currentStage.id);
    setUnlockedDisplay(updated.rewardUnlocked);
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
      const data = await evaluateSqlChallenge(challenge.id, sql);
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

  async function onImpact(payload: ImpactPayload) {
    const data = evaluateImpact(payload);
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

  function onBriefing(answers: Record<string, string>) {
    const scored = scoreBriefing(answers);
    setFeedback(scored.feedback);
    const withNotes = saveNotes(progress, challenge.id, JSON.stringify(answers));
    const next = recordSubmission(withNotes, {
      challengeId: challenge.id,
      stageId: currentStage.id,
      type: "text",
      payload: answers,
      passed: scored.passed,
      feedback: scored.feedback,
    });
    if (!scored.passed) return;
    advanceOrFinish(next);
  }

  function onText(text: string) {
    const scored = scoreViva(challenge.id, text);
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

  const showWorkspace = begun || alreadyDone;

  return (
    <AppShell
      rewardUnlocked={progress.rewardUnlocked}
      maxReward={progress.maxReward}
      paidAmount={progress.paidAmount}
      lastRewardAmount={progress.lastRewardAmount}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge tone="teal">{investigationLabel(stage.id)}</Badge>
          <h1 className="mt-2 font-serif text-4xl">{stage.title}</h1>
        </div>
        <Link href="/dashboard" className="text-xs uppercase tracking-widest text-muted hover:text-text">
          Case file
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted">Investigation feed</div>
          <Timeline events={feed} />
        </div>
        <div className="space-y-4">
          {mission ? (
            <MissionCard
              objective={mission.objective}
              support={mission.support}
              rewardInr={mission.rewardInr}
              begun={showWorkspace}
              beginLabel={mission.beginLabel}
              onBegin={() => beginInvestigation(progress, currentStage.id)}
            />
          ) : null}

              {showWorkspace ? (
            <>
              <DataExplorer allowedTables={evidenceTables} />
              <SqlEditor
                key={`workbench-${currentStage.id}`}
                allowedTables={evidenceTables}
                starter={
                  challenge.type === "sql"
                    ? SQL_STARTERS[challenge.id]
                    : SQL_STARTERS["s1-explore"]
                }
                submitDisabled={busy || alreadyDone}
                onEvaluate={challenge.type === "sql" ? onSql : undefined}
              />
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
                <p className="text-sm text-muted">
                  Use the workbench above. Run the query until the result set looks right, then Submit finding.
                </p>
              ) : null}
              {challenge.type === "numerical" ? (
                <ImpactForm key={challenge.id} disabled={busy || alreadyDone} onSubmit={onImpact} />
              ) : null}
              {challenge.id === "s5-brief" ? (
                <ExecutiveBriefing key={challenge.id} disabled={busy || alreadyDone} onSubmit={onBriefing} />
              ) : null}
              {challenge.type === "text" && challenge.id !== "s5-brief" ? (
                <TextChallenge
                  key={challenge.id}
                  title={challenge.title}
                  description={challenge.description}
                  disabled={busy || alreadyDone}
                  minChars={challenge.id.startsWith("s5-viva") ? 40 : 80}
                  onSubmit={onText}
                />
              ) : null}
              {feedback ? <p className="text-sm text-teal">{feedback}</p> : null}
            </>
          ) : (
            <p className="text-sm leading-6 text-muted">
              Read the feed. Then begin. The warehouse stays sealed until you take the case.
            </p>
          )}
        </div>
      </div>

      {showComplete && currentStage.order === 5 && progress.skillBreakdown ? (
        <div className="fixed inset-0 z-40 overflow-auto bg-bg/90 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl py-10">
            <CaseClosed
              breakdown={progress.skillBreakdown}
              paid={progress.paidAmount}
              reward={unlockedDisplay ?? progress.rewardUnlocked}
            />
          </div>
        </div>
      ) : null}

      {showComplete && currentStage.order !== 5 ? (
        <StageComplete
          stageLabel={stage.title}
          reward={stage.rewardInr}
          total={unlockedDisplay ?? progress.rewardUnlocked}
          max={progress.maxReward}
          nextLabel={nextStage ? investigationLabel(nextStage.id) : undefined}
          caseUpdate={CASE_UPDATES[stage.id]}
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
