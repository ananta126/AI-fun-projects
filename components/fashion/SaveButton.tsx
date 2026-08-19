"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";

interface SaveButtonProps {
  outfitId: string;
  className?: string;
  size?: "sm" | "md";
}

export function SaveButton({ outfitId, className, size = "md" }: SaveButtonProps) {
  const { isOutfitSaved, toggleSaveOutfit } = useApp();
  const saved = isOutfitSaved(outfitId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaveOutfit(outfitId);
      }}
      aria-label={saved ? "Remove from saved" : "Save look"}
      className={cn(
        "flex items-center gap-1.5 backdrop-blur-sm bg-black/30 text-white transition-all duration-200 hover:bg-black/50",
        saved && "text-red-400",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-xs",
        className
      )}
    >
      <Heart
        className={cn(
          "transition-transform duration-200",
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
          saved && "fill-current scale-110"
        )}
      />
      <span className="font-medium tracking-wide">{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
