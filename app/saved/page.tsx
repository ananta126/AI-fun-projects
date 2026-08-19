"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BoardCard } from "@/components/fashion/BoardCard";
import { FashionCard } from "@/components/fashion/FashionCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/components/providers/AppProvider";
import { outfitService } from "@/services/outfit-service";

export default function SavedPage() {
  const { savedOutfitIds, boards, createBoard } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [boardName, setBoardName] = useState("");

  const savedOutfits = outfitService
    .getAll()
    .filter((o) => savedOutfitIds.has(o.id));

  function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!boardName.trim()) return;
    createBoard(boardName.trim());
    setBoardName("");
    setShowCreate(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
            Your Wardrobe
          </p>
          <h1 className="font-serif text-3xl md:text-4xl">Saved Looks</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Board
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateBoard} className="flex gap-3 mb-8 max-w-md">
          <Input
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="Board name"
            aria-label="Board name"
          />
          <Button type="submit">Create</Button>
        </form>
      )}

      <section className="mb-16">
        <h2 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-6">
          Boards
        </h2>
        {boards.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border">
            <p className="text-muted-foreground mb-4">Create your first board.</p>
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              Create Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-6">
          All Saved ({savedOutfits.length})
        </h2>
        {savedOutfits.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-serif text-2xl mb-2">
              Your wardrobe inspiration starts here.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Save looks you love while exploring.
            </p>
            <Link href="/explore">
              <Button>Explore Looks</Button>
            </Link>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {savedOutfits.map((outfit) => (
              <FashionCard key={outfit.id} outfit={outfit} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
