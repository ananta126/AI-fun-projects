import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FashionCard } from "@/components/fashion/FashionCard";
import { Button } from "@/components/ui/Button";
import { LANDING_CATEGORIES } from "@/lib/constants";
import { outfitService } from "@/services/outfit-service";
import { getFashionImageUrl } from "@/data/images";

export default function HomePage() {
  const trending = outfitService.getTrending(8);
  const popular = outfitService.getPopular(8);

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-end">
        <Image
          src={getFashionImageUrl(3, 1600)}
          alt="Editorial fashion look"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 pb-16 md:pb-24">
          <p className="text-white/70 text-xs tracking-[0.3em] uppercase mb-4">
            Fashion Discovery
          </p>
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white max-w-3xl leading-[1.1]">
            Find your style.<br />Make it yours.
          </h1>
          <p className="text-white/80 text-base md:text-lg mt-6 max-w-lg leading-relaxed">
            Discover outfits, save inspiration, and find looks that work for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href="/explore">
              <Button size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-white/90">
                Explore Looks
              </Button>
            </Link>
            <Link href="/see-it-on-me">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-white/40 text-white hover:bg-white/10">
                Build Your Style Profile
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trending Now */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
              Curated
            </p>
            <h2 className="font-serif text-3xl md:text-4xl">Trending Now</h2>
          </div>
          <Link href="/trending" className="hidden md:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="columns-2 md:columns-4 gap-4">
          {trending.map((outfit, i) => (
            <FashionCard key={outfit.id} outfit={outfit} priority={i < 4} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
          <h2 className="font-serif text-3xl md:text-4xl mb-10 text-center">Explore by Style</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {LANDING_CATEGORIES.map((cat, i) => (
              <Link
                key={cat}
                href={`/style/${cat.toLowerCase().replace(/ /g, "-")}`}
                className="group relative aspect-[3/4] overflow-hidden"
              >
                <Image
                  src={getFashionImageUrl(i * 7 + 5, 600)}
                  alt={cat}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="25vw"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <span className="absolute bottom-4 left-4 text-white font-medium tracking-wide">
                  {cat}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Looks For You */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="mb-8">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
            For You
          </p>
          <h2 className="font-serif text-3xl md:text-4xl">Looks For You</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Popular picks — personalize with your style profile
          </p>
        </div>
        <div className="columns-2 md:columns-4 gap-4">
          {popular.map((outfit) => (
            <FashionCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-16">
            How LOOKBOOK Works
          </h2>
          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {[
              {
                step: "01",
                title: "Discover",
                desc: "Find outfits and styles you love.",
              },
              {
                step: "02",
                title: "Make It Yours",
                desc: "Tell us about your style and preferences.",
              },
              {
                step: "03",
                title: "Find The Look",
                desc: "Discover similar pieces that match your taste.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center md:text-left">
                <p className="text-accent font-serif text-4xl mb-4">{item.step}</p>
                <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-16">
            <Link href="/explore">
              <Button size="lg">Start Exploring</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
