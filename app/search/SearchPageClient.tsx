"use client";

import { useState } from "react";
import { SearchBar } from "@/components/fashion/SearchBar";
import { MasonryGrid } from "@/components/fashion/MasonryGrid";
import { outfitService } from "@/services/outfit-service";

export default function SearchPageClient({
  initialQuery,
}: {
  initialQuery: string;
}) {
  const [query] = useState(initialQuery);
  const results = outfitService.search(query);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="max-w-2xl mx-auto mb-12">
        <h1 className="font-serif text-3xl md:text-4xl text-center mb-8">Search</h1>
        <SearchBar defaultValue={query} showExamples />
      </div>

      {query && (
        <p className="text-sm text-muted-foreground mb-6">
          {results.length} results for &ldquo;{query}&rdquo;
        </p>
      )}

      <MasonryGrid outfits={results} />
    </div>
  );
}
