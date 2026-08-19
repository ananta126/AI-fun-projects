import { cn } from "@/lib/utils";

interface StyleTagProps {
  children: string;
  className?: string;
  variant?: "default" | "overlay";
}

export function StyleTag({
  children,
  className,
  variant = "default",
}: StyleTagProps) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium tracking-[0.15em] uppercase",
        variant === "overlay"
          ? "text-white/90"
          : "text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
