"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SaveButton } from "./SaveButton";
import { StyleTag } from "./StyleTag";
import { formatTags } from "@/lib/utils";
import type { Outfit } from "@/types";

interface FashionCardProps {
  outfit: Outfit;
  priority?: boolean;
}

export function FashionCard({ outfit, priority = false }: FashionCardProps) {
  const tags = formatTags([
    outfit.styles[0] ?? "",
    outfit.seasons[0] ?? "",
  ].filter(Boolean));

  return (
    <Link
      href={`/outfit/${outfit.id}`}
      className="group relative block break-inside-avoid mb-4 overflow-hidden bg-muted"
    >
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: outfit.aspectRatio }}
      >
        <Image
          src={outfit.image}
          alt={outfit.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          priority={priority}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        <div className="absolute top-3 right-3 opacity-100 transition-opacity">
          <SaveButton outfitId={outfit.id} size="sm" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
          <StyleTag variant="overlay">{tags}</StyleTag>
          <span className="flex items-center gap-1 text-xs text-white opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            View Look
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {outfit.creator && (
        <p className="mt-2 text-xs text-muted-foreground px-0.5">
          {outfit.creator}
        </p>
      )}
    </Link>
  );
}
