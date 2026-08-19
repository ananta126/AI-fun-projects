import type { FitAnalysis } from "@/types";

interface FitScoreProps {
  analysis: FitAnalysis;
}

export function FitScore({ analysis }: FitScoreProps) {
  const metrics = [
    { label: "Proportion", value: analysis.proportion },
    { label: "Silhouette", value: analysis.silhouette },
    { label: "Length", value: analysis.length },
    { label: "Color", value: analysis.color },
    { label: "Versatility", value: analysis.versatility },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center py-8 border border-border">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Overall
        </p>
        <p className="font-serif text-6xl">{analysis.overall}</p>
        <p className="text-sm text-muted-foreground mt-1">out of 10</p>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-sm mb-1.5">
              <span>{m.label}</span>
              <span className="text-muted-foreground">{m.value}</span>
            </div>
            <div className="h-1 bg-muted overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-700"
                style={{ width: `${(m.value / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-5 bg-muted/50 border-l-2 border-accent">
        <p className="text-sm leading-relaxed">{analysis.recommendation}</p>
      </div>

      <div>
        <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">
          Recommended Fit
        </h3>
        <dl className="space-y-3">
          {Object.entries(analysis.recommendedFit).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <dt className="capitalize text-muted-foreground">{key}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
        Fit recommendations are estimates based on your profile and the available
        garment information. Actual fit may vary by brand, fabric, and garment
        construction.
      </p>
    </div>
  );
}
