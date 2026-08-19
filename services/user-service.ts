import type { User } from "@/types";

const DEFAULT_USER: User = {
  id: "user-1",
  name: "",
  email: "",
  favoriteStyles: ["Minimal", "Smart Casual"],
  favoriteColors: ["Beige", "Black", "Grey"],
  favoriteOccasions: ["Everyday", "Office", "Travel"],
};

export const userService = {
  getDefaultUser(): User {
    return { ...DEFAULT_USER };
  },

  isProfileComplete(user: User | null): boolean {
    if (!user) return false;
    return Boolean(
      user.name &&
        user.height &&
        user.usualSize &&
        user.bodyPreference &&
        user.stylePreference
    );
  },

  getStyleDistribution(user: User | null) {
    if (!user) {
      return [
        { style: "Minimal", percentage: 42 },
        { style: "Smart Casual", percentage: 28 },
        { style: "Streetwear", percentage: 17 },
        { style: "Formal", percentage: 8 },
        { style: "Other", percentage: 5 },
      ];
    }

    const base = [
      { style: "Minimal", percentage: 35 },
      { style: "Smart Casual", percentage: 25 },
      { style: "Streetwear", percentage: 15 },
      { style: "Formal", percentage: 10 },
      { style: "Other", percentage: 5 },
    ];

    for (const fav of user.favoriteStyles) {
      const entry = base.find(
        (b) => b.style.toLowerCase() === fav.toLowerCase()
      );
      if (entry) entry.percentage += 8;
    }

    const total = base.reduce((s, b) => s + b.percentage, 0);
    return base.map((b) => ({
      ...b,
      percentage: Math.round((b.percentage / total) * 100),
    }));
  },

  getColorPreferences(user: User | null) {
    if (!user) {
      return [
        { name: "Neutral", percentage: 64 },
        { name: "Earth tones", percentage: 21 },
        { name: "Dark tones", percentage: 15 },
      ];
    }

    const neutrals = ["Beige", "White", "Grey"];
    const earth = ["Brown", "Green"];
    const dark = ["Black", "Navy"];

    let neutral = 0;
    let earthCount = 0;
    let darkCount = 0;

    for (const c of user.favoriteColors) {
      if (neutrals.includes(c)) neutral++;
      if (earth.includes(c)) earthCount++;
      if (dark.includes(c)) darkCount++;
    }

    const total = Math.max(neutral + earthCount + darkCount, 1);
    return [
      { name: "Neutral", percentage: Math.round((neutral / total) * 100) || 40 },
      {
        name: "Earth tones",
        percentage: Math.round((earthCount / total) * 100) || 30,
      },
      {
        name: "Dark tones",
        percentage: Math.round((darkCount / total) * 100) || 30,
      },
    ];
  },

  getStyleLabel(user: User | null): string {
    if (!user?.favoriteStyles.length) return "Minimal × Smart Casual";
    return user.favoriteStyles.slice(0, 2).join(" × ");
  },
};
