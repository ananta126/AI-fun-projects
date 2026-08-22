import { Button } from "@/components/ui/Button";
import { formatInr } from "@/lib/utils";

export function StageComplete({
  stageLabel,
  reward,
  total,
  max,
  nextLabel,
  caseUpdate,
  onContinue,
}: {
  stageLabel: string;
  reward: number;
  total: number;
  max: number;
  nextLabel?: string;
  caseUpdate?: string;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-bg-card p-6 text-center shadow-2xl">
        <div className="text-[11px] uppercase tracking-[0.22em] text-gold">+ {formatInr(reward)} unlocked</div>
        <h2 className="mt-3 font-serif text-3xl">{stageLabel}</h2>
        {caseUpdate ? <p className="mt-4 text-sm leading-6 text-muted">{caseUpdate}</p> : null}
        <p className="mt-4 font-mono text-xl text-gold">
          Reward: {formatInr(total)} / {formatInr(max)}
        </p>
        {nextLabel ? <p className="mt-4 text-sm text-teal">Unlocked: {nextLabel}</p> : null}
        <Button className="mt-6 w-full" variant="gold" onClick={onContinue}>
          Continue the case
        </Button>
      </div>
    </div>
  );
}
