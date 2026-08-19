import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
        404
      </p>
      <h1 className="font-serif text-3xl md:text-4xl mb-4">Look not found</h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-md">
        This look may have been removed or the link is incorrect.
      </p>
      <Link href="/explore">
        <Button>Explore Looks</Button>
      </Link>
    </div>
  );
}
