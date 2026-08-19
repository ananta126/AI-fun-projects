import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, ShoppingBag, User } from "lucide-react";
import { OutfitItemCard } from "@/components/fashion/OutfitItemCard";
import { SaveButton } from "@/components/fashion/SaveButton";
import { StyleTag } from "@/components/fashion/StyleTag";
import { MasonryGrid } from "@/components/fashion/MasonryGrid";
import { Button } from "@/components/ui/Button";
import { outfitService } from "@/services/outfit-service";
import { formatTags } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const outfit = outfitService.getById(id);
  if (!outfit) return { title: "Look Not Found" };
  return {
    title: outfit.title,
    description: outfit.description,
    openGraph: { images: [outfit.image] },
  };
}

export default async function OutfitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outfit = outfitService.getById(id);
  if (!outfit) notFound();

  const related = outfitService.getRelated(id, 6);
  const tags = formatTags([
    ...outfit.styles.slice(0, 2),
    ...outfit.occasions.slice(0, 1),
    ...outfit.colors.slice(0, 1),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
        <div className="relative aspect-[3/4] lg:aspect-auto lg:min-h-[600px] overflow-hidden bg-muted">
          <Image
            src={outfit.image}
            alt={outfit.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <div className="flex flex-col">
          <StyleTag>{tags}</StyleTag>
          <h1 className="font-serif text-3xl md:text-4xl mt-3 mb-4">
            {outfit.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            {outfit.description}
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <SaveButton outfitId={outfit.id} />
            <Link href={`/see-it-on-me?outfit=${outfit.id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                See It On Me
              </Button>
            </Link>
            <Link href={`/find-this-look/${outfit.id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Find This Look
              </Button>
            </Link>
          </div>

          <section>
            <h2 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">
              Style Breakdown
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Detected pieces</p>
            {outfit.items.map((item) => (
              <OutfitItemCard key={item.id} item={item} outfitId={outfit.id} />
            ))}
          </section>

          <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" /> {outfit.likes.toLocaleString()}
            </span>
            <span>{outfit.saves.toLocaleString()} saves</span>
            {outfit.creator && <span>{outfit.creator}</span>}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-serif text-2xl mb-8">Similar Looks</h2>
          <MasonryGrid outfits={related} />
        </section>
      )}
    </div>
  );
}
