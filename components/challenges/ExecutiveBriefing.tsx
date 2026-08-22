"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

const FIELDS = [
  {
    key: "changed",
    label: "What changed?",
  },
  {
    key: "why",
    label: "Why did the dashboard show a decline?",
  },
  {
    key: "quality",
    label: "What data-quality issue caused the discrepancy?",
  },
  {
    key: "channel",
    label: "Which channel was affected?",
  },
  {
    key: "next",
    label: "What should the bank do next?",
  },
] as const;

export function ExecutiveBriefing({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({
    changed: "",
    why: "",
    quality: "",
    channel: "",
    next: "",
  });

  const ready = FIELDS.every((field) => (answers[field.key] ?? "").trim().length >= 24);

  return (
    <Card className="p-5">
      <Badge tone="gold">Executive review</Badge>
      <div className="mt-3 flex items-end justify-between gap-4">
        <h3 className="font-serif text-2xl">What actually happened?</h3>
        <div className="text-right">
          <div className="font-mono text-lg text-teal">05:00</div>
          <div className="text-[10px] uppercase tracking-widest text-muted">Not a live clock</div>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full w-2/5 bg-teal/70" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        Five minutes before the room. The CFO already heard 26%. Priya has not signed it.
      </p>
      <div className="mt-5 grid gap-4">
        {FIELDS.map((field) => (
          <label key={field.key} className="block text-xs uppercase tracking-widest text-muted">
            {field.label}
            <textarea
              disabled={disabled}
              rows={3}
              value={answers[field.key]}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 font-sans text-sm normal-case tracking-normal leading-6 text-text outline-none focus:border-teal"
            />
          </label>
        ))}
      </div>
      <Button className="mt-5" disabled={disabled || !ready} onClick={() => onSubmit(answers)}>
        File the briefing
      </Button>
    </Card>
  );
}
