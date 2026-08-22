"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

export function TextChallenge({
  title,
  description,
  disabled,
  minChars = 40,
  onSubmit,
}: {
  title: string;
  description: string;
  disabled?: boolean;
  minChars?: number;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <Card className="p-5">
      <Badge tone="teal">Written finding</Badge>
      <h3 className="mt-3 font-serif text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <textarea
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        className="mt-4 w-full rounded-lg border border-line bg-bg-elevated px-3 py-2 text-sm leading-6 text-text outline-none focus:border-teal"
        placeholder="Write in the voice of the desk — specific, calm, numbered if needed."
      />
      <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted">
        <span>{text.trim().length} chars</span>
        <span>min {minChars}</span>
      </div>
      <Button className="mt-4" disabled={disabled || text.trim().length < minChars} onClick={() => onSubmit(text)}>
        Submit
      </Button>
    </Card>
  );
}
