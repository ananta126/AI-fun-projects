import type { Metadata } from "next";
import { MasonryGrid } from "@/components/fashion/MasonryGrid";
import { trends } from "@/data/mock-data";
import { outfitService } from "@/services/outfit-service";

export const metadata: Metadata = {
  title: "Trending",
  description: "What's trending in fashion right now.",
};

export default function TrendingPage() {
  const trendingLooks = outfitService.getTrending(12);
  const styleTrends = trends.filter((t) => t.category === "style");
  const colorTrends = trends.filter((t) => t.category === "color");
  const silhouetteTrends = trends.filter((t) => t.category === "silhouette");

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-12">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Editorial Analytics
        </p>
        <h1 className="font-serif text-3xl md:text-5xl">Trending</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-20">
        <TrendSection title="Trending Styles" items={styleTrends} />
        <TrendSection title="Trending Colors" items={colorTrends} />
        <TrendSection title="Trending Silhouettes" items={silhouetteTrends} />
      </div>

      <section>
        <h2 className="font-serif text-2xl mb-8">Trending Looks</h2>
        <MasonryGrid outfits={trendingLooks} />
      </section>
    </div>
  );
}

function TrendSection({
  title,
  items,
}: {
  title: string;
  items: { name: string; change: number }[];
}) {
  return (
    <div className="border border-border p-6">
      <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-6">
        {title}
      </h3>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.name} className="flex items-center justify-between">
            <span className="text-sm">{item.name}</span>
            <span className="text-accent text-sm font-medium">
              ↑ {item.change}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
