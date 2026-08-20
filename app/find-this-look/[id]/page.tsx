import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/fashion/ProductCard";
import { outfitService } from "@/services/outfit-service";
import { productService } from "@/services/product-service";
import { formatPrice } from "@/lib/utils";
import { generateOutfitParams } from "@/lib/static-params";

export function generateStaticParams() {
  return generateOutfitParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const outfit = outfitService.getById(id);
  return { title: outfit ? `Recreate: ${outfit.title}` : "Find This Look" };
}

const CATEGORY_LABELS: Record<string, string> = {
  shirt: "Shirts",
  trousers: "Trousers",
  shoes: "Shoes",
  accessories: "Accessories",
  jacket: "Jackets",
  dress: "Dresses",
};

export default async function FindThisLookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outfit = outfitService.getById(id);
  if (!outfit) notFound();

  const productsByCategory = productService.getForOutfit(outfit.items);
  const totalEstimate = productService.getTotalEstimate(outfit.items);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Shop Similar
        </p>
        <h1 className="font-serif text-3xl md:text-4xl">Recreate This Look</h1>
      </div>

      <div className="relative aspect-[21/9] max-h-[400px] overflow-hidden mb-16 bg-muted">
        <Image
          src={outfit.image}
          alt={outfit.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-6 left-6">
          <p className="text-white font-serif text-2xl">{outfit.title}</p>
        </div>
      </div>

      {Object.entries(productsByCategory).map(([category, products]) => (
        <section key={category} className="mb-16">
          <h2 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-6">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}

      <div className="border border-border p-8 text-center">
        <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
          Complete the Look
        </p>
        <p className="font-serif text-3xl">
          From {formatPrice(totalEstimate)}
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Estimated total based on similar product matches. Product links are placeholders for MVP.
        </p>
      </div>
    </div>
  );
}
