import type { Outfit, RecommendationResult, User } from "@/types";
import { outfitService } from "./outfit-service";

const WEIGHTS = {
  style: 0.3,
  color: 0.2,
  occasion: 0.15,
  season: 0.1,
  fit: 0.15,
  price: 0.1,
} as const;

/**
 * Deterministic recommendation engine for MVP.
 * Future: replace with personalization/ML service.
 */
export function calculateOutfitScore(
  user: User | null,
  outfit: Outfit
): RecommendationResult {
  if (!user) {
    const base = 60 + (outfit.saves % 30);
    return {
      score: base,
      reasons: ["Popular with the LOOKBOOK community"],
      matchedAttributes: outfit.styles.slice(0, 2),
      suggestions: ["Complete your style profile for better matches"],
    };
  }

  const reasons: string[] = [];
  const matchedAttributes: string[] = [];
  const suggestions: string[] = [];

  let styleScore = 0;
  const styleMatches = outfit.styles.filter((s) =>
    user.favoriteStyles.includes(s)
  );
  if (styleMatches.length) {
    styleScore = Math.min(1, styleMatches.length / 2);
    matchedAttributes.push(...styleMatches);
    reasons.push(`Matches your ${styleMatches[0]} style preference`);
  } else {
    suggestions.push(`Explore more ${outfit.styles[0]} looks`);
  }

  let colorScore = 0;
  const colorMatches = outfit.colors.filter((c) =>
    user.favoriteColors.includes(c)
  );
  if (colorMatches.length) {
    colorScore = Math.min(1, colorMatches.length / 2);
    matchedAttributes.push(...colorMatches);
    reasons.push("Strong match with your neutral color preference");
  }

  let occasionScore = 0;
  const occasionMatches = outfit.occasions.filter((o) =>
    user.favoriteOccasions.includes(o)
  );
  if (occasionMatches.length) {
    occasionScore = 1;
    reasons.push(`Suitable for ${occasionMatches[0].toLowerCase()} occasions`);
  }

  const seasonScore = outfit.seasons.length > 0 ? 0.7 : 0.3;

  let fitScore = 0.5;
  if (user.bodyPreference === "relaxed" && outfit.styles.includes("Casual")) {
    fitScore = 0.9;
    reasons.push("Matches your preference for relaxed silhouettes");
  } else if (
    user.stylePreference === "oversized" &&
    outfit.styles.includes("Streetwear")
  ) {
    fitScore = 0.85;
    reasons.push("Oversized elements align with your style preference");
  } else if (user.stylePreference === "fitted" && outfit.styles.includes("Formal")) {
    fitScore = 0.8;
    reasons.push("Tailored fit suits your fitted preference");
  }

  const priceScore =
    outfit.budgetRange === "1000-2500" || outfit.budgetRange === "2500-5000"
      ? 0.8
      : 0.5;
  if (priceScore > 0.7) {
    reasons.push("Within your preferred budget range");
  }

  const rawScore =
    styleScore * WEIGHTS.style +
    colorScore * WEIGHTS.color +
    occasionScore * WEIGHTS.occasion +
    seasonScore * WEIGHTS.season +
    fitScore * WEIGHTS.fit +
    priceScore * WEIGHTS.price;

  const score = Math.round(rawScore * 100);

  return {
    score: Math.max(45, Math.min(98, score)),
    reasons: reasons.length ? reasons : ["A fresh look worth exploring"],
    matchedAttributes,
    suggestions,
  };
}

export const recommendationService = {
  calculateOutfitScore,

  getRecommendedOutfits(user: User | null, limit = 12) {
    const all = outfitService.getAll();

    return all
      .map((outfit) => ({
        outfit,
        ...calculateOutfitScore(user, outfit),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
};
