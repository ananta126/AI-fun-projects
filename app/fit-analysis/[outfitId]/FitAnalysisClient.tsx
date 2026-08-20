"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FitScore } from "@/components/fashion/FitScore";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProvider";
import { outfitService } from "@/services/outfit-service";
import { fitAnalysisService } from "@/services/fit-analysis-service";
import { trackEvent } from "@/lib/analytics";

export default function FitAnalysisClient({
  params,
}: {
  params: Promise<{ outfitId: string }>;
}) {
  const { outfitId } = use(params);
  const { user } = useApp();
  const outfit = outfitService.getById(outfitId);

  useEffect(() => {
    if (outfit) {
      trackEvent("fit_analysis_viewed", { outfitId });
    }
  }, [outfit, outfitId]);

  if (!outfit) notFound();

  const analysis = fitAnalysisService.generate(outfit, user);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-10">
        <Link
          href={`/outfit/${outfitId}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to look
        </Link>
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mt-6 mb-2">
          Fit Analysis
        </p>
        <h1 className="font-serif text-3xl md:text-4xl">
          How this look works for you
        </h1>
        <p className="text-muted-foreground text-sm mt-2">{outfit.title}</p>
      </div>

      <FitScore analysis={analysis} />

      <div className="flex flex-col sm:flex-row gap-3 mt-10">
        <Link href={`/find-this-look/${outfitId}`}>
          <Button className="w-full sm:w-auto">Find This Look</Button>
        </Link>
        <Link href="/explore">
          <Button variant="outline" className="w-full sm:w-auto">
            Explore More
          </Button>
        </Link>
      </div>
    </div>
  );
}
