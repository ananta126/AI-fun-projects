import { formatInr } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function InvestigationComplete({
  skillScore,
  reward,
  onContinue,
}: {
  skillScore: number;
  reward: number;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-bg-card p-6 text-center shadow-2xl">
        <div className="text-[11px] uppercase tracking-[0.22em] text-gold">Investigation complete</div>
        <h2 className="mt-3 font-serif text-3xl">{formatInr(reward)} unlocked</h2>
        <p className="mt-4 font-mono text-2xl text-teal">Skill score: {skillScore}/100</p>
        <p className="mt-2 text-sm text-muted">Investigation completed.</p>
        <Button className="mt-6 w-full" variant="gold" onClick={onContinue}>
          Return to case file
        </Button>
      </div>
    </div>
  );
}
