import { outfits } from "@/data/mock-data";
import type { Outfit, OutfitFilters } from "@/types";

function matchesQuery(outfit: Outfit, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const searchable = [
    outfit.title,
    outfit.description,
    outfit.category,
    outfit.gender,
    ...outfit.styles,
    ...outfit.occasions,
    ...outfit.seasons,
    ...outfit.colors,
    ...outfit.tags,
    outfit.creator ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return q.split(/\s+/).every((term) => searchable.includes(term));
}

function matchesFilters(outfit: Outfit, filters: OutfitFilters): boolean {
  if (filters.gender?.length && !filters.gender.includes(outfit.gender)) {
    return false;
  }
  if (
    filters.styles?.length &&
    !filters.styles.some((s) => outfit.styles.includes(s))
  ) {
    return false;
  }
  if (
    filters.occasions?.length &&
    !filters.occasions.some((o) => outfit.occasions.includes(o))
  ) {
    return false;
  }
  if (
    filters.seasons?.length &&
    !filters.seasons.some((s) => outfit.seasons.includes(s))
  ) {
    return false;
  }
  if (
    filters.colors?.length &&
    !filters.colors.some((c) => outfit.colors.includes(c))
  ) {
    return false;
  }
  if (
    filters.budget?.length &&
    !filters.budget.includes(outfit.budgetRange)
  ) {
    return false;
  }
  if (filters.query && !matchesQuery(outfit, filters.query)) {
    return false;
  }
  return true;
}

export const outfitService = {
  getAll(): Outfit[] {
    return outfits;
  },

  getById(id: string): Outfit | undefined {
    return outfits.find((o) => o.id === id);
  },

  getFiltered(filters: OutfitFilters): Outfit[] {
    return outfits.filter((o) => matchesFilters(o, filters));
  },

  search(query: string, filters: OutfitFilters = {}): Outfit[] {
    return this.getFiltered({ ...filters, query });
  },

  getTrending(limit = 12): Outfit[] {
    return [...outfits].sort((a, b) => b.saves - a.saves).slice(0, limit);
  },

  getPopular(limit = 12): Outfit[] {
    return [...outfits].sort((a, b) => b.likes - a.likes).slice(0, limit);
  },

  getByStyle(style: string, limit = 24): Outfit[] {
    const normalized = style.toLowerCase().replace(/-/g, " ");
    return outfits
      .filter((o) =>
        o.styles.some((s) => s.toLowerCase().replace(/ /g, " ") === normalized)
      )
      .slice(0, limit);
  },

  getRelated(outfitId: string, limit = 8): Outfit[] {
    const outfit = this.getById(outfitId);
    if (!outfit) return [];

    return outfits
      .filter((o) => o.id !== outfitId)
      .map((o) => {
        let score = 0;
        score += o.styles.filter((s) => outfit.styles.includes(s)).length * 3;
        score += o.colors.filter((c) => outfit.colors.includes(c)).length * 2;
        score += o.occasions.filter((oc) => outfit.occasions.includes(oc)).length;
        return { outfit: o, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.outfit);
  },
};
