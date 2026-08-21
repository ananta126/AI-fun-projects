import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "gold" | "teal" | "ok" | "danger";
}) {
  const tones = {
    muted: "bg-white/5 text-muted",
    gold: "bg-gold/15 text-gold",
    teal: "bg-teal/15 text-teal",
    ok: "bg-ok/15 text-ok",
    danger: "bg-danger/15 text-danger",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase", tones[tone])}>
      {children}
    </span>
  );
}
