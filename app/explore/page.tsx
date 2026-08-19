"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FilterDrawer } from "@/components/fashion/FilterDrawer";
import { MasonryGrid } from "@/components/fashion/MasonryGrid";
import { Button } from "@/components/ui/Button";
import { outfitService } from "@/services/outfit-service";
import type { OutfitFilters } from "@/types";

const PAGE_SIZE = 20;

export default function ExplorePage() {
  const [filters, setFilters] = useState<OutfitFilters>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const outfits = useMemo(
    () => outfitService.getFiltered(filters),
    [filters]
  );

  const visible = outfits.slice(0, visibleCount);
  const hasMore = visibleCount < outfits.length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
            Discover
          </p>
          <h1 className="font-serif text-3xl md:text-4xl">Explore Fashion</h1>
          <p className="text-muted-foreground text-sm mt-2">
            {outfits.length} looks
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilterOpen(true)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <MasonryGrid outfits={visible} />

      {hasMore && (
        <div className="text-center mt-10">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Load More
          </Button>
        </div>
      )}

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setVisibleCount(PAGE_SIZE);
        }}
      />
    </div>
  );
}
