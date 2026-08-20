import { outfits } from "@/data/mock-data";
import { DEFAULT_BOARDS } from "@/lib/constants";

export function generateOutfitParams() {
  return outfits.map((outfit) => ({ id: outfit.id }));
}

export function generateBoardParams() {
  return DEFAULT_BOARDS.map((_, i) => ({ id: `board-default-${i}` }));
}

export function generateStyleParams() {
  const styles = [
    "minimal",
    "streetwear",
    "old-money",
    "smart-casual",
    "formal",
    "casual",
    "vintage",
    "y2k",
    "athleisure",
    "summer",
    "wedding",
    "travel",
    "monochrome",
  ];
  return styles.map((style) => ({ style }));
}
