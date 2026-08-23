"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatInr } from "@/lib/utils";

export function MissionCard({
  objective,
  support,
  rewardInr,
  begun,
  onBegin,
  beginLabel,
}: {
  objective: string;
  support: string;
  rewardInr: number;
  begun: boolean;
  onBegin: () => void;
  beginLabel: string;
}) {
  return (
    <Card className="border-teal/25 p-5">
      <Badge tone="teal">Current objective</Badge>
      <h3 className="mt-3 font-serif text-2xl leading-snug">{objective}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{support}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted">Reward</div>
          <div className="font-mono text-lg text-gold">{formatInr(rewardInr)}</div>
        </div>
        {!begun ? (
          <Button variant="gold" onClick={onBegin}>
            {beginLabel}
          </Button>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-widest text-teal">Workspace open</span>
        )}
      </div>
    </Card>
  );
}
