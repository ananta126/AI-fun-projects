export type Gender = "men" | "women" | "unisex";

export type StyleTag =
  | "Minimal"
  | "Streetwear"
  | "Old Money"
  | "Smart Casual"
  | "Formal"
  | "Casual"
  | "Vintage"
  | "Y2K"
  | "Athleisure";

export type Occasion =
  | "Everyday"
  | "Date"
  | "Office"
  | "Wedding"
  | "Party"
  | "Travel";

export type Season = "Summer" | "Winter" | "Monsoon" | "Spring";

export type ColorTag =
  | "Black"
  | "White"
  | "Beige"
  | "Navy"
  | "Brown"
  | "Green"
  | "Grey"
  | "Other";

export type BudgetRange =
  | "under-1000"
  | "1000-2500"
  | "2500-5000"
  | "5000-plus";

export type BodyPreference = "slim" | "regular" | "relaxed";
export type StylePreference = "fitted" | "balanced" | "oversized";
export type ItemType = "shirt" | "trousers" | "shoes" | "accessories" | "jacket" | "dress";

export interface User {
  id: string;
  name: string;
  email: string;
  height?: number;
  usualSize?: string;
  chest?: number;
  waist?: number;
  shoulder?: number;
  inseam?: number;
  bodyPreference?: BodyPreference;
  stylePreference?: StylePreference;
  favoriteStyles: StyleTag[];
  favoriteColors: ColorTag[];
  favoriteOccasions: Occasion[];
  profileImage?: string;
  photoUrl?: string;
}

export interface OutfitItem {
  id: string;
  type: ItemType;
  name: string;
  brand: string;
  image: string;
  price: number;
  currency: string;
  color: string;
  fit: string;
  category: string;
  productUrl?: string;
}

export interface Outfit {
  id: string;
  title: string;
  image: string;
  aspectRatio: number;
  category: string;
  gender: Gender;
  styles: StyleTag[];
  occasions: Occasion[];
  seasons: Season[];
  colors: ColorTag[];
  description: string;
  items: OutfitItem[];
  tags: string[];
  likes: number;
  saves: number;
  creator?: string;
  budgetRange: BudgetRange;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ItemType;
  price: number;
  currency: string;
  image: string;
  colors: string[];
  fit: string;
  styles: StyleTag[];
  productUrl?: string;
  similarity?: number;
  outfitItemId?: string;
}

export interface Board {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImage?: string;
  outfitIds: string[];
  createdAt: string;
}

export interface RecommendationResult {
  score: number;
  reasons: string[];
  matchedAttributes: string[];
  suggestions: string[];
}

export interface FitAnalysis {
  overall: number;
  proportion: number;
  silhouette: number;
  length: number;
  color: number;
  versatility: number;
  recommendation: string;
  recommendedFit: {
    shirt: string;
    trousers: string;
    shoes: string;
  };
}

export interface OutfitFilters {
  gender?: Gender[];
  styles?: StyleTag[];
  occasions?: Occasion[];
  seasons?: Season[];
  colors?: ColorTag[];
  budget?: BudgetRange[];
  query?: string;
}

export interface TrendItem {
  name: string;
  change: number;
  category: "style" | "color" | "silhouette" | "look";
}

export interface StyleDistribution {
  style: string;
  percentage: number;
}
