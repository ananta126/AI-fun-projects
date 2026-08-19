import type {
  BudgetRange,
  ColorTag,
  Gender,
  Occasion,
  Season,
  StyleTag,
} from "@/types";

export const STYLES: StyleTag[] = [
  "Minimal",
  "Streetwear",
  "Old Money",
  "Smart Casual",
  "Formal",
  "Casual",
  "Vintage",
  "Y2K",
  "Athleisure",
];

export const OCCASIONS: Occasion[] = [
  "Everyday",
  "Date",
  "Office",
  "Wedding",
  "Party",
  "Travel",
];

export const SEASONS: Season[] = ["Summer", "Winter", "Monsoon", "Spring"];

export const COLORS: ColorTag[] = [
  "Black",
  "White",
  "Beige",
  "Navy",
  "Brown",
  "Green",
  "Grey",
  "Other",
];

export const GENDERS: Gender[] = ["men", "women", "unisex"];

export const BUDGET_OPTIONS: { value: BudgetRange; label: string }[] = [
  { value: "under-1000", label: "Under ₹1,000" },
  { value: "1000-2500", label: "₹1,000–₹2,500" },
  { value: "2500-5000", label: "₹2,500–₹5,000" },
  { value: "5000-plus", label: "₹5,000+" },
];

export const LANDING_CATEGORIES = [
  "Minimal",
  "Streetwear",
  "Old Money",
  "Smart Casual",
  "Summer",
  "Wedding",
  "Travel",
  "Monochrome",
] as const;

export const EXAMPLE_SEARCHES = [
  "minimal summer outfits",
  "black outfits",
  "Delhi wedding outfits",
  "casual date outfit",
  "old money style",
  "oversized streetwear",
  "office outfits",
];

export const DEFAULT_BOARDS = [
  "Date Night",
  "Office",
  "Summer",
  "Wedding",
  "Travel",
  "Wishlist",
  "Black Outfits",
];
