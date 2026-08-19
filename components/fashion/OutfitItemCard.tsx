import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { OutfitItem } from "@/types";

interface OutfitItemCardProps {
  item: OutfitItem;
  outfitId: string;
}

export function OutfitItemCard({ item, outfitId }: OutfitItemCardProps) {
  return (
    <div className="flex gap-4 py-4 border-b border-border last:border-0">
      <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden bg-muted">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.brand} · {item.color} · {item.fit}
        </p>
        <p className="text-sm mt-1">{formatPrice(item.price, item.currency)}</p>
      </div>
      <Link
        href={`/find-this-look/${outfitId}?item=${item.id}`}
        className="self-center text-xs font-medium tracking-wide uppercase text-accent hover:underline whitespace-nowrap"
      >
        Find Similar
      </Link>
    </div>
  );
}
