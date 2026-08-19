"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProfileForm } from "@/components/fashion/ProfileForm";
import { trackEvent } from "@/lib/analytics";

function SeeItOnMeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const outfitId = searchParams.get("outfit");

  function handleComplete() {
    trackEvent("see_on_me_clicked", { outfitId: outfitId ?? undefined });
    if (outfitId) {
      router.push(`/fit-analysis/${outfitId}`);
    } else {
      router.push("/profile");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-10 text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Personal Fit
        </p>
        <h1 className="font-serif text-3xl md:text-4xl mb-4">
          Let&apos;s understand your fit
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
          A few details help us recommend silhouettes and sizes that are more
          likely to work for you.
        </p>
      </div>

      <div className="border border-border p-6 md:p-8">
        <ProfileForm onComplete={handleComplete} />
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
        This is not virtual try-on. Fit recommendations are estimates based on
        your profile — future AI capabilities will enhance accuracy.
      </p>
    </div>
  );
}

export default function SeeItOnMePage() {
  return (
    <Suspense>
      <SeeItOnMeContent />
    </Suspense>
  );
}
