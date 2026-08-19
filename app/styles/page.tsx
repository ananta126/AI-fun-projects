import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { styleCollections } from "@/data/mock-data";

export const metadata: Metadata = {
  title: "Styles",
  description: "Explore fashion styles and aesthetics.",
};

export default function StylesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-12">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Aesthetics
        </p>
        <h1 className="font-serif text-3xl md:text-5xl">Styles</h1>
        <p className="text-muted-foreground mt-3 max-w-lg">
          Explore curated style worlds — from minimal essentials to streetwear edge.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {styleCollections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/style/${collection.slug}`}
            className="group relative aspect-[16/10] overflow-hidden"
          >
            <Image
              src={collection.image}
              alt={collection.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h2 className="font-serif text-3xl text-white mb-2">
                {collection.name}
              </h2>
              <p className="text-white/70 text-sm max-w-md">
                {collection.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
