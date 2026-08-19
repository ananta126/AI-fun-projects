"use client";

import { Button } from "@/components/ui/Button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="font-serif text-3xl md:text-4xl mb-4">
        Something went sideways.
      </h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-md">
        We couldn&apos;t load these looks. Try again.
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
