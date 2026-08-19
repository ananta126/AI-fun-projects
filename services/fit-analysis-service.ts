import type { FitAnalysis, Outfit, User } from "@/types";

/**
 * Mock fit analysis — NOT real virtual try-on.
 * Future: replace with FitIntelligenceService backed by ML models.
 */
export const fitAnalysisService = {
  generate(outfit: Outfit, user: User | null): FitAnalysis {
    const bodyPref = user?.bodyPreference ?? "regular";
    const stylePref = user?.stylePreference ?? "balanced";

    const baseScore = 7.5 + (outfit.saves % 20) / 10;
    const bodyBonus =
      bodyPref === "relaxed" && outfit.styles.includes("Casual") ? 0.8 : 0.3;
    const styleBonus =
      stylePref === "oversized" && outfit.styles.includes("Streetwear")
        ? 0.6
        : 0.2;

    const overall = Math.min(
      9.8,
      Math.round((baseScore + bodyBonus + styleBonus) * 10) / 10
    );

    return {
      overall,
      proportion: Math.min(9.9, overall + 0.2),
      silhouette: Math.min(9.5, overall - 0.1),
      length: Math.min(9.2, overall - 0.4),
      color: Math.min(9.9, overall + 0.3),
      versatility: Math.min(9.5, overall + 0.1),
      recommendation:
        bodyPref === "relaxed"
          ? "The relaxed silhouette works well with your selected preferences. A slightly shorter trouser length would create a cleaner proportion."
          : stylePref === "fitted"
            ? "The structured pieces complement a fitted preference. Consider sizing down on outer layers for sharper lines."
            : "This look balances well with your profile. The proportions create a clean, modern silhouette.",
      recommendedFit: {
        shirt: bodyPref === "relaxed" ? "Relaxed" : "Regular",
        trousers:
          stylePref === "oversized" ? "Relaxed" : "Straight / Relaxed",
        shoes: "Low-profile",
      },
    };
  },
};
