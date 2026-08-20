"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/fashion/SearchBar";
import { MasonryGrid } from "@/components/fashion/MasonryGrid";
import { outfitService } from "@/services/outfit-service";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const results = outfitService.search(query);

  return (
    <>
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
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Suspense fallback={<div className="text-center py-12">Loading search...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
