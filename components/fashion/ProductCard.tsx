"use client";

import Image from "next/image";
import { trackEvent } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <a
      href={product.productUrl ?? "#"}
      onClick={() =>
        trackEvent("product_clicked", {
          productId: product.id,
          name: product.name,
        })
      }
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted mb-3">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      </div>
      <p className="text-sm font-medium line-clamp-1">{product.name}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-sm">{formatPrice(product.price, product.currency)}</span>
        {product.similarity && (
          <span className="text-xs text-accent">{product.similarity}% match</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{product.fit} fit</p>
    </a>
  );
}
