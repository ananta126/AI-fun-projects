import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-bg-card/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
        className,
      )}
      {...props}
    />
  );
}
