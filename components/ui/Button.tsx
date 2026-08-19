import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50",
        {
          "bg-foreground text-background hover:opacity-90": variant === "primary",
          "bg-transparent border border-border text-foreground hover:bg-muted":
            variant === "secondary",
          "bg-transparent text-foreground hover:bg-muted": variant === "ghost",
          "border border-foreground/20 bg-transparent hover:border-foreground/40":
            variant === "outline",
          "px-4 py-2 text-sm": size === "sm",
          "px-6 py-2.5 text-sm": size === "md",
          "px-8 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
