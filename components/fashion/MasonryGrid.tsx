import { FashionCard } from "./FashionCard";
import type { Outfit } from "@/types";

interface MasonryGridProps {
  outfits: Outfit[];
  priorityCount?: number;
}

export function MasonryGrid({ outfits, priorityCount = 4 }: MasonryGridProps) {
  if (!outfits.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-serif text-2xl mb-2">We couldn&apos;t find that look yet.</p>
        <p className="text-muted-foreground text-sm">
          Try adjusting your filters or search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
      {outfits.map((outfit, i) => (
        <FashionCard
          key={outfit.id}
          outfit={outfit}
          priority={i < priorityCount}
        />
      ))}
    </div>
  );
}
