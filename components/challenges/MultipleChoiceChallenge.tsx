"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ChallengeDefinition } from "@/types";
import { useState } from "react";

export function MultipleChoiceChallenge({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: ChallengeDefinition;
  disabled?: boolean;
  onSubmit: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Card className="p-5">
      <Badge tone="teal">Finding</Badge>
      <h3 className="mt-3 font-serif text-2xl text-text">{challenge.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{challenge.description}</p>
      <div className="mt-5 grid gap-2">
        {challenge.options?.map((option) => {
          const active = selected === option;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => setSelected(option)}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                active
                  ? "border-teal bg-teal/10 text-text"
                  : "border-line bg-bg-elevated text-muted hover:border-teal/40 hover:text-text"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      <Button
        className="mt-5"
        disabled={!selected || disabled}
        onClick={() => selected && onSubmit(selected)}
      >
        Submit finding
      </Button>
    </Card>
  );
}
