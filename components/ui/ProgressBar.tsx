import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "teal",
}: {
  value: number;
  className?: string;
  tone?: "teal" | "gold";
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/8", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          tone === "gold" ? "bg-gold" : "bg-teal",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
