import Image from "next/image";
import Link from "next/link";
import { getFashionImageUrl } from "@/data/images";
import type { Board } from "@/types";

interface BoardCardProps {
  board: Board;
  outfitCount?: number;
}

export function BoardCard({ board, outfitCount }: BoardCardProps) {
  const count = outfitCount ?? board.outfitIds.length;
  const cover =
    board.coverImage ?? getFashionImageUrl(board.name.length * 7, 600);

  return (
    <Link
      href={`/board/${board.id}`}
      className="group block"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted mb-3">
        <Image
          src={cover}
          alt={board.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-medium text-lg">{board.name}</h3>
          <p className="text-white/70 text-xs mt-0.5">
            {count} {count === 1 ? "look" : "looks"}
          </p>
        </div>
      </div>
      {board.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {board.description}
        </p>
      )}
    </Link>
  );
}
