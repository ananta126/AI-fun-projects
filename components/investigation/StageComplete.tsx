import { Button } from "@/components/ui/Button";
import { formatInr } from "@/lib/utils";

export function StageComplete({
  stageLabel,
  reward,
  total,
  max,
  nextLabel,
  onContinue,
}: {
  stageLabel: string;
  reward: number;
  total: number;
  max: number;
  nextLabel?: string;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-bg-card p-6 text-center shadow-2xl">
        <div className="text-[11px] uppercase tracking-[0.22em] text-gold">Stage complete</div>
        <h2 className="mt-3 font-serif text-3xl">{stageLabel}</h2>
        <p className="mt-4 font-mono text-2xl text-gold">{formatInr(reward)} unlocked</p>
        <p className="mt-1 text-sm text-muted">
          Total reward: {formatInr(total)} / {formatInr(max)}
        </p>
        {nextLabel ? (
          <p className="mt-4 text-sm text-teal">Next: {nextLabel}</p>
        ) : null}
        <Button className="mt-6 w-full" variant="gold" onClick={onContinue}>
          Continue investigation
        </Button>
      </div>
    </div>
  );
}
