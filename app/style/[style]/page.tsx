import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MasonryGrid } from "@/components/fashion/MasonryGrid";
import { outfitService } from "@/services/outfit-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ style: string }>;
}): Promise<Metadata> {
  const { style } = await params;
  const name = style.replace(/-/g, " ");
  return {
    title: `${name.charAt(0).toUpperCase() + name.slice(1)} Style`,
  };
}

export default async function StylePage({
  params,
}: {
  params: Promise<{ style: string }>;
}) {
  const { style } = await params;
  const outfits = outfitService.getByStyle(style, 48);

  if (!outfits.length) notFound();

  const displayName = style.replace(/-/g, " ");

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Style
        </p>
        <h1 className="font-serif text-3xl md:text-5xl capitalize">
          {displayName}
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {outfits.length} looks
        </p>
      </div>
      <MasonryGrid outfits={outfits} />
    </div>
  );
}
