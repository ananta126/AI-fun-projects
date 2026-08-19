"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FashionCard } from "@/components/fashion/FashionCard";
import { useApp } from "@/components/providers/AppProvider";
import { outfitService } from "@/services/outfit-service";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getBoard } = useApp();
  const board = getBoard(id);

  if (!board) notFound();

  const outfits = board.outfitIds
    .map((oid) => outfitService.getById(oid))
    .filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-10">
        <Link
          href="/saved"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Saved Looks
        </Link>
        <h1 className="font-serif text-3xl md:text-4xl mt-4">{board.name}</h1>
        {board.description && (
          <p className="text-muted-foreground mt-2">{board.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          {outfits.length} {outfits.length === 1 ? "look" : "looks"}
        </p>
      </div>

      {outfits.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <p className="text-muted-foreground mb-4">No looks in this board yet.</p>
          <Link href="/explore" className="text-sm text-accent hover:underline">
            Explore looks to save
          </Link>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          {outfits.map((outfit) => (
            <FashionCard key={outfit!.id} outfit={outfit!} />
          ))}
        </div>
      )}
    </div>
  );
}
