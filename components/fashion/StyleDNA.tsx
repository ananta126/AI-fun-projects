import type { StyleDistribution } from "@/types";

interface StyleDNAProps {
  styleLabel: string;
  styleDistribution: StyleDistribution[];
  colorPreferences: { name: string; percentage: number }[];
  silhouettes: string[];
  occasions: string[];
}

export function StyleDNA({
  styleLabel,
  styleDistribution,
  colorPreferences,
  silhouettes,
  occasions,
}: StyleDNAProps) {
  return (
    <div className="space-y-10">
      <div className="text-center py-10 border border-border">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Your Style DNA
        </p>
        <h2 className="font-serif text-3xl md:text-4xl">{styleLabel}</h2>
      </div>

      <section>
        <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-5">
          Style Distribution
        </h3>
        <div className="space-y-3">
          {styleDistribution.map((s) => (
            <div key={s.style}>
              <div className="flex justify-between text-sm mb-1">
                <span>{s.style}</span>
                <span className="text-muted-foreground">{s.percentage}%</span>
              </div>
              <div className="h-px bg-border relative">
                <div
                  className="absolute inset-y-0 left-0 bg-foreground h-px"
                  style={{ width: `${s.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-5">
          Color Preferences
        </h3>
        <div className="flex gap-3 flex-wrap">
          {colorPreferences.map((c) => (
            <div
              key={c.name}
              className="flex-1 min-w-[100px] p-4 border border-border text-center"
            >
              <p className="font-serif text-2xl">{c.percentage}%</p>
              <p className="text-xs text-muted-foreground mt-1">{c.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3">
            Favorite Silhouettes
          </h3>
          <ul className="space-y-2">
            {silhouettes.map((s) => (
              <li key={s} className="text-sm border-l-2 border-accent pl-3">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3">
            Occasions
          </h3>
          <ul className="space-y-2">
            {occasions.map((o) => (
              <li key={o} className="text-sm border-l-2 border-foreground/20 pl-3">
                {o}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
