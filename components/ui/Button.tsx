import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "gold" | "danger" | "outline";

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary:
      "bg-teal text-bg font-medium hover:brightness-110 disabled:opacity-40",
    gold: "bg-gold text-bg font-semibold hover:brightness-110 disabled:opacity-40",
    ghost: "bg-transparent text-text hover:bg-white/5",
    outline: "border border-line bg-transparent hover:bg-white/5",
    danger: "bg-danger/20 text-danger hover:bg-danger/30",
  };
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
