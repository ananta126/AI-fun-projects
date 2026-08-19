"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Search, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/trending", label: "Trending" },
  { href: "/styles", label: "Styles" },
  { href: "/collections", label: "Collections" },
];

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="font-serif text-xl tracking-[0.08em] uppercase shrink-0"
        >
          LOOKBOOK
        </Link>

        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm tracking-wide transition-colors hover:text-foreground",
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-3">
          <Link
            href="/search"
            className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/saved"
            className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors px-2"
          >
            Saved
          </Link>
          <Link
            href="/profile"
            className="hidden md:inline-flex p-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Profile"
          >
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
            suppressHydrationWarning
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
