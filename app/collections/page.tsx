import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFashionImageUrl } from "@/data/images";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated fashion collections for every occasion.",
};

const COLLECTIONS = [
  { slug: "summer-essentials", name: "Summer Essentials", count: 24 },
  { slug: "office-edit", name: "The Office Edit", count: 18 },
  { slug: "wedding-guest", name: "Wedding Guest", count: 15 },
  { slug: "travel-capsule", name: "Travel Capsule", count: 20 },
  { slug: "date-night", name: "Date Night", count: 16 },
  { slug: "monochrome", name: "Monochrome", count: 22 },
];

export default function CollectionsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-12">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Curated
        </p>
        <h1 className="font-serif text-3xl md:text-5xl">Collections</h1>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COLLECTIONS.map((col, i) => (
          <Link
            key={col.slug}
            href={`/explore`}
            className="group border border-border overflow-hidden hover:border-foreground/20 transition-colors"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={getFashionImageUrl(i * 11 + 3, 800)}
                alt={col.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="33vw"
              />
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <h2 className="font-medium">{col.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {col.count} looks
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
