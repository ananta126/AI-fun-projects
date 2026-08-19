import { products } from "@/data/mock-data";
import type { ItemType, OutfitItem, Product } from "@/types";

export const productService = {
  getAll(): Product[] {
    return products;
  },

  getById(id: string): Product | undefined {
    return products.find((p) => p.id === id);
  },

  getByCategory(category: ItemType, limit = 6): Product[] {
    return products.filter((p) => p.category === category).slice(0, limit);
  },

  getSimilarToItem(item: OutfitItem, limit = 6): Product[] {
    const categoryProducts = products.filter((p) => p.category === item.type);
    const scored = categoryProducts.map((p) => {
      let score = p.similarity ?? 75;
      if (p.fit.toLowerCase() === item.fit.toLowerCase()) score += 5;
      if (p.colors.some((c) => c.toLowerCase() === item.color.toLowerCase()))
        score += 8;
      return { product: p, score: Math.min(score, 99) };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => ({ ...r.product, similarity: r.score }));
  },

  getForOutfit(outfitItems: OutfitItem[]): Record<string, Product[]> {
    const result: Record<string, Product[]> = {};
    for (const item of outfitItems) {
      result[item.type] = this.getSimilarToItem(item, 5);
    }
    return result;
  },

  getTotalEstimate(outfitItems: OutfitItem[]): number {
    return outfitItems.reduce((sum, item) => {
      const similar = this.getSimilarToItem(item, 1)[0];
      return sum + (similar?.price ?? item.price);
    }, 0);
  },
};
