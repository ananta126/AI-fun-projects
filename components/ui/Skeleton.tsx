import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse bg-muted rounded-sm", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  const heights = [280, 340, 300, 380, 260, 320, 360, 290];
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-4">
          <Skeleton
            className="w-full"
            style={{ height: heights[i % heights.length] }}
          />
        </div>
      ))}
    </div>
  );
}
