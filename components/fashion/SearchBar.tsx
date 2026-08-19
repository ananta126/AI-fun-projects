"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { EXAMPLE_SEARCHES } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  defaultValue?: string;
  showExamples?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  defaultValue = "",
  showExamples = false,
  className,
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    trackEvent("search_performed", { query: q });
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search styles, outfits, occasions…"
          className="pl-11 pr-10 py-3"
          autoFocus={autoFocus}
          aria-label="Search styles, outfits, occasions"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {showExamples && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLE_SEARCHES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                trackEvent("search_performed", { query: example });
                router.push(`/search?q=${encodeURIComponent(example)}`);
              }}
              className="text-xs px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
